'use strict';
// Scenes: Title, Story, Puzzle (trace levers), Slicer (cut levers), AND interlude, Ending.

const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;
const AT_POLE = v => Math.abs(v[2]) > 0.985;
const pointTarget = k => ({ v: Q.POINTS[k], label: Q.LABEL[k], key: k });
function nameOf(v) {
  const k = Q.nearest(v);
  if (Q.dot(v, Q.POINTS[k]) > 0.995) return Q.LABEL[k];
  return `(${v.map(x => (Math.abs(x) < 0.005 ? 0 : x).toFixed(2)).join(', ')})`;
}

// ---------------------------------------------------------------------------------------------
// The lantern: true quantum state + a display arrow that animates along each turn's arc.
// purity < 1 means noise has shrunk the arrow (only the Slicer minigame uses that).
class Lantern {
  constructor(start = '0') { this.reset(start); this.speed = 0.5; }
  reset(k) { this.s = Q.ket(k); this.v = Q.bloch(this.s); this.history = []; this.anims = []; this.spins = []; this.dragV = null; this.purity = 1; }
  get bv() { return Q.bloch(this.s); }
  get busy() { return this.anims.length > 0; }
  turn(gid, dir = 1, opts = {}) {
    const g = Q.GATES[gid], from = this.bv;
    const angle = g.twoWay ? g.angle * (dir < 0 ? -1 : 1) : g.angle;
    this.s = Q.apply(gid, this.s);
    this.history.push({ kind: 'gate', g: gid, axis: g.axis, angle, from, hidden: !!opts.hidden });
    const moved = Q.offAxis(from, g.axis) > 0.05;
    this.anims.push({ from, axis: g.axis, a0: opts.a0 || 0, a1: angle, dur: opts.dur || this.speed, e: 0 });
    if (!moved) this.spins.push({ gid, t: 0 });
    if (!this.silent) Sound.play('turn');
    return moved;
  }
  lastGate() { const h = this.history[this.history.length - 1]; return h && h.kind === 'gate' ? h : null; }
  undo(opts = {}) {
    const h = this.history[this.history.length - 1];
    if (!h) return 'empty';
    if (h.kind === 'tear') { if (!this.silent) Sound.play('blocked'); return 'blocked'; }
    this.history.pop();
    this.s = Q.applyInverse(h.g, this.s);
    this.anims.push({ from: h.from, axis: h.axis, a0: opts.a0 ?? h.angle, a1: 0, dur: opts.dur || this.speed, e: 0 });
    if (Q.offAxis(h.from, h.axis) <= 0.05) this.spins.push({ gid: h.g, t: 0 });
    if (!this.silent) Sound.play('unturn');
    return 'ok';
  }
  look() {
    const from = this.bv, r = Q.measure(this.s);
    this.s = r.state;
    const to = Q.POINTS[r.outcome];
    if (!AT_POLE(from)) this.history.push({ kind: 'tear', from, to });
    this.anims.push({ snap: true, from, to, dur: 0.18, e: 0 });
    return { ...r, wasPole: AT_POLE(from) };
  }
  finish() { this.anims = []; this.v = this.bv; }
  update(dt) {
    for (const s of this.spins) s.t += dt;
    this.spins = this.spins.filter(s => s.t < 1.2);
    if (this.dragV) { this.v = this.dragV; return; }
    const a = this.anims[0];
    if (!a) { this.v = this.bv; return; }
    const hurry = this.anims.length > 2 ? 2.5 : 1;
    a.e = Math.min(1, a.e + dt * hurry / a.dur);
    const k = ease(a.e);
    this.v = a.snap ? Q.norm(Q.vadd(Q.scale(a.from, 1 - k), Q.scale(a.to, k + 1e-6))) : Q.rotate(a.from, a.axis, a.a0 + (a.a1 - a.a0) * k);
    if (a.e >= 1) { this.anims.shift(); if (!this.anims.length) this.v = this.bv; }
  }
}

// ---------------------------------------------------------------------------------------------
// Shared HUD pieces.
function hudTop(title, obj) {
  const hud = $('#hud');
  hud.innerHTML = ''; hud.className = '';
  const top = el('div', 'topbar');
  top.innerHTML = `<div class="lvl">${title || ''}</div><div class="obj">${obj || ''}</div>`;
  const btns = el('div', 'tbtns');
  const book = el('button', 'ibtn', '<i>❖</i><span>Logbook</span>'); book.onclick = () => UI.openCodex();
  const music = el('button', 'ibtn', Save.data.settings.music ? '<i>♪</i>' : '<i class="off">♪</i>');
  music.title = 'Music on/off';
  music.onclick = () => { Save.data.settings.music = !Save.data.settings.music; Save.write(); Music.sync(); music.innerHTML = Save.data.settings.music ? '<i>♪</i>' : '<i class="off">♪</i>'; };
  const menu = el('button', 'ibtn', '<i>≡</i><span>Menu</span>'); menu.onclick = () => Game.openPause();
  btns.append(book, music, menu);
  top.appendChild(btns);
  hud.appendChild(top);
  return hud;
}
const setObjective = html => { const o = $('#hud .obj'); if (o && o._html !== html) { o._html = html; o.innerHTML = html; } };

function oddsMeter(hud) {
  const m = el('div', 'odds');
  m.innerHTML = `<div class="olabel">if the Eye looked now</div><div class="obar"><div class="ohome"></div></div>
    <div class="orow"><span class="oh">Home 50%</span><span class="od">Deep 50%</span></div>`;
  hud.appendChild(m);
  let last = -1;
  return v => {
    const p = Math.round(Q.pHome(v) * 1000) / 1000; if (p === last) return; last = p;
    m.querySelector('.ohome').style.width = (p * 100).toFixed(1) + '%';
    m.querySelector('.oh').textContent = `Home ${Math.round(p * 100)}%`;
    m.querySelector('.od').textContent = `Deep ${Math.round((1 - p) * 100)}%`;
  };
}
function coordsBox(hud) {
  const c = el('div', 'coords');
  hud.appendChild(c);
  return v => {
    c.innerHTML = `<span class="ck">x</span>${v[0].toFixed(2)}<br><span class="ck">y</span>${v[1].toFixed(2)}<br><span class="ck">z</span>${v[2].toFixed(2)}
      <div class="clen">length <b>${Q.len(v).toFixed(2)}</b><br><span>never changes</span></div>`;
  };
}
function renderLog(box, history) {
  box.innerHTML = '<span class="logl">log</span>';
  if (!history.length) { box.appendChild(el('span', 'muted', 'nothing yet')); return; }
  history.forEach((h, i) => {
    if (h.kind === 'tear') { box.appendChild(el('span', 'chip tear', '◉')); return; }
    box.appendChild(el('span', 'chip g' + h.g + (h.storm ? ' storm' : '') + (i === history.length - 1 ? ' last' : ''), Q.GATES[h.g].glyph));
  });
}

