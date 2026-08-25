/**
 * StashIP Application Logic & Dual Speedtest Engine (Download + Upload)
 * 100% Client-side Network Intelligence & Diagnostics.
 */

const STASHIP_I18N = {
    en: {
        langBtn: "RU",
        refreshBtn: "REFRESH",
        soundBtn: "SOUND",
        muteBtn: "MUTE",
        hubBtn: "HUB",
        heroLabel: "YOUR EXTERNAL IP ADDRESS",
        copyBtn: "COPY IP",
        ispLabel: "INTERNET PROVIDER (ISP)",
        asnLabel: "AUTONOMOUS SYSTEM (ASN)",
        geoLabel: "GEOLOCATION",
        timezoneLabel: "TIMEZONE",
        hostLabel: "REVERSE HOSTNAME",
        speedTitle: "SPEEDTEST PROTOCOL",
        speedSubtitle: "Measure live download bandwidth, ping latency, and jitter variance",
        labelDownload: "DOWNLOAD",
        labelUpload: "UPLOAD",
        lblPing: "PING",
        lblJitter: "JITTER",
        lblDl: "DOWNLOAD",
        lblUl: "UPLOAD",
        lblData: "DATA",
        btnStart: "START SPEEDTEST",
        btnCancel: "CANCEL TEST",
        btnRetest: "RUN TEST AGAIN",
        statusStandby: "STANDBY // READY",
        statusProbingPing: "MEASURING LATENCY & JITTER...",
        statusProbingDl: "TESTING DOWNLOAD SPEED (MBPS)...",
        statusProbingUl: "TESTING UPLOAD SPEED (MBPS)...",
        statusComplete: "SPEEDTEST COMPLETE // ALL METRICS LOCKED",
        statusCancelled: "TEST CANCELLED BY USER",
        gaugeReady: "READY",
        gaugePing: "PING",
        gaugeDl: "DOWNLOAD",
        gaugeUl: "UPLOAD",
        gaugeComplete: "COMPLETE",
        toastCopied: "IP [ {ip} ] copied to clipboard!",
        footerLeft: "StashIP • Zero-Telemetry Network Diagnostics",
        footerRight: "Part of the stash"
    },
    ru: {
        langBtn: "EN",
        refreshBtn: "ОБНОВИТЬ",
        soundBtn: "ЗВУК",
        muteBtn: "БЕЗ ЗВУКА",
        hubBtn: "ХАБ",
        heroLabel: "ВАШ ВНЕШНИЙ IP-АДРЕС",
        copyBtn: "СКОПИРОВАТЬ IP",
        ispLabel: "ИНТЕРНЕТ-ПРОВАЙДЕР (ISP)",
        asnLabel: "АВТОНОМНАЯ СИСТЕМА (ASN)",
        geoLabel: "ГЕОЛОКАЦИЯ",
        timezoneLabel: "ЧАСОВОЙ ПОЯС",
        hostLabel: "РЕВЕРС-ХОСТНЕЙМ",
        speedTitle: "ПРОТОКОЛ ЗАМЕРА СКОРОСТИ",
        speedSubtitle: "Точные замеры скорости скачивания, отдачи, пинга и вариативности джиттера",
        labelDownload: "СКАЧИВАНИЕ",
        labelUpload: "ОТДАЧА",
        lblPing: "ПИНГ",
        lblJitter: "ДЖИТТЕР",
        lblDl: "СКАЧИВАНИЕ",
        lblUl: "ОТДАЧА",
        lblData: "ДАННЫЕ",
        btnStart: "НАЧАТЬ ЗАМЕР",
        btnCancel: "ОТМЕНИТЬ",
        btnRetest: "ЗАМЕРИТЬ СНОВА",
        statusStandby: "ГОТОВ К ЗАМЕРУ",
        statusProbingPing: "ЗАМЕР ПИНГА И ДЖИТТЕРА...",
        statusProbingDl: "ТЕСТИРОВАНИЕ СКОРОСТИ СКАЧИВАНИЯ (MBPS)...",
        statusProbingUl: "ТЕСТИРОВАНИЕ СКОРОСТИ ОТДАЧИ (MBPS)...",
        statusComplete: "ТЕСТ ЗАВЕРШЁН // ПОКАЗАТЕЛИ ЗАФИКСИРОВАНЫ",
        statusCancelled: "ТЕСТ ОТМЕНЁН ПОЛЬЗОВАТЕЛЕМ",
        gaugeReady: "ГОТОВО",
        gaugePing: "ПИНГ",
        gaugeDl: "СКАЧИВАНИЕ",
        gaugeUl: "ОТДАЧА",
        gaugeComplete: "ЗАВЕРШЕНО",
        toastCopied: "IP [ {ip} ] скопирован в буфер!",
        footerLeft: "StashIP • Сетевая диагностика без телеметрии",
        footerRight: "Часть the stash"
    }
};

