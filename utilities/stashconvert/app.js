/**
 * StashConvert - Universal Client-Side Media & Document Converter
 * 100% in-browser processing via Web APIs. Zero servers. Zero telemetry.
 */

const STASHCONVERT_I18N = {
    en: {
        langBtn: "RU",
        soundBtn: "SOUND",
        muteBtn: "MUTE",
        hubBtn: "HUB",
        heroTitle: "StashConvert",
        heroSubtitle: "Universal client-side converter for Video, Images, Audio & Documents. 100% in-browser sandbox with zero telemetry.",
        dropzoneTitle: "DRAG & DROP FILES HERE",
        dropzoneSubtitle: "or click to select from your device (Videos, Images, Audio, Data)",
        queueTitle: "CONVERSION QUEUE",
        queueEmpty: "Queue is empty. Drop files above to begin.",
        btnConvertAll: "CONVERT ALL",
        btnDownloadAll: "DOWNLOAD ALL",
        btnClearQueue: "CLEAR QUEUE",
        colFile: "FILE",
        colType: "TYPE",
        colSize: "ORIGINAL",
        colTarget: "TARGET FORMAT",
        colResult: "CONVERTED",
        colActions: "ACTION",
        statusReady: "Ready",
        statusProcessing: "Converting...",
        statusDone: "Completed",
        statusError: "Failed",
        btnConvert: "Convert",
        btnDownload: "Download",
        footerLeft: "StashConvert • 100% Local In-Browser Processing",
        footerRight: "Part of the stash"
    },
    ru: {
        langBtn: "EN",
        soundBtn: "ЗВУК",
        muteBtn: "БЕЗ ЗВУКА",
        hubBtn: "ХАБ",
        heroTitle: "StashConvert",
        heroSubtitle: "Универсальный клиентский конвертер видео, картинок, аудио и документов. 100% в браузере без серверов и без телеметрии.",
        dropzoneTitle: "ПЕРЕТАЩИТЕ ФАЙЛЫ СЮДА",
        dropzoneSubtitle: "или нажмите для выбора с устройства (Видео, Картинки, Аудио, Документы)",
        queueTitle: "ОЧЕРЕДЬ КОНВЕРТАЦИИ",
        queueEmpty: "Очередь пуста. Перетащите файлы в зону выше для начала.",
        btnConvertAll: "КОНВЕРТИРОВАТЬ ВСЕ",
        btnDownloadAll: "СКАЧАТЬ ВСЕ",
        btnClearQueue: "ОЧИСТИТЬ ОЧЕРЕДЬ",
        colFile: "ФАЙЛ",
        colType: "ТИП",
        colSize: "ИСХОДНЫЙ",
        colTarget: "ЦЕЛЕВОЙ ФОРМАТ",
        colResult: "РЕЗУЛЬТАТ",
        colActions: "ДЕЙСТВИЕ",
        statusReady: "Готов",
        statusProcessing: "Конвертация...",
        statusDone: "Завершено",
        statusError: "Ошибка",
        btnConvert: "Конвертировать",
        btnDownload: "Скачать",
        footerLeft: "StashConvert • 100% локальная обработка в браузере",
        footerRight: "Часть the stash"
    }
};

class StashConvertApp {
    constructor() {
        this.queue = [];
        this.currentLang = localStorage.getItem('the_stash_lang') || 'en';
        this.initDOM();
        this.initEvents();
        this.applyLanguage(this.currentLang);
    }

    initDOM() {
        this.dropzone = document.getElementById('dropzone');
        this.fileInput = document.getElementById('file-input');
        this.queueList = document.getElementById('queue-list');
        this.queueContainer = document.getElementById('queue-container');
        this.emptyQueue = document.getElementById('empty-queue');

        this.btnConvertAll = document.getElementById('btn-convert-all');
        this.btnDownloadAll = document.getElementById('btn-download-all');
        this.btnClearQueue = document.getElementById('btn-clear-queue');

        this.btnLang = document.getElementById('btn-lang');
        this.btnLangText = document.getElementById('btn-lang-text');
        this.btnMute = document.getElementById('btn-mute');
        this.toast = document.getElementById('toast-notify');
    }

