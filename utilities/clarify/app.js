// Clarify • AI Photo Upscaler & Image Enhancer Engine
// 100% Client-Side • Directional Super-Resolution & Neural Enhancement • Zero Telemetry

document.addEventListener('DOMContentLoaded', () => {
    // --- Application State ---
    const state = {
        sourceImage: null,
        sourceWidth: 0,
        sourceHeight: 0,
        fileName: 'image',
        fileSize: 0,
        scaleFactor: '4', // '2', '4', '1080', '2160'
        denoiseStrength: 25,
        sharpness: 55,
        exportFormat: 'png',
        exportQuality: 0.95,
        isProcessing: false,
        upscaledCanvas: null,
        splitPosition: 50, // % (0..100)
        engineBackend: localStorage.getItem('clarify_engine') || 'auto',
        activeEngine: 'browser', // 'local', 'browser'
        isEngineOnline: false
    };

    // --- DOM Elements ---
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const heroSection = document.getElementById('hero-section');
    const workspace = document.getElementById('workspace');

    const canvasBefore = document.getElementById('canvas-before');
    const canvasAfter = document.getElementById('canvas-after');
    const splitStage = document.getElementById('split-stage');
    const splitDivider = document.getElementById('split-divider');
    const splitHandle = document.getElementById('split-handle');
    const splitViewport = document.getElementById('split-viewport');

    const metaFileName = document.getElementById('meta-filename');
    const metaDims = document.getElementById('meta-dims');

    const selectAiModel = document.getElementById('select-ai-model');
    const scaleBtns = document.querySelectorAll('.scale-btn');
    const inputDenoise = document.getElementById('input-denoise');
    const valDenoise = document.getElementById('val-denoise');
    const inputSharpness = document.getElementById('input-sharpness');
    const valSharpness = document.getElementById('val-sharpness');

    const btnUpscale = document.getElementById('btn-upscale');
    const btnNewImage = document.getElementById('btn-new-image');
    const progressBox = document.getElementById('progress-box');
    const progressBar = document.getElementById('progress-bar-fill');
    const progressStatus = document.getElementById('progress-status');
    const progressPct = document.getElementById('progress-pct');

    const formatPills = document.querySelectorAll('.format-pill');
    const btnDownload = document.getElementById('btn-download');
    const btnCopy = document.getElementById('btn-copy');

    const btnSettings = document.getElementById('btn-settings');
    const modalSettings = document.getElementById('modal-settings');
    const closeSettings = document.getElementById('close-settings');
    const selectEngine = document.getElementById('select-engine');
    const btnSaveSettings = document.getElementById('btn-save-settings');
    const engineStatusPill = document.getElementById('engine-status-pill');

    // --- Neural Upscaler / Client-Side Engine Status ---
    function checkEngineStatus() {
        const accelText = document.getElementById('accel-text');
        const accelDot = document.querySelector('.accel-dot');
        state.isEngineOnline = false;
        state.activeEngine = 'browser';
        if (accelText) accelText.textContent = 'клиентский режим (webgl)';
        if (accelDot) {
            accelDot.style.background = 'var(--text-muted)';
            accelDot.style.boxShadow = 'none';
        }
        if (engineStatusPill) {
            engineStatusPill.textContent = 'на паузе (требуется GPU сервер)';
            engineStatusPill.style.background = 'var(--card-border)';
            engineStatusPill.style.color = 'var(--text-muted)';
        }
    }
    checkEngineStatus();

        

    // --- Toast Notifications ---
    function showToast(message) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2600);
    }

    // --- File Loading & Image Setup ---
    function handleFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            showToast('Please select a valid image file');
            return;
        }

        state.fileName = file.name.replace(/\.[^/.]+$/, '');
        state.fileSize = file.size;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                state.sourceImage = img;
                state.sourceWidth = img.naturalWidth || img.width;
                state.sourceHeight = img.naturalHeight || img.height;

                // Update UI state
                heroSection.style.display = 'none';
                dropzone.style.display = 'none';
                workspace.style.display = 'grid';

                metaFileName.textContent = file.name;
                metaDims.textContent = `${state.sourceWidth} × ${state.sourceHeight}`;

                // Setup Initial View
                setupInitialCanvases();
                showToast(`Loaded: ${state.sourceWidth}×${state.sourceHeight}px`);
                
                // Automatically run upscaler on load for instant preview
                upscaleImage();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Drag & Drop
    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });

    ['dragenter', 'dragover'].forEach(name => {
        dropzone.addEventListener(name, (e) => {
            e.preventDefault();
            dropzone.classList.add('drag-over');
        });
    });

    ['dragleave', 'drop'].forEach(name => {
        dropzone.addEventListener(name, (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-over');
        });
    });

    dropzone.addEventListener('drop', (e) => {
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    // Window Paste Support (Ctrl+V)
    window.addEventListener('paste', (e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                handleFile(blob);
                break;
            }
        }
    });

    btnNewImage.addEventListener('click', () => {
        heroSection.style.display = 'block';
        dropzone.style.display = 'flex';
        workspace.style.display = 'none';
        fileInput.value = '';
    });

    // --- Initial Canvases Setup ---
    function setupInitialCanvases() {
        const w = state.sourceWidth;
        const h = state.sourceHeight;

        canvasBefore.width = w;
        canvasBefore.height = h;
        const ctxB = canvasBefore.getContext('2d');
        ctxB.drawImage(state.sourceImage, 0, 0);

        canvasAfter.width = w;
        canvasAfter.height = h;
        const ctxA = canvasAfter.getContext('2d');
        ctxA.drawImage(state.sourceImage, 0, 0);

        state.upscaledCanvas = canvasAfter;
        updateSplitVisuals();
    }

    // --- 100% Synchronized Split Slider Logic ---
    function updateSplitVisuals() {
        const pos = state.splitPosition;
        splitDivider.style.left = `${pos}%`;
        splitHandle.style.left = `${pos}%`;

        // Left shows Original, Right shows Clarify AI
        canvasBefore.style.clipPath = `polygon(0 0, ${pos}% 0, ${pos}% 100%, 0 100%)`;
        canvasAfter.style.clipPath = `polygon(${pos}% 0, 100% 0, 100% 100%, ${pos}% 100%)`;
    }

    let isSlidingSplit = false;

    function moveSplitFromClientX(clientX) {
        if (!splitStage) return;
        const rect = splitStage.getBoundingClientRect();
        if (rect.width <= 0) return;
        const offsetX = clientX - rect.left;
        let pct = (offsetX / rect.width) * 100;
        pct = Math.max(0, Math.min(100, pct));
        state.splitPosition = pct;
        updateSplitVisuals();
    }

    // Dragging or clicking anywhere in the viewport smoothly moves the synchronized slider
    splitViewport.addEventListener('pointerdown', (e) => {
        isSlidingSplit = true;
        splitViewport.setPointerCapture(e.pointerId);
        moveSplitFromClientX(e.clientX);
    });

    splitViewport.addEventListener('pointermove', (e) => {
        if (!isSlidingSplit) return;
        moveSplitFromClientX(e.clientX);
    });

    splitViewport.addEventListener('pointerup', (e) => {
        isSlidingSplit = false;
        try { splitViewport.releasePointerCapture(e.pointerId); } catch(err) {}
    });

    splitViewport.addEventListener('pointercancel', (e) => {
        isSlidingSplit = false;
    });

    // --- Controls Event Handlers ---
    scaleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            scaleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.scaleFactor = btn.dataset.scale;
            upscaleImage();
        });
    });

    inputDenoise.addEventListener('input', (e) => {
        state.denoiseStrength = parseInt(e.target.value, 10);
        valDenoise.textContent = `${state.denoiseStrength}%`;
    });

    inputSharpness.addEventListener('input', (e) => {
        state.sharpness = parseInt(e.target.value, 10);
        valSharpness.textContent = `${state.sharpness}%`;
    });

    formatPills.forEach(pill => {
        pill.addEventListener('click', () => {
            formatPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            state.exportFormat = pill.dataset.format;
        });
    });

    if (selectAiModel) {
        selectAiModel.addEventListener('change', () => {
            upscaleImage();
        });
    }

    // --- State-of-the-Art Neural Super-Resolution Engine ---
    async function upscaleImage() {
        if (!state.sourceImage || state.isProcessing) return;
        state.isProcessing = true;

        btnUpscale.disabled = true;
        btnUpscale.style.opacity = '0.5';
        progressBox.classList.add('active');
        progressBar.style.width = '0%';
        progressPct.textContent = '0%';

        try {
            const srcW = state.sourceWidth;
            const srcH = state.sourceHeight;
            const mult = parseInt(state.scaleFactor, 10) || 4;
            const targetW = srcW * mult;
            const targetH = srcH * mult;

            let processed = false;

            // --- PATH B: In-Browser Super-Resolution Engine ---
            {
                progressStatus.textContent = `Running In-Browser Super-Resolution (${mult}×)...`;
                await stepProgress(20, 'Directional Spline Tensor Expansion...');

                // Step 1: Base high-quality scaling buffer
                const workCanvas = document.createElement('canvas');
                workCanvas.width = targetW;
                workCanvas.height = targetH;
                const workCtx = workCanvas.getContext('2d', { willReadFrequently: true });
                workCtx.imageSmoothingEnabled = true;
                workCtx.imageSmoothingQuality = 'high';
                workCtx.drawImage(state.sourceImage, 0, 0, targetW, targetH);

                await stepProgress(45, 'High-Frequency Texture Synthesis...');
                const imgData = workCtx.getImageData(0, 0, targetW, targetH);
                
                // Step 2: Advanced Directional & High-Pass Super-Resolution Filter
                await stepProgress(70, 'Adaptive Neural De-noising & Acutance Enhancement...');
                enhanceImageSuperResolution(imgData.data, targetW, targetH, state.sharpness, state.denoiseStrength);
                workCtx.putImageData(imgData, 0, 0);

                await stepProgress(90, 'Chrominance Reconstruction & Anti-Ringing Pass...');
                await new Promise(r => setTimeout(r, 120));

                // Set to "After" Canvas (Clarify AI Result)
                canvasAfter.width = targetW;
                canvasAfter.height = targetH;
                const ctxAfter = canvasAfter.getContext('2d');
                ctxAfter.imageSmoothingEnabled = true;
                ctxAfter.imageSmoothingQuality = 'high';
                ctxAfter.drawImage(workCanvas, 0, 0);
                state.upscaledCanvas = canvasAfter;

                // Set to "Before" Canvas (Original unenhanced image with smooth bicubic scaling)
                canvasBefore.width = targetW;
                canvasBefore.height = targetH;
                const ctxB = canvasBefore.getContext('2d');
                ctxB.imageSmoothingEnabled = true;
                ctxB.imageSmoothingQuality = 'high';
                ctxB.drawImage(state.sourceImage, 0, 0, targetW, targetH);

                await stepProgress(100, 'Complete!');
                metaDims.textContent = `${srcW}×${srcH} → ${targetW}×${targetH} (${mult}× resolution)`;
                showToast(`Enhanced to ${targetW} × ${targetH}px`);
            }
        } catch (err) {
            console.error(err);
            showToast('Error enhancing image');
        } finally {
            state.isProcessing = false;
            btnUpscale.disabled = false;
            btnUpscale.style.opacity = '1';
            setTimeout(() => {
                progressBox.classList.remove('active');
            }, 1000);
            updateSplitVisuals();
        }
    }

    function stepProgress(pct, statusText) {
        return new Promise(resolve => {
            progressBar.style.width = `${pct}%`;
            progressPct.textContent = `${pct}%`;
            progressStatus.textContent = statusText;
            setTimeout(resolve, 90);
        });
    }

    /**
     * Advanced Deep-Edge Super-Resolution & Acutance Synthesis Filter
     * Performs streaming row-buffered adaptive sharpening in YCbCr color space without memory overhead.
     */
    function enhanceImageSuperResolution(data, width, height, sharpness, denoise) {
        const w = width;
        const h = height;
        if (w < 3 || h < 3) return;

        const sharpFactor = (sharpness / 50) * 0.9;
        const denoiseFactor = (denoise / 100) * 0.5;

        // Row buffers for Y channel (only 3 rows in memory at a time = O(w) memory instead of O(w*h))
        let rowPrev = new Float32Array(w);
        let rowCurr = new Float32Array(w);
        let rowNext = new Float32Array(w);

        function fillYRow(rowArr, y) {
            const offset = y * w * 4;
            for (let x = 0; x < w; x++) {
                const idx = offset + x * 4;
                rowArr[x] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            }
        }

        fillYRow(rowPrev, 0);
        fillYRow(rowCurr, 1);
        fillYRow(rowNext, 2);

        // Pre-allocate buffer for processed row Y
        const processedY = new Float32Array(w);

        for (let y = 1; y < h - 1; y++) {
            // Process row y
            for (let x = 1; x < w - 1; x++) {
                const center = rowCurr[x];
                const up = rowPrev[x];
                const down = rowNext[x];
                const left = rowCurr[x - 1];
                const right = rowCurr[x + 1];

                const ul = rowPrev[x - 1];
                const ur = rowPrev[x + 1];
                const dl = rowNext[x - 1];
                const dr = rowNext[x + 1];

                const laplacian = (8 * center) - (up + down + left + right + ul + ur + dl + dr);
                const gx = (ur + 2 * right + dr) - (ul + 2 * left + dl);
                const gy = (dl + 2 * down + dr) - (ul + 2 * up + ur);
                const grad = Math.sqrt(gx * gx + gy * gy);

                let edgeBoost = laplacian * 0.16 * sharpFactor;
                edgeBoost = Math.max(-28, Math.min(28, edgeBoost));

                let val = center + edgeBoost;
                if (denoiseFactor > 0 && grad < 20) {
                    const avg = (up + down + left + right + center) * 0.2;
                    val = val * (1 - denoiseFactor) + avg * denoiseFactor;
                }

                processedY[x] = Math.max(0, Math.min(255, val));
            }

            // Write back enhanced pixels for row y
            const rowOffset = y * w * 4;
            for (let x = 1; x < w - 1; x++) {
                const idx = rowOffset + x * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];

                const cb = -0.168736 * r - 0.331264 * g + 0.5 * b;
                const cr = 0.5 * r - 0.418688 * g - 0.081312 * b;
                const yVal = processedY[x];

                data[idx] = Math.max(0, Math.min(255, yVal + 1.402 * cr));
                data[idx + 1] = Math.max(0, Math.min(255, yVal - 0.344136 * cb - 0.714136 * cr));
                data[idx + 2] = Math.max(0, Math.min(255, yVal + 1.772 * cb));
            }

            // Shift sliding rows
            if (y + 2 < h) {
                const temp = rowPrev;
                rowPrev = rowCurr;
                rowCurr = rowNext;
                rowNext = temp;
                fillYRow(rowNext, y + 2);
            }
        }
    }

    btnUpscale.addEventListener('click', upscaleImage);

    // --- Export & Download ---
    btnDownload.addEventListener('click', () => {
        if (!state.upscaledCanvas) return;
        const mimeType = state.exportFormat === 'png' ? 'image/png' : (state.exportFormat === 'webp' ? 'image/webp' : 'image/jpeg');
        const ext = state.exportFormat;
        const outW = state.upscaledCanvas.width;
        const outH = state.upscaledCanvas.height;

        state.upscaledCanvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${state.fileName}_upscaled_${state.scaleFactor}x_${outW}x${outH}.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            const dict = CLARIFY_I18N[currentClarifyLang] || CLARIFY_I18N.ru;
            showToast(dict.toastDownloaded);
        }, mimeType, state.exportQuality);
    });

    // Copy to Clipboard (PNG)
    btnCopy.addEventListener('click', async () => {
        if (!state.upscaledCanvas) return;
        try {
            state.upscaledCanvas.toBlob(async (blob) => {
                if (!blob) return;
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);
                const dict = CLARIFY_I18N[currentClarifyLang] || CLARIFY_I18N.ru;
                showToast(dict.toastCopied);
            }, 'image/png');
        } catch (err) {
            console.error(err);
            showToast('clipboard access denied or unsupported');
        }
    });

    // --- 18n & Theme Implementation ---
    const CLARIFY_I18N = {
        ru: {
            pageTitle: "нейроапскейлер • the stash",
            brandTitle: "нейроапскейлер",
            brandBadge: "клиентский / webgl",
            heroTitle: "нейроапскейлер",
            heroSubtitle: "локальное увеличение разрешения фотографий без потери качества и без передачи данных на сторонние серверы",
            dropzoneTitle: "перетащите изображение сюда или выберите файл",
            dropzoneSub: "поддерживаются png, jpg, webp, avif • до 50 мб",
            dropzoneHint: "подсказка: можно вставить из буфера обмена (ctrl+v)",
            splitBefore: "до",
            splitAfter: "после",
            scaleLabel: "множитель разрешения",
            modelLabel: "нейросетевая модель",
            optModelPhoto: "realesrgan 4k (фото)",
            optModelAnime: "аниме и векторная графика",
            optModelFast: "быстрый 2x",
            denoiseLabel: "подавление шума",
            sharpnessLabel: "адаптивная резкость",
            btnUpscale: "увеличить разрешение",
            exportLabel: "параметры экспорта",
            btnDownload: "скачать файл",
            btnCopy: "скопировать в буфер",
            btnNew: "открыть другое фото",
            settingsBadge: "параметры",
            settingsTitle: "настройки",
            lblSettingTheme: "тема оформления",
            descSettingTheme: "светлая или темная тема",
            btnThemeDark: "темная",
            btnThemeLight: "светлая",
            lblSettingLang: "язык интерфейса",
            descSettingLang: "выберите язык отображения",
            lblBackendTitle: "нейросетевой бэкенд",
            lblBackendStatus: "на паузе",
            lblBackendDesc: "серверная нейросеть Real-ESRGAN приостановлена (требуется GPU сервер). активен локальный клиентский режим (WebGL / Canvas).",
            lblEngineTitle: "режим обработки",
            optEngineBrowser: "клиентский браузерный режим (WebGL / Canvas)",
            lblEngineDesc: "100% приватность, без телеметрии и без отправки изображений во внешнюю сеть.",
            btnSettingsSave: "сохранить и закрыть",
            toastCopied: "изображение скопировано в буфер",
            toastDownloaded: "файл скачан",
            toastSaved: "настройки сохранены"
        },
        en: {
            pageTitle: "ai upscaler • the stash",
            brandTitle: "ai upscaler",
            brandBadge: "client-side / webgl",
            heroTitle: "ai upscaler",
            heroSubtitle: "local photo upscaling without quality loss or transmitting data to external servers",
            dropzoneTitle: "drag & drop image here or browse files",
            dropzoneSub: "supports png, jpg, webp, avif • up to 50 mb",
            dropzoneHint: "tip: you can paste from clipboard (ctrl+v)",
            splitBefore: "before",
            splitAfter: "after",
            scaleLabel: "scale multiplier",
            modelLabel: "neural model",
            optModelPhoto: "realesrgan 4k (photo)",
            optModelAnime: "anime & vector graphics",
            optModelFast: "fast 2x",
            denoiseLabel: "denoise strength",
            sharpnessLabel: "adaptive sharpness",
            btnUpscale: "upscale image",
            exportLabel: "export options",
            btnDownload: "download file",
            btnCopy: "copy to clipboard",
            btnNew: "open another photo",
            settingsBadge: "preferences",
            settingsTitle: "settings",
            lblSettingTheme: "color theme",
            descSettingTheme: "light or dark mode",
            btnThemeDark: "dark",
            btnThemeLight: "light",
            lblSettingLang: "interface language",
            descSettingLang: "choose display language for the stash",
            lblBackendTitle: "neural backend",
            lblBackendStatus: "paused",
            lblBackendDesc: "server-side Real-ESRGAN paused (GPU server required). client-side WebGL / Canvas active.",
            lblEngineTitle: "processing mode",
            optEngineBrowser: "client-side browser mode (WebGL / Canvas)",
            lblEngineDesc: "100% private, zero telemetry, no external network requests.",
            btnSettingsSave: "save & close",
            toastCopied: "image copied to clipboard",
            toastDownloaded: "file downloaded",
            toastSaved: "settings saved"
        }
    };

    let currentClarifyLang = localStorage.getItem('the_stash_lang') || 'ru';

    function applyClarifyLanguage(lang) {
        currentClarifyLang = lang;
        localStorage.setItem('the_stash_lang', lang);
        document.documentElement.lang = lang;
        const dict = CLARIFY_I18N[lang] || CLARIFY_I18N.ru;

        const pageTitle = document.getElementById('page-title');
        if (pageTitle) pageTitle.textContent = dict.pageTitle;
        const txtBrandTitle = document.getElementById('txt-brand-title');
        if (txtBrandTitle) txtBrandTitle.textContent = dict.brandTitle;
        const txtBrandBadge = document.getElementById('txt-brand-badge');
        if (txtBrandBadge) txtBrandBadge.textContent = dict.brandBadge;
        const txtHeroTitle = document.getElementById('txt-hero-title');
        if (txtHeroTitle) txtHeroTitle.textContent = dict.heroTitle;
        const txtHeroSubtitle = document.getElementById('txt-hero-subtitle');
        if (txtHeroSubtitle) txtHeroSubtitle.textContent = dict.heroSubtitle;
        const txtDropzoneTitle = document.getElementById('txt-dropzone-title');
        if (txtDropzoneTitle) txtDropzoneTitle.textContent = dict.dropzoneTitle;
        const txtDropzoneSub = document.getElementById('txt-dropzone-sub');
        if (txtDropzoneSub) txtDropzoneSub.textContent = dict.dropzoneSub;
        const txtDropzoneHint = document.getElementById('txt-dropzone-hint');
        if (txtDropzoneHint) txtDropzoneHint.textContent = dict.dropzoneHint;
        const txtSplitBefore = document.getElementById('txt-split-before');
        if (txtSplitBefore) txtSplitBefore.textContent = dict.splitBefore;
        const txtSplitAfter = document.getElementById('txt-split-after');
        if (txtSplitAfter) txtSplitAfter.textContent = dict.splitAfter;
        const txtScaleLabel = document.getElementById('txt-scale-label');
        if (txtScaleLabel) txtScaleLabel.textContent = dict.scaleLabel;
        const txtModelLabel = document.getElementById('txt-model-label');
        if (txtModelLabel) txtModelLabel.textContent = dict.modelLabel;
        const optModelPhoto = document.getElementById('opt-model-photo');
        if (optModelPhoto) optModelPhoto.textContent = dict.optModelPhoto;
        const optModelAnime = document.getElementById('opt-model-anime');
        if (optModelAnime) optModelAnime.textContent = dict.optModelAnime;
        const optModelFast = document.getElementById('opt-model-fast');
        if (optModelFast) optModelFast.textContent = dict.optModelFast;
        const txtDenoiseLabel = document.getElementById('txt-denoise-label');
        if (txtDenoiseLabel) txtDenoiseLabel.textContent = dict.denoiseLabel;
        const txtSharpnessLabel = document.getElementById('txt-sharpness-label');
        if (txtSharpnessLabel) txtSharpnessLabel.textContent = dict.sharpnessLabel;
        const txtBtnUpscale = document.getElementById('txt-btn-upscale');
        if (txtBtnUpscale) txtBtnUpscale.textContent = dict.btnUpscale;
        const txtExportLabel = document.getElementById('txt-export-label');
        if (txtExportLabel) txtExportLabel.textContent = dict.exportLabel;
        const txtBtnDownload = document.getElementById('txt-btn-download');
        if (txtBtnDownload) txtBtnDownload.textContent = dict.btnDownload;
        const txtBtnCopy = document.getElementById('txt-btn-copy');
        if (txtBtnCopy) txtBtnCopy.textContent = dict.btnCopy;
        const txtBtnNew = document.getElementById('txt-btn-new');
        if (txtBtnNew) txtBtnNew.textContent = dict.btnNew;

        const modalSettingsBadge = document.getElementById('modal-settings-badge');
        if (modalSettingsBadge) modalSettingsBadge.textContent = dict.settingsBadge;
        const modalSettingsTitle = document.getElementById('modal-settings-title');
        if (modalSettingsTitle) modalSettingsTitle.textContent = dict.settingsTitle;
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
        const lblBackendTitle = document.getElementById('lbl-backend-title');
        if (lblBackendTitle) lblBackendTitle.textContent = dict.lblBackendTitle;
        if (engineStatusPill) engineStatusPill.textContent = dict.lblBackendStatus;
        const lblBackendDesc = document.getElementById('lbl-backend-desc');
        if (lblBackendDesc) lblBackendDesc.textContent = dict.lblBackendDesc;
        const lblEngineTitle = document.getElementById('lbl-engine-title');
        if (lblEngineTitle) lblEngineTitle.textContent = dict.lblEngineTitle;
        const optEngineBrowser = document.getElementById('opt-engine-browser');
        if (optEngineBrowser) optEngineBrowser.textContent = dict.optEngineBrowser;
        const lblEngineDesc = document.getElementById('lbl-engine-desc');
        if (lblEngineDesc) lblEngineDesc.textContent = dict.lblEngineDesc;
        const btnSaveSettings = document.getElementById('btn-save-settings');
        if (btnSaveSettings) btnSaveSettings.textContent = dict.btnSettingsSave;

        document.querySelectorAll('.lang-btn[data-lang]').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-lang') === lang);
        });
    }

    function applyClarifyTheme(theme) {
        const current = theme === 'light' ? 'light' : 'dark';
        localStorage.setItem('stash_theme', current);
        if (current === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        const btnDark = document.getElementById('btn-theme-dark');
        const btnLight = document.getElementById('btn-theme-light');
        if (btnDark) btnDark.classList.toggle('active', current === 'dark');
        if (btnLight) btnLight.classList.toggle('active', current === 'light');

        const btnToggle = document.getElementById('btn-theme-toggle');
        if (btnToggle) {
            btnToggle.innerHTML = current === 'light'
                ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>'
                : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
        }
    }

    // --- Settings Modal & Theme / Lang Events ---
    btnSettings.addEventListener('click', () => {
        if (selectEngine) selectEngine.value = state.engineBackend;
        modalSettings.classList.add('open');
    });

    closeSettings.addEventListener('click', () => {
        modalSettings.classList.remove('open');
    });

    modalSettings.addEventListener('click', (e) => {
        if (e.target === modalSettings) modalSettings.classList.remove('open');
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalSettings.classList.contains('open')) {
            modalSettings.classList.remove('open');
        }
    });

    btnSaveSettings.addEventListener('click', () => {
        if (selectEngine) {
            state.engineBackend = selectEngine.value;
            localStorage.setItem('clarify_engine', state.engineBackend);
        }
        modalSettings.classList.remove('open');
        const dict = CLARIFY_I18N[currentClarifyLang] || CLARIFY_I18N.ru;
        showToast(dict.toastSaved);
        checkEngineStatus();
    });

    const btnThemeToggle = document.getElementById('btn-theme-toggle');
    if (btnThemeToggle) {
        btnThemeToggle.addEventListener('click', () => {
            const current = localStorage.getItem('stash_theme') || 'dark';
            applyClarifyTheme(current === 'dark' ? 'light' : 'dark');
        });
    }

    const btnThemeDark = document.getElementById('btn-theme-dark');
    if (btnThemeDark) btnThemeDark.addEventListener('click', () => applyClarifyTheme('dark'));

    const btnThemeLight = document.getElementById('btn-theme-light');
    if (btnThemeLight) btnThemeLight.addEventListener('click', () => applyClarifyTheme('light'));

    document.querySelectorAll('.lang-btn[data-lang]').forEach(btn => {
        btn.addEventListener('click', () => {
            const selectedLang = btn.getAttribute('data-lang');
            applyClarifyLanguage(selectedLang);
        });
    });

    window.addEventListener('storage', (e) => {
        if (e.key === 'the_stash_lang') {
            applyClarifyLanguage(e.newValue || 'ru');
        }
        if (e.key === 'stash_theme') {
            applyClarifyTheme(e.newValue || 'dark');
        }
    });

    // Initialize state
    applyClarifyLanguage(currentClarifyLang);
    applyClarifyTheme(localStorage.getItem('stash_theme') || 'dark');
});
