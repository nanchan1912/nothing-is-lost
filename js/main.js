'use strict';
// Game flow: title, saves, which beat or minigame is playing, menus, the main loop, input routing.
const Game = {
  scene: null, beat: -1, mini: null, paused: false,

  init() {
    Save.load();
    UI.init();
    this.canvas = $('#c'); this.ctx = this.canvas.getContext('2d');
    window.addEventListener('resize', () => this.resize());
    const c = this.canvas;
    const pos = e => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    c.addEventListener('pointerdown', e => {
      Sound.ensure();
      if (UI.blocking) { UI.advance(); return; }
      if (this.paused) return;
      c.setPointerCapture(e.pointerId);
      this.scene && this.scene.pointerdown && this.scene.pointerdown(...pos(e), e);
    });
    c.addEventListener('pointermove', e => { if (!this.paused) this.scene && this.scene.pointermove && this.scene.pointermove(...pos(e), e); });
    const up = e => { this.scene && this.scene.pointerup && this.scene.pointerup(...pos(e), e); };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    c.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const ov = document.querySelectorAll('.overlay');
        if (ov.length) { ov[ov.length - 1].remove(); if (!document.querySelector('.overlay')) this.paused = false; }
        else if (!(this.scene instanceof TitleScene)) this.openPause();
        return;
      }
      if (this.paused || UI.blocking) return;
      this.scene && this.scene.key && this.scene.key(e);
    });
    this.resize();
    this.setScene(new TitleScene());
    UI.loading(null, { click: true, label: 'Waking the Glassmoon' });
    let last = performance.now();
    const loop = now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (this.scene) {
        if (!this.paused) this.scene.update(dt);
        this.scene.draw(this.ctx, this.W, this.H);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },
  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.W = window.innerWidth; this.H = window.innerHeight;
    this.canvas.width = this.W * dpr; this.canvas.height = this.H * dpr;
    this.canvas.style.width = this.W + 'px'; this.canvas.style.height = this.H + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.scene && this.scene.layout && this.scene.layout(this.W, this.H);
  },
  setScene(s) {
    UI.clearHint();
    clearInterval(UI.typer); UI.blocking = false; UI.choosing = false; $('#dialog').classList.remove('show');
    document.querySelectorAll('.overlay').forEach(o => o.remove());
    this.paused = false;
    this.scene = s; s.enter(); s.layout && s.layout(this.W, this.H);
  },
  makeScene(b) {
    switch (b.type) {
      case 'story': return new StoryScene(b);
      case 'puzzle': return new PuzzleScene(b);
      case 'slicer': return new SlicerScene(b);
      case 'and': return new AndScene(b);
      case 'flip': return new FlipScene(b);
      case 'merge': return new MergeScene(b);
      case 'ending': return new EndingScene();
    }
  },

  // --- story flow ---
  title() { this.beat = -1; this.mini = null; this.setScene(new TitleScene()); },
  play(i, fromMenu) {
    const b = BEATS[i]; if (!b) return this.title();
    const prev = BEATS[this.beat];
    this.beat = i; this.mini = null;
    Save.saveAt(i);
    const newChapter = fromMenu || !prev || prev.ch !== b.ch;
    if (newChapter && b.type !== 'ending') {
      const ch = CHAPTERS[b.ch];
      this.setScene(new BlankScene());
      UI.card(ch.title, ch.sub, () => this.setScene(this.makeScene(b)));
    } else this.setScene(this.makeScene(b));
  },
  next() {
    if (this.beat < 0) return this.title();
    Save.markDone(this.beat);
    this.play(this.beat + 1);
  },
  restart() {
    if (this.mini) return this.setScene(this.makeScene(MINIGAMES[this.mini].cfg));
    if (this.beat >= 0) this.setScene(this.makeScene(BEATS[this.beat]));
  },
  continueGame() {
    const s = Save.slot(); if (!s) return this.newGameMenu();
    UI.loading(() => this.play(Math.min(s.beat, BEATS.length - 1), true), { label: 'Opening your save' });
  },
  startSlot(i) {
    Save.newGame(i);
    UI.loading(() => this.play(0, true), { label: 'Starting a new story' });
  },
  loadSlot(i) {
    Save.use(i);
    const s = Save.slot();
    UI.loading(() => this.play(Math.min(s.beat, BEATS.length - 1), true), { label: 'Loading your save' });
  },
  saveNow() {
    if (this.beat < 0) return;
    const slot = Save.saveAt(this.beat);
    UI.toast(`<span class="tk">Saved</span> Slot ${slot + 1}: ${BEATS[this.beat].name}`, 'good');
    Sound.play('chime');
  },

  // --- minigames ---
  playMinigame(key) {
    this.beat = -1; this.mini = key;
    UI.loading(() => this.setScene(this.makeScene(MINIGAMES[key].cfg)), { label: `Setting up ${MINIGAMES[key].name}` });
  },
  recordBest(key, score) { if (score > (Save.data.best[key] || 0)) { Save.data.best[key] = score; Save.write(); } },
  resultPanel({ title, who = 'nan', text, story }) {
    const { box, close } = UI.overlay(`<div class="res-m">${Mascot.of(who, 'happy')}</div><h2>${title}</h2><p>${text}</p>`, 'result');
    const row = el('div', 'trow');
    const again = el('button', 'btn big', 'Try again'); again.onclick = () => { close(); this.restart(); };
    row.appendChild(again);
    if (story) { const s = el('button', 'btn', 'Skip ahead'); s.onclick = () => { close(); this.next(); }; row.appendChild(s); }
    else { const m = el('button', 'btn', 'Minigames'); m.onclick = () => { close(); this.title(); this.minigamesMenu(); }; row.appendChild(m); }
    const t = el('button', 'btn', 'Title'); t.onclick = () => { close(); this.title(); }; row.appendChild(t);
    box.appendChild(row);
  },

  // --- menus ---
  slotPicker(mode) {
    const { box, close } = UI.overlay(`<h2>${mode === 'new' ? 'New game' : 'Load game'}</h2><p class="muted">${mode === 'new' ? 'Pick a slot for your story.' : 'Pick a save to continue from.'}</p>`, 'slots');
    const list = el('div', 'slotlist');
    Save.data.slots.forEach((s, i) => {
      const lab = slotLabel(s);
      const b = el('button', 'slot' + (s ? '' : ' empty') + (Save.data.active === i ? ' active' : ''),
        `<span class="snum">${i + 1}</span><span class="stext"><b>${lab.title}</b><small>${lab.sub}</small></span>`);
      if (mode === 'load' && !s) b.disabled = true;
      b.onclick = () => {
        if (mode === 'load') { close(); return this.loadSlot(i); }
        if (!s) { close(); return this.startSlot(i); }
        // Overwriting a save asks first, inside the panel.
        b.classList.add('confirm');
        b.innerHTML = `<span class="snum">${i + 1}</span><span class="stext"><b>Overwrite this save?</b><small>${lab.title} will be lost.</small></span>`;
        const yes = el('span', 'btn tiny danger', 'Overwrite'), no = el('span', 'btn tiny', 'Keep');
        yes.onclick = e => { e.stopPropagation(); close(); this.startSlot(i); };
        no.onclick = e => { e.stopPropagation(); close(); this.slotPicker(mode); };
        b.onclick = null; b.append(yes, no);
      };
      list.appendChild(b);
    });
    box.appendChild(list);
    const x = el('button', 'btn', 'Back'); x.onclick = close; box.appendChild(x);
  },
  newGameMenu() { this.slotPicker('new'); },
  loadMenu() { this.slotPicker('load'); },
  minigamesMenu() {
    const { box, close } = UI.overlay('<h2>Minigames</h2><p class="muted">Quick rounds that use a lot more gates than the story. Play them any time.</p>', 'minis');
    const grid = el('div', 'minigrid');
    const art = { slicer: Mascot.nan('happy'), merge: Mascot.inchu('happy'), flip: Mascot.pell() };
    const best = { slicer: Save.data.best.slicer ? `best ${Save.data.best.slicer}` : 'no score yet', merge: Save.data.best.merge ? `best ${Save.data.best.merge}` : 'no score yet', flip: Save.data.best.flip ? `best ${Save.data.best.flip.moves} flips` : 'no record yet' };
    for (const key of ['slicer', 'merge', 'flip']) {
      const m = MINIGAMES[key];
      const card = el('button', 'mini mini-' + key, `<div class="mart">${art[key]}</div><div class="mname">${m.name}</div><p>${m.blurb}</p><span class="mbest">${best[key]}</span>`);
      card.onclick = () => { close(); this.playMinigame(key); };
      grid.appendChild(card);
    }
    box.appendChild(grid);
    const x = el('button', 'btn', 'Back'); x.onclick = close; box.appendChild(x);
  },
  settingsMenu() {
    const st = Save.data.settings;
    const { box, close } = UI.overlay('<h2>Settings</h2>', 'settings');
    const row = (label, key) => {
      const r = el('label', 'toggle', `<input type="checkbox" id="set-${key}" ${st[key] ? 'checked' : ''}><span class="sw"></span>${label}`);
      r.querySelector('input').onchange = e => { st[key] = e.target.checked; Save.write(); if (key === 'music') Music.sync(); };
      box.appendChild(r);
    };
    row('Background music', 'music');
    row('Sound effects and voices', 'sfx');
    const wipe = el('button', 'btn tiny danger', 'Erase all saves and records');
    wipe.onclick = () => {
      wipe.textContent = 'Click again to erase everything';
      wipe.onclick = () => Save.wipe();
    };
    box.appendChild(el('div', 'wiperow')).appendChild(wipe);
    const x = el('button', 'btn', 'Done'); x.onclick = close; box.appendChild(x);
  },
  openPause() {
    if (document.querySelector('.overlay.pause-ov')) return;
    const { ov, box, close } = UI.overlay(`<div class="pcast">${Mascot.inchu()}${Mascot.nan()}</div><h2>Paused</h2>`, 'pause');
    ov.classList.add('pause-ov');
    const list = el('div', 'pmenu');
    const add = (label, fn, cls = '') => { const b = el('button', 'btn ' + cls, label); b.onclick = fn; list.appendChild(b); };
    add('Resume', close, 'big');
    if (this.beat >= 0) add('Save game', () => { this.saveNow(); close(); });
    if (Save.data.slots.some(Boolean)) add('Load game', () => { close(); this.loadMenu(); });
    if (this.beat >= 0) add('Chapters', () => { close(); this.openChapters(); });
    if (this.mini) add('Restart', () => { close(); this.restart(); });
    add('Settings', () => { close(); this.settingsMenu(); });
    add('Quit to title', () => { close(); this.title(); });
    box.appendChild(list);
  },
  openChapters() {
    const { box, close } = UI.overlay('<h2>Chapters</h2><p class="muted">Jump anywhere. Ticks mark what this save has finished.</p>', 'menu');
    for (const ch of CHAPTERS) {
      const sec = el('div', 'chap', `<h3>${ch.sub}: ${ch.title}</h3>`);
      BEATS.forEach((b, i) => {
        if (b.ch !== ch.n) return;
        const kind = { story: 'story', puzzle: 'puzzle', slicer: b.finale ? 'finale' : 'minigame', and: 'puzzle', flip: 'minigame', merge: 'minigame', ending: 'ending' }[b.type];
        const btn = el('button', 'beat' + (Save.isDone(i) ? ' done' : ''), `${Save.isDone(i) ? '✓ ' : ''}${b.name} <span class="muted">${kind}</span>`);
        btn.onclick = () => { close(); this.play(i, true); };
        sec.appendChild(btn);
      });
      box.appendChild(sec);
    }
    const x = el('button', 'btn', 'Close'); x.onclick = close; box.appendChild(x);
  },
};

// Shown behind chapter cards.
class BlankScene {
  enter() { this.t = 0; $('#hud').innerHTML = ''; }
  update(dt) { this.t += dt; }
  draw(ctx, W, H) { pond(ctx, W, H, this.t); }
}

window.addEventListener('load', () => Game.init());
