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
        btnReconvert: "Re-convert",
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
        btnReconvert: "Переконвертировать",
        btnDownload: "Скачать",
        footerLeft: "StashConvert • 100% локальная обработка в браузере",
        footerRight: "Часть the stash"
    }
};

/**
 * Pure JavaScript Animated GIF89a Encoder with LZW compression
 * Produces crisp, glitch-free animated .gif files directly in browser.
 */
class GifBitWriter {
    constructor() {
        this.bytes = [];
        this.curAcc = 0;
        this.curBits = 0;
    }

    write(code, nBits) {
        this.curAcc |= (code << this.curBits);
        this.curBits += nBits;
        while (this.curBits >= 8) {
            this.bytes.push(this.curAcc & 0xFF);
            this.curAcc >>>= 8;
            this.curBits -= 8;
        }
    }

    flush() {
        if (this.curBits > 0) {
            this.bytes.push(this.curAcc & 0xFF);
            this.curAcc = 0;
            this.curBits = 0;
        }
    }
}

class AnimatedGifEncoder {
    constructor(width, height, delayMs = 100) {
        this.width = width;
        this.height = height;
        this.delayMs = delayMs;
        this.frames = [];
    }

    addFrame(imageData) {
        this.frames.push(imageData);
    }

    quantizeFrame(imgData) {
        const data = imgData.data;
        const len = data.length;
        const numPixels = len / 4;

        // 256-color palette: 216 uniform RGB cube + 40 grayscales
        const palette = [];
        for (let r = 0; r < 6; r++) {
            for (let g = 0; g < 6; g++) {
                for (let b = 0; b < 6; b++) {
                    palette.push([r * 51, g * 51, b * 51]);
                }
            }
        }
        for (let i = 0; i < 40; i++) {
            const v = Math.round((i / 39) * 255);
            palette.push([v, v, v]);
        }

        const indexedPixels = new Uint8Array(numPixels);

        for (let i = 0, p = 0; i < len; i += 4, p++) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const maxC = Math.max(r, g, b);
            const minC = Math.min(r, g, b);

            if (maxC - minC < 8) {
                const grayIdx = Math.min(39, Math.max(0, Math.round((r / 255) * 39)));
                indexedPixels[p] = 216 + grayIdx;
            } else {
                const ri = Math.min(5, Math.max(0, Math.round(r / 51)));
                const gi = Math.min(5, Math.max(0, Math.round(g / 51)));
                const bi = Math.min(5, Math.max(0, Math.round(b / 51)));
                indexedPixels[p] = ri * 36 + gi * 6 + bi;
            }
        }

