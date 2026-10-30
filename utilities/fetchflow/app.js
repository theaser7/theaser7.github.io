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

class FetchFlowApp {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.currentJobId = null;

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

        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
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

        window.addEventListener('storage', (e) => {
            if (e.key === 'stash_theme') {
                this.applyTheme(e.newValue || 'dark');
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

            let statusLabel = 'в очереди';
            let statusClass = '';
            if (item.status === 'downloading') {
                statusLabel = `загрузка: ${Math.round(item.progress)}% ${item.speed ? `(${item.speed})` : ''}`;
            } else if (item.status === 'completed') {
                statusLabel = 'завершено (файл скачан)';
                statusClass = 'status-completed';
            } else if (item.status === 'error') {
                statusLabel = `ошибка: ${item.errorMsg || 'не удалось скачать'}`;
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
                        ${item.status === 'error' ? `<button class="btn-item-action btn-retry" data-id="${item.id}" title="повторить">&#x21bb;</button>` : ''}
                        ${item.status === 'completed' && item.jobId ? `<button class="btn-item-action btn-redownload" data-id="${item.id}" title="скачать файл повторно">&#x2913;</button>` : ''}
                        <button class="btn-item-action btn-remove" data-id="${item.id}" title="удалить">&times;</button>
                    </div>
                </div>

                <div class="progress-bar-track">
                    <div class="progress-bar-fill" style="width: ${item.progress}%"></div>
                </div>

                <div class="queue-item-status-row">
                    <span class="queue-item-status ${statusClass}">${statusLabel}</span>
                    <span>${item.eta ? `осталось: ${item.eta}` : ''}</span>
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
