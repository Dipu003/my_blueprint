// Stage 1 of the relief build: the cut-out as one clean RGBA picture with finished feet.
//  - the matte fades in the last rows of the screenshot: it is carried down to the cut
//  - where his boots stand over the page's white band, the white haze round them is removed
//  - the screenshot cuts the boots off just above the soles: the last few pixels are painted on below
// Writes <out>/full.png (RGBA, 4x) and <out>/full.json (sizes, feet, ground line).
// Usage: node scripts/relief/stage1.mjs [up4=relief-work/up4.png] [mask=relief-work/mask.png] [out=relief-work]
// (see scripts/relief/README.md)
import sharp from 'sharp';
import fs from 'node:fs';
import { clamp, sstep, mix, edt, blur, raster, savePng } from './lib.mjs';

const [, , rgbPath = 'relief-work/up4.png', maskPath = 'relief-work/mask.png', outDir = 'relief-work'] = process.argv;
fs.mkdirSync(outDir, { recursive: true });
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);

const S = 4; // picture pixels of the 4x picture per layout pixel
const EXTRA = 10; // layout rows added under the screenshot for the soles
const BAND = 694 * S; // the page's white band starts here (4x rows)

const src = await sharp(rgbPath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = src.info.width;
const H0 = src.info.height;
const H = H0 + EXTRA * S;
const N = W * H;
const mk = await sharp(maskPath).extractChannel(0).raw().toBuffer();
const rgb = new Uint8Array(N * 3);
rgb.set(src.data);
const A = new Float32Array(N);
for (let i = 0; i < W * H0; i++) A[i] = mk[i] / 255;
log('loaded', W, H0, '-> canvas', W, H);

/* 1. the matte fades out in the screenshot's last rows: carry the last good row down to the cut */
const yGood = H0 - 9;
for (let y = yGood + 1; y < H0; y++) for (let x = 0; x < W; x++) A[y * W + x] = A[yGood * W + x];

/* 2. white haze: near the edge of the cut-out, inside the white band, a pixel is only as solid as it is
      not white (the boots are dark, the tan parts are saturated; only the haze is pale and grey) */
{
  const bg = new Uint8Array(N);
  for (let i = 0; i < N; i++) bg[i] = A[i] < 0.5 ? 1 : 0;
  // rows below the screenshot count as "inside" here, so the cut itself is not treated as an edge
  for (let y = H0; y < H; y++) for (let x = 0; x < W; x++) bg[y * W + x] = 0;
  const { dist } = edt(bg, W, H);
  let changed = 0;
  for (let y = BAND - 28; y < H0; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (A[i] <= 0) continue;
      const near = 1 - sstep(30, 56, dist[i]);
      if (near <= 0) continue;
      const mn = Math.min(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]);
      const solid = clamp((206 - mn) / 46, 0, 1);
      const a = Math.min(A[i], mix(1, solid, near));
      if (a < A[i] - 0.01) changed++;
      A[i] = a;
    }
  }
  // the screenshot's last rows: anything pale there is the page, wherever it is
  for (let y = H0 - 22; y < H0; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (A[i] <= 0) continue;
      const mn = Math.min(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]);
      A[i] = Math.min(A[i], mix(1, clamp((170 - mn) / 40, 0, 1), sstep(H0 - 22, H0 - 12, y)));
    }
  }
  // a sliver of the band's top edge that the matte kept, left of his right boot
  for (let y = 2764; y < 2794; y++) for (let x = 396; x < 456; x++) A[y * W + x] *= sstep(448, 456, x);
  blur(A, W, H, 1.6, [0, BAND - 44, W, H0]);
  log('white haze removed from', changed, 'pixels');
}

/* 3. the soles */
// what is cut: the runs of solid pixels on the last good rows
const yC = H0 - 10;
const runs = [];
{
  let start = -1;
  for (let x = 0; x <= W; x++) {
    const on = x < W && A[yC * W + x] > 0.5;
    if (on && start < 0) start = x;
    if (!on && start >= 0) {
      if (runs.length && start - runs[runs.length - 1][1] < 24) runs[runs.length - 1][1] = x - 1;
      else runs.push([start, x - 1]);
      start = -1;
    }
  }
}
log('feet at the cut:', JSON.stringify(runs));
if (runs.length !== 2) throw new Error('expected two feet at the cut, found ' + runs.length);

