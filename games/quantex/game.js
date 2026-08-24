/**
 * Quantex Game Engine
 * Cyberpunk More/Less Comparison Game (100% Vector Icons & Procedural Cyber Audio)
 */

class QuantexGame {
    constructor() {
        this.categories = QUANTEX_DATASET.categories;
        this.questionsPerCategory = 5;
        this.totalCategories = this.categories.length;
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
    }

    initDOMElements() {
        // Screens
        this.startScreen = document.getElementById('start-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.transitionScreen = document.getElementById('transition-screen');
        this.resultsScreen = document.getElementById('results-screen');

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

        // Reset Card States
        [this.cardA, this.cardB].forEach(card => {
            card.classList.remove('selected-winner', 'selected-loser', 'reveal-higher', 'reveal-lower', 'disabled');
        });

        // Set Card A content
        this.cardATitle.textContent = roundData.itemA.name;
        this.cardASubtitle.textContent = roundData.itemA.subtitle;
        this.cardAIcon.innerHTML = window.getQuantexIcon(roundData.itemA.icon || category.icon);
        this.cardAValue.textContent = '???';
        this.cardAValue.classList.remove('revealed');
        this.cardABadge.textContent = 'TARGET ALPHA [ 1 ]';

        // Set Card B content
        this.cardBTitle.textContent = roundData.itemB.name;
        this.cardBSubtitle.textContent = roundData.itemB.subtitle;
        this.cardBIcon.innerHTML = window.getQuantexIcon(roundData.itemB.icon || category.icon);
        this.cardBValue.textContent = '???';
        this.cardBValue.classList.remove('revealed');
        this.cardBBadge.textContent = 'TARGET BETA [ 2 ]';

        this.isResolving = false;
    }

    handleSelection(selectedIndex) {
        if (this.isResolving || this.state !== 'PLAYING') return;
        this.isResolving = true;

        const roundData = this.gameRounds[this.currentCategoryIndex][this.currentQuestionIndex];
        const isCorrect = (selectedIndex === roundData.higherIndex);

        const chosenCard = selectedIndex === 0 ? this.cardA : this.cardB;
        const otherCard = selectedIndex === 0 ? this.cardB : this.cardA;

        // Reveal Values with shimmer sound
        window.soundEngine.playReveal();
        this.cardAValue.textContent = roundData.itemA.formatted;
        this.cardBValue.textContent = roundData.itemB.formatted;
        this.cardAValue.classList.add('revealed');
        this.cardBValue.classList.add('revealed');

        if (isCorrect) {
            setTimeout(() => window.soundEngine.playCorrect(), 80);
            this.overallScore++;
            this.categoryScores[this.currentCategoryIndex]++;
            this.resultsMatrix[this.currentCategoryIndex].push(true);

            chosenCard.classList.add('selected-winner');
            otherCard.classList.add('reveal-lower');
        } else {
            setTimeout(() => window.soundEngine.playWrong(), 80);
            this.resultsMatrix[this.currentCategoryIndex].push(false);

            chosenCard.classList.add('selected-loser');
            otherCard.classList.add('reveal-higher');
        }

        this.scoreDisplay.textContent = `SCORE: ${this.overallScore} / ${this.totalQuestions}`;

        this.cardA.classList.add('disabled');
        this.cardB.classList.add('disabled');

        setTimeout(() => {
            this.advanceNext();
        }, 1500);
    }

    advanceNext() {
        if (this.currentQuestionIndex < this.questionsPerCategory - 1) {
            this.currentQuestionIndex++;
            this.renderQuestion();
        } else {
            if (this.currentCategoryIndex < this.totalCategories - 1) {
                this.showCategoryTransition();
            } else {
                this.showFinalResults();
            }
        }
    }

    showCategoryTransition() {
        this.state = 'TRANSITION';
        window.soundEngine.playCategoryComplete();

        const finishedCat = this.categories[this.currentCategoryIndex];
        const catScore = this.categoryScores[this.currentCategoryIndex];
        const nextCat = this.categories[this.currentCategoryIndex + 1];

        this.transCatIcon.innerHTML = window.getQuantexIcon(finishedCat.icon);
        this.transCatName.textContent = finishedCat.name.toUpperCase();
        this.transScore.textContent = `${catScore} / ${this.questionsPerCategory} ACCURATE`;
        this.transNextCat.textContent = `NEXT PHASE: ${nextCat.name.toUpperCase()}`;

        this.gameScreen.classList.add('hidden');
        this.transitionScreen.classList.remove('hidden');
    }

    advanceFromTransition() {
        this.currentCategoryIndex++;
        this.currentQuestionIndex = 0;
        this.state = 'PLAYING';

        this.transitionScreen.classList.add('hidden');
        this.gameScreen.classList.remove('hidden');
        this.renderQuestion();
    }

    showFinalResults() {
        this.state = 'FINISHED';
        window.soundEngine.playGameComplete();

        const accuracy = Math.round((this.overallScore / this.totalQuestions) * 100);
        this.resAccuracy.textContent = `${accuracy}%`;
        this.resScore.textContent = `${this.overallScore} / ${this.totalQuestions}`;

        let rank = "QUANTUM APPRENTICE";
        if (this.overallScore >= 24) rank = "CYBER ORACLE // GOD TIER";
        else if (this.overallScore >= 21) rank = "DATA ARCHITECT // MASTER";
        else if (this.overallScore >= 17) rank = "NEURAL ANALYST // ELITE";
        else if (this.overallScore >= 13) rank = "SYSTEM OPERATOR // EXPERT";
        else if (this.overallScore >= 9) rank = "DATA RUNNER // NOVICE";
        this.resRank.textContent = rank;

        const previousBest = parseInt(localStorage.getItem('quantex_high_score') || '0', 10);
        if (this.overallScore > previousBest) {
            localStorage.setItem('quantex_high_score', this.overallScore);
            this.resBestScore.textContent = `NEW RECORD: ${this.overallScore} / ${this.totalQuestions}`;
            this.resBestScore.classList.add('new-record');
        } else {
            this.resBestScore.textContent = `PERSONAL BEST: ${previousBest} / ${this.totalQuestions}`;
            this.resBestScore.classList.remove('new-record');
        }

        this.resBreakdown.innerHTML = '';
        this.categories.forEach((cat, idx) => {
            const score = this.categoryScores[idx];
            const percent = (score / this.questionsPerCategory) * 100;
            const matrixRow = this.resultsMatrix[idx] || [];
            const badgesHtml = matrixRow.map(isHit => isHit ? `<span class="hit-dot hit">${window.getQuantexIcon('check')}</span>` : `<span class="hit-dot miss">${window.getQuantexIcon('cross')}</span>`).join(' ');

            const row = document.createElement('div');
            row.className = 'res-row';
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

        const shareText = `QUANTEX // NEURAL SCALE COMPARISON\nScore: ${this.overallScore}/${this.totalQuestions} (${accuracy}%)\nRank: ${rank}\n\n${matrixText}\n\nPlay: https://theaser7.github.io/games/quantex/`;

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