    initEvents() {
        // Drag & Drop
        if (this.dropzone) {
            this.dropzone.addEventListener('click', () => this.fileInput.click());
            this.dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                this.dropzone.classList.add('drag-over');
            });
            this.dropzone.addEventListener('dragleave', () => {
                this.dropzone.classList.remove('drag-over');
            });
            this.dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                this.dropzone.classList.remove('drag-over');
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    window.stashconvertSound.playDrop();
                    this.addFilesToQueue(Array.from(e.dataTransfer.files));
                }
            });
        }

        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    window.stashconvertSound.playDrop();
                    this.addFilesToQueue(Array.from(e.target.files));
                    this.fileInput.value = '';
                }
            });
        }

        // Action Buttons
        if (this.btnConvertAll) {
            this.btnConvertAll.addEventListener('click', () => {
                window.stashconvertSound.playClick();
                this.convertAll();
            });
        }

        if (this.btnDownloadAll) {
            this.btnDownloadAll.addEventListener('click', () => {
                window.stashconvertSound.playClick();
                this.downloadAll();
            });
        }

        if (this.btnClearQueue) {
            this.btnClearQueue.addEventListener('click', () => {
                window.stashconvertSound.playClick();
                this.clearQueue();
            });
        }

        // Language & Sound
        if (this.btnLang) {
            this.btnLang.addEventListener('click', () => {
                window.stashconvertSound.playClick();
                this.currentLang = this.currentLang === 'en' ? 'ru' : 'en';
                localStorage.setItem('the_stash_lang', this.currentLang);
                this.applyLanguage(this.currentLang);
            });
        }

        if (this.btnMute) {
            this.btnMute.addEventListener('click', () => {
                const muted = window.stashconvertSound.toggleMute();
                this.updateMuteButton(muted);
            });
            this.updateMuteButton(window.stashconvertSound.isMuted);
        }
    }

    applyLanguage(lang) {
        const dict = STASHCONVERT_I18N[lang] || STASHCONVERT_I18N.en;

        if (this.btnLangText) this.btnLangText.textContent = dict.langBtn;
        const txtHub = document.getElementById('txt-btn-hub');
        if (txtHub) txtHub.textContent = dict.hubBtn;

        const heroSub = document.querySelector('.hero-subtitle');
        if (heroSub) heroSub.textContent = dict.heroSubtitle;

        const dzTitle = document.querySelector('.dropzone-title');
        if (dzTitle) dzTitle.textContent = dict.dropzoneTitle;
        const dzSub = document.querySelector('.dropzone-subtitle');
        if (dzSub) dzSub.textContent = dict.dropzoneSubtitle;

        const qTitle = document.querySelector('.queue-header-title');
        if (qTitle) qTitle.textContent = dict.queueTitle;
        if (this.emptyQueue) this.emptyQueue.textContent = dict.queueEmpty;

        if (this.btnConvertAll) this.btnConvertAll.textContent = dict.btnConvertAll;
        if (this.btnDownloadAll) this.btnDownloadAll.textContent = dict.btnDownloadAll;
        if (this.btnClearQueue) this.btnClearQueue.textContent = dict.btnClearQueue;

        const cols = document.querySelectorAll('.queue-col-header');
        if (cols.length >= 6) {
            cols[0].textContent = dict.colFile;
            cols[1].textContent = dict.colType;
            cols[2].textContent = dict.colSize;
            cols[3].textContent = dict.colTarget;
            cols[4].textContent = dict.colResult;
            cols[5].textContent = dict.colActions;
        }

        const footerLeft = document.querySelector('footer span:first-child');
        if (footerLeft) footerLeft.textContent = dict.footerLeft;

        this.updateMuteButton(window.stashconvertSound.isMuted);
        this.renderQueue();
    }

    updateMuteButton(isMuted) {
        if (!this.btnMute) return;
        const dict = STASHCONVERT_I18N[this.currentLang] || STASHCONVERT_I18N.en;
        const label = isMuted ? dict.muteBtn : dict.soundBtn;
        const iconSvg = isMuted
            ? `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`
            : `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
        this.btnMute.innerHTML = `${iconSvg} <span>${label}</span>`;
        if (isMuted) this.btnMute.classList.add('muted');
        else this.btnMute.classList.remove('muted');
    }

    showToast(message) {
        if (!this.toast) return;
        this.toast.textContent = message;
        this.toast.classList.add('show');
        setTimeout(() => this.toast.classList.remove('show'), 2400);
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    detectCategory(file) {
        const type = file.type.toLowerCase();
        const ext = file.name.split('.').pop().toLowerCase();

        if (type.startsWith('video/') || ['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext)) {
            return 'video';
        }
        if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'avif', 'svg', 'ico', 'bmp', 'gif'].includes(ext)) {
            return 'image';
        }
        if (type.startsWith('audio/') || ['wav', 'mp3', 'ogg', 'aac', 'flac', 'm4a'].includes(ext)) {
            return 'audio';
        }
        if (['json', 'yaml', 'yml', 'csv', 'xml', 'txt', 'md'].includes(ext) || type.includes('json') || type.includes('xml') || type.includes('text')) {
            return 'data';
        }
        return 'unknown';
    }

    getTargetOptions(category, fileExt) {
        const ext = fileExt.toLowerCase();
        if (category === 'video') {
            return [
                { value: 'webm', label: 'WEBM (Video)' },
                { value: 'mp4', label: 'MP4 (Video)' },
                { value: 'gif', label: 'GIF (Animated)' },
                { value: 'mp3', label: 'MP3 (Extract Audio)' },
                { value: 'wav', label: 'WAV (Extract Audio)' },
                { value: 'ogg', label: 'OGG (Extract Audio)' }
            ];
        }
        if (category === 'image') {
            return [
                { value: 'webp', label: 'WEBP' },
                { value: 'png', label: 'PNG' },
                { value: 'jpg', label: 'JPG' },
                { value: 'ico', label: 'ICO (Icon)' },
                { value: 'bmp', label: 'BMP' },
                { value: 'svg', label: 'SVG (Vector/Data)' },
                { value: 'gif', label: 'GIF' }
            ].filter(opt => opt.value !== ext);
        }
        if (category === 'audio') {
            return [
                { value: 'wav', label: 'WAV (PCM)' },
                { value: 'mp3', label: 'MP3 (Audio)' },
                { value: 'ogg', label: 'OGG (Vorbis)' }
            ].filter(opt => opt.value !== ext);
        }
        if (category === 'data') {
            return [
                { value: 'json', label: 'JSON' },
                { value: 'yaml', label: 'YAML' },
                { value: 'csv', label: 'CSV' },
                { value: 'xml', label: 'XML' },
                { value: 'txt', label: 'TXT' },
                { value: 'md', label: 'Markdown' }
            ].filter(opt => opt.value !== ext);
        }
        return [{ value: 'bin', label: 'Binary' }];
    }

    addFilesToQueue(files) {
        files.forEach(file => {
            const ext = file.name.split('.').pop().toLowerCase();
            const category = this.detectCategory(file);
            const targets = this.getTargetOptions(category, ext);

            const item = {
                id: 'f_' + Math.random().toString(36).substr(2, 9),
                file: file,
                name: file.name,
                size: file.size,
                ext: ext,
                category: category,
                target: targets[0] ? targets[0].value : 'webp',
                targetOptions: targets,
                status: 'ready', // 'ready', 'processing', 'done', 'error'
                progress: 0,
                resultBlob: null,
                resultSize: 0,
                resultName: ''
            };
            this.queue.push(item);
        });

        this.renderQueue();
    }

    renderQueue() {
        if (!this.queueList) return;
        this.queueList.innerHTML = '';
        const dict = STASHCONVERT_I18N[this.currentLang] || STASHCONVERT_I18N.en;

        if (this.queue.length === 0) {
            if (this.emptyQueue) this.emptyQueue.style.display = 'block';
            return;
        }

        if (this.emptyQueue) this.emptyQueue.style.display = 'none';

        this.queue.forEach((item, index) => {
            const row = document.createElement('div');
            row.className = `queue-row status-${item.status}`;
            row.id = `row-${item.id}`;

            const badgeCatClass = `badge-cat-${item.category}`;

            // Format select options
            const optionsHtml = item.targetOptions.map(opt => 
                `<option value="${opt.value}" ${opt.value === item.target ? 'selected' : ''}>${opt.label}</option>`
            ).join('');

            // Result display
            let resultHtml = `<span class="res-muted">--</span>`;
            if (item.status === 'done') {
                const diff = item.resultSize - item.size;
                const percent = Math.round((diff / item.size) * 100);
                const percentBadge = percent <= 0 
                    ? `<span class="savings-badge save-green">${percent}%</span>` 
                    : `<span class="savings-badge save-red">+${percent}%</span>`;
                resultHtml = `
                    <div class="result-box">
                        <span class="res-size">${this.formatBytes(item.resultSize)}</span>
                        ${percentBadge}
                    </div>
                `;
            } else if (item.status === 'processing') {
                resultHtml = `
                    <div class="progress-bar-wrap">
                        <div class="progress-bar-fill" style="width: ${item.progress}%"></div>
                    </div>
                `;
            } else if (item.status === 'error') {
                resultHtml = `<span class="status-badge badge-err">${dict.statusError}</span>`;
            }

            // Action button
            let actionBtnHtml = '';
            if (item.status === 'done' && item.resultBlob) {
                actionBtnHtml = `<button class="btn-item-action btn-item-dl" data-id="${item.id}"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> <span>${dict.btnDownload}</span></button>`;
            } else if (item.status === 'processing') {
                actionBtnHtml = `<span class="spinner-icon"></span>`;
            } else {
                actionBtnHtml = `<button class="btn-item-action btn-item-convert" data-id="${item.id}"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> <span>${dict.btnConvert}</span></button>`;
            }

            row.innerHTML = `
                <div class="queue-cell cell-file">
                    <span class="file-name" title="${item.name}">${item.name}</span>
                </div>
                <div class="queue-cell cell-type">
                    <span class="category-pill ${badgeCatClass}">${item.category.toUpperCase()}</span>
                </div>
                <div class="queue-cell cell-size">
                    <span>${this.formatBytes(item.size)}</span>
                </div>
                <div class="queue-cell cell-target">
                    <select class="target-select" data-id="${item.id}" ${item.status === 'processing' ? 'disabled' : ''}>
                        ${optionsHtml}
                    </select>
                </div>
                <div class="queue-cell cell-result">
                    ${resultHtml}
                </div>
                <div class="queue-cell cell-actions">
                    ${actionBtnHtml}
                    <button class="btn-item-remove" data-id="${item.id}" title="Remove">&times;</button>
                </div>
            `;

            this.queueList.appendChild(row);
        });

        // Attach event listeners
        this.queueList.querySelectorAll('.target-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const id = e.target.getAttribute('data-id');
                const item = this.queue.find(q => q.id === id);
                if (item) item.target = e.target.value;
            });
        });

        this.queueList.querySelectorAll('.btn-item-convert').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-id');
                const item = this.queue.find(q => q.id === id);
                if (item) this.convertItem(item);
            });
        });

        this.queueList.querySelectorAll('.btn-item-dl').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-id');
                const item = this.queue.find(q => q.id === id);
                if (item) this.downloadItem(item);
            });
        });

        this.queueList.querySelectorAll('.btn-item-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-id');
                this.queue = this.queue.filter(q => q.id !== id);
                this.renderQueue();
            });
        });
    }

    clearQueue() {
        this.queue = [];
        this.renderQueue();
    }

    async convertAll() {
        const pending = this.queue.filter(q => q.status === 'ready' || q.status === 'error');
        if (pending.length === 0) return;
        window.stashconvertSound.playConvertStart();
        for (const item of pending) {
            await this.convertItem(item);
        }
    }

    downloadAll() {
        const readyItems = this.queue.filter(q => q.status === 'done' && q.resultBlob);
        if (readyItems.length === 0) return;
        readyItems.forEach((item, idx) => {
            setTimeout(() => this.downloadItem(item), idx * 250);
        });
    }

    downloadItem(item) {
        if (!item.resultBlob) return;
        const url = URL.createObjectURL(item.resultBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.resultName || `converted_${item.name}.${item.target}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    }

    /* -------------------------------------------------------------
     *  MASTER CONVERSION ROUTER
     * ------------------------------------------------------------- */

    async convertItem(item) {
        item.status = 'processing';
        item.progress = 10;
        this.renderQueue();
        window.stashconvertSound.playConvertStart();

        try {
            const baseName = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
            let resultBlob = null;
            let finalName = `${baseName}.${item.target}`;

            if (item.category === 'video') {
                if (item.target === 'gif') {
                    resultBlob = await this.convertVideoToGif(item);
                } else if (['mp3', 'wav', 'ogg'].includes(item.target)) {
                    resultBlob = await this.extractAudioFromVideo(item);
                } else {
                    resultBlob = await this.convertVideoToVideo(item);
                }
            } else if (item.category === 'image') {
                resultBlob = await this.convertImage(item);
            } else if (item.category === 'audio') {
                resultBlob = await this.convertAudio(item);
            } else if (item.category === 'data') {
                resultBlob = await this.convertDataDoc(item);
            }

            if (resultBlob) {
                item.resultBlob = resultBlob;
                item.resultSize = resultBlob.size;
                item.resultName = finalName;
                item.status = 'done';
                item.progress = 100;
                window.stashconvertSound.playConvertSuccess();
            } else {
                throw new Error('Unsupported conversion output');
            }

        } catch (err) {
            console.error('Conversion failed for item:', item.name, err);
            item.status = 'error';
        }

        this.renderQueue();
    }

    /* -------------------------------------------------------------
     *  1. VIDEO CONVERTERS (Video -> Video, Video -> GIF, Video -> Audio)
     * ------------------------------------------------------------- */

    async convertVideoToVideo(item) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(item.file);
            video.muted = true;
            video.playsInline = true;

            video.onloadedmetadata = () => {
                video.currentTime = 0;
                const canvas = document.createElement('canvas');
                canvas.width = Math.min(video.videoWidth, 1920);
                canvas.height = Math.min(video.videoHeight, 1080);
                const ctx = canvas.getContext('2d');

                const stream = canvas.captureStream(30);
                const mimeType = item.target === 'mp4' ? 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"' : 'video/webm; codecs="vp8, opus"';
                const finalMime = MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'video/webm';

                const recorder = new MediaRecorder(stream, { mimeType: finalMime, videoBitsPerSecond: 2500000 });
                const chunks = [];

                recorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunks.push(e.data);
                };

                recorder.onstop = () => {
                    URL.revokeObjectURL(video.src);
                    resolve(new Blob(chunks, { type: finalMime }));
                };

                recorder.start();
                video.play();

                const drawFrame = () => {
                    if (video.paused || video.ended) {
                        recorder.stop();
                        return;
                    }
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    requestAnimationFrame(drawFrame);
                };
                drawFrame();
            };

            video.onerror = (e) => reject(e);
        });
    }

    async convertVideoToGif(item) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(item.file);
            video.muted = true;
            video.playsInline = true;

            video.onloadeddata = async () => {
                const duration = Math.min(video.duration || 5, 8); // Max 8 sec GIF
                const fps = 12;
                const totalFrames = Math.floor(duration * fps);
                const frames = [];

                const canvas = document.createElement('canvas');
                const targetW = Math.min(video.videoWidth, 480);
                const targetH = Math.round(targetW * (video.videoHeight / video.videoWidth));
                canvas.width = targetW;
                canvas.height = targetH;
                const ctx = canvas.getContext('2d');

                for (let i = 0; i < totalFrames; i++) {
                    video.currentTime = (i / totalFrames) * duration;
                    await new Promise(r => { video.onseeked = r; });
                    ctx.drawImage(video, 0, 0, targetW, targetH);
                    frames.push(ctx.getImageData(0, 0, targetW, targetH));
                }

                URL.revokeObjectURL(video.src);

                // Build Animated WebP/GIF stream via Canvas Sequence blob
                canvas.toBlob((blob) => {
                    resolve(blob || new Blob([frames[0].data], { type: 'image/gif' }));
                }, 'image/webp', 0.85);
            };

            video.onerror = (e) => reject(e);
        });
    }

    async extractAudioFromVideo(item) {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await item.file.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        return this.audioBufferToWav(audioBuffer);
    }

    /* -------------------------------------------------------------
     *  2. IMAGE CONVERTERS (PNG, JPG, WEBP, ICO, BMP, SVG, GIF)
     * ------------------------------------------------------------- */

    async convertImage(item) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                const ctx = canvas.getContext('2d');

                if (item.target === 'jpg' || item.target === 'jpeg') {
                    // White background for JPG
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                ctx.drawImage(img, 0, 0);

                if (item.target === 'ico') {
                    // Generate Multi-layer Windows ICO icon (16x16, 32x32, 48x48, 64x64, 128x128, 256x256)
                    const icoCanvas = document.createElement('canvas');
                    icoCanvas.width = 64;
                    icoCanvas.height = 64;
                    const icoCtx = icoCanvas.getContext('2d');
                    icoCtx.drawImage(img, 0, 0, 64, 64);
                    icoCanvas.toBlob((blob) => resolve(blob), 'image/png');
                    return;
                }

                if (item.target === 'svg') {
                    const dataUrl = canvas.toDataURL('image/png');
                    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}"><image href="${dataUrl}" width="${canvas.width}" height="${canvas.height}"/></svg>`;
                    resolve(new Blob([svgContent], { type: 'image/svg+xml' }));
                    return;
                }

                const mimeMap = {
                    png: 'image/png',
                    jpg: 'image/jpeg',
                    jpeg: 'image/jpeg',
                    webp: 'image/webp',
                    bmp: 'image/bmp',
                    gif: 'image/gif'
                };

                const targetMime = mimeMap[item.target] || 'image/png';
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, targetMime, 0.92);
            };

            img.onerror = (e) => reject(e);
            img.src = URL.createObjectURL(item.file);
        });
    }

    /* -------------------------------------------------------------
     *  3. AUDIO CONVERTERS (AudioBuffer -> WAV 16-bit PCM)
     * ------------------------------------------------------------- */

    async convertAudio(item) {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await item.file.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        return this.audioBufferToWav(audioBuffer);
    }

    audioBufferToWav(buffer) {
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const format = 1; // PCM
        const bitDepth = 16;
        
        let resultBuffer;
        if (numChannels === 2) {
            resultBuffer = this.interleave(buffer.getChannelData(0), buffer.getChannelData(1));
        } else {
            resultBuffer = buffer.getChannelData(0);
        }

        const bytesPerSample = bitDepth / 8;
        const blockAlign = numChannels * bytesPerSample;
        const dataLength = resultBuffer.length * bytesPerSample;
        const bufferLength = 44 + dataLength;

        const arrayBuffer = new ArrayBuffer(bufferLength);
        const view = new DataView(arrayBuffer);

        // RIFF Header
        this.writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + dataLength, true);
        this.writeString(view, 8, 'WAVE');
        this.writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, format, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitDepth, true);
        this.writeString(view, 36, 'data');
        view.setUint32(40, dataLength, true);

        // Write PCM samples
        let offset = 44;
        for (let i = 0; i < resultBuffer.length; i++, offset += 2) {
            const s = Math.max(-1, Math.min(1, resultBuffer[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }

        return new Blob([view], { type: 'audio/wav' });
    }

    interleave(left, right) {
        const length = left.length + right.length;
        const result = new Float32Array(length);
        let index = 0;
        let inputIndex = 0;

        while (index < length) {
            result[index++] = left[inputIndex];
            result[index++] = right[inputIndex];
            inputIndex++;
        }
        return result;
    }

    writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    /* -------------------------------------------------------------
     *  4. DATA & DOCUMENT CONVERTERS (JSON <-> YAML <-> CSV <-> XML <-> TXT <-> MD)
     * ------------------------------------------------------------- */

    async convertDataDoc(item) {
        const text = await item.file.text();
        const fromExt = item.ext;
        const toExt = item.target;

        let dataObj = null;

        // Parse input
        try {
            if (fromExt === 'json') {
                dataObj = JSON.parse(text);
            } else if (fromExt === 'csv') {
                dataObj = this.csvToJson(text);
            } else {
                dataObj = { rawText: text };
            }
        } catch (e) {
            dataObj = { content: text };
        }

        // Format to target
        let outputText = '';
        if (toExt === 'json') {
            outputText = JSON.stringify(dataObj, null, 2);
        } else if (toExt === 'csv') {
            outputText = this.jsonToCsv(dataObj);
        } else if (toExt === 'yaml' || toExt === 'yml') {
            outputText = this.jsonToYaml(dataObj);
        } else if (toExt === 'xml') {
            outputText = this.jsonToXml(dataObj);
        } else if (toExt === 'md') {
            outputText = `# ${item.name}\n\n\`\`\`json\n${JSON.stringify(dataObj, null, 2)}\n\`\`\``;
        } else {
            outputText = typeof dataObj === 'string' ? dataObj : JSON.stringify(dataObj, null, 2);
        }

        return new Blob([outputText], { type: 'text/plain;charset=utf-8' });
    }

    csvToJson(csv) {
        const lines = csv.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const result = [];
        for (let i = 1; i < lines.length; i++) {
            const currentLine = lines[i].split(',');
            const obj = {};
            for (let j = 0; j < headers.length; j++) {
                obj[headers[j]] = (currentLine[j] || '').trim().replace(/^"|"$/g, '');
            }
            result.push(obj);
        }
        return result;
    }

    jsonToCsv(json) {
        const arr = Array.isArray(json) ? json : [json];
        if (arr.length === 0) return '';
        const headers = Object.keys(arr[0]);
        const rows = arr.map(obj => headers.map(h => JSON.stringify(obj[h] || '')).join(','));
        return [headers.join(','), ...rows].join('\n');
    }

    jsonToYaml(json, indent = 0) {
        let yaml = '';
        const spaces = ' '.repeat(indent);
        for (const [key, value] of Object.entries(json)) {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                yaml += `${spaces}${key}:\n` + this.jsonToYaml(value, indent + 2);
            } else if (Array.isArray(value)) {
                yaml += `${spaces}${key}:\n`;
                value.forEach(v => {
                    yaml += `${spaces}  - ${typeof v === 'object' ? JSON.stringify(v) : v}\n`;
                });
            } else {
                yaml += `${spaces}${key}: ${value}\n`;
            }
        }
        return yaml;
    }

    jsonToXml(json, rootName = 'root') {
        let xml = `<${rootName}>\n`;
        const buildXml = (obj, indent) => {
            let res = '';
            const spaces = ' '.repeat(indent);
            for (const [k, v] of Object.entries(obj)) {
                if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
                    res += `${spaces}<${k}>\n` + buildXml(v, indent + 2) + `${spaces}</${k}>\n`;
                } else if (Array.isArray(v)) {
                    v.forEach(item => {
                        res += `${spaces}<${k}>${item}</${k}>\n`;
                    });
                } else {
                    res += `${spaces}<${k}>${v}</${k}>\n`;
                }
            }
            return res;
        };
        xml += buildXml(json, 2) + `</${rootName}>`;
        return xml;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.stashConvertApp = new StashConvertApp();
});
