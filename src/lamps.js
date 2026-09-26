// Lamp inserts and the plunger, drawn every frame on a canvas that sits
// between the printed playfield (unlit inserts) and the Matter canvas
// (balls and targets), so a lit insert glows on the paper but never covers a
// ball. Also letters the drop targets on top of the Matter canvas, since
// sprites can't use the web fonts.
class Lamps {
  constructor(canvas) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = LAYOUT.width * dpr;
    canvas.height = LAYOUT.height * dpr;
    this.ctx = canvas.getContext('2d');
    this.ctx.scale(dpr, dpr);
  }

  // state: see `lamps` in main.js.
  draw(state, now) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, LAYOUT.width, LAYOUT.height);
    const blink = (hz = 3) => Math.floor((now / 1000) * hz * 2) % 2 === 0;
    const isOn = (v) => v === 'on' || (v === 'blink' && blink());
    const { paper, ink, red, teal, mustard } = INK;
    const I = Art.INSERTS;

    // The UFO's tractor beam pulses when the scoop is lit for multiball.
    if (state.beam) {
      const { x, y } = LAYOUT.centerpiece;
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.2 * Math.sin(now / 120);
      ctx.fillStyle = teal;
      ctx.beginPath();
      ctx.moveTo(x - 15, y + 15);
      ctx.lineTo(x + 15, y + 15);
      ctx.lineTo(x + 32, y + 62);
      ctx.lineTo(x - 32, y + 62);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Mission targets pulse with a dashed halo.
    for (const key of state.halos || []) {
      for (const [x, y, r] of Lamps.HALO_SPOTS[key] || []) this.halo(x, y, r, now);
    }

    // shot arrows
    for (const a of I.arrows) {
      if (!isOn(state.arrows[a.key])) continue;
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(deg(a.rot));
      this.glow(a.color);
      this.path(Art.arrowPath(a.s), a.color, ink, 2);
      ctx.restore();
    }

    // R·O·W letters
    for (let i = 0; i < 3; i++) {
      if (!state.row[i]) continue;
      const x = LAYOUT.rolloverLanes.xs[i];
      this.circle(x, I.rowLetters.y, I.rowLetters.r, red, ink, 1.8);
      this.text(LAYOUT.rolloverLanes.letters[i], x, I.rowLetters.y + 4, 11, paper);
    }

    for (const m of I.multipliers) {
      if (state.multiplier < m.n) continue;
      this.circle(m.x, m.y, m.r, mustard, ink, 1.8);
      this.text(`${m.n}×`, m.x, m.y + 3.5, 9, ink);
    }

    I.chapters.forEach((c, i) => {
      const on = i < state.chapters || (i === state.chapters && state.chapters < 5 && state.nextChapterBlink && blink(2));
      if (!on) return;
      this.roundRect(c.x - 10, c.y - 8, 20, 16, 3, teal, ink, 1.6);
      this.text(c.t, c.x, c.y + 4, 9, paper);
    });

    if (isOn(state.extraBall)) this.pill(I.extraBall, mustard, ink);
    if (isOn(state.shootAgain)) this.pill(I.shootAgain, red, paper);

    const ro = LAYOUT.rollovers;
    for (const key of ['inL', 'inR']) {
      if (!(state.rolloverFlash[key] > now)) continue;
      ctx.save();
      ctx.translate(ro[key], ro.y);
      this.circle(0, 0, 7, mustard, ink, 1.6);
      this.path(Art.star(0, 0.5, 5, 2, 5), red, ink, 0.8);
      ctx.restore();
    }

    this.plunger(state.plungerPull);
  }

  halo(x, y, r, now) {
    const ctx = this.ctx;
    const pulse = 0.5 + 0.5 * Math.sin(now / 140);
    ctx.save();
    ctx.globalAlpha = 0.45 + 0.45 * pulse;
    ctx.strokeStyle = INK.red;
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 4]);
    ctx.lineDashOffset = -now / 40;
    ctx.beginPath();
    ctx.arc(x, y, r + pulse * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  plunger(pull) {
    const ctx = this.ctx;
    const { x, stopY, pullTravel } = LAYOUT.shooter;
    const top = stopY + pull * pullTravel;
    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = INK.ink;
    ctx.fillStyle = '#8a8378';
    ctx.fillRect(x - 4, top + 8, 8, 700 - top);
    ctx.strokeRect(x - 4, top + 8, 8, 700 - top);
    // spring, squashed as the plunger is pulled
    const coils = 7;
    const springTop = top + 12;
    const step = (700 - springTop) / coils;
    ctx.beginPath();
    ctx.moveTo(x - 8, springTop);
    for (let i = 0; i < coils; i++) {
      ctx.lineTo(x + 8, springTop + step * (i + 0.5));
      ctx.lineTo(x - 8, springTop + step * (i + 1));
    }
    ctx.stroke();
    ctx.lineWidth = 2;
    this.roundRect(x - 9, top, 18, 8, 2, INK.red, INK.ink, 2);
    ctx.restore();
  }

  // Numbers on the standing drop targets, drawn over the Matter canvas.
  static letterDropTargets(ctx, bank) {
    ctx.save();
    ctx.font = `${LAYOUT.drops.h * 0.85}px Rye, Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = INK.paper;
    bank.targets.forEach((t, i) => {
      if (t.dropped) return;
      ctx.fillText(String(i + 1), t.body.position.x, t.body.position.y + LAYOUT.drops.h * 0.3);
    });
    ctx.restore();
  }

  // --- drawing helpers ---

  glow(color) {
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 8;
  }

  circle(x, y, r, fill, stroke, lw) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }

  roundRect(x, y, w, h, r, fill, stroke, lw) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }

  pill({ x, y, w, h, label }, fill, textColor) {
    this.roundRect(x, y, w, h, h / 2, fill, INK.ink, 1.6);
    const ctx = this.ctx;
    ctx.font = "7.5px 'Special Elite', 'Courier New', monospace";
    ctx.textAlign = 'center';
    ctx.fillStyle = textColor;
    ctx.fillText(label, x + w / 2, y + h / 2 + 3);
  }

  path(d, fill, stroke, lw) {
    const ctx = this.ctx;
    const p = new Path2D(d);
    ctx.fillStyle = fill;
    ctx.fill(p);
    ctx.shadowBlur = 0;
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke;
    ctx.stroke(p);
  }

  text(t, x, y, size, color) {
    const ctx = this.ctx;
    ctx.font = `${size}px Rye, Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.fillText(t, x, y);
  }
}

// Where each mission halo is drawn: [x, y, radius].
Lamps.HALO_SPOTS = (() => {
  const L = LAYOUT;
  const d = L.drops;
  return {
    ramps: [[...L.ramps.left[0], 18], [...L.ramps.right[0], 18]],
    pops: L.pops.map(([x, y]) => [x, y, 36]),
    drops: [[d.x, d.y, (d.count * d.spacing) / 2 + 12]],
    orbit: [[L.spinner.x, L.spinner.y + 14, 16]],
    spinner: [[L.spinner.x, L.spinner.y, 16]],
    lanes: L.rolloverLanes.xs.map((x) => [x, 95, 13]),
    centerpiece: [[L.centerpiece.x, L.centerpiece.y, L.centerpiece.r + 14]],
    scoop: [[L.scoop.x, L.scoop.y, 18]],
    kickout: [[L.kickout.x, L.kickout.y, 19]],
  };
})();
