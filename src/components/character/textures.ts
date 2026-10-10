// Canvas-painted textures for the character (no image files to download): the skin with its blush and soft
// shading, the iris, and the ornate armour (the chest plate's blue chevron and engravings, the pauldrons' blue
// rims and scrolls), after his reference picture of a young ice knight.

import * as THREE from 'three';
import { TAU, uvOfDirection } from './geometry';

const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

const finish = (c: HTMLCanvasElement, aniso = 8) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  return t;
};

/** Directions (from the head centre) of the face features; shared by the texture and the model. */
export const FACE = {
  eye: (side: number) => new THREE.Vector3(side * 0.39, -0.12, 0.93),
  cheek: (side: number) => new THREE.Vector3(side * 0.55, -0.36, 0.76),
  nose: new THREE.Vector3(0, -0.27, 1),
  mouth: new THREE.Vector3(0, -0.55, 0.84),
};

/**
 * The face map, painted on the head's equirectangular UVs: fair base colour, a soft light on the forehead,
 * rosy cheeks, a pink nose tip, and gentle shade around the eye sockets and under the jaw.
 */
export function skinTexture(base: string) {
  const W = 1024;
  const H = 512;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, W, H);

  // tone from top to bottom: a little cooler under the hair, warmer across the face, soft shade under the jaw
  const lg = g.createLinearGradient(0, 0, 0, H);
  lg.addColorStop(0, 'rgba(120, 80, 90, 0.16)');
  lg.addColorStop(0.3, 'rgba(255, 240, 230, 0.06)');
  lg.addColorStop(0.6, 'rgba(255, 228, 214, 0.06)');
  lg.addColorStop(0.86, 'rgba(150, 80, 80, 0.12)');
  lg.addColorStop(1, 'rgba(120, 60, 60, 0.22)');
  g.fillStyle = lg;
  g.fillRect(0, 0, W, H);

  const spot = (dir: THREE.Vector3, rx: number, ry: number, color: string, alpha: number) => {
    const [u, v] = uvOfDirection(dir);
    for (const du of [0, -1, 1]) {
      // draw the seam copies too so a spot near u = 0 or 1 wraps round
      g.save();
      g.translate((u + du) * W, v * H);
      g.scale(rx, ry);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
      gr.addColorStop(0, rgba(color, alpha));
      gr.addColorStop(0.55, rgba(color, alpha * 0.45));
      gr.addColorStop(1, rgba(color, 0));
      g.fillStyle = gr;
      g.beginPath();
      g.arc(0, 0, 1, 0, TAU);
      g.fill();
      g.restore();
    }
  };

  spot(new THREE.Vector3(0, 0.3, 0.95), 130, 56, '#fff6ee', 0.12); // forehead light
  for (const side of [-1, 1]) {
    spot(FACE.cheek(side), 64, 42, '#ff6f6f', 0.42); // rosy cheeks
    spot(FACE.eye(side), 62, 50, '#b8706a', 0.08); // eye socket
    spot(new THREE.Vector3(side * 0.9, -0.2, 0.2), 70, 70, '#c07a72', 0.12); // temple / ear side
  }
  spot(FACE.nose, 22, 16, '#ff7f78', 0.34); // pink nose tip
  spot(new THREE.Vector3(0, -0.8, 0.55), 110, 40, '#9a5a55', 0.12); // under the chin
  return finish(c);
}

/** A bright teal-blue iris with a deep blue rim, fine fibres, a dark pupil, light through the bottom and a sparkle. */
export function irisTexture() {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const cx = S / 2;
  const R = S / 2 - 2;

  g.save();
  g.beginPath();
  g.arc(cx, cx, R, 0, TAU);
  g.clip();

  const base = g.createRadialGradient(cx, cx, R * 0.1, cx, cx, R);
  base.addColorStop(0, '#8ae6ff');
  base.addColorStop(0.42, '#2fb0e6');
  base.addColorStop(0.8, '#126aa8');
  base.addColorStop(1, '#06264c');
  g.fillStyle = base;
  g.fillRect(0, 0, S, S);

  // fine fibres radiating from the pupil
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * TAU + (i % 3) * 0.02;
    g.strokeStyle = i % 2 ? 'rgba(200, 245, 255, 0.3)' : 'rgba(4, 40, 90, 0.32)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * R * 0.3, cx + Math.sin(a) * R * 0.3);
    g.lineTo(cx + Math.cos(a) * R * 0.94, cx + Math.sin(a) * R * 0.94);
    g.stroke();
  }

  // light coming through the bottom of the iris
  const glow = g.createRadialGradient(cx, cx + R * 0.62, 2, cx, cx + R * 0.55, R * 0.85);
  glow.addColorStop(0, 'rgba(170, 245, 255, 0.6)');
  glow.addColorStop(1, 'rgba(170, 245, 255, 0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, S, S);

  // the pupil
  const pupil = g.createRadialGradient(cx, cx, 0, cx, cx, R * 0.4);
  pupil.addColorStop(0, '#03081a');
  pupil.addColorStop(0.85, '#061024');
  pupil.addColorStop(1, '#0b2a55');
  g.fillStyle = pupil;
  g.beginPath();
  g.arc(cx, cx, R * 0.4, 0, TAU);
  g.fill();

  // a small painted sparkle low on the other side from the big catchlight
  g.fillStyle = 'rgba(255, 255, 255, 0.85)';
  g.beginPath();
  g.arc(cx - R * 0.34, cx + R * 0.34, R * 0.09, 0, TAU);
  g.fill();
  g.restore();
  return finish(c, 4);
}

/* ------------------------------------------------------------------ armour */

type Pt = [number, number];

