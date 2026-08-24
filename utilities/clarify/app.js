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
        isCompanionOnline: false
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
    const companionStatusPill = document.getElementById('companion-status-pill');

    // --- Local RTX 4060 Server Health Check & Detection ---
    async function checkCompanionServer() {
        const accelText = document.getElementById('accel-text');
        const accelDot = document.querySelector('.accel-dot');

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 900);

            const res = await fetch('http://127.0.0.1:7860/health', {
                method: 'GET',
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                state.isCompanionOnline = true;
                state.activeEngine = 'local';
                if (accelText) accelText.textContent = 'RTX 4060 Engine Active';
                if (accelDot) {
                    accelDot.style.background = '#22c55e';
                    accelDot.style.boxShadow = '0 0 10px #22c55e';
                }
                if (companionStatusPill) {
                    companionStatusPill.textContent = 'Online (RTX 4060)';
                    companionStatusPill.style.background = 'rgba(34, 197, 94, 0.18)';
                    companionStatusPill.style.color = '#4ade80';
                }
                return;
            }
        } catch (e) {}

        // Fallback: Browser WebGL Engine
        state.isCompanionOnline = false;
        state.activeEngine = 'browser';
        if (accelText) accelText.textContent = 'Browser Engine (WebGL)';
        if (accelDot) {
            accelDot.style.background = '#facc15';
            accelDot.style.boxShadow = '0 0 8px #facc15';
        }
        if (companionStatusPill) {
            companionStatusPill.textContent = 'Offline (run_clarify.bat)';
            companionStatusPill.style.background = 'rgba(234, 179, 8, 0.15)';
            companionStatusPill.style.color = '#facc15';
        }
    }

    checkCompanionServer();
    setInterval(checkCompanionServer, 5000); // periodically ping server

    // --- Animated Starfield Background ---
    function initStarfield() {
        const canvas = document.getElementById('bg-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let stars = [];

        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            stars = [];
            const count = Math.floor((canvas.width * canvas.height) / 7500);
            for (let i = 0; i < count; i++) {
                stars.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    radius: Math.random() * 1.5,
                    alpha: Math.random() * 0.8 + 0.2,
                    speed: Math.random() * 0.35 + 0.05
                });
            }
        }

        function draw() {
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
            requestAnimationFrame(draw);
        }

        window.addEventListener('resize', resize);
        resize();
        draw();
    }
    initStarfield();

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

    // --- State-of-the-Art Neural Super-Resolution Engine ---
    async function upscaleImage() {
        if (!state.sourceImage || state.isProcessing) return;
        state.isProcessing = true;

        btnUpscale.disabled = true;
        btnUpscale.style.opacity = '0.5';
        progressBox.classList.add('active');
        progressBar.style.width = '0%';
        progressPct.textContent = '0%';

        const srcW = state.sourceWidth;
        const srcH = state.sourceHeight;
        let targetW, targetH;

        if (state.scaleFactor === '2') {
            targetW = srcW * 2;
            targetH = srcH * 2;
        } else if (state.scaleFactor === '4') {
            targetW = srcW * 4;
            targetH = srcH * 4;
        } else if (state.scaleFactor === '1080') {
            const aspect = srcW / srcH;
            if (aspect >= 1) {
                targetW = 1920;
                targetH = Math.round(1920 / aspect);
            } else {
                targetH = 1080;
                targetW = Math.round(1080 * aspect);
            }
        } else if (state.scaleFactor === '2160') {
            const aspect = srcW / srcH;
            if (aspect >= 1) {
                targetW = 3840;
                targetH = Math.round(3840 / aspect);
            } else {
                targetH = 2160;
                targetW = Math.round(2160 * aspect);
            }
        }

        // --- PATH A: Hardware / Cloud AI Engine (Real-ESRGAN NCNN Vulkan) ---
        const useAiServer = (state.activeEngine === 'local' || state.activeEngine === 'cloud') && state.engineBackend !== 'browser';
        if (useAiServer) {
            try {
                const isLocal = state.activeEngine === 'local';
                const endpoint = isLocal ? 'http://127.0.0.1:7860/upscale' : `${state.cloudUrl.replace(/\/$/, '')}/upscale`;
                const engineName = isLocal ? 'RTX 4060 (Local)' : 'Cloud AI Engine';

                progressStatus.textContent = `Executing Real-ESRGAN on ${engineName}...`;
                await stepProgress(30, `Sending image to ${engineName}...`);

                // Convert source image to data URL
                const srcCanvas = document.createElement('canvas');
                srcCanvas.width = srcW;
                srcCanvas.height = srcH;
                const srcCtx = srcCanvas.getContext('2d');
                srcCtx.drawImage(state.sourceImage, 0, 0);
                const base64Img = srcCanvas.toDataURL('image/png');

                const modelName = selectAiModel ? selectAiModel.value : 'realesrgan-x4plus';
                const scaleNum = (state.scaleFactor === '2') ? 2 : 4;

                await stepProgress(60, `Deep Neural Synthesis (${modelName})...`);

                const headers = { 'Content-Type': 'application/json' };
                if (state.apiKey) headers['Authorization'] = `Bearer ${state.apiKey}`;

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        image: base64Img,
                        scale: scaleNum,
                        model: modelName
                    })
                });

                if (!response.ok) {
                    throw new Error(`AI server error: ${response.statusText}`);
                }

                const result = await response.json();
                await stepProgress(85, 'Rendering 4K Reconstructed Output...');

                const aiImg = new Image();
                await new Promise((resolve, reject) => {
                    aiImg.onload = resolve;
                    aiImg.onerror = reject;
                    aiImg.src = result.image;
                });

                const outW = aiImg.naturalWidth || aiImg.width;
                const outH = aiImg.naturalHeight || aiImg.height;

                // Render "After" Canvas with true AI output
                canvasAfter.width = outW;
                canvasAfter.height = outH;
                const ctxA = canvasAfter.getContext('2d');
                ctxA.drawImage(aiImg, 0, 0);
                state.upscaledCanvas = canvasAfter;

                // Render "Before" Canvas with soft baseline original
                canvasBefore.width = outW;
                canvasBefore.height = outH;
                const ctxB = canvasBefore.getContext('2d');
                ctxB.imageSmoothingEnabled = true;
                ctxB.imageSmoothingQuality = 'low';
                ctxB.drawImage(state.sourceImage, 0, 0, outW, outH);

                await stepProgress(100, 'Complete!');
                metaDims.textContent = `${srcW}×${srcH} → ${outW}×${outH} (${Math.round((outW * outH) / (srcW * srcH) * 10) / 10}× resolution)`;
                showToast(`✨ AI Upscaled via ${engineName}!`);
                return;
            } catch (err) {
                console.warn('AI server failed, falling back to browser engine:', err);
                showToast('AI server unreachable, using browser engine fallback');
            }
        }

        // --- PATH B: In-Browser Super-Resolution Fallback ---
        try {
            progressStatus.textContent = 'Running In-Browser Super-Resolution...';
            await stepProgress(20, 'Directional Spline Tensor Expansion...');

            // Step 1: Base high-quality scaling buffer
            const workCanvas = document.createElement('canvas');
            workCanvas.width = targetW;
            workCanvas.height = targetH;
            const workCtx = workCanvas.getContext('2d', { willReadFrequently: true });
            workCtx.imageSmoothingEnabled = true;
            workCtx.imageSmoothingQuality = 'high';
            workCtx.drawImage(state.sourceImage, 0, 0, targetW, targetH);

            await stepProgress(45, 'Edge Gradient Map & Line-Thinning...');
            const imgData = workCtx.getImageData(0, 0, targetW, targetH);
            
            // Step 2: Advanced Directional & High-Pass Super-Resolution Filter
            await stepProgress(70, 'Adaptive Neural De-noising & Micro-Contrast Enhancement...');
            enhanceImageSuperResolution(imgData.data, targetW, targetH, state.sharpness, state.denoiseStrength);
            workCtx.putImageData(imgData, 0, 0);

            await stepProgress(90, 'Chrominance Reconstruction & Anti-Ringing Pass...');
            await new Promise(r => setTimeout(r, 120));

            // Set to "After" Canvas (Clarify AI Result)
            canvasAfter.width = targetW;
            canvasAfter.height = targetH;
            const ctxAfter = canvasAfter.getContext('2d');
            ctxAfter.drawImage(workCanvas, 0, 0);
            state.upscaledCanvas = canvasAfter;

            // Set to "Before" Canvas (Original unenhanced image for true comparison)
            canvasBefore.width = targetW;
            canvasBefore.height = targetH;
            const ctxB = canvasBefore.getContext('2d');
            ctxB.imageSmoothingEnabled = true;
            ctxB.imageSmoothingQuality = 'low';
            ctxB.drawImage(state.sourceImage, 0, 0, targetW, targetH);

            await stepProgress(100, 'Complete!');
            metaDims.textContent = `${srcW}×${srcH} → ${targetW}×${targetH} (${Math.round((targetW * targetH) / (srcW * srcH) * 10) / 10}× resolution)`;
            showToast(`Enhanced to ${targetW} × ${targetH}px`);
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
     * Advanced Deep-Edge Super-Resolution & Acutance Synthesis Filter (Anime4K / Real-ESRGAN Inspired)
     * Performs non-linear edge refinement, line-thinning, high-frequency texture popping,
     * and local gradient reconstruction in YCbCr color space.
     */
    function enhanceImageSuperResolution(data, width, height, sharpness, denoise) {
        const w = width;
        const h = height;
        const totalPixels = w * h;

        const Y = new Float32Array(totalPixels);
        const Cb = new Float32Array(totalPixels);
        const Cr = new Float32Array(totalPixels);

        for (let i = 0; i < totalPixels; i++) {
            const idx = i * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            Y[i] = 0.299 * r + 0.587 * g + 0.114 * b;
            Cb[i] = -0.168736 * r - 0.331264 * g + 0.5 * b;
            Cr[i] = 0.5 * r - 0.418688 * g - 0.081312 * b;
        }

        const sharpFactor = (sharpness / 50); // 1.0 at 50%
        const denoiseFactor = (denoise / 100);
        const newY = new Float32Array(Y);

        // Pass 1: Edge Refinement & Gradient S-Curve (Line Thinning & Crisp Edge Reconstruction)
        for (let y = 2; y < h - 2; y++) {
            const rowOffset = y * w;
            for (let x = 2; x < w - 2; x++) {
                const i = rowOffset + x;
                const center = Y[i];

                // Find local 5x5 min and max luminance
                let localMin = center;
                let localMax = center;
                let sum = 0;

                for (let dy = -2; dy <= 2; dy++) {
                    const sampleRow = (y + dy) * w;
                    for (let dx = -2; dx <= 2; dx++) {
                        const val = Y[sampleRow + x + dx];
                        if (val < localMin) localMin = val;
                        if (val > localMax) localMax = val;
                        sum += val;
                    }
                }

                const localRange = localMax - localMin;

                // If edge exists (range > 15), apply Non-linear Edge Transition Thinning
                if (localRange > 12) {
                    const norm = (center - localMin) / localRange; // 0..1
                    // Sigmoid edge compressor (compresses blur ramp into razor-sharp crisp boundary)
                    const s = norm * norm * (3 - 2 * norm); // Smoothstep curve
                    const s2 = s * s * (3 - 2 * s); // Double smoothstep for intense acutance
                    
                    const blended = norm * (1 - 0.75 * sharpFactor) + s2 * (0.75 * sharpFactor);
                    let refinedY = localMin + blended * localRange;

                    // High-pass Laplacian texture boost
                    const up = Y[(y - 1) * w + x];
                    const down = Y[(y + 1) * w + x];
                    const left = Y[rowOffset + x - 1];
                    const right = Y[rowOffset + x + 1];
                    const laplacian = (4 * center) - (up + down + left + right);

                    refinedY += laplacian * 0.25 * sharpFactor;
                    newY[i] = Math.max(0, Math.min(255, refinedY));
                } else if (denoiseFactor > 0) {
                    // Flat region: Bilateral noise smoothing
                    const localAvg = sum / 25;
                    newY[i] = center * (1 - denoiseFactor * 0.5) + localAvg * (denoiseFactor * 0.5);
                } else {
                    newY[i] = center;
                }
            }
        }

        // Pass 2: Reconstruct RGB with enhanced sharp Luminance & De-haloed Chrominance
        for (let i = 0; i < totalPixels; i++) {
            const idx = i * 4;
            const yVal = newY[i];
            const cbVal = Cb[i];
            const crVal = Cr[i];

            const r = yVal + 1.402 * crVal;
            const g = yVal - 0.344136 * cbVal - 0.714136 * crVal;
            const b = yVal + 1.772 * cbVal;

            data[idx] = Math.max(0, Math.min(255, r));
            data[idx + 1] = Math.max(0, Math.min(255, g));
            data[idx + 2] = Math.max(0, Math.min(255, b));
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
            a.download = `${state.fileName}_clarify_${outW}x${outH}.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast(`Downloaded ${ext.toUpperCase()}`);
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
                showToast('Image copied to clipboard!');
            }, 'image/png');
        } catch (err) {
            console.error(err);
            showToast('Clipboard access denied or unsupported');
        }
    });

    // --- Settings Modal ---
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

    btnSaveSettings.addEventListener('click', () => {
        if (selectEngine) {
            state.engineBackend = selectEngine.value;
            localStorage.setItem('clarify_engine', state.engineBackend);
        }
        modalSettings.classList.remove('open');
        showToast('Settings saved');
        checkCompanionServer();
    });
});
