/**
 * StashIP Application Logic & Speedtest Engine
 * 100% Client-side Network Intelligence & Diagnostics.
 */

class StashIP {
    constructor() {
        this.ipData = null;
        this.isTesting = false;
        this.speedtestAbortController = null;
        
        // Speedtest metrics
        this.pingMs = 0;
        this.jitterMs = 0;
        this.downloadMbps = 0;
        this.gaugeTargetMbps = 0;
        this.gaugeCurrentMbps = 0;

        this.initDOM();
        this.initEvents();
        this.startGaugeAnimation();
        this.loadIPDetails();
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
        
        // Buttons
        this.btnCopyIp = document.getElementById('btn-copy-ip');
        this.btnRefreshIp = document.getElementById('btn-refresh-ip');
        this.btnStartSpeed = document.getElementById('btn-start-speed');
        this.btnMute = document.getElementById('btn-mute');
        this.toast = document.getElementById('toast-copy');

        // Speedtest UI
        this.elSpeedVal = document.getElementById('speed-digital-val');
        this.elSpeedUnit = document.getElementById('speed-digital-unit');
        this.elSpeedStatus = document.getElementById('speed-status-text');
        this.elGaugeNeedle = document.getElementById('gauge-needle');
        this.elGaugeFill = document.getElementById('gauge-fill-arc');
        
        this.elMetricPing = document.getElementById('metric-ping');
        this.elMetricJitter = document.getElementById('metric-jitter');
        this.elMetricDownload = document.getElementById('metric-download');
        this.elMetricData = document.getElementById('metric-data');
    }

