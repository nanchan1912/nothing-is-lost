'use strict';
// DOM overlay: save slots, dialog with mascots, hints, toasts, loading screen, logbook.
const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

const SPEAKERS = {
  inchu: { name: 'Inchu', role: 'keeper of the lantern', side: 'left' },
  nan: { name: 'Nan', role: 'apprentice', side: 'right' },
  eye: { name: 'The Eye', role: 'the one that looks', side: 'left' },
  pell: { name: 'Pell', role: 'a wisp, long lost', side: 'right' },
};

// ---------------------------------------------------------------------------------------------
// Saves: three story slots plus settings, logbook pages and minigame records shared by all slots.
const Save = {
  KEY: 'nothing-is-lost-v2',
  data: { settings: { music: true, sfx: true }, codex: {}, best: { slicer: 0, merge: 0, flip: null }, slots: [null, null, null], active: null },
  load() {
    try { const s = JSON.parse(localStorage.getItem(this.KEY)); if (s) this.data = { ...this.data, ...s, settings: { ...this.data.settings, ...s.settings }, best: { ...this.data.best, ...s.best } }; }
    catch (e) { /* storage unavailable: play without saving */ }
  },
  write() { try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) { /* storage unavailable */ } },
  slot() { return this.data.active != null ? this.data.slots[this.data.active] : null; },
  newGame(i) { this.data.slots[i] = { beat: 0, done: {}, saved: Date.now() }; this.data.active = i; this.write(); },
  use(i) { this.data.active = i; this.write(); },
  // Remember where the player is. Called on every beat change and from "Save game".
  saveAt(beat) {
    if (this.data.active == null) { const free = this.data.slots.findIndex(s => !s); this.data.active = free < 0 ? 0 : free; if (!this.data.slots[this.data.active]) this.data.slots[this.data.active] = { beat: 0, done: {} }; }
    const s = this.slot(); s.beat = beat; s.saved = Date.now(); this.write();
    return this.data.active;
  },
  markDone(beat) { const s = this.slot(); if (!s) return; s.done[beat] = true; s.beat = beat + 1; s.saved = Date.now(); this.write(); },
  isDone(beat) { const s = this.slot(); return !!(s && s.done[beat]); },
  wipe() { try { localStorage.removeItem(this.KEY); } catch (e) { /* ignore */ } location.reload(); },
};

function slotLabel(s) {
  if (!s) return { title: 'Empty slot', sub: 'Start a new story here' };
  const b = BEATS[Math.min(s.beat, BEATS.length - 1)], ch = CHAPTERS[b.ch];
  const pct = Math.round(100 * Object.keys(s.done).length / BEATS.length);
  const when = s.saved ? new Date(s.saved).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  return { title: `${ch.sub}: ${ch.title}`, sub: `${b.name} · ${pct}% · ${when}` };
}

