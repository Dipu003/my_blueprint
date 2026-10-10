// Small image helpers shared by the relief build (plain typed arrays, no dependencies but sharp for files).
import sharp from 'sharp';

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const sstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const mix = (a, b, t) => a + (b - a) * t;

/**
 * Exact Euclidean distance transform (Felzenszwalb & Huttenlocher). `target[i]` = 1 marks the pixels the
 * distance is measured TO. Returns the distance (px) for every pixel and, when asked, the index of the
 * nearest target pixel.
 */
export function edt(target, w, h, wantNearest = false) {
  const INF = 1e12;
  const n = Math.max(w, h);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const z = new Float64Array(n + 1);
  const v = new Int32Array(n);
  const arg = new Int32Array(n);
  const g = new Float64Array(w * h);
  const ny = wantNearest ? new Int32Array(w * h) : null;
  const pass = (len) => {
    let k = 0;
    v[0] = 0;
    z[0] = -INF * 10;
    z[1] = INF * 10;
    for (let q = 1; q < len; q++) {
      let s;
      for (;;) {
        const p = v[k];
        s = (f[q] + q * q - (f[p] + p * p)) / (2 * q - 2 * p);
        if (s <= z[k] && k > 0) k--;
        else break;
      }
      if (s <= z[k]) {
        // dominated the very first parabola
        v[0] = q;
        continue;
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = INF * 10;
    }
    k = 0;
    for (let q = 0; q < len; q++) {
      while (z[k + 1] < q) k++;
      const p = v[k];
      d[q] = (q - p) * (q - p) + f[p];
      arg[q] = p;
    }
  };
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = target[y * w + x] ? 0 : INF;
    pass(h);
    for (let y = 0; y < h; y++) {
      g[y * w + x] = d[y];
      if (ny) ny[y * w + x] = arg[y];
    }
  }
  const dist = new Float32Array(w * h);
  const near = wantNearest ? new Int32Array(w * h) : null;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = g[y * w + x];
    pass(w);
    for (let x = 0; x < w; x++) {
      dist[y * w + x] = Math.sqrt(d[x]);
      if (near) near[y * w + x] = ny[y * w + arg[x]] * w + arg[x];
    }
  }
  return { dist, near };
}

/** Gaussian blur of a one-channel float image, in place, optionally only inside a rectangle [x0, y0, x1, y1). */
export function blur(a, w, h, sigma, rect) {
  if (sigma <= 0) return a;
  const [x0, y0, x1, y1] = rect ?? [0, 0, w, h];
  const r = Math.ceil(sigma * 3);
  const k = new Float32Array(r * 2 + 1);
  let sum = 0;
  for (let i = -r; i <= r; i++) sum += k[i + r] = Math.exp((-i * i) / (2 * sigma * sigma));
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  const tmp = new Float32Array(Math.max(x1 - x0, y1 - y0));
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      let s = 0;
      for (let i = -r; i <= r; i++) s += a[y * w + clamp(x + i, 0, w - 1)] * k[i + r];
      tmp[x - x0] = s;
    }
    for (let x = x0; x < x1; x++) a[y * w + x] = tmp[x - x0];
  }
  for (let x = x0; x < x1; x++) {
    for (let y = y0; y < y1; y++) {
      let s = 0;
      for (let i = -r; i <= r; i++) s += a[clamp(y + i, 0, h - 1) * w + x] * k[i + r];
      tmp[y - y0] = s;
    }
    for (let y = y0; y < y1; y++) a[y * w + x] = tmp[y - y0];
  }
  return a;
}

/** Rasterises SVG shapes (white fill = 1) to a float coverage image of the given size. */
export async function raster(svgBody, w, h) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${svgBody}</svg>`;
  const buf = await sharp(Buffer.from(svg), { limitInputPixels: false }).ensureAlpha().extractChannel(3).raw().toBuffer();
  const out = new Float32Array(w * h);
  for (let i = 0; i < out.length; i++) out[i] = buf[i] / 255;
  return out;
}

/** Area-average downsample of a one-channel float image by an integer factor. */
export function shrink(a, w, h, f) {
  const W = Math.floor(w / f);
  const H = Math.floor(h / f);
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let s = 0;
      for (let j = 0; j < f; j++) for (let i = 0; i < f; i++) s += a[(y * f + j) * w + x * f + i];
      out[y * W + x] = s / (f * f);
    }
  return out;
}

/** Saves RGB (Uint8, 3 per pixel) + alpha (float 0..1 or null) as a PNG, flattened on a colour when given. */
export async function savePng(file, rgb, alpha, w, h, { on = null, crop = null, scale = 1 } = {}) {
  const buf = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    buf[i * 4] = rgb[i * 3];
    buf[i * 4 + 1] = rgb[i * 3 + 1];
    buf[i * 4 + 2] = rgb[i * 3 + 2];
    buf[i * 4 + 3] = alpha ? Math.round(clamp(alpha[i], 0, 1) * 255) : 255;
  }
  let img = sharp(buf, { raw: { width: w, height: h, channels: 4 }, limitInputPixels: false });
  if (crop) img = img.extract({ left: crop[0], top: crop[1], width: crop[2], height: crop[3] });
  if (on) img = img.flatten({ background: on });
  if (scale !== 1) {
    const cw = crop ? crop[2] : w;
    img = sharp(await img.png().toBuffer()).resize({ width: Math.round(cw * scale), kernel: scale < 1 ? 'lanczos3' : 'nearest' });
  }
  await img.png().toFile(file);
}

/** Saves a one-channel float image (0..1) as a grey PNG. */
export async function saveGrey(file, a, w, h, { crop = null, scale = 1, max = 1 } = {}) {
  const buf = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) buf[i] = Math.round(clamp(a[i] / max, 0, 1) * 255);
  let img = sharp(buf, { raw: { width: w, height: h, channels: 1 }, limitInputPixels: false });
  if (crop) img = img.extract({ left: crop[0], top: crop[1], width: crop[2], height: crop[3] });
  if (scale !== 1) {
    const cw = crop ? crop[2] : w;
    img = sharp(await img.png().toBuffer()).resize({ width: Math.round(cw * scale), kernel: scale < 1 ? 'lanczos3' : 'nearest' });
  }
  await img.png().toFile(file);
}