/** Draws a closed shape given in the part's own coordinates, mapped onto the canvas by `toPx`. */
function path(g: CanvasRenderingContext2D, pts: Pt[], toPx: (p: Pt) => Pt, closed = true, steps = 24) {
  g.beginPath();
  const n = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const [x, y] = toPx([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      if (i === 0 && s === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
  }
  if (closed) g.closePath();
  else {
    const [x, y] = toPx(pts[pts.length - 1]);
    g.lineTo(x, y);
  }
}

/** A spiral scroll (an engraved curl) as a list of points: centre, start radius, turns. */
function scroll(cx: number, cy: number, r0: number, turns: number, flip: number, a0 = 0): Pt[] {
  const out: Pt[] = [];
  const n = Math.round(48 * turns);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = a0 + flip * t * turns * TAU;
    const r = r0 * (1 - 0.82 * t);
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

/**
 * The chest plate, painted in the plate's own coordinates (x across, y up, in metres, as on the torso) and
 * mapped onto the torso's UVs by `toUV`: silver with a blue enamel chevron edged in white, a diamond under its
 * point, and light-blue engraved scrolls.
 */
export function chestTexture(toUV: (x: number, y: number) => [number, number]) {
  const W = 1024;
  const H = 512;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const toPx = ([x, y]: Pt): Pt => {
    const [u, v] = toUV(x, y);
    return [u * W, (1 - v) * H];
  };
  // silver, a little darker towards the waist
  const [, vBot] = toUV(0, 0.02);
  const [, vTop] = toUV(0, 0.36);
  const lg = g.createLinearGradient(0, (1 - vBot) * H, 0, (1 - vTop) * H);
  lg.addColorStop(0, '#9fb3d4');
  lg.addColorStop(0.5, '#dbe6f5');
  lg.addColorStop(1, '#f4f8ff');
  g.fillStyle = lg;
  g.fillRect(0, 0, W, H);

  // the plate's lower edge, just above the belt
  g.lineWidth = 5;
  g.strokeStyle = '#f7fbff';
  path(g, [[-0.25, 0.075], [0.25, 0.075]], toPx, false);
  g.stroke();
  g.lineWidth = 3;
  g.strokeStyle = '#6d8fc0';
  path(g, [[-0.25, 0.062], [0.25, 0.062]], toPx, false);
  g.stroke();

  // engraved scrolls either side of the chevron
  g.lineCap = 'round';
  for (const s of [-1, 1]) {
    g.lineWidth = 4;
    g.strokeStyle = 'rgba(80, 140, 210, 0.75)';
    path(g, scroll(s * 0.115, 0.205, 0.042, 1.6, s, s > 0 ? Math.PI : 0), toPx, false, 2);
    g.stroke();
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(80, 140, 210, 0.6)';
    path(g, scroll(s * 0.08, 0.11, 0.028, 1.3, -s, s > 0 ? 0 : Math.PI), toPx, false, 2);
    g.stroke();
  }

  // the chevron: a white edge, then blue enamel, then a darker line inside
  const outer: Pt[] = [[-0.172, 0.35], [-0.106, 0.35], [0, 0.205], [0.106, 0.35], [0.172, 0.35], [0, 0.115]];
  const inner: Pt[] = [[-0.152, 0.34], [-0.12, 0.34], [0, 0.176], [0.12, 0.34], [0.152, 0.34], [0, 0.138]];
  g.fillStyle = '#f7fbff';
  path(g, outer, toPx);
  g.fill();
  const eg = g.createLinearGradient(0, (1 - toUV(0, 0.12)[1]) * H, 0, (1 - toUV(0, 0.34)[1]) * H);
  eg.addColorStop(0, '#2c6fc4');
  eg.addColorStop(1, '#58a6ee');
  g.fillStyle = eg;
  path(g, inner, toPx);
  g.fill();
  g.lineWidth = 2.5;
  g.strokeStyle = 'rgba(16, 60, 130, 0.7)';
  path(g, inner, toPx);
  g.stroke();

  // a diamond under the point
  const dOut: Pt[] = [[0, 0.104], [0.04, 0.072], [0, 0.04], [-0.04, 0.072]];
  const dIn: Pt[] = [[0, 0.094], [0.028, 0.072], [0, 0.05], [-0.028, 0.072]];
  g.fillStyle = '#f7fbff';
  path(g, dOut, toPx);
  g.fill();
  g.fillStyle = '#3a86da';
  path(g, dIn, toPx);
  g.fill();
  return finish(c);
}

/**
 * The pauldron domes (sphere UVs: v = 1 at the top, 0 at the rim): silver, a blue enamel band round the rim
 * edged in white, and engraved scrolls above it.
 */
export function pauldronTexture() {
  const W = 512;
  const H = 256;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const lg = g.createLinearGradient(0, 0, 0, H);
  lg.addColorStop(0, '#f6faff');
  lg.addColorStop(0.75, '#d6e2f2');
  lg.addColorStop(1, '#b9cbe6');
  g.fillStyle = lg;
  g.fillRect(0, 0, W, H);
  // blue rim band with a white edge above it
  g.fillStyle = '#3f8ad8';
  g.fillRect(0, H * 0.84, W, H * 0.16);
  g.fillStyle = '#f7fbff';
  g.fillRect(0, H * 0.8, W, H * 0.04);
  // scrolls
  g.lineCap = 'round';
  g.lineWidth = 5;
  g.strokeStyle = 'rgba(70, 130, 205, 0.75)';
  for (let k = 0; k < 6; k++) {
    const cx = ((k + 0.5) / 6) * W;
    const pts = scroll(cx, H * 0.56, 26, 1.5, k % 2 ? 1 : -1);
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.stroke();
  }
  return finish(c, 4);
}
