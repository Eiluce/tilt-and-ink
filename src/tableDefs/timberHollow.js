// Table 2: Timber Hollow, "The Woodsman's Curse". A cursed lumber camp in a
// haunted autumn forest: five pop bumpers of red toadstool clusters, the
// felled Old Oak as a roped woodpile (a hollow for a scoop below it) at the
// centre, Rocket Row's pair of side ramps, oak-leaf drop targets, and a log
// for the spinner.
//
// Physics twist: a touch more gravity than Rocket Row, and moss on the
// inlanes that slows the ball as it rolls through.
//
// Its own rule, "Timber!": spinning the log fills a saw meter; a full meter
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
    // Rocket Row's ramps: a mirrored pair climbing the sides to the top lanes.
    ramps: TABLE_DEFS[1].layout.ramps,
    laneLetters: ['O', 'A', 'K'],
    pickupSpots: [[262, 300], [118, 215], [284, 215], [200, 470], [300, 440], [200, 196]],
    inserts: {
      arrows: [
        { key: 'leftRamp', x: 140, y: 388, rot: -28, s: 1, ink: 'red' },
        { key: 'rightRamp', x: 260, y: 388, rot: 28, s: 1, ink: 'teal' },
        { key: 'orbit', x: 58, y: 420, rot: -28, s: 0.85, ink: 'mustard' },
        { key: 'scoop', x: 200, y: 380, rot: 0, s: 0.7, ink: 'mustard' },
      ],
      multipliers: [2, 3, 4, 5].map((n, i) => ({ n, x: 155 + i * 30, y: 462, r: 10 })),
      chapters: ['I', 'II', 'III', 'IV', 'V'].map((t, i) => ({ t, x: 150 + i * 25, y: 518 })),
      rowLetters: { y: 95, r: 8.5 },
      extraBall: { x: 166, y: 549, w: 68, h: 15, label: 'EXTRA BALL' },
      shootAgain: { x: 160, y: 578, w: 80, h: 16, label: 'SHOOT AGAIN' },
      title: { y: 500 },
      // The saw meter: five teeth along the left, lit as the log spins.
      saw: Array.from({ length: SAW_LAMPS }, (_, i) => ({ x: 84 + i * 11, y: 438 - i * 4 })),
    },
  };

  const BARK = '#7a4f2a';
  const TIMBER = '#c89a5f';
  const PINE = '#3f5a26';
  const CAP = '#c23b22'; // toadstool red

  return {
    n: 2,
    name: 'Timber Hollow',
    layout,
    inks: { red: '#e3862c', teal: '#7fa33a' },
    // Printed on an autumn woodcut board, russet instead of poster paper.
    stock: { field: '#6e3a20', fieldAlt: '#7c4428', print: '#f1dcae', title: '#f1dcae', hatch: '#552c18', ground: '#170d08' },

    art: {
      // Three red toadstools growing together, seen from above, paper spots.
      pop: (r, { P, K }) => {
        const cap = (x, y, k) => `<circle cx="${x * r}" cy="${y * r}" r="${k * r}" fill="${CAP}" stroke="${K}" stroke-width="${r * 0.11}"/>
          ${[[-0.3, -0.25, 0.2], [0.3, -0.1, 0.16], [-0.05, 0.35, 0.17]].map(([dx, dy, sz]) => `<circle cx="${(x + dx * k) * r}" cy="${(y + dy * k) * r}" r="${sz * k * r}" fill="${P}"/>`).join('')}`;
        return `<circle r="${r + 3}" fill="${K}" opacity=".18" cx="2" cy="3"/>
          ${cap(0.42, 0.34, 0.52)}${cap(-0.44, 0.3, 0.55)}${cap(0, -0.3, 0.66)}`;
      },
      popSpriteR: (r) => r + 6,

      // The Old Oak, felled: a woodpile of its logs, cut ends out (rings
      // round a red heart), roped together.
      centerpiece: (r, { K, R }) => {
        const k = 0.4;
        const logs = [[-0.72, 0.56], [0, 0.56], [0.72, 0.56], [-0.36, -0.06], [0.36, -0.06], [0, -0.68]]
          .map(([x, y]) => `<circle cx="${x * r}" cy="${y * r}" r="${k * r}" fill="${BARK}" stroke="${K}" stroke-width="${r * 0.07}"/>
            <circle cx="${x * r}" cy="${y * r}" r="${k * r * 0.78}" fill="${TIMBER}"/>
            ${[0.55, 0.3].map((q) => `<circle cx="${x * r}" cy="${y * r}" r="${k * r * q}" fill="none" stroke="${BARK}" stroke-width="${r * 0.025}"/>`).join('')}
            <circle cx="${x * r}" cy="${y * r}" r="${r * 0.03}" fill="${R}"/>`).join('');
        return `<circle r="${r * 1.2}" fill="${K}" opacity=".22" cx="3" cy="4"/>
          ${logs}
          <path d="M${-r * 1.15},${r * 0.26} Q0,${r * 0.14} ${r * 1.15},${r * 0.26}" fill="none" stroke="#cdb27a" stroke-width="${r * 0.08}" stroke-dasharray="${r * 0.12} ${r * 0.06}"/>`;
      },
      centerpieceSpriteR: (r) => r * 1.35,

      // A small log with a cut end and a green sprout.
      spinner: (len, h, { K, T }) => `<rect x="${-len / 2}" y="${-h / 2}" width="${len}" height="${h}" rx="${h / 2}" fill="${BARK}" stroke="${K}" stroke-width="1.2"/>
        <path d="M${-len / 2 + 4},${-h / 6} L${len / 2 - 5},${-h / 6} M${-len / 2 + 6},${h / 5} L${len / 2 - 3},${h / 5}" stroke="${K}" stroke-width=".7" opacity=".6"/>
        <ellipse cx="${len / 2 - h / 2}" rx="${h * 0.32}" ry="${h * 0.42}" fill="${TIMBER}" stroke="${K}" stroke-width=".8"/>
        <circle cx="${-len / 4}" cy="${-h / 2}" r="1.6" fill="${T}" stroke="${K}" stroke-width=".6"/>`,

      // A lobed oak leaf; its number is lettered on by lamps.js.
      drop: (w, h, { K, T }) => {
        const edge = Array.from({ length: 13 }, (_, i) => {
          const t = i / 12;
          return [-w / 2 + t * w, (i % 2 ? 0.75 : 1) * Math.sin(t * Math.PI) * (h / 2 + 2)];
        });
        const top = edge.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${(-y).toFixed(1)}`).join(' ');
        const bottom = edge.slice().reverse().map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
        return `<path d="${top} ${bottom}Z" fill="${T}" stroke="${K}" stroke-width="2" stroke-linejoin="round"/>
          <path d="M${-w / 2 - 2},0 L${w / 2 - 2},0" stroke="${K}" stroke-width="1" opacity=".55"/>`;
      },

      // Printed under everything: tree rings spreading from the oak, green
      // pines, and falling leaves (mostly still green, some turned).
      backdrop: (L, { FD2, T, K }) => {
        const c = L.centerpiece;
        const rings = [70, 120, 175, 235, 300, 370, 445]
          .map((r, i) => `<circle cx="${c.x}" cy="${c.y}" r="${r}" fill="none" stroke="${FD2}" stroke-width="${i % 2 ? 14 : 22}"/>`).join('');
        const pine = (x, y, s) => `<path d="M${x},${y - 40 * s} L${x + 16 * s},${y - 12 * s} L${x + 8 * s},${y - 12 * s} L${x + 22 * s},${y + 12 * s} L${x - 22 * s},${y + 12 * s} L${x - 8 * s},${y - 12 * s} L${x - 16 * s},${y - 12 * s}Z"/>`;
        const leaf = (x, y, s, rot, fill) => `<path transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" d="M0,-10 C6,-6 7,4 0,10 C-7,4 -6,-6 0,-10Z M0,-10 L0,12" fill="${fill}" stroke="${K}" stroke-width="1"/>`;
        const leafInks = [T, '#e3862c', T, '#e3a92b', '#5e8c31', '#b8452a'];
        const leaves = [[280, 150, 1.1, -50], [110, 330, 1, 80], [250, 360, 1.1, 10], [60, 470, 1.1, -20], [340, 460, 1.4, 60], [260, 560, 1, 140], [140, 590, 1.2, -100], [330, 370, 0.9, 45]]
          .map(([x, y, sc, r], i) => leaf(x, y, sc, r, leafInks[i % leafInks.length])).join('');
        return `<defs>
            <pattern id="moss" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="3" cy="3" r="1.3" fill="${T}"/></pattern>
          </defs>
          ${rings}
          <g fill="${PINE}" opacity=".8">${pine(330, 560, 2.2)}${pine(62, 175, 1.5)}${pine(300, 70, 1)}</g>
          <g fill="url(#moss)" opacity=".6">${pine(330, 560, 2.2)}${pine(62, 175, 1.5)}${pine(300, 70, 1)}</g>
          <g fill="${T}" opacity=".45">${pine(115, 445, 0.28)}${pine(290, 470, 0.32)}${pine(300, 245, 0.22)}</g>
          ${leaves}`;
      },

      // Moss on the inlanes (the physics twist) and the saw meter.
      decor: (L, { K, T, PR }) => {
        const ro = L.rollovers;
        const moss = [ro.inL, ro.inR].map((x) => `<ellipse cx="${x}" cy="${ro.y + 4}" rx="11" ry="26" fill="${T}" opacity=".35"/><ellipse cx="${x}" cy="${ro.y + 4}" rx="11" ry="26" fill="url(#moss)" opacity=".6"/>`).join('');
        const saw = L.inserts.saw.map((s) => `<path d="M${s.x - 4},${s.y + 4} L${s.x},${s.y - 5} L${s.x + 4},${s.y + 4}Z" fill="#e6d4ae" stroke="${K}" stroke-width="1.4" stroke-linejoin="round"/>`).join('');
        return `${moss}${saw}<text x="${L.inserts.saw[0].x - 2}" y="${L.inserts.saw[0].y + 14}" font-family="'Special Elite', monospace" font-size="6" fill="${PR}" letter-spacing="1">SAW</text>`;
      },

      // Ramps as forest trails: a pine-green deck with bone edges and bone
      // chevrons pointing up the ramp, like painted trail markers.
      rampDeck: (c, d, { PR, along, at }) => `<path d="${d}" fill="none" stroke="${PR}" stroke-width="22" stroke-linecap="round"/>
        <path d="${d}" fill="none" stroke="${PINE}" stroke-width="17" stroke-linecap="round"/>
        ${along(c, 22, 20).map((p) => at(p.x.toFixed(1), p.y.toFixed(1), `<path d="M-3,-6 L4,0 L-3,6" fill="none" stroke="${PR}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`, p.deg.toFixed(1))).join('')}`,

      // Slingshots stamped with a small bone pine that lights up when kicked.
      sling: {
        fill: PINE,
        rubber: () => '#f1dcae',
        pattern: (lit, xy) => `<polygon points="${[[97, 513], [100.5, 524], [99, 524], [102, 534], [100, 534], [103, 543], [92, 543], [94, 534], [92, 534], [94, 524], [93.5, 524]].map(([x, y]) => xy(x, y).join(',')).join(' ')}" fill="${lit ? '#e3a92b' : '#f1dcae'}" stroke="#1e1a16" stroke-width=".9" stroke-linejoin="round"/>`,
      },

      subtitle: "THE WOODSMAN'S CURSE",
      sideText: 'SKILL SHOT ▸ LIGHT O·A·K',
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
      { id: 'th-axes', name: 'Raking Leaves', goal: 'Clear the leaf targets', event: 'dropBank', count: 1, tier: 0, halos: ['drops'] },
      { id: 'th-owl', name: 'Owl Watch', goal: 'Shoot the left orbit twice', event: 'orbit', count: 2, tier: 1, halos: ['orbit'] },
      { id: 'th-trail', name: 'Trail Markers', goal: 'Roll through the O·A·K lanes 5 times', event: 'lane', count: 5, tier: 1, halos: ['lanes'] },
      { id: 'th-sawmill', name: 'Sawmill Shift', goal: 'Spin the log 20 times', event: 'spinner', count: 20, tier: 1, halos: ['spinner'] },
      { id: 'th-knock', name: 'Knock on Wood', goal: 'Hit the Old Oak 6 times', event: 'ufo', count: 6, seconds: 40, tier: 2, halos: ['centerpiece'] },
      { id: 'th-bridge', name: 'Up and Over', goal: 'Make a ramp, then the other one while its arrow blinks, twice', event: 'rampCombo', count: 2, seconds: 45, tier: 2, halos: ['ramps'] },
      { id: 'th-hollow', name: 'Into the Hollow', goal: "Shoot the oak's hollow twice", event: 'scoop', count: 2, tier: 2, halos: ['scoop'] },
      { id: 'th-lumberjack', name: 'Lumberjack', goal: 'Clear the leaf targets 3 times', event: 'dropBank', count: 3, seconds: 60, tier: 3, halos: ['drops'] },
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
            fx.title('The Oak Stands', 'Spin the log to wake it again', 1200);
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
