/**
 * Quantex Game Engine
 * Cyberpunk More/Less Comparison Game (100% Live Open Data Feeds, Vector Icons & Procedural Cyber Audio)
 */

class QuantexGame {
    constructor() {
        this.questionsPerCategory = 5;
        this.categories = (window.liveFeedEngine && window.liveFeedEngine.categories.length === 5)
            ? window.liveFeedEngine.categories
            : (typeof QUANTEX_DATASET !== "undefined" ? QUANTEX_DATASET.categories : []);

        this.totalCategories = 5;
        this.totalQuestions = this.totalCategories * this.questionsPerCategory;

        this.currentCategoryIndex = 0;
        this.currentQuestionIndex = 0;
        this.overallScore = 0;
        this.categoryScores = [0, 0, 0, 0, 0];
        this.resultsMatrix = []; // 5 rows of 5 booleans

        this.gameRounds = [];
        this.isResolving = false;
        this.state = 'START';

        this.initDOMElements();
        this.initEventListeners();
        this.initLiveFeed();
    }

    initDOMElements() {
        // Screens
        this.startScreen = document.getElementById('start-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.transitionScreen = document.getElementById('transition-screen');
        this.resultsScreen = document.getElementById('results-screen');

        // Live Feed UI
        this.liveBeacon = document.getElementById('live-feed-beacon');
        this.liveStatusText = document.getElementById('live-status-text');
        this.btnSyncFeed = document.getElementById('btn-sync-feed');

        // Game UI
        this.categoryBadge = document.getElementById('category-badge');
        this.categoryName = document.getElementById('category-name');
        this.categoryDesc = document.getElementById('category-desc');
        this.progressStep = document.getElementById('progress-step');
        this.scoreDisplay = document.getElementById('score-display');
        this.progressBarFill = document.getElementById('progress-bar-fill');
        this.categoryPills = document.getElementById('category-pills');

        // Cards
        this.cardA = document.getElementById('card-a');
        this.cardB = document.getElementById('card-b');
        this.cardATitle = document.getElementById('card-a-title');
        this.cardBTitle = document.getElementById('card-b-title');
        this.cardASubtitle = document.getElementById('card-a-subtitle');
        this.cardBSubtitle = document.getElementById('card-b-subtitle');
        this.cardAIcon = document.getElementById('card-a-icon');
        this.cardBIcon = document.getElementById('card-b-icon');
        this.cardAValue = document.getElementById('card-a-value');
        this.cardBValue = document.getElementById('card-b-value');
        this.cardABadge = document.getElementById('card-a-badge');
        this.cardBBadge = document.getElementById('card-b-badge');

        // Buttons
        this.btnStart = document.getElementById('btn-start');
        this.btnPlayAgain = document.getElementById('btn-play-again');
        this.btnShare = document.getElementById('btn-share');
        this.btnMute = document.getElementById('btn-mute');
        this.btnHelp = document.getElementById('btn-help');
        this.modalHelp = document.getElementById('modal-help');
        this.modalHelpClose = document.getElementById('modal-help-close');

        // Transition Screen Elements
        this.transCatIcon = document.getElementById('trans-cat-icon');
        this.transCatName = document.getElementById('trans-cat-name');
        this.transScore = document.getElementById('trans-score');
        this.transNextCat = document.getElementById('trans-next-cat');
        this.btnTransContinue = document.getElementById('btn-trans-continue');

        // Results Elements
        this.resAccuracy = document.getElementById('res-accuracy');
        this.resScore = document.getElementById('res-score');
        this.resRank = document.getElementById('res-rank');
        this.resBreakdown = document.getElementById('res-breakdown');
        this.resBestScore = document.getElementById('res-best-score');
        this.toastShare = document.getElementById('toast-share');
    }

    initLiveFeed() {
        if (window.liveFeedEngine) {
            window.liveFeedEngine.onUpdate(({ status, details, categories }) => {
                if (this.liveStatusText) {
                    this.liveStatusText.textContent = details;
                }
                if (this.liveBeacon) {
                    if (status === 'READY') {
                        this.liveBeacon.classList.remove('syncing');
                        this.liveBeacon.classList.add('synced');
                    } else {
                        this.liveBeacon.classList.remove('synced');
                        this.liveBeacon.classList.add('syncing');
                    }
                }
                if (categories && categories.length === 5) {
                    this.categories = categories;
                    this.totalCategories = categories.length;
                    this.totalQuestions = this.totalCategories * this.questionsPerCategory;
                }
            });

            window.liveFeedEngine.loadAllLiveFeeds();
        }
    }

    initEventListeners() {
        this.btnStart.addEventListener('click', () => {
            window.soundEngine.playClick();
            this.startNewGame();
        });

        this.btnPlayAgain.addEventListener('click', () => {
            window.soundEngine.playClick();
            this.startNewGame();
        });

        this.btnShare.addEventListener('click', () => {
            window.soundEngine.playClick();
            this.copyShareResult();
        });

        this.btnMute.addEventListener('click', () => {
            const isMuted = window.soundEngine.toggleMute();
            this.updateMuteButton(isMuted);
        });
        this.updateMuteButton(window.soundEngine.isMuted);

        if (this.btnSyncFeed) {
            this.btnSyncFeed.addEventListener('click', async () => {
                window.soundEngine.playClick();
                if (this.btnSyncFeed) this.btnSyncFeed.classList.add('rotating');
                if (window.liveFeedEngine) {
                    await window.liveFeedEngine.loadAllLiveFeeds(true);
                    window.soundEngine.playSyncSuccess();
                }
                setTimeout(() => {
                    if (this.btnSyncFeed) this.btnSyncFeed.classList.remove('rotating');
                }, 800);
            });
        }

        if (this.btnHelp && this.modalHelp) {
            this.btnHelp.addEventListener('click', () => {
                window.soundEngine.playClick();
                this.modalHelp.classList.add('active');
            });
            this.modalHelpClose.addEventListener('click', () => {
                window.soundEngine.playClick();
                this.modalHelp.classList.remove('active');
            });
            this.modalHelp.addEventListener('click', (e) => {
                if (e.target === this.modalHelp) {
                    this.modalHelp.classList.remove('active');
                }
            });
        }

        this.cardA.addEventListener('click', () => this.handleSelection(0));
        this.cardB.addEventListener('click', () => this.handleSelection(1));

        this.cardA.addEventListener('mouseenter', () => { if (!this.isResolving && this.state === 'PLAYING') window.soundEngine.playHover(); });
        this.cardB.addEventListener('mouseenter', () => { if (!this.isResolving && this.state === 'PLAYING') window.soundEngine.playHover(); });

        this.btnTransContinue.addEventListener('click', () => {
            window.soundEngine.playClick();
            this.advanceFromTransition();
        });

        // Keyboard Controls
        window.addEventListener('keydown', (e) => {
            if (this.modalHelp && this.modalHelp.classList.contains('active')) {
                if (e.key === 'Escape') this.modalHelp.classList.remove('active');
                return;
            }

            if (this.state === 'START' && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                this.btnStart.click();
            } else if (this.state === 'PLAYING' && !this.isResolving) {
                if (e.key === '1' || e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
                    this.handleSelection(0);
                } else if (e.key === '2' || e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
                    this.handleSelection(1);
                }
            } else if (this.state === 'TRANSITION' && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                this.btnTransContinue.click();
            } else if (this.state === 'FINISHED' && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                this.btnPlayAgain.click();
            }
        });
    }

    updateMuteButton(isMuted) {
        if (this.btnMute) {
            const iconSvg = isMuted ? window.getQuantexIcon('sound_off') : window.getQuantexIcon('sound_on');
            this.btnMute.innerHTML = `${iconSvg} <span>${isMuted ? 'MUTE' : 'SOUND'}</span>`;
            this.btnMute.setAttribute('aria-label', isMuted ? 'Unmute Sound' : 'Mute Sound');
            if (isMuted) {
                this.btnMute.classList.add('muted');
            } else {
                this.btnMute.classList.remove('muted');
            }
        }
    }

    startNewGame() {
        if (window.liveFeedEngine && window.liveFeedEngine.categories.length === 5) {
            this.categories = window.liveFeedEngine.categories;
        }

        this.currentCategoryIndex = 0;
        this.currentQuestionIndex = 0;
        this.overallScore = 0;
        this.categoryScores = [0, 0, 0, 0, 0];
        this.resultsMatrix = [[], [], [], [], []];
        this.isResolving = false;
        this.state = 'PLAYING';

        this.prepareGameRounds();

        this.startScreen.classList.add('hidden');
        this.transitionScreen.classList.add('hidden');
        this.resultsScreen.classList.add('hidden');
        this.gameScreen.classList.remove('hidden');

        this.renderCategoryPills();
        this.renderQuestion();
    }

    prepareGameRounds() {
        this.gameRounds = [];

        this.categories.forEach((category) => {
            const shuffledItems = [...category.items].sort(() => Math.random() - 0.5);
            const categoryPairs = [];

            let ptr = 0;
            while (categoryPairs.length < this.questionsPerCategory && ptr + 1 < shuffledItems.length) {
                const itemA = shuffledItems[ptr];
                const itemB = shuffledItems[ptr + 1];
                ptr += 2;

                if (itemA.value === itemB.value) continue;

                categoryPairs.push({
                    itemA: itemA,
                    itemB: itemB,
                    higherIndex: itemA.value > itemB.value ? 0 : 1
                });
            }

            while (categoryPairs.length < this.questionsPerCategory) {
                const randA = shuffledItems[Math.floor(Math.random() * shuffledItems.length)];
                let randB = shuffledItems[Math.floor(Math.random() * shuffledItems.length)];
                while (randB.id === randA.id || randB.value === randA.value) {
                    randB = shuffledItems[Math.floor(Math.random() * shuffledItems.length)];
                }
                categoryPairs.push({
                    itemA: randA,
                    itemB: randB,
                    higherIndex: randA.value > randB.value ? 0 : 1
                });
            }

            this.gameRounds.push(categoryPairs);
        });
    }

    renderCategoryPills() {
        this.categoryPills.innerHTML = '';
        this.categories.forEach((cat, idx) => {
            const pill = document.createElement('div');
            pill.className = `cat-pill ${idx === this.currentCategoryIndex ? 'active' : ''} ${idx < this.currentCategoryIndex ? 'done' : ''}`;
            const catSvg = window.getQuantexIcon(cat.icon);
            pill.innerHTML = `<span class="pill-icon">${catSvg}</span> <span class="pill-name">${cat.name}</span>`;
            this.categoryPills.appendChild(pill);
        });
    }

    renderQuestion() {
        const category = this.categories[this.currentCategoryIndex];
        const roundData = this.gameRounds[this.currentCategoryIndex][this.currentQuestionIndex];
        const globalQuestionNum = this.currentCategoryIndex * this.questionsPerCategory + this.currentQuestionIndex + 1;

        // Update header & progress
        this.categoryBadge.innerHTML = `<span class="badge-icon">${window.getQuantexIcon(category.icon)}</span> PHASE 0${this.currentCategoryIndex + 1} / 05`;
        this.categoryName.textContent = category.name.toUpperCase();
        this.categoryDesc.textContent = category.description;
        this.progressStep.textContent = `QUERY ${this.currentQuestionIndex + 1} / ${this.questionsPerCategory} (TOTAL: ${globalQuestionNum}/${this.totalQuestions})`;
        this.scoreDisplay.textContent = `SCORE: ${this.overallScore} / ${this.totalQuestions}`;

        const progressPercent = ((globalQuestionNum - 1) / this.totalQuestions) * 100;
        this.progressBarFill.style.width = `${progressPercent}%`;

        this.renderCategoryPills();

        // Setup Card A
        this.cardATitle.textContent = roundData.itemA.name;
        this.cardASubtitle.textContent = roundData.itemA.subtitle || category.unitLabel;
        this.cardAIcon.innerHTML = window.getQuantexIcon(roundData.itemA.icon || 'quantum_logo');
        this.cardAValue.textContent = roundData.itemA.formatted;
        this.cardAValue.classList.remove('revealed');
        this.cardABadge.textContent = '';
        this.cardABadge.className = 'card-badge';
        this.cardA.className = 'quantex-card';

        // Setup Card B
        this.cardBTitle.textContent = roundData.itemB.name;
        this.cardBSubtitle.textContent = roundData.itemB.subtitle || category.unitLabel;
        this.cardBIcon.innerHTML = window.getQuantexIcon(roundData.itemB.icon || 'quantum_logo');
        this.cardBValue.textContent = roundData.itemB.formatted;
        this.cardBValue.classList.remove('revealed');
        this.cardBBadge.textContent = '';
        this.cardBBadge.className = 'card-badge';
        this.cardB.className = 'quantex-card';

        this.isResolving = false;
    }

    handleSelection(selectedIndex) {
        if (this.isResolving || this.state !== 'PLAYING') return;
        this.isResolving = true;

        window.soundEngine.playClick();
        window.soundEngine.playReveal();

        const roundData = this.gameRounds[this.currentCategoryIndex][this.currentQuestionIndex];
        const isCorrect = (selectedIndex === roundData.higherIndex);

        // Update score & tracking
        if (isCorrect) {
            this.overallScore++;
            this.categoryScores[this.currentCategoryIndex]++;
            this.resultsMatrix[this.currentCategoryIndex].push(true);
            setTimeout(() => window.soundEngine.playCorrect(), 100);
        } else {
            this.resultsMatrix[this.currentCategoryIndex].push(false);
            setTimeout(() => window.soundEngine.playWrong(), 100);
        }

        // Reveal numbers & animation classes
        this.cardAValue.classList.add('revealed');
        this.cardBValue.classList.add('revealed');

        if (roundData.higherIndex === 0) {
            this.cardABadge.textContent = 'GREATER';
            this.cardABadge.classList.add('badge-higher');
            this.cardBBadge.textContent = 'LESS';
            this.cardBBadge.classList.add('badge-lower');
        } else {
            this.cardBBadge.textContent = 'GREATER';
            this.cardBBadge.classList.add('badge-higher');
            this.cardABadge.textContent = 'LESS';
            this.cardABadge.classList.add('badge-lower');
        }

        if (selectedIndex === 0) {
            this.cardA.classList.add(isCorrect ? 'card-correct' : 'card-wrong');
            this.cardB.classList.add('card-dimmed');
        } else {
            this.cardB.classList.add(isCorrect ? 'card-correct' : 'card-wrong');
            this.cardA.classList.add('card-dimmed');
        }

        // Transition delay
        setTimeout(() => {
            this.advanceGame();
        }, 1600);
    }

    advanceGame() {
        this.currentQuestionIndex++;

        // End of category
        if (this.currentQuestionIndex >= this.questionsPerCategory) {
            if (this.currentCategoryIndex < this.totalCategories - 1) {
                this.showCategoryTransition();
            } else {
                this.finishGame();
            }
        } else {
            this.renderQuestion();
        }
    }

    showCategoryTransition() {
        this.state = 'TRANSITION';
        window.soundEngine.playCategoryComplete();

        const completedCat = this.categories[this.currentCategoryIndex];
        const nextCat = this.categories[this.currentCategoryIndex + 1];
        const catScore = this.categoryScores[this.currentCategoryIndex];

        this.transCatIcon.innerHTML = window.getQuantexIcon(completedCat.icon);
        this.transCatName.textContent = completedCat.name.toUpperCase();
        this.transScore.textContent = `${catScore} / ${this.questionsPerCategory}`;
        this.transNextCat.textContent = `NEXT: ${nextCat.name.toUpperCase()}`;

        this.gameScreen.classList.add('hidden');
        this.transitionScreen.classList.remove('hidden');
    }

    advanceFromTransition() {
        this.currentCategoryIndex++;
        this.currentQuestionIndex = 0;
        this.state = 'PLAYING';

        this.transitionScreen.classList.add('hidden');
        this.gameScreen.classList.remove('hidden');

        this.renderCategoryPills();
        this.renderQuestion();
    }

    finishGame() {
        this.state = 'FINISHED';
        window.soundEngine.playGameComplete();

        const accuracy = Math.round((this.overallScore / this.totalQuestions) * 100);
        this.resAccuracy.textContent = `${accuracy}%`;
        this.resScore.textContent = `${this.overallScore} / ${this.totalQuestions}`;

        // Calculate Rank
        let rank = "QUANTUM INITIATE";
        if (this.overallScore === 25) rank = "CYBERNETIC ORACLE (PERFECT 25/25)";
        else if (this.overallScore >= 22) rank = "QUANTUM MASTER ARCHITECT";
        else if (this.overallScore >= 18) rank = "SENIOR PROTOCOL ANALYST";
        else if (this.overallScore >= 13) rank = "NEURAL DATA OPERATOR";
        else if (this.overallScore >= 8) rank = "CYBER DRIFTER";

        this.resRank.textContent = rank;

        // Save Best Score
        const storedBest = localStorage.getItem('quantex_best_score') || 0;
        if (this.overallScore > storedBest) {
            localStorage.setItem('quantex_best_score', this.overallScore);
        }
        const currentBest = Math.max(this.overallScore, storedBest);
        this.resBestScore.textContent = `BEST: ${currentBest} / ${this.totalQuestions}`;

        // Render Breakdown
        this.resBreakdown.innerHTML = '';
        this.categories.forEach((cat, idx) => {
            const score = this.categoryScores[idx];
            const percent = (score / this.questionsPerCategory) * 100;
            const row = document.createElement('div');
            row.className = 'res-cat-row';

            const badgesHtml = (this.resultsMatrix[idx] || []).map(hit => {
                return `<span class="res-dot ${hit ? 'hit' : 'miss'}">${hit ? window.getQuantexIcon('check') : window.getQuantexIcon('cross')}</span>`;
            }).join('');

            row.innerHTML = `
                <div class="res-cat-info">
                    <span class="res-icon">${window.getQuantexIcon(cat.icon)}</span>
                    <span class="res-name">${cat.name}</span>
                </div>
                <div class="res-dots">${badgesHtml}</div>
                <div class="res-score-badge">${score}/${this.questionsPerCategory} (${Math.round(percent)}%)</div>
            `;
            this.resBreakdown.appendChild(row);
        });

        const progressPercent = 100;
        this.progressBarFill.style.width = `${progressPercent}%`;

        this.gameScreen.classList.add('hidden');
        this.transitionScreen.classList.add('hidden');
        this.resultsScreen.classList.remove('hidden');
    }

    copyShareResult() {
        const accuracy = Math.round((this.overallScore / this.totalQuestions) * 100);
        const rank = this.resRank.textContent;

        const matrixText = this.categories.map((cat, idx) => {
            const row = (this.resultsMatrix[idx] || []).map(hit => hit ? '[OK]' : '[XX]').join(' ');
            return `${cat.name.padEnd(20, ' ')} : ${row} (${this.categoryScores[idx]}/5)`;
        }).join('\n');

        const shareText = `QUANTEX // LIVE DATA PROTOCOL\nScore: ${this.overallScore}/${this.totalQuestions} (${accuracy}%)\nRank: ${rank}\n\n${matrixText}\n\nPlay: https://theaser7.github.io/games/quantex/`;

        navigator.clipboard.writeText(shareText).then(() => {
            this.toastShare.classList.add('show');
            setTimeout(() => {
                this.toastShare.classList.remove('show');
            }, 2500);
        }).catch(() => {
            prompt('Copy your result:', shareText);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.gameInstance = new QuantexGame();
});