// ---------------------------------------------------------------------------------------------
const UI = {
  blocking: false,
  init() {
    this.dlg = $('#dialog'); this.hintBox = $('#hint'); this.toasts = $('#toasts');
    this.dlg.addEventListener('pointerdown', e => { e.stopPropagation(); this.advance(); });
    window.addEventListener('keydown', e => {
      if (this.blocking && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); this.advance(); }
    });
  },

  // lines: [who, text] or {who, text, m: mood, fx, choices:[{label, reply:[lines]}]}
  say(lines, done) {
    this.queue = lines.map(UI.norm);
    this.done = done; this.blocking = true; this.lastWho = null;
    this.dlg.classList.add('show');
    this.next();
  },
  norm(l) { return Array.isArray(l) ? { who: l[0], text: l[1], m: l[2] } : l; },
  next() {
    clearInterval(this.typer);
    const line = this.queue.shift();
    if (!line) { this.dlg.classList.remove('show'); this.blocking = false; const d = this.done; this.done = null; if (d) d(); return; }
    if (line.fx) line.fx();
    if (line.call) { line.call(); return this.next(); }
    const who = SPEAKERS[line.who] ? line.who : 'inchu', sp = SPEAKERS[who];
    const text = typeof line.text === 'function' ? line.text() : line.text;
    const fresh = this.lastWho !== who || this.lastMood !== (line.m || '');
    this.lastWho = who; this.lastMood = line.m || '';
    this.dlg.className = `show ${who} side-${sp.side}`;
    if (fresh) {
      this.dlg.innerHTML = `<div class="portrait">${Mascot.of(who, line.m)}</div>
        <div class="bubble"><div class="who"><b>${sp.name}</b><span>${sp.role}</span></div><div class="txt"></div><div class="foot"></div></div>`;
    }
    const txt = $('.txt', this.dlg), foot = $('.foot', this.dlg);
    foot.innerHTML = '';
    txt.innerHTML = text;
    // Typewriter that keeps inline markup: empty every text node, then refill them in order.
    const nodes = [], walk = document.createTreeWalker(txt, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) { nodes.push([walk.currentNode, walk.currentNode.nodeValue]); walk.currentNode.nodeValue = ''; }
    let ni = 0, ci = 0, count = 0;
    this.dlg.classList.add('talking');
    this.typing = true;
    const finish = () => {
      clearInterval(this.typer); this.typing = false;
      for (const [n, v] of nodes) n.nodeValue = v;
      this.dlg.classList.remove('talking');
      if (line.choices) {
        this.choosing = true;
        const box = el('div', 'choices');
        line.choices.forEach(c => {
          const b = el('button', 'choice', c.label);
          b.addEventListener('pointerdown', e => {
            e.stopPropagation(); this.choosing = false;
            this.queue = (c.reply || []).map(UI.norm).concat(this.queue);
            Sound.play('tick'); this.next();
          });
          box.appendChild(b);
        });
        foot.appendChild(box);
      } else { this.choosing = false; foot.appendChild(el('div', 'more', 'click ▸')); }
    };
    this.finishLine = finish;
    this.typer = setInterval(() => {
      for (let k = 0; k < 2; k++) {
        if (ni >= nodes.length) return finish();
        const [n, v] = nodes[ni];
        n.nodeValue = v.slice(0, ++ci);
        if (v[ci - 1] && v[ci - 1].trim() && ++count % 3 === 0) Sound.blip(who);
        if (ci >= v.length) { ni++; ci = 0; }
      }
    }, 28);
  },
  advance() {
    if (!this.blocking || this.choosing) return;
    if (this.typing) { this.finishLine(); return; }
    Sound.play('tick'); this.next();
  },

  hint(who, text, ms = 6500) {
    if (!SPEAKERS[who]) who = 'inchu';
    this.hintBox.className = 'show ' + who;
    this.hintBox.innerHTML = `<div class="mini">${Mascot.of(who)}</div><div><b>${SPEAKERS[who].name}</b> ${text}</div>`;
    clearTimeout(this.hintT);
    this.hintT = setTimeout(() => this.hintBox.classList.remove('show'), ms);
  },
  clearHint() { this.hintBox.classList.remove('show'); },

  toast(html, cls = '') {
    const t = el('div', 'toast ' + cls, html);
    this.toasts.appendChild(t);
    setTimeout(() => t.remove(), 2800);
  },

  card(title, sub, done) {
    const c = el('div', 'card', `<div class="card-sub">${sub}</div><div class="card-title">${title}</div>`);
    document.body.appendChild(c);
    Sound.play('chime');
    setTimeout(() => c.classList.add('out'), 1700);
    setTimeout(() => { c.remove(); done && done(); }, 2300);
  },

  // Loading screen with a quantum tip. With click: waits for a click once the bar fills
  // (the first one also unlocks sound). Without: continues by itself, or on click.
  loading(done, { click = false, label = 'Warming the lantern' } = {}) {
    const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
    const ov = el('div', 'loading', `
      <div class="ld-cast"><div class="ld-m a">${Mascot.inchu('happy')}</div><div class="ld-m b">${Mascot.nan()}</div></div>
      <div class="ld-label">${label}<span class="dots"></span></div>
      <div class="ld-bar"><div></div></div>
      <div class="ld-tip"><span>Quantum tip</span>${tip}</div>
      <div class="ld-go">click anywhere to continue</div>`);
    document.body.appendChild(ov);
    let ready = false, gone = false;
    const go = () => {
      if (!ready || gone) return; gone = true;
      Sound.ensure(); Music.sync();
      ov.classList.add('out'); setTimeout(() => { ov.remove(); done && done(); }, 450);
    };
    ov.addEventListener('pointerdown', go);
    const keyGo = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
    window.addEventListener('keydown', keyGo);
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    const minWait = new Promise(r => setTimeout(r, 1500));
    Promise.all([fontsReady, minWait]).then(() => {
      ready = true; ov.classList.add('ready');
      if (!click) setTimeout(go, 2600);
    });
    const cleanup = setInterval(() => { if (gone) { window.removeEventListener('keydown', keyGo); clearInterval(cleanup); } }, 500);
  },

  unlock(id) {
    if (Save.data.codex[id]) return false;
    Save.data.codex[id] = true; Save.write();
    const e = CODEX.find(c => c.id === id) || Q.IDENTITIES.find(i => 'id:' + i.seq === id);
    if (e) this.toast(`<span class="tk">New logbook page</span> ${e.title}`, 'codex');
    Sound.play('chime');
    return true;
  },

  overlay(html, cls = '') {
    const ov = el('div', 'overlay');
    const box = el('div', 'panel ' + cls, html);
    ov.appendChild(box); document.body.appendChild(ov);
    const close = () => { ov.remove(); if (!document.querySelector('.overlay')) Game.paused = false; };
    ov.addEventListener('pointerdown', e => { if (e.target === ov) close(); });
    Game.paused = true;
    return { ov, box, close };
  },

  openCodex() {
    const { box, close } = this.overlay(`<h2>Inchu's Logbook</h2><p class="muted">Everything learned on the Glassmoon. Plain words first, keeper shorthand underneath.</p>`, 'codex');
    for (const c of CODEX) {
      const has = Save.data.codex[c.id];
      box.appendChild(el('div', 'entry' + (has ? '' : ' locked'), has
        ? `<h3>${c.title}</h3><p>${c.text}</p>${c.math ? `<p class="math">${c.math}</p>` : ''}`
        : `<h3>Undiscovered page</h3><p class="muted">${c.where || 'Keep playing.'}</p>`));
    }
    box.appendChild(el('h2', null, 'Disguises'));
    box.appendChild(el('p', 'muted', 'Gate sequences that secretly equal one gate. Cut them in a single swipe in Gate Slicer, or merge them in Gate Merge.'));
    const grid = el('div', 'ids');
    const seen = new Set();
    for (const i of Q.IDENTITIES) {
      if (seen.has(i.title)) continue; seen.add(i.title);
      const has = Save.data.codex['id:' + i.seq];
      const res = i.is === 'I' ? 'I' : Q.GATES[i.is].glyph;
      const shown = Q.decode(i.seq).map(g => Q.GATES[g].glyph).join(' ');
      grid.appendChild(el('div', 'id' + (has ? '' : ' locked'), has
        ? `<b>${shown} = ${res}</b><span>${i.title}. ${i.text}</span>`
        : `<b>${'? '.repeat(i.seq.length)}= ${res}</b><span class="muted">${i.seq.length} levers in one swipe</span>`));
    }
    box.appendChild(grid);
    const b = el('button', 'btn', 'Close'); b.onclick = close; box.appendChild(b);
  },
};

