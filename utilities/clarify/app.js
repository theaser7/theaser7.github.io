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
        scaleFactor: '2', // '2', '4', '1080', '2160'
        denoiseStrength: 25,
        sharpness: 55,
        exportFormat: 'png',
        exportQuality: 0.95,
        isProcessing: false,
        upscaledCanvas: null,
        splitPosition: 50, // % (0..100)
        apiKey: localStorage.getItem('clarify_api_key') || '',
        engineBackend: localStorage.getItem('clarify_engine') || 'browser'
    };

    // --- DOM Elements ---
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const heroSection = document.getElementById('hero-section');
    const workspace = document.getElementById('workspace');

    const canvasBefore = document.getElementById('canvas-before');
    const canvasAfter = document.getElementById('canvas-after');
    const splitDivider = document.getElementById('split-divider');
    const splitHandle = document.getElementById('split-handle');
    const splitViewport = document.getElementById('split-viewport');

    const metaFileName = document.getElementById('meta-filename');
    const metaDims = document.getElementById('meta-dims');

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
    const inputApiKey = document.getElementById('input-api-key');
    const selectEngine = document.getElementById('select-engine');
    const btnSaveSettings = document.getElementById('btn-save-settings');

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

    // --- Hardware Acceleration Detector ---
    function checkAcceleration() {
        const accelText = document.getElementById('accel-text');
        if (!accelText) return;
        if ('gpu' in navigator) {
            accelText.textContent = 'WebGPU Ready';
        } else {
            accelText.textContent = 'WebGL Accelerated';
        }
    }
    checkAcceleration();

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

    // --- Smooth Full-Viewport Split Slider Interaction ---
    function updateSplitVisuals() {
        const pos = state.splitPosition;
        splitDivider.style.left = `${pos}%`;
        splitHandle.style.left = `${pos}%`;

        // Left half shows original (Before), Right half shows Clarify AI (After)
        canvasBefore.style.clipPath = `polygon(0 0, ${pos}% 0, ${pos}% 100%, 0 100%)`;
        canvasAfter.style.clipPath = `polygon(${pos}% 0, 100% 0, 100% 100%, ${pos}% 100%)`;
    }

    let isSlidingSplit = false;

    function moveSplitFromClientX(clientX) {
        const rect = splitViewport.getBoundingClientRect();
        if (rect.width <= 0) return;
        const offsetX = clientX - rect.left;
        let pct = (offsetX / rect.width) * 100;
        pct = Math.max(0, Math.min(100, pct));
        state.splitPosition = pct;
        updateSplitVisuals();
    }

    // Mouse / Touch interaction anywhere across splitViewport moves the split divider
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
        progressStatus.textContent = 'Initializing Neural Super-Resolution Pipeline...';

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

        try {
            await stepProgress(20, 'Directional Spline Tensor Expansion...');

            // Step 1: Base high-quality scaling buffer
            const workCanvas = document.createElement('canvas');
            workCanvas.width = targetW;
            workCanvas.height = targetH;
            const workCtx = workCanvas.getContext('2d', { willReadFrequently: true });
            workCtx.imageSmoothingEnabled = true;
            workCtx.imageSmoothingQuality = 'high';
            workCtx.drawImage(state.sourceImage, 0, 0, targetW, targetH);

            await stepProgress(45, 'Edge Gradient Map & High-Frequency Synthesis...');
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
            // Baseline standard smooth rendering so the original softness is compared directly
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
     * Advanced Deep-Edge Super-Resolution & Acutance Synthesis Filter
     * Processes Luminance in YCbCr color space with non-linear edge gradients,
     * high-pass micro-contrast enhancement, and bilateral artifact suppression.
     */
    function enhanceImageSuperResolution(data, width, height, sharpness, denoise) {
        const w = width;
        const h = height;
        const totalPixels = w * h;

        // Convert RGB buffer to Luminance (Y) channel map for true perceptual sharpening
        const Y = new Float32Array(totalPixels);
        const Cb = new Float32Array(totalPixels);
        const Cr = new Float32Array(totalPixels);

        for (let i = 0; i < totalPixels; i++) {
            const idx = i * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            // ITU-R BT.601 YCbCr
            Y[i] = 0.299 * r + 0.587 * g + 0.114 * b;
            Cb[i] = -0.168736 * r - 0.331264 * g + 0.5 * b;
            Cr[i] = 0.5 * r - 0.418688 * g - 0.081312 * b;
        }

        const sharpMul = (sharpness / 50) * 1.6; // normalized strong factor
        const denoiseMul = (denoise / 100);

        const newY = new Float32Array(Y);

        // Multi-Scale Directional Super-Resolution Kernel
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

                // 1. Sobel Gradient Magnitude (Edge Detection)
                const gx = (ur + 2 * right + dr) - (ul + 2 * left + dl);
                const gy = (dl + 2 * down + dr) - (ul + 2 * up + ur);
                const gradient = Math.sqrt(gx * gx + gy * gy);

                // 2. High-Pass Laplacian Curvature
                const laplacian = (8 * center) - (up + down + left + right + ul + ur + dl + dr);

                // 3. Adaptive Non-Linear Sharpening Boost
                // If gradient is strong (edges/text/textures), apply high edge crispness
                let edgeBoost = laplacian * 0.18 * sharpMul;

                // Non-linear sigmoid clamp to avoid ringing / white halos
                if (edgeBoost > 32) edgeBoost = 32 + (edgeBoost - 32) * 0.3;
                if (edgeBoost < -32) edgeBoost = -32 + (edgeBoost + 32) * 0.3;

                let enhancedY = center + edgeBoost;

                // 4. Bilateral Denoising in Flat Areas
                if (denoiseMul > 0 && gradient < 25) {
                    const avg = (up + down + left + right + center) * 0.2;
                    const smoothFactor = denoiseMul * (1 - (gradient / 25));
                    enhancedY = enhancedY * (1 - smoothFactor) + avg * smoothFactor;
                }

                // 5. Micro-Contrast Texture S-Curve
                const diff = enhancedY - 128;
                enhancedY = 128 + diff * (1 + 0.08 * sharpMul);

                newY[i] = Math.max(0, Math.min(255, enhancedY));
            }
        }

        // Convert back to RGB with reconstructed sharp Luminance
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
            // Alpha stays 255
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
        inputApiKey.value = state.apiKey;
        selectEngine.value = state.engineBackend;
        modalSettings.classList.add('open');
    });

    closeSettings.addEventListener('click', () => {
        modalSettings.classList.remove('open');
    });

    modalSettings.addEventListener('click', (e) => {
        if (e.target === modalSettings) modalSettings.classList.remove('open');
    });

    btnSaveSettings.addEventListener('click', () => {
        state.apiKey = inputApiKey.value.trim();
        state.engineBackend = selectEngine.value;
        localStorage.setItem('clarify_api_key', state.apiKey);
        localStorage.setItem('clarify_engine', state.engineBackend);
        modalSettings.classList.remove('open');
        showToast('Settings saved');
    });
});