// The screenshot's very last rows are pale (the page shows through), so painting starts a little above them.
const y0 = H0 - 13;
const [[l0, l1], [r0, r1]] = runs;
// colours to continue with: rows of the boots just above, averaged, then smoothed along the row
const sample = (yFrom, yTo, [xl, xr], r, inset) => {
  const out = new Float32Array(W * 3);
  const acc = new Float32Array(W * 3);
  const cnt = new Float32Array(W);
  for (let y = yFrom; y < yTo; y++)
    for (let x = xl; x <= xr; x++) {
      const i = y * W + x;
      if (A[i] < 0.97) continue;
      acc[x * 3] += rgb[i * 3];
      acc[x * 3 + 1] += rgb[i * 3 + 1];
      acc[x * 3 + 2] += rgb[i * 3 + 2];
      cnt[x]++;
    }
  for (let x = Math.max(0, xl - 60); x <= Math.min(W - 1, xr + 60); x++) {
    let s0 = 0;
    let s1 = 0;
    let s2 = 0;
    let n = 0;
    const xs = clamp(x, xl + inset[0], xr - inset[1]);
    for (let k = -r; k <= r; k++) {
      const xx = clamp(xs + k, xl + inset[0], xr - inset[1]);
      if (!cnt[xx]) continue;
      s0 += acc[xx * 3] / cnt[xx];
      s1 += acc[xx * 3 + 1] / cnt[xx];
      s2 += acc[xx * 3 + 2] / cnt[xx];
      n++;
    }
    if (!n) continue;
    out[x * 3] = s0 / n;
    out[x * 3 + 1] = s1 / n;
    out[x * 3 + 2] = s2 / n;
  }
  return out;
};
// his right foot (left in the picture): the rows just above the cut, but not the pale tip of the toe;
// his left foot: the leather between the two straps (the lower strap itself sits right on the cut)
const feet = [
  { fine: sample(H0 - 36, H0 - 15, runs[0], 9, [56, 10]), broad: sample(H0 - 36, H0 - 15, runs[0], 80, [56, 10]), depth: 29 },
  { fine: sample(H0 - 70, H0 - 44, runs[1], 12, [10, 30]), broad: sample(H0 - 70, H0 - 44, runs[1], 80, [10, 30]), depth: 45 },
];
// outlines: the toe of the first points to the lower left; the second is seen from the front
const footL = (d) =>
  `M ${l0 - 4} ${y0 - 14} C ${l0 - 14} ${y0 - 4}, ${l0 - 12} ${y0 + d - 2}, ${l0 + 16} ${y0 + d} L ${l1 - 22} ${y0 + d - 7} C ${l1 - 6} ${y0 + d - 7}, ${l1 + 1} ${y0 + d - 16}, ${l1} ${y0 - 14} Z`;
const footR = (d) =>
  `M ${r0 - 2} ${y0 - 14} C ${r0 - 4} ${y0 + 12}, ${r0 + 2} ${y0 + d - 4}, ${r0 + 34} ${y0 + d} L ${r1 - 46} ${y0 + d} C ${r1 - 12} ${y0 + d - 1}, ${r1 + 4} ${y0 + 14}, ${r1} ${y0 - 14} Z`;
const path = (d) => `<path d="${d}" fill="#fff"/>`;
const shapes = [await raster(path(footL(feet[0].depth)), W, H), await raster(path(footR(feet[1].depth)), W, H)];
const inner = [await raster(path(footL(feet[0].depth - 5)), W, H), await raster(path(footR(feet[1].depth - 6)), W, H)];
const EDGE = [34, 20, 18]; // the dark line under a boot
for (let f = 0; f < 2; f++) {
  const { fine, broad, depth } = feet[f];
  for (let y = y0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const sh = shapes[f][i];
      if (sh <= 0) continue;
      const t = clamp((y - y0) / depth, 0, 1);
      const k = sstep(0, 0.5, t);
      const shade = 1 - 0.3 * t * t;
      const edge = (1 - inner[f][i]) * 0.7 * sstep(0.2, 0.7, t);
      for (let c = 0; c < 3; c++) {
        const v = mix(fine[x * 3 + c], broad[x * 3 + c], k) * shade;
        rgb[i * 3 + c] = Math.round(clamp(mix(v, EDGE[c], edge), 0, 255));
      }
      A[i] = sh;
    }
  }
}
// nothing else below the cut
for (let y = y0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (shapes[0][i] <= 0 && shapes[1][i] <= 0) A[i] = 0;
  }
// soften the painted rows, like the picture around them, and blend them into the last real rows
for (let c = 0; c < 3; c++) {
  const ch = new Float32Array(N);
  for (let i = W * (y0 - 20); i < N; i++) ch[i] = rgb[i * 3 + c];
  blur(ch, W, H, 2.6, [0, y0 - 8, W, H]);
  for (let y = y0 - 8; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const k = sstep(y0 - 8, y0, y);
      rgb[i * 3 + c] = Math.round(clamp(mix(rgb[i * 3 + c], ch[i], k), 0, 255));
    }
}
log('feet painted');

const ground = (y0 + feet[1].depth) / S;
const meta = { S, W, H, H0, EXTRA, layout: [W / S, H / S], feet: runs, ground, footMid: (l0 + l1 + r0 + r1) / 4 / S };
fs.writeFileSync(`${outDir}/full.json`, JSON.stringify(meta, null, 1));
await savePng(`${outDir}/full.png`, rgb, A, W, H);
// previews of the feet on three backgrounds
for (const [name, on] of [['dark', '#0b0a14'], ['light', '#eef0f7']])
  await savePng(`${outDir}/feet-${name}.png`, rgb, A, W, H, { on, crop: [200, 2440, 1100, H - 2440], scale: 1 });
log('saved', outDir, JSON.stringify(meta));
