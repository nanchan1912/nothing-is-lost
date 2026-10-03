'use strict';
// Draws the Glassmoon (the Bloch sphere) on a 2D canvas with a simple orthographic camera.
const GATE_COLOR = { X: '#ff8a7a', Y: '#f7a6e0', Z: '#7fb2ff', H: '#ffcf5a', S: '#6ef0c0', Sdg: '#3fc9a0', T: '#b6f27a', Tdg: '#8fcf55', EYE: '#c9a2ff', NOISE: '#9aa6a8', QEC: '#7dffb0' };

class SphereView {
  constructor() {
    this.az = 0.45; this.el = 0.32;
    this.cx = 0; this.cy = 0; this.R = 100;
    this.basis();
  }
  setLayout(cx, cy, R) { this.cx = cx; this.cy = cy; this.R = R; }
  orbit(daz, del) {
    this.az += daz;
    this.el = Math.max(-1.2, Math.min(1.2, this.el + del));
    this.basis();
  }
  basis() {
    const ca = Math.cos(this.az), sa = Math.sin(this.az), ce = Math.cos(this.el), se = Math.sin(this.el);
    this.d = [ce * ca, ce * sa, se];      // toward the viewer
    this.r = [-sa, ca, 0];                // screen right
    this.u = [-se * ca, -se * sa, ce];    // screen up
  }
  proj(v) {
    return { x: this.cx + this.R * Q.dot(v, this.r), y: this.cy - this.R * Q.dot(v, this.u), z: Q.dot(v, this.d) };
  }

  // Polyline in 3D: segments behind the sphere are drawn faint.
  path3(ctx, pts, color, width, aFront = 1, aBack = 0.22, dash = null) {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
    if (dash) ctx.setLineDash(dash);
    const P = pts.map(p => this.proj(p));
    for (let i = 1; i < P.length; i++) {
      const z = (P[i].z + P[i - 1].z) / 2;
      ctx.globalAlpha = z >= -0.02 ? aFront : aBack;
      ctx.beginPath(); ctx.moveTo(P[i - 1].x, P[i - 1].y); ctx.lineTo(P[i].x, P[i].y); ctx.stroke();
    }
    ctx.restore();
  }
  // Points R_axis(t) p for t in [t0, t1]: the track a lever moves the light along.
  arcPoints(p, axis, t0, t1, n = 64) {
    const pts = [];
    for (let i = 0; i <= n; i++) pts.push(Q.rotate(p, axis, t0 + (t1 - t0) * i / n));
    return pts;
  }

  drawGlobe(ctx, opts = {}) {
    const { cx, cy, R } = this;
    const g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
    g.addColorStop(0, 'rgba(170,255,225,0.16)');
    g.addColorStop(1, 'rgba(40,110,100,0.10)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(190,255,230,0.38)'; ctx.lineWidth = 1.5; ctx.stroke();
    // equator ("the Rim") and two meridians
    const ring = (axis, start) => this.arcPoints(start, axis, 0, Math.PI * 2, 96);
    this.path3(ctx, ring([0, 0, 1], [1, 0, 0]), 'rgba(205,245,230,0.9)', 1.2, 0.45, 0.15);
    this.path3(ctx, ring([0, 1, 0], [1, 0, 0]), 'rgba(205,245,230,0.9)', 1, 0.16, 0.06);
    this.path3(ctx, ring([1, 0, 0], [0, 1, 0]), 'rgba(205,245,230,0.9)', 1, 0.16, 0.06);
    // the up-down axis
    this.path3(ctx, [[0, 0, -1], [0, 0, 1]], 'rgba(205,245,230,0.5)', 1, 0.35, 0.35, [3, 5]);
  }

  drawAxis(ctx, gid, alpha = 0.6) {
    const n = Q.GATES[gid].axis, c = GATE_COLOR[gid];
    this.path3(ctx, [Q.scale(n, -1.3), Q.scale(n, 1.3)], c, 1.5, alpha, alpha * 0.5, [6, 6]);
    const e = this.proj(Q.scale(n, 1.38));
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = c; ctx.font = '600 13px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(Q.GATES[gid].glyph, e.x, e.y); ctx.restore();
  }

  drawLabels(ctx, keys) {
    ctx.save(); ctx.font = '500 15px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const k of keys) {
      const p = this.proj(Q.scale(Q.POINTS[k], 1.17));
      ctx.globalAlpha = p.z >= -0.05 ? 0.95 : 0.35;
      ctx.fillStyle = '#e4f5ec';
      ctx.fillText(Q.LABEL[k], p.x, p.y);
    }
    ctx.restore();
  }

