'use strict';
// Tiny quantum toolkit: complex numbers, single-qubit states and gates, Bloch-sphere geometry.
// Every gate is stored two ways: as a 2x2 unitary matrix (the truth) and as a rotation of the
// Bloch sphere (axis + angle, used for drawing and dragging). tests/qmath.test.js checks they agree.
const Q = (() => {
  const C = (re, im = 0) => ({ re, im });
  const cadd = (a, b) => C(a.re + b.re, a.im + b.im);
  const cmul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
  const cdiv = (a, b) => { const d = b.re * b.re + b.im * b.im; return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); };
  const conj = a => C(a.re, -a.im);
  const abs2 = a => a.re * a.re + a.im * a.im;
  const r = Math.SQRT1_2;
  const PI = Math.PI;

  const GATES = {
    X:   { id: 'X',   glyph: 'X',  name: 'Flip',    m: [[C(0), C(1)], [C(1), C(0)]],     axis: [1, 0, 0], angle: PI,      inverse: 'X' },
    Z:   { id: 'Z',   glyph: 'Z',  name: 'Spin',    m: [[C(1), C(0)], [C(0), C(-1)]],    axis: [0, 0, 1], angle: PI,      inverse: 'Z' },
    H:   { id: 'H',   glyph: 'H',  name: 'Tilt',    m: [[C(r), C(r)], [C(r), C(-r)]],    axis: [r, 0, r], angle: PI,      inverse: 'H' },
    S:   { id: 'S',   glyph: 'S',  name: 'Quarter', m: [[C(1), C(0)], [C(0), C(0, 1)]],  axis: [0, 0, 1], angle: PI / 2,  inverse: 'Sdg' },
    Sdg: { id: 'Sdg', glyph: 'S†', name: 'Quarter back', m: [[C(1), C(0)], [C(0), C(0, -1)]], axis: [0, 0, 1], angle: -PI / 2, inverse: 'S' },
    Y:   { id: 'Y',   glyph: 'Y',  name: 'Roll',    m: [[C(0), C(0, -1)], [C(0, 1), C(0)]], axis: [0, 1, 0], angle: PI, inverse: 'Y' },
    T:   { id: 'T',   glyph: 'T',  name: 'Nudge',   m: [[C(1), C(0)], [C(0), C(r, r)]],  axis: [0, 0, 1], angle: PI / 4,  inverse: 'Tdg' },
    Tdg: { id: 'Tdg', glyph: 'T†', name: 'Nudge back', m: [[C(1), C(0)], [C(0), C(r, -r)]], axis: [0, 0, 1], angle: -PI / 4, inverse: 'T' },
  };
  // Half-turn gates land in the same place whichever way round you go.
  for (const g of Object.values(GATES)) g.twoWay = Math.abs(Math.abs(g.angle) - PI) < 1e-9;

  const KETS = {
    '0': [C(1), C(0)], '1': [C(0), C(1)],
    '+': [C(r), C(r)], '-': [C(r), C(-r)],
    '+i': [C(r), C(0, r)], '-i': [C(r), C(0, -r)],
  };
  const POINTS = {
    '0': [0, 0, 1], '1': [0, 0, -1],
    '+': [1, 0, 0], '-': [-1, 0, 0],
    '+i': [0, 1, 0], '-i': [0, -1, 0],
  };
  const LABEL = { '0': '|0⟩', '1': '|1⟩', '+': '|+⟩', '-': '|−⟩', '+i': '|+i⟩', '-i': '|−i⟩' };
  const PLACE = { '0': 'Home', '1': 'the Deep', '+': 'the Rim', '-': 'the far Rim', '+i': 'the Rim', '-i': 'the Rim' };

  const gate = g => (typeof g === 'string' ? GATES[g] : g);
  const ket = k => KETS[k].map(c => C(c.re, c.im));

  function apply(g, s) {
    const m = gate(g).m;
    return [cadd(cmul(m[0][0], s[0]), cmul(m[0][1], s[1])), cadd(cmul(m[1][0], s[0]), cmul(m[1][1], s[1]))];
  }
  function applyInverse(g, s) { return apply(gate(g).inverse, s); }

  function bloch(s) {
    const ab = cmul(conj(s[0]), s[1]);
    return [2 * ab.re, 2 * ab.im, abs2(s[0]) - abs2(s[1])];
  }
  function fromBloch(v) {
    const th = Math.acos(Math.max(-1, Math.min(1, v[2]))), ph = Math.atan2(v[1], v[0]);
    return [C(Math.cos(th / 2)), C(Math.cos(ph) * Math.sin(th / 2), Math.sin(ph) * Math.sin(th / 2))];
  }

  // --- vector helpers ---
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const len = a => Math.sqrt(dot(a, a));
  const norm = a => { const l = len(a) || 1; return scale(a, 1 / l); };
  // Rodrigues: rotate v about unit axis n by angle t (right-hand rule).
  function rotate(v, n, t) {
    const c = Math.cos(t), s = Math.sin(t), k = dot(n, v) * (1 - c), x = cross(n, v);
    return [v[0] * c + x[0] * s + n[0] * k, v[1] * c + x[1] * s + n[1] * k, v[2] * c + x[2] * s + n[2] * k];
  }
  // How far a point sits from a rotation axis (0 = on the axis, so the rotation can't move it).
  const offAxis = (v, n) => len(cross(v, n));

  const fidelity = (v, w) => (1 + dot(v, w)) / 2;
  const pHome = v => (1 + v[2]) / 2; // the Eye sees Home with probability (1 + z) / 2
  function nearest(v) {
    let best = null, bd = -2;
    for (const k in POINTS) { const d = dot(v, POINTS[k]); if (d > bd) { bd = d; best = k; } }
    return best;
  }
  function measure(s, rnd = Math.random) {
    const p0 = abs2(s[0]);
    const outcome = rnd() < p0 ? '0' : '1';
    return { outcome, p0, state: ket(outcome) };
  }

  // --- matrices, for checking identities ---
  function matmul(A, B) {
    return [0, 1].map(i => [0, 1].map(j => cadd(cmul(A[i][0], B[0][j]), cmul(A[i][1], B[1][j]))));
  }
  const IDM = [[C(1), C(0)], [C(0), C(1)]];
  // seq is in the order the gates are applied (first letter happens first).
  function seqMatrix(seq) {
    let M = IDM;
    for (const g of seq) M = matmul(gate(g).m, M);
    return M;
  }
  function equalUpToPhase(A, B, eps = 1e-9) {
    let ph = null;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      if (abs2(A[i][j]) > eps) { ph = cdiv(B[i][j], A[i][j]); break; }
    }
    if (!ph || Math.abs(abs2(ph) - 1) > 1e-6) return false;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const d = cadd(cmul(A[i][j], ph), C(-B[i][j].re, -B[i][j].im));
      if (abs2(d) > eps) return false;
    }
    return true;
  }

  // Sequences that secretly equal a single gate (or nothing). Found in one swipe = a logbook page.
  // 'is' is the result, 'I' means "as if nothing happened".
  // One letter per gate for pattern matching: S† is 's', T† is 't'.
  const CODE = { X: 'X', Y: 'Y', Z: 'Z', H: 'H', S: 'S', Sdg: 's', T: 'T', Tdg: 't' };
  const UNCODE = Object.fromEntries(Object.entries(CODE).map(([k, v]) => [v, k]));
  const decode = str => str.split('').map(c => UNCODE[c]);
  const IDENTITIES = [
    { seq: 'HSSH', is: 'X', title: 'Double Disguise', text: 'Tilt, Quarter, Quarter, Tilt. Two Quarters make a Spin, and a Spin seen sideways is a Flip.' },
    { seq: 'SSSS', is: 'I', title: 'Full Circle', text: 'Four quarter turns make one whole turn: back where you began.' },
    { seq: 'HZH', is: 'X', title: 'Disguised Flip', text: 'Tilt the light sideways, Spin it, Tilt it back: the Spin acts as a Flip.' },
    { seq: 'HXH', is: 'Z', title: 'Disguised Spin', text: 'Tilt, Flip, Tilt: the Flip acts as a Spin. Tilting swaps the Flip axis and the Spin axis.' },
    { seq: 'HYH', is: 'Y', title: 'Unmoved Roll', text: 'Tilt, Roll, Tilt is still a Roll (facing the other way, which the light can\'t tell apart).' },
    { seq: 'SSS', is: 'Sdg', title: 'The Long Way Back', text: 'Three Quarters forward equal one Quarter backward. S† = SSS.' },
    { seq: 'TT', is: 'S', title: 'Two Nudges', text: 'Two eighth-turns make a quarter turn: TT = S.' },
    { seq: 'SS', is: 'Z', title: 'Two Quarters', text: 'Two quarter turns make a half turn: SS = Z.' },
    { seq: 'ss', is: 'Z', title: 'Two Quarters Back', text: 'Two quarter turns backwards are also a half turn: S†S† = Z.' },
    { seq: 'Ss', is: 'I', title: 'Quarter Undone', text: 'A Quarter and a Quarter-back cancel: SS† = I.' },
    { seq: 'sS', is: 'I', title: 'Quarter Undone', text: 'A Quarter-back and a Quarter cancel: S†S = I.' },
    { seq: 'Tt', is: 'I', title: 'Nudge Undone', text: 'A Nudge and a Nudge-back cancel: TT† = I.' },
    { seq: 'tT', is: 'I', title: 'Nudge Undone', text: 'A Nudge-back and a Nudge cancel: T†T = I.' },
    { seq: 'XX', is: 'I', title: 'Flip Undone', text: 'A Flip undoes itself.' },
    { seq: 'YY', is: 'I', title: 'Roll Undone', text: 'A Roll undoes itself.' },
    { seq: 'ZZ', is: 'I', title: 'Spin Undone', text: 'A Spin undoes itself.' },
    { seq: 'HH', is: 'I', title: 'Tilt Undone', text: 'A Tilt undoes itself.' },
    { seq: 'XZ', is: 'Y', title: 'Flip-Spin Roll', text: 'A Flip and a Spin together turn the light exactly like a Roll: XZ ∝ Y.' },
    { seq: 'ZX', is: 'Y', title: 'Spin-Flip Roll', text: 'A Spin and a Flip together turn the light exactly like a Roll: ZX ∝ Y.' },
  ];
  // Find identities inside a cut sequence (array of gate ids): longest first, non-overlapping.
  function findIdentities(cuts) {
    const s = cuts.map(g => CODE[g]).join(''), found = [], used = new Array(s.length).fill(false);
    const order = IDENTITIES.slice().sort((a, b) => b.seq.length - a.seq.length);
    for (const id of order) {
      let from = 0, at;
      while ((at = s.indexOf(id.seq, from)) !== -1) {
        let free = true;
        for (let k = at; k < at + id.seq.length; k++) if (used[k]) free = false;
        if (free) { for (let k = at; k < at + id.seq.length; k++) used[k] = true; found.push(id); }
        from = at + 1;
      }
    }
    return found;
  }

  // Where a gate sends one of the six named points.
  const step = (key, g) => nearest(rotate(POINTS[key], gate(g).axis, gate(g).angle));
  function shortestPath(from, to, gates) {
    if (from === to) return [];
    const prev = { [from]: null }, q = [from];
    while (q.length) {
      const k = q.shift();
      for (const g of gates) {
        const n = step(k, g);
        if (n in prev) continue;
        prev[n] = [k, g];
        if (n === to) {
          const path = []; let c = n;
          while (prev[c]) { path.unshift(prev[c][1]); c = prev[c][0]; }
          return path;
        }
        q.push(n);
      }
    }
    return null;
  }
  function reachable(from, gates) {
    const seen = new Set([from]), q = [from];
    while (q.length) { const k = q.shift(); for (const g of gates) { const n = step(k, g); if (!seen.has(n)) { seen.add(n); q.push(n); } } }
    return [...seen];
  }

  // Shortest lever sequence from one Bloch vector to another (breadth-first, a few steps deep).
  function routeTo(v, t, gates, depth = 4) {
    const key = p => p.map(x => x.toFixed(3)).join(',');
    if (dot(v, t) > 0.995) return [];
    let frontier = [[v, []]]; const seen = new Set([key(v)]);
    for (let d = 0; d < depth; d++) {
      const next = [];
      for (const [p, path] of frontier) for (const g of gates) {
        const q = rotate(p, GATES[g].axis, GATES[g].angle), k = key(q);
        if (seen.has(k)) continue; seen.add(k);
        const np = path.concat(g);
        if (dot(q, t) > 0.995) return np;
        next.push([q, np]);
      }
      frontier = next;
    }
    return null;
  }

  return {
    C, GATES, CODE, decode, routeTo, KETS, POINTS, LABEL, PLACE, IDENTITIES,
    gate, ket, apply, applyInverse, bloch, fromBloch,
    dot, cross, scale, vadd, len, norm, rotate, offAxis,
    fidelity, pHome, nearest, measure,
    matmul, seqMatrix, equalUpToPhase, findIdentities, step, shortestPath, reachable,
  };
})();

if (typeof module !== 'undefined') module.exports = Q;
