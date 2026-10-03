'use strict';
// Two more minigames: Gate Merge (a stacking/merging game) and Flip Flip (memory with identities).

// ---------------------------------------------------------------------------------------------
// Gate Merge: drop gate bubbles into a jar. Two bubbles whose product is a single gate merge into
// it; two that multiply to nothing (I) vanish. Every merge rule is a real identity.
const MERGE_RULES = [
  { a: 'T', b: 'T', is: 'S', seq: 'TT', why: 'Two Nudges make a Quarter', pts: 10 },
  { a: 'S', b: 'S', is: 'Z', seq: 'SS', why: 'Two Quarters make a Spin', pts: 30 },
  { a: 'Z', b: 'Z', is: 'I', seq: 'ZZ', why: 'Two Spins make nothing at all', pts: 100 },
  { a: 'X', b: 'X', is: 'I', seq: 'XX', why: 'A Flip undoes a Flip', pts: 100 },
  { a: 'H', b: 'H', is: 'I', seq: 'HH', why: 'A Tilt undoes a Tilt', pts: 100 },
  { a: 'Y', b: 'Y', is: 'I', seq: 'YY', why: 'A Roll undoes a Roll', pts: 120 },
  { a: 'X', b: 'Z', is: 'Y', seq: 'XZ', why: 'A Flip and a Spin act like a Roll', pts: 50 },
];
const MERGE_SIZE = { T: 0.052, S: 0.07, Z: 0.09, X: 0.09, H: 0.09, Y: 0.105 };

