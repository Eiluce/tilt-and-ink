// Comic-strip and serial-film effects, drawn on a canvas above the Matter
// canvas: "BOP!" hit bursts, rings, sparks, floating scores, intertitle
// cards for big moments, and screen shake. Speed lines behind a fast ball
// are drawn under the ball, on the lamp canvas (see speedLines()).
class Effects {
  constructor(canvas, shakeTarget) {
    canvas.width = LAYOUT.width * RENDER_SCALE;
    canvas.height = LAYOUT.height * RENDER_SCALE;
    this.ctx = canvas.getContext('2d');
    this.ctx.scale(RENDER_SCALE, RENDER_SCALE);
    this.shakeTarget = shakeTarget;
    this.items = [];
    this.card = null;
    this.shakeUntil = 0;
    this.shakeMag = 0;
    this.calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // --- spawning ---

  burst(x, y, word, fill = INK.mustard) {
    this.add({ kind: 'burst', x, y, word, fill, dur: 480, rot: (Math.random() - 0.5) * 0.5 });
  }

  ring(x, y, color = INK.red, r0 = 12, r1 = 36) {
    this.add({ kind: 'ring', x, y, color, r0, r1, dur: 320 });
  }

  sparks(x, y, color = INK.print) {
    const angles = Array.from({ length: 7 }, () => Math.random() * Math.PI * 2);
    this.add({ kind: 'sparks', x, y, color, angles, dur: 260 });
  }

  popup(x, y, text) {
    this.add({ kind: 'popup', x, y, text, dur: 850 });
  }

  // A silent-film intertitle across the table. Only one at a time.
  title(text, sub = '', dur = 1300) {
    this.card = { text, sub, t0: performance.now(), dur };
  }

  shake(ms = 250, mag = 4) {
    if (this.calm) return;
    this.shakeUntil = performance.now() + ms;
    this.shakeMag = mag;
  }

  add(item) {
    item.t0 = performance.now();
    this.items.push(item);
    if (this.items.length > 40) this.items.shift();
  }

  // --- drawing ---

  draw(now) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, LAYOUT.width, LAYOUT.height);
    this.items = this.items.filter((it) => {
      const p = (now - it.t0) / it.dur;
      if (p >= 1) return false;
      this[`draw_${it.kind}`](ctx, it, p);
      return true;
    });
    if (this.card) {
      const p = (now - this.card.t0) / this.card.dur;
      if (p >= 1) this.card = null;
      else this.drawCard(ctx, this.card, p);
    }
    this.applyShake(now);
  }

  draw_burst(ctx, { x, y, word, fill, rot }, p) {
    // pop in with a little overshoot, hold, then fade
    const scale = p < 0.15 ? 0.4 + (p / 0.15) * 0.75 : p < 0.25 ? 1.15 - ((p - 0.15) / 0.1) * 0.15 : 1;
    ctx.save();
    ctx.globalAlpha = p > 0.6 ? 1 - (p - 0.6) / 0.4 : 1;
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(scale, scale);
    ctx.beginPath();
    const n = 11;
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 ? 13 : 21 + ((i * 7) % 5);
      const a = (i / (n * 2)) * Math.PI * 2;
      ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r * 1.3, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = INK.ink;
    ctx.stroke();
    ctx.font = '11px Rye, Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK.ink;
    ctx.strokeText(word, 0, 1);
    ctx.fillStyle = INK.paper;
    ctx.fillText(word, 0, 1);
    ctx.restore();
  }

  draw_ring(ctx, { x, y, color, r0, r1 }, p) {
    ctx.save();
    ctx.globalAlpha = 1 - p;
    ctx.lineWidth = 3 * (1 - p) + 1;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r0 + (r1 - r0) * p, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  draw_sparks(ctx, { x, y, color, angles }, p) {
    ctx.save();
    ctx.globalAlpha = 1 - p;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const a of angles) {
      const r0 = 6 + p * 10;
      const r1 = r0 + 6;
      ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
      ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
    }
    ctx.stroke();
    ctx.restore();
  }

  draw_popup(ctx, { x, y, text }, p) {
    ctx.save();
    ctx.globalAlpha = p > 0.5 ? 1 - (p - 0.5) / 0.5 : 1;
    ctx.font = '12px Rye, Georgia, serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK.paper;
    const yy = y - 14 - p * 26;
    ctx.strokeText(text, x, yy);
    ctx.fillStyle = INK.red;
    ctx.fillText(text, x, yy);
    ctx.restore();
  }

  drawCard(ctx, { text, sub }, p) {
    const fade = p < 0.1 ? p / 0.1 : p > 0.85 ? (1 - p) / 0.15 : 1;
    const w = 280;
    const h = sub ? 74 : 56;
    const x = (LAYOUT.width - w) / 2;
    const y = 250 - h / 2;
    ctx.save();
    ctx.globalAlpha = fade * 0.82;
    ctx.fillStyle = INK.ink;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = fade;
    ctx.strokeStyle = INK.paper;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 9, y + 9, w - 18, h - 18);
    ctx.textAlign = 'center';
    ctx.fillStyle = INK.paper;
    ctx.font = '22px Rye, Georgia, serif';
    ctx.fillText(text, LAYOUT.width / 2, y + (sub ? 36 : 36));
    if (sub) {
      ctx.fillStyle = INK.mustard;
      ctx.font = "10px 'Special Elite', 'Courier New', monospace";
      ctx.fillText(sub, LAYOUT.width / 2, y + 56);
    }
    ctx.restore();
  }

  applyShake(now) {
    const left = this.shakeUntil - now;
    if (left <= 0) {
      if (this.shaking) {
        this.shakeTarget.style.transform = '';
        this.shaking = false;
      }
      return;
    }
    this.shaking = true;
    const m = this.shakeMag * Math.min(1, left / 150);
    const dx = (Math.random() - 0.5) * 2 * m;
    const dy = (Math.random() - 0.5) * 2 * m;
    this.shakeTarget.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
  }

  // Comic speed lines trailing a fast ball, drawn under the balls.
  static speedLines(ctx, balls) {
    ctx.save();
    ctx.strokeStyle = INK.print;
    ctx.lineCap = 'round';
    for (const ball of balls) {
      if (ball.plugin.mode === 'held') continue;
      const { x: vx, y: vy } = ball.velocity;
      const speed = Math.hypot(vx, vy);
      if (speed < 6) continue;
      const ux = vx / speed;
      const uy = vy / speed;
      const len = Math.min(34, (speed - 4) * 3);
      ctx.globalAlpha = Math.min(0.45, (speed - 6) / 12 + 0.15);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (const off of [-5, 0, 5]) {
        const sx = ball.position.x - ux * (LAYOUT.ballR + 2) - uy * off;
        const sy = ball.position.y - uy * (LAYOUT.ballR + 2) + ux * off;
        const l = off === 0 ? len : len * 0.65;
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - ux * l, sy - uy * l);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}