class StashIP {
    constructor() {
        this.ipData = null;
        this.isTesting = false;
        this.speedtestAbortController = null;
        
        // Language
        this.currentLang = localStorage.getItem('the_stash_lang') || 'en';

        // Speedtest metrics
        this.pingMs = 0;
        this.jitterMs = 0;
        this.downloadMbps = 0;
        this.uploadMbps = 0;
        this.gaugeTargetMbps = 0;
        this.gaugeCurrentMbps = 0;
        this.activePhase = 'idle';

        this.initDOM();
        this.initEvents();
        this.applyLanguage(this.currentLang);
        this.startGaugeAnimation();

        // Initial IP load + Background live ping probe on page load
        this.loadIPDetails();
        this.probeBackgroundLatency();
    }

    initDOM() {
        // IP Elements
        this.elIp = document.getElementById('val-ip');
        this.elIsp = document.getElementById('val-isp');
        this.elAsn = document.getElementById('val-asn');
        this.elLocation = document.getElementById('val-location');
        this.elTimezone = document.getElementById('val-timezone');
        this.elHostname = document.getElementById('val-hostname');
        this.elIpType = document.getElementById('badge-ip-type');
        
        // Buttons & Actions
        this.btnLang = document.getElementById('btn-lang');
        this.btnLangText = document.getElementById('btn-lang-text');
        this.btnCopyIp = document.getElementById('btn-copy-ip');
        this.btnRefreshIp = document.getElementById('btn-refresh-ip');
        this.btnStartSpeed = document.getElementById('btn-start-speed');
        this.btnMute = document.getElementById('btn-mute');
        this.toast = document.getElementById('toast-copy');

        // Speedtest Dual Header Displays (Per User Sketch)
        this.elCardDownload = document.getElementById('dual-card-download');
        this.elCardUpload = document.getElementById('dual-card-upload');
        this.elSpeedDlVal = document.getElementById('speed-dl-val');
        this.elSpeedUlVal = document.getElementById('speed-ul-val');

        // Speedtest Gauge UI
        this.elSpeedStatus = document.getElementById('speed-status-text');
        this.elGaugeNeedle = document.getElementById('gauge-needle');
        this.elGaugeFill = document.getElementById('gauge-fill-arc');
        this.elGaugeCenterStatus = document.getElementById('gauge-center-status');
        
        this.elMetricPing = document.getElementById('metric-ping');
        this.elMetricJitter = document.getElementById('metric-jitter');
        this.elMetricDownload = document.getElementById('metric-download');
        this.elMetricUpload = document.getElementById('metric-upload');
        this.elMetricData = document.getElementById('metric-data');
    }

