// Table 3: Davy Jones' Deep, "Terror of Twenty Fathoms". The sea floor at
// night: three moon-jellyfish pop bumpers, the Kraken in a whirlpool as the
// centrepiece with its maw for a scoop, Rocket Row's pair of side ramps, a
// bank of yellow fish for the drop targets, and a swordfish spinner.
//
// Physics twist: water drag (the ball keeps less of its speed each tick, so
// weak flips fall short of the ramps) and a rising current in the left
// orbit that carries a ball already heading up.
//
// Its own rule, "Release the Kraken": each Kraken hit opens its eye a
// step; a full eye lights the maw, and shooting the maw starts Kraken
// Attack, where the fish stand straight back up and every cleared bank is
// a feast.

TABLE_DEFS[3] = (() => {
  const EYE_HITS = 5;
  const ATTACK_MS = 20000;
  const DROP_RESET_MS = 1200; // dropTargets.js default
  const ATTACK_RESET_MS = 250;
  const CURRENT = 0.1; // push per tick along the orbit lane (gravity is ~0.13)

  const layout = {
    gravity: 0.46,
    ballAir: 0.006, // water drag: random flips make a third fewer ramps (other tables: BALL_AIR, 0.0015)
    pops: [[160, 160], [240, 160], [200, 212]],
    popR: 20,
    centerpiece: { x: 200, y: 300, r: 28 },
    scoop: { x: 200, y: 356 },
    kickout: { x: 118, y: 255, eject: [0.6, 4] },
    drops: { x: 200, y: 408, count: 3, spacing: 30, w: 24, h: 13 },
    flippers: {},
    // Rocket Row's ramps: a mirrored pair climbing the sides to the top lanes.
    ramps: TABLE_DEFS[1].layout.ramps,
    laneLetters: ['S', 'E', 'A'],
    pickupSpots: [[110, 405], [290, 430], [200, 470], [145, 215], [255, 215], [200, 125]],
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
      // The Kraken's eye: five lamps along the left, opened by Kraken hits.
      eye: Array.from({ length: EYE_HITS }, (_, i) => ({ x: 84 + i * 11, y: 438 - i * 4 })),
    },
  };

  const DEEP = '#07161f'; // the bottom of the backdrop's gradient
  const FISH = '#f4c430'; // the drop targets: yellow to stand out on the dark board
  const STEEL = '#6d8aa0'; // the swordfish

  // The orbit lane the current runs up: the straight left side, then the
  // arc round the top. `along` is the lane's upward direction at the ball.
  const { cx: AX, cy: AY } = FRAME.arch;
  function orbitLane(p) {
    if (p.x < FRAME.orbitGuide.x && p.y > AY && p.y < FRAME.orbitGuide.bottom) return { x: 0, y: -1 };
    const r = Math.hypot(p.x - AX, p.y - AY);
    const a = (Math.atan2(p.y - AY, p.x - AX) * 180) / Math.PI; // -180..180
    const deg = a < 0 ? a + 360 : a;
    if (p.y <= AY && r > FRAME.orbitGuide.r && deg >= 180 && deg <= 360 + FRAME.orbitGuide.endDeg) {
      const t = (deg * Math.PI) / 180;
      return { x: -Math.sin(t), y: Math.cos(t) };
    }
    return null;
  }

  return {
    n: 3,
    name: "Davy Jones' Deep",
    layout,
    inks: { red: '#e2674a', teal: '#5cc8b2' },
    // Printed on an abyssal engraving: a blue-black board, bone-white print.
    stock: { field: '#0f2a3b', fieldAlt: '#17384d', print: '#e9dcbf', title: '#e9dcbf', hatch: '#0a1d29', ground: '#040a0e' },

    art: {
      // A moon jellyfish from above: glowing bell, paper frill, four coral
      // rings, tentacles trailing off in the current.
      pop: (r, { P, K, R, T }) => {
        const tent = [-0.35, -0.1, 0.15, 0.4].map((dx) => `<path d="M${dx * r},${0.2 * r} c${0.2 * r},${0.35 * r} ${-0.15 * r},${0.5 * r} ${0.18 * r},${0.8 * r} s${0.1 * r},${0.35 * r} ${0.3 * r},${0.45 * r}" fill="none" stroke="${T}" stroke-width="${r * 0.08}" stroke-linecap="round" opacity=".85"/>`).join('');
        const rim = Array.from({ length: 14 }, (_, i) => {
          const a = (i / 14) * Math.PI * 2;
          return `<circle cx="${Math.cos(a) * r * 0.88}" cy="${Math.sin(a) * r * 0.88}" r="${r * 0.15}" fill="${P}" stroke="${K}" stroke-width="${r * 0.05}"/>`;
        }).join('');
        const rings = [45, 135, 225, 315].map((d) => {
          const a = (d * Math.PI) / 180;
          const x = Math.cos(a) * r * 0.36;
          const y = Math.sin(a) * r * 0.36;
          return `<circle cx="${x}" cy="${y}" r="${r * 0.17}" fill="none" stroke="${R}" stroke-width="${r * 0.09}" stroke-dasharray="${r * 0.85} ${r * 0.22}" transform="rotate(${d + 90} ${x} ${y})"/>`;
        }).join('');
        return `${tent}${rim}<circle r="${r * 0.86}" fill="${T}" stroke="${K}" stroke-width="${r * 0.09}"/>${rings}
          <path d="M${-r * 0.55},${-r * 0.25} A${r * 0.6},${r * 0.6} 0 0 1 ${-r * 0.15},${-r * 0.62}" fill="none" stroke="${P}" stroke-width="${r * 0.1}" stroke-linecap="round"/>`;
      },
      popSpriteR: (r) => r * 1.6,

      // The Kraken in its whirlpool: six curling tentacles and one huge eye.
      centerpiece: (r, { P, K, R, T, M }) => {
        const whirl = [1.35, 1.12].map((k, i) => `<circle r="${r * k}" fill="none" stroke="${T}" stroke-width="${r * 0.07}" stroke-dasharray="${r * (1 - i * 0.3)} ${r * 0.35}" opacity=".75"/>`).join('');
        const tents = [20, 80, 140, 200, 260, 320].map((deg) => {
          const xy = (d, k) => [Math.cos((d * Math.PI) / 180) * r * k, Math.sin((d * Math.PI) / 180) * r * k];
          const pt = (d, k) => xy(d, k).map((v) => v.toFixed(2)).join(',');
          const d = `M${pt(deg, 0.4)} Q${pt(deg - 28, 1.05)} ${pt(deg + 16, 1.3)} Q${pt(deg + 40, 1.45)} ${pt(deg + 40, 1.15)}`;
          const suckers = [0.75, 1.02].map((k) => {
            const [x, y] = xy(deg - 12 + k * 14, k);
            return `<circle cx="${x}" cy="${y}" r="${r * 0.05}" fill="${P}"/>`;
          }).join('');
          return `<path d="${d}" fill="none" stroke="${K}" stroke-width="${r * 0.26}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${R}" stroke-width="${r * 0.17}" stroke-linecap="round"/>${suckers}`;
        }).join('');
        return `<circle r="${r * 1.2}" fill="${K}" opacity=".25" cx="3" cy="4"/>${whirl}${tents}
          <circle r="${r * 0.6}" fill="${R}" stroke="${K}" stroke-width="${r * 0.08}"/>
          <ellipse rx="${r * 0.38}" ry="${r * 0.26}" fill="${P}" stroke="${K}" stroke-width="${r * 0.06}"/>
          <circle r="${r * 0.19}" fill="${M}" stroke="${K}" stroke-width="${r * 0.04}"/><ellipse rx="${r * 0.05}" ry="${r * 0.16}" fill="${K}"/>`;
      },
      centerpieceSpriteR: (r) => r * 1.5,

      // A swordfish, bill first, with a coral dorsal fin.
      spinner: (len, h, { P, K, R }) => `<path d="M${-len * 0.22},0 L${-len * 0.5},0" stroke="${K}" stroke-width="${h * 0.18}" stroke-linecap="round"/>
        <path d="M${-len * 0.02},${-h * 0.4} L${len * 0.1},${-h * 0.85} L${len * 0.14},${-h * 0.36}Z" fill="${R}" stroke="${K}" stroke-width=".6" stroke-linejoin="round"/>
        <path d="M${len * 0.26},0 L${len * 0.48},${-h * 0.55} L${len * 0.42},0 L${len * 0.48},${h * 0.55}Z" fill="${STEEL}" stroke="${K}" stroke-width=".6" stroke-linejoin="round"/>
        <ellipse cx="${len * 0.03}" rx="${len * 0.27}" ry="${h * 0.46}" fill="${STEEL}" stroke="${K}" stroke-width=".8"/>
        <circle cx="${-len * 0.14}" cy="${-h * 0.1}" r="${h * 0.12}" fill="${P}"/>`,

      // A yellow fish with a coral stripe; its number is lettered on by lamps.js.
      drop: (w, h, { P, K, R }) => `<path d="M${w / 2 - 7},0 L${w / 2 + 1},${-h / 2} L${w / 2 + 1},${h / 2}Z" fill="${FISH}" stroke="${K}" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M${-w / 2 + 1},0 Q0,${-h / 2 - 3} ${w / 2 - 5},0 Q0,${h / 2 + 3} ${-w / 2 + 1},0Z" fill="${FISH}" stroke="${K}" stroke-width="2"/>
        <path d="M${w / 4 + 2},${-h / 2 + 1.5} Q${w / 4 + 4},0 ${w / 4 + 2},${h / 2 - 1.5}" fill="none" stroke="${R}" stroke-width="2"/>
        <circle cx="${-w / 4 - 1}" cy="-1.2" r="1.8" fill="${P}" stroke="${K}" stroke-width=".7"/>`,

      // Printed under everything: the board darkens with depth, light falls
      // from the surface, kelp climbs the sides, specks glow, bubbles rise.
      backdrop: (L, { FD, FD2, PR, T }) => {
        let seed = 7;
        const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
        const shafts = [[120, 40, 70], [205, 30, 50], [290, 50, 60], [60, 70, 40]]
          .map(([x, w, sp], i) => `<path d="M${x - w / 2},20 L${x + w / 2},20 L${x + w / 2 + sp},560 L${x - w / 2 - sp * 0.4},560Z" fill="${PR}" opacity="${i % 2 ? 0.035 : 0.055}"/>`).join('');
        const kelp = (x0, top, ph, w) => {
          let d = '';
          for (let y = 700; y >= top; y -= 8) d += `${d ? 'L' : 'M'}${(x0 + Math.sin(y / 26 + ph) * 9).toFixed(1)},${y} `;
          return `<path d="${d}" fill="none" stroke="${T}" stroke-width="${w}" stroke-linecap="round" opacity=".28"/>`;
        };
        const specks = Array.from({ length: 34 }, () => {
          const x = (30 + rnd() * 340).toFixed(1);
          const y = (60 + rnd() * 560).toFixed(1);
          const r = 0.8 + rnd() * 1.6;
          return `<circle cx="${x}" cy="${y}" r="${(r * 3).toFixed(1)}" fill="${T}" opacity=".08"/><circle cx="${x}" cy="${y}" r="${r.toFixed(1)}" fill="${T}" opacity=".7"/>`;
        }).join('');
        const bubbles = [[92, 320], [318, 250], [260, 470], [140, 440]]
          .map(([x, y]) => [0, 1, 2, 3].map((k) => `<circle cx="${x + Math.sin(k * 2) * 4}" cy="${y - k * 14}" r="${4 - k * 0.7}" fill="none" stroke="${PR}" stroke-width="1" opacity=".35"/>`).join('')).join('');
        return `<defs><linearGradient id="deep" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${FD2}"/><stop offset=".55" stop-color="${FD}"/><stop offset="1" stop-color="${DEEP}"/></linearGradient></defs>
          <rect width="400" height="700" fill="url(#deep)"/>
          ${shafts}${kelp(36, 420, 0, 7)}${kelp(58, 470, 2, 5)}${kelp(352, 440, 1, 7)}${kelp(372, 500, 3, 5)}${kelp(22, 520, 4, 4)}${specks}${bubbles}`;
      },

      // The current's chevrons up the left orbit, and the eye lamps.
      decor: (L, { P2, K, T, PR }) => {
        const chevron = (x, y, rot) => `<path transform="translate(${x} ${y}) rotate(${rot})" d="M-7,4 L0,-4 L7,4" fill="none" stroke="${T}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>`;
        const lane = (L.orbitGuide.r + L.outerR - 4) / 2;
        const onArc = [196, 214, 232].map((d) => {
          const t = (d * Math.PI) / 180;
          return chevron(L.arch.cx + Math.cos(t) * lane, L.arch.cy + Math.sin(t) * lane, d - 180);
        }).join('');
        const current = [318, 262, 234].map((y) => chevron(29, y, 0)).join('') + onArc;
        const eye = L.inserts.eye.map((e) => `<path d="M${e.x - 5},${e.y} Q${e.x},${e.y - 5} ${e.x + 5},${e.y} Q${e.x},${e.y + 5} ${e.x - 5},${e.y}Z" fill="${P2}" stroke="${K}" stroke-width="1.3"/><circle cx="${e.x}" cy="${e.y}" r="1.4" fill="${K}"/>`).join('');
        return `${current}${eye}<text x="${L.inserts.eye[0].x - 2}" y="${L.inserts.eye[0].y + 14}" font-family="'Special Elite', monospace" font-size="6" fill="${PR}" letter-spacing="1">EYE</text>`;
      },

      dropNumber: '#1e1a16', // press ink: paper numbers vanish on yellow fish
      subtitle: 'TERROR OF TWENTY FATHOMS',
      sideText: 'SKILL SHOT ▸ LIGHT S·E·A',
    },

    text: {
      centerpiece: 'Kraken',
      centerpieceHit: 'BLINK!',
      scoop: "Kraken's maw",
      rampHit: 'SWOOSH!',
      bumperWords: ['SPLOSH!', 'BLUB!', 'GLUG!', 'SPLASH!'],
      chapters: ['Fog on the Water', 'The Black Spot', 'Twenty Fathoms Down', 'The Eye Opens', "Davy Jones' Locker"],
      multiballLit: "Chapter V! Shoot the Kraken's maw for multiball",
      multiballCallout: "Davy Jones' Locker! Shoot the maw",
      multiball: 'Kraken Multiball!',
      jackpot: 'kraken jackpot',
      extraBall: 'Back from the deep',
      turnOver: 'To Be Continued…',
    },

    missions: [
      { id: 'dj-rigging', name: 'Man the Rigging', goal: 'Make 3 ramp shots', event: 'ramp', count: 3, tier: 0, halos: ['ramps'] },
      { id: 'dj-bloom', name: 'Jellyfish Bloom', goal: 'Hit the jellyfish 20 times', event: 'pop', count: 20, seconds: 35, tier: 0, halos: ['pops'] },
      { id: 'dj-school', name: 'School of Fish', goal: 'Clear the fish targets', event: 'dropBank', count: 1, tier: 0, halos: ['drops'] },
      { id: 'dj-horn', name: 'Rounding the Horn', goal: 'Shoot the left orbit twice', event: 'orbit', count: 2, tier: 1, halos: ['orbit'] },
      { id: 'dj-sea', name: 'Sea Legs', goal: 'Roll through the S·E·A lanes 5 times', event: 'lane', count: 5, tier: 1, halos: ['lanes'] },
      { id: 'dj-sword', name: 'Swordfight', goal: 'Spin the swordfish 20 times', event: 'spinner', count: 20, tier: 1, halos: ['spinner'] },
      { id: 'dj-stare', name: 'Staring Contest', goal: 'Hit the Kraken 6 times', event: 'ufo', count: 6, seconds: 40, tier: 2, halos: ['centerpiece'] },
      { id: 'dj-line', name: 'Crossing the Line', goal: 'Make a ramp, then the other one while its arrow blinks, twice', event: 'rampCombo', count: 2, seconds: 45, tier: 2, halos: ['ramps'] },
      { id: 'dj-maw', name: 'Into the Maw', goal: "Shoot the Kraken's maw twice", event: 'scoop', count: 2, tier: 2, halos: ['scoop'] },
      { id: 'dj-nets', name: 'Full Nets', goal: 'Clear the fish targets 3 times', event: 'dropBank', count: 3, seconds: 60, tier: 3, halos: ['drops'] },
      { id: 'dj-gale', name: 'Riding the Gale', goal: 'Make 5 ramp shots', event: 'ramp', count: 5, seconds: 45, tier: 3, halos: ['ramps'] },
      { id: 'dj-fathoms', name: 'Twenty Fathoms', goal: 'Hit the Kraken 10 times', event: 'ufo', count: 10, seconds: 45, tier: 4, halos: ['centerpiece'] },
    ],

    // Davy Jones' Deep's own rules (see timberHollow.js for the hooks).
    rules(api) {
      const { addScore, fx, announce, awake, game, INK: ink, Body, velocityOf, balls } = api;
      let eye = 0; // Kraken hits towards an open eye
      let eyeOpen = false;
      let attackUntil = 0;
      const modeReady = () => awake('ufo') && awake('scoop') && awake('dropTarget');
      const attacking = (now = performance.now()) => now < attackUntil;

      function endAttack() {
        attackUntil = 0;
        api.setDropResetMs(DROP_RESET_MS);
      }

      return {
        newTurn() {
          eye = 0;
          eyeOpen = false;
          endAttack();
        },

        centerpiece() {
          if (!modeReady() || eyeOpen || attacking()) return;
          eye += 1;
          if (eye >= EYE_HITS) {
            eyeOpen = true;
            announce("The Kraken's eye opens! Shoot its maw");
            fx.title('The Eye Opens!', 'Shoot the maw to release the Kraken', 1500);
          }
        },

        // The maw: starts Kraken Attack when the eye is open (Chapter V
        // multiball, handled by main.js, comes first).
        scoop() {
          if (!eyeOpen) return false;
          eyeOpen = false;
          eye = 0;
          attackUntil = performance.now() + ATTACK_MS;
          api.setDropResetMs(ATTACK_RESET_MS);
          announce('Kraken Attack! Every school of fish is a feast', 3000);
          fx.title('Release the Kraken!', 'Clear the fish for 20 s', 1800);
          fx.shake(450, 6);
          return true;
        },

        dropBank() {
          if (!attacking()) return;
          const at = { x: layout.drops.x, y: layout.drops.y - 30 };
          addScore('feast', 'kraken feast', { at });
          fx.burst(at.x, at.y, 'GULP!', ink.red);
          fx.shake(250, 4);
        },

        tick(now) {
          if (attackUntil && now >= attackUntil && game.turnActive) {
            endAttack();
            fx.title('The Kraken Sinks', 'Hit it to open its eye again', 1200);
          }
          // The current: a ball already heading up the left orbit is carried on.
          for (const ball of balls) {
            if (ball.plugin.mode !== 'playfield') continue;
            const dir = orbitLane(ball.position);
            if (!dir) continue;
            const v = velocityOf(ball);
            if (v.x * dir.x + v.y * dir.y <= 0) continue;
            Body.setVelocity(ball, { x: v.x + dir.x * CURRENT, y: v.y + dir.y * CURRENT });
          }
        },

        scoopLit: () => eyeOpen,

        // Eye lamps (open with hits, blink when open, chase in an attack),
        // and the Kraken glowing while its eye is open or it attacks.
        lamps(ctx, now) {
          const hunting = attacking(now);
          layout.inserts.eye.forEach((e, i) => {
            const on = hunting ? Math.floor(now / 120) % EYE_HITS === i : i < eye || (eyeOpen && Math.floor(now / 200) % 2);
            if (!on) return;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(e.x - 5, e.y);
            ctx.quadraticCurveTo(e.x, e.y - 5, e.x + 5, e.y);
            ctx.quadraticCurveTo(e.x, e.y + 5, e.x - 5, e.y);
            ctx.closePath();
            ctx.fillStyle = ink.mustard;
            ctx.shadowColor = ink.mustard;
            ctx.shadowBlur = 6;
            ctx.fill();
            ctx.fillStyle = ink.ink;
            ctx.beginPath();
            ctx.ellipse(e.x, e.y, 0.8, 2.6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          });
          if (eyeOpen || hunting) {
            const c = layout.centerpiece;
            ctx.save();
            ctx.globalAlpha = 0.25 + 0.2 * Math.sin(now / (hunting ? 60 : 140));
            ctx.fillStyle = hunting ? ink.red : ink.mustard;
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.r + 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        },
      };
    },
  };
})();
