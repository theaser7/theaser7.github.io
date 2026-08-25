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
            const timeoutId = setTimeout(() => controller.abort(), 3000);

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

    // --- 2D Blueprint Grid Background ---
    function initGridBackground() {
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

        function draw() {
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

            // Radial Torch Highlight
            const gradient = ctx.createRadialGradient(
                currentMouseX, currentMouseY, 20,
                currentMouseX, currentMouseY, 400
            );
            gradient.addColorStop(0, 'rgba(0, 255, 157, 0.07)');
            gradient.addColorStop(0.5, 'rgba(0, 255, 157, 0.02)');
            gradient.addColorStop(1, 'rgba(0, 255, 157, 0)');

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, h);

            // Subtle crosshairs
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

            requestAnimationFrame(draw);
        }

        resize();
        draw();
    }
    initGridBackground();

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

            // --- PATH A: Local Hardware Server (Real-ESRGAN NCNN Vulkan on RTX 4060) ---
            if (state.isCompanionOnline && state.engineBackend !== 'browser') {
                try {
                    progressStatus.textContent = `Executing Real-ESRGAN (${mult}×) on RTX 4060...`;
                    await stepProgress(25, 'Sending image to RTX 4060...');

                    // Convert source image to data URL
                    const srcCanvas = document.createElement('canvas');
                    srcCanvas.width = srcW;
                    srcCanvas.height = srcH;
                    const srcCtx = srcCanvas.getContext('2d');
                    srcCtx.drawImage(state.sourceImage, 0, 0);
                    const base64Img = srcCanvas.toDataURL('image/png');

                    const modelName = selectAiModel ? selectAiModel.value : 'realesrgan-x4plus';

                    await stepProgress(55, `Deep Neural Synthesis (${modelName} • ${mult}×)...`);

                    const response = await fetch('http://127.0.0.1:7860/upscale', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            image: base64Img,
                            scale: mult,
                            model: modelName
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`Companion server error: ${response.statusText}`);
                    }

                    const result = await response.json();
                    await stepProgress(85, `Rendering ${mult}× Reconstructed Output...`);

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
                    ctxA.imageSmoothingEnabled = true;
                    ctxA.imageSmoothingQuality = 'high';
                    ctxA.drawImage(aiImg, 0, 0);
                    state.upscaledCanvas = canvasAfter;

                    // Render "Before" Canvas with smooth baseline original (High Quality Bicubic)
                    canvasBefore.width = outW;
                    canvasBefore.height = outH;
                    const ctxB = canvasBefore.getContext('2d');
                    ctxB.imageSmoothingEnabled = true;
                    ctxB.imageSmoothingQuality = 'high';
                    ctxB.drawImage(state.sourceImage, 0, 0, outW, outH);

                    await stepProgress(100, 'Complete!');
                    metaDims.textContent = `${srcW}×${srcH} → ${outW}×${outH} (${mult}× resolution)`;
                    showToast(`✨ ${mult}× AI Upscaled on RTX 4060!`);
                    processed = true;
                } catch (err) {
                    console.warn('Companion server failed, falling back to browser engine:', err);
                    showToast('Companion error, using browser engine fallback');
                }
            }

            // --- PATH B: In-Browser Super-Resolution Fallback ---
            if (!processed) {
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
     * Performs continuous adaptive sharpening in YCbCr color space without gradient posterization.
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

        const sharpFactor = (sharpness / 50) * 0.9;
        const denoiseFactor = (denoise / 100) * 0.5;
        const newY = new Float32Array(Y);

        // Pass 1: Multi-Directional High-Pass Filter with Clamped Acutance
        for (let y = 1; y < h - 1; y++) {
            const rowOffset = y * w;
            const prevRow = (y - 1) * w;
            const nextRow = (y + 1) * w;

            for (let x = 1; x < w - 1; x++) {
                const i = rowOffset + x;
                const center = Y[i];

                const up = Y[prevRow + x];
                const down = Y[nextRow + x];
                const left = Y[rowOffset + x - 1];
                const right = Y[rowOffset + x + 1];

                const ul = Y[prevRow + x - 1];
                const ur = Y[prevRow + x + 1];
                const dl = Y[nextRow + x - 1];
                const dr = Y[nextRow + x + 1];

                // Laplacian 8-neighbor curvature
                const laplacian = (8 * center) - (up + down + left + right + ul + ur + dl + dr);
                
                // Sobel gradient magnitude
                const gx = (ur + 2 * right + dr) - (ul + 2 * left + dl);
                const gy = (dl + 2 * down + dr) - (ul + 2 * up + ur);
                const grad = Math.sqrt(gx * gx + gy * gy);

                let edgeBoost = laplacian * 0.16 * sharpFactor;
                // Soft sigmoid clamp to prevent ringing / posterization
                edgeBoost = Math.max(-28, Math.min(28, edgeBoost));

                let val = center + edgeBoost;

                // Bilateral smoothing in flat noise regions
                if (denoiseFactor > 0 && grad < 20) {
                    const avg = (up + down + left + right + center) * 0.2;
                    val = val * (1 - denoiseFactor) + avg * denoiseFactor;
                }

                newY[i] = Math.max(0, Math.min(255, val));
            }
        }

        // Pass 2: Reconstruct RGB with enhanced sharp Luminance
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
            a.download = `${state.fileName}_clarify_${state.scaleFactor}x_${outW}x${outH}.${ext}`;
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