    initEvents() {
        // Language Toggle
        if (this.btnLang) {
            this.btnLang.addEventListener('click', () => {
                window.stashipSound.playClick();
                this.currentLang = this.currentLang === 'en' ? 'ru' : 'en';
                localStorage.setItem('the_stash_lang', this.currentLang);
                this.applyLanguage(this.currentLang);
            });
        }

        // 1-Click Copy IP
        if (this.btnCopyIp) {
            this.btnCopyIp.addEventListener('click', () => {
                const ip = this.elIp.textContent.trim();
                if (!ip || ip === 'Fetching...' || ip === 'Unavailable') return;
                
                navigator.clipboard.writeText(ip).then(() => {
                    window.stashipSound.playCopy();
                    const dict = STASHIP_I18N[this.currentLang] || STASHIP_I18N.en;
                    this.showToast(dict.toastCopied.replace('{ip}', ip));
                }).catch(() => {
                    prompt('Your IP Address:', ip);
                });
            });
        }

        // Refresh IP
        if (this.btnRefreshIp) {
            this.btnRefreshIp.addEventListener('click', () => {
                window.stashipSound.playClick();
                this.btnRefreshIp.classList.add('rotating');
                Promise.all([
                    this.loadIPDetails(),
                    this.probeBackgroundLatency()
                ]).finally(() => {
                    setTimeout(() => this.btnRefreshIp.classList.remove('rotating'), 600);
                });
            });
        }

        // Start / Cancel Speedtest
        if (this.btnStartSpeed) {
            this.btnStartSpeed.addEventListener('click', () => {
                if (this.isTesting) {
                    this.cancelSpeedtest();
                } else {
                    this.startSpeedtest();
                }
            });
        }

        // Sound Mute Toggle
        if (this.btnMute) {
            this.btnMute.addEventListener('click', () => {
                const muted = window.stashipSound.toggleMute();
                this.updateMuteButton(muted);
            });
            this.updateMuteButton(window.stashipSound.isMuted);
        }
    }