  drawBeam(ctx, v, opts = {}) {
    const tip = this.proj(v), c = { x: this.cx, y: this.cy };
    const back = tip.z < 0;
    ctx.save();
    ctx.globalAlpha = back ? 0.55 : 1;
    ctx.strokeStyle = opts.color || '#ffe2a8';
    ctx.lineWidth = opts.width || 4; ctx.lineCap = 'round';
    ctx.shadowColor = opts.glow || '#ffcf7a'; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
    ctx.fillStyle = '#fffbe6';
    ctx.beginPath(); ctx.arc(tip.x, tip.y, opts.tipR || 8, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffe8a3'; ctx.beginPath(); ctx.arc(c.x, c.y, 5, 0, Math.PI * 2); ctx.fill();
    if (opts.grabbable) {
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(performance.now() / 300);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(tip.x, tip.y, 16, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    return tip;
  }

  drawWisp(ctx, v, time, opts = {}) {
    const p = this.proj(v);
    const pulse = 1 + 0.18 * Math.sin(time * 4 + (opts.phase || 0));
    ctx.save();
    ctx.globalAlpha = (p.z >= -0.05 ? 1 : 0.45) * (opts.alpha ?? 1);
    const col = opts.color || '#a9f5ff';
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 22 * pulse);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(169,245,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 22 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2); ctx.fill();
    if (opts.name) {
      ctx.fillStyle = col; ctx.font = '14px "Shantell Sans", cursive'; ctx.textAlign = 'center';
      ctx.fillText(opts.name, p.x, p.y - 26);
    }
    ctx.restore();
  }

  // The trail: every turn in history as an arc; a look is drawn as a torn zig-zag.
  drawTrail(ctx, history) {
    const n = history.length;
    history.forEach((h, i) => {
      if (h.hidden) return;
      const recent = (i + 1) / n;
      if (h.kind === 'gate') {
        const pts = this.arcPoints(h.from, Q.GATES[h.g].axis, 0, h.angle, 48);
        this.path3(ctx, pts, GATE_COLOR[h.g], i === n - 1 ? 3.5 : 2.2, 0.25 + 0.6 * recent, 0.12 + 0.2 * recent);
      } else if (h.kind === 'tear') {
        const a = this.proj(h.from), b = this.proj(h.to);
        ctx.save(); ctx.strokeStyle = GATE_COLOR.EYE; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.moveTo(a.x, a.y);
        for (let k = 1; k <= 8; k++) {
          const t = k / 8, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t, o = k % 2 ? 7 : -7;
          ctx.lineTo(x + o, y + (k === 8 ? 0 : o * 0.3));
        }
        ctx.stroke(); ctx.restore();
      }
    });
  }

  // A spinning ring around an axis: shows "the lever turned" even when the light didn't move.
  drawSpinRing(ctx, gid, t, alpha) {
    const n = Q.GATES[gid].axis;
    const a = Q.norm(Q.cross(n, Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]));
    const start = Q.vadd(Q.scale(n, 0.55), Q.scale(a, 0.45));
    const pts = this.arcPoints(start, n, t, t + Math.PI * 1.6, 40);
    this.path3(ctx, pts, GATE_COLOR[gid], 3, alpha, alpha * 0.5);
  }
}
