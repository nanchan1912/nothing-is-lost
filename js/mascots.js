'use strict';
// The cast, drawn as inline SVG so they stay crisp at any size and need no image files.
// Every mascot has a closed mouth (.m-shut) and an open one (.m-open); CSS flips between
// them while the character is talking. Moods: '', 'happy', 'sad', 'shock'.
let mascotSeq = 0;
const Mascot = {
  inchu(mood = '') {
    const id = 'mi' + (++mascotSeq);
    const brow = mood === 'sad' ? '<path d="M30 41 L44 45 M70 41 L56 45" stroke="#24403a" stroke-width="2.5" stroke-linecap="round"/>'
      : mood === 'shock' ? '<path d="M30 40 Q37 36 44 40 M56 40 Q63 36 70 40" stroke="#24403a" stroke-width="2.5" fill="none" stroke-linecap="round"/>' : '';
    const eyes = mood === 'happy'
      ? '<path d="M33 55 Q37.5 50 42 55 M58 55 Q62.5 50 67 55" stroke="#1b2b28" stroke-width="3" fill="none" stroke-linecap="round"/>'
      : `<circle cx="37.5" cy="54" r="${mood === 'shock' ? 3 : 4.2}" fill="#1b2b28"/><circle cx="62.5" cy="54" r="${mood === 'shock' ? 3 : 4.2}" fill="#1b2b28"/>
         <circle cx="39" cy="52.5" r="1.4" fill="#fff"/><circle cx="64" cy="52.5" r="1.4" fill="#fff"/>`;
    const shut = mood === 'sad' ? '<path d="M44 72 Q50 67 56 72" stroke="#3a2424" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
      : '<path d="M44 69 Q50 75 56 69" stroke="#3a2424" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
    return `<svg class="mascot inchu" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <radialGradient id="${id}" cx="36%" cy="30%" r="75%"><stop offset="0" stop-color="#e6fff3"/><stop offset="0.55" stop-color="#8fe7c0"/><stop offset="1" stop-color="#3fae86"/></radialGradient>
      </defs>
      <g class="antenna"><path d="M50 26 Q53 14 62 7" stroke="#ffcf7a" stroke-width="3.2" fill="none" stroke-linecap="round"/>
        <circle class="glow" cx="62" cy="7" r="5" fill="#ffe3a3"/><circle cx="62" cy="7" r="2.4" fill="#fff8e6"/></g>
      <ellipse cx="38" cy="94" rx="9" ry="4.5" fill="#2f8a69"/><ellipse cx="62" cy="94" rx="9" ry="4.5" fill="#2f8a69"/>
      <circle cx="50" cy="59" r="34" fill="url(#${id})" stroke="#24705a" stroke-width="2.5"/>
      <ellipse cx="50" cy="66" rx="33" ry="9" fill="none" stroke="#ffffff" stroke-opacity="0.45" stroke-width="1.6" stroke-dasharray="3 4"/>
      <path d="M26 42 Q32 30 44 28" stroke="#ffffff" stroke-opacity="0.7" stroke-width="3" fill="none" stroke-linecap="round"/>
      <circle cx="37.5" cy="54" r="9.5" fill="#ffffff" fill-opacity="0.28" stroke="#5a3b26" stroke-width="2"/>
      <circle cx="62.5" cy="54" r="9.5" fill="#ffffff" fill-opacity="0.28" stroke="#5a3b26" stroke-width="2"/>
      <path d="M47 53 Q50 50.5 53 53" stroke="#5a3b26" stroke-width="2" fill="none"/>
      ${eyes}${brow}
      <ellipse cx="27" cy="67" rx="5.5" ry="3.2" fill="#ff9fb0" fill-opacity="0.7"/><ellipse cx="73" cy="67" rx="5.5" ry="3.2" fill="#ff9fb0" fill-opacity="0.7"/>
      <g class="m-shut">${shut}</g>
      <g class="m-open"><ellipse cx="50" cy="71" rx="4.6" ry="4" fill="#5a2630"/><ellipse cx="50" cy="73" rx="2.6" ry="1.4" fill="#ff8fa3"/></g>
    </svg>`;
  },

  nan(mood = '') {
    const id = 'mn' + (++mascotSeq);
    const eyes = mood === 'happy'
      ? '<path d="M36 55 Q41 49 46 55 M54 55 Q59 49 64 55" stroke="#2b1a1f" stroke-width="3" fill="none" stroke-linecap="round"/>'
      : `<ellipse cx="41" cy="54" rx="${mood === 'shock' ? 3.5 : 5}" ry="${mood === 'shock' ? 5 : 6.5}" fill="#2b1a1f"/><ellipse cx="59" cy="54" rx="${mood === 'shock' ? 3.5 : 5}" ry="${mood === 'shock' ? 5 : 6.5}" fill="#2b1a1f"/>
         <circle cx="42.8" cy="51.5" r="2" fill="#fff"/><circle cx="60.8" cy="51.5" r="2" fill="#fff"/><circle cx="39.6" cy="57" r="1" fill="#fff"/><circle cx="57.6" cy="57" r="1" fill="#fff"/>`;
    const brow = mood === 'sad' ? '<path d="M34 44 L45 47 M66 44 L55 47" stroke="#7a3b3b" stroke-width="2.4" stroke-linecap="round"/>' : '';
    const shut = mood === 'sad' ? '<path d="M45 68 Q50 64 55 68" stroke="#6b2b33" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
      : '<path d="M44.5 65 Q47.25 68.5 50 65 Q52.75 68.5 55.5 65" stroke="#6b2b33" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
    return `<svg class="mascot nan" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <radialGradient id="${id}" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#fff1e4"/><stop offset="0.6" stop-color="#ffc0a6"/><stop offset="1" stop-color="#f08a78"/></radialGradient>
      </defs>
      <ellipse cx="50" cy="58" rx="45" ry="13" transform="rotate(-18 50 58)" fill="none" stroke="#ffcf7a" stroke-opacity="0.45" stroke-width="2.4"/>
      <path d="M49 30 Q44 20 52 15 Q57 19 53 24" stroke="#e0705f" stroke-width="3" fill="none" stroke-linecap="round"/>
      <ellipse cx="40" cy="88" rx="7" ry="4" fill="#d9705f"/><ellipse cx="60" cy="88" rx="7" ry="4" fill="#d9705f"/>
      <circle cx="50" cy="58" r="29" fill="url(#${id})" stroke="#c4604f" stroke-width="2.5"/>
      <path d="M31 46 Q35 37 44 34" stroke="#ffffff" stroke-opacity="0.75" stroke-width="3" fill="none" stroke-linecap="round"/>
      ${eyes}${brow}
      <ellipse cx="31" cy="64" rx="5" ry="3" fill="#ff7f96" fill-opacity="0.65"/><ellipse cx="69" cy="64" rx="5" ry="3" fill="#ff7f96" fill-opacity="0.65"/>
      <g class="m-shut">${shut}</g>
      <g class="m-open"><ellipse cx="50" cy="67" rx="4" ry="4.2" fill="#6b2233"/><ellipse cx="50" cy="69" rx="2.3" ry="1.3" fill="#ff8fa3"/></g>
      <path d="M95 44 A45 13 -18 0 1 7 72" transform="rotate(0)" fill="none" stroke="#ffcf7a" stroke-width="2.4" stroke-linecap="round"/>
      <circle r="4.5" fill="#fff4c9" stroke="#ffcf7a" stroke-width="1.5">
        <animateMotion dur="3.2s" repeatCount="indefinite" path="M5 72 A45 13 -18 1 1 95 44 A45 13 -18 1 1 5 72"/>
      </circle>
    </svg>`;
  },

  eye(mood = '') {
    return `<svg class="mascot eye" viewBox="0 0 100 100" aria-hidden="true">
      <path d="M18 70 Q10 40 30 26 Q50 12 70 26 Q90 40 82 70 Q78 88 66 84 Q58 92 50 86 Q42 92 34 84 Q22 88 18 70 Z" fill="#b48ae8" stroke="#6d47a8" stroke-width="2.5"/>
      <path d="M30 40 Q36 34 42 36" stroke="#e7d6ff" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.7"/>
      <ellipse cx="50" cy="54" rx="22" ry="${mood === 'shock' ? 18 : 15}" fill="#fbf7ff" stroke="#6d47a8" stroke-width="2"/>
      <circle class="pupil" cx="50" cy="55" r="10" fill="#5b2a9a"/><circle cx="50" cy="55" r="5" fill="#1d0f33"/><circle cx="46" cy="51" r="2.4" fill="#fff"/>
      <path d="M30 41 L26 35 M40 37 L38 30 M50 36 L50 29 M60 37 L62 30 M70 41 L74 35" stroke="#6d47a8" stroke-width="2.2" stroke-linecap="round"/>
      <g class="m-shut"><path d="M44 77 L56 77" stroke="#6d47a8" stroke-width="2.2" stroke-linecap="round"/></g>
      <g class="m-open"><ellipse cx="50" cy="77" rx="5" ry="3" fill="#3a1f5e"/></g>
    </svg>`;
  },

  pell(mood = '') {
    return `<svg class="mascot pell" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="52" r="40" fill="#bfe9ff" opacity="0.18"/>
      <path d="M50 14 Q76 30 76 58 Q76 84 50 86 Q24 84 24 58 Q24 30 50 14 Z" fill="#d9f3ff" stroke="#6fb6d9" stroke-width="2.5"/>
      <path d="M36 40 Q40 30 48 26" stroke="#ffffff" stroke-width="3" fill="none" stroke-linecap="round"/>
      <circle cx="42" cy="58" r="3.6" fill="#22394a"/><circle cx="58" cy="58" r="3.6" fill="#22394a"/>
      <circle cx="43" cy="56.8" r="1.2" fill="#fff"/><circle cx="59" cy="56.8" r="1.2" fill="#fff"/>
      <ellipse cx="34" cy="66" rx="4" ry="2.4" fill="#ffb3c7" opacity="0.6"/><ellipse cx="66" cy="66" rx="4" ry="2.4" fill="#ffb3c7" opacity="0.6"/>
      <g class="m-shut"><path d="M46 67 Q50 70 54 67" stroke="#22394a" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>
      <g class="m-open"><ellipse cx="50" cy="68" rx="3.2" ry="3" fill="#22394a"/></g>
    </svg>`;
  },

  of(who, mood) { return (this[who] || this.inchu).call(this, mood); },
};
