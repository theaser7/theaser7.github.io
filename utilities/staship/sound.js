/**
 * StashIP Audio Engine
 * Procedural Web Audio API sound synthesizer tailored for network telemetry & speed tests.
 * 100% synthesized, 0 external audio assets.
 */

class StashIPSound {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        try {
            const saved = localStorage.getItem('staship_sound_muted');
            if (saved !== null) {
                this.isMuted = JSON.parse(saved);
            }
        } catch (e) {}
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        try {
            localStorage.setItem('staship_sound_muted', JSON.stringify(this.isMuted));
        } catch (e) {}
        return this.isMuted;
    }

    // High-precision tactile optic terminal click
    playClick() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2400, now);
        filter.Q.setValueAtTime(4.0, now);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(3200, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.025);

        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.025);
    }

    // 1-Click Copy confirmation telemetry burst
    playCopy() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        [1400, 2100].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.035);

            gain.gain.setValueAtTime(0.06, now + idx * 0.035);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.035 + 0.08);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + idx * 0.035);
            osc.stop(now + idx * 0.035 + 0.08);
        });
    }

    // Real-time network radar / ping probe pulse
    playPingPulse(ms = 20) {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Higher pitch for faster pings
        const baseFreq = Math.max(600, Math.min(2200, 2400 - ms * 15));
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.05);

        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.06);
    }

    // High-speed transceiver initialization turbine sweep
    playTestStart() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // Sub-bass carrier rev
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = 'sawtooth';
        subOsc.frequency.setValueAtTime(80, now);
        subOsc.frequency.exponentialRampToValueAtTime(280, now + 0.35);

        const subFilter = this.ctx.createBiquadFilter();
        subFilter.type = 'lowpass';
        subFilter.frequency.setValueAtTime(300, now);

        subGain.gain.setValueAtTime(0.01, now);
        subGain.gain.linearRampToValueAtTime(0.06, now + 0.15);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        subOsc.connect(subFilter);
        subFilter.connect(subGain);
        subGain.connect(this.ctx.destination);

        subOsc.start(now);
        subOsc.stop(now + 0.35);

        // High frequency sync chirp
        const hiOsc = this.ctx.createOscillator();
        const hiGain = this.ctx.createGain();
        hiOsc.type = 'sine';
        hiOsc.frequency.setValueAtTime(980, now + 0.05);
        hiOsc.frequency.exponentialRampToValueAtTime(2400, now + 0.3);

        hiGain.gain.setValueAtTime(0.05, now + 0.05);
        hiGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        hiOsc.connect(hiGain);
        hiGain.connect(this.ctx.destination);

        hiOsc.start(now + 0.05);
        hiOsc.stop(now + 0.3);
    }

    // Handshake locked-in completion chord (Cyber Mint Harmonic)
    playTestComplete() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        // F#5, A5, C#6, E6
        const chord = [739.99, 880.00, 1108.73, 1318.51];
        chord.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(3500, now + idx * 0.04);

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.04);

            gain.gain.setValueAtTime(0.06, now + idx * 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.38);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + idx * 0.04);
            osc.stop(now + idx * 0.04 + 0.38);
        });
    }
}

window.stashipSound = new StashIPSound();
