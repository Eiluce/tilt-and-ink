// Table 2: Timber Hollow, "The Woodsman's Curse". A cursed lumber camp in a
// haunted pine forest: five toadstool pop bumpers in a ring, the Old Oak
// (owl eyes, a hollow for a scoop) at the centre, a log flume that climbs
// the left side and crosses over the top, a rope-bridge ramp on the right,
// axe drop targets, and a sawmill blade for the spinner.
//
// Physics twist: a touch more gravity than Rocket Row, and moss on the
// inlanes that slows the ball as it rolls through.
//
// Its own rule, "Timber!": spinning the saw fills a saw meter; a full meter
// wakes the oak and lights its hollow, and shooting the hollow starts a
// frenzy where every toadstool hit also chops the oak.

TABLE_DEFS[2] = (() => {
  const SAW_TURNS = 20; // spinner turns to fill the saw meter
  const SAW_LAMPS = 5;
  const TIMBER_MS = 20000;
  const MOSS_DRAG = 0.55; // speed kept rolling through a mossy inlane

  const layout = {
    gravity: 0.46,
    pops: [[200, 144], [244, 176], [227, 227], [173, 227], [156, 176]],
    popR: 16,
    centerpiece: { x: 200, y: 300, r: 26 },
    scoop: { x: 200, y: 348 },
    kickout: { x: 142, y: 300, eject: [0.5, 4] },
    drops: { x: 200, y: 425, count: 3, spacing: 30, w: 24, h: 13 },
    flippers: {},
    ramps: {
      // The log flume: up the left side, then over the top to the right.
      left: [[130, 380], [112, 330], [84, 280], [88, 220], [92, 150], [160, 104], [268, 122]],
      // The rope bridge: a short climb up the right side.
      right: [[276, 378], [296, 340], [322, 312], [324, 260], [326, 210], [318, 170], [296, 150]],
    },
    laneLetters: ['O', 'A', 'K'],
    pickupSpots: [[262, 300], [118, 215], [284, 215], [200, 470], [300, 440], [200, 196]],
    inserts: {
      arrows: [
        { key: 'leftRamp', x: 142, y: 400, rot: -22, s: 1, ink: 'red' },
        { key: 'rightRamp', x: 262, y: 398, rot: 24, s: 1, ink: 'teal' },
        { key: 'orbit', x: 58, y: 420, rot: -28, s: 0.85, ink: 'mustard' },
        { key: 'scoop', x: 200, y: 380, rot: 0, s: 0.7, ink: 'mustard' },
      ],
      multipliers: [2, 3, 4, 5].map((n, i) => ({ n, x: 155 + i * 30, y: 462, r: 10 })),
      chapters: ['I', 'II', 'III', 'IV', 'V'].map((t, i) => ({ t, x: 150 + i * 25, y: 518 })),
      rowLetters: { y: 95, r: 8.5 },
      extraBall: { x: 166, y: 549, w: 68, h: 15, label: 'EXTRA BALL' },
      shootAgain: { x: 160, y: 578, w: 80, h: 16, label: 'SHOOT AGAIN' },
      title: { y: 500 },
      // The saw meter: five teeth along the left, lit as the saw spins.
      saw: Array.from({ length: SAW_LAMPS }, (_, i) => ({ x: 84 + i * 11, y: 438 - i * 4 })),
    },
  };

  const BARK = '#7a4f2a';

  return {
    n: 2,
    name: 'Timber Hollow',
    layout,
    inks: { red: '#c95f2a', teal: '#4d7a35' },

    art: {
      // A toadstool cap from above: rust cap, paper spots.
      pop: (r, { P, K, R }) => `
        <circle r="${r + 3}" fill="${K}" opacity=".18" cx="2" cy="3"/>
        <circle r="${r}" fill="${R}" stroke="${K}" stroke-width="${r * 0.16}"/>
        ${[[-0.35, -0.3, 0.22], [0.3, -0.35, 0.17], [0.38, 0.25, 0.2], [-0.25, 0.38, 0.15], [0, 0, 0.14]]
          .map(([x, y, s]) => `<circle cx="${x * r}" cy="${y * r}" r="${s * r}" fill="${P}" stroke="${K}" stroke-width="${r * 0.05}"/>`).join('')}`,
      popSpriteR: (r) => r + 6,

      // The Old Oak: a gnarled trunk seen from above, with an owl in its knot.
      centerpiece: (r, { P, K, M }) => `
        <path d="M0,${-r} C${r * 0.7},${-r * 1.05} ${r * 1.1},${-r * 0.5} ${r * 1.02},0 C${r * 1.08},${r * 0.6} ${r * 0.55},${r * 1.05} 0,${r} C${-r * 0.6},${r * 1.02} ${-r * 1.1},${r * 0.55} ${-r},0 C${-r * 1.05},${-r * 0.6} ${-r * 0.55},${-r * 1.02} 0,${-r}Z" fill="${BARK}" stroke="${K}" stroke-width="${r * 0.14}"/>
        ${[0.72, 0.48].map((k) => `<circle r="${r * k}" fill="none" stroke="${K}" stroke-width="${r * 0.04}" opacity=".45"/>`).join('')}
        <circle cx="${-r * 0.3}" cy="${-r * 0.1}" r="${r * 0.24}" fill="${P}" stroke="${K}" stroke-width="${r * 0.07}"/>
        <circle cx="${r * 0.3}" cy="${-r * 0.1}" r="${r * 0.24}" fill="${P}" stroke="${K}" stroke-width="${r * 0.07}"/>
        <circle cx="${-r * 0.3}" cy="${-r * 0.08}" r="${r * 0.1}" fill="${K}"/><circle cx="${r * 0.3}" cy="${-r * 0.08}" r="${r * 0.1}" fill="${K}"/>
        <path d="M${-r * 0.1},${r * 0.14} L0,${r * 0.32} L${r * 0.1},${r * 0.14}Z" fill="${M}" stroke="${K}" stroke-width="${r * 0.04}"/>`,
      centerpieceSpriteR: (r) => r * 1.2,

      // A sawmill blade.
      spinner: (len, h, { K, M }) => {
        const teeth = [];
        for (let x = -len / 2; x < len / 2; x += 3) teeth.push(`L${x + 1.5},${-h / 2 - 2} L${x + 3},${-h / 2}`);
        return `<path d="M${-len / 2},${-h / 2} ${teeth.join(' ')} L${len / 2},${h / 2} L${-len / 2},${h / 2}Z" fill="#b9bcc0" stroke="${K}" stroke-width="1.3" stroke-linejoin="round"/>
          <circle r="${h * 0.45}" fill="${M}" stroke="${K}" stroke-width="1.3"/>`;
      },

      // An axe head; its number is lettered on by lamps.js.
      drop: (w, h, { K, R }) => `<path d="M${-w / 2},${-h / 2} L${w / 2 - 3},${-h / 2 - 2} Q${w / 2 + 2},0 ${w / 2 - 3},${h / 2 + 2} L${-w / 2},${h / 2}Z" fill="${R}" stroke="${K}" stroke-width="2.2" stroke-linejoin="round"/>`,

      // Printed under everything: tree rings spreading from the oak, pines.
      backdrop: (L, { P2, K, T }) => {
        const c = L.centerpiece;
        const rings = [70, 120, 175, 235, 300, 370, 445]
          .map((r, i) => `<circle cx="${c.x}" cy="${c.y}" r="${r}" fill="none" stroke="${P2}" stroke-width="${i % 2 ? 14 : 22}"/>`).join('');
        const pine = (x, y, s) => `<path d="M${x},${y - 40 * s} L${x + 16 * s},${y - 12 * s} L${x + 8 * s},${y - 12 * s} L${x + 22 * s},${y + 12 * s} L${x - 22 * s},${y + 12 * s} L${x - 8 * s},${y - 12 * s} L${x - 16 * s},${y - 12 * s}Z"/>`;
        return `<defs>
            <pattern id="moss" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="3" cy="3" r="1.3" fill="${T}"/></pattern>
          </defs>
          ${rings}
          <g fill="url(#moss)" opacity=".35">${pine(330, 560, 2.2)}${pine(62, 175, 1.5)}${pine(300, 70, 1)}</g>
          <g fill="${K}" opacity=".55">${pine(115, 445, 0.28)}${pine(290, 470, 0.32)}${pine(300, 245, 0.22)}</g>`;
      },

      // Roots round the hollow, and moss on the inlanes (the physics twist).
      decor: (L, { K, T }) => {
        const c = L.centerpiece;
        const roots = [[-1, 1], [1, 1], [-1.4, 0.4], [1.4, 0.4]]
          .map(([dx, dy]) => `<path d="M${c.x + dx * 12},${c.y + 18} Q${c.x + dx * 30},${c.y + 30 * dy + 18} ${c.x + dx * 38},${c.y + 44 * dy + 14}" fill="none" stroke="${BARK}" stroke-width="5" stroke-linecap="round"/>`).join('');
        const ro = L.rollovers;
        const moss = [ro.inL, ro.inR].map((x) => `<ellipse cx="${x}" cy="${ro.y + 4}" rx="11" ry="26" fill="${T}" opacity=".35"/><ellipse cx="${x}" cy="${ro.y + 4}" rx="11" ry="26" fill="url(#moss)" opacity=".6"/>`).join('');
        const saw = L.inserts.saw.map((s) => `<path d="M${s.x - 4},${s.y + 4} L${s.x},${s.y - 5} L${s.x + 4},${s.y + 4}Z" fill="#e6d4ae" stroke="${K}" stroke-width="1.4" stroke-linejoin="round"/>`).join('');
        return `${moss}${roots}${saw}<text x="${L.inserts.saw[0].x - 2}" y="${L.inserts.saw[0].y + 14}" font-family="'Special Elite', monospace" font-size="6" fill="${K}" letter-spacing="1">SAW</text>`;
      },

      subtitle: "THE WOODSMAN'S CURSE",
      sideText: 'SKILL SHOT ▸ LIGHT O·A·K',
      apronLeft: ['RAMPS ADVANCE THE CHAPTER.', 'SPIN THE SAW TO WAKE THE OAK,', 'THEN SHOOT ITS HOLLOW.', { red: 'MOSS SLOWS THE INLANES' }],
      apronRight: ["THE WOODSMAN'S CURSE", { slab: 'NEXT WEEK:' }, 'DEEPER IN THE WOODS!'],
    },

    text: {
      centerpiece: 'Old Oak',
      centerpieceHit: 'KNOCK!',
      scoop: 'oak hollow',
      rampHit: 'WHOOSH!',
      bumperWords: ['PLOP!', 'SQUISH!', 'BOING!', 'THWAP!'],
      chapters: ['The Hollow Calls', 'Lost in the Pines', 'The Owl Watches', 'The Axe Remembers', 'The Woodsman Returns'],
      multiballLit: 'Chapter V! Shoot the oak hollow for multiball',
      multiballCallout: 'The Woodsman Returns! Shoot the hollow',
      multiball: 'Pinecone Multiball!',
      jackpot: 'pinecone jackpot',
      extraBall: 'The woods go on',
      turnOver: 'To Be Continued…',
    },

    missions: [
      { id: 'th-flume', name: 'Log Rolling', goal: 'Make 3 ramp shots', event: 'ramp', count: 3, tier: 0, halos: ['ramps'] },
      { id: 'th-stomp', name: 'Toadstool Stomp', goal: 'Hit the toadstools 20 times', event: 'pop', count: 20, seconds: 35, tier: 0, halos: ['pops'] },
      { id: 'th-axes', name: 'Axe Practice', goal: 'Clear the axe targets', event: 'dropBank', count: 1, tier: 0, halos: ['drops'] },
      { id: 'th-owl', name: 'Owl Watch', goal: 'Shoot the left orbit twice', event: 'orbit', count: 2, tier: 1, halos: ['orbit'] },
      { id: 'th-trail', name: 'Trail Markers', goal: 'Roll through the O·A·K lanes 5 times', event: 'lane', count: 5, tier: 1, halos: ['lanes'] },
      { id: 'th-sawmill', name: 'Sawmill Shift', goal: 'Spin the saw 20 times', event: 'spinner', count: 20, tier: 1, halos: ['spinner'] },
      { id: 'th-knock', name: 'Knock on Wood', goal: 'Hit the Old Oak 6 times', event: 'ufo', count: 6, seconds: 40, tier: 2, halos: ['centerpiece'] },
      { id: 'th-bridge', name: 'Flume and Bridge', goal: 'Make a ramp, then the other one while its arrow blinks, twice', event: 'rampCombo', count: 2, seconds: 45, tier: 2, halos: ['ramps'] },
      { id: 'th-hollow', name: 'Into the Hollow', goal: "Shoot the oak's hollow twice", event: 'scoop', count: 2, tier: 2, halos: ['scoop'] },
      { id: 'th-lumberjack', name: 'Lumberjack', goal: 'Clear the axe targets 3 times', event: 'dropBank', count: 3, seconds: 60, tier: 3, halos: ['drops'] },
      { id: 'th-logdrive', name: 'Log Drive', goal: 'Make 5 ramp shots', event: 'ramp', count: 5, seconds: 45, tier: 3, halos: ['ramps'] },
      { id: 'th-curse', name: "The Woodsman's Curse", goal: 'Hit the Old Oak 10 times', event: 'ufo', count: 10, seconds: 45, tier: 4, halos: ['centerpiece'] },
    ],

    // Timber Hollow's own rules. `api` is what main.js lends a table:
    // addScore, fx, announce, awake, game, INK, spawnPickup, velocityOf,
    // Body. Hooks main.js calls: newTurn, spinner(turns), inlane(ball),
    // pop(x, y), scoop() (true if it took the shot), tick(now),
    // lamps(ctx, now), scoopLit().
    rules(api) {
      const { addScore, fx, announce, awake, game, INK: ink } = api;
      let saw = 0; // spinner turns towards a full meter
      let oakAwake = false;
      let timberUntil = 0;
      const modeReady = () => awake('spinnerTurn') && awake('scoop');

      return {
        newTurn() {
          saw = 0;
          oakAwake = false;
          timberUntil = 0;
        },

        spinner(turns) {
          if (!modeReady() || oakAwake || performance.now() < timberUntil) return;
          saw = Math.min(SAW_TURNS, saw + turns);
          if (saw >= SAW_TURNS) {
            oakAwake = true;
            announce('The Old Oak wakes! Shoot its hollow');
            fx.title('The Oak Wakes!', 'Shoot the hollow for Timber!', 1500);
          }
        },

        // Moss: the ball loses speed rolling through an inlane.
        inlane(ball) {
          const v = api.velocityOf(ball);
          api.Body.setVelocity(ball, { x: v.x * MOSS_DRAG, y: v.y * MOSS_DRAG });
        },

        pop(x, y) {
          if (performance.now() >= timberUntil) return;
          addScore('chop', 'chop', { at: { x, y: y - 30 } });
          fx.burst(x + 16, y - 20, 'CHOP!', ink.mustard);
        },

        // The hollow: starts Timber! when the oak is awake (Chapter V
        // multiball, handled by main.js, comes first).
        scoop() {
          if (!oakAwake) return false;
          oakAwake = false;
          saw = 0;
          timberUntil = performance.now() + TIMBER_MS;
          announce('Timber! Every toadstool chops the oak', 3000);
          fx.title('Timber!', 'Toadstools chop for 20 s', 1800);
          fx.shake(400, 5);
          for (let i = 0; i < 3; i++) setTimeout(() => api.spawnPickup(), 600 * i);
          return true;
        },

        tick(now) {
          if (timberUntil && now >= timberUntil && game.turnActive) {
            timberUntil = 0;
            fx.title('The Oak Stands', 'Spin the saw to wake it again', 1200);
          }
        },

        scoopLit: () => oakAwake,
        timberLeft: (now) => Math.max(0, timberUntil - now),

        // Saw meter lamps, and the oak glowing while awake or felling.
        lamps(ctx, now) {
          const lit = Math.floor((saw / SAW_TURNS) * SAW_LAMPS);
          const felling = now < timberUntil;
          layout.inserts.saw.forEach((s, i) => {
            const on = felling ? Math.floor(now / 120) % SAW_LAMPS === i : i < lit || (oakAwake && Math.floor(now / 200) % 2);
            if (!on) return;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(s.x - 4, s.y + 4);
            ctx.lineTo(s.x, s.y - 5);
            ctx.lineTo(s.x + 4, s.y + 4);
            ctx.closePath();
            ctx.fillStyle = ink.red;
            ctx.shadowColor = ink.red;
            ctx.shadowBlur = 6;
            ctx.fill();
            ctx.restore();
          });
          if (oakAwake || felling) {
            const c = layout.centerpiece;
            ctx.save();
            ctx.globalAlpha = 0.25 + 0.2 * Math.sin(now / (felling ? 60 : 140));
            ctx.fillStyle = felling ? ink.red : ink.mustard;
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.r + 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        },
      };
    },
  };
})();