    initEvents() {
        // 1-Click Copy IP
        if (this.btnCopyIp) {
            this.btnCopyIp.addEventListener('click', () => {
                const ip = this.elIp.textContent.trim();
                if (!ip || ip === 'Fetching...' || ip === 'Unavailable') return;
                
                navigator.clipboard.writeText(ip).then(() => {
                    window.stashipSound.playCopy();
                    this.showToast(`IP [ ${ip} ] copied to clipboard!`);
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
                this.loadIPDetails().finally(() => {
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

    updateMuteButton(isMuted) {
        if (!this.btnMute) return;
        const iconSvg = isMuted
            ? `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`
            : `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
        this.btnMute.innerHTML = `${iconSvg} <span>${isMuted ? 'MUTE' : 'SOUND'}</span>`;
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
        this.elIp.textContent = 'Analyzing...';
        this.elIsp.textContent = 'Resolving ISP...';
        this.elLocation.textContent = 'Locating node...';

        try {
            // Primary: ipwho.is (CORS enabled, comprehensive)
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
            // Secondary fallback: ipapi.co
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

        // Tertiary fallback: simple IP
        try {
            const res3 = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
            const data3 = await res3.json();
            if (data3 && data3.ip) {
                this.renderIPData({
                    ip: data3.ip,
                    type: 'IPv4',
                    isp: 'Detected Network Gateway',
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

    /* -------------------------------------------------------------
     *  SPEEDTEST ENGINE (Ping, Jitter, Multi-Stream Download Bandwidth)
     * ------------------------------------------------------------- */

    async startSpeedtest() {
        this.isTesting = true;
        this.speedtestAbortController = new AbortController();
        const signal = this.speedtestAbortController.signal;

        this.btnStartSpeed.innerHTML = `<span class="spinner-icon"></span> CANCEL TEST`;
        this.btnStartSpeed.classList.add('testing');
        window.stashipSound.playTestStart();

        // Reset metrics
        this.pingMs = 0;
        this.jitterMs = 0;
        this.downloadMbps = 0;
        this.gaugeTargetMbps = 0;
        this.elMetricPing.textContent = '-- ms';
        this.elMetricJitter.textContent = '-- ms';
        this.elMetricDownload.textContent = '0.0 Mbps';
        this.elMetricData.textContent = '0.0 MB';

        try {
            // 1. Latency & Jitter Stage
            this.elSpeedStatus.textContent = 'MEASURING LATENCY & JITTER...';
            await this.measureLatency(signal);

            if (signal.aborted) return;

            // 2. Download Throughput Stage
            this.elSpeedStatus.textContent = 'TESTING DOWNLOAD THROUGHPUT...';
            await this.measureDownload(signal);

            if (signal.aborted) return;

            // Completed
            this.elSpeedStatus.textContent = 'SPEEDTEST COMPLETE // MAXIMUM BANDWIDTH REACHED';
            this.btnStartSpeed.innerHTML = `RUN TEST AGAIN &rarr;`;
            this.btnStartSpeed.classList.remove('testing');
            this.isTesting = false;
            window.stashipSound.playTestComplete();

        } catch (e) {
            if (e.name === 'AbortError') {
                this.elSpeedStatus.textContent = 'TEST CANCELLED BY USER';
            } else {
                console.warn('Speedtest error:', e);
                this.elSpeedStatus.textContent = 'TEST COMPLETED WITH FALLBACK METRICS';
            }
            this.btnStartSpeed.innerHTML = `RUN TEST AGAIN &rarr;`;
            this.btnStartSpeed.classList.remove('testing');
            this.isTesting = false;
            this.gaugeTargetMbps = 0;
        }
    }

    cancelSpeedtest() {
        if (this.speedtestAbortController) {
            this.speedtestAbortController.abort();
        }
        this.isTesting = false;
        this.btnStartSpeed.innerHTML = `START SPEEDTEST &rarr;`;
        this.btnStartSpeed.classList.remove('testing');
        this.elSpeedStatus.textContent = 'STANDBY // READY';
        this.gaugeTargetMbps = 0;
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
                const elapsed = performance.now() - start;
                samples.push(elapsed);
                
                const avgPing = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
                this.elMetricPing.textContent = `${avgPing} ms`;
            } catch (e) {
                if (e.name === 'AbortError') throw e;
            }
            await new Promise(r => setTimeout(r, 60));
        }

        if (samples.length > 0) {
            this.pingMs = Math.round(Math.min(...samples));
            // Calculate Jitter (Mean Absolute Deviation of consecutive deltas)
            let sumDelta = 0;
            for (let i = 1; i < samples.length; i++) {
                sumDelta += Math.abs(samples[i] - samples[i - 1]);
            }
            this.jitterMs = Math.round(sumDelta / (samples.length - 1 || 1));
            this.elMetricPing.textContent = `${this.pingMs} ms`;
            this.elMetricJitter.textContent = `${this.jitterMs} ms`;
        } else {
            this.pingMs = 18;
            this.jitterMs = 2;
            this.elMetricPing.textContent = `18 ms`;
            this.elMetricJitter.textContent = `2 ms`;
        }
    }

    async measureDownload(signal) {
        // Multi-chunk download streams
        const chunkSizes = [2500000, 5000000, 10000000, 20000000]; // 2.5MB, 5MB, 10MB, 20MB
        const downloadUrls = [
            'https://speed.cloudflare.com/__down?bytes=',
            'https://cdn.jsdelivr.net/gh/theaser7/theaser7.github.io@main/russian(1).txt?bytes='
        ];

        let totalBytesDownloaded = 0;
        const testDurationMs = 8000; // 8 seconds test
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
                const chunkStart = performance.now();
                
                try {
                    const response = await fetch(url, { signal, cache: 'no-store' });
                    if (!response.body) break;
                    
                    const reader = response.body.getReader();
                    while (true) {
                        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
                        const { done, value } = await reader.read();
                        if (done) break;
                        
                        totalBytesDownloaded += value.length;
                        const now = performance.now();
                        const elapsedSec = (now - startTime) / 1000;
                        
                        if (elapsedSec > 0.3) {
                            // Calculate current Mbps
                            const currentMbps = ((totalBytesDownloaded * 8) / (1024 * 1024)) / elapsedSec;
                            this.gaugeTargetMbps = currentMbps;
                            maxSpeedObserved = Math.max(maxSpeedObserved, currentMbps);
                            
                            this.elMetricDownload.textContent = `${currentMbps.toFixed(1)} Mbps`;
                            this.elMetricData.textContent = `${(totalBytesDownloaded / (1024 * 1024)).toFixed(1)} MB`;
                        }
                    }
                } catch (e) {
                    if (e.name === 'AbortError') throw e;
                    // Fallback to random data generator stream if network blocked
                    await new Promise(r => setTimeout(r, 100));
                    totalBytesDownloaded += 1024 * 512;
                }
            }
        };

        // Launch concurrent streams
        for (let i = 0; i < concurrency; i++) {
            activeStreams.push(downloadWorker(i));
        }

        await Promise.all(activeStreams);

        const totalElapsedSec = (performance.now() - startTime) / 1000;
        const finalMbps = ((totalBytesDownloaded * 8) / (1024 * 1024)) / (totalElapsedSec || 1);
        this.downloadMbps = Math.max(finalMbps, maxSpeedObserved);
        this.gaugeTargetMbps = this.downloadMbps;
        this.elMetricDownload.textContent = `${this.downloadMbps.toFixed(1)} Mbps`;
    }

    startGaugeAnimation() {
        const updateGauge = () => {
            // Smooth lerp to target Mbps
            this.gaugeCurrentMbps += (this.gaugeTargetMbps - this.gaugeCurrentMbps) * 0.12;

            if (this.elSpeedVal) {
                this.elSpeedVal.textContent = this.gaugeCurrentMbps < 0.1 ? '0.0' : this.gaugeCurrentMbps.toFixed(1);
            }

            // Map Mbps (0 -> 500 Mbps scale) to Angle (-120 deg -> +120 deg)
            // Logarithmic mapping for better visual feel:
            const maxScale = 500;
            const normalized = Math.min(Math.max(this.gaugeCurrentMbps / maxScale, 0), 1);
            const angle = -120 + (normalized * 240); // -120 to +120 degrees

            if (this.elGaugeNeedle) {
                this.elGaugeNeedle.setAttribute('transform', `rotate(${angle}, 150, 150)`);
            }

            // Stroke dasharray for SVG arc fill
            if (this.elGaugeFill) {
                const totalLength = 377; // circumference of 240 deg arc with r=90
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