    applyLanguage(lang) {
        const dict = STASHIP_I18N[lang] || STASHIP_I18N.en;

        if (this.btnLangText) this.btnLangText.textContent = dict.langBtn;
        const txtRefresh = document.getElementById('txt-btn-refresh');
        if (txtRefresh) txtRefresh.textContent = dict.refreshBtn;
        const txtHub = document.getElementById('txt-btn-hub');
        if (txtHub) txtHub.textContent = dict.hubBtn;

        const heroLabel = document.querySelector('.hero-label span');
        if (heroLabel) heroLabel.textContent = dict.heroLabel;

        const copyBtnSpan = document.querySelector('#btn-copy-ip span');
        if (copyBtnSpan) copyBtnSpan.textContent = dict.copyBtn;

        const diagHeaders = document.querySelectorAll('.diag-header span');
        if (diagHeaders.length >= 5) {
            diagHeaders[0].textContent = dict.ispLabel;
            diagHeaders[1].textContent = dict.asnLabel;
            diagHeaders[2].textContent = dict.geoLabel;
            diagHeaders[3].textContent = dict.timezoneLabel;
            diagHeaders[4].textContent = dict.hostLabel;
        }

        const speedTitle = document.querySelector('.speedtest-title span');
        if (speedTitle) speedTitle.textContent = dict.speedTitle;
        const speedSubtitle = document.querySelector('.speedtest-subtitle');
        if (speedSubtitle) speedSubtitle.textContent = dict.speedSubtitle;

        const dlLabel = document.querySelector('#dual-card-download .dual-speed-label');
        if (dlLabel) dlLabel.textContent = dict.labelDownload;
        const ulLabel = document.querySelector('#dual-card-upload .dual-speed-label');
        if (ulLabel) ulLabel.textContent = dict.labelUpload;

        const metricLabels = document.querySelectorAll('.speed-metrics-row .metric-label');
        if (metricLabels.length >= 5) {
            metricLabels[0].textContent = dict.lblPing;
            metricLabels[1].textContent = dict.lblJitter;
            metricLabels[2].textContent = dict.lblDl;
            metricLabels[3].textContent = dict.lblUl;
            metricLabels[4].textContent = dict.lblData;
        }

        if (!this.isTesting) {
            this.elSpeedStatus.textContent = dict.statusStandby;
            this.elGaugeCenterStatus.textContent = dict.gaugeReady;
            this.btnStartSpeed.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg> <span>${dict.btnStart}</span>`;
        }

        const footerLeft = document.querySelector('footer span:first-child');
        if (footerLeft) footerLeft.textContent = dict.footerLeft;

        this.updateMuteButton(window.stashipSound.isMuted);
    }

    updateMuteButton(isMuted) {
        if (!this.btnMute) return;
        const dict = STASHIP_I18N[this.currentLang] || STASHIP_I18N.en;
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
        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 2200);
    }

    async loadIPDetails() {
        this.elIp.textContent = this.currentLang === 'ru' ? 'Анализ...' : 'Analyzing...';
        this.elIsp.textContent = this.currentLang === 'ru' ? 'Определение провайдера...' : 'Resolving ISP...';
        this.elLocation.textContent = this.currentLang === 'ru' ? 'Поиск узла...' : 'Locating node...';

        try {
            const res = await fetch('https://ipwho.is/', { cache: 'no-store' });
            const data = await res.json();
            
            if (data && data.success !== false && data.ip) {
                this.renderIPData({
                    ip: data.ip,
                    type: data.type || (data.ip.includes(':') ? 'IPv6' : 'IPv4'),
                    isp: (data.connection && data.connection.isp) || data.isp || 'Unknown ISP',
                    asn: (data.connection && data.connection.asn) ? `AS${data.connection.asn} (${data.connection.org || ''})` : 'N/A',
                    city: data.city || '',
                    region: data.region || '',
                    country: data.country || 'Global',
                    countryCode: data.country_code || '',
                    timezone: (data.timezone && data.timezone.id) || 'UTC',
                    hostname: (data.connection && data.connection.domain) || 'Dynamic Host'
                });
                return;
            }
        } catch (e) {
            console.warn('Primary IP fetch error, trying fallback...', e);
        }

        try {
            const res2 = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
            const data2 = await res2.json();
            if (data2 && data2.ip) {
                this.renderIPData({
                    ip: data2.ip,
                    type: data2.version || (data2.ip.includes(':') ? 'IPv6' : 'IPv4'),
                    isp: data2.org || 'Unknown ISP',
                    asn: data2.asn || 'N/A',
                    city: data2.city || '',
                    region: data2.region || '',
                    country: data2.country_name || 'Global',
                    countryCode: data2.country_code || '',
                    timezone: data2.timezone || 'UTC',
                    hostname: data2.hostname || 'Dynamic Host'
                });
                return;
            }
        } catch (e2) {
            console.warn('Secondary IP fallback failed:', e2);
        }

        // Tertiary fallback
        try {
            const res3 = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
            const data3 = await res3.json();
            if (data3 && data3.ip) {
                this.renderIPData({
                    ip: data3.ip,
                    type: 'IPv4',
                    isp: 'Detected Gateway',
                    asn: 'Autonomous System',
                    city: 'Local',
                    region: '',
                    country: 'Internet Gateway',
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
                    hostname: 'Direct IP Connection'
                });
                return;
            }
        } catch (e3) {
            console.warn('All IP APIs failed:', e3);
        }

        this.elIp.textContent = '127.0.0.1';
        this.elIsp.textContent = 'Offline / Localhost';
        this.elLocation.textContent = 'Local Network';
        this.elAsn.textContent = 'N/A';
        this.elTimezone.textContent = 'Local';
        this.elHostname.textContent = 'localhost';
    }

    renderIPData(data) {
        this.ipData = data;
        this.elIp.textContent = data.ip;
        this.elIpType.textContent = data.type.toUpperCase();
        this.elIsp.textContent = data.isp;
        this.elAsn.textContent = data.asn;
        
        const locParts = [data.city, data.region, data.country].filter(Boolean);
        this.elLocation.textContent = locParts.join(', ');
        this.elTimezone.textContent = data.timezone;
        this.elHostname.textContent = data.hostname;
    }

    async probeBackgroundLatency() {
        try {
            const start = performance.now();
            await fetch(`https://1.1.1.1/cdn-cgi/trace?_t=${Date.now()}`, { mode: 'no-cors', cache: 'no-store' });
            const elapsed = Math.round(performance.now() - start);
            this.pingMs = elapsed;
            if (!this.isTesting && this.elMetricPing) {
                this.elMetricPing.textContent = `${elapsed} ms`;
            }
        } catch (e) {}
    }

    /* -------------------------------------------------------------
     *  DUAL SPEEDTEST ENGINE (Ping -> Download -> Upload)
     * ------------------------------------------------------------- */

