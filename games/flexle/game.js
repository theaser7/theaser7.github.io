// Game State
const savedRange = JSON.parse(localStorage.getItem('flexle_rnd_range') || '{"min": 4, "max": 10}');

const state = {
    lang: localStorage.getItem('flexle_lang') || 'RU',
    strictMode: localStorage.getItem('flexle_strict') !== null 
        ? localStorage.getItem('flexle_strict') === 'true' 
        : true,
    hardMode: localStorage.getItem('flexle_hard') === 'true',
    rndMin: savedRange.min || 4,
    rndMax: savedRange.max || 10,
    wordLength: 5,
    isRandomLength: false,
    isXLMode: false,
    isCustomMode: false,
    customWord: null,
    maxAttempts: 6,
    targetWord: '',
    currentRow: 0,
    currentCol: 0,
    grid: [],
    keyStatuses: {},
    isGameOver: false,
    hasStarted: false
};

// P2P Custom Challenge Encoding / Decoding (URL-safe Base64 + XOR)
const CHALLENGE_XOR_KEY = [0x53, 0x54, 0x41, 0x53, 0x48, 0x46, 0x4C, 0x45, 0x58]; // 'STASHFLEX'

function encodeCustomChallenge(word, lang) {
    try {
        const payload = JSON.stringify({ w: word.trim().toUpperCase(), l: lang });
        const utf8Bytes = new TextEncoder().encode(payload);
        const xored = new Uint8Array(utf8Bytes.length);
        for (let i = 0; i < utf8Bytes.length; i++) {
            xored[i] = utf8Bytes[i] ^ CHALLENGE_XOR_KEY[i % CHALLENGE_XOR_KEY.length];
        }
        let binary = '';
        for (let i = 0; i < xored.length; i++) {
            binary += String.fromCharCode(xored[i]);
        }
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch (e) {
        console.error('Error encoding custom challenge:', e);
        return null;
    }
}

function decodeCustomChallenge(encodedStr) {
    if (!encodedStr) return null;
    try {
        let base64 = encodedStr.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) base64 += '=';
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        const unxored = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) {
            unxored[i] = bytes[i] ^ CHALLENGE_XOR_KEY[i % CHALLENGE_XOR_KEY.length];
        }
        const jsonStr = new TextDecoder().decode(unxored);
        const data = JSON.parse(jsonStr);
        if (data && data.w && typeof data.w === 'string') {
            const cleanWord = data.w.trim().toUpperCase();
            if (cleanWord.length >= 4 && cleanWord.length <= 20) {
                return {
                    word: cleanWord,
                    lang: data.l === 'EN' ? 'EN' : 'RU'
                };
            }
        }
    } catch (e) {
        console.warn('Failed to decode custom challenge param:', e);
    }
    return null;
}

function checkUrlChallenge() {
    const urlParams = new URLSearchParams(window.location.search);
    let customParam = urlParams.get('custom') || urlParams.get('word');
    if (!customParam && window.location.hash) {
        const hash = window.location.hash.replace(/^#\/?/, '');
        if (hash.startsWith('custom=')) {
            customParam = hash.replace('custom=', '');
        } else if (hash.includes('?')) {
            const subParams = new URLSearchParams(hash.split('?')[1]);
            customParam = subParams.get('custom') || subParams.get('word');
        }
    }

    if (customParam) {
        const decoded = decodeCustomChallenge(customParam);
        if (decoded) {
            state.isCustomMode = true;
            state.customWord = decoded.word;
            state.lang = decoded.lang;
            return true;
        }
    }
    return false;
}

// Keyboards Layouts
const KEYBOARDS = {
    EN: [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL']
    ],
    RU: [
        ['Й', 'Ц', 'У', 'К', 'Е', 'Н', 'Г', 'Ш', 'Щ', 'З', 'Х', 'Ъ'],
        ['Ф', 'Ы', 'В', 'А', 'П', 'Р', 'О', 'Л', 'Д', 'Ж', 'Э'],
        ['ENTER', 'Я', 'Ч', 'С', 'М', 'И', 'Т', 'Ь', 'Б', 'Ю', 'DEL']
    ]
};

// Physical Key Code to Char Mapping
const RU_CODE_MAP = {
    'KeyQ': 'Й', 'KeyW': 'Ц', 'KeyE': 'У', 'KeyR': 'К', 'KeyT': 'Е',
    'KeyY': 'Н', 'KeyU': 'Г', 'KeyI': 'Ш', 'KeyO': 'Щ', 'KeyP': 'З',
    'BracketLeft': 'Х', 'BracketRight': 'Ъ', 'KeyA': 'Ф', 'KeyS': 'Ы',
    'KeyD': 'В', 'KeyF': 'А', 'KeyG': 'П', 'KeyH': 'Р', 'KeyJ': 'О',
    'KeyK': 'Л', 'KeyL': 'Д', 'Semicolon': 'Ж', 'Quote': 'Э',
    'KeyZ': 'Я', 'KeyX': 'Ч', 'KeyC': 'С', 'KeyV': 'М', 'KeyB': 'И',
    'KeyN': 'Т', 'KeyM': 'Ь', 'Comma': 'Б', 'Period': 'Ю', 'Backquote': 'Ё'
};

const EN_CODE_MAP = {
    'KeyQ': 'Q', 'KeyW': 'W', 'KeyE': 'E', 'KeyR': 'R', 'KeyT': 'T',
    'KeyY': 'Y', 'KeyU': 'U', 'KeyI': 'I', 'KeyO': 'O', 'KeyP': 'P',
    'KeyA': 'A', 'KeyS': 'S', 'KeyD': 'D', 'KeyF': 'F', 'KeyG': 'G',
    'KeyH': 'H', 'KeyJ': 'J', 'KeyK': 'K', 'KeyL': 'L',
    'KeyZ': 'Z', 'KeyX': 'X', 'KeyC': 'C', 'KeyV': 'V', 'KeyB': 'B',
    'KeyN': 'N', 'KeyM': 'M'
};

// Canvas Background 2D Blueprint Grid
function initBackground() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let currentMouseX = mouseX;
    let currentMouseY = mouseY;
    const GRID_SIZE = 40;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function animate() {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        currentMouseX += (mouseX - currentMouseX) * 0.08;
        currentMouseY += (mouseY - currentMouseY) * 0.08;

        // Base 2D grid lines
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(19, 36, 27, 0.45)';

        ctx.beginPath();
        for (let x = 0; x <= w; x += GRID_SIZE) {
            ctx.moveTo(x + 0.5, 0);
            ctx.lineTo(x + 0.5, h);
        }
        for (let y = 0; y <= h; y += GRID_SIZE) {
            ctx.moveTo(0, y + 0.5);
            ctx.lineTo(w, y + 0.5);
        }
        ctx.stroke();

        // Radial Torch
        const gradient = ctx.createRadialGradient(
            currentMouseX, currentMouseY, 20,
            currentMouseX, currentMouseY, 400
        );
        gradient.addColorStop(0, 'rgba(0, 255, 157, 0.07)');
        gradient.addColorStop(0.5, 'rgba(0, 255, 157, 0.02)');
        gradient.addColorStop(1, 'rgba(0, 255, 157, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        // Crosshairs near cursor
        ctx.fillStyle = 'rgba(0, 255, 157, 0.25)';
        const startX = Math.floor((currentMouseX - 250) / GRID_SIZE) * GRID_SIZE;
        const endX = Math.ceil((currentMouseX + 250) / GRID_SIZE) * GRID_SIZE;
        const startY = Math.floor((currentMouseY - 250) / GRID_SIZE) * GRID_SIZE;
        const endY = Math.ceil((currentMouseY + 250) / GRID_SIZE) * GRID_SIZE;

        for (let x = startX; x <= endX; x += GRID_SIZE) {
            for (let y = startY; y <= endY; y += GRID_SIZE) {
                const dist = Math.hypot(x - currentMouseX, y - currentMouseY);
                if (dist < 250) {
                    const alpha = (1 - dist / 250) * 0.4;
                    ctx.fillStyle = `rgba(0, 255, 157, ${alpha})`;
                    ctx.fillRect(x - 1, y - 1, 3, 3);
                }
            }
        }

        requestAnimationFrame(animate);
    }

    resize();
    animate();
}

// Toast Messages
function showToast(msg) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 2200);
}

