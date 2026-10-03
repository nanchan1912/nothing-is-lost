'use strict';
// The whole story, beat by beat. Each beat is one scene; chapters group beats.
// Speakers: inchu (the Keeper, a little qubit-orb with a lantern antenna), nan (the apprentice,
// a tiny atom), eye, pell. A third array item is a mood: 'happy', 'sad', 'shock'.
const ALL6 = ['0', '1', '+', '-', '+i', '-i'];
const CHAPTERS = [
  { n: 0, title: 'Prologue', sub: 'The Glassmoon' },
  { n: 1, title: 'The Flip', sub: 'Chapter One' },
  { n: 2, title: 'The Tilt', sub: 'Chapter Two' },
  { n: 3, title: 'The Silent Spin', sub: 'Chapter Three' },
  { n: 4, title: 'The Storm', sub: 'Chapter Four' },
  { n: 5, title: 'The Quarter Turn', sub: 'Chapter Five' },
  { n: 6, title: 'The Eye', sub: 'Chapter Six' },
  { n: 7, title: 'Pell', sub: 'Chapter Seven' },
];

const BEATS = [
  // ── PROLOGUE ──────────────────────────────────────────────────────────────────────────────
  { ch: 0, type: 'story', name: 'The lantern', title: 'Prologue', beam: '0', lines: [
    ['nan', 'Hello? Is this the Glassmoon? The little moon past the edge of every map?', 'shock'],
    ['inchu', 'It is. And you must be the new apprentice. Nan, was it? Come in, mind the glass.', 'happy'],
    ['inchu', 'I\'m Inchu. I keep the lantern. See it, right in the middle? Its light points one way at a time.'],
    ['inchu', 'Wherever it points, lost travellers can find their way home. We call them <i>wisps</i>.'],
    ['nan', 'And my job is to point it?'],
    ['inchu', 'Your job is to <b>turn</b> it. First rule of the Glassmoon: the light never dims and never grows. Its tip always touches the glass.'],
    { who: 'inchu', text: 'Straight up is <b>Home</b>. Straight down is <b>the Deep</b>. Old keepers write them |0⟩ and |1⟩. Don\'t let the squiggles scare you, they\'re just names.', fx: s => { s.labels = ['0', '1']; } },
    ['inchu', 'Second rule, the important one: <b>every turn can be unturned.</b> Nothing here is ever lost.', 'happy'],
    { who: 'inchu', text: '...Well. Almost nothing.', m: 'sad', fx: s => { s.wisps = [{ at: '1', name: '', color: '#6c7f7a', alpha: 0.6 }]; } },
    ['nan', 'What\'s that dim little light, all the way down at the bottom?'],
    { who: 'inchu', text: 'Nothing that needs you tonight. Come on. There\'s a wisp waiting.', fx: s => { s.wisps = []; } },
  ] },

  // ── CHAPTER 1: THE FLIP ───────────────────────────────────────────────────────────────────
  { ch: 1, type: 'puzzle', name: 'Down to the Deep', title: 'Ch 1 · The Flip', start: '0', labels: ['0', '1'],
    unlock: ['light', 'X'],
    intro: [
      ['inchu', 'A wisp has drifted down into the Deep. We need the light pointing straight down at it.'],
      ['inchu', 'See the <span class="cX">red ring</span> running through the tip of the light? That\'s the track of the <b>Flip</b> lever.'],
      ['nan', 'So I just... grab the light?'],
      ['inchu', 'Grab the bright tip and <b>drag it along the red ring</b>, half a turn, all the way to the bottom.'],
    ],
    steps: [
      { target: '1', gates: ['X'], par: 1, obj: 'Drag the tip of the light along the <span class="cX">red ring</span> down to the wisp at |1⟩.',
        after: [['nan', 'It worked! The wisp is climbing the light like a ladder!', 'happy'], ['inchu', 'Half a turn around the red axis, and Home became the Deep. Off it goes.']] },
      { target: '0', par: 1, obj: 'Another wisp, back at Home |0⟩. Go round the <i>other</i> way this time.',
        before: [['inchu', 'Another one, back up at Home. Same lever. Try going round the ring the <i>other</i> way.']],
        after: [
          ['nan', 'Huh. Other way round, same place.'],
          ['inchu', 'Half a turn is half a turn. And notice: Flip, then Flip again, and you\'re right back where you started. The Flip is its own undo.'],
          ['inchu', 'Keepers scribble that as <b>XX = I</b>. "I" just means "as if nothing happened". (You can also tap the lever, or press <kbd>X</kbd>.)'],
        ] },
    ] },
  { ch: 1, type: 'and', name: 'The dark lighthouse', title: 'Ch 1 · The dark lighthouse',
    intro: [
      ['nan', 'Inchu, what\'s that black tower across the bay?'],
      ['inchu', 'The old lighthouse. It went dark before I was born.', 'sad'],
      ['inchu', 'It ran on <b>AND</b>-machines. Two lamps go in, one comes out, and it\'s lit only if <i>both</i> lamps were lit.'],
      ['inchu', 'A little game. I fed it two lamps. Its light came out dark. Which two did I use?'],
    ],
    outro: [
      ['inchu', 'That\'s why it went dark. Every night the AND-machines threw a little information away, and nobody could ever wind it back.'],
      ['nan', 'But our levers don\'t throw anything away?'],
      ['inchu', 'Never. If the light points at the Deep and you know the Flip was pulled, it was Home before. Certainly. <b>One road in, one road out.</b> That\'s what makes a turn undoable.', 'happy'],
    ] },
  { ch: 1, type: 'slicer', name: 'Lever Slicer: first night', title: 'Ch 1 · First night', gates: ['X'], goal: 5, time: 50, pool: ['0', '1'], labels: ['0', '1'], spawnEvery: 1.0,
    intro: [
      ['inchu', 'Busy night! When the wisps swarm, the levers shake loose and drift up out of the works like sparks.'],
      ['inchu', '<b>Hold down and swipe</b> through a lever to cut it. That pulls it. Watch where the wisp is and cut what you need.'],
      ['nan', 'And if I cut the wrong one?'],
      ['inchu', 'Press <kbd>Space</kbd>, right-click, or hit ⟲ to wind it back. That\'s not cheating. That\'s the law.', 'happy'],
    ],
    outro: [['nan', 'Five wisps! Did you see that?', 'happy'], ['inchu', 'Not bad for a first night. Tomorrow, a new lever.']] },

  // ── CHAPTER 2: THE TILT ───────────────────────────────────────────────────────────────────
  { ch: 2, type: 'puzzle', name: 'Out to the Rim', title: 'Ch 2 · The Tilt', start: '0', labels: ['0', '1', '+', '-'],
    unlock: ['H', 'super'],
    intro: [
      ['inchu', 'Tonight\'s wisp is out on the <b>Rim</b>, the belt around the middle of the glass.'],
      ['nan', 'The Flip only goes up and down though...'],
      ['inchu', 'Exactly. So meet the <b>Tilt</b>. Its ring is the <span class="cH">gold</span> one. It turns around a slanted axis, halfway between Home and the Rim.'],
    ],
    steps: [
      { target: '+', gates: ['X', 'H'], par: 1, obj: 'Use the <span class="cH">gold Tilt ring</span> to reach the wisp on the Rim at |+⟩.',
        after: [
          ['inchu', 'Now the light points sideways. Not Home, not Deep, a bit of both. Keepers call that a <b>superposition</b>. This spot is |+⟩.'],
          { who: 'inchu', text: 'See the meter up top? It shows what you\'d get if anything <i>looked</i> at the light right now.', fx: s => { s.showOdds = true; s.refreshHud(); } },
          ['nan', 'Fifty-fifty. So it\'s half Home and half Deep?'],
          ['inchu', 'No! If something looked, it would see Home <i>or</i> Deep, one or the other, like a coin toss. The higher the light points, the likelier Home.'],
          ['inchu', 'There are things out there that look. Let\'s leave it at that for now.', 'sad'],
        ] },
    ] },
  { ch: 2, type: 'puzzle', name: 'A wheel on its axle', title: 'Ch 2 · The Tilt', start: '+', labels: ['0', '1', '+', '-'], odds: true,
    steps: [
      { target: '1', gates: ['X', 'H'], par: 2, obj: 'From the Rim, reach the wisp in the Deep |1⟩. Two pulls should do it.',
        before: [['inchu', 'From the Rim down to the Deep. Two pulls. Try the Flip first, if you like.']],
        onMove: (s, g, moved) => {
          if (g === 'X' && !moved) { UI.hint('nan', 'Wait, nothing happened! Oh... the light is sitting right on the Flip\'s own axis. A wheel can\'t move its own axle.', 7000); Sound.play('nomove'); return true; }
        },
        after: [['inchu', 'Remember that: a lever can\'t move a light that sits on its own axis.']] },
    ] },
  { ch: 2, type: 'puzzle', name: 'Order matters', title: 'Ch 2 · The Tilt', start: '0', labels: ['0', '1', '+', '-'], odds: true,
    unlock: ['order'],
    steps: [
      { target: '-', gates: ['X', 'H'], par: 2, wispName: 'wisp at |−⟩', obj: 'Reach the wisp on the far side of the Rim, |−⟩, in two pulls.',
        before: [['inchu', 'This wisp is on the far side of the Rim, at |−⟩. Flip and Tilt, two pulls. Which first?']],
        stuck: 'Wind it back to Home (⏮) and try the same two levers in the <i>other</i> order.',
        after: [
          ['inchu', 'Flip then Tilt lands at |−⟩. Tilt then Flip would have left you at |+⟩.'],
          ['nan', 'Same two levers, different order, different place!', 'shock'],
          ['inchu', 'On the Glassmoon, <b>order matters</b>. Hold on to that. It\'s about to matter a lot.'],
        ] },
    ] },
  { ch: 2, type: 'flip', name: 'Flip Flip: lantern cards', title: 'Ch 2 · Flip Flip', story: true,
    groups: [
      { id: 'k1', cards: ['|1⟩', 'X|0⟩'], why: 'A Flip takes Home to the Deep.' },
      { id: 'k0', cards: ['|0⟩', 'X|1⟩'], why: 'A Flip takes the Deep back Home.' },
      { id: 'kp', cards: ['|+⟩', 'H|0⟩'], why: 'A Tilt from Home lands on |+⟩.' },
      { id: 'km', cards: ['|−⟩', 'H|1⟩'], why: 'A Tilt from the Deep lands on |−⟩.' },
      { id: 'I', cards: ['XX', 'HH'], why: 'Both levers undo themselves, so both pairs mean "nothing happened".' },
    ], pairs: 5,
    intro: [
      ['nan', 'Inchu, what are all these cards on your desk?'],
      ['inchu', 'Lantern cards. My teacher made them. Each pair says the same thing two ways: X|0⟩ is just |1⟩ wearing a coat.', 'happy'],
      ['inchu', 'I\'ll show them to you for a moment. Then find the pairs. (Written H|0⟩ means "pull H while the light is at |0⟩".)'],
    ],
    outro: [['inchu', 'Good memory. One more lever and you\'ll have the full set my teacher gave me.']] },

  // ── CHAPTER 3: THE SILENT SPIN ────────────────────────────────────────────────────────────
  { ch: 3, type: 'puzzle', name: 'The lever that does nothing', title: 'Ch 3 · The Silent Spin', start: '0', labels: ['0', '1', '+', '-'], odds: true,
    intro: [
      ['inchu', 'Third lever: the <b>Spin</b>. Its <span class="cZ">blue</span> axis runs straight up and down, and it turns the glass round like a carousel.'],
      ['inchu', 'Go on. Pull it. (Tap the Spin lever, or press <kbd>Z</kbd>.)'],
    ],
    steps: [
      { gates: ['Z'], until: 'move', obj: 'Pull the <span class="cZ">Spin</span> lever.', onMove: () => true,
        after: [
          ['nan', '...Nothing happened. Did I break it?', 'shock'],
          ['inchu', 'It turned. Watch the blue ring: the whole glass went round. But the light points straight along the Spin\'s axis, so it stayed put.'],
          ['inchu', 'Same thing you saw with the Flip at |+⟩. Tilt the light onto the Rim first. <i>Then</i> Spin.'],
        ] },
      { target: '-', gates: ['H', 'Z'], par: 2, obj: 'Reach the wisp at |−⟩ using Tilt and Spin.',
        after: [
          ['nan', 'Now it moved! Half a turn around the Rim, from |+⟩ to |−⟩.', 'happy'],
          ['inchu', 'Look at the meter. Fifty-fifty, same as at |+⟩. Anything that looked would see no difference at all between |+⟩ and |−⟩.'],
          ['inchu', 'But they <i>are</i> different. Watch.'],
        ] },
    ] },
  { ch: 3, type: 'puzzle', name: 'The invisible mark', title: 'Ch 3 · The Silent Spin', start: '-', labels: ['0', '1', '+', '-'], odds: true,
    unlock: ['Z', 'phase'],
    intro: [
      { who: 'inchu', text: 'From |+⟩, one Tilt takes you Home. You\'re at |−⟩, and the meter says it\'s just as fifty-fifty. One Tilt from here lands where?', choices: [
        { label: 'Home, same as |+⟩', reply: [['inchu', 'That\'s what the meter would have you think. Pull it and see.']] },
        { label: 'The Deep', reply: [['inchu', 'You\'ve a nose for this. Pull it and see.', 'happy']] },
        { label: 'Somewhere random', reply: [['inchu', 'Levers are never random. Only looking is. Pull it and see.']] },
      ] },
    ],
    steps: [
      { target: '1', gates: ['H'], par: 1, obj: 'Tilt once.',
        after: [
          ['nan', 'The Deep?! But |+⟩ went Home!', 'shock'],
          ['inchu', 'The Spin left a mark the meter can\'t see. Keepers call it <b>phase</b>. It\'s invisible to anything that looks, until a Tilt turns it sideways into something you <i>can</i> see.'],
        ] },
    ] },
  { ch: 3, type: 'puzzle', name: 'Pretend it\'s broken', title: 'Ch 3 · The Silent Spin', start: '0', labels: ['0', '1', '+', '-'], odds: true, broken: ['X'],
    unlock: ['disguise'],
    intro: [
      ['inchu', 'Now. <b>Pretend the Flip lever is broken.</b>'],
      ['inchu', 'Get the light from Home to the Deep anyway. I\'ll wait.', 'happy'],
    ],
    steps: [
      { target: '1', gates: ['H', 'Z'], par: 3, obj: 'Reach the Deep |1⟩ <b>without</b> the Flip.',
        stuck: 'Think about what you just saw: from |−⟩, one Tilt drops you into the Deep. So how do you get to |−⟩?',
        after: [
          ['nan', 'Tilt, Spin, Tilt! It\'s a Flip wearing a disguise!', 'happy'],
          ['inchu', 'Turn the light sideways, Spin it, turn it back, and the Spin acts like a Flip. Keepers write <b>HZH = X</b>.'],
          ['inchu', 'You\'ll thank me for that one someday.'],
        ] },
    ] },
  { ch: 3, type: 'slicer', name: 'Lever Slicer: disguises', title: 'Ch 3 · Disguises', gates: ['X', 'Z', 'H'], goal: 7, time: 70, pool: ['0', '1', '+', '-'],
    constellations: [['H', 'Z', 'H'], ['H', 'X', 'H']], consRate: 0.4,
    intro: [
      ['inchu', 'Sometimes the levers drift up in a line. <b>Cut several in one swipe</b> and they\'re pulled in the order you cut them.'],
      ['nan', 'And if I catch Tilt-Spin-Tilt in one swipe...?'],
      ['inchu', 'Then it goes in the logbook as a disguise. Go!', 'happy'],
    ],
    outro: [['inchu', 'Smell that? Rain. Get some sleep, Nan. Tomorrow will be a long night.', 'sad']] },

  // ── CHAPTER 4: THE STORM ──────────────────────────────────────────────────────────────────
  { ch: 4, type: 'puzzle', name: 'Wind it back', title: 'Ch 4 · The Storm', start: '+', labels: ['0', '1', '+', '-'], odds: true,
    unlock: ['reverse'],
    intro: [
      ['nan', 'Inchu, the wisp at |+⟩ is halfway up the light, and the wind is changing...'],
      ['inchu', 'Storm! Hold the light, hold it...!', 'shock'],
    ],
    storm: { seq: ['Z', 'H', 'X'], after: [
      ['nan', 'It\'s gone quiet. The light got thrown all over the glass! The wisp is still clinging to |+⟩.', 'shock'],
      ['inchu', 'Don\'t guess. Guessing is how you lose things.'],
      ['inchu', 'Look at the glass. The light left a <b>trail</b>: every turn the storm made, in order. Nothing is lost. We just play it backwards.'],
      ['inchu', 'The levers are iced up, but the trail isn\'t. <b>Grab the tip and drag it backwards along the dashed white arc</b>, the last turn first. Then the one before. All the way.'],
    ] },
    steps: [
      { gates: [], until: 'rewound', target: '+', obj: 'Wind the storm back: drag the tip backwards along the trail, <b>last turn first</b>. (Or press ⟲.)',
        after: [
          ['nan', 'Like a film running backwards! Every frame right where it was.', 'happy'],
          ['inchu', 'That\'s the whole secret of the Glassmoon. Every turn has an unturn, and if you undo them <b>last turn first</b>, you land exactly where you began.'],
        ] },
    ] },
  { ch: 4, type: 'puzzle', name: 'The smudged log', title: 'Ch 4 · The Storm', start: '+', labels: ['0', '1', '+', '-'], odds: true, rewind: false,
    intro: [['nan', 'Another gust! And the rain\'s washing the trail right off the glass!', 'shock']],
    storm: { seq: ['Z', 'H'], hidden: true, after: [
      ['inchu', 'Trail\'s gone. But I wrote the turns down. See the log at the bottom?'],
      ['inchu', 'No trail to drag along, so you\'ll have to pull the levers yourself. Each of these levers is its own undo. Think about which to pull <i>first</i>.'],
    ] },
    steps: [
      { target: '+', gates: ['X', 'Z', 'H'], par: 2, obj: 'Undo the storm with the levers. The log shows what it did: <b>Z</b> then <b>H</b>.',
        onMove: (s, g) => {
          if (s.stepMoves.length === 1 && g === 'Z' && !s.hinted.order) {
            s.hinted.order = true;
            UI.hint('inchu', 'You\'re <i>re</i>doing the storm, not undoing it. The Spin can\'t even move the light down here. Shoes come off before socks: last on, first off.', 9000);
            return true;
          }
        },
        stuck: 'The storm did Z, then H. To undo, start with the last thing it did.',
        after: [
          ['inchu', 'Storm did Z then H. You undid H, then Z. Same levers, <b>reverse order</b>.'],
          ['nan', 'Socks then shoes going on. Shoes then socks coming off!', 'happy'],
          ['inchu', 'Keepers write it (AB)⁻¹ = B⁻¹A⁻¹. Same thing, fancier socks.'],
        ] },
    ] },
  { ch: 4, type: 'story', name: 'Something opens', title: 'Ch 4 · The Storm', beam: '+', labels: ['0', '1', '+', '-'], lines: [
    { who: 'nan', text: 'What was that crack?!', m: 'shock', fx: s => { s.shake = 30; Sound.play('collapse'); } },
    ['inchu', 'The Flip lever. Snapped clean through.', 'sad'],
    ['inchu', 'Well. You did practise for this. Tilt, Spin, Tilt.'],
    ['nan', 'Inchu... something on the horizon is moving.'],
    { who: 'inchu', text: 'Something that has been shut for thirty years is beginning, very slowly, to open.', m: 'shock', fx: s => { s.eye = 0.25; } },
    ['inchu', 'The Eye.', 'sad'],
  ] },

  // ── CHAPTER 5: THE QUARTER TURN ───────────────────────────────────────────────────────────
  { ch: 5, type: 'puzzle', name: 'A quarter turn', title: 'Ch 5 · The Quarter Turn', start: '+', labels: ALL6, odds: true, coords: true, broken: ['X'],
    intro: [
      ['inchu', 'Before the Eye wakes properly, there\'s one more lever you need. The <b>Quarter</b>. I\'ve never let an apprentice touch it.'],
      ['inchu', 'It turns the same way as the Spin, round the up-down axis, but only <b>a quarter of the way</b>, and only in one direction.'],
      ['nan', 'So it can reach those two spots on the Rim we keep skipping over? |+i⟩ and |−i⟩?'],
      { who: 'inchu', text: 'Exactly. And see the numbers on the left? Where the light points, as x, y and z. Height z sets the Eye\'s odds. And the length never changes.', fx: s => { s.showCoords = true; s.refreshHud(); } },
    ],
    steps: [
      { target: '+i', gates: ['S'], par: 1, obj: 'Use the <span class="cS">Quarter</span> to reach |+i⟩.',
        after: [['inchu', 'A quarter turn. x went from 1 to 0, y from 0 to 1. Still on the Rim, still fifty-fifty, but a new place.']] },
    ] },
  { ch: 5, type: 'puzzle', name: 'The long way back', title: 'Ch 5 · The Quarter Turn', start: '+i', labels: ALL6, odds: true, coords: true, broken: ['X'], rewind: false,
    unlock: ['S'],
    intro: [
      { who: 'inchu', text: 'Now take it back to |+⟩. Quarters only, and no rewinding. How many will it take?', choices: [
        { label: 'One', reply: [['inchu', 'The Quarter only turns one way, remember. Let\'s see.']] },
        { label: 'Two', reply: [['inchu', 'Let\'s see.']] },
        { label: 'Three', reply: [['inchu', 'Let\'s see if you\'re right.', 'happy']] },
      ] },
    ],
    steps: [
      { target: '+', gates: ['S'], par: 3, obj: 'Get back to |+⟩ using only the Quarter.',
        onMove: (s) => { if (s.stepMoves.length === 2) UI.hint('nan', 'Two Quarters went from |+i⟩ all the way to |−i⟩. That\'s a whole Spin, not an undo. Keep going!', 6000); },
        after: [
          ['inchu', 'Three. The Quarter isn\'t its own undo. Pull it twice and you\'ve made a Spin, not a nothing.'],
          ['inchu', 'But four quarters make a whole turn, so three more Quarters undo one. The long way round, but it\'s still an undo.'],
          ['nan', 'So every lever has an undo. Some are just shy about it.', 'happy'],
          ['inchu', 'Ha! Keepers call the Quarter\'s undo <b>S†</b>, and S† = SSS. The rewind wheel can turn it back in one go. The lever only goes one way. Time goes both.'],
        ] },
    ] },
  { ch: 5, type: 'puzzle', name: 'Two quarters', title: 'Ch 5 · The Quarter Turn', start: '0', labels: ALL6, odds: true, coords: true, broken: ['X', 'Z'],
    intro: [['inchu', 'The storm iced the Spin too, for now. Get to |−⟩ anyway. Tilt and Quarter only.']],
    steps: [
      { target: '-', gates: ['H', 'S'], par: 3, obj: 'Reach |−⟩ with Tilt and Quarter only.',
        stuck: 'Tilt onto the Rim, then count your quarters. |−⟩ is opposite |+⟩.',
        after: [['nan', 'Two Quarters make a Spin! SS = Z!', 'happy'], ['inchu', 'Disguises everywhere, once you start looking.']] },
    ] },
  { ch: 5, type: 'merge', name: 'Gate Merge: the lever jar', title: 'Ch 5 · Gate Merge', goal: 400,
    spawn: { S: 0.45, Z: 0.15, X: 0.2, H: 0.2 }, rules: ['SS', 'ZZ', 'XX', 'HH'],
    obj: 'Drop levers into the jar. Pairs that combine into one gate merge; pairs that cancel go poof. Reach 400.',
    intro: [
      ['nan', 'Inchu, the spare levers are all piled up in this jar...'],
      ['inchu', 'Then tidy it. Two Quarters touching become one Spin. Two Spins touching cancel out and vanish. Same for two Flips, or two Tilts.', 'happy'],
      ['inchu', 'Move to aim, click to drop. Don\'t let the jar spill over the dashed line.'],
    ],
    outro: [['inchu', 'Tidy jar, tidy mind. Now... the Eye is fully open. Come here.', 'sad']] },

  // ── CHAPTER 6: THE EYE ────────────────────────────────────────────────────────────────────
  { ch: 6, type: 'puzzle', name: 'Looking', title: 'Ch 6 · The Eye', start: '+', labels: ALL6, odds: true, coords: true, look: true, broken: ['X'],
    unlock: ['measure'],
    intro: [
      ['nan', 'It\'s just... staring. It doesn\'t blink.', 'shock'],
      ['eye', 'WHERE. DOES. THE LIGHT. POINT.'],
      ['inchu', 'It can only ask one question: Home or Deep? And when it looks, the light has to answer.'],
      ['inchu', 'We have a lever for looking too. The violet one. Go on. Look. Just once.'],
    ],
    steps: [
      { gates: [], until: 'look', obj: 'Press <span class="cE">Look</span> (or <kbd>L</kbd>).',
        after: s => [
          ['nan', `It snapped to ${s.lastLook && s.lastLook.outcome === '0' ? 'Home' : 'the Deep'}!`, 'shock'],
          ['inchu', 'A coin toss, exactly as the meter said. Now wind it back. Get the light back to |+⟩ the way you always do.'],
        ] },
      { gates: [], until: 'blocked', obj: 'Rewind (⟲).',
        after: [
          ['nan', 'It won\'t go back...', 'sad'],
          ['inchu', 'Looking is the one thing on this moon that can\'t be unturned.'],
          ['inchu', 'The Eye took one answer and threw the rest away: where on the Rim the light was, its phase, the whole trail. Just like the old AND-machines. Many roads, one end.'],
          ['inchu', 'Now look again.'],
        ] },
      { gates: [], until: 'look', obj: 'Look again.',
        after: s => [
          ['nan', `${s.lastLook && s.lastLook.outcome === '0' ? 'Home' : 'The Deep'} again. Same answer.`],
          ['inchu', 'Every time. When the light already points Home or Deep, looking changes nothing. The Eye only sees what\'s already true.'],
          ['inchu', 'So it isn\'t looking that\'s dangerous. It\'s <b>looking too soon</b>.'],
        ] },
    ] },
  { ch: 6, type: 'slicer', name: 'Lever Slicer: the Eye\'s gaze', title: 'Ch 6 · The Eye\'s gaze', gates: ['H', 'Z', 'S'], broken: ['X'], eye: 0.22, goal: 6, time: 80, pool: ALL6, labels: ALL6,
    constellations: [['H', 'Z', 'H'], ['S', 'S'], ['H', 'S', 'S', 'H']], consRate: 0.35, spawnEvery: 0.95,
    intro: [
      ['inchu', 'Wisps again, and now the Eye sends its gaze up with the levers. <span class="cE">Violet</span>. Cut one and the Eye looks.'],
      ['inchu', 'If the light is at Home or the Deep when it looks, no harm done. If it\'s out on the Rim... coin toss, and the trail tears.'],
      ['nan', 'Got it. Stay at the poles when I\'m swinging near violet.'],
    ],
    outro: [['inchu', 'Thirty years I\'ve kept this light. Sit down, Nan. There\'s something I should have told you on your first night.', 'sad']] },

  // ── CHAPTER 7: PELL ───────────────────────────────────────────────────────────────────────
  { ch: 7, type: 'story', name: 'What the Eye took', title: 'Ch 7 · Pell', beam: '0', labels: ['0', '1'], eye: 0.3,
    wisps: [{ at: '1', name: '', color: '#6c7f7a', alpha: 0.7 }],
    lines: [
      ['inchu', 'I had a little brother. Pell. A wisp, a traveller, coming home across the glass.', 'sad'],
      ['inchu', 'The Flip was broken that night too. I took him the long way: Tilt, Spin, Tilt. He was out on the Rim, halfway, when the Eye opened.', 'sad'],
      ['inchu', 'I panicked. I thought if I just <i>knew</i> where he was, I could save him. So I looked.', 'sad'],
      ['inchu', 'The coin came up Deep. He fell. And everything the old keepers taught me says what the Eye takes can\'t be untaken.', 'sad'],
      { who: 'inchu', text: 'That dim light at the bottom of the glass. That\'s him. I haven\'t been able to point at it in thirty years.', m: 'sad', fx: s => { s.wisps = [{ at: '1', name: 'Pell', color: '#ffd1e6' }]; } },
      { who: 'nan', text: 'Inchu... what exactly did the Eye take?', choices: [
        { label: 'Pell. He\'s gone.', reply: [['inchu', 'That\'s what I\'ve believed every night since.', 'sad'], ['nan', 'But he isn\'t gone. He\'s right there.']] },
        { label: 'The road he was on. Not Pell.', reply: [['inchu', '...Say that again.', 'shock']] },
      ] },
      ['nan', 'The Eye took the <i>road</i>: where he was on the Rim, the trail back. That can\'t be rewound. But it didn\'t take <i>him</i>.'],
      ['nan', 'He\'s in the Deep. And the Deep is just a place on the glass. It\'s |1⟩.', 'happy'],
      ['inchu', '...One Flip from Home.', 'shock'],
      ['inchu', 'And the Flip is broken.', 'sad'],
      ['nan', 'Then we go the long way. Tilt, Spin, Tilt. And we don\'t let the Eye catch him on the Rim.'],
      { who: 'inchu', text: 'Between blinks, then.', m: 'happy', fx: s => { s.eye = 0.6; } },
    ] },
  { ch: 7, type: 'slicer', name: 'Between blinks', title: 'Ch 7 · Between blinks', finale: true, gates: ['H', 'Z', 'S'], broken: ['X'], labels: ['0', '1', '+', '-'],
    constellations: [['H', 'Z', 'H'], ['H', 'S', 'S', 'H']], consRate: 0.45, spawnEvery: 0.85, routeAfter: 3, eyeCycle: [5.0, 1.4, 1.2],
    intro: [
      ['inchu', 'The Eye opens every few heartbeats now. When it opens, it looks.'],
      ['inchu', 'The rule is simple: <b>when the Eye opens, the light must be at Home or the Deep.</b> Anywhere else and it\'s a coin toss.'],
      ['nan', 'First point the light down at him. Then bring him up. One clean swipe.'],
    ],
    stages: [
      { target: '1', wispName: 'Pell', label: 'Reach Pell', obj: 'Point the light down at <b>Pell</b> in the Deep. No Flip. Watch the Eye.',
        after: s => [
          s.luckyDeep ? ['inchu', 'The Eye dropped you into the Deep itself. Lucky. Don\'t count on that twice.'] : ['nan', 'We\'re there. Clean.', 'happy'],
          ['pell', '...Inchu? Is that you?'],
          ['inchu', 'Hold on to the light, Pell. Hold on tight. We\'re bringing you up.', 'shock'],
        ] },
      { target: '0', wispName: 'Home', label: 'Bring Pell home', obj: 'Bring <b>Pell</b> Home |0⟩. Never let the Eye catch him on the Rim.',
        after: s => [
          s.luckyHome
            ? ['inchu', 'He\'s Home... but the Eye chose that, not us. A coin toss. Thirty years ago it landed the other way.', 'sad']
            : ['nan', 'Home. We brought him Home!', 'happy'],
        ] },
    ],
    outro: [
      ['eye', 'HOME.'],
      ['nan', 'It looked... and nothing was lost.', 'shock'],
      ['pell', 'You got old, Inchu.'],
      ['inchu', 'You didn\'t get any older at all. Typical.', 'happy'],
      ['inchu', 'Every turn can be unturned. Only looking can\'t. So, apprentice...'],
      ['nan', 'Look when you\'re sure.', 'happy'],
    ] },
  { ch: 7, type: 'ending', name: 'Epilogue', title: 'Epilogue' },
];

