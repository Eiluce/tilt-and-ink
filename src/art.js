// Table art, "Pulp Serial Poster" direction: cream poster stock, black press
// ink, the table's two spot inks and mustard for rewards. The shared cabinet
// parts (walls, guides, lanes, flippers, slings, inserts, ramps, apron) are
// drawn here; each table's own pieces (pop bumpers, centrepiece, spinner,
// drop targets, backdrop, wording) come from its definition (TABLE.art).
//
// Everything is hand-coded SVG built from LAYOUT, in two kinds:
//  - playfieldSVG(): the static printed playfield (walls, guides, ramps,
//    unlit lamp inserts, apron). Injected inline into the page so its text
//    can use the page's web fonts.
//  - SPRITES: moving/reacting parts, rendered as data-URI images on the
//    Matter bodies. Drawn at 4x and shown at 0.25 scale like the old assets.
//    SVG-as-image can't load web fonts, so sprites carry no text; anything
//    that needs lettering is drawn by lamps.js instead.

// `red` and `teal` are the table's two spot-ink roles (Rocket Row's are
// literally red and teal); every table shares the rest.
//
// The playfield stock is per table too (TABLE.stock): `field` is what the
// playfield is printed on, `fieldAlt` its backdrop tone, `print` the ink for
// lettering printed straight on the field, `title` the table's name,
// `hatch` the dead-space fill, `apron` the apron and `ground` the page round
// the cabinet. Rocket Row prints on the poster paper itself. Lamp inserts,
// cards and ramps stay on paper whatever the field.
const INK = (() => {
  const base = {
    paper: '#efe2c4',
    aged: '#e6d4ae',
    ink: '#1e1a16',
    red: '#d2452f',
    teal: '#2e7f86',
    mustard: '#e3a92b',
    foxing: '#c8b48c',
    steel: '#55504a',
    ...TABLE.inks,
  };
  return {
    field: base.paper,
    fieldAlt: base.aged,
    print: base.ink,
    title: base.red,
    hatch: base.aged,
    apron: base.foxing,
    ground: '#17130f',
    ...base,
    ...TABLE.stock,
  };
})();