// Background: a dark pond at night, with slow motes drifting up.
function pond(ctx, W, H, t) {
  if (!pond.motes) pond.motes = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), s: 0.3 + Math.random(), h: Math.random() }));
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0a1416'); g.addColorStop(0.6, '#10221f'); g.addColorStop(1, '#162a24');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const r = ctx.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.45, Math.max(W, H) * 0.6);
  r.addColorStop(0, 'rgba(120,230,190,0.07)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
  for (const m of pond.motes) {
    const y = ((m.y - t * 0.006 * m.s) % 1 + 1) % 1, x = m.x + Math.sin(t * 0.3 * m.s + m.h * 9) * 0.01;
    ctx.globalAlpha = (0.15 + 0.35 * m.s) * (0.6 + 0.4 * Math.sin(t * 1.3 * m.s + m.h * 20));
    ctx.fillStyle = m.h < 0.25 ? '#ffcf7a' : m.h < 0.4 ? '#c9a2ff' : '#9ff0d0';
    ctx.beginPath(); ctx.arc(x * W, y * H, 1 + m.s * 1.3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

function drawEye(ctx, x, y, w, open, look, t, warn) {
  ctx.save();
  const h = w * 0.42 * open;
  x += warn ? Math.sin(t * 60) * 2 : 0;
  ctx.strokeStyle = GATE_COLOR.EYE; ctx.lineWidth = 3;
  ctx.shadowColor = GATE_COLOR.EYE; ctx.shadowBlur = open > 0.5 ? 25 : 8;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.quadraticCurveTo(x, y - h - 2, x + w / 2, y);
  ctx.quadraticCurveTo(x, y + h + 2, x - w / 2, y);
  ctx.stroke();
  for (let i = -2; i <= 2; i++) { // lashes
    const lx = x + i * w * 0.16, ly = y - (h + 2) * (1 - (i * i) / 6) * 0.95;
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + i * 3, ly - 8 - open * 4); ctx.stroke();
  }
  if (open > 0.05) {
    ctx.save(); ctx.beginPath();
    ctx.moveTo(x - w / 2, y); ctx.quadraticCurveTo(x, y - h - 2, x + w / 2, y); ctx.quadraticCurveTo(x, y + h + 2, x - w / 2, y); ctx.clip();
    const ix = x + (look ? look[0] : 0) * w * 0.18, iy = y + (look ? look[1] : 0) * h * 0.3;
    ctx.fillStyle = '#3a1f5e'; ctx.beginPath(); ctx.arc(ix, iy, w * 0.17, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = GATE_COLOR.EYE; ctx.beginPath(); ctx.arc(ix, iy, w * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ix - w * 0.03, iy - w * 0.03, w * 0.025, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

class Particles {
  constructor() { this.p = []; }
  burst(x, y, color, n = 24, speed = 220) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random());
      this.p.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.6 + Math.random() * 0.5, t: 0, color, r: 1.5 + Math.random() * 2.5 });
    }
  }
  update(dt) { for (const q of this.p) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.96; q.vy *= 0.96; } this.p = this.p.filter(q => q.t < q.life); }
  draw(ctx) {
    for (const q of this.p) { ctx.globalAlpha = 1 - q.t / q.life; ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------------------------------------
const QUIPS = [
  ['nan', 'Is the light <i>really</i> never lost?'],
  ['inchu', 'Every turn can be unturned. Mostly.'],
  ['nan', 'I named the Tilt lever Gerald.'],
  ['inchu', 'Don\'t stare at the Eye. It stares back.'],
  ['nan', 'HZH is just a Flip in a fake moustache.'],
  ['inchu', 'Mind the noise. It makes the light go fuzzy.'],
  ['nan', 'Four Quarters make a whole. I checked.'],
];
class TitleScene {
  enter() {
    this.sv = new SphereView(); this.L = new Lantern('0'); this.L.speed = 0.7; this.L.silent = true; this.t = 0; this.next = 1.2; this.mode = 'fwd';
    const hud = $('#hud'); hud.innerHTML = ''; hud.className = 'title-hud';
    const slot = Save.slot(), hasSave = Save.data.slots.some(Boolean);
    const box = el('div', 'title');
    box.innerHTML = `<div class="logo"><span class="l1">Nothing</span><span class="l2">is lost</span></div>
      <div class="tsub">a little story about a lantern, some levers,<br>and the one thing you can't undo</div>`;
    const menu = el('div', 'tmenu');
    const add = (label, fn, cls = '') => { const b = el('button', 'btn ' + cls, label); b.onclick = () => { Sound.play('tick'); fn(); }; menu.appendChild(b); return b; };
    if (slot) add('Continue', () => Game.continueGame(), 'big');
    add('New game', () => Game.newGameMenu(), slot ? '' : 'big');
    if (hasSave) add('Load game', () => Game.loadMenu());
    add('Minigames', () => Game.minigamesMenu());
    add('Logbook', () => UI.openCodex());
    add('Settings', () => Game.settingsMenu());
    box.appendChild(menu);
    hud.appendChild(box);
    const castL = el('div', 'tcast left', `<div class="bubble-s"></div>${Mascot.inchu()}<div class="tname">Inchu</div>`);
    const castR = el('div', 'tcast right', `<div class="bubble-s"></div>${Mascot.nan()}<div class="tname">Nan</div>`);
    hud.append(castL, castR);
    hud.appendChild(el('div', 'tfoot', 'mouse or touch · headphones on · about 15 minutes'));
    this.quipI = 0; this.quipT = 1.5; this.cast = { inchu: castL, nan: castR };
  }
  layout(W, H) { this.sv.setLayout(W / 2, H * 0.56, Math.min(W * 0.3, H * 0.3)); }
  update(dt) {
    this.t += dt; this.L.update(dt); this.sv.orbit(dt * 0.08, 0);
    this.next -= dt;
    if (this.next <= 0 && !this.L.busy) {
      // Attract mode: turn forward a few times, then play the film backwards.
      if (this.mode === 'fwd') {
        this.L.turn(['X', 'H', 'Z', 'S', 'Y', 'T'][Math.floor(Math.random() * 6)], Math.random() < 0.5 ? 1 : -1);
        if (this.L.history.length >= 6) this.mode = 'back';
        this.next = 0.9;
      } else if (this.L.undo() === 'empty') { this.mode = 'fwd'; this.next = 1.5; } else this.next = 0.15;
    }
    this.quipT -= dt;
    if (this.quipT <= 0) {
      const [who, text] = QUIPS[this.quipI++ % QUIPS.length];
      for (const k in this.cast) { const b = $('.bubble-s', this.cast[k]); b.innerHTML = k === who ? text : ''; b.classList.toggle('on', k === who); }
      this.quipT = 4.2;
    }
  }
  draw(ctx, W, H) {
    pond(ctx, W, H, this.t);
    ctx.globalAlpha = 0.4;
    this.sv.drawGlobe(ctx);
    this.sv.drawTrail(ctx, this.L.history);
    this.sv.drawBeam(ctx, this.L.v);
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------------------------------------
// Dialog over a still sphere. fx functions on lines may change what's shown.
class StoryScene {
  constructor(cfg) { this.cfg = cfg; }
  enter() {
    const c = this.cfg;
    this.sv = new SphereView(); this.t = 0; this.parts = new Particles();
    this.v = Q.POINTS[c.beam || '0']; this.labels = c.labels || [];
    this.eye = c.eye || 0; this.shake = 0; this.wisps = c.wisps || [];
    hudTop(c.title);
    UI.say(c.lines.map(l => {
      const o = UI.norm(l);
      if (o.fx) { const f = o.fx; o.fx = () => f(this); }
      return o;
    }), () => Game.next());
  }
  layout(W, H) { this.sv.setLayout(W / 2, H * 0.4, Math.min(W * 0.3, H * 0.25)); }
  update(dt) { this.t += dt; this.sv.orbit(dt * 0.05, 0); this.parts.update(dt); this.shake *= 0.9; }
  draw(ctx, W, H) {
    pond(ctx, W, H, this.t);
    ctx.save(); ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    if (this.eye) drawEye(ctx, W / 2, H * 0.1, 150, this.eye, [0, 1], this.t, false);
    this.sv.drawGlobe(ctx);
    this.sv.drawLabels(ctx, this.labels);
    for (const w of this.wisps) this.sv.drawWisp(ctx, Q.POINTS[w.at], this.t, w);
    this.sv.drawBeam(ctx, this.v);
    this.parts.draw(ctx);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------------------------
// Puzzle: drag the tip of the light along a lever's ring (or click the lever) to reach the wisp.
class PuzzleScene {
  constructor(cfg) { this.cfg = cfg; }
  enter() {
    const c = this.cfg;
    this.sv = new SphereView(); this.t = 0; this.parts = new Particles(); this.shake = 0;
    this.L = new Lantern(c.start || '0');
    this.labels = c.labels || ['0', '1'];
    this.broken = c.broken || [];
    this.allGates = [...new Set([...(c.steps.flatMap(s => s.gates || [])), ...this.broken])];
    this.gates = []; this.target = null; this.stepI = -1; this.active = false; this.hinted = {};
    this.rewindOK = c.rewind !== false; this.lookOK = !!c.look;
    this.showOdds = !!c.odds; this.showCoords = !!c.coords;
    this.buildHud();
    const go = () => this.storm(() => this.startStep(0));
    if (c.intro) UI.say(this.wrap(c.intro), go); else go();
  }
  wrap(lines) {
    return lines.map(l => {
      const o = UI.norm(l);
      if (o.fx) { const f = o.fx; o.fx = () => f(this); }
      if (typeof o.text === 'function') { const f = o.text; o.text = () => f(this); }
      return o;
    });
  }
  buildHud() {
    const c = this.cfg, hud = hudTop(c.title, '');
    this.oddsFn = oddsMeter(hud); this.oddsEl = hud.querySelector('.odds');
    this.coordsFn = coordsBox(hud); this.coordsEl = hud.querySelector('.coords');
    const bottom = el('div', 'bottom');
    this.logEl = el('div', 'log');
    this.tray = el('div', 'tray');
    bottom.append(this.logEl, this.tray);
    hud.appendChild(bottom);
    this.refreshHud();
  }
  refreshHud() {
    this.oddsEl.hidden = !this.showOdds;
    this.coordsEl.hidden = !this.showCoords;
    this.tray.innerHTML = '';
    for (const gid of this.allGates) {
      const g = Q.GATES[gid], broken = this.broken.includes(gid);
      const b = el('button', `lever g${gid}` + (broken ? ' broken' : ''), `<b>${g.glyph}</b><span>${broken ? 'broken' : g.name}</span>`);
      b.disabled = broken || !this.gates.includes(gid);
      b.onclick = () => this.pull(gid, 1);
      b.onpointerenter = () => this.hoverGate = gid; b.onpointerleave = () => this.hoverGate = null;
      this.tray.appendChild(b);
    }
    if (this.rewindOK) { const b = el('button', 'lever rw', '<b>⟲</b><span>rewind</span>'); b.onclick = () => this.rewind(); this.tray.appendChild(b); }
    if (this.lookOK) { const b = el('button', 'lever look', '<b>◉</b><span>look</span>'); b.onclick = () => this.look(); this.tray.appendChild(b); }
    if (this.rewindOK) { const b = el('button', 'lever reset', '<b>⏮</b><span>rewind all</span>'); b.onclick = () => this.rewindAll(); this.tray.appendChild(b); }
    renderLog(this.logEl, this.L.history);
  }
  storm(done) {
    const st = this.cfg.storm;
    if (!st) return done();
    this.stormQ = st.seq.slice(); this.stormHidden = !!st.hidden;
    this.stormDone = () => { this.stormQ = null; if (st.after) UI.say(this.wrap(st.after), done); else done(); };
  }
  startStep(i) {
    const c = this.cfg, st = c.steps[i];
    if (!st) return this.finish();
    this.stepI = i; this.step = st; this.stepMoves = []; this.stepBase = this.L.history.length;
    if (st.gates) this.gates = st.gates.filter(g => !this.broken.includes(g));
    this.target = st.target || null;
    this.refreshHud();
    const begin = () => { this.active = true; setObjective(st.obj || ''); this.check(); };
    if (st.before) UI.say(this.wrap(st.before), begin); else begin();
  }
  completeStep() {
    const st = this.step; this.active = false;
    if (st.target) {
      const p = this.sv.proj(Q.POINTS[st.target]);
      this.parts.burst(p.x, p.y, '#a9f5ff', 40, 260); Sound.play('deliver');
      const net = this.L.history.length - this.stepBase;
      if (st.par && net <= st.par) UI.toast('Perfect route ✦', 'good');
      this.target = null;
    }
    if (st.unlock) st.unlock.forEach(id => UI.unlock(id));
    const after = typeof st.after === 'function' ? st.after(this) : st.after;
    setTimeout(() => {
      if (after) UI.say(this.wrap(after), () => this.startStep(this.stepI + 1));
      else this.startStep(this.stepI + 1);
    }, st.target ? 700 : 300);
  }
  finish() {
    (this.cfg.unlock || []).forEach(id => UI.unlock(id));
    if (this.cfg.outro) UI.say(this.wrap(this.cfg.outro), () => Game.next()); else Game.next();
  }
  canAct() { return this.active && !UI.blocking && !this.L.busy && !this.grab && !Game.paused; }
  pull(gid, dir, opts) {
    if (!opts && !this.canAct()) return;
    if (!this.gates.includes(gid)) return;
    const moved = this.L.turn(gid, dir, opts);
    this.stepMoves.push(gid);
    renderLog(this.logEl, this.L.history);
    this.onMoved(gid, moved);
  }
  onMoved(gid, moved) {
    const st = this.step;
    const handled = st.onMove ? st.onMove(this, gid, moved) : false;
    if (!moved && !handled && !this.hinted['nomove' + gid]) {
      this.hinted['nomove' + gid] = true;
      UI.hint('inchu', `The ${Q.GATES[gid].name} lever turned, but the light sits right on its axis, so it can't move. Like spinning a wheel: the axle stays put.`);
      Sound.play('nomove');
    }
    if (st.until === 'move') return this.completeStep();
    const net = this.L.history.length - this.stepBase;
    if (st.par && net >= st.par + 3 && !this.hinted.stuck) {
      this.hinted.stuck = true;
      UI.hint('inchu', st.stuck || 'Lost? Wind it back with ⟲ and try another route. Rewinding is free here.', 9000);
    }
  }
  rewind(opts) {
    if (!opts && !this.canAct()) return;
    if (!this.rewindOK) return;
    const r = this.L.undo(opts);
    if (r === 'blocked') {
      this.shake = 14;
      UI.hint('inchu', 'The trail is torn where the Eye looked. You can\'t unlook.');
      if (this.step.until === 'blocked') this.completeStep();
    }
    renderLog(this.logEl, this.L.history);
  }
  rewindAll() {
    if (!this.canAct()) return;
    const n = this.L.history.length;
    for (let i = 0; i < n; i++) if (this.L.undo({ dur: 0.18 }) !== 'ok') break;
    if (this.L.history.length && this.L.history[this.L.history.length - 1].kind === 'tear') {
      this.shake = 14;
      UI.hint('inchu', 'Wound back as far as it goes. Past the tear, the trail is gone.');
      if (this.step.until === 'blocked') this.completeStep();
    }
    renderLog(this.logEl, this.L.history);
  }
  look() {
    if (!this.canAct() || !this.lookOK) return;
    const r = this.L.look();
    this.lastLook = r;
    if (!r.wasPole) { this.shake = 18; Sound.play('collapse'); } else Sound.play('nomove');
    const p = this.sv.proj(Q.POINTS[r.outcome]);
    this.parts.burst(p.x, p.y, GATE_COLOR.EYE, 30);
    renderLog(this.logEl, this.L.history);
    if (this.step.until === 'look') this.completeStep();
  }
  check() {
    if (!this.active || this.L.busy || this.grab) return;
    const st = this.step;
    if (st.until === 'rewound' && this.L.history.length === 0) return this.completeStep();
    if ((!st.until || st.until === 'arrive') && this.target && Q.fidelity(this.L.bv, Q.POINTS[this.target]) > 0.995) this.completeStep();
  }

  // --- tracing ---
  candidates() {
    const p = this.L.bv, list = [];
    for (const gid of this.gates) {
      const g = Q.GATES[gid];
      if (Q.offAxis(p, g.axis) < 0.06) continue;
      list.push({ gid, axis: g.axis, p, tmin: g.twoWay ? -Math.PI : Math.min(0, g.angle), tmax: g.twoWay ? Math.PI : Math.max(0, g.angle), full: Math.abs(g.angle) });
    }
    const h = this.L.lastGate();
    if (this.rewindOK && h && Q.offAxis(p, h.axis) >= 0.06) {
      list.push({ rewind: true, gid: h.g, axis: h.axis, p, tmin: Math.min(0, -h.angle), tmax: Math.max(0, -h.angle), full: Math.abs(h.angle) });
    }
    return list;
  }
  pointerdown(x, y) {
    if (!this.canAct()) { this.orbitFrom = [x, y]; return; }
    const tip = this.sv.proj(this.L.v);
    if (dist2(x, y, tip.x, tip.y) < 34 * 34) {
      this.grab = { sx: tip.x, sy: tip.y, rails: this.candidates(), rail: null, t: 0 };
      if (!this.grab.rails.length) {
        this.grab = null;
        UI.hint('inchu', this.gates.length ? 'None of your levers can move the light from here. Try pulling one from the tray.' : 'The levers are jammed. Only the trail can be wound back.');
      }
    } else this.orbitFrom = [x, y];
  }
  pointermove(x, y) {
    if (this.orbitFrom) {
      this.sv.orbit(-(x - this.orbitFrom[0]) * 0.008, (y - this.orbitFrom[1]) * 0.008);
      this.orbitFrom = [x, y]; return;
    }
    const g = this.grab; if (!g) return;
    if (!g.rail) {
      const dx = x - g.sx, dy = y - g.sy, d = Math.hypot(dx, dy);
      if (d < 10) return;
      let best = null, bs = 0.45;
      for (const r of g.rails) {
        const a = this.sv.proj(r.p), b = this.sv.proj(Q.rotate(r.p, r.axis, 0.06));
        let tx = b.x - a.x, ty = b.y - a.y; const tl = Math.hypot(tx, ty); if (tl < 0.5) continue;
        tx /= tl; ty /= tl;
        const bonus = r.rewind ? 0.1 : 0;
        if (r.tmax > 0) { const s = (dx * tx + dy * ty) / d + bonus; if (s > bs) { bs = s; best = r; } }
        if (r.tmin < 0) { const s = -(dx * tx + dy * ty) / d + bonus; if (s > bs) { bs = s; best = r; } }
      }
      if (!best) return;
      g.rail = best; g.t = 0;
    }
    const r = g.rail;
    const scr = t => this.sv.proj(Q.rotate(r.p, r.axis, t));
    // Follow the pointer along the ring with a local search, so the light can't jump across.
    let bt = g.t, bd = Infinity;
    for (let t = Math.max(r.tmin, g.t - 0.4); t <= Math.min(r.tmax, g.t + 0.4); t += 0.01) {
      const p = scr(t), d = dist2(x, y, p.x, p.y);
      if (d < bd) { bd = d; bt = t; }
    }
    g.t = bt;
    if (Math.abs(g.t) < 0.05 && bd > 40 * 40) { g.rail = null; g.t = 0; this.L.dragV = null; return; }
    this.L.dragV = Q.rotate(r.p, r.axis, g.t);
  }
  pointerup() {
    this.orbitFrom = null;
    const g = this.grab; if (!g) return;
    this.grab = null; this.L.dragV = null;
    const r = g.rail; if (!r) return;
    if (Math.abs(g.t) >= 0.72 * r.full) {
      if (r.rewind) this.rewind({ a0: this.L.lastGate().angle + g.t });
      else this.pull(r.gid, g.t < 0 ? -1 : 1, { a0: g.t });
    } else {
      this.L.anims.push({ from: r.p, axis: r.axis, a0: g.t, a1: 0, dur: 0.25, e: 0 });
    }
  }
  key(e) {
    const k = e.key.toLowerCase();
    if (UI.blocking) return;
    const map = { x: 'X', z: 'Z', h: 'H', s: 'S', y: 'Y', t: 'T' };
    if (map[k]) this.pull(map[k], 1);
    else if (k === 'l') this.look();
    else if (k === 'backspace' || k === 'u' || k === 'r') { e.preventDefault(); this.rewind(); }
  }

  layout(W, H) {
    const small = W < 700;
    this.sv.setLayout(W / 2, small ? H * 0.42 : H * 0.46, Math.min(W * 0.36, H * 0.28));
  }
  update(dt) {
    this.t += dt; this.L.update(dt); this.parts.update(dt); this.shake *= 0.88;
    if (this.stormQ && !this.L.busy) {
      if (this.stormQ.length) {
        const gid = this.stormQ.shift();
        this.L.turn(gid, Math.random() < 0.5 ? 1 : -1, { hidden: this.stormHidden, dur: 0.55 });
        this.L.history[this.L.history.length - 1].storm = true;
        this.shake = 16; renderLog(this.logEl, this.L.history);
      } else this.stormDone();
    }
    this.check();
    if (this.showOdds) this.oddsFn(this.L.v);
    if (this.showCoords) this.coordsFn(this.L.v);
  }
  draw(ctx, W, H) {
    pond(ctx, W, H, this.t);
    ctx.save(); ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    const sv = this.sv;
    sv.drawGlobe(ctx);
    for (const gid of this.allGates) if (!this.broken.includes(gid) && gid !== 'S') sv.drawAxis(ctx, gid, this.gates.includes(gid) ? 0.45 : 0.12);
    sv.drawLabels(ctx, this.labels);
    sv.drawTrail(ctx, this.L.history);
    if (!this.L.busy || this.grab) {
      const g = this.grab;
      const rails = g ? (g.rail ? [g.rail] : g.rails) : (this.active && !UI.blocking ? this.candidates() : []);
      for (const r of rails) {
        const hot = (g && g.rail === r) || this.hoverGate === r.gid;
        if (r.rewind) { sv.path3(ctx, sv.arcPoints(r.p, r.axis, r.tmin, r.tmax, 48), '#ffffff', hot ? 3 : 2, hot ? 0.9 : 0.55, 0.2, [4, 6]); continue; }
        sv.path3(ctx, sv.arcPoints(r.p, r.axis, r.tmin, r.tmax, 80), GATE_COLOR[r.gid], hot ? 3.5 : 2, hot ? 0.95 : 0.4, hot ? 0.3 : 0.12);
        if (hot) for (const end of [r.tmin, r.tmax]) if (end !== 0) {
          const p = sv.proj(Q.rotate(r.p, r.axis, end));
          ctx.strokeStyle = GATE_COLOR[r.gid]; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, Math.PI * 2); ctx.stroke();
        }
      }
    }
    for (const s of this.L.spins) sv.drawSpinRing(ctx, s.gid, s.t * 5, Math.max(0, 1 - s.t / 1.2));
    if (this.target) sv.drawWisp(ctx, Q.POINTS[this.target], this.t, { name: this.step && this.step.wispName || 'wisp' });
    sv.drawBeam(ctx, this.L.v, { grabbable: this.canAct() && this.candidates().length > 0 });
    this.parts.draw(ctx);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------------------------
// Slicer: levers fly up like fruit. Hold and swipe to cut them; cut gates apply in order.
// Hazards: the Eye's gaze (measurement, story only) and Noise (decoherence, the minigame).
class SlicerScene {
  constructor(cfg) { this.cfg = cfg; }
  enter() {
    const c = this.cfg;
    this.sv = new SphereView(); this.t = 0; this.parts = new Particles(); this.shake = 0;
    this.L = new Lantern(c.start || '0'); this.L.speed = 0.16;
    this.gates = c.gates; this.broken = c.broken || [];
    this.tokens = []; this.halves = []; this.trail = []; this.down = false; this.stroke = null;
    this.score = 0; this.delivered = 0; this.timeLeft = c.time || 60; this.spawnT = 0.6;
    this.running = false; this.popups = []; this.targetAge = 0; this.flash = 0;
    this.stage = 0; this.eyeT = 0; this.eyePhase = 'closed'; this.eyeOpen = 0; this.streak = 0;
    this.buildHud();
    this.target = c.finale ? pointTarget(c.stages[0].target) : this.pickTarget();
    const go = () => { this.running = true; };
    if (c.intro) UI.say(c.intro.map(UI.norm), go); else go();
  }
  buildHud() {
    const c = this.cfg, hud = hudTop(c.title, '');
    hud.classList.add('rush');
    this.oddsFn = oddsMeter(hud);
    this.info = el('div', 'rushinfo'); hud.appendChild(this.info);
    const bottom = el('div', 'bottom');
    this.logEl = el('div', 'log');
    const tray = el('div', 'tray');
    const rw = el('button', 'lever rw', '<b>⟲</b><span>rewind · space</span>');
    rw.onpointerdown = e => { e.stopPropagation(); this.rewind(); };
    tray.appendChild(rw);
    bottom.append(this.logEl, tray);
    hud.appendChild(bottom);
    renderLog(this.logEl, []);
  }
  pickTarget() {
    const c = this.cfg; this.targetAge = 0; this.routeKey = null;
    if (c.freeTargets) {
      const v = this.L.bv;
      for (let tries = 0; tries < 30; tries++) {
        let p = v; const n = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) { const g = Q.GATES[this.gates[Math.floor(Math.random() * this.gates.length)]]; p = Q.rotate(p, g.axis, g.angle); }
        if (Q.dot(p, v) < 0.9) return { v: p, label: nameOf(p) };
      }
    }
    const cur = Q.nearest(this.L.bv), pool = c.pool || ['0', '1'];
    const opts = pool.filter(k => k !== cur).map(k => [k, Q.shortestPath(cur, k, this.gates)]).filter(([, p]) => p && p.length >= 1 && p.length <= 3);
    const pick = opts[Math.floor(Math.random() * opts.length)];
    return pointTarget(pick ? pick[0] : (cur === '0' ? '1' : '0'));
  }
  route() {
    if (!this.target) return [];
    const bv = this.L.bv, key = bv.map(x => x.toFixed(3)).join() + '|' + this.target.label;
    if (key !== this.routeKey) { this.routeKey = key; this.routeCache = Q.routeTo(bv, this.target.v, this.gates, 4) || []; }
    return this.routeCache;
  }
  grav(H) { return 1100 * (H / 900); }
  spawn(W, H) {
    const c = this.cfg, gr = this.grav(H);
    const launch = (x, kind, vx, apexY) => {
      const vy = -Math.sqrt(2 * gr * (H + 40 - apexY));
      this.tokens.push({ kind, x, y: H + 40, vx, vy, r: Math.max(26, Math.min(34, W * 0.035)), rot: 0, vr: (Math.random() - 0.5) * 2 });
    };
    const apex = () => H * (0.14 + Math.random() * 0.38);
    const route = this.route();
    const rand = () => this.gates[Math.floor(Math.random() * this.gates.length)];
    const cons = (c.constellations || []).filter(s => s.every(g => this.gates.includes(g)));
    if (route.length >= 2) cons.push(route);
    if (cons.length && Math.random() < (c.consRate ?? 0.3)) {
      const seq = cons[Math.floor(Math.random() * cons.length)];
      const gap = Math.min(85, W * 0.11), x0 = W * (0.2 + Math.random() * 0.6) - gap * (seq.length - 1) / 2;
      const vx = (Math.random() - 0.5) * 60, ay = apex();
      seq.forEach((g, i) => launch(x0 + i * gap, g, vx, ay));
      return;
    }
    const n = 1 + (Math.random() < 0.45 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const kind = route.length && Math.random() < 0.5 ? route[0] : rand();
      const x = W * (0.12 + Math.random() * 0.76);
      launch(x, kind, (W / 2 - x) * (0.2 + Math.random() * 0.3), apex());
    }
    const side = kind => { const x = W * (0.15 + Math.random() * 0.7); launch(x, kind, (W / 2 - x) * 0.3, apex()); };
    if (c.eye && Math.random() < c.eye) side('EYE');
    if (c.noise && Math.random() < c.noise) side('NOISE');
    if (c.qec && this.L.purity < 0.95 && Math.random() < c.qec) side('QEC');
  }
  cut(tok) {
    tok.cut = true;
    Sound.play('slice');
    for (const side of [-1, 1]) this.halves.push({ kind: tok.kind, x: tok.x, y: tok.y, vx: tok.vx + side * 120, vy: tok.vy - 100, rot: tok.rot, vr: side * 4, side, r: tok.r, t: 0 });
    this.parts.burst(tok.x, tok.y, GATE_COLOR[tok.kind], 14, 180);
    if (tok.kind === 'EYE') { this.stroke && this.stroke.cuts.push('|'); this.eyeLook('token'); return; }
    if (tok.kind === 'NOISE') { this.stroke && this.stroke.cuts.push('|'); return this.noiseHit(); }
    if (tok.kind === 'QEC') {
      this.L.purity = 1; this.popup('Error correction! Coherence restored', '#7dffb0'); Sound.play('heal');
      UI.unlock('noise'); return;
    }
    this.L.turn(tok.kind, 1);
    if (tok.kind === 'Y') UI.unlock('Y'); else if (tok.kind === 'T' || tok.kind === 'Tdg') UI.unlock('T');
    if (this.stroke) this.stroke.cuts.push(tok.kind);
    renderLog(this.logEl, this.L.history.slice(-14));
  }
  noiseHit() {
    this.L.purity *= 0.7; this.shake = 14; this.streak = 0;
    Sound.play('noise'); UI.unlock('noise');
    this.popup(`Noise! The light blurs (coherence ${Math.round(this.L.purity * 100)}%)`, '#c9d3d4');
    if (!this.hintedNoise) { this.hintedNoise = true; UI.hint('inchu', 'Noise doesn\'t turn the light, it <b>shrinks</b> it. No lever can stretch it back. Only error correction (the green shield) can.', 7500); }
    if (this.L.purity < 0.3) this.timeout('The light faded into noise');
  }
  eyeLook(src) {
    this.L.finish();
    const before = this.L.bv;
    if (AT_POLE(before)) {
      this.L.look();
      this.popup('Safe glance: the Eye saw only what was already true', '#e7d6ff');
      if (src === 'token') this.score += 50;
      Sound.play('nomove');
      return { safe: true };
    }
    const r = this.L.look();
    this.flash = 1; this.shake = 22; Sound.play('collapse'); this.streak = 0;
    const odds = Math.round((r.outcome === '0' ? r.p0 : 1 - r.p0) * 100);
    this.popup(`The Eye looked! Collapsed to ${r.outcome === '0' ? 'Home' : 'the Deep'} (a ${odds}% chance)`, '#e7d6ff');
    renderLog(this.logEl, this.L.history.slice(-14));
    if (src === 'token' && !this.hintedEye) { this.hintedEye = true; UI.hint('inchu', 'The trail is torn where it looked: you can\'t rewind past that. Only let it look when the light is at Home or the Deep.', 7000); }
    return { safe: false, outcome: r.outcome };
  }
  endStroke() {
    const s = this.stroke; this.stroke = null;
    if (!s) return;
    for (const part of s.cuts.join(',').split('|')) {
      const cuts = part.split(',').filter(Boolean);
      for (const id of Q.findIdentities(cuts)) {
        const fresh = UI.unlock('id:' + id.seq);
        if (id.seq === 'HZH' || id.seq === 'HXH') UI.unlock('disguise');
        const res = id.is === 'I' ? 'I' : Q.GATES[id.is].glyph;
        this.score += fresh ? 150 : 50;
        this.popup(`${Q.decode(id.seq).map(g => Q.GATES[g].glyph).join('')} = ${res} · ${id.title}${fresh ? ' · new!' : ''}`, '#b8f5c8');
        Sound.play('combo');
      }
    }
    const n = s.cuts.filter(k => k !== '|').length;
    if (n >= 3) this.popup(`${n}-lever swipe`, '#ffe2a8');
  }
  rewind() {
    if (!this.running || UI.blocking) return;
    const r = this.L.undo({ dur: 0.14 });
    if (r === 'blocked') { this.shake = 10; this.popup('Torn by the Eye: you can\'t unlook', '#e7d6ff'); }
    renderLog(this.logEl, this.L.history.slice(-14));
  }
  popup(text, color) { this.popups.push({ text, color, t: 0 }); if (this.popups.length > 4) this.popups.shift(); }

  deliver() {
    const p = this.sv.proj(this.target.v);
    this.parts.burst(p.x, p.y, '#a9f5ff', 40, 300); Sound.play('deliver');
    const c = this.cfg;
    if (c.finale) return this.finaleArrive();
    this.delivered++; this.streak++;
    const mult = Math.min(4, 1 + Math.floor(this.streak / 3)), pts = 100 * mult;
    this.score += pts;
    this.popup(`+${pts} wisp guided home${mult > 1 ? ` · streak ×${mult}` : ''}`, '#a9f5ff');
    if (c.endless) this.timeLeft = Math.min(c.time, this.timeLeft + 3);
    if (this.delivered >= c.goal && !c.endless) return this.win();
    this.target = this.pickTarget();
  }
  win() {
    this.running = false; this.tokens = [];
    setTimeout(() => {
      (this.cfg.unlock || []).forEach(id => UI.unlock(id));
      if (this.cfg.outro) UI.say(this.cfg.outro.map(UI.norm), () => Game.next()); else Game.next();
    }, 600);
  }
  timeout(reason) {
    if (!this.running) return;
    this.running = false; this.tokens = [];
    const c = this.cfg;
    if (c.endless) Game.recordBest('slicer', this.score);
    Game.resultPanel({
      title: reason || (c.endless ? 'Dawn' : 'The night runs out'),
      who: c.endless ? 'nan' : 'inchu',
      text: c.endless
        ? `${this.delivered} wisps guided. Score <b>${this.score}</b>. Best <b>${Save.data.best.slicer}</b>.`
        : `${this.delivered} of ${c.goal} wisps guided home. The rest will wait for tomorrow.`,
      story: !c.endless,
    });
  }

  // --- finale: the Eye opens on a rhythm, Pell waits in the Deep ---
  finaleArrive() {
    const c = this.cfg, st = c.stages[this.stage];
    this.running = false; this.tokens = [];
    const lines = typeof st.after === 'function' ? st.after(this) : st.after;
    UI.say(lines.map(UI.norm), () => {
      this.stage++;
      const nx = c.stages[this.stage];
      if (!nx) return this.finaleEnd();
      this.target = pointTarget(nx.target); this.eyePhase = 'closed'; this.eyeT = 0; this.running = true;
    });
  }
  finaleEnd() {
    this.ending = true; this.eyePhase = 'open'; this.eyeT = 0;
    setTimeout(() => {
      this.L.look();
      this.popup('The Eye looks. Home: 100%', '#e7d6ff');
      Sound.play('chime');
      setTimeout(() => UI.say(this.cfg.outro.map(UI.norm), () => Game.next()), 1600);
    }, 1800);
  }
  eyeCycle(dt) {
    const cyc = this.cfg.eyeCycle || [5.5, 1.3, 1.1];
    this.eyeT += dt;
    if (this.eyePhase === 'closed' && this.eyeT > cyc[0]) { this.eyePhase = 'warn'; this.eyeT = 0; Sound.play('warn'); }
    else if (this.eyePhase === 'warn' && this.eyeT > cyc[1]) {
      this.eyePhase = 'open'; this.eyeT = 0;
      const r = this.eyeLook('cycle');
      if (!r.safe && this.stage === 1) {
        if (r.outcome === '1') UI.hint('inchu', 'He fell back into the Deep. Not gone. Never gone. Again.', 6000);
        else this.luckyHome = true;
      }
      if (!r.safe && this.stage === 0 && r.outcome === '1') this.luckyDeep = true;
    } else if (this.eyePhase === 'open' && this.eyeT > cyc[2]) { this.eyePhase = 'closed'; this.eyeT = 0; }
  }

  pointerdown(x, y, e) {
    if (e && e.button === 2) { this.rewind(); return; }
    this.down = true; this.trail = [[x, y, this.t]];
    this.stroke = { cuts: [] };
  }
  pointermove(x, y) {
    if (!this.down || !this.running) return;
    const prev = this.trail[this.trail.length - 1];
    this.trail.push([x, y, this.t]);
    if (this.trail.length > 14) this.trail.shift();
    for (const tok of this.tokens) {
      if (tok.cut) continue;
      // segment-circle hit test
      const dx = x - prev[0], dy = y - prev[1], fx = prev[0] - tok.x, fy = prev[1] - tok.y;
      const a = dx * dx + dy * dy || 1e-6, b = 2 * (fx * dx + fy * dy), cc = fx * fx + fy * fy - tok.r * tok.r;
      const disc = b * b - 4 * a * cc;
      let hit = cc < 0;
      if (!hit && disc >= 0) { const s = Math.sqrt(disc), t1 = (-b - s) / (2 * a), t2 = (-b + s) / (2 * a); hit = (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1); }
      if (hit) this.cut(tok);
    }
  }
  pointerup() { this.down = false; this.endStroke(); }
  key(e) { if (e.key === ' ' || e.key === 'Backspace') { e.preventDefault(); this.rewind(); } }

  layout(W, H) { this.W = W; this.H = H; this.sv.setLayout(W / 2, H * (this.cfg.finale ? 0.42 : 0.38), Math.min(W * 0.3, H * 0.2)); }
  update(dt) {
    const c = this.cfg, W = this.W, H = this.H;
    this.t += dt; this.L.update(dt); this.parts.update(dt); this.shake *= 0.88; this.flash = Math.max(0, this.flash - dt * 2);
    this.popups.forEach(p => p.t += dt); this.popups = this.popups.filter(p => p.t < 2.4);
    for (const h of this.halves) { h.t += dt; h.vy += this.grav(H) * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.rot += h.vr * dt; }
    this.halves = this.halves.filter(h => h.y < H + 80 && h.t < 3);
    this.oddsFn(this.L.v);
    const eyeTarget = this.eyePhase === 'open' ? 1 : this.eyePhase === 'warn' ? 0.18 : 0;
    this.eyeOpen += (eyeTarget - this.eyeOpen) * Math.min(1, dt * 10);
    if (!this.running || UI.blocking) { this.hudInfo(); return; }
    if (!c.finale) { this.timeLeft -= dt; if (this.timeLeft <= 0) { this.timeLeft = 0; this.hudInfo(); return this.timeout(); } }
    else this.eyeCycle(dt);
    this.spawnT -= dt;
    if (this.spawnT <= 0) { this.spawn(W, H); this.spawnT = (c.spawnEvery || 1.0) * (0.75 + Math.random() * 0.5); }
    const gr = this.grav(H);
    for (const tok of this.tokens) { tok.vy += gr * dt; tok.x += tok.vx * dt; tok.y += tok.vy * dt; tok.rot += tok.vr * dt; }
    this.tokens = this.tokens.filter(t => !t.cut && t.y < H + 60);
    this.targetAge += dt;
    if (!this.L.busy && this.target && Q.fidelity(this.L.bv, this.target.v) > 0.995) this.deliver();
    this.hudInfo();
  }
  hudInfo() {
    const c = this.cfg;
    const route = this.route();
    const showRoute = this.targetAge > (c.routeAfter ?? 6) && route.length;
    let html;
    if (c.finale) {
      const st = c.stages[Math.min(this.stage, c.stages.length - 1)];
      html = `<div class="big">${st.label || ''}</div>`;
      setObjective(st.obj);
    } else {
      html = `<div class="big">${this.delivered}<span>/${c.endless ? '∞' : c.goal} wisps</span></div>
        <div class="tbar"><div style="width:${(this.timeLeft / (c.time || 60)) * 100}%"></div></div>
        <div class="srow">score <b>${this.score}</b></div>`;
      if (c.noise) html += `<div class="srow">coherence <b>${Math.round(this.L.purity * 100)}%</b></div><div class="tbar coh"><div style="width:${this.L.purity * 100}%"></div></div>`;
      setObjective(this.target ? `next wisp at <b class="ket">${this.target.label}</b>` : '');
    }
    if (showRoute) html += `<div class="route">route ${route.map(g => `<span class="chip g${g}">${Q.GATES[g].glyph}</span>`).join(' ')}</div>`;
    if (this.broken.length) html += `<div class="muted small">${this.broken.map(g => Q.GATES[g].name).join(', ')} lever broken</div>`;
    if (html !== this.lastInfo) { this.info.innerHTML = html; this.lastInfo = html; }
  }
  draw(ctx, W, H) {
    const c = this.cfg, sv = this.sv;
    pond(ctx, W, H, this.t);
    ctx.save(); ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    if (c.finale) {
      const v = this.L.v, look = [Q.dot(v, sv.r), -Q.dot(v, sv.u)];
      drawEye(ctx, W / 2, H * 0.14, Math.min(200, W * 0.3), Math.max(this.eyeOpen, 0.02), look, this.t, this.eyePhase === 'warn');
      if (this.eyePhase === 'warn') {
        ctx.fillStyle = '#e7d6ff'; ctx.font = '600 16px "Pixelify Sans", monospace'; ctx.textAlign = 'center';
        ctx.fillText(AT_POLE(this.L.bv) ? 'the Eye is opening · you are safe at a pole' : 'THE EYE IS OPENING · get to Home or the Deep!', W / 2, H * 0.14 + 58);
      }
    }
    sv.drawGlobe(ctx);
    sv.drawLabels(ctx, c.labels || ['0', '1', '+', '-']);
    sv.drawTrail(ctx, this.L.history.slice(-6));
    if (this.target && !this.ending) sv.drawWisp(ctx, this.target.v, this.t, { name: c.finale ? c.stages[this.stage].wispName : 'wisp' });
    if (c.finale && this.stage === 1) sv.drawWisp(ctx, this.L.v, this.t, { name: 'Pell', color: '#ffd1e6' });
    if (c.finale && this.ending) sv.drawWisp(ctx, this.L.v, this.t, { name: 'Pell, home', color: '#ffd1e6' });
    for (const s of this.L.spins) sv.drawSpinRing(ctx, s.gid, s.t * 5, Math.max(0, 1 - s.t / 1.2));
    const pur = this.L.purity;
    sv.drawBeam(ctx, Q.scale(this.L.v, pur), pur < 1 ? { color: `rgba(255,226,168,${0.4 + 0.6 * pur})` } : {});
    if (pur < 0.999) { // ghost of where a pure light would reach
      const tip = sv.proj(this.L.v);
      ctx.save(); ctx.setLineDash([3, 5]); ctx.strokeStyle = 'rgba(255,226,168,0.35)'; ctx.beginPath(); ctx.arc(tip.x, tip.y, 9, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    for (const tok of this.tokens) this.drawToken(ctx, tok.x, tok.y, tok.r, tok.kind, tok.rot, 0);
    for (const h of this.halves) { ctx.globalAlpha = Math.max(0, 1 - h.t / 1.5); this.drawToken(ctx, h.x, h.y, h.r, h.kind, h.rot, h.side); ctx.globalAlpha = 1; }
    if (this.trail.length > 1 && this.down) {
      ctx.lineCap = 'round';
      for (let i = 1; i < this.trail.length; i++) {
        ctx.globalAlpha = i / this.trail.length; ctx.lineWidth = 1 + 6 * i / this.trail.length;
        ctx.strokeStyle = i > this.trail.length - 4 ? '#ffffff' : '#9ff0d0';
        ctx.beginPath(); ctx.moveTo(this.trail[i - 1][0], this.trail[i - 1][1]); ctx.lineTo(this.trail[i][0], this.trail[i][1]); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    this.parts.draw(ctx);
    ctx.textAlign = 'center'; ctx.font = '600 18px "Pixelify Sans", monospace';
    this.popups.forEach((p, i) => {
      ctx.globalAlpha = Math.min(1, 2.4 - p.t); ctx.fillStyle = p.color;
      ctx.fillText(p.text, W / 2, sv.cy + sv.R + 50 + i * 26 - p.t * 10);
    });
    ctx.globalAlpha = 1;
    ctx.restore();
    if (this.flash > 0) { ctx.fillStyle = `rgba(201,162,255,${this.flash * 0.35})`; ctx.fillRect(0, 0, W, H); }
  }
  drawToken(ctx, x, y, r, kind, rot, side) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    if (side) { ctx.beginPath(); ctx.rect(side < 0 ? -r - 2 : 0, -r - 2, r + 2, 2 * r + 4); ctx.clip(); }
    const col = GATE_COLOR[kind];
    ctx.fillStyle = 'rgba(10,22,22,0.88)'; ctx.strokeStyle = col; ctx.lineWidth = 3;
    ctx.shadowColor = col; ctx.shadowBlur = 14;
    if (kind === 'NOISE') {
      ctx.beginPath();
      for (let i = 0; i <= 14; i++) { const a = i / 14 * Math.PI * 2, rr = r * (0.82 + 0.18 * Math.sin(i * 2.7 + this.t * 6)); ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.strokeStyle = '#c9d3d4'; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i < 9; i++) { const xx = -r * 0.5 + i * r / 8, yy = Math.sin(i * 2.3 + this.t * 20) * r * 0.3; ctx[i ? 'lineTo' : 'moveTo'](xx, yy); }
      ctx.stroke();
      ctx.fillStyle = '#c9d3d4'; ctx.font = `${r * 0.3}px "Pixelify Sans", monospace`; ctx.textAlign = 'center'; ctx.fillText('noise', 0, r * 0.62);
      ctx.restore(); return;
    }
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0; ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (kind === 'EYE') {
      ctx.beginPath(); ctx.moveTo(-r * 0.6, 0); ctx.quadraticCurveTo(0, -r * 0.6, r * 0.6, 0); ctx.quadraticCurveTo(0, r * 0.6, -r * 0.6, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2); ctx.fill();
    } else if (kind === 'QEC') {
      ctx.beginPath(); ctx.moveTo(0, -r * 0.55); ctx.lineTo(r * 0.45, -r * 0.35); ctx.lineTo(r * 0.38, r * 0.2); ctx.lineTo(0, r * 0.55); ctx.lineTo(-r * 0.38, r * 0.2); ctx.lineTo(-r * 0.45, -r * 0.35); ctx.closePath(); ctx.stroke();
      ctx.font = `600 ${r * 0.34}px "Pixelify Sans", monospace`; ctx.fillText('QEC', 0, 0);
    } else {
      ctx.font = `600 ${r * 0.8}px "IBM Plex Mono", monospace`; ctx.fillText(Q.GATES[kind].glyph, 0, -3);
      ctx.font = `${r * 0.3}px "Shantell Sans", cursive`; ctx.fillText(Q.GATES[kind].name.toLowerCase(), 0, r * 0.56);
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------------------------
// The dark lighthouse: an AND gate forgets, a Flip doesn't.
class AndScene {
  constructor(cfg) { this.cfg = cfg; }
  enter() {
    this.t = 0; this.phase = 'intro'; this.pick = null;
    hudTop(this.cfg.title, '');
    UI.say(this.cfg.intro.map(UI.norm), () => this.ask());
  }
  ask() {
    this.phase = 'and';
    setObjective('The AND-machine shows <b>0</b>. Which two lamps went in?');
    const p = el('div', 'panel andq');
    p.innerHTML = '<p>The machine\'s lamp is <b>dark (0)</b>. What went in?</p>';
    const row = el('div', 'trow');
    ['0 0', '0 1', '1 0', '1 1'].forEach(k => {
      const b = el('button', 'btn', k);
      b.onclick = () => {
        this.pick = k;
        if (k === '1 1') { p.querySelector('p').innerHTML = 'Not that one: two lit lamps make the AND-machine light up (1). Pick again.'; Sound.play('nope'); return; }
        p.remove(); this.phase = 'reveal'; Sound.play('chime');
        const others = ['0 0', '0 1', '1 0'].filter(x => x !== k);
        UI.say([
          ['nan', `${k}? That has to be it!`],
          ['inchu', `Could be. But ${others[0]} gives the same dark lamp. So does ${others[1]}.`],
          ['inchu', 'Three different roads all end at the same dark lamp. Standing at the end, nobody can tell which road you came down.'],
          { who: 'inchu', text: 'Now our Flip. One road into each answer, one road out. Read it backwards and you always know where you came from.', fx: () => { this.phase = 'x'; } },
        ].map(UI.norm), () => UI.say(this.cfg.outro.map(UI.norm), () => { UI.unlock('info'); Game.next(); }));
      };
      row.appendChild(b);
    });
    p.appendChild(row);
    $('#hud').appendChild(p);
  }
  layout(W, H) { this.W = W; this.H = H; }
  update(dt) { this.t += dt; }
  draw(ctx, W, H) {
    pond(ctx, W, H, this.t);
    if (this.phase === 'intro') return;
    const cx = W / 2, top = H * 0.2, h = H * 0.4, colL = cx - Math.min(220, W * 0.3), colR = cx + Math.min(220, W * 0.3);
    ctx.font = '600 22px "Pixelify Sans", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const label = (t, x, y, c = '#e4f5ec') => { ctx.fillStyle = c; ctx.fillText(t, x, y); };
    if (this.phase !== 'x') {
      const ins = ['0 0', '0 1', '1 0', '1 1'], outs = { '0': top + h * 0.3, '1': top + h * 0.85 };
      label('in', colL, top - 34, '#86a39d'); label('AND out', colR, top - 34, '#86a39d');
      ins.forEach((k, i) => {
        const y = top + h * i / 3, o = k === '1 1' ? '1' : '0';
        const hot = this.phase === 'reveal' && o === '0';
        ctx.strokeStyle = hot ? '#ff8a7a' : 'rgba(205,245,230,0.3)'; ctx.lineWidth = hot ? 3 : 1.5;
        ctx.beginPath(); ctx.moveTo(colL + 40, y); ctx.lineTo(colR - 30, outs[o]); ctx.stroke();
        label(k, colL, y, this.pick === k ? '#ffcf7a' : '#e4f5ec');
      });
      for (const [o, y] of Object.entries(outs)) {
        ctx.fillStyle = o === '1' ? '#ffcf7a' : '#2c4446'; ctx.beginPath(); ctx.arc(colR, y, 18, 0, Math.PI * 2); ctx.fill();
        label(o, colR, y, o === '1' ? '#1a1a1a' : '#e4f5ec');
      }
      if (this.phase === 'reveal') label('3 roads → 1 answer · no way back', cx, top + h + 54, '#ff8a7a');
    } else {
      label('in', colL, top - 34, '#86a39d'); label('Flip (X) out', colR, top - 34, '#86a39d');
      const ys = [top + h * 0.25, top + h * 0.75];
      [['0', '1'], ['1', '0']].forEach(([a, b], i) => {
        ctx.strokeStyle = '#6ef0c0'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(colL + 30, ys[i]); ctx.lineTo(colR - 30, ys[1 - i]); ctx.stroke();
        label(a, colL, ys[i]); label(b, colR, ys[1 - i]);
      });
      label('1 road → 1 answer · always a way back', cx, top + h + 54, '#6ef0c0');
    }
  }
}

// ---------------------------------------------------------------------------------------------
class EndingScene {
  enter() {
    this.t = 0; this.sv = new SphereView(); this.L = new Lantern('0');
    const hud = $('#hud'); hud.innerHTML = ''; hud.className = '';
    const box = el('div', 'panel ending');
    box.innerHTML = `<div class="ecast">${Mascot.inchu('happy')}${Mascot.pell()}${Mascot.nan('happy')}</div>
      <div class="logo small"><span class="l1">Nothing</span><span class="l2">is lost</span></div>
      <h3>What the Glassmoon taught you</h3>
      <ol>
        <li>A qubit is an arrow pointing at a spot on a sphere (the <b>Bloch sphere</b>). Up is |0⟩, down is |1⟩.</li>
        <li>Quantum gates are <b>rotations</b> of that sphere. X, Z and H are half turns about three different axes; S is a quarter turn.</li>
        <li>Rotations never shrink or stretch the arrow, so nothing is ever forgotten. Gates are <b>unitary</b>: U†U = I.</li>
        <li>So every gate can be undone. X, Z and H undo themselves; S needs S† (or SSS).</li>
        <li>To undo a sequence, undo it <b>in reverse order</b>, like a film run backwards.</li>
        <li>Order matters: HX ≠ XH.</li>
        <li><b>Phase</b> is a real difference the Eye can't see (|+⟩ vs |−⟩), and an H makes it visible.</li>
        <li>Disguises: HZH = X, HXH = Z, SS = Z.</li>
        <li>Classical AND forgets its inputs, so it can't be reversed. Quantum gates are one-to-one.</li>
        <li><b>Measurement</b> is the one step that can't be undone, unless the arrow was already at a pole.</li>
      </ol>`;
    const row = el('div', 'trow');
    const a = el('button', 'btn big', 'Minigames'); a.onclick = () => Game.minigamesMenu();
    const b = el('button', 'btn', 'Logbook'); b.onclick = () => UI.openCodex();
    const c = el('button', 'btn', 'Title'); c.onclick = () => Game.title();
    row.append(a, b, c); box.appendChild(row);
    hud.appendChild(box);
  }
  layout(W, H) { this.sv.setLayout(W / 2, H / 2, Math.min(W, H) * 0.35); }
  update(dt) { this.t += dt; this.sv.orbit(dt * 0.1, 0); }
  draw(ctx, W, H) { pond(ctx, W, H, this.t); ctx.globalAlpha = 0.3; this.sv.drawGlobe(ctx); this.sv.drawBeam(ctx, this.L.v); ctx.globalAlpha = 1; }
}
