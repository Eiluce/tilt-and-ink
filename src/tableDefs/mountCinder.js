// Table 4: Mount Cinder, "Fury of the Fire God". A volcano at night, lava
// cracks glowing through black rock: three fire-pit pop bumpers, a lava
// lake as the centrepiece with a lava tube for its scoop, Rocket Row's pair
// of side ramps as lava channels, pumice-stone drop targets and a tiki
// torch for the spinner.
//
// Physics twist: the heaviest gravity yet (x1.35 Rocket Row), and three
// steam vents that glow, then blast any ball rolling over them.
//
// Its own rule, the Eruption hurry-up: ramps pour magma into a five-lamp
// gauge; a full gauge erupts, and a jackpot drains second by second until
// the lava tube is shot or it cools.

TABLE_DEFS[4] = (() => {
  const MAGMA_RAMPS = 5;
  const HURRY_MS = 15000;
  const HURRY_FLOOR = 0.1; // share of the jackpot left when it cools
  // Steam vents: idle a while, glow as a warning, then blast.
  const VENT_IDLE_MS = [4000, 10000];
  const VENT_WARN_MS = 1200;
  const VENT_BLAST_MS = 400;
  const VENT_R = 16; // a ball this close to a blasting vent is thrown
  const VENT_SPEED = 8;

  const layout = {
    gravity: 0.57,
    pops: [[160, 160], [240, 160], [200, 212]],
    popR: 20,
    centerpiece: { x: 200, y: 300, r: 34 },
    scoop: { x: 200, y: 356 },
    kickout: { x: 118, y: 255, eject: [0.6, 4] },
    drops: { x: 200, y: 408, count: 3, spacing: 30, w: 24, h: 13 },
    flippers: {},
    // Rocket Row's ramps: a mirrored pair climbing the sides to the top lanes.
    ramps: TABLE_DEFS[1].layout.ramps,
    laneLetters: ['H', 'O', 'T'],
    pickupSpots: [[150, 440], [290, 440], [200, 470], [145, 215], [255, 215], [200, 250]],
    vents: [[95, 392], [305, 392], [200, 126]],
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
      // The magma gauge: five lamps along the left, one per ramp.
      magma: Array.from({ length: MAGMA_RAMPS }, (_, i) => ({ x: 84 + i * 11, y: 438 - i * 4 })),
    },
  };

  const DEEP = '#141010'; // the edge of the backdrop's glow
  const ROCK = '#4a3c36';
  const STONE = '#9a8e86';
  const BAMBOO = '#c9a44a';
  const PUMICE = '#ded5c8';
  // The ramps keep the first palette's lava: black crust, red, sulphur.
  const CRUST = '#2b211e';
  const LAVA = '#e4502a';
  const SULPHUR = '#f2d024';

  return {
    n: 4,
    name: 'Mount Cinder',
    layout,
    inks: { red: '#ff7a1a', teal: '#9fd8ff' },
    // Printed on charcoal rock, orange lava and pale steam blue.
    stock: { field: '#2a2220', fieldAlt: '#3a2e2a', print: '#f3e6d2', title: '#f3e6d2', hatch: '#1d1614', ground: '#080606' },

    art: {
      // A fire pit: a ring of stones round a fire.
      pop: (r, { K, R, T }) => `${Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2;
        return `<circle cx="${Math.cos(a) * r * 0.78}" cy="${Math.sin(a) * r * 0.78}" r="${r * 0.27}" fill="${STONE}" stroke="${K}" stroke-width="${r * 0.07}"/>`;
      }).join('')}
        <circle r="${r * 0.58}" fill="${ROCK}"/>
        <path d="M0,${-r * 0.55} C${r * 0.3},${-r * 0.2} ${r * 0.5},${r * 0.1} ${r * 0.3},${r * 0.4} C${r * 0.15},${r * 0.55} ${-r * 0.15},${r * 0.55} ${-r * 0.3},${r * 0.4} C${-r * 0.5},${r * 0.1} ${-r * 0.3},${-r * 0.2} 0,${-r * 0.55}Z" fill="${R}" stroke="${K}" stroke-width="${r * 0.06}"/>
        <path d="M0,${-r * 0.2} C${r * 0.15},0 ${r * 0.22},${r * 0.2} ${r * 0.12},${r * 0.35} C${r * 0.05},${r * 0.42} ${-r * 0.05},${r * 0.42} ${-r * 0.12},${r * 0.35} C${-r * 0.22},${r * 0.2} ${-r * 0.15},0 0,${-r * 0.2}Z" fill="${T}"/>`,
      popSpriteR: (r) => r * 1.15,

      // The lava lake: swirling lava in a rim of black rocks. Drawn so the
      // rim ends at the bumper's edge.
      centerpiece: (R0, { K, R, T }) => {
        const r = R0 * 0.74;
        const rim = Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2;
          return `<circle cx="${Math.cos(a) * r * 1.18}" cy="${Math.sin(a) * r * 1.18}" r="${r * 0.2}" fill="${STONE}" stroke="${K}" stroke-width="${r * 0.04}"/>`;
        }).join('');
        return `<circle r="${R0 * 1.08}" fill="${K}" opacity=".25" cx="3" cy="4"/>
          <circle r="${r * 1.35}" fill="${ROCK}" stroke="${K}" stroke-width="${r * 0.08}"/>${rim}
          <circle r="${r * 0.95}" fill="${R}"/>
          <path d="M${-r * 0.6},0 a${r * 0.6},${r * 0.6} 0 1,1 ${r * 0.6},${r * 0.6} a${r * 0.4},${r * 0.4} 0 1,1 ${-r * 0.2},${-r * 0.5}" fill="none" stroke="${T}" stroke-width="${r * 0.12}" stroke-linecap="round"/>
          <circle cx="${r * 0.3}" cy="${-r * 0.45}" r="${r * 0.1}" fill="${T}"/><circle cx="${-r * 0.5}" cy="${r * 0.35}" r="${r * 0.07}" fill="${T}"/>`;
      },
      centerpieceSpriteR: (r) => r * 1.12,

      // A bamboo tiki torch with a flaming head.
      spinner: (len, h, { K, R, T }) => `<rect x="${-len * 0.5}" y="${-h * 0.2}" width="${len * 0.7}" height="${h * 0.4}" fill="${BAMBOO}" stroke="${K}" stroke-width=".6"/>
        ${[-0.3, -0.05].map((x) => `<line x1="${x * len}" y1="${-h * 0.2}" x2="${x * len}" y2="${h * 0.2}" stroke="${K}" stroke-width=".5"/>`).join('')}
        <path d="M${len * 0.18},${-h * 0.45} L${len * 0.5},0 L${len * 0.18},${h * 0.45} Q${len * 0.26},0 ${len * 0.18},${-h * 0.45}Z" fill="${R}" stroke="${K}" stroke-width=".5"/>
        <path d="M${len * 0.22},${-h * 0.2} L${len * 0.4},0 L${len * 0.22},${h * 0.2}Z" fill="${T}"/>`,

      // A pale, porous pumice stone; its number is lettered on by lamps.js.
      drop: (w, h, { K }) => `<path d="M${-w / 2},${h * 0.05} Q${-w / 2},${-h / 2} ${-w * 0.1},${-h / 2} L${w * 0.3},${-h / 2 - 0.5} Q${w / 2 + 1},${-h * 0.3} ${w / 2},${h * 0.15} Q${w * 0.4},${h / 2 + 1} 0,${h / 2} L${-w * 0.35},${h / 2} Q${-w / 2 - 0.5},${h * 0.35} ${-w / 2},${h * 0.05}Z" fill="${PUMICE}" stroke="${K}" stroke-width="2" stroke-linejoin="round"/>
        ${[[-8, -3, 1.2], [-9, 3, 0.9], [8, -3, 1], [9, 2.5, 1.3], [5, 4.5, 0.8], [-5, 4.5, 0.8]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${STONE}"/>`).join('')}`,
      dropNumber: '#1e1a16', // press ink on the pale pumice

      // Ramps as lava channels: black crust, molten lava down the middle,
      // cooled crust plates floating on it.
      rampDeck: (c, d, { K, along, at }) => `<path d="${d}" fill="none" stroke="${CRUST}" stroke-width="22" stroke-linecap="round"/>
        <path d="${d}" fill="none" stroke="${LAVA}" stroke-width="11" stroke-linecap="round"/>
        <path d="${d}" fill="none" stroke="${SULPHUR}" stroke-width="3.5" stroke-linecap="round"/>
        ${along(c, 26, 22).map((p) => at(p.x.toFixed(1), p.y.toFixed(1), `<path d="M-4,-4 L3,-5 L5,1 L-2,4Z" fill="${CRUST}" stroke="${K}" stroke-width=".8"/>`, p.deg.toFixed(1))).join('')}`,

      // Slingshots of lava rock, a glowing crack under an orange rubber
      // that flashes steam blue when it kicks.
      sling: {
        fill: ROCK,
        rubber: (lit) => (lit ? '#9fd8ff' : '#ff7a1a'),
        pattern: (lit, xy) => {
          const crack = [[92, 500], [96, 515], [94, 528], [99, 540], [104, 548]].map(([x, y]) => xy(x, y).join(',')).join(' ');
          return `<polyline points="${crack}" fill="none" stroke="${lit ? '#9fd8ff' : '#ff7a1a'}" stroke-width="2.4" stroke-linejoin="round"/>
            <polyline points="${crack}" fill="none" stroke="#9fd8ff" stroke-width=".9" stroke-linejoin="round"/>`;
        },
      },

      // Printed under everything: the rock glows round the lava lake, lava
      // cracks spread from it, embers drift and smoke hangs over the lanes.
      backdrop: (L, { FD, FD2, PR, R, T }) => {
        let seed = 9;
        const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
        const c = L.centerpiece;
        const crack = (a0, len) => {
          let x = c.x;
          let y = c.y;
          let a = a0;
          let d = `M${x},${y}`;
          for (let i = 0; i < 9; i++) {
            a += (rnd() - 0.5) * 0.9;
            x += (Math.cos(a) * len) / 9;
            y += (Math.sin(a) * len) / 9;
            d += ` L${x.toFixed(1)},${y.toFixed(1)}`;
          }
          return d;
        };
        const cracks = Array.from({ length: 9 }, (_, i) => crack((i / 9) * Math.PI * 2 + 0.3, 260 + rnd() * 160)).join(' ');
        const embers = Array.from({ length: 30 }, () => `<circle cx="${(30 + rnd() * 340).toFixed(1)}" cy="${(40 + rnd() * 560).toFixed(1)}" r="${(0.8 + rnd() * 1.4).toFixed(1)}" fill="${rnd() > 0.5 ? T : R}" opacity=".8"/>`).join('');
        const smoke = [[120, 70, 30], [160, 50, 22], [270, 60, 28], [300, 40, 18]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${PR}" opacity=".05"/>`).join('');
        return `<defs><radialGradient id="glow" cx="${c.x}" cy="${c.y}" r="420" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${FD2}"/><stop offset=".6" stop-color="${FD}"/><stop offset="1" stop-color="${DEEP}"/></radialGradient></defs>
          <rect width="400" height="700" fill="url(#glow)"/>
          <path d="${cracks}" fill="none" stroke="${R}" stroke-width="7" opacity=".25" stroke-linejoin="round"/>
          <path d="${cracks}" fill="none" stroke="${R}" stroke-width="2.4" stroke-linejoin="round" opacity=".85"/>
          <path d="${cracks}" fill="none" stroke="${T}" stroke-width=".8" stroke-linejoin="round" opacity=".9"/>
          ${embers}${smoke}`;
      },

      // The steam vents' grates and the magma gauge.
      decor: (L, { P2, K, PR }) => {
        const vents = L.vents.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10" fill="${K}"/><circle cx="${x}" cy="${y}" r="10" fill="none" stroke="#6d625c" stroke-width="1.5"/>
          ${[-4, 0, 4].map((dx) => `<line x1="${x + dx}" y1="${y - 6}" x2="${x + dx}" y2="${y + 6}" stroke="#6d625c" stroke-width="1.6"/>`).join('')}`).join('');
        const gauge = L.inserts.magma.map((m) => `<path d="M${m.x - 4},${m.y + 5} L${m.x},${m.y - 5} L${m.x + 4},${m.y + 5}Z" fill="${P2}" stroke="${K}" stroke-width="1.2" stroke-linejoin="round"/>`).join('');
        return `${vents}${gauge}<text x="${L.inserts.magma[0].x - 3}" y="${L.inserts.magma[0].y + 15}" font-family="'Special Elite', monospace" font-size="6" fill="${PR}" letter-spacing="1">MAGMA</text>`;
      },

      subtitle: 'FURY OF THE FIRE GOD',
      sideText: 'SKILL SHOT ▸ LIGHT H·O·T',
    },

    text: {
      centerpiece: 'Lava lake',
      centerpieceHit: 'BLOOP!',
      scoop: 'lava tube',
      rampHit: 'WHOOSH!',
      bumperWords: ['SIZZLE!', 'CRACK!', 'FWOOSH!', 'HISS!'],
      chapters: ['Smoke on the Horizon', 'The Tiki Speaks', 'Rivers of Fire', 'The Mountain Wakes', 'Fury of the Fire God'],
      multiballLit: 'Chapter V! Shoot the lava tube for multiball',
      multiballCallout: 'Fury of the Fire God! Shoot the lava tube',
      multiball: 'Fire God Multiball!',
      jackpot: 'fire god jackpot',
      extraBall: 'Out of the fire',
      turnOver: 'To Be Continued…',
    },

    missions: [
      { id: 'mc-lava', name: 'Lava Run', goal: 'Make 3 ramp shots', event: 'ramp', count: 3, tier: 0, halos: ['ramps'] },
      { id: 'mc-pits', name: 'Stoke the Fires', goal: 'Hit the fire pits 20 times', event: 'pop', count: 20, seconds: 35, tier: 0, halos: ['pops'] },
      { id: 'mc-pumice', name: 'Pumice Toss', goal: 'Clear the pumice targets', event: 'dropBank', count: 1, tier: 0, halos: ['drops'] },
      { id: 'mc-rim', name: 'Around the Rim', goal: 'Shoot the left orbit twice', event: 'orbit', count: 2, tier: 1, halos: ['orbit'] },
      { id: 'mc-hot', name: 'Hot Hot Hot', goal: 'Roll through the H·O·T lanes 5 times', event: 'lane', count: 5, tier: 1, halos: ['lanes'] },
      { id: 'mc-torch', name: 'Torch Bearer', goal: 'Spin the torch 20 times', event: 'spinner', count: 20, tier: 1, halos: ['spinner'] },
      { id: 'mc-bubble', name: 'Bubbling Over', goal: 'Hit the lava lake 6 times', event: 'ufo', count: 6, seconds: 40, tier: 2, halos: ['centerpiece'] },
      { id: 'mc-flow', name: 'Lava Flow', goal: 'Make a ramp, then the other one while its arrow blinks, twice', event: 'rampCombo', count: 2, seconds: 45, tier: 2, halos: ['ramps'] },
      { id: 'mc-tube', name: 'Down the Tube', goal: 'Shoot the lava tube twice', event: 'scoop', count: 2, tier: 2, halos: ['scoop'] },
      { id: 'mc-quarry', name: 'Pumice Quarry', goal: 'Clear the pumice targets 3 times', event: 'dropBank', count: 3, seconds: 60, tier: 3, halos: ['drops'] },
      { id: 'mc-rivers', name: 'Rivers of Fire', goal: 'Make 5 ramp shots', event: 'ramp', count: 5, seconds: 45, tier: 3, halos: ['ramps'] },
      { id: 'mc-wake', name: 'Wake the Mountain', goal: 'Hit the lava lake 10 times', event: 'ufo', count: 10, seconds: 45, tier: 4, halos: ['centerpiece'] },
    ],

    // Mount Cinder's own rules (see timberHollow.js for the hooks).
    rules(api) {
      const { addScore, fx, announce, awake, game, INK: ink, Body, balls } = api;
      let magma = 0; // ramps towards an eruption
      let eruptAt = 0;
      let eruptUntil = 0;
      const modeReady = () => awake('ramp') && awake('scoop');
      const erupting = (now = performance.now()) => now < eruptUntil;
      // Share of the jackpot still there, draining from 1 to HURRY_FLOOR.
      const left = (now) => Math.max(HURRY_FLOOR, 1 - (now - eruptAt) / HURRY_MS);

      const vents = layout.vents.map(([x, y]) => ({ x, y, phase: 'idle', until: 0, thrown: new Set() }));
      const idle = (now) => now + VENT_IDLE_MS[0] + Math.random() * (VENT_IDLE_MS[1] - VENT_IDLE_MS[0]);

      // Any direction but the drain: down within 40 degrees of straight
      // down is left out, so a vent never fires a ball straight at the gap.
      function blast(ball) {
        let a;
        do a = Math.random() * Math.PI * 2; while (Math.abs(a - Math.PI / 2) < (40 * Math.PI) / 180);
        Body.setVelocity(ball, { x: Math.cos(a) * VENT_SPEED, y: Math.sin(a) * VENT_SPEED });
      }

      function tickVents(now) {
        for (const v of vents) {
          if (v.phase === 'idle') {
            if (!v.until) v.until = idle(now);
            if (now >= v.until) {
              v.phase = 'warn';
              v.until = now + VENT_WARN_MS;
            }
          } else if (v.phase === 'warn' && now >= v.until) {
            v.phase = 'blast';
            v.until = now + VENT_BLAST_MS;
            v.thrown.clear();
          } else if (v.phase === 'blast') {
            for (const ball of balls) {
              if (ball.plugin.mode !== 'playfield' || v.thrown.has(ball)) continue;
              if (Math.hypot(ball.position.x - v.x, ball.position.y - v.y) > VENT_R) continue;
              v.thrown.add(ball);
              blast(ball);
              fx.burst(v.x, v.y - 18, 'HISS!', ink.teal);
            }
            if (now >= v.until) {
              v.phase = 'idle';
              v.until = idle(now);
            }
          }
        }
      }

      function endEruption() {
        eruptAt = 0;
        eruptUntil = 0;
      }

      return {
        newTurn() {
          magma = 0;
          endEruption();
          for (const v of vents) {
            v.phase = 'idle';
            v.until = 0;
          }
        },

        ramp() {
          if (!modeReady() || erupting()) return;
          magma += 1;
          if (magma < MAGMA_RAMPS) return;
          magma = 0;
          eruptAt = performance.now();
          eruptUntil = eruptAt + HURRY_MS;
          announce('Eruption! Shoot the lava tube before it cools', 3000);
          fx.title('Eruption!', 'Shoot the lava tube, fast', 1600);
          fx.shake(500, 7);
          for (let i = 0; i < 3; i++) setTimeout(() => api.spawnPickup(), 500 * i);
        },

        // The lava tube: collects the eruption jackpot (Chapter V
        // multiball, handled by main.js, comes first).
        scoop() {
          const now = performance.now();
          if (!erupting(now)) return false;
          const total = addScore('eruption', 'eruption jackpot', { at: layout.scoop, mult: left(now) });
          endEruption();
          fx.title('Jackpot!', `${formatPoints(total)} from the lava tube`, 1800);
          fx.shake(400, 6);
          return true;
        },

        tick(now) {
          if (eruptUntil && now >= eruptUntil && game.turnActive) {
            endEruption();
            fx.title('The Lava Cools', 'Make 5 ramps to erupt again', 1200);
          }
          if (game.turnActive) tickVents(now);
        },

        scoopLit: () => erupting(),

        // Magma lamps (chasing while it erupts), the draining jackpot over
        // the lava lake, and the vents' warning glow and steam.
        lamps(ctx, now) {
          const hot = erupting(now);
          layout.inserts.magma.forEach((m, i) => {
            const on = hot ? Math.floor(now / 110) % MAGMA_RAMPS === i : i < magma;
            if (!on) return;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(m.x - 4, m.y + 5);
            ctx.lineTo(m.x, m.y - 5);
            ctx.lineTo(m.x + 4, m.y + 5);
            ctx.closePath();
            ctx.fillStyle = ink.red;
            ctx.shadowColor = ink.red;
            ctx.shadowBlur = 6;
            ctx.fill();
            ctx.restore();
          });

          if (hot) {
            const c = layout.centerpiece;
            ctx.save();
            ctx.globalAlpha = 0.25 + 0.2 * Math.sin(now / 60);
            ctx.fillStyle = ink.red;
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.r + 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.font = "14px Rye, Georgia, serif";
            ctx.textAlign = 'center';
            ctx.lineWidth = 3;
            ctx.strokeStyle = ink.ink;
            const label = formatPoints(Math.round(api.valueOf('eruption') * left(now)));
            ctx.strokeText(label, c.x, c.y - c.r - 10);
            ctx.fillStyle = ink.mustard;
            ctx.fillText(label, c.x, c.y - c.r - 10);
            ctx.restore();
          }

          for (const v of vents) {
            if (v.phase === 'idle') continue;
            ctx.save();
            if (v.phase === 'warn') {
              ctx.globalAlpha = 0.5 + 0.4 * Math.sin(now / 70);
              ctx.strokeStyle = ink.teal;
              ctx.shadowColor = ink.teal;
              ctx.shadowBlur = 8;
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.arc(v.x, v.y, 12, 0, Math.PI * 2);
              ctx.stroke();
            } else {
              const t = 1 - (v.until - now) / VENT_BLAST_MS;
              ctx.fillStyle = ink.print;
              for (let k = 0; k < 3; k++) {
                ctx.globalAlpha = 0.45 * (1 - t);
                ctx.beginPath();
                ctx.arc(v.x + (k - 1) * 6, v.y - 8 - t * 22 - k * 6, 5 + t * 8, 0, Math.PI * 2);
                ctx.fill();
              }
            }
            ctx.restore();
          }
        },
      };
    },
  };
})();