        return { palette, indexedPixels };
    }

    encode() {
        const bytes = [];
        const pushStr = (s) => {
            for (let i = 0; i < s.length; i++) bytes.push(s.charCodeAt(i));
        };
        const push16 = (n) => {
            bytes.push(n & 0xFF, (n >> 8) & 0xFF);
        };

        // 1. GIF Header
        pushStr('GIF89a');

        // 2. Logical Screen Descriptor
        push16(this.width);
        push16(this.height);
        bytes.push(0x70); // GCT Flag = 0, Color Res = 7 (8 bits), Sort = 0, GCT Size = 0
        bytes.push(0);    // Background color index
        bytes.push(0);    // Pixel aspect ratio

        // 3. Netscape 2.0 Loop Extension (Infinite looping)
        bytes.push(0x21, 0xFF, 0x0B);
        pushStr('NETSCAPE2.0');
        bytes.push(0x03, 0x01, 0x00, 0x00, 0x00);

        const delayCentisecs = Math.max(1, Math.round(this.delayMs / 10));

        // 4. Encode each frame
        for (let f = 0; f < this.frames.length; f++) {
            const { palette, indexedPixels } = this.quantizeFrame(this.frames[f]);

            // Graphic Control Extension
            bytes.push(0x21, 0xF9, 0x04);
            bytes.push(0x04); // Disposal method: restore to background
            push16(delayCentisecs);
            bytes.push(0x00); // Transparent color index
            bytes.push(0x00); // Block terminator

            // Image Descriptor
            bytes.push(0x2C);
            push16(0); // Left
            push16(0); // Top
            push16(this.width);
            push16(this.height);
            bytes.push(0x87); // Local Color Table Flag (1), Interlace (0), Sort (0), Size 7 (256 colors)

            // Local Color Table (256 * 3 bytes)
            for (let i = 0; i < 256; i++) {
                bytes.push(palette[i][0], palette[i][1], palette[i][2]);
            }

            // LZW raster data
            const lzwData = this.lzwEncode(8, indexedPixels);
            for (let i = 0; i < lzwData.length; i++) {
                bytes.push(lzwData[i]);
            }
        }

        // 5. GIF Trailer
        bytes.push(0x3B);

        return new Blob([new Uint8Array(bytes)], { type: 'image/gif' });
    }

    lzwEncode(minCodeSize, pixels) {
        const clearCode = 1 << minCodeSize; // 256
        const eoiCode = clearCode + 1;       // 257
        let nextCode = eoiCode + 1;
        let codeSize = minCodeSize + 1;

        const writer = new GifBitWriter();
        const table = new Map();

        const resetTable = () => {
            table.clear();
            for (let i = 0; i < clearCode; i++) {
                table.set(i, i);
            }
            codeSize = minCodeSize + 1;
            nextCode = eoiCode + 1;
        };

        resetTable();
        writer.write(clearCode, codeSize);

        let prefix = pixels[0];

        for (let i = 1; i < pixels.length; i++) {
            const k = pixels[i];
            const combinedKey = (prefix << 8) | k;

            if (table.has(combinedKey)) {
                prefix = table.get(combinedKey);
            } else {
                writer.write(prefix, codeSize);

                if (nextCode < 4096) {
                    table.set(combinedKey, nextCode++);
                    if (nextCode > (1 << codeSize) && codeSize < 12) {
                        codeSize++;
                    }
                } else {
                    writer.write(clearCode, codeSize);
                    resetTable();
                }
                prefix = k;
            }
        }

        writer.write(prefix, codeSize);
        writer.write(eoiCode, codeSize);
        writer.flush();

        const result = [minCodeSize];
        let offset = 0;
        while (offset < writer.bytes.length) {
            const blockSize = Math.min(255, writer.bytes.length - offset);
            result.push(blockSize);
            for (let b = 0; b < blockSize; b++) {
                result.push(writer.bytes[offset + b]);
            }
            offset += blockSize;
        }
        result.push(0x00);

        return result;
    }
}


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

        const qTitle = document.querySelector('.queue-header-title span');
        if (qTitle) qTitle.textContent = dict.queueTitle;
        if (this.emptyQueue) this.emptyQueue.textContent = dict.queueEmpty;

        const btnConvAllSpan = document.querySelector('#btn-convert-all span');
        if (btnConvAllSpan) btnConvAllSpan.textContent = dict.btnConvertAll;
        const btnDlAllSpan = document.querySelector('#btn-download-all span');
        if (btnDlAllSpan) btnDlAllSpan.textContent = dict.btnDownloadAll;
        const btnClearSpan = document.querySelector('#btn-clear-queue span');
        if (btnClearSpan) btnClearSpan.textContent = dict.btnClearQueue;

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
        if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'avif', 'svg', 'ico', 'bmp'].includes(ext)) {
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
            // PNG must NOT convert to GIF (static images)
            return [
                { value: 'webp', label: 'WEBP' },
                { value: 'png', label: 'PNG' },
                { value: 'jpg', label: 'JPG' },
                { value: 'ico', label: 'ICO (Icon)' },
                { value: 'bmp', label: 'BMP' },
                { value: 'svg', label: 'SVG (Vector/Data)' }
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
                target: targets[0] ? targets[0].value : (category === 'video' ? 'webm' : 'webp'),
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

        this.queue.forEach((item) => {
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

            // Action button (Allows re-converting as many times as desired!)
            let actionBtnHtml = '';
            if (item.status === 'done' && item.resultBlob) {
                actionBtnHtml = `
                    <button class="btn-item-action btn-item-dl" data-id="${item.id}" title="Download converted file">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        <span>${dict.btnDownload}</span>
                    </button>
                    <button class="btn-item-action btn-item-convert" data-id="${item.id}" title="Re-convert">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                    </button>
                `;
            } else if (item.status === 'processing') {
                actionBtnHtml = `<span class="spinner-icon"></span>`;
            } else {
                actionBtnHtml = `
                    <button class="btn-item-action btn-item-convert" data-id="${item.id}">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                        <span>${dict.btnConvert}</span>
                    </button>
                `;
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
                if (item) {
                    item.target = e.target.value;
                    // Reset converted state when target changes so user can easily re-convert!
                    item.status = 'ready';
                    item.resultBlob = null;
                    item.resultSize = 0;
                    item.resultName = '';
                    item.progress = 0;
                    this.renderQueue();
                }
            });
        });

        this.queueList.querySelectorAll('.btn-item-convert').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-id') || btn.closest('.btn-item-convert').getAttribute('data-id');
                const item = this.queue.find(q => q.id === id);
                if (item) this.convertItem(item);
            });
        });

        this.queueList.querySelectorAll('.btn-item-dl').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-id') || btn.closest('.btn-item-dl').getAttribute('data-id');
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
        const pending = this.queue.filter(q => q.status === 'ready' || q.status === 'error' || q.status === 'done');
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
        item.progress = 25;
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
            } else {
                resultBlob = item.file;
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
                const duration = Math.min(video.duration || 4, 6);
                const fps = 10;
                const totalFrames = Math.max(1, Math.floor(duration * fps));
                const delayMs = Math.round(1000 / fps);

                const targetW = Math.min(video.videoWidth || 360, 360);
                const targetH = Math.round(targetW * ((video.videoHeight || 240) / (video.videoWidth || 360)));
                const canvas = document.createElement('canvas');
                canvas.width = targetW;
                canvas.height = targetH;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });

                const gifEncoder = new AnimatedGifEncoder(targetW, targetH, delayMs);

                const captureFrame = (time) => {
                    return new Promise((res) => {
                        const onSeek = () => {
                            video.removeEventListener('seeked', onSeek);
                            requestAnimationFrame(() => {
                                ctx.drawImage(video, 0, 0, targetW, targetH);
                                res(ctx.getImageData(0, 0, targetW, targetH));
                            });
                        };
                        video.addEventListener('seeked', onSeek);
                        video.currentTime = time;
                    });
                };

                for (let i = 0; i < totalFrames; i++) {
                    const time = (i / totalFrames) * duration;
                    const frameData = await captureFrame(time);
                    gifEncoder.addFrame(frameData);
                    item.progress = Math.round(20 + (i / totalFrames) * 70);
                    this.renderQueue();
                }

                URL.revokeObjectURL(video.src);

                const gifBlob = gifEncoder.encode();
                resolve(gifBlob);
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
     *  2. IMAGE CONVERTERS (PNG, JPG, WEBP, ICO, BMP, SVG)
     * ------------------------------------------------------------- */

    async convertImage(item) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                const ctx = canvas.getContext('2d');

                if (item.target === 'jpg' || item.target === 'jpeg' || item.target === 'bmp') {
                    // Solid background for non-alpha formats
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                ctx.drawImage(img, 0, 0);

                if (item.target === 'ico') {
                    // Windows .ico container builder
                    const icoBlob = this.canvasToIco(canvas);
                    resolve(icoBlob);
                    return;
                }

                if (item.target === 'bmp') {
                    // Native Windows BMP encoder
                    const bmpBlob = this.canvasToBmp(canvas);
                    resolve(bmpBlob);
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
                    webp: 'image/webp'
                };

                const targetMime = mimeMap[item.target] || 'image/png';
                canvas.toBlob((blob) => {
                    resolve(blob || new Blob([], { type: targetMime }));
                }, targetMime, 0.92);
            };

            img.onerror = (e) => reject(e);
            img.src = URL.createObjectURL(item.file);
        });
    }

    // Windows .ICO generator: ICONDIR (6B) + ICONDIRENTRY (16B) + PNG Data
    canvasToIco(canvas) {
        const icoCanvas = document.createElement('canvas');
        const dim = Math.min(Math.max(canvas.width, canvas.height), 256);
        icoCanvas.width = dim;
        icoCanvas.height = dim;
        const ctx = icoCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, 0, dim, dim);

        const dataUrl = icoCanvas.toDataURL('image/png');
        const binary = atob(dataUrl.split(',')[1]);
        const pngBytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            pngBytes[i] = binary.charCodeAt(i);
        }

        const icoBuffer = new ArrayBuffer(6 + 16 + pngBytes.length);
        const view = new DataView(icoBuffer);

        // ICONDIR
        view.setUint16(0, 0, true); // Reserved
        view.setUint16(2, 1, true); // Type 1 = ICO
        view.setUint16(4, 1, true); // Image count 1

        // ICONDIRENTRY
        view.setUint8(6, dim >= 256 ? 0 : dim);  // Width
        view.setUint8(7, dim >= 256 ? 0 : dim);  // Height
        view.setUint8(8, 0); // Palette count
        view.setUint8(9, 0); // Reserved
        view.setUint16(10, 1, true); // Color planes
        view.setUint16(12, 32, true); // Bits per pixel
        view.setUint32(14, pngBytes.length, true); // Image size in bytes
        view.setUint32(18, 22, true); // Offset of image data (6 + 16 = 22)

        const u8 = new Uint8Array(icoBuffer);
        u8.set(pngBytes, 22);

        return new Blob([u8], { type: 'image/x-icon' });
    }

    // Windows BMP 24-bit RGB encoder
    canvasToBmp(canvas) {
        const w = canvas.width;
        const h = canvas.height;
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        const rowSize = Math.floor((24 * w + 31) / 32) * 4;
        const pixelArraySize = rowSize * h;
        const fileSize = 54 + pixelArraySize;

        const buffer = new ArrayBuffer(fileSize);
        const view = new DataView(buffer);

        // BMP Header
        view.setUint16(0, 0x4D42, false); // "BM"
        view.setUint32(2, fileSize, true);
        view.setUint16(6, 0, true);
        view.setUint16(8, 0, true);
        view.setUint32(10, 54, true); // Data offset

        // DIB Header (BITMAPINFOHEADER)
        view.setUint32(14, 40, true); // Header size
        view.setInt32(18, w, true);
        view.setInt32(22, h, true); // Bottom-up
        view.setUint16(26, 1, true); // Planes
        view.setUint16(28, 24, true); // Bit count (24bpp)
        view.setUint32(30, 0, true); // Compression BI_RGB
        view.setUint32(34, pixelArraySize, true);
        view.setInt32(38, 2835, true); // 72 DPI
        view.setInt32(42, 2835, true);
        view.setUint32(46, 0, true);
        view.setUint32(50, 0, true);

        const u8 = new Uint8Array(buffer);
        let offset = 54;

        for (let y = h - 1; y >= 0; y--) {
            for (let x = 0; x < w; x++) {
                const srcIdx = (y * w + x) * 4;
                u8[offset++] = data[srcIdx + 2]; // Blue
                u8[offset++] = data[srcIdx + 1]; // Green
                u8[offset++] = data[srcIdx];     // Red
            }
            // Padding to 4-byte boundary
            for (let p = 0; p < (rowSize - w * 3); p++) {
                u8[offset++] = 0;
            }
        }

        return new Blob([u8], { type: 'image/bmp' });
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