// Dynamic Attempts Calculation
function calcAttempts(len) {
    if (len <= 6) return 6;
    if (len <= 8) return 7;
    if (len <= 10) return 8;
    if (len <= 13) return 9;
    if (len <= 16) return 10;
    return 11;
}

// Lock / Unlock In-Game Language and Length Settings
function setControlsLocked(isLocked) {
    const btnLang = document.getElementById('btn-lang');
    const modalLangToggle = document.getElementById('modal-lang-toggle');
    const lenBtns = document.querySelectorAll('.len-btn');
    const btnDots = document.getElementById('btn-open-range');

    if (isLocked) {
        btnLang.classList.add('locked');
        btnLang.setAttribute('disabled', 'true');
        btnLang.title = state.lang === 'RU' ? 'Язык заблокирован во время раунда' : 'Language locked during round';

        if (modalLangToggle) {
            modalLangToggle.classList.add('locked');
            modalLangToggle.setAttribute('disabled', 'true');
        }

        lenBtns.forEach(btn => {
            btn.classList.add('locked');
            btn.setAttribute('disabled', 'true');
        });
        if (btnDots) {
            btnDots.setAttribute('disabled', 'true');
            btnDots.style.pointerEvents = 'none';
            btnDots.style.opacity = '0.4';
        }
    } else {
        btnLang.classList.remove('locked');
        btnLang.removeAttribute('disabled');
        btnLang.title = state.lang === 'RU' ? 'Сменить язык' : 'Switch Language';

        if (modalLangToggle) {
            modalLangToggle.classList.remove('locked');
            modalLangToggle.removeAttribute('disabled');
        }

        lenBtns.forEach(btn => {
            if (state.isCustomMode) {
                btn.classList.remove('active');
                btn.classList.add('locked');
                btn.setAttribute('disabled', 'true');
            } else {
                btn.classList.remove('locked');
                btn.removeAttribute('disabled');
            }
        });
        if (btnDots) {
            if (state.isCustomMode) {
                btnDots.setAttribute('disabled', 'true');
                btnDots.style.pointerEvents = 'none';
                btnDots.style.opacity = '0.4';
            } else {
                btnDots.removeAttribute('disabled');
                btnDots.style.pointerEvents = 'auto';
                btnDots.style.opacity = '1';
            }
        }
    }
}