// Logbook pages, in story order.
const CODEX = [
  { id: 'light', title: 'The light and the glass (Bloch sphere)', where: 'Chapter One.', text: 'A qubit\'s state is an arrow from the centre of a sphere to its surface. Straight up is |0⟩ (Home), straight down is |1⟩ (the Deep). Every other point on the glass is a different state.', math: 'A point on the sphere has coordinates (x, y, z) with x² + y² + z² = 1.' },
  { id: 'X', title: 'The Flip (X gate)', where: 'Chapter One.', text: 'A half turn around the red x-axis. It swaps Home and the Deep. Doing it twice puts everything back: the Flip is its own undo.', math: 'X|0⟩ = |1⟩, X|1⟩ = |0⟩, XX = I' },
  { id: 'info', title: 'Why the old lighthouse went dark', where: 'Chapter One.', text: 'An AND gate sends three different inputs to the same output, so from the output alone you can\'t tell what went in. The information is gone and the step can\'t be undone. Quantum gates are one-to-one: every output came from exactly one input, so you can always walk back.', math: 'AND: 00, 01, 10 → 0 (many to one). X: 0 → 1, 1 → 0 (one to one).' },
  { id: 'H', title: 'The Tilt (H gate, Hadamard)', where: 'Chapter Two.', text: 'A half turn around the slanted gold axis, halfway between x and z. It takes Home to |+⟩ on the Rim, and |+⟩ back to Home. It is its own undo.', math: 'H|0⟩ = |+⟩, H|1⟩ = |−⟩, HH = I' },
  { id: 'super', title: 'Superposition and the Eye\'s odds', where: 'Chapter Two.', text: 'On the Rim the light points neither Home nor Deep. If it is looked at, it answers Home or Deep at random. The height of the light sets the odds: the higher it points, the likelier Home.', math: 'P(Home) = (1 + z) / 2. On the Rim z = 0, so 50/50.' },
  { id: 'order', title: 'Order matters', where: 'Chapter Two.', text: 'Flip then Tilt lands somewhere different from Tilt then Flip. Turns around different axes do not commute.', math: 'HX|0⟩ = |−⟩ but XH|0⟩ = |+⟩, so HX ≠ XH' },
  { id: 'Z', title: 'The Spin (Z gate)', where: 'Chapter Three.', text: 'A half turn around the up-down axis. Home and the Deep sit on that axis, so the Spin can\'t move them. On the Rim it swings |+⟩ round to |−⟩.', math: 'Z|0⟩ = |0⟩, Z|1⟩ = −|1⟩, Z|+⟩ = |−⟩, ZZ = I' },
  { id: 'phase', title: 'Phase: the invisible difference', where: 'Chapter Three.', text: '|+⟩ and |−⟩ give the Eye exactly the same odds, but they are different states. That hidden difference is called phase. A Tilt turns it into something you can see: H|+⟩ = |0⟩ but H|−⟩ = |1⟩.', math: '|+⟩ = (|0⟩ + |1⟩)/√2, |−⟩ = (|0⟩ − |1⟩)/√2' },
  { id: 'disguise', title: 'Disguises (gate identities)', where: 'Chapter Three.', text: 'Different sequences of turns can add up to the same turn. Tilt, Spin, Tilt is a Flip. Tilt, Flip, Tilt is a Spin. A Tilt swaps the roles of the x-axis and the z-axis.', math: 'HZH = X, HXH = Z' },
  { id: 'reverse', title: 'Every turn can be unturned (unitarity)', where: 'Chapter Four.', text: 'Every lever is a rotation, and every rotation has an opposite. Run the turns backwards, last turn first, and the light lands exactly where it began. It never shrinks or swells along the way, so nothing is lost.', math: 'U†U = I. To undo ABC, apply C⁻¹ then B⁻¹ then A⁻¹: (ABC)⁻¹ = C⁻¹B⁻¹A⁻¹.' },
  { id: 'S', title: 'The Quarter (S gate)', where: 'Chapter Five.', text: 'A quarter turn around the up-down axis. It reaches |+i⟩ and |−i⟩, which half turns skip over. Unlike the others it is not its own undo: two Quarters make a Spin. You undo it by turning back, or by three more Quarters.', math: 'S|+⟩ = |+i⟩, SS = Z, SSSS = I, S† = SSS' },
  { id: 'measure', title: 'Looking (measurement)', where: 'Chapter Six.', text: 'Looking forces the light to answer Home or Deep and forgets everything else: where on the Rim it was, its phase, the trail behind it. It is the only step on the Glassmoon that can\'t be undone. If the light already points Home or Deep, looking changes nothing.', math: 'Measuring gives |0⟩ with probability |α|² and |1⟩ with probability |β|². Not unitary, so not reversible.' },
  { id: 'Y', title: 'The Roll (Y gate)', where: 'Gate Slicer or Gate Merge.', text: 'A half turn around the y-axis, the one pointing at |+i⟩. It swaps Home and the Deep like the Flip, but takes a different road there. A Flip and a Spin together turn the light exactly like a Roll.', math: 'Y = iXZ, so XZ and Y differ only by an invisible global phase. YY = I.' },
  { id: 'T', title: 'The Nudge (T gate)', where: 'Gate Slicer or Gate Merge.', text: 'An eighth of a turn around the up-down axis. Two Nudges make a Quarter, two Quarters make a Spin, two Spins make nothing at all.', math: 'TT = S, SS = Z, ZZ = I, so T⁸ = I' },
  { id: 'noise', title: 'Noise (decoherence)', where: 'Gate Slicer.', text: 'Gates only turn the arrow. Noise from the outside world shrinks it: the qubit becomes a blur of possibilities, and no gate can stretch it back. Real quantum computers fight this with error correction.', math: 'Pure states sit on the sphere (length 1). Noisy, mixed states sit inside it (length < 1).' },
];

