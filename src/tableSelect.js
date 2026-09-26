// Which table this page plays: the one picked on the Tables tab (saved in
// localStorage), if it's built. main.js falls back to Rocket Row when the
// saved pick isn't reached (e.g. after a progress reset). Switching tables
// reloads the page, so everything below is fixed for the page's life.
const TABLE_PICK_KEY = 'tilt-and-ink.table';

const TABLE = (() => {
  let n = 1;
  try {
    n = Number(localStorage.getItem(TABLE_PICK_KEY)) || 1;
  } catch (e) {
    // No storage: Rocket Row.
  }
  return TABLE_DEFS[n] || TABLE_DEFS[1];
})();

// The shared cabinet plus this table's playfield.
const LAYOUT = {
  ...FRAME,
  ...TABLE.layout,
  flippers: { ...FRAME.flippers, ...(TABLE.layout.flippers || {}) },
  rolloverLanes: { ...FRAME.rolloverLanes, letters: TABLE.layout.laneLetters },
};

function pickTable(n) {
  try {
    localStorage.setItem(TABLE_PICK_KEY, String(n));
  } catch (e) {
    // The pick just won't stick.
  }
}
