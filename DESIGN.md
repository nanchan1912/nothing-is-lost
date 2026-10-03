# Nothing Is Lost: design notes

**One line:** Nan, a tiny atom, becomes apprentice to Inchu, a little qubit-orb who keeps the lantern inside a glass moon. The lantern's beam is a qubit, the glass is the Bloch sphere, and the levers are gates. Every turn can be undone. The one thing that can't be undone is being *looked at*.

**Run it:** open `index.html` in any browser. No install and no build. Fonts load from Google Fonts; everything else is local.
**Physics check:** `node tests/qmath.test.js` checks every claim the game makes. That covers gate matrices against rotations, lengths preserved, inverses, every logbook identity, every Flip Flip pair and every Gate Merge rule.

---

## The physics → the fiction

| Real idea | In the game |
|---|---|
| Qubit state | The lantern's beam, a fixed-length arrow from the centre to the glass |
| Bloch sphere | The Glassmoon. Up = Home \|0⟩, down = the Deep \|1⟩, middle belt = the Rim |
| X, H, Z, S (story) + Y, T, S†, T† (minigames) | Flip, Tilt, Spin, Quarter, Roll, Nudge… Each one moves the light along its own coloured ring |
| Unitarity (U†U = I, length preserved) | "The light never dims, never grows." The x, y, z readout shows length 1.00 at all times |
| Reversibility | The ⟲ rewind wheel, and dragging the light *backwards along its own trail* |
| State-vector trajectory | The glowing trail each turn leaves on the glass |
| Measurement | **The Eye.** Its look snaps the light to Home or Deep and *tears the trail*, so rewind stops at the tear |
| Decoherence | **Noise** in Gate Slicer *shrinks* the arrow, which no gate can undo. Only a QEC (error correction) token restores it |
| Classical irreversibility | The dark lighthouse that ran on AND-machines (three inputs → one output → no way back) |

## Cast

- **Inchu**, keeper of the lantern: a mint qubit-orb with spectacles and a lantern antenna (the Bloch vector).
- **Nan**, the apprentice: a peach atom with an orbiting electron.
- **The Eye**: a lilac one-eyed blob, the thing that measures.
- **Pell**: a pale blue wisp, Inchu's lost little brother.

Every line of dialogue is spoken by one of them. Their animated SVG portraits talk while the text types out, and each one has its own voice blips.

## Mechanics

1. **Trace (puzzles):** drag the tip of the light along a lever's ring. Half turns land in the same place either way round, which is why X, Z and H undo themselves. The Quarter only turns one way. Drag backwards along the trail to undo a move.
2. **Gate Slicer (Fruit Ninja style):** swipe flying gates; a single swipe applies them in order. Disguises cut in one swipe (HZH = X, TT = S, XZ ∝ Y…) add logbook pages. The hazard is the Eye in the story and **noise** in the minigame.
3. **Gate Merge (Suika style):** drop gate bubbles into a jar. TT → S → Z → poof (ZZ = I); XX, HH and YY go poof; X + Z → Y.
4. **Flip Flip (memory):** match cards that are secretly equal, such as HZH with X, H|0⟩ with |+⟩, or SSS with S†.

## Story arc (≈15–20 min, 24 beats; jump anywhere from Menu → Chapters)

| Ch | Title | Teaches | Minigame |
|---|---|---|---|
| 0 | Prologue | The light, Home/Deep, "every turn can be unturned… almost" | — |
| 1 | The Flip | X as a half turn, XX = I; AND forgets, X doesn't | Lever Slicer (X only) |
| 2 | The Tilt | H, superposition, odds meter; X does nothing at \|+⟩; order matters | Flip Flip (X/H states) |
| 3 | The Silent Spin | Z does nothing at Home; phase (\|+⟩ vs \|−⟩); HZH = X | Lever Slicer (disguises) |
| 4 | The Storm | Rewind along the trail; undo in reverse order; the Flip lever breaks | — |
| 5 | The Quarter Turn | S, \|±i⟩, coordinates; S isn't its own undo (S† = SSS); SS = Z | Gate Merge (SS, ZZ, XX, HH) |
| 6 | The Eye | Measurement is irreversible but harmless at a pole | Lever Slicer with the Eye's gaze |
| 7 | Pell | Twist: the Eye took Pell's *road*, not Pell. Finale: bring him home with HZH between the Eye's blinks | Finale |

## Game shell

- Loading screen with both mascots and a random **quantum tip** (20 tips) on boot, new game, load and minigame start.
- **Three save slots**: New game, Continue, Load game, plus Save game from the pause menu (Esc). The game also autosaves at every beat.
- **Minigames** hub on the title screen, with best scores.
- Settings for music and sound effects, plus an option to erase all saves.
- **Music**: generative ambient (slow, slightly eerie chords and a music-box echo), synthesised live with WebAudio, so the game ships no audio files.

## Files

- `index.html`: page and all styles
- `js/qmath.js`: complex numbers, gates as matrices *and* rotations, measurement, identities, routing
- `js/sphere.js`: Bloch sphere renderer
- `js/mascots.js`: Inchu, Nan, the Eye and Pell as SVG, with moods
- `js/audio.js`: sound effects, voice blips, ambient music
- `js/ui.js`: saves, dialog with typewriter text, hints, loading screen, logbook, tips
- `js/scenes.js`: title, story, puzzle, slicer (and finale), AND interlude, ending
- `js/minigames.js`: Gate Merge and Flip Flip
- `js/story.js`: **all dialogue and level data**, plus the minigame setups
- `js/main.js`: flow, menus, save and load
- `tests/qmath.test.js`: physics and content checks