const Art = (() => {
  const { paper: P, aged: P2, ink: K, red: R, teal: T, mustard: M, foxing: F, field: FD, fieldAlt: FD2, print: PR } = INK;
  const TYPE = "'Special Elite', 'Courier New', monospace";
  const SLAB = "Rye, Georgia, serif";

  const star = (cx, cy, ro, ri, n, rot = -90) => {
    let d = '';
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 ? ri : ro;
      const a = ((rot + (i * 180) / n) * Math.PI) / 180;
      d += (i ? 'L' : 'M') + (cx + r * Math.cos(a)).toFixed(2) + ',' + (cy + r * Math.sin(a)).toFixed(2);
    }
    return d + 'Z';
  };
  const at = (x, y, inner, rot = 0) => `<g transform="translate(${x} ${y})${rot ? ` rotate(${rot})` : ''}">${inner}</g>`;
  const post = (x, y, r = 4.5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${P}" stroke="${K}" stroke-width="2.4"/>`;
  const pts = (list) => list.map((p) => p.join(',')).join(' ');
  const bezierPath = (c) => `M${c[0]} C${c[1]} ${c[2]} ${c[3]} C${c[4]} ${c[5]} ${c[6]}`;
  const arcPoint = (r, a) => [LAYOUT.arch.cx + r * Math.cos(deg(a)), LAYOUT.arch.cy + r * Math.sin(deg(a))];

  // --- element drawings (local coords, centred on the element) -------------

  // Kit handed to the table's own art pieces.
  const kit = { P, P2, K, R, T, M, F, FD, FD2, PR, star: (...a) => star(...a), at: (...a) => at(...a) };
  const A = TABLE.art;

  // Pivot at 0,0; the rounded tip reaches exactly `len`.
  const flipper = (len, rp, rt) => {
    const tip = len - rt;
    return `<path d="M0,${-rp} L${tip},${-rt} A${rt},${rt} 0 0 1 ${tip},${rt} L0,${rp} A${rp},${rp} 0 0 1 0,${-rp}Z" fill="${P}" stroke="${K}" stroke-width="3"/>
      <path d="M7,-3.5 L${tip - 4},-2" stroke="${R}" stroke-width="2.6" stroke-linecap="round"/>
      <circle r="${rp * 0.62}" fill="${R}" stroke="${K}" stroke-width="2.2"/><circle r="1.8" fill="${K}"/>`;
  };

  const ball = (r) => `<circle r="${r}" fill="${INK.steel}" stroke="${K}" stroke-width="2"/><circle cx="${-r * 0.35}" cy="${-r * 0.35}" r="${r * 0.3}" fill="${P}"/>`;

  const standup = (lit) => `<rect x="-3.5" y="-9" width="7" height="18" rx="1.5" fill="${lit ? M : P}" stroke="${K}" stroke-width="2"/><circle r="1.6" fill="${K}"/>`;

  // Slingshot. The drawn triangle ends exactly on the physics triangle, and
  // only the kicking face (first vertex to last, see slingshot.js) carries
  // the rubber band, inside the edge, so the line the ball bounces off is
  // the line you see. `lit` flashes the rubber when it kicks.
  let slingClips = 0;
  const sling = (verts, lit) => {
    const [A, , C] = verts;
    const cx = (verts[0][0] + verts[1][0] + verts[2][0]) / 3;
    const cy = (verts[0][1] + verts[1][1] + verts[2][1]) / 3;
    // Inward unit normal of the kicking face.
    const fx = C[0] - A[0];
    const fy = C[1] - A[1];
    const len = Math.hypot(fx, fy);
    let nx = -fy / len;
    let ny = fx / len;
    if ((cx - A[0]) * nx + (cy - A[1]) * ny < 0) {
      nx = -nx;
      ny = -ny;
    }
    const band = (d) => `${(A[0] + nx * d).toFixed(1)},${(A[1] + ny * d).toFixed(1)} ${(C[0] + nx * d).toFixed(1)},${(C[1] + ny * d).toFixed(1)}`;
    const id = `sling-clip-${slingClips++}`;
    const inner = verts.map(([x, y]) => `${(cx + (x - cx) * 0.4).toFixed(1)},${(cy + (y - cy) * 0.4).toFixed(1)}`).join(' ');
    return `<defs><clipPath id="${id}"><polygon points="${pts(verts)}"/></clipPath></defs>
      <polygon points="${pts(verts)}" fill="${R}"/>
      <g clip-path="url(#${id})">
        <polyline points="${band(3.5)}" fill="none" stroke="${lit ? M : P}" stroke-width="7"/>
        <polyline points="${band(7.5)}" fill="none" stroke="${K}" stroke-width="1.4"/>
      </g>
      <polygon points="${inner}" fill="${lit ? P : M}" stroke="${K}" stroke-width="1.4"/>
      <polygon points="${pts(verts)}" fill="none" stroke="${K}" stroke-width="1.6" stroke-linejoin="round"/>
      <polyline points="${pts([A, C])}" fill="none" stroke="${K}" stroke-width="2.4" stroke-linecap="round"/>`;
  };

  // --- shared lamp-insert shapes (unlit here, lit versions in lamps.js) ---

  // Lamp inserts come from the table; `ink` names a spot-ink role.
  const INSERTS = {
    ...LAYOUT.inserts,
    arrows: LAYOUT.inserts.arrows.map((a) => ({ ...a, color: INK[a.ink] })),
  };

  const arrowPath = (s) => `M0,${-12 * s} L${8 * s},${8 * s} L0,${3 * s} L${-8 * s},${8 * s}Z`;

  // --- the printed playfield -----------------------------------------------

  function playfieldSVG() {
    const L = LAYOUT;
    const { cx, cy } = L.arch;
    const field = `M8,700 L8,${cy} A${L.outerR},${L.outerR} 0 0 1 392,${cy} L392,700Z`;
    const orbitEnd = arcPoint(L.orbitGuide.r, L.orbitGuide.endDeg);
    const shooterEnd = arcPoint(L.guideR, L.shooterWall.endDeg);

    let s = `<defs>
      <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="${INK.hatch}"/><line x1="0" y1="0" x2="0" y2="6" stroke="${PR}" stroke-width="1.2" stroke-opacity=".35"/></pattern>
      <clipPath id="pf"><path d="${field}"/></clipPath>
      <filter id="rshadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="4" dy="6" stdDeviation="1.5" flood-color="${K}" flood-opacity=".35"/></filter>
    </defs>
    <rect width="400" height="700" fill="${K}"/>
    <g clip-path="url(#pf)">
      <rect width="400" height="700" fill="${FD}"/>
      ${A.backdrop(L, kit)}
    </g>`;

    // walls & guides
    // dead space behind the side slopes and inlane guides
    const [gl, gr] = [L.inlaneGuides.left, L.inlaneGuides.right];
    s += `<path d="M8,${L.sideSlopes.left[0][1]} L${pts(gl)} L122,652 L8,652Z" fill="url(#hatch)"/>
    <path d="M${L.shooterWall.x},${L.sideSlopes.right[0][1]} L${pts(gr)} L278,652 L${L.shooterWall.x},652Z" fill="url(#hatch)"/>
    <g fill="none" stroke="${K}" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8,700 L8,${cy} A${L.outerR},${L.outerR} 0 0 1 392,${cy} L392,700" stroke-width="8"/>
      <path d="M${L.orbitGuide.x},${L.orbitGuide.bottom} L${L.orbitGuide.x},${cy} A${L.orbitGuide.r},${L.orbitGuide.r} 0 0 1 ${orbitEnd[0].toFixed(1)},${orbitEnd[1].toFixed(1)}" stroke-width="6"/>
      <path d="M${L.shooterWall.x},700 L${L.shooterWall.x},${cy} A${L.guideR},${L.guideR} 0 0 0 ${shooterEnd[0].toFixed(1)},${shooterEnd[1].toFixed(1)}" stroke-width="6"/>
      <path d="M${pts(L.sideSlopes.left)}" stroke-width="6"/>
      <path d="M${pts(L.sideSlopes.right)}" stroke-width="6"/>
      <path d="M${pts(L.inlaneGuides.left)}" stroke-width="5"/>
      <path d="M${pts(L.inlaneGuides.right)}" stroke-width="5"/>
      <path d="M${pts(L.gate)}" stroke-width="2.5"/>
    </g>
    <path d="M3,700 L3,${cy} A197,197 0 0 1 397,${cy} L397,700" fill="none" stroke="${R}" stroke-width="2"/>
    ${post(L.orbitGuide.x, L.orbitGuide.bottom)}${post(L.inlaneGuides.left[0][0], L.inlaneGuides.left[0][1])}${post(L.inlaneGuides.right[0][0], L.inlaneGuides.right[0][1])}
    ${post(orbitEnd[0], orbitEnd[1], 4)}${post(shooterEnd[0], shooterEnd[1], 4)}<circle cx="${L.gate[1][0]}" cy="${L.gate[1][1]}" r="2" fill="${K}"/>`;

    // top rollover lanes (letters unlit)
    const lg = L.laneGuides;
    s += lg.xs.map((x) => `<rect x="${x - lg.width / 2}" y="${lg.top}" width="${lg.width}" height="${lg.bottom - lg.top}" rx="3.5" fill="${K}"/>${post(x, lg.top, 4)}${post(x, lg.bottom, 4)}`).join('');
    s += L.rolloverLanes.xs.map((x, i) => `<line x1="${x}" y1="70" x2="${x}" y2="82" stroke="${PR}" stroke-width="1.6"/>
      <circle cx="${x}" cy="${INSERTS.rowLetters.y}" r="${INSERTS.rowLetters.r}" fill="${P2}" stroke="${K}" stroke-width="1.8"/>
      <text x="${x}" y="${INSERTS.rowLetters.y + 4}" text-anchor="middle" font-family="${SLAB}" font-size="11" fill="${K}">${L.rolloverLanes.letters[i]}</text>`).join('');

    // unlit inserts & playfield lettering
    s += INSERTS.arrows.map((a) => at(a.x, a.y, `<path d="${arrowPath(a.s)}" fill="${P2}" stroke="${K}" stroke-width="2" stroke-linejoin="round"/>`, a.rot)).join('');
    s += INSERTS.multipliers.map((m) => `<circle cx="${m.x}" cy="${m.y}" r="${m.r}" fill="${P2}" stroke="${K}" stroke-width="1.8"/><text x="${m.x}" y="${m.y + 3.5}" text-anchor="middle" font-family="${SLAB}" font-size="9" fill="${K}">${m.n}×</text>`).join('');
    const titleSize = Math.min(25, 280 / TABLE.name.length); // fits between the slings
    s += `<text x="200" y="${INSERTS.title.y}" text-anchor="middle" font-family="${SLAB}" font-size="${titleSize.toFixed(1)}" fill="${INK.title}" stroke="${K}" stroke-width="1">${TABLE.name.toUpperCase()}</text>`;
    s += INSERTS.chapters.map((c) => `<rect x="${c.x - 10}" y="${c.y - 8}" width="20" height="16" rx="3" fill="${P2}" stroke="${K}" stroke-width="1.6"/><text x="${c.x}" y="${c.y + 4}" text-anchor="middle" font-family="${SLAB}" font-size="9" fill="${K}">${c.t}</text>`).join('');
    const eb = INSERTS.extraBall;
    const sa = INSERTS.shootAgain;
    s += `<text x="200" y="539" text-anchor="middle" font-family="${TYPE}" font-size="7" fill="${PR}" letter-spacing="1.5">${A.subtitle}</text>
      <rect x="${eb.x}" y="${eb.y}" width="${eb.w}" height="${eb.h}" rx="${eb.h / 2}" fill="${P2}" stroke="${K}" stroke-width="1.6"/><text x="200" y="${eb.y + 10.5}" text-anchor="middle" font-family="${TYPE}" font-size="7.5" fill="${K}">${eb.label}</text>
      <rect x="${sa.x}" y="${sa.y}" width="${sa.w}" height="${sa.h}" rx="${sa.h / 2}" fill="${P2}" stroke="${K}" stroke-width="1.8"/><text x="200" y="${sa.y + 11.5}" text-anchor="middle" font-family="${TYPE}" font-size="7.5" fill="${K}">${sa.label}</text>`;
    const ro = L.rollovers;
    s += [ro.inL, ro.inR].map((x) => at(x, ro.y, `<circle r="7" fill="${P2}" stroke="${K}" stroke-width="1.6"/><path d="${star(0, 0.5, 5, 2, 5)}" fill="${F}" stroke="${K}" stroke-width=".8"/>`)).join('');
    s += `<text transform="translate(380 470) rotate(-90)" font-family="${TYPE}" font-size="7.5" fill="${PR}" letter-spacing="1.5">${A.sideText}</text>`;

    // the table's decoration round its centrepiece, then scoop and kickout saucer
    s += `${A.decor ? A.decor(L, kit) : ''}
      <rect x="${L.scoop.x - 14}" y="${L.scoop.y - 6}" width="28" height="12" rx="6" fill="${K}"/><rect x="${L.scoop.x - 11}" y="${L.scoop.y - 3}" width="22" height="6" rx="3" fill="#000"/>`;
    s += at(L.kickout.x, L.kickout.y, `<circle r="12" fill="${M}" stroke="${K}" stroke-width="2.4"/><circle r="7.5" fill="${K}"/>`);

    // raised ramps
    s += ramp(L.ramps.left) + ramp(L.ramps.right);

    // apron over the drain
    s += `<rect x="150" y="660" width="100" height="40" fill="${K}"/>
      <path d="M8,652 L130,652 Q150,652 162,672 L238,672 Q250,652 270,652 L${L.shooterWall.x},652 L${L.shooterWall.x},700 L8,700Z" fill="${INK.apron}" stroke="${K}" stroke-width="5" stroke-linejoin="round"/>
      <rect x="46" y="660" width="98" height="34" rx="2" fill="${P}" stroke="${K}" stroke-width="1.6"/>
      <text font-family="${TYPE}" font-size="5.2" fill="${K}">${apronLines(A.apronLeft, 50, 669, 'start')}</text>
      <rect x="256" y="660" width="98" height="34" rx="2" fill="${P}" stroke="${K}" stroke-width="1.6"/>
      <text font-family="${TYPE}" font-size="5.6" fill="${K}" text-anchor="middle">${apronLines(A.apronRight, 305, 670, 'middle')}</text>`;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 700" preserveAspectRatio="none" aria-hidden="true">${s}</svg>`;
  }

  // Apron card lines: a string, { red: text } in the table's red ink, or
  // { slab: text } as a slab headline.
  function apronLines(lines, x, y0, anchor) {
    let y = y0;
    return lines.map((line) => {
      const t = typeof line === 'string' ? line : line.red || line.slab;
      const attrs = line.red ? ` fill="${R}"` : line.slab ? ` font-family="${SLAB}" font-size="8" fill="${R}"` : '';
      const out = `<tspan x="${x}" y="${y}" text-anchor="${anchor}"${attrs}>${t}</tspan>`;
      y += line.slab ? 9.5 : 8;
      return out;
    }).join('');
  }

  function ramp(c) {
    const d = bezierPath(c);
    // Entrance lip across the mouth, perpendicular to the ramp's first leg.
    const [x0, y0] = c[0];
    const dx = c[1][0] - x0;
    const dy = c[1][1] - y0;
    const len = Math.hypot(dx, dy);
    const nx = (-dy / len) * 13;
    const ny = (dx / len) * 13;
    return `<g filter="url(#rshadow)">
      <path d="${d}" fill="none" stroke="${K}" stroke-width="28" stroke-linecap="round"/>
      <path d="${d}" fill="none" stroke="#f7efdc" stroke-width="21" stroke-linecap="round"/>
      <path d="${d}" fill="none" stroke="${R}" stroke-width="3.5" stroke-dasharray="7 9"/>
      <line x1="${x0 + nx}" y1="${y0 + ny}" x2="${x0 - nx}" y2="${y0 - ny}" stroke="${K}" stroke-width="7" stroke-linecap="round"/>
      <line x1="${x0 + nx}" y1="${y0 + ny}" x2="${x0 - nx}" y2="${y0 - ny}" stroke="${M}" stroke-width="3.5" stroke-linecap="round"/>
    </g>`;
  }

  // --- sprites ---------------------------------------------------------------

  // Wraps a centred drawing into a 4x data-URI SVG; show it at scale 0.25.
  function sprite(inner, halfW, halfH = halfW) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${halfW * 8}" height="${halfH * 8}" viewBox="${-halfW} ${-halfH} ${halfW * 2} ${halfH * 2}">${inner}</svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  // Slingshot sprites are centred on the triangle's centroid, which is where
  // Matter puts the body's position for Bodies.fromVertices.
  function slingSprite(verts, lit) {
    const cx = (verts[0][0] + verts[1][0] + verts[2][0]) / 3;
    const cy = (verts[0][1] + verts[1][1] + verts[2][1]) / 3;
    const local = verts.map(([x, y]) => [x - cx, y - cy]);
    const halfW = Math.max(...local.map(([x]) => Math.abs(x))) + 3;
    const halfH = Math.max(...local.map(([, y]) => Math.abs(y))) + 3;
    return sprite(sling(local, lit), halfW, halfH);
  }

  // Centred on the outline's centroid, which is where Matter puts the
  // flipper body's position (flipper.js builds the body from the same outline).
  function flipperSprite(len, rp, rt) {
    const c = Matter.Vertices.centre(flipperOutline(len, rp, rt));
    const halfW = Math.max(rp + c.x, len - c.x) + 2;
    return sprite(`<g transform="translate(${-c.x} ${-c.y})">${flipper(len, rp, rt)}</g>`, halfW, rp + 2);
  }

  const L = LAYOUT;
  const SPRITES = {
    ball: sprite(ball(10), 11.5),
    pop: sprite(A.pop(L.popR, kit), A.popSpriteR(L.popR)),
    centerpiece: sprite(A.centerpiece(L.centerpiece.r, kit), A.centerpieceSpriteR(L.centerpiece.r)),
    spinner: sprite(A.spinner(L.spinner.len, L.spinner.h, kit), L.spinner.len / 2 + 1, L.spinner.h / 2 + 3),
    drop: sprite(A.drop(L.drops.w, L.drops.h, kit), L.drops.w / 2 + 2, L.drops.h / 2 + 5),
    flipper: flipperSprite(L.flippers.left.len, L.flippers.left.pivotR, L.flippers.left.tipR),
    miniFlipper: L.flippers.mini ? flipperSprite(L.flippers.mini.len, L.flippers.mini.pivotR, L.flippers.mini.tipR) : null,
    standup: { off: sprite(standup(false), 5.5, 10.5), on: sprite(standup(true), 5.5, 10.5) },
    slingLeft: { off: slingSprite(L.slings.left, false), on: slingSprite(L.slings.left, true) },
    slingRight: { off: slingSprite(L.slings.right, false), on: slingSprite(L.slings.right, true) },
  };

  return { playfieldSVG, SPRITES, INSERTS, arrowPath, star };
})();