const TIPS = [
  'A qubit can point anywhere on a sphere, but when you measure it you only ever get 0 or 1.',
  'Every quantum gate can be undone. Measurement is the only step that can\'t.',
  'The X gate is a quantum NOT: it swaps |0⟩ and |1⟩.',
  'The Hadamard gate (H) makes a superposition: H|0⟩ = (|0⟩ + |1⟩)/√2.',
  'Z changes the phase. It does nothing to |0⟩ but turns |+⟩ into |−⟩.',
  'HZH = X. A Spin seen sideways is a Flip.',
  'To undo a sequence of gates, undo them in reverse order: (AB)⁻¹ = B⁻¹A⁻¹.',
  'Unitary means U†U = I: the gate keeps lengths, so no information leaks out.',
  'Classical AND loses information: three different inputs give 0. That\'s why it can\'t be run backwards.',
  'S is a quarter turn. You need four of them to come back around: S⁴ = I.',
  'T is an eighth of a turn. Together with H, it can get arbitrarily close to any single-qubit gate.',
  'The height z of a Bloch vector tells you the odds: P(0) = (1 + z)/2.',
  'Two states can give identical measurement odds and still be different. That difference is phase.',
  'Noise shrinks the Bloch arrow inside the sphere. Quantum error correction fights it.',
  'Measuring a qubit that is already exactly |0⟩ or |1⟩ doesn\'t disturb it.',
  'Rotating twice by 180° about the same axis brings you home. That\'s why X, Y, Z and H undo themselves.',
  'XZ and ZX both act like Y; they only differ by a phase nobody can measure.',
  'Order matters: HX|0⟩ = |−⟩, but XH|0⟩ = |+⟩.',
  'The Bloch sphere only works for one qubit. Two qubits need a lot more room.',
  'A global phase, multiplying the whole state by the same number, has no visible effect at all.',
];