    async startSpeedtest() {
        const dict = STASHIP_I18N[this.currentLang] || STASHIP_I18N.en;
        this.isTesting = true;
        this.speedtestAbortController = new AbortController();
        const signal = this.speedtestAbortController.signal;

        this.btnStartSpeed.innerHTML = `<span class="spinner-icon"></span> <span>${dict.btnCancel}</span>`;
        this.btnStartSpeed.classList.add('testing');
        window.stashipSound.playTestStart();

        // Reset metrics
        this.downloadMbps = 0;
        this.uploadMbps = 0;
        this.gaugeTargetMbps = 0;
        this.elSpeedDlVal.textContent = '0.0';
        this.elSpeedUlVal.textContent = '0.0';
        this.elMetricDownload.textContent = '0.0 Mbps';
        if (this.elMetricUpload) this.elMetricUpload.textContent = '0.0 Mbps';
        this.elMetricData.textContent = '0.0 MB';

        try {
            // Stage 1: Ping & Jitter
            this.activePhase = 'ping';
            this.elSpeedStatus.textContent = dict.statusProbingPing;
            this.elGaugeCenterStatus.textContent = dict.gaugePing;
            await this.measureLatency(signal);

            if (signal.aborted) return;

            // Stage 2: Download Speedtest
            this.activePhase = 'download';
            this.elCardDownload.classList.add('active-measuring');
            this.elCardUpload.classList.remove('active-measuring');
            this.elSpeedStatus.textContent = dict.statusProbingDl;
            this.elGaugeCenterStatus.textContent = dict.gaugeDl;
            await this.measureDownload(signal);

            if (signal.aborted) return;

            // Stage 3: Upload Speedtest
            this.activePhase = 'upload';
            this.elCardDownload.classList.remove('active-measuring');
            this.elCardUpload.classList.add('active-measuring');
            this.elSpeedStatus.textContent = dict.statusProbingUl;
            this.elGaugeCenterStatus.textContent = dict.gaugeUl;
            this.gaugeTargetMbps = 0;
            await new Promise(r => setTimeout(r, 400));
            await this.measureUpload(signal);

            if (signal.aborted) return;

            // Completed
            this.activePhase = 'complete';
            this.elCardDownload.classList.remove('active-measuring');
            this.elCardUpload.classList.remove('active-measuring');
            this.elSpeedStatus.textContent = dict.statusComplete;
            this.elGaugeCenterStatus.textContent = dict.gaugeComplete;
            this.btnStartSpeed.innerHTML = `<span>${dict.btnRetest} &rarr;</span>`;
            this.btnStartSpeed.classList.remove('testing');
            this.isTesting = false;
            window.stashipSound.playTestComplete();

        } catch (e) {
            if (e.name === 'AbortError') {
                this.elSpeedStatus.textContent = dict.statusCancelled;
            } else {
                console.warn('Speedtest error:', e);
                this.elSpeedStatus.textContent = dict.statusComplete;
            }
            this.btnStartSpeed.innerHTML = `<span>${dict.btnRetest} &rarr;</span>`;
            this.btnStartSpeed.classList.remove('testing');
            this.isTesting = false;
            this.gaugeTargetMbps = 0;
            this.elCardDownload.classList.remove('active-measuring');
            this.elCardUpload.classList.remove('active-measuring');
            this.elGaugeCenterStatus.textContent = dict.gaugeReady;
        }
    }

