// Table 1: Rocket Row, "The Saucer Men". A 1930s pulp-serial space voyage:
// ringed-planet pop bumpers, a UFO centrepiece over a tractor-beam scoop, a
// satellite spinner, rocket-pennant drop targets. The gentle tutorial table.
//
// A table definition supplies everything that isn't the shared cabinet
// (FRAME in layout.js): its playfield geometry, lamp inserts, two spot inks,
// art pieces, wording, missions and (optionally) its own rules.

TABLE_DEFS[1] = (() => {
  const RIGHT_RAMP = [
    [282, 352], [300, 305], [330, 270], [330, 215],
    [330, 160], [310, 125], [290, 112],
  ];

  return {
    n: 1,
    name: 'Rocket Row',

    layout: {
      gravity: 0.42,
      pops: [[160, 160], [240, 160], [200, 212]],
      popR: 20,
      centerpiece: { x: 200, y: 300, r: 30 },
      scoop: { x: 200, y: 356 },
      kickout: { x: 118, y: 255, eject: [0.6, 4] }, // eject: launch velocity
      drops: { x: 200, y: 408, count: 3, spacing: 30, w: 24, h: 13 },
      flippers: {
        mini: { x: 350, y: 398, rest: 165, active: 220, len: 40, pivotR: 7, tipR: 4 },
      },
      // Cubic bezier chains: P0, C1, C2, P1, C3, C4, P2.
      ramps: { right: RIGHT_RAMP, left: mirrorX(RIGHT_RAMP) },
      laneLetters: ['R', 'O', 'W'],
      pickupSpots: [[110, 405], [290, 430], [200, 470], [145, 215], [255, 215], [200, 125]],
      // Lamp inserts, lit by lamps.js (unlit ones are printed by art.js).
      inserts: {
        arrows: [
          { key: 'leftRamp', x: 140, y: 388, rot: -28, s: 1, ink: 'red' },
          { key: 'rightRamp', x: 260, y: 388, rot: 28, s: 1, ink: 'teal' },
          { key: 'orbit', x: 58, y: 420, rot: -28, s: 0.85, ink: 'mustard' },
          { key: 'scoop', x: 200, y: 383, rot: 0, s: 0.7, ink: 'mustard' },
        ],
        multipliers: [2, 3, 4, 5].map((n, i) => ({ n, x: 155 + i * 30, y: 460, r: 10 })),
        chapters: ['I', 'II', 'III', 'IV', 'V'].map((t, i) => ({ t, x: 150 + i * 25, y: 518 })),
        rowLetters: { y: 95, r: 8.5 },
        extraBall: { x: 166, y: 549, w: 68, h: 15, label: 'EXTRA BALL' },
        shootAgain: { x: 160, y: 578, w: 80, h: 16, label: 'SHOOT AGAIN' },
        title: { y: 500 },
      },
    },

    // Spot inks: `red` and `teal` are roles, not colours (see art.js).
    inks: { red: '#d2452f', teal: '#2e7f86' },

    // Art pieces. Each gets the kit from art.js: inks as P (paper), P2
    // (aged paper), K (ink), R, T (the two spot inks), M (mustard), F
    // (foxing), plus star() and at().
    art: {
      pop: (r, { P, K, R, M, star }) => `
        <ellipse rx="${r * 1.55}" ry="${r * 0.42}" fill="none" stroke="${K}" stroke-width="${r * 0.28}" transform="rotate(-16)"/>
        <circle r="${r}" fill="${R}" stroke="${K}" stroke-width="${r * 0.18}"/>
        <path d="M${-r * 0.55},${-r * 0.2} A${r * 0.6},${r * 0.6} 0 0 1 ${-r * 0.1},${-r * 0.62}" fill="none" stroke="${P}" stroke-width="${r * 0.16}" stroke-linecap="round"/>
        <ellipse rx="${r * 1.55}" ry="${r * 0.42}" fill="none" stroke="${M}" stroke-width="${r * 0.12}" transform="rotate(-16)" stroke-dasharray="${r * 2.4} ${r * 2.2}" stroke-dashoffset="${r * 1.2}"/>
        <path d="${star(r * 0.2, r * 0.15, r * 0.38, r * 0.15, 5)}" fill="${P}" stroke="${K}" stroke-width="${r * 0.06}"/>`,
      popSpriteR: (r) => r * 1.7,

      // The UFO.
      centerpiece: (r, { P, K, R, T, M }) => `<g transform="scale(${(r * 32) / 900})">
        <ellipse rx="40" ry="16" cy="6" fill="${T}" stroke="${K}" stroke-width="5"/>
        ${[-26, -9, 9, 26].map((x) => `<circle cx="${x}" cy="10" r="3.2" fill="${M}" stroke="${K}" stroke-width="1.5"/>`).join('')}
        <path d="M-20,0 A20,22 0 0 1 20,0Z" fill="${P}" stroke="${K}" stroke-width="5"/>
        <path d="M-11,-8 A11,11 0 0 1 -2,-16" stroke="${K}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <circle r="31" fill="none" stroke="${R}" stroke-width="2" stroke-dasharray="3 5"/></g>`,
      centerpieceSpriteR: (r) => r * 1.55,

      // Satellite solar panels.
      spinner: (len, h, { K, R, M }) => {
        const w = len / 2 - 3;
        return `<rect x="${-len / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="${M}" stroke="${K}" stroke-width="1.6"/>
          <rect x="${len / 2 - w}" y="${-h / 2}" width="${w}" height="${h}" fill="${M}" stroke="${K}" stroke-width="1.6"/>
          <circle r="${h * 0.6}" fill="${R}" stroke="${K}" stroke-width="1.6"/>`;
      },

      // Rocket pennant; its number is lettered on by lamps.js.
      drop: (w, h, { K, R }) => `<path d="M${-w / 2},${-h / 2} L${w / 2},${-h / 2} L${w / 2},${h / 2 - 3} L0,${h / 2 + 3} L${-w / 2},${h / 2 - 3}Z" fill="${R}" stroke="${K}" stroke-width="2.4" stroke-linejoin="round"/>`,

      // Printed under everything: sunburst from the UFO, halftone planets, stars.
      backdrop: (L, { P2, K, R, T, star }) => {
        const c = L.centerpiece;
        let rays = '';
        for (let i = 0; i < 28; i += 2) {
          const a1 = (i / 28) * Math.PI * 2;
          const a2 = ((i + 1) / 28) * Math.PI * 2;
          rays += `M${c.x},${c.y} L${c.x + Math.cos(a1) * 800},${c.y + Math.sin(a1) * 800} L${c.x + Math.cos(a2) * 800},${c.y + Math.sin(a2) * 800}Z`;
        }
        return `<defs>
            <pattern id="ht" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="3.5" cy="3.5" r="1.3" fill="${T}"/></pattern>
            <pattern id="htr" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="3" cy="3" r="1.1" fill="${R}"/></pattern>
          </defs>
          <path d="${rays}" fill="${P2}"/>
          <circle cx="340" cy="560" r="120" fill="url(#ht)" opacity=".3"/>
          <ellipse cx="340" cy="560" rx="200" ry="34" fill="none" stroke="${T}" stroke-width="9" opacity=".22" transform="rotate(-18 340 560)"/>
          <circle cx="70" cy="150" r="60" fill="url(#htr)" opacity=".22"/>
          <g fill="${K}" opacity=".7">
            <path d="${star(300, 60, 6, 2.2, 4)}"/><path d="${star(110, 60, 5, 1.8, 4)}"/><path d="${star(140, 440, 5, 1.8, 4)}"/><path d="${star(270, 470, 6, 2.2, 4)}"/><path d="${star(300, 250, 4, 1.5, 4)}"/>
          </g>`;
      },

      // Printed around the centrepiece: the tractor beam over the scoop.
      decor: (L) => {
        const c = L.centerpiece;
        return `<path d="M${c.x - 15},${c.y + 15} L${c.x + 15},${c.y + 15} L${c.x + 32},${c.y + 62} L${c.x - 32},${c.y + 62}Z" fill="url(#ht)" opacity=".7"/>`;
      },

      subtitle: 'A SERIAL IN FIVE CHAPTERS',
      sideText: 'SKILL SHOT ▸ LIGHT R·O·W',
    },

    // Wording used on the table and in the title cards.
    text: {
      centerpiece: 'UFO',
      centerpieceHit: 'ZAP!',
      scoop: 'tractor beam',
      rampHit: 'ZOOM!',
      bumperWords: ['BOP!', 'BONK!', 'POW!', 'BAM!'],
      chapters: ['The Saucer Men', 'Peril on Planet X', 'The Ray Gun Rumble', 'Trapped in the Nebula', 'The Tractor Beam'],
      multiballLit: 'Chapter V! Shoot the UFO scoop for multiball',
      multiballCallout: 'The Tractor Beam! Shoot the scoop',
      multiball: 'Saucer Multiball!',
      jackpot: 'saucer jackpot',
      extraBall: 'The serial continues',
      turnOver: 'To Be Continued…',
    },

    // Mission tier = rank needed. Events and halos: see missions.js.
    missions: [
      { id: 'flight', name: 'Flight School', goal: 'Make 3 ramp shots', event: 'ramp', count: 3, tier: 0, halos: ['ramps'] },
      { id: 'asteroids', name: 'Asteroid Field', goal: 'Hit the pop bumpers 15 times', event: 'pop', count: 15, seconds: 35, tier: 0, halos: ['pops'] },
      { id: 'target', name: 'Target Practice', goal: 'Clear the 1-2-3 drop targets', event: 'dropBank', count: 1, tier: 0, halos: ['drops'] },
      { id: 'orbit', name: 'Orbit Run', goal: 'Shoot the left orbit twice', event: 'orbit', count: 2, tier: 1, halos: ['orbit'] },
      { id: 'radio', name: 'Radio Contact', goal: 'Roll through the R·O·W lanes 5 times', event: 'lane', count: 5, tier: 1, halos: ['lanes'] },
      { id: 'satellite', name: 'Satellite Sweep', goal: 'Spin the orbit spinner 15 times', event: 'spinner', count: 15, tier: 1, halos: ['spinner'] },
      { id: 'saucer', name: 'Saucer Chase', goal: 'Hit the UFO 6 times', event: 'ufo', count: 6, seconds: 40, tier: 2, halos: ['centerpiece'] },
      { id: 'relay', name: 'Ramp Relay', goal: 'Make a ramp, then the other one while its arrow blinks, twice', event: 'rampCombo', count: 2, seconds: 45, tier: 2, halos: ['ramps'] },
      { id: 'rescue', name: 'Tractor Beam Rescue', goal: 'Shoot the UFO scoop twice', event: 'scoop', count: 2, tier: 2, halos: ['drops', 'scoop'] },
      { id: 'cliffhanger', name: 'Cliffhanger', goal: 'Clear the drop targets 3 times', event: 'dropBank', count: 3, seconds: 60, tier: 3, halos: ['drops'] },
      { id: 'doubleFeature', name: 'Double Feature', goal: 'Make 5 ramp shots', event: 'ramp', count: 5, seconds: 45, tier: 3, halos: ['ramps'] },
      { id: 'finale', name: 'The Grand Finale', goal: 'Hit the UFO 10 times', event: 'ufo', count: 10, seconds: 45, tier: 4, halos: ['centerpiece'] },
    ],
  };
})();