// Minigame setups (the full versions, from the title screen).
const MINIGAMES = {
  slicer: {
    name: 'Gate Slicer', blurb: 'Swipe flying gates to steer the light onto wisps. Eight gates, combos, and noise that blurs your qubit.',
    cfg: {
      type: 'slicer', title: 'Gate Slicer', endless: true, freeTargets: true, gates: ['X', 'Y', 'Z', 'H', 'S', 'Sdg', 'T', 'Tdg'],
      noise: 0.2, qec: 0.12, time: 75, labels: ALL6, routeAfter: 4,
      constellations: [['H', 'Z', 'H'], ['H', 'X', 'H'], ['T', 'T'], ['S', 'S'], ['H', 'S', 'S', 'H'], ['X', 'Z'], ['S', 'Sdg']], consRate: 0.35, spawnEvery: 0.8,
      intro: [
        ['nan', 'Gate Slicer! Swipe through gates to turn the light onto each wisp. Combos in one swipe score extra.', 'happy'],
        ['inchu', 'Grey fuzzy clouds are <b>noise</b>. Cut one and the light shrinks: decoherence. No gate can fix that. Only the green <b>QEC</b> shield (error correction) restores it.'],
        ['nan', 'Each wisp adds a few seconds. If the light fades below 30%, it\'s over. Go!'],
      ],
    },
  },
  merge: {
    name: 'Gate Merge', blurb: 'Drop gate bubbles into a jar. TT makes S, SS makes Z, ZZ goes poof. Every merge is a real identity.',
    cfg: {
      type: 'merge', title: 'Gate Merge', spawn: { T: 0.36, S: 0.22, X: 0.14, Z: 0.14, H: 0.14 },
      intro: [
        ['nan', 'Gate Merge! Two Nudges touching make a Quarter. Two Quarters make a Spin. Two Spins cancel out entirely!', 'happy'],
        ['inchu', 'Flips and Tilts cancel in pairs too. And a Flip touching a Spin becomes a Roll. Keep the jar under the dashed line.'],
      ],
    },
  },
  flip: {
    name: 'Flip Flip', blurb: 'Memory cards with a twist: match pairs that are secretly the same gate or state, like HZH and X.',
    cfg: {
      type: 'flip', title: 'Flip Flip', pairs: 8,
      intro: [['inchu', 'Eight pairs. Each pair is two ways of writing the same thing. I\'ll show you the cards for a moment first.', 'happy']],
    },
  },
};
