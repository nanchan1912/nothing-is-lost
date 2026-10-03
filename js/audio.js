'use strict';
// All sound is synthesised live with WebAudio, so the game ships with no audio files.
const Sound = {
  ctx: null,
  ensure() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; } }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },
  tone(freq, dur, type = 'sine', vol = 0.12, slide = 0, delay = 0) {
    const c = this.ensure(); if (!c || !Save.data.settings.sfx) return;
    const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  // Little voice blips while a character talks, a different pitch for each.
  blip(who) {
    const base = { inchu: 330, nan: 620, eye: 150, pell: 880 }[who] || 440;
    this.tone(base * (0.94 + Math.random() * 0.12), 0.05, who === 'eye' ? 'sawtooth' : 'triangle', who === 'eye' ? 0.03 : 0.045);
  },
  play(name) {
    switch (name) {
      case 'tick': this.tone(660, 0.05, 'sine', 0.04); break;
      case 'turn': this.tone(330, 0.25, 'triangle', 0.07, 220); break;
      case 'unturn': this.tone(550, 0.25, 'triangle', 0.07, -220); break;
      case 'slice': this.tone(900, 0.09, 'sawtooth', 0.04, -600); break;
      case 'deliver': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.25, 'sine', 0.08, 0, i * 0.07)); break;
      case 'combo': [784, 988, 1175].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.08, 0, i * 0.06)); break;
      case 'chime': this.tone(1046, 0.5, 'sine', 0.06); this.tone(1568, 0.6, 'sine', 0.04, 0, 0.08); break;
      case 'collapse': this.tone(140, 0.5, 'sawtooth', 0.1, -90); break;
      case 'blocked': this.tone(110, 0.18, 'square', 0.07); this.tone(104, 0.18, 'square', 0.07, 0, 0.12); break;
      case 'nomove': this.tone(440, 0.3, 'sine', 0.05, 5); break;
      case 'warn': this.tone(220, 0.35, 'triangle', 0.08, 110); break;
      case 'noise': this.tone(180, 0.4, 'sawtooth', 0.06, -120); this.tone(190, 0.4, 'square', 0.03, -100, 0.03); break;
      case 'heal': [440, 554, 659, 880].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.06, 0, i * 0.05)); break;
      case 'drop': this.tone(260, 0.12, 'sine', 0.06, -80); break;
      case 'merge': this.tone(520, 0.18, 'triangle', 0.07, 260); break;
      case 'pop': [880, 1320, 1760].forEach((f, i) => this.tone(f, 0.22, 'sine', 0.07, 0, i * 0.04)); break;
      case 'flip': this.tone(740, 0.06, 'triangle', 0.05, 120); break;
      case 'nope': this.tone(300, 0.15, 'triangle', 0.05, -80); break;
    }
  },
};

// Ambient score: slow, slightly eerie chords under sparse music-box notes with an echo.
const Music = {
  on: false, timers: [],
  CHORDS: [
    [146.83, 220.0, 329.63, 349.23],  // D minor add9
    [116.54, 174.61, 220.0, 329.63],  // B♭ maj7 ♯11
    [98.0, 146.83, 233.08, 329.63],   // G minor 6
    [110.0, 164.81, 246.94, 293.66],  // A sus
  ],
  BELLS: [293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25, 587.33, 659.25, 698.46, 880.0],
  start() {
    const c = Sound.ensure();
    if (!c || this.on || !Save.data.settings.music) return;
    this.on = true;
    const now = c.currentTime;
    this.master = c.createGain(); this.master.gain.setValueAtTime(0, now); this.master.gain.linearRampToValueAtTime(0.05, now + 5);
    this.master.connect(c.destination);
    // echo for the bells
    this.delay = c.createDelay(1); this.delay.delayTime.value = 0.42;
    const fb = c.createGain(); fb.gain.value = 0.38;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    this.delay.connect(lp); lp.connect(fb); fb.connect(this.delay); lp.connect(this.master);
    // pad bus with a slowly breathing filter
    this.pad = c.createBiquadFilter(); this.pad.type = 'lowpass'; this.pad.frequency.value = 700; this.pad.Q.value = 2;
    const lfo = c.createOscillator(), lfoG = c.createGain(); lfo.frequency.value = 0.045; lfoG.gain.value = 380;
    lfo.connect(lfoG); lfoG.connect(this.pad.frequency); lfo.start();
    this.pad.connect(this.master);
    this.lfo = lfo;
    let ci = 0;
    const chord = () => { if (!this.on) return; this.playChord(this.CHORDS[ci++ % this.CHORDS.length]); };
    chord(); this.timers.push(setInterval(chord, 9000));
    const bell = () => {
      if (!this.on) return;
      this.playBell(this.BELLS[Math.floor(Math.random() * this.BELLS.length)] * (Math.random() < 0.2 ? 2 : 1));
      if (Math.random() < 0.35) setTimeout(() => this.on && this.playBell(this.BELLS[Math.floor(Math.random() * this.BELLS.length)]), 260);
      this.timers.push(setTimeout(bell, 1600 + Math.random() * 3200));
    };
    this.timers.push(setTimeout(bell, 2500));
  },
  playChord(freqs) {
    const c = Sound.ctx, t = c.currentTime;
    for (const f of freqs) for (const det of [-5, 5]) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = det < 0 ? 'sine' : 'triangle'; o.frequency.value = f; o.detune.value = det;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09, t + 3.5); g.gain.linearRampToValueAtTime(0, t + 11);
      o.connect(g); g.connect(this.pad); o.start(t); o.stop(t + 11.2);
    }
  },
  playBell(f) {
    const c = Sound.ctx, t = c.currentTime;
    for (const [mult, v] of [[1, 0.16], [2.01, 0.05], [3.0, 0.02]]) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = f * mult;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
      o.connect(g); g.connect(this.master); g.connect(this.delay); o.start(t); o.stop(t + 2.7);
    }
  },
  stop() {
    if (!this.on) return;
    this.on = false;
    this.timers.forEach(t => { clearTimeout(t); clearInterval(t); }); this.timers = [];
    const c = Sound.ctx, m = this.master, l = this.lfo;
    m.gain.cancelScheduledValues(c.currentTime); m.gain.setValueAtTime(m.gain.value, c.currentTime); m.gain.linearRampToValueAtTime(0, c.currentTime + 1.2);
    setTimeout(() => { try { m.disconnect(); l.stop(); } catch (e) { /* already stopped */ } }, 1400);
  },
  sync() { if (Save.data.settings.music) this.start(); else this.stop(); },
};
