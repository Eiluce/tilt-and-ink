// Pickups: star tokens that appear at fixed open spots on the playfield for a
// few seconds and pay out when a ball rolls through them (the ball passes
// straight through; they're drawn on the lamp layer, not physics bodies).
// Unlocked by the Prop Department node; the tree adds spawn rate, golden
// stars worth 10×, and a wider pull radius.
const PICKUP_SPOTS = LAYOUT.pickupSpots; // open spots, per table
const PICKUP_LIFE_MS = 6000;
const PICKUP_R = 8;

class Pickups {
  constructor({ onCollect }) {
    this.onCollect = onCollect;
    this.tokens = [];
    this.nextAt = 0;
  }

  clear() {
    this.tokens = [];
    this.nextAt = 0;
  }

  // Places one token now at a free spot (a table's rules can shower them).
  spawn(now, golden = 0) {
    const free = PICKUP_SPOTS.filter(([x, y]) => !this.tokens.some((t) => t.x === x && t.y === y));
    if (!free.length) return;
    const [x, y] = free[Math.floor(Math.random() * free.length)];
    this.tokens.push({ x, y, born: now, golden: Math.random() < golden });
  }

  // stats: { everyMs, golden (chance), magnet (extra px) }. Only balls on
  // the playfield collect, so one riding a ramp overhead doesn't.
  update(now, balls, { everyMs, golden, magnet }) {
    if (!this.nextAt) this.nextAt = now + everyMs * 0.5;
    if (now >= this.nextAt) {
      this.nextAt = now + everyMs;
      const free = PICKUP_SPOTS.filter(([x, y]) => !this.tokens.some((t) => t.x === x && t.y === y));
      if (free.length) {
        const [x, y] = free[Math.floor(Math.random() * free.length)];
        this.tokens.push({ x, y, born: now, golden: Math.random() < golden });
      }
    }
    const reach = PICKUP_R + LAYOUT.ballR + magnet;
    this.tokens = this.tokens.filter((t) => {
      if (now - t.born > PICKUP_LIFE_MS) return false;
      const hit = balls.some((b) => b.plugin.mode === 'playfield'
        && Math.hypot(b.position.x - t.x, b.position.y - t.y) < reach);
      if (hit) this.onCollect(t);
      return !hit;
    });
  }

  // A printed star that pops in, bobs, and blinks in its last 1.5 s.
  draw(ctx, now) {
    for (const t of this.tokens) {
      const age = now - t.born;
      const left = PICKUP_LIFE_MS - age;
      if (left < 1500 && Math.floor(now / 120) % 2) continue;
      const s = Math.min(1, age / 180) * (1 + 0.08 * Math.sin(now / 150));
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.scale(s, s);
      ctx.rotate(Math.sin(now / 400) * 0.15);
      if (t.golden) {
        ctx.shadowColor = INK.mustard;
        ctx.shadowBlur = 12;
      }
      const star = new Path2D(Art.star(0, 0, PICKUP_R + 3, PICKUP_R * 0.45, 5));
      ctx.fillStyle = t.golden ? INK.mustard : INK.paper;
      ctx.fill(star);
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1.8;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = INK.ink;
      ctx.stroke(star);
      ctx.restore();
    }
  }
}
