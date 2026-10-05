// Web Audio API Procedural Sound Engine
// 無需任何外部音檔，開箱即用支援音效與放鬆農場背景音樂

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.bgmPlaying = false;
        this.bgmTimer = null;
        this.bgmStep = 0;
        this.masterGain = null;
        
        // 讀取設定
        const savedMute = localStorage.getItem('corgi_farm_muted');
        if (savedMute !== null) {
            this.muted = savedMute === 'true';
        }
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.muted ? 0 : 0.3;
            this.masterGain.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setMuted(muted) {
        this.muted = muted;
        localStorage.setItem('corgi_farm_muted', muted);
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(muted ? 0 : 0.3, this.ctx.currentTime);
        }
    }

    toggleMute() {
        this.setMuted(!this.muted);
        return this.muted;
    }

    // 播放腳步聲 / 跳躍
    playStep() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.08);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.08);
    }

    // 澆水聲
    playWater() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        for (let i = 0; i < 3; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const time = now + i * 0.04;
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(450 + Math.random() * 300, time);
            osc.frequency.exponentialRampToValueAtTime(800 + Math.random() * 200, time + 0.05);

            gain.gain.setValueAtTime(0.12, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(time);
            osc.stop(time + 0.06);
        }
    }

    // 鋤地 / 翻土
    playTill() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.12);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.12);
    }

    // 播種
    playPlant() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(540, now + 0.1);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.1);
    }

    // 收割 (和弦琶音叮叮噹噹)
    playHarvest() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const time = now + idx * 0.06;
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);

            gain.gain.setValueAtTime(0.18, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(time);
            osc.stop(time + 0.3);
        });
    }

    // 金幣聲
    playCoin() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const notes = [987.77, 1318.51]; // B5, E6
        
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const time = now + idx * 0.08;
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);

            gain.gain.setValueAtTime(0.16, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(time);
            osc.stop(time + 0.26);
        });
    }

    // 哈士奇叫聲 (可愛汪汪/嚎叫)
    playBark(isHappy = true) {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        
        if (isHappy) {
            // 可愛兩聲短汪
            [0, 0.12].forEach(delay => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const t = now + delay;
                
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(320, t);
                osc.frequency.exponentialRampToValueAtTime(480, t + 0.04);
                osc.frequency.exponentialRampToValueAtTime(220, t + 0.09);

                gain.gain.setValueAtTime(0.15, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

                osc.connect(gain);
                gain.connect(this.masterGain);

                osc.start(t);
                osc.stop(t + 0.1);
            });
        } else {
            // 哈士祈特色長嚎叫
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(280, now);
            osc.frequency.linearRampToValueAtTime(420, now + 0.2);
            osc.frequency.linearRampToValueAtTime(340, now + 0.5);

            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now);
            osc.stop(now + 0.52);
        }
    }

    // 摸摸/愛心音效
    playHeart() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.18); // A5

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.26);
    }

    // 丟球與彈跳
    playBallThrow() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.19);
    }

    playBallBounce() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.11);
    }

    // 背景音樂 BGM (放鬆溫暖的木琴/卡林巴琴五聲音階旋律)
    startBgm() {
        if (this.bgmPlaying) return;
        this.bgmPlaying = true;
        this.playBgmNote();
    }

    stopBgm() {
        this.bgmPlaying = false;
        if (this.bgmTimer) {
            clearTimeout(this.bgmTimer);
            this.bgmTimer = null;
        }
    }

    toggleBgm() {
        if (this.bgmPlaying) {
            this.stopBgm();
            return false;
        } else {
            this.init();
            this.startBgm();
            return true;
        }
    }

    playBgmNote() {
        if (!this.bgmPlaying) return;
        
        const melody = [
            261.63, 329.63, 392.00, 523.25, // C4, E4, G4, C5
            440.00, 392.00, 329.63, 293.66, // A4, G4, E4, D4
            329.63, 392.00, 523.25, 659.25, // E4, G4, C5, E5
            587.33, 523.25, 440.00, 392.00  // D5, C5, A4, G4
        ];
        
        const chords = [
            [130.81, 196.00], // C3, G3
            [174.61, 261.63], // F3, C4
            [146.83, 220.00], // D3, A3
            [196.00, 246.94]  // G3, B3
        ];

        if (!this.muted && this.ctx) {
            const now = this.ctx.currentTime;
            const noteFreq = melody[this.bgmStep % melody.length];
            
            // 主奏音 (像小木琴或水滴)
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(noteFreq, now);
            
            gain.gain.setValueAtTime(0.045, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.start(now);
            osc.stop(now + 0.48);

            // 每四拍下一個溫暖的和弦低音
            if (this.bgmStep % 4 === 0) {
                const chord = chords[Math.floor((this.bgmStep / 4) % chords.length)];
                chord.forEach(f => {
                    const bOsc = this.ctx.createOscillator();
                    const bGain = this.ctx.createGain();
                    bOsc.type = 'triangle';
                    bOsc.frequency.setValueAtTime(f, now);
                    
                    bGain.gain.setValueAtTime(0.035, now);
                    bGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
                    
                    bOsc.connect(bGain);
                    bGain.connect(this.masterGain);
                    
                    bOsc.start(now);
                    bOsc.stop(now + 1.25);
                });
            }
        }

        this.bgmStep++;
        this.bgmTimer = setTimeout(() => this.playBgmNote(), 360); // 約 83 BPM
    }
}

// 建立全局實例
window.soundEngine = new SoundEngine();