// Start New Game
function startNewGame() {
    state.isGameOver = false;
    state.hasStarted = false;
    state.currentRow = 0;
    state.currentCol = 0;
    state.keyStatuses = {};

    let chosenLen = state.wordLength;

    if (state.isCustomMode && state.customWord) {
        state.targetWord = state.customWord.toUpperCase();
        chosenLen = state.targetWord.length;
    } else if (state.isRandomLength) {
        const minL = Math.min(state.rndMin, state.rndMax);
        const maxL = Math.max(state.rndMin, state.rndMax);
        const rolled = Math.floor(Math.random() * (maxL - minL + 1)) + minL;

        if (rolled >= 11) {
            const xlDict = (DICTIONARY[state.lang] && DICTIONARY[state.lang]["11+"]) || [];
            if (xlDict.length > 0) {
                state.targetWord = xlDict[Math.floor(Math.random() * xlDict.length)].toUpperCase();
                chosenLen = state.targetWord.length;
            } else {
                state.targetWord = state.lang === 'RU' ? 'ПРИКЛЮЧЕНИЯ' : 'ADVENTURES';
                chosenLen = state.targetWord.length;
            }
        } else {
            chosenLen = rolled;
            const dict = (DICTIONARY[state.lang] && DICTIONARY[state.lang][chosenLen]) || [];
            if (dict.length > 0) {
                state.targetWord = dict[Math.floor(Math.random() * dict.length)].toUpperCase();
            } else {
                state.targetWord = (state.lang === 'RU' ? 'КОСМОС' : 'PLANET').slice(0, chosenLen).toUpperCase();
            }
        }
    } else if (state.isXLMode) {
        const xlDict = (DICTIONARY[state.lang] && DICTIONARY[state.lang]["11+"]) || [];
        if (xlDict.length > 0) {
            state.targetWord = xlDict[Math.floor(Math.random() * xlDict.length)].toUpperCase();
            chosenLen = state.targetWord.length;
        } else {
            state.targetWord = state.lang === 'RU' ? 'ПРИКЛЮЧЕНИЯ' : 'ADVENTURES';
            chosenLen = state.targetWord.length;
        }
    } else {
        const dict = (DICTIONARY[state.lang] && DICTIONARY[state.lang][chosenLen]) || [];
        if (dict.length > 0) {
            state.targetWord = dict[Math.floor(Math.random() * dict.length)].toUpperCase();
        } else {
            state.targetWord = (state.lang === 'RU' ? 'КОСМОС' : 'PLANET').slice(0, chosenLen).toUpperCase();
        }
    }

    state.activeLength = chosenLen;
    state.maxAttempts = calcAttempts(chosenLen);

    // Auto strict mode default logic
    if (state.isXLMode || (state.isRandomLength && chosenLen >= 11) || (state.isCustomMode && chosenLen >= 11)) {
        if (localStorage.getItem('flexle_strict') === null) {
            state.strictMode = false;
        }
    } else {
        if (localStorage.getItem('flexle_strict') === null) {
            state.strictMode = true;
        }
    }
    const toggleStrict = document.getElementById('toggle-strict');
    if (toggleStrict) toggleStrict.checked = state.strictMode;

    document.getElementById('attempts-pill').textContent = `${state.maxAttempts} attempts (${chosenLen} letters)`;
    setControlsLocked(false);

    // Update challenge banner
    const challengeBanner = document.getElementById('challenge-banner');
    if (challengeBanner) {
        if (state.isCustomMode) {
            challengeBanner.style.display = 'flex';
            updateChallengeBannerLocalization();
        } else {
            challengeBanner.style.display = 'none';
        }
    }

    // Initialize Grid Array
    state.grid = Array.from({ length: state.maxAttempts }, () => Array(chosenLen).fill(''));

    renderBoard();
    renderKeyboard();
    closeAllModals();
}

// Render Board with Adaptive Tile Size
function renderBoard() {
    const board = document.getElementById('board');
    board.innerHTML = '';
    board.style.gridTemplateRows = `repeat(${state.maxAttempts}, 1fr)`;

    let tileSize = 48;
    let fontSize = 1.4;

    if (state.activeLength > 12) {
        tileSize = Math.max(22, Math.floor(650 / state.activeLength) - 5);
        fontSize = 0.9;
    } else if (state.activeLength > 8) {
        tileSize = Math.max(30, Math.floor(650 / state.activeLength) - 6);
        fontSize = 1.1;
    } else if (state.activeLength > 6) {
        tileSize = 42;
        fontSize = 1.3;
    }

    document.documentElement.style.setProperty('--tile-size', `${tileSize}px`);
    document.documentElement.style.setProperty('--tile-font', `${fontSize}rem`);

    for (let r = 0; r < state.maxAttempts; r++) {
        const row = document.createElement('div');
        row.className = 'row';
        row.id = `row-${r}`;
        row.style.display = 'grid';
        row.style.gridTemplateColumns = `repeat(${state.activeLength}, 1fr)`;
        row.style.gap = state.activeLength > 10 ? '3px' : '5px';

        for (let c = 0; c < state.activeLength; c++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.id = `tile-${r}-${c}`;
            tile.textContent = state.grid[r][c] || '';
            if (state.grid[r][c]) {
                tile.setAttribute('data-state', 'active');
            }
            row.appendChild(tile);
        }
        board.appendChild(row);
    }
}

// Render Virtual Keyboard
function renderKeyboard() {
    const kbContainer = document.getElementById('keyboard');
    kbContainer.innerHTML = '';

    const layout = KEYBOARDS[state.lang] || KEYBOARDS.EN;

    layout.forEach(rowKeys => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'kb-row';

        rowKeys.forEach(key => {
            const btn = document.createElement('button');
            btn.className = 'key';
            if (key === 'ENTER' || key === 'DEL') {
                btn.classList.add('wide');
            }
            btn.textContent = key;
            btn.dataset.key = key;

            const status = state.keyStatuses[key];
            if (status) {
                btn.setAttribute('data-state', status);
            }

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                handleInput(key === 'DEL' ? 'BACKSPACE' : key);
            });

            rowDiv.appendChild(btn);
        });

        kbContainer.appendChild(rowDiv);
    });
}

// Handle Key / Input
function handleInput(key) {
    if (state.isGameOver) return;

    if (key === 'BACKSPACE') {
        if (state.currentCol > 0) {
            sounds.playBackspace();
            state.currentCol--;
            state.grid[state.currentRow][state.currentCol] = '';
            const tile = document.getElementById(`tile-${state.currentRow}-${state.currentCol}`);
            if (tile) {
                tile.textContent = '';
                tile.removeAttribute('data-state');
            }
        }
        return;
    }

    if (key === 'ENTER') {
        if (state.currentCol < state.activeLength) {
            sounds.playShake();
            shakeRow(state.currentRow);
            showToast(state.lang === 'RU' ? 'Слишком мало букв' : 'Not enough letters');
            return;
        }
        submitGuess();
        return;
    }

    // Letter Input
    if (state.currentCol < state.activeLength) {
        const cleanLetter = key.toUpperCase();
        const isRu = /^[А-ЯЁ]$/i.test(cleanLetter);
        const isEn = /^[A-Z]$/i.test(cleanLetter);

        if ((state.lang === 'RU' && isRu) || (state.lang === 'EN' && isEn)) {
            sounds.playKeyTap();

            if (!state.hasStarted) {
                state.hasStarted = true;
                setControlsLocked(true);
            }

            state.grid[state.currentRow][state.currentCol] = cleanLetter;
            const tile = document.getElementById(`tile-${state.currentRow}-${state.currentCol}`);
            if (tile) {
                tile.textContent = cleanLetter;
                tile.setAttribute('data-state', 'active');
            }
            state.currentCol++;
        }
    }
}

