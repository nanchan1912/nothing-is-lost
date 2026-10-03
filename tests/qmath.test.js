// Run with: node tests/qmath.test.js
// Checks that the physics the game teaches is actually true.
const Q = require('../js/qmath.js');
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log('FAIL', msg); } };
const close = (a, b, e = 1e-9) => a.every((x, i) => Math.abs(x - b[i]) < e);

// 1. Matrix action and Bloch rotation agree for every gate, on random states.
for (const g of Object.keys(Q.GATES)) {
  for (let n = 0; n < 200; n++) {
    const v = Q.norm([Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5]);
    const s = Q.fromBloch(v);
    ok(close(Q.bloch(s), v, 1e-9), `fromBloch roundtrip`);
    const viaMatrix = Q.bloch(Q.apply(g, s));
    const viaRotation = Q.rotate(v, Q.GATES[g].axis, Q.GATES[g].angle);
    ok(close(viaMatrix, viaRotation, 1e-9), `${g}: matrix vs rotation`);
    // Unitary: the light never shrinks or swells.
    ok(Math.abs(Q.len(viaMatrix) - 1) < 1e-9, `${g}: length preserved`);
    // Reversible: gate then its inverse = nothing.
    ok(close(Q.bloch(Q.applyInverse(g, Q.apply(g, s))), v, 1e-9), `${g}: inverse undoes`);
  }
}

// 2. Every identity in the logbook is real.
for (const id of Q.IDENTITIES) {
  const target = id.is === 'I' ? Q.seqMatrix([]) : Q.GATES[id.is].m;
  ok(Q.equalUpToPhase(Q.seqMatrix(Q.decode(id.seq)), target), `identity ${id.seq} = ${id.is}`);
}
ok(!Q.equalUpToPhase(Q.seqMatrix(['H', 'X']), Q.seqMatrix(['X', 'H'])), 'HX != XH (order matters)');
ok(!Q.equalUpToPhase(Q.seqMatrix(['S', 'S']), Q.seqMatrix([])), 'SS != I (S is not its own undo)');

// 3. Named points and story facts.
const at = (k, seq) => seq.reduce((s, g) => Q.apply(g, s), Q.ket(k));
const where = s => Q.nearest(Q.bloch(s));
ok(where(at('0', ['X'])) === '1', 'X|0> = |1>');
ok(where(at('0', ['H'])) === '+', 'H|0> = |+>');
ok(where(at('0', ['Z'])) === '0', 'Z|0> = |0> (Spin does nothing at Home)');
ok(where(at('+', ['X'])) === '+', 'X|+> = |+> (Flip does nothing on its axis)');
ok(where(at('0', ['X', 'H'])) === '-', 'Flip then Tilt -> |->');
ok(where(at('0', ['H', 'X'])) === '+', 'Tilt then Flip -> |+>');
ok(where(at('-', ['H'])) === '1', 'H|-> = |1> (phase revealed)');
ok(where(at('0', ['H', 'Z', 'H'])) === '1', 'HZH|0> = |1>');
ok(where(at('+', ['S'])) === '+i', 'S|+> = |+i>');
ok(where(at('0', ['H', 'S', 'S'])) === '-', 'HSS|0> = |->');
ok(Math.abs(Q.pHome(Q.bloch(Q.ket('+'))) - 0.5) < 1e-12, 'Eye odds on the Rim are 50/50');
ok(Q.shortestPath('0', '1', ['H', 'Z']).join('') === 'HZH', 'no Flip: Home->Deep is HZH');
ok(Q.reachable('0', ['H', 'Z', 'S']).length === 6, 'H,Z,S reach all six points');

// 4. Combo detection.
const names = c => Q.findIdentities(Q.decode(c)).map(i => i.seq).join(',');
ok(names('HZH') === 'HZH', 'find HZH');
ok(names('XHZHX') === 'HZH', 'find HZH inside');
ok(names('SSSS') === 'SSSS', 'SSSS beats SS,SS');
ok(names('XXZZ') === 'XX,ZZ', 'two cancels');

ok(Q.routeTo([0,0,1],[0,0,-1],['H','Z']).join('')==='HZH','routeTo HZH');
ok(Q.routeTo([1,0,0],Q.rotate([1,0,0],[0,0,1],Math.PI/4),['T','H']).join('')==='T','routeTo T');
// 5. Minigame content: every Flip Flip pair and every merge rule is true, and groups never collide.
global.Q = Q;
const M = require('../js/minigames.js');
const vals = M.FLIP_GROUPS.map(g => g.cards.map(M.exprValue));
M.FLIP_GROUPS.forEach((g, i) => vals[i].forEach((v, k) => ok(M.sameValue(vals[i][0], v), `flip group ${g.id}: ${g.cards[k]} = ${g.cards[0]}`)));
for (let i = 0; i < vals.length; i++) for (let j = i + 1; j < vals.length; j++) ok(!M.sameValue(vals[i][0], vals[j][0]), `flip groups ${M.FLIP_GROUPS[i].id} and ${M.FLIP_GROUPS[j].id} differ`);
for (const r of M.MERGE_RULES) {
  const target = r.is === 'I' ? Q.seqMatrix([]) : Q.GATES[r.is].m;
  ok(Q.equalUpToPhase(Q.seqMatrix([r.a, r.b]), target), `merge ${r.a}+${r.b} = ${r.is}`);
  ok(Q.IDENTITIES.some(i => i.seq === r.seq), `merge ${r.seq} has a logbook identity`);
}
console.log(fails ? `${fails} failures` : 'all physics checks passed');
process.exit(fails ? 1 : 0);
