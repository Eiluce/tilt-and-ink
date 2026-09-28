// Table 5: Frostbite Peak, "The Abominable Expedition". A climb up a snowy
// range: three penguin pop bumpers, the Yeti glaring out of its ice cave as
// the centrepiece (the cave is the scoop), Rocket Row's pair of side ramps
// as ski slopes, snowflake drop targets and a ski for the spinner.
//
// Physics twist: ice. The ball has no friction against anything, loses
// less speed to the air and bounces more, so it skids and ricochets
// instead of settling: aimed shots and catches are harder than on Mount
// Cinder, though stray shots find the ramps more often.
//
// Its own rule, the Yeti Hunt: the yeti's footprints light one shot at a
// time; hitting it follows the tracks and lights another; three tracks
// light the ice cave, where a shot photographs the yeti.

TABLE_DEFS[5] = (() => {
  const TRACKS = 3;
  const ROAM_MS = 15000; // unfollowed tracks move on to another shot
  const SHOTS = ['leftRamp', 'rightRamp', 'orbit', 'kickout'];

  const layout = {
    gravity: 0.52,
    ballFriction: 0, // ice (every other table: BALL_FRICTION, 0.05)
    ballAir: 0.0008, // and it keeps its speed (other tables: BALL_AIR, 0.0015)
    ballBounce: 0.75, // and bounces off everything (other tables: BALL_BOUNCE, 0.6)
    pops: [[160, 160], [240, 160], [200, 212]],
    popR: 20,
    centerpiece: { x: 200, y: 300, r: 32 },
    scoop: { x: 200, y: 356 },
    kickout: { x: 118, y: 255, eject: [0.6, 4] },
    drops: { x: 200, y: 408, count: 3, spacing: 30, w: 24, h: 13 },
    flippers: {},
    // Rocket Row's ramps: a mirrored pair climbing the sides to the top lanes.
    ramps: TABLE_DEFS[1].layout.ramps,
    laneLetters: ['I', 'C', 'E'],
    pickupSpots: [[150, 440], [290, 440], [200, 470], [145, 215], [255, 215], [200, 125]],
    // Where each huntable shot's footprints are printed.
    tracks: { leftRamp: [104, 374], rightRamp: [296, 374], orbit: [30, 390], kickout: [92, 236] },
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
      // Tracks followed: three footprints along the left.
      tracks: Array.from({ length: TRACKS }, (_, i) => ({ x: 88 + i * 15, y: 432 - i * 5 })),
    },
  };

  const DEEP = '#a9c6d6'; // the bottom of the backdrop's gradient
  const ICE = '#a9d6ee';
  const SNOW = '#ffffff';
  const SHADE = '#8fb0c4';

  // A yeti's footprint: a sole and three toes, pointing up.
  const foot = (x, y, fill, K, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cy="1" rx="3" ry="4.2" fill="${fill}" stroke="${K}" stroke-width="1"/>${[-2, 0, 2].map((dx) => `<circle cx="${dx}" cy="-4.5" r="1" fill="${fill}" stroke="${K}" stroke-width=".6"/>`).join('')}</g>`;
  const footPair = (x, y, fill, K) => foot(x - 4, y + 4, fill, K) + foot(x + 4, y - 4, fill, K);

  const hex = (r, rot = 0) => Array.from({ length: 6 }, (_, i) => {
    const a = ((i * 60 + rot) * Math.PI) / 180;
    return `${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`;
  }).join(' ');

  return {
    n: 5,
    name: 'Frostbite Peak',
    layout,
    inks: { red: '#b23a6b', teal: '#3f7fae' },
    // Printed on pale glacier ice, navy print.
    stock: { field: '#dbe8ef', fieldAlt: '#c6dbe6', print: '#1d3448', title: '#1d3448', hatch: '#b9cfdb', ground: '#0c1219' },

    art: {
      // A penguin looking up at the ball: black head, white face, orange
      // beak, berry scarf.
      pop: (r, { K, R, M }) => `<circle r="${r * 0.98}" fill="${K}" stroke="${K}" stroke-width="${r * 0.08}"/>
        <path d="M0,${-r * 0.3} C${-r * 0.2},${-r * 0.65} ${-r * 0.8},${-r * 0.5} ${-r * 0.7},${r * 0.1} C${-r * 0.6},${r * 0.7} ${r * 0.6},${r * 0.7} ${r * 0.7},${r * 0.1} C${r * 0.8},${-r * 0.5} ${r * 0.2},${-r * 0.65} 0,${-r * 0.3}Z" fill="${SNOW}"/>
        ${[-1, 1].map((s) => `<circle cx="${s * r * 0.3}" cy="${-r * 0.08}" r="${r * 0.11}" fill="${K}"/><circle cx="${s * r * 0.3 - r * 0.03}" cy="${-r * 0.11}" r="${r * 0.04}" fill="${SNOW}"/>`).join('')}
        <path d="M${-r * 0.16},${r * 0.12} L${r * 0.16},${r * 0.12} L0,${r * 0.36}Z" fill="${M}" stroke="${K}" stroke-width="${r * 0.04}"/>
        <path d="M${-r * 0.8},${r * 0.55} Q0,${r * 1.05} ${r * 0.8},${r * 0.55}" fill="none" stroke="${R}" stroke-width="${r * 0.18}" stroke-linecap="round"/>`,
      popSpriteR: (r) => r * 1.15,

      // The Yeti glaring out of an ice-rock mound, fangs bared. Drawn so
      // the mound ends at the bumper's edge.
      centerpiece: (R0, { K, R }) => {
        const r = R0 * 0.8;
        const fur = Array.from({ length: 16 }, (_, i) => {
          const a = (i / 16) * Math.PI * 2;
          const k = i % 2 ? 0.62 : 0.78;
          return `${(Math.cos(a) * r * k).toFixed(1)},${(Math.sin(a) * r * k).toFixed(1)}`;
        }).join(' ');
        return `<circle r="${R0 * 1.08}" fill="${K}" opacity=".2" cx="3" cy="4"/>
          <polygon points="${hex(r * 1.32)}" fill="${ICE}" stroke="${K}" stroke-width="${r * 0.08}" stroke-linejoin="round"/>
          <polygon points="${hex(r * 1.0, 20)}" fill="${SNOW}" opacity=".5"/>
          <polygon points="${fur}" fill="${SNOW}" stroke="${K}" stroke-width="${r * 0.06}" stroke-linejoin="round"/>
          <ellipse cy="${r * 0.05}" rx="${r * 0.4}" ry="${r * 0.36}" fill="${SHADE}" stroke="${K}" stroke-width="${r * 0.05}"/>
          ${[-1, 1].map((s) => `<path d="M${s * r * 0.3},${-r * 0.2} L${s * r * 0.06},${-r * 0.08}" stroke="${K}" stroke-width="${r * 0.07}" stroke-linecap="round"/><circle cx="${s * r * 0.16}" cy="${-r * 0.02}" r="${r * 0.06}" fill="${R}" stroke="${K}" stroke-width="${r * 0.03}"/>`).join('')}
          <path d="M${-r * 0.2},${r * 0.16} Q0,${r * 0.36} ${r * 0.2},${r * 0.16}Z" fill="${K}"/>
          <path d="M${-r * 0.12},${r * 0.19} l${r * 0.04},${r * 0.08} l${r * 0.04},${-r * 0.07} M${r * 0.04},${r * 0.19} l${r * 0.04},${r * 0.08} l${r * 0.04},${-r * 0.08}" fill="${SNOW}" stroke="${SNOW}" stroke-width="${r * 0.03}"/>`;
      },
      centerpieceSpriteR: (r) => r * 1.15,

      // A berry-red wooden ski with a curled tip and a binding.
      spinner: (len, h, { K, R }) => `<path d="M${-len * 0.5},${-h * 0.3} L${len * 0.35},${-h * 0.3} Q${len * 0.52},${-h * 0.3} ${len * 0.5},0 Q${len * 0.52},${h * 0.3} ${len * 0.35},${h * 0.3} L${-len * 0.5},${h * 0.3}Z" fill="${R}" stroke="${K}" stroke-width=".6"/>
        <rect x="${-len * 0.1}" y="${-h * 0.42}" width="${len * 0.16}" height="${h * 0.84}" fill="${K}"/>
        <line x1="${-len * 0.45}" y1="0" x2="${len * 0.3}" y2="0" stroke="${SNOW}" stroke-width=".5" opacity=".7"/>`,

      // A snowflake: six glacier-blue arms outlined in ink, with side
      // branches, round a white centre that carries its number (lettered
      // on by lamps.js). Blue rather than white so it reads on the pale board.
      drop: (w, h, { K, T }) => {
        const arm = h * 0.72;
        const arms = [0, 60, 120].map((d) => `<line transform="rotate(${d})" x1="${-arm}" y1="0" x2="${arm}" y2="0" stroke="${K}" stroke-width="4.4" stroke-linecap="round"/>`).join('')
          + [0, 60, 120].map((d) => `<line transform="rotate(${d})" x1="${-arm}" y1="0" x2="${arm}" y2="0" stroke="${T}" stroke-width="2.4" stroke-linecap="round"/>`).join('');
        const branches = [0, 60, 120, 180, 240, 300].map((d) => `<path transform="rotate(${d}) translate(${arm * 0.72} 0)" d="M-2.2,-2.6 L0,0 L-2.2,2.6" fill="none" stroke="${T}" stroke-width="1.3" stroke-linecap="round"/>`).join('');
        return `${arms}${branches}<circle r="5.8" fill="${SNOW}" stroke="${K}" stroke-width="1.2"/>`;
      },
      dropNumber: '#1e1a16', // press ink on the white centre

      // Ramps as ski slopes: a white piste with two ski tracks and slalom
      // flags down each side, red and blue in turn.
      rampDeck: (c, d, { K, R, T, along, at }) => {
        const track = (off) => along(c, 3, 6, 6).map((p) => {
          const n = ((p.deg - 90) * Math.PI) / 180;
          return `${(p.x + Math.cos(n) * off).toFixed(1)},${(p.y + Math.sin(n) * off).toFixed(1)}`;
        }).join(' ');
        const flags = along(c, 22, 18).map((p, i) => at(p.x.toFixed(1), p.y.toFixed(1), `<line x1="0" y1="${i % 2 ? 6 : -6}" x2="0" y2="${i % 2 ? 10 : -10}" stroke="${K}" stroke-width=".8"/><path d="M0,${i % 2 ? 6 : -10} l5,1.8 l-5,1.8Z" fill="${i % 2 ? T : R}"/>`, p.deg.toFixed(1))).join('');
        return `<path d="${d}" fill="none" stroke="${SNOW}" stroke-width="22" stroke-linecap="round"/>
          <polyline points="${track(-3)}" fill="none" stroke="${SHADE}" stroke-width="1.2"/><polyline points="${track(3)}" fill="none" stroke="${SHADE}" stroke-width="1.2"/>${flags}`;
      },

      // Slingshots as ice shards: white facets fanning from the corner to a
      // glacier-blue rubber that flashes berry when it kicks.
      sling: {
        fill: ICE,
        rubber: (lit) => (lit ? '#b23a6b' : '#3f7fae'),
        pattern: (lit, xy) => {
          const [a, b, c] = FRAME.slings.left; // top, corner, bottom
          return [0.2, 0.45, 0.7, 0.9].map((t) => {
            const [x1, y1] = xy(...b);
            const [x2, y2] = xy(a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t);
            return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${lit ? '#b23a6b' : SNOW}" stroke-width="1.4"/>`;
          }).join('');
        },
      },

      // Printed under everything: the range seen from below, paler with
      // distance, snow caps on the middle peaks, a low sun, falling snow.
      backdrop: (L, { FD, FD2 }) => {
        let seed = 11;
        const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
        const range = (base, amp, peaks, fill, op, caps) => {
          let d = `M0,${base}`;
          const tops = [];
          for (let i = 0; i <= peaks; i++) {
            const x = (i / peaks) * 400;
            const y = base - (i % 2 ? amp * (0.6 + rnd() * 0.5) : amp * 0.1 * rnd());
            if (i % 2) tops.push([x, y]);
            d += ` L${x.toFixed(0)},${y.toFixed(0)}`;
          }
          d += ` L400,${base + 400} L0,${base + 400}Z`;
          const snowCaps = caps ? tops.map(([x, y]) => `<path d="M${x - 14},${y + 16} L${x},${y} L${x + 14},${y + 16} L${x + 6},${y + 12} L${x},${y + 18} L${x - 6},${y + 12}Z" fill="${SNOW}" opacity=".85"/>`).join('') : '';
          return `<path d="${d}" fill="${fill}" opacity="${op}"/>${snowCaps}`;
        };
        const snowfall = Array.from({ length: 70 }, () => `<circle cx="${(rnd() * 400).toFixed(0)}" cy="${(rnd() * 700).toFixed(0)}" r="${(0.8 + rnd() * 1.6).toFixed(1)}" fill="${SNOW}" opacity=".8"/>`).join('');
        return `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${FD2}"/><stop offset=".6" stop-color="${FD}"/><stop offset="1" stop-color="${DEEP}"/></linearGradient></defs>
          <rect width="400" height="700" fill="url(#sky)"/>
          <circle cx="300" cy="110" r="34" fill="${SNOW}" opacity=".55"/>
          ${range(210, 80, 8, SHADE, 0.35, false)}${range(380, 110, 6, SHADE, 0.55, true)}${range(560, 90, 7, DEEP, 0.7, false)}${snowfall}`;
      },

      // Footprints at each huntable shot, and the TRACKS lamps.
      decor: (L, { P2, K, PR }) => {
        const spots = Object.values(L.tracks).map(([x, y]) => `<g opacity=".7">${footPair(x, y, P2, K)}</g>`).join('');
        const lamps = L.inserts.tracks.map((t) => foot(t.x, t.y, P2, K, 1.1)).join('');
        return `${spots}${lamps}<text x="${L.inserts.tracks[0].x - 7}" y="${L.inserts.tracks[0].y + 15}" font-family="'Special Elite', monospace" font-size="6" fill="${PR}" letter-spacing="1">TRACKS</text>`;
      },

      subtitle: 'THE ABOMINABLE EXPEDITION',
      sideText: 'SKILL SHOT ▸ LIGHT I·C·E',
    },

    text: {
      centerpiece: 'Yeti',
      centerpieceHit: 'ROAR!',
      scoop: 'ice cave',
      rampHit: 'SWOOSH!',
      bumperWords: ['SQUAWK!', 'CRUNCH!', 'BRRR!', 'POOF!'],
      chapters: ['Base Camp', 'The Long Climb', 'Footprints in the Snow', 'Whiteout', 'The Abominable'],
      multiballLit: 'Chapter V! Shoot the ice cave for multiball',
      multiballCallout: 'The Abominable! Shoot the ice cave',
      multiball: 'Avalanche Multiball!',
      jackpot: 'yeti jackpot',
      extraBall: 'Dug out of the snow',
      turnOver: 'To Be Continued…',
    },

    missions: [
      { id: 'fp-slalom', name: 'Slalom', goal: 'Make 3 ramp shots', event: 'ramp', count: 3, tier: 0, halos: ['ramps'] },
      { id: 'fp-colony', name: 'Penguin Colony', goal: 'Hit the penguins 20 times', event: 'pop', count: 20, seconds: 35, tier: 0, halos: ['pops'] },
      { id: 'fp-flakes', name: 'Catch the Flakes', goal: 'Clear the snowflake targets', event: 'dropBank', count: 1, tier: 0, halos: ['drops'] },
      { id: 'fp-summit', name: 'Around the Summit', goal: 'Shoot the left orbit twice', event: 'orbit', count: 2, tier: 1, halos: ['orbit'] },
      { id: 'fp-ice', name: 'Ice Cold', goal: 'Roll through the I·C·E lanes 5 times', event: 'lane', count: 5, tier: 1, halos: ['lanes'] },
      { id: 'fp-ski', name: 'Off-Piste', goal: 'Spin the ski 20 times', event: 'spinner', count: 20, tier: 1, halos: ['spinner'] },
      { id: 'fp-face', name: 'Face the Yeti', goal: 'Hit the Yeti 6 times', event: 'ufo', count: 6, seconds: 40, tier: 2, halos: ['centerpiece'] },
      { id: 'fp-traverse', name: 'Traverse', goal: 'Make a ramp, then the other one while its arrow blinks, twice', event: 'rampCombo', count: 2, seconds: 45, tier: 2, halos: ['ramps'] },
      { id: 'fp-cave', name: 'Into the Cave', goal: 'Shoot the ice cave twice', event: 'scoop', count: 2, tier: 2, halos: ['scoop'] },
      { id: 'fp-blizzard', name: 'Blizzard', goal: 'Clear the snowflake targets 3 times', event: 'dropBank', count: 3, seconds: 60, tier: 3, halos: ['drops'] },
      { id: 'fp-descent', name: 'Fast Descent', goal: 'Make 5 ramp shots', event: 'ramp', count: 5, seconds: 45, tier: 3, halos: ['ramps'] },
      { id: 'fp-abominable', name: 'The Abominable', goal: 'Hit the Yeti 10 times', event: 'ufo', count: 10, seconds: 45, tier: 4, halos: ['centerpiece'] },
    ],

    // Frostbite Peak's own rules (see timberHollow.js for the hooks).
    rules(api) {
      const { addScore, fx, announce, awake, game, INK: ink } = api;
      let target = null; // the shot whose footprints are lit
      let movedAt = 0;
      let tracks = 0;
      let caveLit = false;
      const modeReady = () => awake('ramp') && awake('orbit') && awake('kickout') && awake('scoop');

      function light(now, except) {
        const options = SHOTS.filter((s) => s !== except);
        target = options[Math.floor(Math.random() * options.length)];
        movedAt = now;
      }

      function hit(shot) {
        if (shot !== target || caveLit) return;
        const now = performance.now();
        const [x, y] = layout.tracks[shot];
        tracks += 1;
        addScore('track', 'yeti tracks', { at: { x, y: y - 20 } });
        fx.burst(x, y - 24, 'TRACKS!', ink.red);
        if (tracks >= TRACKS) {
          caveLit = true;
          target = null;
          announce('The trail leads to the ice cave! Shoot it for a photo', 3000);
          fx.title('The Ice Cave!', 'Shoot it to photograph the Yeti', 1600);
        } else {
          light(now, shot);
          announce(`Tracks ${tracks} of ${TRACKS}: follow the next footprints`);
        }
      }

      return {
        newTurn() {
          target = null;
          tracks = 0;
          caveLit = false;
        },

        ramp: (name) => hit(name === 'left' ? 'leftRamp' : 'rightRamp'),
        orbit: () => hit('orbit'),
        kickout: () => hit('kickout'),

        // The ice cave: the photo, once the tracks lead there (Chapter V
        // multiball, handled by main.js, comes first).
        scoop() {
          if (!caveLit) return false;
          const total = addScore('yetiPhoto', 'yeti photo', { at: layout.scoop });
          caveLit = false;
          tracks = 0;
          fx.title('Snap!', `A photo of the Yeti: ${formatPoints(total)}`, 1800);
          fx.shake(350, 5);
          return true;
        },

        // New footprints appear once the mode is awake, and move on if
        // nobody follows them.
        tick(now) {
          if (!game.turnActive || caveLit || !modeReady()) return;
          if (!target) light(now);
          else if (now - movedAt > ROAM_MS) light(now, target);
        },

        scoopLit: () => caveLit,

        // The lit footprints blink at their shot; the TRACKS lamps fill up
        // (all blinking while the cave is lit), and the Yeti glows.
        lamps(ctx, now) {
          const drawFoot = (x, y, s) => {
            ctx.beginPath();
            ctx.ellipse(x, y + s, 3 * s, 4.2 * s, 0, 0, Math.PI * 2);
            for (const dx of [-2, 0, 2]) {
              ctx.moveTo(x + dx * s + s, y - 4.5 * s);
              ctx.arc(x + dx * s, y - 4.5 * s, s, 0, Math.PI * 2);
            }
            ctx.fill();
          };
          ctx.save();
          ctx.fillStyle = ink.red;
          ctx.shadowColor = ink.red;
          ctx.shadowBlur = 6;
          layout.inserts.tracks.forEach((t, i) => {
            if (i < tracks && (!caveLit || Math.floor(now / 200) % 2)) drawFoot(t.x, t.y, 1.1);
          });
          if (target && Math.floor(now / 250) % 2) {
            const [x, y] = layout.tracks[target];
            drawFoot(x - 4, y + 4, 1);
            drawFoot(x + 4, y - 4, 1);
          }
          ctx.restore();
          if (caveLit) {
            const c = layout.centerpiece;
            ctx.save();
            ctx.globalAlpha = 0.25 + 0.2 * Math.sin(now / 140);
            ctx.fillStyle = ink.teal;
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