// Shake Row Animation
function shakeRow(rowIndex) {
    const row = document.getElementById(`row-${rowIndex}`);
    if (row) {
        row.classList.add('shake');
        setTimeout(() => row.classList.remove('shake'), 500);
    }
}

// Bounce Row Animation
function bounceRow(rowIndex) {
    const row = document.getElementById(`row-${rowIndex}`);
    if (row) {
        row.classList.add('bounce');
    }
}

// Submit Guess
function submitGuess() {
    const guess = state.grid[state.currentRow].join('').toUpperCase();

    // Strict Mode Check
    if (state.strictMode) {
        const dict = (DICTIONARY[state.lang] && DICTIONARY[state.lang][state.activeLength]) || [];
        if (!dict.includes(guess)) {
            sounds.playShake();
            shakeRow(state.currentRow);
            showToast(state.lang === 'RU' ? 'Нет в списке слов' : 'Not in word list');
            return;
        }
    }

    const target = state.targetWord;
    const targetLetterCounts = {};
    for (let char of target) {
        targetLetterCounts[char] = (targetLetterCounts[char] || 0) + 1;
    }

    const evaluation = Array(state.activeLength).fill('absent');

    // Step 1: Green (Correct)
    for (let i = 0; i < state.activeLength; i++) {
        if (guess[i] === target[i]) {
            evaluation[i] = 'correct';
            targetLetterCounts[guess[i]]--;
        }
    }

    // Step 2: Yellow (Present)
    for (let i = 0; i < state.activeLength; i++) {
        if (evaluation[i] !== 'correct') {
            const letter = guess[i];
            if (targetLetterCounts[letter] && targetLetterCounts[letter] > 0) {
                evaluation[i] = 'present';
                targetLetterCounts[letter]--;
            }
        }
    }

    // Animate Tiles Flip with pitch-scaled chime
    const rowTiles = [];
    for (let c = 0; c < state.activeLength; c++) {
        rowTiles.push(document.getElementById(`tile-${state.currentRow}-${c}`));
    }

    const flipInterval = state.activeLength > 10 ? 120 : 180;

    rowTiles.forEach((tile, index) => {
        setTimeout(() => {
            sounds.playFlip(index);
            if (tile) {
                tile.classList.add('flip');
                tile.setAttribute('data-state', evaluation[index]);
            }

            // Update Keyboard Status
            const letter = guess[index];
            const currentStatus = state.keyStatuses[letter];
            const newStatus = evaluation[index];

            if (newStatus === 'correct' || (newStatus === 'present' && currentStatus !== 'correct') || (!currentStatus && newStatus === 'absent')) {
                state.keyStatuses[letter] = newStatus;
                const keyBtn = document.querySelector(`.key[data-key="${letter}"]`);
                if (keyBtn) {
                    keyBtn.setAttribute('data-state', newStatus);
                }
            }
        }, index * flipInterval);
    });

    const isWin = guess === target;
    const isLastAttempt = state.currentRow + 1 >= state.maxAttempts;

    setTimeout(() => {
        if (isWin) {
            state.isGameOver = true;
            bounceRow(state.currentRow);
            sounds.playWin();
            setTimeout(() => {
                showGameOver(true);
            }, 800);
        } else if (isLastAttempt) {
            state.isGameOver = true;
            sounds.playLoss();
            setTimeout(() => {
                showGameOver(false);
            }, 800);
        } else {
            state.currentRow++;
            state.currentCol = 0;
        }
    }, state.activeLength * flipInterval + 200);
}

// Game Over Modal
function showGameOver(isWin) {
    const modal = document.getElementById('modal-gameover');
    const title = document.getElementById('gameover-title');
    const desc = document.getElementById('gameover-desc');
    const wordElem = document.getElementById('gameover-word');

    if (isWin) {
        title.textContent = state.lang === 'RU' ? 'Победа!' : 'Splendid!';
        desc.textContent = state.lang === 'RU' ? `Вы угадали слово за ${state.currentRow + 1} попыток!` : `You solved it in ${state.currentRow + 1} guesses!`;
    } else {
        title.textContent = state.lang === 'RU' ? 'Раунд окончен' : 'Game Over';
        desc.textContent = state.lang === 'RU' ? 'Загаданное слово:' : 'The secret word was:';
    }

    wordElem.textContent = state.targetWord;
    modal.classList.add('open');
}

function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
}

function updateSoundUI() {
    const iconOn = document.getElementById('icon-sound-on');
    const iconOff = document.getElementById('icon-sound-off');
    const toggleSound = document.getElementById('toggle-sound');

    if (sounds.isMuted) {
        iconOn.style.display = 'none';
        iconOff.style.display = 'block';
        if (toggleSound) toggleSound.checked = false;
    } else {
        iconOn.style.display = 'block';
        iconOff.style.display = 'none';
        if (toggleSound) toggleSound.checked = true;
    }
}

// --- Interactive Dual Drum / Wheel Range Picker [ MIN ] - [ MAX ] ---
const TICKS = [4, 5, 6, 7, 8, 9, 10, 11]; // 11 represents 11+
const ITEM_HEIGHT = 56;
let tempMin = state.rndMin;
let tempMax = state.rndMax;