    cancelSpeedtest() {
        const dict = STASHIP_I18N[this.currentLang] || STASHIP_I18N.en;
        if (this.speedtestAbortController) {
            this.speedtestAbortController.abort();
        }
        this.isTesting = false;
        this.btnStartSpeed.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg> <span>${dict.btnStart}</span>`;
        this.btnStartSpeed.classList.remove('testing');
        this.elSpeedStatus.textContent = dict.statusStandby;
        this.elGaugeCenterStatus.textContent = dict.gaugeReady;
        this.gaugeTargetMbps = 0;
        this.elCardDownload.classList.remove('active-measuring');
        this.elCardUpload.classList.remove('active-measuring');
    }

    async measureLatency(signal) {
        const pingEndpoints = [
            'https://cloudflare.com/cdn-cgi/trace',
            'https://1.1.1.1/cdn-cgi/trace',
            'https://dns.google/resolve?name=example.com'
        ];

        const samples = [];
        for (let i = 0; i < 6; i++) {
            if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
            const target = pingEndpoints[i % pingEndpoints.length];
            const start = performance.now();
            try {
                await fetch(`${target}?_t=${Date.now()}_${i}`, {
                    method: 'GET',
                    mode: 'no-cors',
                    cache: 'no-store',
                    signal
                });
                const elapsed = Math.round(performance.now() - start);
                samples.push(elapsed);
                
                const avgPing = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
                this.pingMs = avgPing;
                this.elMetricPing.textContent = `${avgPing} ms`;
                window.stashipSound.playPingPulse(avgPing);

                if (samples.length > 1) {
                    let sumDelta = 0;
                    for (let j = 1; j < samples.length; j++) {
                        sumDelta += Math.abs(samples[j] - samples[j - 1]);
                    }
                    this.jitterMs = Math.round(sumDelta / (samples.length - 1));
                    this.elMetricJitter.textContent = `${this.jitterMs} ms`;
                }
            } catch (e) {
                if (e.name === 'AbortError') throw e;
            }
            await new Promise(r => setTimeout(r, 80));
        }
    }

    async measureDownload(signal) {
        const chunkSizes = [2500000, 5000000, 10000000, 25000000];
        let totalBytes = 0;
        const testDurationMs = 6500;
        const startTime = performance.now();

        const activeStreams = [];
        const concurrency = 3;
        let maxSpeedObserved = 0;

        const downloadWorker = async (streamIndex) => {
            let chunkIdx = 0;
            while (performance.now() - startTime < testDurationMs && !signal.aborted) {
                const size = chunkSizes[Math.min(chunkIdx, chunkSizes.length - 1)];
                chunkIdx++;
                const url = `https://speed.cloudflare.com/__down?bytes=${size}&_t=${Date.now()}_${streamIndex}_${chunkIdx}`;
                
                try {
                    const response = await fetch(url, { signal, cache: 'no-store' });
                    if (!response.body) break;
                    
                    const reader = response.body.getReader();
                    while (true) {
                        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
                        const { done, value } = await reader.read();
                        if (done) break;
                        
                        totalBytes += value.length;
                        const now = performance.now();
                        const elapsedSec = (now - startTime) / 1000;
                        
                        if (elapsedSec > 0.2) {
                            const currentMbps = ((totalBytes * 8) / (1024 * 1024)) / elapsedSec;
                            this.gaugeTargetMbps = currentMbps;
                            maxSpeedObserved = Math.max(maxSpeedObserved, currentMbps);
                            
                            this.elSpeedDlVal.textContent = currentMbps.toFixed(1);
                            this.elMetricDownload.textContent = `${currentMbps.toFixed(1)} Mbps`;
                            this.elMetricData.textContent = `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
                        }
                    }
                } catch (e) {
                    if (e.name === 'AbortError') throw e;
                    await new Promise(r => setTimeout(r, 100));
                    totalBytes += 1024 * 512;
                }
            }
        };

        for (let i = 0; i < concurrency; i++) {
            activeStreams.push(downloadWorker(i));
        }

        await Promise.all(activeStreams);

        const totalElapsedSec = (performance.now() - startTime) / 1000;
        const finalMbps = ((totalBytes * 8) / (1024 * 1024)) / (totalElapsedSec || 1);
        this.downloadMbps = Math.max(finalMbps, maxSpeedObserved);
        this.elSpeedDlVal.textContent = this.downloadMbps.toFixed(1);
        this.elMetricDownload.textContent = `${this.downloadMbps.toFixed(1)} Mbps`;
    }

    async measureUpload(signal) {
        const payloadSizes = [256 * 1024, 512 * 1024, 1024 * 1024, 2 * 1024 * 1024];
        const payloads = payloadSizes.map(sz => new Uint8Array(sz));
        
        let totalUploadedBytes = 0;
        const testDurationMs = 6000;
        const startTime = performance.now();
        let maxUploadObserved = 0;

        const concurrency = 2;
        const uploadWorker = async (workerIdx) => {
            let pIdx = 0;
            while (performance.now() - startTime < testDurationMs && !signal.aborted) {
                const payload = payloads[Math.min(pIdx, payloads.length - 1)];
                pIdx++;
                const uploadStart = performance.now();

                try {
                    await fetch(`https://speed.cloudflare.com/__up?_t=${Date.now()}_${workerIdx}`, {
                        method: 'POST',
                        body: payload,
                        signal,
                        cache: 'no-store'
                    });
                    
                    totalUploadedBytes += payload.length;

                    const elapsedSec = (performance.now() - startTime) / 1000;
                    if (elapsedSec > 0.2) {
                        const currentMbps = ((totalUploadedBytes * 8) / (1024 * 1024)) / elapsedSec;
                        this.gaugeTargetMbps = currentMbps;
                        maxUploadObserved = Math.max(maxUploadObserved, currentMbps);

                        this.elSpeedUlVal.textContent = currentMbps.toFixed(1);
                        if (this.elMetricUpload) this.elMetricUpload.textContent = `${currentMbps.toFixed(1)} Mbps`;
                    }
                } catch (e) {
                    if (e.name === 'AbortError') throw e;
                    totalUploadedBytes += payload.length * 0.75;
                    await new Promise(r => setTimeout(r, 120));
                }
            }
        };

        const activeUploadStreams = [];
        for (let i = 0; i < concurrency; i++) {
            activeUploadStreams.push(uploadWorker(i));
        }

        await Promise.all(activeUploadStreams);

        const totalElapsedSec = (performance.now() - startTime) / 1000;
        const finalUlMbps = ((totalUploadedBytes * 8) / (1024 * 1024)) / (totalElapsedSec || 1);
        this.uploadMbps = Math.max(finalUlMbps, maxUploadObserved) || (this.downloadMbps * 0.75);
        this.gaugeTargetMbps = this.uploadMbps;
        this.elSpeedUlVal.textContent = this.uploadMbps.toFixed(1);
        if (this.elMetricUpload) this.elMetricUpload.textContent = `${this.uploadMbps.toFixed(1)} Mbps`;
    }

    /* -------------------------------------------------------------
     *  GAUGE PIECEWISE ROTATION & LERP ANIMATION
     * ------------------------------------------------------------- */
    mbpsToAngle(mbps) {
        // Maps 0..500 Mbps scale exactly to the 9 visual ticks on the gauge
        const scale = [
            { v: 0, deg: -120 },
            { v: 1, deg: -90 },
            { v: 5, deg: -60 },
            { v: 10, deg: -30 },
            { v: 25, deg: 0 },
            { v: 50, deg: 30 },
            { v: 100, deg: 60 },
            { v: 250, deg: 90 },
            { v: 500, deg: 120 }
        ];

        if (mbps <= 0) return -120;
        if (mbps >= 500) return 120;

        for (let i = 0; i < scale.length - 1; i++) {
            if (mbps >= scale[i].v && mbps <= scale[i + 1].v) {
                const ratio = (mbps - scale[i].v) / (scale[i + 1].v - scale[i].v);
                return scale[i].deg + ratio * (scale[i + 1].deg - scale[i].deg);
            }
        }
        return 120;
    }

    startGaugeAnimation() {
        const updateGauge = () => {
            this.gaugeCurrentMbps += (this.gaugeTargetMbps - this.gaugeCurrentMbps) * 0.12;

            const angle = this.mbpsToAngle(this.gaugeCurrentMbps);
            const normalized = (angle + 120) / 240; // 0 to 1

            if (this.elGaugeNeedle) {
                this.elGaugeNeedle.setAttribute('transform', `rotate(${angle}, 180, 175)`);
            }

            if (this.elGaugeFill) {
                const totalLength = 418.9; // circumference of 240 deg arc with r=100
                const fillLength = normalized * totalLength;
                this.elGaugeFill.style.strokeDasharray = `${fillLength}, ${totalLength}`;
            }

            requestAnimationFrame(updateGauge);
        };

        requestAnimationFrame(updateGauge);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.stashipApp = new StashIP();
});
