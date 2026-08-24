// Game State
const state = {
    lang: localStorage.getItem('flexle_lang') || 'RU',
    strictMode: localStorage.getItem('flexle_strict') === 'true',
    wordLength: 5,
    isRandomLength: false,
    maxAttempts: 6,
    targetWord: '',
    currentRow: 0,
    currentCol: 0,
    grid: [],
    keyStatuses: {},
    isGameOver: false,
    hasStarted: false
};

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

// Canvas Background Stars
function initBackground() {
    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');
    let stars = [];

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        stars = [];
        const count = Math.floor((canvas.width * canvas.height) / 8000);
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 1.5,
                alpha: Math.random() * 0.8 + 0.2,
                speed: Math.random() * 0.3 + 0.05
            });
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        stars.forEach(star => {
            ctx.globalAlpha = star.alpha;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            ctx.fill();
            star.y -= star.speed;
            if (star.y < 0) {
                star.y = canvas.height;
                star.x = Math.random() * canvas.width;
            }
        });
        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);
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

// Attempts Calculation
function calcAttempts(len) {
    if (len <= 6) return 6;
    if (len <= 8) return 7;
    return 8;
}

// Lock / Unlock In-Game Language and Length Settings
function setControlsLocked(isLocked) {
    const btnLang = document.getElementById('btn-lang');
    const modalLangToggle = document.getElementById('modal-lang-toggle');
    const lenBtns = document.querySelectorAll('.len-btn');

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
    } else {
        btnLang.classList.remove('locked');
        btnLang.removeAttribute('disabled');
        btnLang.title = state.lang === 'RU' ? 'Сменить язык' : 'Switch Language';

        if (modalLangToggle) {
            modalLangToggle.classList.remove('locked');
            modalLangToggle.removeAttribute('disabled');
        }

        lenBtns.forEach(btn => {
            btn.classList.remove('locked');
            btn.removeAttribute('disabled');
        });
    }
}

// Init & Restart Game
function startNewGame() {
    state.isGameOver = false;
    state.hasStarted = false;
    state.currentRow = 0;
    state.currentCol = 0;
    state.keyStatuses = {};

    let chosenLen = state.wordLength;
    if (state.isRandomLength) {
        chosenLen = Math.floor(Math.random() * 7) + 4; // 4 to 10
    }
    state.activeLength = chosenLen;
    state.maxAttempts = calcAttempts(chosenLen);

    // Pick target word
    const dict = (DICTIONARY[state.lang] && DICTIONARY[state.lang][chosenLen]) || [];
    if (dict.length > 0) {
        state.targetWord = dict[Math.floor(Math.random() * dict.length)].toUpperCase();
    } else {
        state.targetWord = (state.lang === 'RU' ? 'КОСМОС' : 'PLANET').slice(0, chosenLen).toUpperCase();
    }

    document.getElementById('attempts-pill').textContent = `${state.maxAttempts} attempts`;
    setControlsLocked(false);

    // Initialize Grid Array
    state.grid = Array.from({ length: state.maxAttempts }, () => Array(chosenLen).fill(''));

    renderBoard();
    renderKeyboard();
    closeAllModals();
}

// Render Board
function renderBoard() {
    const board = document.getElementById('board');
    board.innerHTML = '';
    board.style.gridTemplateRows = `repeat(${state.maxAttempts}, 1fr)`;

    for (let r = 0; r < state.maxAttempts; r++) {
        const row = document.createElement('div');
        row.className = 'row';
        row.id = `row-${r}`;
        row.style.display = 'grid';
        row.style.gridTemplateColumns = `repeat(${state.activeLength}, 1fr)`;
        row.style.gap = '6px';

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
        }, index * 200);
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
    }, state.activeLength * 200 + 200);
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
            } else {
                state.isRandomLength = false;
                state.wordLength = parseInt(val, 10);
            }
            startNewGame();
        });
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

    // Start initial game
    startNewGame();
});