function updateRangeModalLocalization() {
    const isRu = state.lang === 'RU';
    const title = document.getElementById('rnd-range-title');
    const subtitle = document.getElementById('rnd-range-subtitle');
    const lblMin = document.getElementById('lbl-drum-min');
    const lblMax = document.getElementById('lbl-drum-max');
    const lblPresets = document.getElementById('lbl-presets');
    const btnSaveText = document.getElementById('btn-save-range-text');

    if (title) title.textContent = isRu ? 'Диапазон длины слов' : 'Random Range';
    if (subtitle) subtitle.textContent = isRu ? 'Интервал длин слов для режима «Случайно»' : 'Word length interval for random mode';
    if (lblMin) lblMin.textContent = isRu ? 'МИН' : 'MIN';
    if (lblMax) lblMax.textContent = isRu ? 'МАКС' : 'MAX';
    if (lblPresets) lblPresets.textContent = isRu ? 'Пресеты:' : 'Presets:';
    if (btnSaveText) btnSaveText.textContent = isRu ? 'Применить диапазон' : 'Apply Range';

    // Localize preset chip names
    document.querySelectorAll('.preset-chip .preset-name').forEach(nameEl => {
        const txt = nameEl.getAttribute(isRu ? 'data-ru' : 'data-en');
        if (txt) nameEl.textContent = txt;
    });
}

function renderDrumWheel(colType, currentVal) {
    const track = document.getElementById(`drum-track-${colType}`);
    const viewport = document.getElementById(`drum-viewport-${colType}`);
    if (!track || !viewport) return;

    const curIdx = TICKS.indexOf(currentVal);
    track.innerHTML = '';

    TICKS.forEach((val, idx) => {
        const item = document.createElement('div');
        item.className = 'drum-item';
        item.textContent = val === 11 ? '11+' : val;
        item.dataset.index = idx;
        item.dataset.val = val;

        const dist = Math.abs(idx - curIdx);
        if (dist === 0) {
            item.classList.add('active');
        } else if (dist === 1) {
            item.classList.add('neighbor');
        } else {
            item.classList.add('distant');
        }

        item.addEventListener('click', (e) => {
            e.stopPropagation();
            setDrumValue(colType, val);
        });

        track.appendChild(item);
    });

    const targetY = ITEM_HEIGHT - curIdx * ITEM_HEIGHT;
    track.style.transform = `translateY(${targetY}px)`;
    viewport.setAttribute('aria-valuenow', currentVal);
}

function setDrumValue(colType, val, playAudio = true) {
    if (colType === 'min') {
        tempMin = val;
        if (tempMin > tempMax) {
            tempMax = tempMin;
        }
    } else {
        tempMax = val;
        if (tempMax < tempMin) {
            tempMin = tempMax;
        }
    }
    if (playAudio && sounds.playTick) sounds.playTick();
    renderAxisUI();
}

function renderAxisUI() {
    renderDrumWheel('min', tempMin);
    renderDrumWheel('max', tempMax);

    // Range length count
    const minIdx = TICKS.indexOf(tempMin);
    const maxIdx = TICKS.indexOf(tempMax);
    const totalSelected = (maxIdx >= 0 && minIdx >= 0) ? (maxIdx - minIdx + 1) : 1;
    const countBadge = document.getElementById('val-range-count');

    if (countBadge) {
        if (state.lang === 'RU') {
            const word = totalSelected === 1 ? 'длина' : (totalSelected < 5 ? 'длины' : 'длин');
            countBadge.textContent = `${totalSelected} ${word}`;
        } else {
            countBadge.textContent = `${totalSelected} ${totalSelected === 1 ? 'length' : 'lengths'}`;
        }
    }

    // Update Preset Chips Active state
    document.querySelectorAll('.preset-chip').forEach(chip => {
        const pMin = parseInt(chip.dataset.min, 10);
        const pMax = parseInt(chip.dataset.max, 10);
        if (pMin === tempMin && pMax === tempMax) {
            chip.classList.add('active');
        } else {
            chip.classList.remove('active');
        }
    });

    updateRangeModalLocalization();
}

// Attach Drag, Wheel & Keyboard Listeners to Wheels
function initDraggableHandles() {
    ['min', 'max'].forEach(colType => {
        const viewport = document.getElementById(`drum-viewport-${colType}`);
        const track = document.getElementById(`drum-track-${colType}`);
        if (!viewport || !track) return;

        // Mouse Wheel scrolling
        viewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            const curVal = colType === 'min' ? tempMin : tempMax;
            const curIdx = TICKS.indexOf(curVal);
            if (e.deltaY > 0) {
                if (curIdx < TICKS.length - 1) {
                    setDrumValue(colType, TICKS[curIdx + 1]);
                }
            } else if (e.deltaY < 0) {
                if (curIdx > 0) {
                    setDrumValue(colType, TICKS[curIdx - 1]);
                }
            }
        }, { passive: false });

        // Touch & Pointer Dragging
        let isDragging = false;
        let startY = 0;
        let startTranslateY = 0;

        viewport.addEventListener('pointerdown', (e) => {
            isDragging = true;
            startY = e.clientY;
            const curVal = colType === 'min' ? tempMin : tempMax;
            const curIdx = TICKS.indexOf(curVal);
            startTranslateY = ITEM_HEIGHT - curIdx * ITEM_HEIGHT;
            track.classList.add('dragging');

            if (viewport.setPointerCapture) {
                viewport.setPointerCapture(e.pointerId);
            }
        });

        viewport.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            const deltaY = e.clientY - startY;
            const currentY = startTranslateY + deltaY;
            track.style.transform = `translateY(${currentY}px)`;
        });

        function onPointerEnd(e) {
            if (!isDragging) return;
            isDragging = false;
            track.classList.remove('dragging');
            const deltaY = e.clientY - startY;
            const finalY = startTranslateY + deltaY;
            
            let targetIdx = Math.round((ITEM_HEIGHT - finalY) / ITEM_HEIGHT);
            targetIdx = Math.max(0, Math.min(TICKS.length - 1, targetIdx));
            setDrumValue(colType, TICKS[targetIdx]);
        }

        viewport.addEventListener('pointerup', onPointerEnd);
        viewport.addEventListener('pointercancel', onPointerEnd);

        // Keyboard navigation (Up/Down)
        viewport.addEventListener('keydown', (e) => {
            const curVal = colType === 'min' ? tempMin : tempMax;
            const curIdx = TICKS.indexOf(curVal);
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (curIdx > 0) setDrumValue(colType, TICKS[curIdx - 1]);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (curIdx < TICKS.length - 1) setDrumValue(colType, TICKS[curIdx + 1]);
            }
        });
    });
}