class MergeScene {
  constructor(cfg) { this.cfg = cfg; }
  enter() {
    const c = this.cfg;
    this.t = 0; this.parts = new Particles(); this.balls = []; this.score = 0; this.over = false; this.running = false;
    this.rules = MERGE_RULES.filter(r => !c.rules || c.rules.includes(r.seq));
    this.cool = 0; this.overT = 0; this.popups = []; this.found = new Set(); this.dropX = null;
    this.cur = this.rollGate(); this.nextG = this.rollGate();
    const hud = hudTop(c.title, c.obj || 'Drop gates. Matching pairs merge, and pairs that cancel vanish.');
    this.info = el('div', 'mergeinfo'); hud.appendChild(this.info);
    this.renderInfo();
    const go = () => { this.running = true; };
    if (c.intro) UI.say(c.intro.map(UI.norm), go); else go();
  }
  rollGate() {
    const sp = this.cfg.spawn, r = Math.random();
    let acc = 0;
    for (const g in sp) { acc += sp[g]; if (r < acc) return g; }
    return Object.keys(sp)[0];
  }
  ruleFor(a, b) { return this.rules.find(r => (r.a === a && r.b === b) || (r.a === b && r.b === a)); }
  rad(g) { return MERGE_SIZE[g] * this.jw; }
  layout(W, H) {
    this.W = W; this.H = H;
    const narrow = W < 760;
    this.jw = Math.min(440, W - 32);
    this.jx = narrow ? (W - this.jw) / 2 : W / 2 - this.jw / 2 - 90;
    this.jt = H * 0.22; this.jb = H - 40; this.danger = this.jt + 30;
  }
  renderInfo() {
    const c = this.cfg;
    const goal = c.goal ? `<div class="srow">goal <b>${c.goal}</b></div>` : `<div class="srow">best <b>${Save.data.best.merge}</b></div>`;
    this.info.innerHTML = `<div class="big">${this.score}<span> pts</span></div>${goal}
      <div class="nextg">next ${this.ballChip(this.nextG)}</div>
      <div class="rules">${this.rules.map(r => `<div class="${this.found.has(r.seq) ? 'on' : ''}">${this.ballChip(r.a)}<i>+</i>${this.ballChip(r.b)}<i>→</i>${r.is === 'I' ? '<span class="poof">poof</span>' : this.ballChip(r.is)}</div>`).join('')}</div>`;
  }
  ballChip(g) { return `<span class="chip g${g}">${Q.GATES[g].glyph}</span>`; }
  drop() {
    if (!this.running || this.over || this.cool > 0 || UI.blocking) return;
    const r = this.rad(this.cur);
    const x = Math.max(this.jx + r, Math.min(this.jx + this.jw - r, this.dropX ?? this.jx + this.jw / 2));
    this.balls.push({ g: this.cur, x, y: this.jt - r - 6, vx: 0, vy: 60, r, age: 0, id: Math.random() });
    if (this.cur === 'T' || this.cur === 'Y') UI.unlock(this.cur === 'T' ? 'T' : 'Y');
    this.cur = this.nextG; this.nextG = this.rollGate(); this.cool = 0.45;
    Sound.play('drop'); this.renderInfo();
  }
  merge(a, b, rule) {
    a.dead = b.dead = true;
    const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
    const fresh = !this.found.has(rule.seq);
    this.found.add(rule.seq);
    UI.unlock('id:' + rule.seq);
    this.score += rule.pts;
    if (rule.is === 'I') {
      this.parts.burst(x, y, '#ffffff', 36, 280); this.parts.burst(x, y, GATE_COLOR[a.g], 20, 200); Sound.play('pop');
    } else {
      const r = this.rad(rule.is);
      this.balls.push({ g: rule.is, x, y, vx: 0, vy: -80, r, age: 0.2, id: Math.random(), grow: 0 });
      this.parts.burst(x, y, GATE_COLOR[rule.is], 18, 160); Sound.play('merge');
    }
    const res = rule.is === 'I' ? 'I' : Q.GATES[rule.is].glyph;
    this.popups.push({ text: `${Q.GATES[rule.a].glyph}${Q.GATES[rule.b].glyph} = ${res} · ${rule.why}`, x, y, t: 0 });
    if (fresh && this.found.size === 1) UI.hint('nan', `Ooh! ${rule.why}. Every merge in here is a real gate rule.`, 5000);
    this.renderInfo();
    if (this.cfg.goal && this.score >= this.cfg.goal) this.win();
  }
  win() {
    if (this.over) return;
    this.over = true; this.running = false;
    setTimeout(() => {
      if (this.cfg.outro) UI.say(this.cfg.outro.map(UI.norm), () => Game.next()); else Game.next();
    }, 900);
  }
  gameOver() {
    this.over = true; this.running = false;
    if (!this.cfg.goal) Game.recordBest('merge', this.score);
    Game.resultPanel({
      title: 'The jar overflowed',
      who: 'nan',
      text: this.cfg.goal
        ? `${this.score} of ${this.cfg.goal} points. Try dropping matching gates next to each other.`
        : `Score <b>${this.score}</b>. Best <b>${Save.data.best.merge}</b>. You found ${this.found.size} of ${this.rules.length} merges.`,
      story: !!this.cfg.goal,
    });
  }
  pointerdown(x) { this.dropX = x; this.drop(); }
  pointermove(x) { this.dropX = x; }
  key(e) {
    if (e.key === 'ArrowLeft') this.dropX = (this.dropX ?? this.jx + this.jw / 2) - 24;
    else if (e.key === 'ArrowRight') this.dropX = (this.dropX ?? this.jx + this.jw / 2) + 24;
    else if (e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); this.drop(); }
  }
  update(dt) {
    this.t += dt; this.parts.update(dt); this.cool = Math.max(0, this.cool - dt);
    this.popups.forEach(p => p.t += dt); this.popups = this.popups.filter(p => p.t < 2);
    if (!this.running) return;
    const steps = 6, h = dt / steps, g = 1500 * (this.H / 900), L = this.jx, R = this.jx + this.jw, B = this.jb;
    for (let s = 0; s < steps; s++) {
      for (const b of this.balls) {
        b.vy += g * h; b.x += b.vx * h; b.y += b.vy * h; b.vx *= 0.999;
        if (b.x - b.r < L) { b.x = L + b.r; b.vx = Math.abs(b.vx) * 0.3; }
        if (b.x + b.r > R) { b.x = R - b.r; b.vx = -Math.abs(b.vx) * 0.3; }
        if (b.y + b.r > B) { b.y = B - b.r; b.vy = -Math.abs(b.vy) * 0.15; b.vx *= 0.96; }
      }
      for (let i = 0; i < this.balls.length; i++) {
        const a = this.balls[i]; if (a.dead) continue;
        for (let j = i + 1; j < this.balls.length; j++) {
          const b = this.balls[j]; if (b.dead) continue;
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01, min = a.r + b.r;
          if (d >= min) continue;
          const rule = this.ruleFor(a.g, b.g);
          if (rule && a.age > 0.05 && b.age > 0.05) { this.merge(a, b, rule); break; }
          const nx = dx / d, ny = dy / d, over = min - d, ma = a.r * a.r, mb = b.r * b.r, tot = ma + mb;
          a.x -= nx * over * mb / tot; a.y -= ny * over * mb / tot;
          b.x += nx * over * ma / tot; b.y += ny * over * ma / tot;
          const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rv < 0) {
            const imp = -1.1 * rv / (1 / ma + 1 / mb);
            a.vx -= imp / ma * nx; a.vy -= imp / ma * ny; b.vx += imp / mb * nx; b.vy += imp / mb * ny;
          }
        }
      }
      this.balls = this.balls.filter(b => !b.dead);
    }
    let high = false;
    for (const b of this.balls) { b.age += dt; if (b.age > 1.2 && b.y - b.r < this.danger && Math.abs(b.vy) < 120) high = true; }
    this.overT = high ? this.overT + dt : 0;
    if (this.overT > 2) this.gameOver();
  }
  drawBall(ctx, x, y, r, g, alpha = 1) {
    const col = GATE_COLOR[g];
    ctx.save(); ctx.globalAlpha = alpha;
    const grd = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.25, col); grd.addColorStop(1, this.shade(col));
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(10,20,20,0.5)'; ctx.stroke();
    // a little face
    ctx.fillStyle = '#16211f';
    ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.05, r * 0.09, 0, Math.PI * 2); ctx.arc(x + r * 0.3, y - r * 0.05, r * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,140,160,0.55)';
    ctx.beginPath(); ctx.ellipse(x - r * 0.48, y + r * 0.15, r * 0.12, r * 0.07, 0, 0, Math.PI * 2); ctx.ellipse(x + r * 0.48, y + r * 0.15, r * 0.12, r * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#16211f'; ctx.font = `600 ${r * 0.6}px "IBM Plex Mono", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(Q.GATES[g].glyph, x, y + r * 0.42);
    ctx.restore();
  }
  shade(hex) {
    const n = parseInt(hex.slice(1), 16), f = 0.55;
    return `rgb(${Math.round((n >> 16) * f)},${Math.round(((n >> 8) & 255) * f)},${Math.round((n & 255) * f)})`;
  }
  draw(ctx, W, H) {
    pond(ctx, W, H, this.t);
    const L = this.jx, R = L + this.jw, T = this.jt, B = this.jb;
    // jar
    ctx.save();
    ctx.fillStyle = 'rgba(160,240,210,0.05)'; ctx.fillRect(L, T, this.jw, B - T);
    ctx.strokeStyle = 'rgba(190,255,230,0.5)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(L - 4, T - 20); ctx.lineTo(L - 4, B + 4); ctx.lineTo(R + 4, B + 4); ctx.lineTo(R + 4, T - 20); ctx.stroke();
    ctx.setLineDash([8, 8]); ctx.lineWidth = 2;
    ctx.strokeStyle = this.overT > 0 ? `rgba(255,138,122,${0.5 + 0.5 * Math.sin(this.t * 14)})` : 'rgba(255,138,122,0.35)';
    ctx.beginPath(); ctx.moveTo(L, this.danger); ctx.lineTo(R, this.danger); ctx.stroke();
    ctx.restore();
    for (const b of this.balls) this.drawBall(ctx, b.x, b.y, b.r, b.g);
    // the gate waiting to drop
    if (this.running && !this.over) {
      const r = this.rad(this.cur), x = Math.max(L + r, Math.min(R - r, this.dropX ?? L + this.jw / 2)), y = T - r - 10;
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.setLineDash([3, 6]);
      ctx.beginPath(); ctx.moveTo(x, y + r); ctx.lineTo(x, B); ctx.stroke(); ctx.restore();
      this.drawBall(ctx, x, y, r, this.cur, this.cool > 0 ? 0.5 : 1);
    }
    this.parts.draw(ctx);
    ctx.textAlign = 'center'; ctx.font = '600 15px "Pixelify Sans", monospace';
    for (const p of this.popups) { ctx.globalAlpha = Math.min(1, 2 - p.t); ctx.fillStyle = '#ffe2a8'; ctx.fillText(p.text, p.x, p.y - 30 - p.t * 30); }
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------------------------------------
// Flip Flip: memory cards. Two cards match when they are secretly the same gate or state.
const FLIP_GROUPS = [
  { id: 'X', cards: ['X', 'HZH', 'HSSH'], why: 'A Spin seen sideways is a Flip.' },
  { id: 'Z', cards: ['Z', 'HXH', 'SS'], why: 'A Flip seen sideways is a Spin, and two Quarters make one too.' },
  { id: 'S', cards: ['S', 'TT'], why: 'Two Nudges make a Quarter.' },
  { id: 'Sdg', cards: ['S†', 'SSS'], why: 'Three Quarters forward is one Quarter back.' },
  { id: 'I', cards: ['XX', 'HH', 'ZZ', 'SSSS', 'YY'], why: 'Every half-turn lever undoes itself, and four Quarters make a whole turn.' },
  { id: 'Y', cards: ['Y', 'XZ'], why: 'A Flip and a Spin together turn the light exactly like a Roll.' },
  { id: 'k0', cards: ['|0⟩', 'X|1⟩', 'H|+⟩'], why: 'All roads to Home.' },
  { id: 'k1', cards: ['|1⟩', 'X|0⟩', 'HZH|0⟩'], why: 'All roads to the Deep.' },
  { id: 'kp', cards: ['|+⟩', 'H|0⟩', 'Z|−⟩'], why: 'A Tilt from Home lands on |+⟩.' },
  { id: 'km', cards: ['|−⟩', 'H|1⟩', 'Z|+⟩'], why: 'A Spin swings |+⟩ round to |−⟩.' },
  { id: 'kpi', cards: ['|+i⟩', 'S|+⟩'], why: 'A Quarter turns |+⟩ to |+i⟩.' },
  { id: 'kmi', cards: ['|−i⟩', 'S†|+⟩'], why: 'A Quarter back turns |+⟩ to |−i⟩.' },
];
// Parse "HZH|0⟩" into gate ids (in written order) and an optional ket key.
function parseExpr(s) {
  const m = s.match(/\|([^⟩]+)⟩/);
  const ket = m ? m[1].replace('−', '-') : null;
  const gatePart = m ? s.slice(0, m.index) : s;
  const gates = [];
  for (let i = 0; i < gatePart.length; i++) {
    const ch = gatePart[i];
    if (gatePart[i + 1] === '†') { gates.push(ch + 'dg'); i++; } else gates.push(ch);
  }
  return { gates, ket };
}
// What an expression really is: a state key, or a gate matrix (both compared up to phase).
// Written ABC|ψ⟩ means C acts first, so we apply right to left.
function exprValue(s) {
  const { gates, ket } = parseExpr(s);
  const applied = gates.slice().reverse();
  if (ket) return { kind: 'state', v: Q.bloch(applied.reduce((st, g) => Q.apply(g, st), Q.ket(ket))) };
  return { kind: 'gate', m: Q.seqMatrix(applied) };
}
function sameValue(a, b) {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'state') return Q.dot(a.v, b.v) > 0.999;
  return Q.equalUpToPhase(a.m, b.m);
}
function exprHTML(s) {
  const { gates, ket } = parseExpr(s);
  const gs = gates.map(g => `<b class="c${g}">${Q.GATES[g].glyph}</b>`).join('');
  return gs + (ket ? `<span class="kt">|${ket.replace('-', '−')}⟩</span>` : '');
}

