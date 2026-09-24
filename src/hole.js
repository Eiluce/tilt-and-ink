// A scoop or saucer: catches a ball, holds it for a beat, then kicks it back
// out. While held the ball is in "held" mode (collides with nothing) and is
// pinned in place every tick.
class Hole {
  constructor(world, { name, x, y, radius = 7, holdMs = 900, eject, onCapture }) {
    this.name = name;
    this.x = x;
    this.y = y;
    this.holdMs = holdMs;
    this.eject = eject; // () => { x, y } launch velocity
    this.onCapture = onCapture;
    this.held = [];

    this.sensor = makeSensor(x, y, radius, `hole-${name}`);
    Matter.World.add(world, this.sensor);
  }

  capture(ball) {
    if (ball.plugin.mode !== 'playfield') return;
    if (performance.now() < (ball.plugin.ignoreHolesUntil || 0)) return;
    this.hold(ball, this.holdMs);
    this.onCapture?.(ball, this);
  }

  // Also used to feed new balls out of the hole (multiball).
  hold(ball, ms) {
    setBallMode(ball, 'held');
    this.held.push({ ball, releaseAt: performance.now() + ms });
  }

  isHolding(ball) {
    return this.held.some((h) => h.ball === ball);
  }

  // Called once per engine tick.
  update() {
    const now = performance.now();
    this.held = this.held.filter(({ ball, releaseAt }) => {
      if (now < releaseAt) {
        Matter.Body.setPosition(ball, { x: this.x, y: this.y });
        Matter.Body.setVelocity(ball, { x: 0, y: 0 });
        return true;
      }
      setBallMode(ball, 'playfield');
      ball.plugin.ignoreHolesUntil = now + 700;
      Matter.Body.setVelocity(ball, this.eject());
      return false;
    });
  }
}