// Physical Keyboard Listener
window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (document.querySelector('.modal-overlay.open')) {
        if (e.key === 'Escape') closeAllModals();
        return;
    }

    const key = e.key;
    const code = e.code;

    if (key === 'Enter') {
        e.preventDefault();
        handleInput('ENTER');
        return;
    }

    if (key === 'Backspace') {
        e.preventDefault();
        handleInput('BACKSPACE');
        return;
    }

    let mappedLetter = null;
    if (state.lang === 'RU') {
        if (RU_CODE_MAP[code]) {
            mappedLetter = RU_CODE_MAP[code];
        } else if (/^[А-ЯЁ]$/i.test(key)) {
            mappedLetter = key.toUpperCase();
        }
    } else {
        if (EN_CODE_MAP[code]) {
            mappedLetter = EN_CODE_MAP[code];
        } else if (/^[A-Z]$/i.test(key)) {
            mappedLetter = key.toUpperCase();
        }
    }

    if (mappedLetter) {
        e.preventDefault();
        handleInput(mappedLetter);
    }
});

// UI Event Handlers
document.addEventListener('DOMContentLoaded', () => {
    initBackground();
    updateSoundUI();
    initDraggableHandles();
    renderAxisUI();
    updateRangeModalLocalization();

    // Hide preloader smoothly
    setTimeout(() => {
        const preloader = document.getElementById('preloader');
        if (preloader) {
            preloader.classList.add('loaded');
        }
    }, 400);

    // Sound toggle in header
    document.getElementById('btn-sound').addEventListener('click', () => {
        sounds.toggleMute();
        updateSoundUI();
        showToast(sounds.isMuted ? 'Sound: Muted' : 'Sound: Enabled');
    });

    // Sound toggle in settings modal
    const toggleSound = document.getElementById('toggle-sound');
    if (toggleSound) {
        toggleSound.addEventListener('change', (e) => {
            sounds.isMuted = !e.target.checked;
            localStorage.setItem('flexle_muted', sounds.isMuted);
            updateSoundUI();
        });
    }

    // Length Selector Buttons
    const lenBtns = document.querySelectorAll('.len-btn[data-len]');
    lenBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (state.hasStarted && !state.isGameOver) return;

            lenBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const val = btn.getAttribute('data-len');
            if (val === 'random') {
                state.isRandomLength = true;
                state.isXLMode = false;
            } else if (val === '11+') {
                state.isXLMode = true;
                state.isRandomLength = false;
            } else {
                state.isRandomLength = false;
                state.isXLMode = false;
                state.wordLength = parseInt(val, 10);
            }
            startNewGame();
        });
    });

    // Open Random Range Modal
    const btnOpenRange = document.getElementById('btn-open-range');
    const modalRndRange = document.getElementById('modal-rnd-range');
    btnOpenRange.addEventListener('click', () => {
        tempMin = state.rndMin;
        tempMax = state.rndMax;
        renderAxisUI();
        modalRndRange.classList.add('open');
    });

    document.getElementById('close-rnd-range').addEventListener('click', () => {
        modalRndRange.classList.remove('open');
    });

    // Quick Presets
    document.querySelectorAll('.preset-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            tempMin = parseInt(chip.dataset.min, 10);
            tempMax = parseInt(chip.dataset.max, 10);
            if (sounds.playTick) sounds.playTick();
            renderAxisUI();
        });
    });

    // Apply Range
    document.getElementById('btn-save-range').addEventListener('click', () => {
        state.rndMin = Math.min(tempMin, tempMax);
        state.rndMax = Math.max(tempMin, tempMax);
        localStorage.setItem('flexle_rnd_range', JSON.stringify({ min: state.rndMin, max: state.rndMax }));
        modalRndRange.classList.remove('open');
        const minLabel = state.rndMin === 11 ? '11+' : state.rndMin;
        const maxLabel = state.rndMax === 11 ? '11+' : state.rndMax;
        const toastMsg = state.lang === 'RU'
            ? `Диапазон: [ ${minLabel} … ${maxLabel} ]`
            : `Random range: [ ${minLabel} … ${maxLabel} ]`;
        showToast(toastMsg);
        
        if (state.isRandomLength && !state.hasStarted) {
            startNewGame();
        }
    });

    // Language Toggle Button (Header)
    const btnLang = document.getElementById('btn-lang');
    btnLang.textContent = state.lang;
    btnLang.addEventListener('click', () => {
        if (state.hasStarted && !state.isGameOver) {
            showToast(state.lang === 'RU' ? 'Смена языка заблокирована во время раунда' : 'Language locked during round');
            return;
        }
        state.lang = state.lang === 'RU' ? 'EN' : 'RU';
        localStorage.setItem('flexle_lang', state.lang);
        btnLang.textContent = state.lang;
        document.getElementById('modal-lang-toggle').textContent = state.lang;
        updateRangeModalLocalization();
        renderAxisUI();
        startNewGame();
    });

    // Restart Button
    document.getElementById('btn-restart').addEventListener('click', () => {
        startNewGame();
    });

    // Settings Modal
    const modalSettings = document.getElementById('modal-settings');
    document.getElementById('btn-settings').addEventListener('click', () => {
        modalSettings.classList.add('open');
    });
    document.getElementById('close-settings').addEventListener('click', () => {
        modalSettings.classList.remove('open');
    });

    // Strict Mode Switch
    const toggleStrict = document.getElementById('toggle-strict');
    toggleStrict.checked = state.strictMode;
    toggleStrict.addEventListener('change', (e) => {
        state.strictMode = e.target.checked;
        localStorage.setItem('flexle_strict', state.strictMode);
        showToast(state.strictMode ? 'Strict Mode: ON' : 'Strict Mode: OFF');
    });

    // Hard Mode Switch
    const toggleHard = document.getElementById('toggle-hard');
    if (toggleHard) {
        toggleHard.checked = state.hardMode;
        toggleHard.addEventListener('change', (e) => {
            state.hardMode = e.target.checked;
            localStorage.setItem('flexle_hard', state.hardMode);
            showToast(state.hardMode ? 'Hard Mode: ON' : 'Hard Mode: OFF');
        });
    }

    // Modal Language Switch
    const modalLangToggle = document.getElementById('modal-lang-toggle');
    modalLangToggle.textContent = state.lang;
    modalLangToggle.addEventListener('click', () => {
        if (state.hasStarted && !state.isGameOver) {
            showToast(state.lang === 'RU' ? 'Смена языка заблокирована во время раунда' : 'Language locked during round');
            return;
        }
        state.lang = state.lang === 'RU' ? 'EN' : 'RU';
        localStorage.setItem('flexle_lang', state.lang);
        btnLang.textContent = state.lang;
        modalLangToggle.textContent = state.lang;
        updateRangeModalLocalization();
        updateCustomModalLocalization();
        renderAxisUI();
        startNewGame();
    });

    // Game Over Modal Close & Play Again
    document.getElementById('close-gameover').addEventListener('click', () => {
        document.getElementById('modal-gameover').classList.remove('open');
    });
    document.getElementById('btn-play-again').addEventListener('click', () => {
        startNewGame();
    });

    // Close Modals on background click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('open');
            }
        });
    });

    // Initialize Custom Word Challenge Modal and URL Listener
    initCustomWordModal();
    const hasChallenge = checkUrlChallenge();
    if (hasChallenge) {
        btnLang.textContent = state.lang;
        if (modalLangToggle) modalLangToggle.textContent = state.lang;
        showToast(state.lang === 'RU' ? '🎮 Загружен челлендж от друга!' : '🎮 Custom challenge loaded!');
    }

    // Start initial game
    startNewGame();
});