class FlipScene {
  constructor(cfg) { this.cfg = cfg; }
  enter() {
    const c = this.cfg;
    this.t = 0; this.moves = 0; this.matched = 0; this.open = []; this.lock = true; this.time = 0;
    const groups = (c.groups || FLIP_GROUPS).slice().sort(() => Math.random() - 0.5).slice(0, c.pairs || 8);
    this.pairs = groups.length;
    const cards = [];
    for (const g of groups) {
      const pick = g.cards.slice().sort(() => Math.random() - 0.5).slice(0, 2);
      for (const text of pick) cards.push({ text, group: g, value: exprValue(text) });
    }
    cards.sort(() => Math.random() - 0.5);
    this.cards = cards;
    const hud = hudTop(c.title, 'Flip two cards. They match when they are secretly the same gate or the same state.');
    this.stats = el('div', 'flipstats'); hud.appendChild(this.stats);
    const grid = el('div', 'flipgrid'); hud.appendChild(grid); this.grid = grid;
    const cols = cards.length <= 10 ? 5 : 4;
    grid.style.setProperty('--cols', cols);
    cards.forEach((card, i) => {
      const b = el('button', 'fcard up', `<div class="fin"><div class="fface fback"><span>?</span></div><div class="fface ffront">${exprHTML(card.text)}</div></div>`);
      b.onclick = () => this.flip(i);
      card.el = b; grid.appendChild(b);
    });
    this.renderStats();
    const peek = () => {
      // Show everything for a moment, then flip face down.
      setTimeout(() => { this.cards.forEach(cd => cd.el.classList.remove('up')); Sound.play('flip'); this.lock = false; this.running = true; }, c.peek ?? 2600);
    };
    if (c.intro) UI.say(c.intro.map(UI.norm), peek); else peek();
  }
  renderStats() {
    const best = Save.data.best.flip;
    this.stats.innerHTML = `<div class="big">${this.matched}<span>/${this.pairs} pairs</span></div>
      <div class="srow">flips <b>${this.moves}</b> · time <b>${Math.floor(this.time)}s</b></div>
      ${!this.cfg.story && best ? `<div class="srow muted">best ${best.moves} flips</div>` : ''}`;
  }
  flip(i) {
    const card = this.cards[i];
    if (this.lock || card.done || this.open.includes(card) || UI.blocking) return;
    card.el.classList.add('up'); Sound.play('flip');
    this.open.push(card);
    if (this.open.length < 2) return;
    this.moves++;
    const [a, b] = this.open;
    if (sameValue(a.value, b.value)) {
      a.done = b.done = true; this.open = []; this.matched++;
      a.el.classList.add('matched'); b.el.classList.add('matched');
      Sound.play('combo');
      UI.hint(this.matched % 2 ? 'nan' : 'inchu', `<b class="ket">${a.text} = ${b.text}</b>. ${a.group.why}`, 4500);
      if (a.group.id === 'Y') UI.unlock('Y');
      if (a.group.id === 'S' || a.group.id === 'Sdg') UI.unlock('S');
      if (this.matched === this.pairs) this.win();
    } else {
      this.lock = true;
      setTimeout(() => {
        a.el.classList.add('nope'); b.el.classList.add('nope'); Sound.play('nope');
        setTimeout(() => { a.el.classList.remove('up', 'nope'); b.el.classList.remove('up', 'nope'); this.open = []; this.lock = false; }, 450);
      }, 650);
    }
    this.renderStats();
  }
  win() {
    this.running = false;
    const c = this.cfg;
    if (c.story) {
      setTimeout(() => { if (c.outro) UI.say(c.outro.map(UI.norm), () => Game.next()); else Game.next(); }, 900);
      return;
    }
    const best = Save.data.best.flip;
    if (!best || this.moves < best.moves) { Save.data.best.flip = { moves: this.moves, time: Math.floor(this.time) }; Save.write(); }
    const perfect = this.moves === this.pairs;
    setTimeout(() => Game.resultPanel({
      title: perfect ? 'Perfect memory!' : 'All pairs found',
      who: 'nan',
      text: `${this.pairs} pairs in <b>${this.moves}</b> flips and ${Math.floor(this.time)} seconds. Best: ${Save.data.best.flip.moves} flips.`,
    }), 700);
  }
  layout() {}
  update(dt) { if (this.running) { this.time += dt; if (Math.floor(this.time) !== this.lastSec) { this.lastSec = Math.floor(this.time); this.renderStats(); } } this.t += dt; }
  draw(ctx, W, H) { pond(ctx, W, H, this.t); }
}

if (typeof module !== 'undefined') module.exports = { FLIP_GROUPS, MERGE_RULES, exprValue, sameValue };
