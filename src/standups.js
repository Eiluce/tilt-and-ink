// Standup targets: fixed targets that light up when hit and stay lit until
// the whole set is complete, which fires onComplete and resets them.
class StandupBank {
  constructor(world, { positions, width = 7, height = 18, textures, onComplete }) {
    this.textures = textures;
    this.onComplete = onComplete;

    this.targets = positions.map(([x, y]) => {
      const body = Matter.Bodies.rectangle(x, y, width, height, {
        isStatic: true,
        restitution: 0.8,
        label: 'standup',
        render: { sprite: { texture: textures.off, xScale: 0.25, yScale: 0.25 } },
      });
      return { body, lit: false };
    });
    Matter.World.add(world, this.targets.map((t) => t.body));
  }

  hit(body) {
    const target = this.targets.find((t) => t.body === body);
    if (!target || target.lit) return;
    target.lit = true;
    target.body.render.sprite.texture = this.textures.on;
    if (this.targets.every((t) => t.lit)) {
      this.onComplete?.();
      setTimeout(() => this.reset(), 600);
    }
  }

  reset() {
    for (const t of this.targets) {
      t.lit = false;
      t.body.render.sprite.texture = this.textures.off;
    }
  }
}