// Custom Word Challenge UI and Controller
function initCustomWordModal() {
    const btnCustomWord = document.getElementById('btn-custom-word');
    const modalCustomWord = document.getElementById('modal-custom-word');
    const closeCustomWord = document.getElementById('close-custom-word');
    const wordInput = document.getElementById('custom-word-input');
    const lenCounter = document.getElementById('custom-len-counter');
    const valMsg = document.getElementById('custom-validation-msg');
    const btnGenerate = document.getElementById('btn-generate-challenge');
    const linkResult = document.getElementById('custom-link-result');
    const shareUrlInput = document.getElementById('custom-share-url');
    const btnCopyUrl = document.getElementById('btn-copy-challenge-url');
    const pillRu = document.getElementById('btn-pill-ru');
    const pillEn = document.getElementById('btn-pill-en');

    let customLang = state.lang || 'RU';

    function setPillActive(lang) {
        customLang = lang;
        if (lang === 'RU') {
            if (pillRu) pillRu.classList.add('active');
            if (pillEn) pillEn.classList.remove('active');
        } else {
            if (pillEn) pillEn.classList.add('active');
            if (pillRu) pillRu.classList.remove('active');
        }
        validateCustomInput();
    }

    if (pillRu) pillRu.addEventListener('click', () => setPillActive('RU'));
    if (pillEn) pillEn.addEventListener('click', () => setPillActive('EN'));

    function validateCustomInput() {
        if (!wordInput) return false;
        let val = (wordInput.value || '').toUpperCase();
        if (customLang === 'RU') {
            val = val.replace(/[^А-ЯЁ]/g, '');
        } else {
            val = val.replace(/[^A-Z]/g, '');
        }
        wordInput.value = val;

        const len = val.length;
        if (lenCounter) lenCounter.textContent = state.lang === 'RU' ? `${len} букв` : `${len} letters`;

        if (!valMsg) return false;

        if (len === 0) {
            valMsg.className = 'custom-validation-msg';
            valMsg.textContent = state.lang === 'RU' 
                ? 'Только буквы выбранного алфавита (от 4 до 16 букв)' 
                : 'Only letters of chosen alphabet (4 to 16 letters)';
            return false;
        }

        if (len < 4) {
            valMsg.className = 'custom-validation-msg invalid';
            valMsg.textContent = state.lang === 'RU' 
                ? 'Слишком короткое слово (минимум 4 буквы)' 
                : 'Word is too short (minimum 4 letters)';
            return false;
        }

        if (len > 16) {
            valMsg.className = 'custom-validation-msg invalid';
            valMsg.textContent = state.lang === 'RU' 
                ? 'Слишком длинное слово (максимум 16 букв)' 
                : 'Word is too long (maximum 16 letters)';
            return false;
        }

        // Check dictionary presence
        const dict = (DICTIONARY[customLang] && (DICTIONARY[customLang][len] || DICTIONARY[customLang]["11+"])) || [];
        const inDict = dict.includes(val);

        if (inDict) {
            valMsg.className = 'custom-validation-msg valid';
            valMsg.textContent = state.lang === 'RU'
                ? '✓ Слово найдено в словаре игры'
                : '✓ Valid word found in dictionary';
        } else {
            valMsg.className = 'custom-validation-msg';
            valMsg.textContent = state.lang === 'RU'
                ? 'Слово не в стандартном словаре (но ссылка всё равно сработает)'
                : 'Word not in standard dictionary (link will still work)';
        }

        return true;
    }

    if (wordInput) {
        wordInput.addEventListener('input', () => {
            validateCustomInput();
            if (linkResult) linkResult.style.display = 'none';
        });
    }

    if (btnCustomWord) {
        btnCustomWord.addEventListener('click', () => {
            setPillActive(state.lang);
            updateCustomModalLocalization();
            if (wordInput) {
                wordInput.value = '';
                validateCustomInput();
            }
            if (linkResult) linkResult.style.display = 'none';
            if (modalCustomWord) modalCustomWord.classList.add('open');
            setTimeout(() => { if (wordInput) wordInput.focus(); }, 150);
        });
    }

    if (closeCustomWord) {
        closeCustomWord.addEventListener('click', () => {
            if (modalCustomWord) modalCustomWord.classList.remove('open');
        });
    }

    if (btnGenerate) {
        btnGenerate.addEventListener('click', () => {
            if (!validateCustomInput()) {
                if (sounds.playShake) sounds.playShake();
                showToast(state.lang === 'RU' ? 'Введите слово от 4 до 16 букв' : 'Enter a word from 4 to 16 letters');
                return;
            }

            const word = wordInput.value.trim().toUpperCase();
            const encoded = encodeCustomChallenge(word, customLang);
            if (!encoded) {
                showToast('Encoding error');
                return;
            }

            const url = `${window.location.origin}${window.location.pathname}?custom=${encoded}`;
            if (shareUrlInput) shareUrlInput.value = url;
            if (linkResult) linkResult.style.display = 'block';
            if (sounds.playTick) sounds.playTick();
            if (shareUrlInput) shareUrlInput.select();
        });
    }

    if (btnCopyUrl) {
        btnCopyUrl.addEventListener('click', async () => {
            if (!shareUrlInput) return;
            const url = shareUrlInput.value;
            if (!url) return;
            try {
                await navigator.clipboard.writeText(url);
                if (sounds.playTick) sounds.playTick();
                showToast(state.lang === 'RU' ? '✨ Ссылка скопирована в буфер!' : '✨ Challenge link copied!');
                const copyText = document.getElementById('btn-copy-text');
                if (copyText) {
                    const orig = copyText.textContent;
                    copyText.textContent = state.lang === 'RU' ? 'Скопировано! ✓' : 'Copied! ✓';
                    setTimeout(() => { copyText.textContent = orig; }, 1800);
                }
            } catch (err) {
                shareUrlInput.select();
                document.execCommand('copy');
                showToast(state.lang === 'RU' ? 'Ссылка скопирована!' : 'Link copied!');
            }
        });
    }

    // Exit Challenge Button
    const btnExitChallenge = document.getElementById('btn-exit-challenge');
    if (btnExitChallenge) {
        btnExitChallenge.addEventListener('click', () => {
            exitCustomChallenge();
        });
    }

    // Challenge Back from Game Over
    const btnChallengeBack = document.getElementById('btn-challenge-back');
    if (btnChallengeBack) {
        btnChallengeBack.addEventListener('click', () => {
            const modalGov = document.getElementById('modal-gameover');
            if (modalGov) modalGov.classList.remove('open');
            if (btnCustomWord) btnCustomWord.click();
        });
    }
}

