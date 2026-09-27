// Table geometry. Units are canvas px on the 400 x 700 table; angles in
// degrees. Both the physics (main.js) and the art (art.js) read LAYOUT, so a
// wall or target can't be moved in one without the other.
//
// FRAME is the cabinet every table shares: outer wall and arch, shooter
// lane, the left orbit (with its spinner and standups), side slopes,
// inlanes, slingshots, the two main flippers and the top lanes. Each table
// (src/tableDefs/) adds its own playfield inside it: pop bumpers, the
// centrepiece and its scoop, kickout, drop targets, ramps, an optional mini
// flipper, lamp inserts. tableSelect.js merges the two into LAYOUT.
//
// The lower playfield is mirrored around x = 200 (the flippers' centre line).
// The shooter lane eats ~30px on the right, so the lower-left gets a matching
// angled wall to keep the two sides symmetrical.

const deg = (d) => (d * Math.PI) / 180;

const mirrorX = (points) => points.map(([x, y]) => [400 - x, y]);

// Table definitions register here by table number (src/tableDefs/).
const TABLE_DEFS = {};

const FRAME = {
  width: 400,
  height: 700,
  ballR: 9.5,

  // Outer wall and both top-arch guides share one centre.
  arch: { cx: 200, cy: 215 },
  outerR: 192, // outer wall centreline; its inner edge is at r 188 / x 12 / x 388
  guideR: 162, // left orbit guide and shooter-lane wall centreline

  // The left orbit guide has its own radius: a lane 34 px wide (x 12 to 46)
  // with its mouth at y 360, so a cross shot from the right flipper can get
  // in (the old 22 px lane ending at y 400 took 0 of 1,755 test flips; this
  // takes about 4%, near the ramps' 6%). x = arch.cx - r.
  orbitGuide: { r: 150, x: 50, bottom: 360, endDeg: -125 },
  shooterWall: { x: 362, endDeg: -55 },
  // One-way gate across the top of the shooter lane: a launched ball passes
  // through it, a ball coming round the arch the other way bounces off it.
  gate: [[288.3, 49], [293, 82]],
  shooterExitDeg: -67, // past this angle round the arch (clear of the gate), a launched ball is in play

  // No outlanes: the side walls slope down onto the top of each inlane
  // guide, so a ball coming down either side always reaches a flipper.
  // (Outlanes are a difficulty lever to bring back on later tables.)
  sideSlopes: {
    left: [[8, 420], [66, 452]],
    right: [[362, 420], [334, 452]],
  },
  // Each inlane guide's last leg lines up with the resting flipper's top
  // face and runs just past the peak of its rounded pivot end, so a ball
  // rolls straight off the guide and down the flipper. Stopping short of
  // that peak leaves a pocket where the ball can sit on the pivot.
  inlaneGuides: {
    left: [[66, 452], [66, 560], [110, 589.4], [136, 604.4]],
    right: [[334, 452], [334, 560], [290, 589.4], [264, 604.4]],
  },

  laneGuides: { xs: [146, 182, 218, 254], top: 64, bottom: 106, width: 7 },
  rolloverLanes: { xs: [164, 200, 236], y: 82 }, // letters come from the table

  spinner: { x: 29, y: 345, len: 20, h: 6 },
  orbitSensor: { x: 29, y: 290 },
  standups: { xs: [59, 353], ys: [280, 304, 328], w: 7, h: 18 },
  // Sized to leave a ball-wide inlane between each sling and its guide.
  slings: {
    left: [[92, 470], [92, 540], [114, 558]],
    right: mirrorX([[92, 470], [92, 540], [114, 558]]),
  },
  rollovers: { y: 520, inL: 79, inR: 321 },

  flippers: {
    // pivotR / tipR: radii of the round pivot end and tip (art and physics).
    left: { x: 130, y: 612, rest: 30, active: -30, len: 64, pivotR: 9, tipR: 5 },
    right: { x: 270, y: 612, rest: 150, active: 210, len: 64, pivotR: 9, tipR: 5 },
  },

  shooter: { x: 376.5, stopY: 650, pullTravel: 14 },

  rampHalfWidth: 13,

  drainY: 668,
  // The table is shown down to here (style.css crops the rest): the drain
  // gutter under the playfield, with the plunger's head still in view.
  viewHeight: 672,
};

// Canvas pixels per table unit: the screen's pixel ratio times how far
// style.css scales the table up to fill the window height. Fixed at load.
const RENDER_SCALE = typeof window === 'undefined'
  ? 1
  : (window.devicePixelRatio || 1) * Math.max(1, (window.innerHeight - 32) / FRAME.viewHeight);
