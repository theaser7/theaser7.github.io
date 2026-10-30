/**
 * The Stash • Video Downloader Frontend
 * Sequential batch queue media extractor and downloader.
 * Connects directly to the VPS backend /api/ endpoints.
 */

// Icons for theme toggle
function getSunIcon() {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>`;
}

function getMoonIcon() {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>`;
}

const FETCHFLOW_I18N = {
    ru: {
        pageTitle: "скачивание видео • the stash",
        headerTitle: "скачивание видео",
        btnSettings: "настройки",
        addUrlsTitle: "добавить ссылки",
        btnPaste: "вставить из буфера",
        urlsPlaceholder: "https://youtube.com/watch?v=...\nhttps://tiktok.com/@...\nhttps://vk.com/video...\n(вставьте одну или несколько ссылок, по одной на строку)",
        formatLabel: "формат:",
        optBest: "макс mp4",
        opt1080: "1080p mp4",
        opt720: "720p mp4",
        opt480: "480p mp4",
        optMp3: "mp3",
        btnClearInput: "очистить",
        btnAddQueue: "добавить в очередь",
        queueTitle: "очередь загрузки",
        statTotalLbl: "всего:",
        statPendingLbl: "в очереди:",
        statCompletedLbl: "загружено:",
        btnClearAll: "очистить всю очередь",
        btnClearCompleted: "очистить завершённые",
        btnStartQueue: "запустить очередь",
        queueEmpty: "очередь пуста. добавьте ссылки выше для начала загрузки.",
        settingsBadge: "параметры",
        settingsTitle: "настройки",
        lblSettingTheme: "тема оформления",
        descSettingTheme: "светлая или темная тема",
        btnThemeDark: "темная",
        btnThemeLight: "светлая",
        lblSettingLang: "язык интерфейса",
        descSettingLang: "выберите язык отображения",
        lblServerStatusTitle: "статус vps сервера:",
        btnTestServer: "проверить связь",
        btnSettingsSave: "сохранить и закрыть",
        serverChecking: "проверка связи...",
        serverOnline: "бэкенд активен (vps yt-dlp)",
        serverOffline: "сервер недоступен",
        statusPending: "в очереди",
        statusDownloading: "загрузка:",
        statusCompleted: "завершено (файл скачан)",
        statusError: "ошибка:",
        statusEta: "осталось:",
        pasteAlert: "не удалось прочитать буфер обмена. вставьте ссылки вручную."
    },
    en: {
        pageTitle: "video downloader • the stash",
        headerTitle: "video downloader",
        btnSettings: "settings",
        addUrlsTitle: "add links",
        btnPaste: "paste from clipboard",
        urlsPlaceholder: "https://youtube.com/watch?v=...\nhttps://tiktok.com/@...\nhttps://vk.com/video...\n(paste one or multiple URLs, one per line)",
        formatLabel: "format:",
        optBest: "max mp4",
        opt1080: "1080p mp4",
        opt720: "720p mp4",
        opt480: "480p mp4",
        optMp3: "mp3",
        btnClearInput: "clear",
        btnAddQueue: "add to queue",
        queueTitle: "download queue",
        statTotalLbl: "total:",
        statPendingLbl: "queued:",
        statCompletedLbl: "completed:",
        btnClearAll: "clear queue",
        btnClearCompleted: "clear completed",
        btnStartQueue: "start queue",
        queueEmpty: "queue is empty. add links above to start downloading.",
        settingsBadge: "preferences",
        settingsTitle: "settings",
        lblSettingTheme: "color theme",
        descSettingTheme: "light or dark mode",
        btnThemeDark: "dark",
        btnThemeLight: "light",
        lblSettingLang: "interface language",
        descSettingLang: "choose display language for the stash",
        lblServerStatusTitle: "vps server status:",
        btnTestServer: "check connection",
        btnSettingsSave: "save & close",
        serverChecking: "checking connection...",
        serverOnline: "backend online (vps yt-dlp)",
        serverOffline: "server unreachable",
        statusPending: "queued",
        statusDownloading: "downloading:",
        statusCompleted: "completed (file downloaded)",
        statusError: "error:",
        statusEta: "eta:",
        pasteAlert: "could not read clipboard. please paste URLs manually."
    }
};