function exitCustomChallenge() {
    state.isCustomMode = false;
    state.customWord = null;
    try {
        const url = new URL(window.location.href);
        url.searchParams.delete('custom');
        url.searchParams.delete('word');
        const cleanSearch = url.search ? '?' + url.searchParams.toString() : '';
        window.history.replaceState({}, '', url.pathname + cleanSearch);
    } catch (e) {}

    const banner = document.getElementById('challenge-banner');
    if (banner) banner.style.display = 'none';

    showToast(state.lang === 'RU' ? 'Возврат в стандартный режим' : 'Switched to standard mode');
    startNewGame();
}

function updateChallengeBannerLocalization() {
    const isRu = state.lang === 'RU';
    const text = document.getElementById('challenge-text');
    const exitText = document.getElementById('btn-exit-challenge-text');
    if (text) text.textContent = isRu ? 'Вы играете в кастомную загадку от друга!' : 'You are playing a custom challenge from a friend!';
    if (exitText) exitText.textContent = isRu ? 'Стандартная игра' : 'Standard Game';
}

function updateCustomModalLocalization() {
    const isRu = state.lang === 'RU';
    const title = document.getElementById('custom-modal-title');
    const sub = document.getElementById('custom-modal-subtitle');
    const lblInput = document.getElementById('lbl-custom-input');
    const input = document.getElementById('custom-word-input');
    const lblLang = document.getElementById('lbl-custom-lang');
    const btnGen = document.getElementById('btn-generate-text');
    const lblShare = document.getElementById('lbl-custom-share');
    const btnCopy = document.getElementById('btn-copy-text');
    const btnBackText = document.getElementById('btn-challenge-back-text');

    if (title) title.textContent = isRu ? 'Загадать слово' : 'Create Challenge';
    if (sub) sub.textContent = isRu ? 'Создайте ссылку-загадку для друга без сервера' : 'Generate a challenge URL for a friend (Zero server)';
    if (lblInput) lblInput.textContent = isRu ? 'Секретное слово:' : 'Secret Word:';
    if (input) input.placeholder = isRu ? 'ВВЕДИТЕ СЛОВО...' : 'ENTER WORD...';
    if (lblLang) lblLang.textContent = isRu ? 'Язык слова:' : 'Word Language:';
    if (btnGen) btnGen.textContent = isRu ? 'Сгенерировать ссылку' : 'Generate Challenge Link';
    if (lblShare) lblShare.textContent = isRu ? 'Ссылка для друга:' : 'Share Link for Friend:';
    if (btnCopy) btnCopy.textContent = isRu ? 'Копировать' : 'Copy Link';
    if (btnBackText) btnBackText.textContent = isRu ? 'Загадать в ответ' : 'Challenge Back';
}
