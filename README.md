# Nothing Is Lost

A small story game about a lantern, some levers, and the one thing you can't undo.

**Play it:** https://nanchan1912.github.io/nothing-is-lost/

Nan, a tiny atom, becomes apprentice to Inchu, the qubit-orb who keeps the lantern inside a glass moon. The lantern's beam is a qubit, the glass is the Bloch sphere, and every lever is a quantum gate. Every turn of a lever can be undone, because quantum gates are reversible (U†U = I). The only thing that can't be undone is being looked at: measurement.

## What you'll learn by playing

- A qubit is an arrow on the Bloch sphere; gates are rotations of it (X, Y, Z, H, S, T)
- Gates never shrink the arrow, so they can always be undone, in reverse order
- Order matters (HX ≠ XH), and phase is real even when you can't measure it
- Gate identities like HZH = X, SS = Z, TT = S
- Why classical AND loses information and quantum gates don't
- Measurement is the one irreversible step, unless the qubit is already at a pole
- Noise (decoherence) shrinks the arrow, and error correction fights it

## Modes

- **Story**: 7 chapters, about 15–20 minutes, with three save slots
- **Gate Slicer**: swipe flying gates to steer the qubit; dodge noise
- **Gate Merge**: drop gate bubbles into a jar; TT → S → Z → poof
- **Flip Flip**: memory cards that match when they're secretly the same gate or state

## Run locally

Open `index.html` in a browser. There is no build step.

`node tests/qmath.test.js` checks that every piece of physics in the game is true.

See [DESIGN.md](DESIGN.md) for the full design notes.