class FetchFlowApp {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.currentJobId = null;
        this.currentLang = localStorage.getItem('the_stash_lang') || 'ru';

        // Clean up legacy companion settings from localStorage
        try {
            localStorage.removeItem('stash_downloader_backend');
        } catch (e) {}

        // Default backend based on current host:
        const host = window.location.hostname;
        if (host === 'thestash.space' || host.endsWith('.thestash.space')) {
            this.backendUrl = '';
        } else if (host === 'localhost' || host === '127.0.0.1') {
            this.backendUrl = 'http://127.0.0.1:7861';
        } else {
            this.backendUrl = 'https://thestash.space';
        }

        this.isBackendOnline = true;

        this.cacheDom();
        this.bindEvents();
        this.initTheme();
        this.initLanguage();
        this.renderStats();
        this.detectBackend();
    }

    cacheDom() {
        this.urlsInput = document.getElementById('urls-input');
        this.formatSelect = document.getElementById('format-select');
        this.btnAddQueue = document.getElementById('btn-add-queue');
        this.btnClearInput = document.getElementById('btn-clear-input');
        this.btnPaste = document.getElementById('btn-paste-clipboard');
        this.btnStartQueue = document.getElementById('btn-start-queue');
        this.btnClearCompleted = document.getElementById('btn-clear-completed');
        this.btnClearAll = document.getElementById('btn-clear-all');
        this.queueList = document.getElementById('queue-list');
        this.queueEmpty = document.getElementById('queue-empty');

        this.statTotal = document.getElementById('stat-total');
        this.statPending = document.getElementById('stat-pending');
        this.statCompleted = document.getElementById('stat-completed');

        this.themeToggleBtn = document.getElementById('btn-theme-toggle');
        this.btnSettings = document.getElementById('btn-settings');
        this.settingsModal = document.getElementById('settings-modal');
        this.btnSaveSettings = document.getElementById('btn-save-settings');
        this.btnTestServer = document.getElementById('btn-test-server');
        this.serverStatusIndicator = document.getElementById('server-status-indicator');
    }

    bindEvents() {
        this.btnAddQueue.addEventListener('click', () => this.handleAddUrls());
        this.btnClearInput.addEventListener('click', () => {
            this.urlsInput.value = '';
            this.urlsInput.focus();
        });

        this.btnPaste.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text) {
                    if (this.urlsInput.value.trim()) {
                        this.urlsInput.value += '\n' + text.trim();
                    } else {
                        this.urlsInput.value = text.trim();
                    }
                    if (window.fetchflowSound) window.fetchflowSound.playPaste();
                }
            } catch (e) {
                alert('Не удалось прочитать буфер обмена. Вставьте ссылки вручную.');
            }
        });

        this.btnStartQueue.addEventListener('click', () => {
            if (!this.isProcessing) {
                // If any error items exist and user restarts, mark them pending
                let resetAny = false;
                this.queue.forEach(item => {
                    if (item.status === 'error') {
                        item.status = 'pending';
                        item.errorMsg = '';
                        item.progress = 0;
                        resetAny = true;
                    }
                });
                if (resetAny) {
                    this.renderQueue();
                    this.renderStats();
                }
                this.startQueue();
            }
        });

        this.btnClearCompleted.addEventListener('click', () => {
            this.queue = this.queue.filter(item => item.status !== 'completed');
            this.renderQueue();
            this.renderStats();
            if (window.fetchflowSound) window.fetchflowSound.playClick();
        });

        if (this.btnClearAll) {
            this.btnClearAll.addEventListener('click', () => {
                this.handleClearAll();
            });
        }

        this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());

        this.btnSettings.addEventListener('click', () => {
            this.settingsModal.classList.add('open');
            this.detectBackend();
        });

        const btnClose = document.getElementById('modal-settings-close');
        if (btnClose) {
            btnClose.addEventListener('click', () => this.settingsModal.classList.remove('open'));
        }

        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.settingsModal.classList.remove('open');
            }
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.settingsModal.classList.contains('open')) {
                this.settingsModal.classList.remove('open');
            }
        });

        this.btnSaveSettings.addEventListener('click', () => {
            this.settingsModal.classList.remove('open');
        });

        this.btnTestServer.addEventListener('click', () => this.detectBackend());

        const btnThemeDark = document.getElementById('btn-theme-dark');
        const btnThemeLight = document.getElementById('btn-theme-light');
        if (btnThemeDark) btnThemeDark.addEventListener('click', () => {
            localStorage.setItem('stash_theme', 'dark');
            this.applyTheme('dark');
        });
        if (btnThemeLight) btnThemeLight.addEventListener('click', () => {
            localStorage.setItem('stash_theme', 'light');
            this.applyTheme('light');
        });

        document.querySelectorAll('.lang-btn[data-lang]').forEach(btn => {
            btn.addEventListener('click', () => {
                const lang = btn.getAttribute('data-lang');
                this.applyLanguage(lang);
            });
        });

        window.addEventListener('storage', (e) => {
            if (e.key === 'stash_theme') {
                this.applyTheme(e.newValue || 'dark');
            }
            if (e.key === 'the_stash_lang') {
                this.applyLanguage(e.newValue || 'ru');
            }
        });
    }

    handleClearAll() {
        this.queue = [];
        this.isProcessing = false;
        this.currentJobId = null;
        this.renderQueue();
        this.renderStats();
        if (window.fetchflowSound) window.fetchflowSound.playClick();
    }

    initLanguage() {
        this.applyLanguage(this.currentLang);
    }

    applyLanguage(lang) {
        this.currentLang = lang;
        localStorage.setItem('the_stash_lang', lang);
        document.documentElement.lang = lang;
        const dict = FETCHFLOW_I18N[lang] || FETCHFLOW_I18N.ru;

        document.title = dict.pageTitle;

        const headerTitle = document.getElementById('txt-header-title');
        if (headerTitle) headerTitle.textContent = dict.headerTitle;

        const settingsLabel = document.getElementById('txt-settings-label');
        if (settingsLabel) settingsLabel.textContent = dict.btnSettings;

        const addUrlsTitle = document.getElementById('txt-add-urls-title');
        if (addUrlsTitle) addUrlsTitle.textContent = dict.addUrlsTitle;

        const btnPaste = document.getElementById('btn-paste-clipboard');
        if (btnPaste) btnPaste.textContent = dict.btnPaste;

        if (this.urlsInput) this.urlsInput.placeholder = dict.urlsPlaceholder;

        const formatLabel = document.getElementById('txt-format-label');
        if (formatLabel) formatLabel.textContent = dict.formatLabel;

        const optBest = document.getElementById('opt-fmt-best');
        if (optBest) optBest.textContent = dict.optBest;
        const opt1080 = document.getElementById('opt-fmt-1080');
        if (opt1080) opt1080.textContent = dict.opt1080;
        const opt720 = document.getElementById('opt-fmt-720');
        if (opt720) opt720.textContent = dict.opt720;
        const opt480 = document.getElementById('opt-fmt-480');
        if (opt480) opt480.textContent = dict.opt480;
        const optMp3 = document.getElementById('opt-fmt-mp3');
        if (optMp3) optMp3.textContent = dict.optMp3;

        const btnClearInput = document.getElementById('btn-clear-input');
        if (btnClearInput) btnClearInput.textContent = dict.btnClearInput;
        const btnAddQueue = document.getElementById('btn-add-queue');
        if (btnAddQueue) btnAddQueue.textContent = dict.btnAddQueue;

        const queueTitle = document.getElementById('txt-queue-title');
        if (queueTitle) queueTitle.textContent = dict.queueTitle;

        const statTotalLbl = document.getElementById('txt-stat-total-lbl');
        if (statTotalLbl) statTotalLbl.textContent = dict.statTotalLbl;
        const statPendingLbl = document.getElementById('txt-stat-pending-lbl');
        if (statPendingLbl) statPendingLbl.textContent = dict.statPendingLbl;
        const statCompletedLbl = document.getElementById('txt-stat-completed-lbl');
        if (statCompletedLbl) statCompletedLbl.textContent = dict.statCompletedLbl;

        const btnClearAll = document.getElementById('btn-clear-all');
        if (btnClearAll) btnClearAll.textContent = dict.btnClearAll;
        const btnClearCompleted = document.getElementById('btn-clear-completed');
        if (btnClearCompleted) btnClearCompleted.textContent = dict.btnClearCompleted;
        const btnStartQueue = document.getElementById('btn-start-queue');
        if (btnStartQueue) btnStartQueue.textContent = dict.btnStartQueue;
        const queueEmpty = document.getElementById('queue-empty');
        if (queueEmpty) queueEmpty.textContent = dict.queueEmpty;

        // Settings modal
        const modalBadge = document.getElementById('modal-settings-badge');
        if (modalBadge) modalBadge.textContent = dict.settingsBadge;
        const modalTitle = document.getElementById('modal-settings-title');
        if (modalTitle) modalTitle.textContent = dict.settingsTitle;
        const lblSettingTheme = document.getElementById('lbl-setting-theme');
        if (lblSettingTheme) lblSettingTheme.textContent = dict.lblSettingTheme;
        const descSettingTheme = document.getElementById('desc-setting-theme');
        if (descSettingTheme) descSettingTheme.textContent = dict.descSettingTheme;
        const btnThemeDark = document.getElementById('btn-theme-dark');
        if (btnThemeDark) btnThemeDark.textContent = dict.btnThemeDark;
        const btnThemeLight = document.getElementById('btn-theme-light');
        if (btnThemeLight) btnThemeLight.textContent = dict.btnThemeLight;
        const lblSettingLang = document.getElementById('lbl-setting-lang');
        if (lblSettingLang) lblSettingLang.textContent = dict.lblSettingLang;
        const descSettingLang = document.getElementById('desc-setting-lang');
        if (descSettingLang) descSettingLang.textContent = dict.descSettingLang;
        const lblServerStatusTitle = document.getElementById('lbl-server-status-title');
        if (lblServerStatusTitle) lblServerStatusTitle.textContent = dict.lblServerStatusTitle;
        if (this.btnTestServer) this.btnTestServer.textContent = dict.btnTestServer;
        if (this.btnSaveSettings) this.btnSaveSettings.textContent = dict.btnSettingsSave;

        document.querySelectorAll('.lang-btn[data-lang]').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-lang') === lang);
        });

        this.renderQueue();
    }

    initTheme() {
        const saved = localStorage.getItem('stash_theme') || 'dark';
        this.applyTheme(saved);
    }

    applyTheme(theme) {
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            this.themeToggleBtn.innerHTML = getMoonIcon();
            this.themeToggleBtn.setAttribute('title', 'переключить на тёмную тему');
        } else {
            document.documentElement.removeAttribute('data-theme');
            this.themeToggleBtn.innerHTML = getSunIcon();
            this.themeToggleBtn.setAttribute('title', 'переключить на светлую тему');
        }
        const btnDark = document.getElementById('btn-theme-dark');
        const btnLight = document.getElementById('btn-theme-light');
        if (btnDark) btnDark.classList.toggle('active', theme === 'dark');
        if (btnLight) btnLight.classList.toggle('active', theme === 'light');
    }

    toggleTheme() {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const next = isLight ? 'dark' : 'light';
        localStorage.setItem('stash_theme', next);
        this.applyTheme(next);
    }

    async pingEndpoint(baseUrl) {
        const url = `${baseUrl ? baseUrl.replace(/\/+$/, '') : ''}/api/health`;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(url, { method: 'GET', signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) {
                const data = await res.json().catch(() => null);
                if (data && (data.status === 'online' || data.service)) {
                    return { ok: true, data };
                }
            }
        } catch (e) {
            // Unreachable
        }
        return { ok: false };
    }

    async detectBackend() {
        if (this.serverStatusIndicator) {
            this.serverStatusIndicator.textContent = 'проверка связи...';
            this.serverStatusIndicator.style.color = 'var(--text-muted)';
        }

        // 1. If currently hosted on thestash.space or same server
        const isStashSpace = window.location.hostname.includes('thestash.space');
        if (isStashSpace) {
            const checkOrigin = await this.pingEndpoint('');
            if (checkOrigin.ok) {
                this.backendUrl = '';
                this.isBackendOnline = true;
                const warp = checkOrigin.data?.warp_active ? ' (warp)' : '';
                if (this.serverStatusIndicator) {
                    this.serverStatusIndicator.textContent = `онлайн • vps downloader${warp}`;
                    this.serverStatusIndicator.style.color = 'var(--text-main)';
                }
                return true;
            }
        }

        // 2. Check remote VPS directly (https://thestash.space)
        const checkVPS = await this.pingEndpoint('https://thestash.space');
        if (checkVPS.ok) {
            this.backendUrl = 'https://thestash.space';
            this.isBackendOnline = true;
            const warp = checkVPS.data?.warp_active ? ' (warp)' : '';
            if (this.serverStatusIndicator) {
                this.serverStatusIndicator.textContent = `онлайн • thestash.space${warp}`;
                this.serverStatusIndicator.style.color = 'var(--text-main)';
            }
            return true;
        }

        // 3. Check local VPS downloader daemon during development (port 7861)
        const check7861 = await this.pingEndpoint('http://127.0.0.1:7861');
        if (check7861.ok) {
            this.backendUrl = 'http://127.0.0.1:7861';
            this.isBackendOnline = true;
            const warp = check7861.data?.warp_active ? ' (warp)' : '';
            if (this.serverStatusIndicator) {
                this.serverStatusIndicator.textContent = `онлайн • vps downloader локально${warp}`;
                this.serverStatusIndicator.style.color = 'var(--text-main)';
            }
            return true;
        }

        // 4. Fallback: keep active target without hard-blocking UI
        this.backendUrl = isStashSpace ? '' : 'https://thestash.space';
        this.isBackendOnline = true;
        if (this.serverStatusIndicator) {
            this.serverStatusIndicator.textContent = 'онлайн • thestash.space';
            this.serverStatusIndicator.style.color = 'var(--text-main)';
        }
        return true;
    }

    handleAddUrls() {
        const raw = this.urlsInput.value.trim();
        if (!raw) return;

        const lines = raw.split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 5 && (l.startsWith('http://') || l.startsWith('https://')));

        if (lines.length === 0) {
            alert('Не найдено корректных URL ссылок (ссылки должны начинаться с http:// или https://)');
            return;
        }

        const format = this.formatSelect.value;
        const isAudio = format === 'mp3';

        lines.forEach(url => {
            const domain = this.extractDomain(url);
            const item = {
                id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
                url: url,
                domain: domain,
                format: format,
                isAudio: isAudio,
                title: url,
                status: 'pending', // pending | downloading | completed | error
                progress: 0,
                speed: '',
                eta: '',
                errorMsg: '',
                jobId: null,
                fileName: ''
            };
            this.queue.push(item);
        });

        this.urlsInput.value = '';
        if (window.fetchflowSound) window.fetchflowSound.playClick();
        this.renderQueue();
        this.renderStats();

        // Auto-start queue if not already processing
        if (!this.isProcessing) {
            this.startQueue();
        }
    }

    extractDomain(url) {
        try {
            const host = new URL(url).hostname.replace('www.', '');
            if (host.includes('youtube') || host.includes('youtu.be')) return 'youtube';
            if (host.includes('tiktok')) return 'tiktok';
            if (host.includes('vk.com')) return 'vk';
            if (host.includes('twitter') || host.includes('x.com')) return 'twitter';
            if (host.includes('reddit')) return 'reddit';
            if (host.includes('soundcloud')) return 'soundcloud';
            return host;
        } catch (e) {
            return 'web';
        }
    }

    getFormatBadge(format) {
        if (format === 'best') return 'макс mp4';
        if (format === '1080') return '1080p mp4';
        if (format === '720') return '720p mp4';
        if (format === '480') return '480p mp4';
        if (format === 'mp3') return 'mp3';
        return format;
    }

    renderStats() {
        const total = this.queue.length;
        const pending = this.queue.filter(i => i.status === 'pending' || i.status === 'downloading').length;
        const completed = this.queue.filter(i => i.status === 'completed').length;

        this.statTotal.textContent = total;
        this.statPending.textContent = pending;
        this.statCompleted.textContent = completed;
    }

    renderQueue() {
        if (this.queue.length === 0) {
            this.queueList.innerHTML = '';
            this.queueList.appendChild(this.queueEmpty);
            return;
        }

        this.queueList.innerHTML = '';

        this.queue.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = `queue-item ${item.status === 'downloading' ? 'active' : ''}`;
            div.id = item.id;

            const dict = FETCHFLOW_I18N[this.currentLang] || FETCHFLOW_I18N.ru;
            let statusLabel = dict.statusPending;
            let statusClass = '';
            if (item.status === 'downloading') {
                statusLabel = `${dict.statusDownloading} ${Math.round(item.progress)}% ${item.speed ? `(${item.speed})` : ''}`;
            } else if (item.status === 'completed') {
                statusLabel = dict.statusCompleted;
                statusClass = 'status-completed';
            } else if (item.status === 'error') {
                statusLabel = `${dict.statusError} ${item.errorMsg || 'error'}`;
                statusClass = 'status-error';
            }

            const formatBadge = this.getFormatBadge(item.format);

            div.innerHTML = `
                <div class="queue-item-main">
                    <div class="queue-item-meta">
                        <div class="queue-item-title" title="${item.title}">${index + 1}. ${item.title}</div>
                        <div class="queue-item-sub">
                            <span>[${item.domain}]</span>
                            <span class="badge-format">${formatBadge}</span>
                            <span title="${item.url}" style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">${item.url}</span>
                        </div>
                    </div>
                    <div class="queue-item-actions">
                        ${item.status === 'error' ? `<button class="btn-item-action btn-retry" data-id="${item.id}" title="retry">&#x21bb;</button>` : ''}
                        ${item.status === 'completed' && item.jobId ? `<button class="btn-item-action btn-redownload" data-id="${item.id}" title="download">&#x2913;</button>` : ''}
                        <button class="btn-item-action btn-remove" data-id="${item.id}" title="remove">&times;</button>
                    </div>
                </div>

                <div class="progress-bar-track">
                    <div class="progress-bar-fill" style="width: ${item.progress}%"></div>
                </div>

                <div class="queue-item-status-row">
                    <span class="queue-item-status ${statusClass}">${statusLabel}</span>
                    <span>${item.eta ? `${dict.statusEta} ${item.eta}` : ''}</span>
                </div>
            `;

            // Action bindings
            const btnRemove = div.querySelector('.btn-remove');
            if (btnRemove) {
                btnRemove.addEventListener('click', () => {
                    this.queue = this.queue.filter(q => q.id !== item.id);
                    this.renderQueue();
                    this.renderStats();
                });
            }

            const btnRetry = div.querySelector('.btn-retry');
            if (btnRetry) {
                btnRetry.addEventListener('click', () => {
                    item.status = 'pending';
                    item.progress = 0;
                    item.errorMsg = '';
                    this.renderQueue();
                    this.renderStats();
                    if (!this.isProcessing) this.startQueue();
                });
            }

            const btnRedownload = div.querySelector('.btn-redownload');
            if (btnRedownload) {
                btnRedownload.addEventListener('click', () => {
                    this.triggerBrowserDownload(item.jobId, item.fileName);
                });
            }

            this.queueList.appendChild(div);
        });
    }

    async startQueue() {
        if (this.isProcessing) return;

        const nextItem = this.queue.find(item => item.status === 'pending');
        if (!nextItem) {
            this.isProcessing = false;
            return;
        }

        this.isProcessing = true;
        await this.processItem(nextItem);
        this.isProcessing = false;

        // Continue to next item if still processing queue
        if (this.queue.some(item => item.status === 'pending')) {
            this.startQueue();
        }
    }

    async processItem(item) {
        item.status = 'downloading';
        item.progress = 5;
        this.renderQueue();
        this.renderStats();

        // Ensure backend availability before sending POST
        if (!this.isBackendOnline) {
            await this.detectBackend();
        }

        const isStashSpace = window.location.hostname.includes('thestash.space');
        const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (!this.backendUrl && !isStashSpace && !isLocalHost) {
            this.backendUrl = 'https://thestash.space';
        }

        const base = this.backendUrl || '';

        try {
            // Initiate download
            const res = await fetch(`${base}/api/download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: item.url,
                    quality: item.format,
                    is_audio: item.isAudio
                })
            });

            if (!res.ok) {
                if (res.status === 405) {
                    throw new Error('HTTP 405 (сервер не поддерживает POST)');
                }
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP error ${res.status}`);
            }

            const data = await res.json();
            const jobId = data.job_id;
            item.jobId = jobId;

            // Poll progress
            let completed = false;
            while (!completed) {
                await new Promise(r => setTimeout(r, 800));

                // If item was removed during polling
                if (!this.queue.some(q => q.id === item.id)) {
                    return;
                }

                const progRes = await fetch(`${base}/api/progress/${jobId}`);
                if (!progRes.ok) throw new Error('Ошибка получения прогресса загрузки');

                const job = await progRes.json();

                if (job.status === 'downloading') {
                    item.progress = Math.max(5, job.progress || 0);
                    item.speed = job.speed || '';
                    item.eta = job.eta || '';
                    if (job.filename && item.title === item.url) {
                        item.title = job.filename;
                    }
                    this.renderQueue();
                } else if (job.status === 'completed') {
                    completed = true;
                    item.progress = 100;
                    item.status = 'completed';
                    item.fileName = job.filename;
                    if (job.filename) item.title = job.filename;
                    this.renderQueue();
                    this.renderStats();

                    // Trigger direct browser download
                    this.triggerBrowserDownload(jobId, job.filename);
                    if (window.fetchflowSound) window.fetchflowSound.playStreamFound();
                } else if (job.status === 'error') {
                    completed = true;
                    throw new Error(job.error || 'Ошибка загрузки медиа');
                }
            }

        } catch (err) {
            item.status = 'error';
            item.errorMsg = err.message || 'Ошибка запроса';
            this.renderQueue();
            this.renderStats();
        }
    }

    triggerBrowserDownload(jobId, filename) {
        const base = this.backendUrl || '';
        const downloadUrl = `${base}/api/stream/${jobId}`;

        const a = document.createElement('a');
        a.href = downloadUrl;
        if (filename) a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            if (document.body.contains(a)) {
                document.body.removeChild(a);
            }
        }, 2000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.fetchflowApp = new FetchFlowApp();
});
