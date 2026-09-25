// A bank of targets that must be cleared in sequence-ish (any order is fine
// for v1; real machines vary). Each hit "drops" that target — it stops
// colliding and fades out — until the whole bank is cleared, which pays a
// bonus and resets the bank after a short pause.
const DEFAULT_MASK = 0xffffffff;

class DropTargetBank {
  constructor(world, {
    x,
    y,
    count = 3,
    spacing = 42,
    width = 28,
    height = 14,
    points = 50,
    bonusPoints = 200,
    resetDelayMs = 1200,
    texture,
    spriteScale = 0.25,
    onScore,
    onCleared,
  }) {
    this.points = points;
    this.bonusPoints = bonusPoints;
    this.resetDelayMs = resetDelayMs;
    this.onScore = onScore;
    this.onCleared = onCleared;
    this.targets = [];
    this.enabled = true; // false while the drop targets are still dormant: the ball passes through

    const startX = x - ((count - 1) * spacing) / 2;
    for (let i = 0; i < count; i++) {
      const body = Matter.Bodies.rectangle(startX + i * spacing, y, width, height, {
        isStatic: true,
        label: 'dropTarget',
        render: {
          sprite: { texture, xScale: spriteScale, yScale: spriteScale },
        },
      });
      this.targets.push({ body, dropped: false });
    }

    Matter.World.add(world, this.targets.map((t) => t.body));
  }

  hit(body) {
    const target = this.targets.find((t) => t.body === body);
    if (!target || target.dropped) return;

    target.dropped = true;
    target.body.collisionFilter.mask = 0;
    target.body.render.opacity = 0.15;
    this.onScore?.(this.points, 'drop target');

    if (this.targets.every((t) => t.dropped)) {
      this.onScore?.(this.bonusPoints, 'bank cleared');
      this.onCleared?.();
      setTimeout(() => this.reset(), this.resetDelayMs);
    }
  }

  reset() {
    for (const t of this.targets) {
      t.dropped = false;
      t.body.render.opacity = 1;
    }
    this.setEnabled(this.enabled);
  }

  // Dormant targets are ghosts: no collisions at all until woken up.
  setEnabled(on) {
    this.enabled = on;
    for (const t of this.targets) t.body.collisionFilter.mask = on && !t.dropped ? DEFAULT_MASK : 0;
  }
}
