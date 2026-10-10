// Stage 2 of the relief build: from the clean cut-out (stage 1) to the files the site loads.
//  - two picture layers, HEAD and BODY (the body is filled in a little way under the head, so nothing is
//    missing when the head turns), each padded with its own edge colours (no fringes)
//  - a height map for each (how far every point stands out)
//  - the closed eyelids (skin painted over each eye, and how the lid travels down it)
//  - the measurements the page needs: neck, eyes, mouth, spear core
// Writes <assets>/body.webp, head.webp, body-depth.png, head-depth.png, lids.png, <assets>/../hero.json
// and previews. All positions in hero.json are in LAYOUT pixels: the original 423-wide picture (4x / 4).
// Usage: node scripts/relief/stage2.mjs [work=relief-work] [assets=public/models/hero] [previews=relief-work/preview]
// (see scripts/relief/README.md)
import sharp from 'sharp';
import fs from 'node:fs';
import { clamp, sstep, mix, edt, blur, raster, shrink, savePng, saveGrey } from './lib.mjs';

const [, , work = 'relief-work', assets = 'public/models/hero', dbg = 'relief-work/preview'] = process.argv;
fs.mkdirSync(assets, { recursive: true });
fs.mkdirSync(dbg, { recursive: true });
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);

const meta = JSON.parse(fs.readFileSync(`${work}/full.json`, 'utf8'));
const { S, W, H } = meta;
const N = W * H;
const PW = W / S;
const PH = H / S;
const full = await sharp(`${work}/full.png`, { limitInputPixels: false }).ensureAlpha().raw().toBuffer();
const rgb = new Uint8Array(N * 3);
const A = new Float32Array(N);
for (let i = 0; i < N; i++) {
  rgb[i * 3] = full[i * 4];
  rgb[i * 3 + 1] = full[i * 4 + 1];
  rgb[i * 3 + 2] = full[i * 4 + 2];
  A[i] = full[i * 4 + 3] / 255;
}
log('loaded', W, H);

/* ------------------------------------------------------------------ what was measured in the picture (4x pixels) */
// Everything of the cut-out inside this outline is HEAD: hair, ears, the hanging locks. Along the jaw the
// outline stays inside the face; there the skin colour decides (skin = head, scarf = body).
const HEAD_POLY = [
  [150, 0], [1240, 0], [1240, 1000], [1140, 1110], [1100, 1100], [1082, 1090], [1060, 1072], [1030, 1052], [992, 1060],
  [900, 1000], [740, 1000], [560, 1000], [528, 1080], [500, 1074], [470, 1076], [438, 1078], [432, 1100], [428, 1140],
  [412, 1168], [396, 1186], [360, 1186], [150, 1100],
];
const SKIN_BOX = [430, 960, 1075, 1200]; // where the jaw runs
const NECK_BOX = [450, 1000, 1050, 1236]; // the body is continued under the head only here (under the jaw)
const EYES = [
  { c: [564, 821], r: [84, 60] },
  { c: [926, 823], r: [85, 60] },
];
const MOUTH = { cx: 750, top: 1035, corners: 1052, half: 89 };
const GLOW_BOX = [1400, 1190, 1530, 1350];
const NECK = [186, 282]; // layout px: what the head turns about
const FACE = { c: [186, 216], r: [98, 114] }; // layout px: the bulge of the face
const NOSE = [185, 237]; // layout px

/* ------------------------------------------------------------------ specks in the hair */
// Between the spikes of his hair the matte kept a few dark bits of the old background. His hair is pale
// everywhere, so near its outline anything that dark is not hair: it becomes a gap.
{
  const out = new Uint8Array(N);
  for (let i = 0; i < N; i++) out[i] = A[i] < 0.5 ? 1 : 0;
  const { dist } = edt(out, W, H);
  let n = 0;
  for (let y = 0; y < 620; y++)
    for (let x = 150; x < 1240; x++) {
      const i = y * W + x;
      if (A[i] <= 0 || dist[i] > 60) continue;
      const keep = sstep(110, 170, Math.max(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]));
      if (keep < 1) {
        A[i] = Math.min(A[i], keep);
        n++;
      }
    }
  blur(A, W, H, 1.2, [150, 0, 1240, 620]);
  log('dark specks removed from the hair:', n, 'pixels');
}

/* ------------------------------------------------------------------ head or body */
const poly = await raster(`<polygon points="${HEAD_POLY.map((p) => p.join(',')).join(' ')}" fill="#fff"/>`, W, H);
blur(poly, W, H, 3.5, [100, 900, 1300, 1260]);
const skin = new Float32Array(N);
for (let y = SKIN_BOX[1]; y < SKIN_BOX[3]; y++)
  for (let x = SKIN_BOX[0]; x < SKIN_BOX[2]; x++) {
    const i = y * W + x;
    skin[i] = sstep(8, 34, rgb[i * 3] - rgb[i * 3 + 2]) * sstep(105, 145, rgb[i * 3]);
  }
const headFrac = new Float32Array(N);
for (let i = 0; i < N; i++) headFrac[i] = Math.max(poly[i], skin[i]);
// keep only what hangs together with the face (no stray specks of "skin")
{
  const seen = new Uint8Array(N);
  const stack = [821 * W + 740];
  seen[stack[0]] = 1;
  while (stack.length) {
    const i = stack.pop();
    const x = i % W;
    for (const j of [i - 1, i + 1, i - W, i + W]) {
      if (j < 0 || j >= N || seen[j]) continue;
      if (Math.abs((j % W) - x) > 1) continue;
      if (headFrac[j] < 0.02 || A[j] < 0.02) continue;
      seen[j] = 1;
      stack.push(j);
    }
  }
  let dropped = 0;
  for (let i = 0; i < N; i++)
    if (!seen[i] && headFrac[i] > 0) {
      if (A[i] > 0.02) dropped++;
      // a speck of the matte floating beside his hair belongs to nothing; stray "skin" lower down is body
      if (poly[i] > 0.5) A[i] = 0;
      headFrac[i] = 0;
    }
  log('head found; stray pixels dropped:', dropped);
}

/* ------------------------------------------------------------------ distances */
const bg = new Uint8Array(N);
const bodyT = new Uint8Array(N); // body pixels round the neck
const skinT = new Uint8Array(N);
for (let i = 0; i < N; i++) {
  bg[i] = A[i] < 0.5 ? 1 : 0;
  skinT[i] = skin[i] > 0.02 ? 1 : 0;
}
for (let y = NECK_BOX[1]; y < NECK_BOX[3]; y++)
  for (let x = NECK_BOX[0]; x < NECK_BOX[2]; x++) {
    const i = y * W + x;
    bodyT[i] = A[i] >= 0.5 && headFrac[i] < 0.5 ? 1 : 0;
  }
const dBg = edt(bg, W, H).dist; // into the cut-out, from its outline
const dBody = edt(bodyT, W, H).dist; // into the head, from the body at the neck
const dSkin = edt(skinT, W, H).dist; // away from the jaw's skin
log('distances');

/* ------------------------------------------------------------------ alpha of the two layers */
const PATCH = 26 * S; // how far the body continues under the head
const headA = new Float32Array(N);
const bodyA = new Float32Array(N);
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    headA[i] = A[i] * headFrac[i];
    if (headFrac[i] < 0.5) bodyA[i] = A[i];
    else if (y >= NECK_BOX[1] - PATCH && y < NECK_BOX[3]) {
      const side = sstep(NECK_BOX[0], NECK_BOX[0] + 44, x) * (1 - sstep(NECK_BOX[2] - 44, NECK_BOX[2], x));
      bodyA[i] = side * sstep(5, 12, dBg[i]) * (1 - sstep(PATCH - 28, PATCH, dBody[i]));
    }
  }

/* ------------------------------------------------------------------ colours: each layer continued from its own solid part */
const fill = (known, name) => {
  const { near } = edt(known, W, H, true);
  const out = new Uint8Array(N * 3);
  for (let i = 0; i < N; i++) {
    const j = known[i] ? i : near[i];
    out[i * 3] = rgb[j * 3];
    out[i * 3 + 1] = rgb[j * 3 + 1];
    out[i * 3 + 2] = rgb[j * 3 + 2];
  }
  log('filled', name);
  return out;
};
const knownHead = new Uint8Array(N);
const knownBody = new Uint8Array(N);
for (let i = 0; i < N; i++) {
  const solid = A[i] >= 0.985 && dBg[i] >= 5;
  knownHead[i] = solid && (poly[i] > 0.02 || skin[i] > 0.98) && headFrac[i] > 0 ? 1 : 0;
  // the body's own colours stop well short of the jaw: the pixels next to it are part skin
  knownBody[i] = solid && poly[i] < 0.98 && dSkin[i] >= 14 ? 1 : 0;
}
const headRgb = fill(knownHead, 'head');
const bodyRgb = fill(knownBody, 'body');
// under the head the body's colours are spread smoothly (they were streaks of the nearest pixel) and darkened
{
  const [x0, y0, x1, y1] = [NECK_BOX[0] - 60, NECK_BOX[1] - PATCH - 20, NECK_BOX[2] + 60, NECK_BOX[3]];
  for (let c = 0; c < 3; c++) {
    const ch = new Float32Array(N);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) ch[y * W + x] = bodyRgb[(y * W + x) * 3 + c];
    for (let it = 0; it < 7; it++) {
      blur(ch, W, H, 7, [x0, y0, x1, y1]);
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) {
          const i = y * W + x;
          if (knownBody[i]) ch[i] = bodyRgb[i * 3 + c];
        }
    }
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) {
        const i = y * W + x;
        if (knownBody[i]) continue;
        const under = headFrac[i] >= 0.5 ? sstep(0, 44, dBody[i]) : 0;
        bodyRgb[i * 3 + c] = Math.round(clamp(ch[i] * (1 - 0.5 * under), 0, 255));
      }
  }
  log('neck continued under the head');
}

/* ------------------------------------------------------------------ write a layer: crop, pad, webp */
const writeLayer = async (name, lrgb, la) => {
  // where the layer is
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (la[y * W + x] > 0.004) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  const PAD = 3; // layout px
  const rx = Math.max(0, Math.floor(x0 / S) - PAD);
  const ry = Math.max(0, Math.floor(y0 / S) - PAD);
  const rw = Math.min(PW, Math.ceil((x1 + 1) / S) + PAD) - rx;
  const rh = Math.min(PH, Math.ceil((y1 + 1) / S) + PAD) - ry;
  // a faint alpha in a band round the layer keeps its edge colours in the file (a fully transparent pixel
  // may lose its colour when the picture is compressed, and the texture filter would then mix black in)
  const solid = new Uint8Array(N);
  for (let i = 0; i < N; i++) solid[i] = la[i] > 0.3 ? 1 : 0;
  const { dist } = edt(solid, W, H);
  const cw = rw * S;
  const chh = rh * S;
  const buf = Buffer.alloc(cw * chh * 4);
  for (let y = 0; y < chh; y++)
    for (let x = 0; x < cw; x++) {
      const i = (y + ry * S) * W + x + rx * S;
      const o = (y * cw + x) * 4;
      buf[o] = lrgb[i * 3];
      buf[o + 1] = lrgb[i * 3 + 1];
      buf[o + 2] = lrgb[i * 3 + 2];
      buf[o + 3] = Math.max(Math.round(clamp(la[i], 0, 1) * 255), dist[i] <= 28 ? 1 : 0);
    }
  const file = `${assets}/${name}.webp`;
  await sharp(buf, { raw: { width: cw, height: chh, channels: 4 } }).webp({ quality: 90, alphaQuality: 100, effort: 6, smartSubsample: true }).toFile(file);
  log('saved', file, `${cw}x${chh}`, (fs.statSync(file).size / 1024).toFixed(0) + ' KB', 'rect', rx, ry, rw, rh);
  return [rx, ry, rw, rh];
};
const headRect = await writeLayer('head', headRgb, headA);
const bodyRect = await writeLayer('body', bodyRgb, bodyA);

/* ------------------------------------------------------------------ height maps (layout pixels) */
const A1 = shrink(A, W, H, S);
const head1 = shrink(headA, W, H, S);
const body1 = shrink(bodyA, W, H, S);
const frac1 = shrink(headFrac, W, H, S);
const PN = PW * PH;
const prof = (t) => Math.sqrt(1 - (1 - Math.min(1, Math.max(0, t))) ** 2); // a quarter circle: steep at the rim, flat inside
const out1 = new Uint8Array(PN);
const notBody1 = new Uint8Array(PN);
const body1T = new Uint8Array(PN);
for (let i = 0; i < PN; i++) {
  const inside = A1[i] >= 0.5;
  const isHead = inside && frac1[i] >= 0.5;
  out1[i] = inside ? 0 : 1;
  notBody1[i] = inside && !isHead ? 0 : 1;
  const x = i % PW;
  const y = (i / PW) | 0;
  body1T[i] = inside && !isHead && x * S >= NECK_BOX[0] && x * S < NECK_BOX[2] && y * S >= NECK_BOX[1] && y * S < NECK_BOX[3] ? 1 : 0;
}
const dF = edt(out1, PW, PH).dist;
const dB = edt(notBody1, PW, PH).dist;
const dN = edt(body1T, PW, PH).dist;
const HEAD_H = { inflate: 44, radius: 56, face: 42, nose: 8, lift: 14 };
const BODY_H = { inflate: 40, radius: 40, back: 28 };
const hHead = new Float32Array(PN);
const hBody = new Float32Array(PN);
for (let y = 0; y < PH; y++)
  for (let x = 0; x < PW; x++) {
    const i = y * PW + x;
    const dx = (x + 0.5 - FACE.c[0]) / FACE.r[0];
    const dy = (y + 0.5 - FACE.c[1]) / FACE.r[1];
    const r2 = dx * dx + dy * dy;
    const dome = r2 < 1 ? Math.pow(1 - r2, 0.7) : 0;
    const nx = x + 0.5 - NOSE[0];
    const ny = y + 0.5 - NOSE[1];
    const nose = Math.exp(-(nx * nx + ny * ny) / (2 * 7 * 7));
    hHead[i] = HEAD_H.inflate * prof(dF[i] / HEAD_H.radius) + HEAD_H.face * dome + HEAD_H.nose * nose;
    hBody[i] = notBody1[i] ? -Math.min(BODY_H.back, 0.9 * dN[i]) * (frac1[i] >= 0.5 && A1[i] >= 0.5 ? 1 : 0) : BODY_H.inflate * prof(dB[i] / BODY_H.radius);
  }
blur(hHead, PW, PH, 2.2);
blur(hBody, PW, PH, 2.0);
const writeDepth = async (name, h, cover, [rx, ry, rw, rh], lift) => {
  let lo = Infinity;
  let hi = -Infinity;
  for (let y = ry; y < ry + rh; y++)
    for (let x = rx; x < rx + rw; x++) {
      const v = h[y * PW + x];
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  const scale = Math.max(1, hi - lo);
  const buf = Buffer.alloc(rw * rh * 3);
  for (let y = 0; y < rh; y++)
    for (let x = 0; x < rw; x++) {
      const i = (y + ry) * PW + x + rx;
      // covered if this pixel or a neighbour has any of the layer (so the mesh reaches just past the edge)
      let cov = 0;
      for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) cov = Math.max(cov, cover[clamp(y + ry + j, 0, PH - 1) * PW + clamp(x + rx + k, 0, PW - 1)]);
      buf[(y * rw + x) * 3] = Math.round(((h[i] - lo) / scale) * 255);
      buf[(y * rw + x) * 3 + 1] = cov > 0.004 ? 255 : 0;
    }
  const file = `${assets}/${name}-depth.png`;
  await sharp(buf, { raw: { width: rw, height: rh, channels: 3 } }).png({ compressionLevel: 9 }).toFile(file);
  log('saved', file, `${rw}x${rh}`, (fs.statSync(file).size / 1024).toFixed(0) + ' KB', 'heights', lo.toFixed(1), '..', hi.toFixed(1));
  return { depthScale: +scale.toFixed(2), lift: +(lo + lift).toFixed(2) };
};
const headDepth = await writeDepth('head', hHead, head1, headRect, HEAD_H.lift);
const bodyDepth = await writeDepth('body', hBody, body1, bodyRect, 0);

/* ------------------------------------------------------------------ eyes: the closed lids */
const hex = (c) => '#' + c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
const solve = (M, b) => {
  // Gaussian elimination with pivoting; M is n x n, b is n x 3
  const n = M.length;
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k < n; k++) M[r][k] -= f * M[c][k];
      for (let k = 0; k < 3; k++) b[r][k] -= f * b[c][k];
    }
  }
  return b.map((row, i) => row.map((v) => v / M[i][i]));
};
const basis = (u, v) => [1, u, v, u * u, u * v, v * v];
const LID_GROW = 8; // 4x px the lid reaches beyond the eye and its outline
const LID_HMAX = 240; // 4x px: the tallest an eye can be (scales the stored height)
const eyes = EYES.map((e, idx) => {
  // the eye's box, on whole layout pixels
  const bx = (Math.floor((e.c[0] - e.r[0]) / S) - 8) * S;
  const by = (Math.floor((e.c[1] - e.r[1]) / S) - 8) * S;
  const bw = (Math.ceil((e.c[0] + e.r[0]) / S) + 8) * S - bx;
  const bh = (Math.ceil((e.c[1] + e.r[1]) / S) + 7) * S - by;
  const at = (x, y) => (y + by) * W + x + bx;
  const isSkin = (i) => headRgb[i * 3] > 92 && headRgb[i * 3] - headRgb[i * 3 + 2] > 24 && headRgb[i * 3] >= headRgb[i * 3 + 1];
  // 1. the eye itself: everything that is not skin, reached from its centre (the brow above it is kept out)
  const reg = new Uint8Array(bw * bh);
  const ok = (x, y) => {
    const i = at(x, y);
    if (isSkin(i)) return false;
    const blue = headRgb[i * 3 + 2] - headRgb[i * 3] > 70;
    if (blue && y + by < e.c[1] - e.r[1] + 8) return false;
    return true;
  };
  const stack = [[Math.round(e.c[0] - bx), Math.round(e.c[1] - by)]];
  reg[stack[0][1] * bw + stack[0][0]] = 1;
  while (stack.length) {
    const [x, y] = stack.pop();
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx < 0 || ny < 0 || nx >= bw || ny >= bh || reg[ny * bw + nx] || !ok(nx, ny)) continue;
      reg[ny * bw + nx] = 1;
      stack.push([nx, ny]);
    }
  }
  // (a pale highlight inside the eye can look like skin: the measured oval, and whatever the eye encloses, is eye too)
  for (let y = 0; y < bh; y++)
    for (let x = 0; x < bw; x++) if (Math.hypot((x + bx - e.c[0]) / e.r[0], (y + by - e.c[1]) / e.r[1]) < 0.98) reg[y * bw + x] = 1;
  {
    const outside = new Uint8Array(bw * bh);
    const st = [];
    for (let x = 0; x < bw; x++) st.push([x, 0], [x, bh - 1]);
    for (let y = 0; y < bh; y++) st.push([0, y], [bw - 1, y]);
    while (st.length) {
      const [x, y] = st.pop();
      if (x < 0 || y < 0 || x >= bw || y >= bh || outside[y * bw + x] || reg[y * bw + x]) continue;
      outside[y * bw + x] = 1;
      st.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
    }
    for (let k = 0; k < bw * bh; k++) if (!outside[k]) reg[k] = 1;
  }
  const { dist: dReg } = edt(reg, bw, bh);
  // 2. where the lid is (soft), and for every column where it starts and ends
  const mask = new Float32Array(bw * bh);
  const top = new Float32Array(bw).fill(-1);
  const bot = new Float32Array(bw).fill(-1);
  for (let x = 0; x < bw; x++)
    for (let y = 0; y < bh; y++) {
      const d = dReg[y * bw + x];
      mask[y * bw + x] = 1 - sstep(LID_GROW - 2, LID_GROW + 4, d);
      if (d <= LID_GROW) {
        if (top[x] < 0) top[x] = y;
        bot[x] = y;
      }
    }
  let xa = 0;
  let xb = bw - 1;
  while (top[xa] < 0) xa++;
  while (top[xb] < 0) xb--;
  for (let x = 0; x < bw; x++) {
    const xs = clamp(x, xa, xb);
    top[x] = top[xs];
    bot[x] = bot[xs];
  }
  const smoothRow = (a) => {
    const o = new Float32Array(bw);
    for (let x = 0; x < bw; x++) {
      let s = 0;
      for (let k = -5; k <= 5; k++) s += a[clamp(x + k, 0, bw - 1)];
      o[x] = s / 11;
    }
    return o;
  };
  const topS = smoothRow(top);
  const botS = smoothRow(bot);
  const q = new Float32Array(bw * bh);
  const hgt = new Float32Array(bw * bh);
  for (let y = 0; y < bh; y++)
    for (let x = 0; x < bw; x++) {
      const h = Math.max(1, botS[x] - topS[x]);
      q[y * bw + x] = clamp((y - topS[x]) / h, 0, 1);
      hgt[y * bw + x] = h;
    }
  // 3. the lid's skin: a smooth colour fitted to the skin round the eye, then blended into its surroundings
  const rx = e.r[0] + 13;
  const ry = e.r[1] + 11;
  const M = Array.from({ length: 6 }, () => new Array(6).fill(0));
  const b = Array.from({ length: 6 }, () => [0, 0, 0]);
  let n = 0;
  for (let y = Math.round(e.c[1] - ry * 1.6); y <= e.c[1] + ry * 1.6; y++)
    for (let x = Math.round(e.c[0] - rx * 1.5); x <= e.c[0] + rx * 1.5; x++) {
      const u = (x - e.c[0]) / rx;
      const v = (y - e.c[1]) / ry;
      const rho = Math.hypot(u, v);
      if (rho < 1.0 || rho > 1.42) continue;
      const i = y * W + x;
      const [r, g, bl] = [headRgb[i * 3], headRgb[i * 3 + 1], headRgb[i * 3 + 2]];
      if (!(r > 150 && r - bl > 28 && g > 85 && headA[i] > 0.98)) continue; // lit skin only: no brow, lash or hair
      const f = basis(u, v);
      for (let p = 0; p < 6; p++) {
        for (let k = 0; k < 6; k++) M[p][k] += f[p] * f[k];
        b[p][0] += f[p] * r;
        b[p][1] += f[p] * g;
        b[p][2] += f[p] * bl;
      }
      n++;
    }
  for (let p = 3; p < 6; p++) M[p][p] += n * 0.02; // keep the curved terms gentle
  const coef = solve(M, b);
  const lid = new Float32Array(bw * bh * 3);
  const known = new Uint8Array(bw * bh);
  for (let y = 0; y < bh; y++)
    for (let x = 0; x < bw; x++) {
      const i = at(x, y);
      const k = y * bw + x;
      const f = basis((x + bx - e.c[0]) / rx, (y + by - e.c[1]) / ry);
      known[k] = dReg[k] > LID_GROW + 7 && Math.hypot(f[1], f[2]) > 0.98 && isSkin(i) && headRgb[i * 3] > 120 ? 1 : 0;
      for (let c = 0; c < 3; c++) {
        let sk = 0;
        for (let p = 0; p < 6; p++) sk += f[p] * coef[p][c];
        lid[k * 3 + c] = known[k] ? headRgb[i * 3 + c] : sk;
      }
    }
  for (let c = 0; c < 3; c++) {
    const ch = new Float32Array(bw * bh);
    for (let k = 0; k < bw * bh; k++) ch[k] = lid[k * 3 + c];
    for (let it = 0; it < 10; it++) {
      blur(ch, bw, bh, 4);
      for (let k = 0; k < bw * bh; k++) if (known[k]) ch[k] = lid[k * 3 + c];
    }
    for (let k = 0; k < bw * bh; k++) lid[k * 3 + c] = ch[k];
  }
  // the lash line: the darkest tenth of the eye
  const dark = [];
  for (let k = 0; k < bw * bh; k++) if (reg[k]) dark.push([headRgb[at(k % bw, (k / bw) | 0) * 3] + headRgb[at(k % bw, (k / bw) | 0) * 3 + 1] + headRgb[at(k % bw, (k / bw) | 0) * 3 + 2], k]);
  dark.sort((p, r) => p[0] - r[0]);
  const lash = [0, 0, 0];
  const take = Math.max(1, Math.round(dark.length * 0.1));
  for (let k = 0; k < take; k++) for (let c = 0; c < 3; c++) lash[c] += headRgb[at(dark[k][1] % bw, (dark[k][1] / bw) | 0) * 3 + c] / take;
  log('eye', idx, 'box', bx / S, by / S, bw / S, bh / S, 'skin samples', n, 'lash', hex(lash));
  return { bx, by, bw, bh, mask, q, hgt, lid, lash };
});
// both lids in one small picture, at half the working size: on top the skin (alpha = where the lid is),
// below it the travel (red = how far down the eye, 0 top .. 1 bottom; green = the eye's height there)
const lidsInfo = await (async () => {
  const G = 2; // gutter
  const cell = eyes.map((e) => [e.bw / 2, e.bh / 2]);
  const aw = cell[0][0] + cell[1][0] + G * 3;
  const ah = Math.max(cell[0][1], cell[1][1]) * 2 + G * 3;
  const buf = Buffer.alloc(aw * ah * 4);
  const rects = [];
  let ox = G;
  eyes.forEach((e, k) => {
    const [cw, chh] = cell[k];
    const skinAt = [ox, G];
    const dataAt = [ox, G * 2 + Math.max(cell[0][1], cell[1][1])];
    for (let y = -1; y <= chh; y++)
      for (let x = -1; x <= cw; x++) {
        // (one pixel of border repeats the edge, so the texture filter never reads the neighbour)
        const sx = clamp(x, 0, cw - 1) * 2;
        const sy = clamp(y, 0, chh - 1) * 2;
        const avg = (arr, stride, c) => (arr[(sy * e.bw + sx) * stride + c] + arr[(sy * e.bw + sx + 1) * stride + c] + arr[((sy + 1) * e.bw + sx) * stride + c] + arr[((sy + 1) * e.bw + sx + 1) * stride + c]) / 4;
        let o = ((skinAt[1] + y) * aw + skinAt[0] + x) * 4;
        buf[o] = Math.round(clamp(avg(e.lid, 3, 0), 0, 255));
        buf[o + 1] = Math.round(clamp(avg(e.lid, 3, 1), 0, 255));
        buf[o + 2] = Math.round(clamp(avg(e.lid, 3, 2), 0, 255));
        buf[o + 3] = Math.round(clamp(avg(e.mask, 1, 0), 0, 1) * 255);
        o = ((dataAt[1] + y) * aw + dataAt[0] + x) * 4;
        buf[o] = Math.round(clamp(avg(e.q, 1, 0), 0, 1) * 255);
        buf[o + 1] = Math.round(clamp(avg(e.hgt, 1, 0) / LID_HMAX, 0, 1) * 255);
        buf[o + 2] = 0;
        buf[o + 3] = 255;
      }
    rects.push({ box: [e.bx / S, e.by / S, e.bw / S, e.bh / S], skin: [...skinAt, cw, chh], data: [...dataAt, cw, chh] });
    ox += cw + G;
  });
  const file = `${assets}/lids.png`;
  await sharp(buf, { raw: { width: aw, height: ah, channels: 4 } }).png({ compressionLevel: 9 }).toFile(file);
  log('saved', file, `${aw}x${ah}`, (fs.statSync(file).size / 1024).toFixed(0) + ' KB');
  return { size: [aw, ah], rects };
})();

/* ------------------------------------------------------------------ mouth and spear core */
const lip = [0, 0, 0];
{
  const px = [];
  for (let y = MOUTH.top - 4; y <= MOUTH.corners + 4; y++)
    for (let x = MOUTH.cx - 50; x <= MOUTH.cx + 50; x++) {
      const i = y * W + x;
      px.push([rgb[i * 3 + 1] * 2 - rgb[i * 3], i]); // the line is the least green, most red
    }
  px.sort((p, r) => p[0] - r[0]);
  const take = Math.round(px.length * 0.08);
  for (let k = 0; k < take; k++) for (let c = 0; c < 3; c++) lip[c] += rgb[px[k][1] * 3 + c] / take;
}
let gx = 0, gy = 0, gw = 0;
for (let y = GLOW_BOX[1]; y < GLOW_BOX[3]; y++)
  for (let x = GLOW_BOX[0]; x < GLOW_BOX[2]; x++) {
    const i = y * W + x;
    const w = sstep(190, 240, Math.min(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]));
    gx += x * w;
    gy += y * w;
    gw += w;
  }
const glow = gw ? [gx / gw / S, gy / gw / S] : [(GLOW_BOX[0] + GLOW_BOX[2]) / 2 / S, (GLOW_BOX[1] + GLOW_BOX[3]) / 2 / S];
log('lip', hex(lip), 'spear core', glow.map((v) => v.toFixed(1)).join(', '));

/* ------------------------------------------------------------------ the manifest */
let top = PH;
for (let i = 0; i < PN; i++)
  if (A1[i] > 0.5) {
    top = (i / PW) | 0;
    break;
  }
const r1 = (v) => +v.toFixed(1);
const lashHex = hex(eyes[0].lash.map((v, c) => (v + eyes[1].lash[c]) / 2));
const MOUTH_OPEN = { w: 13.5, thin: 2, drop: 10.5, inside: [58, 15, 22], tongue: [200, 98, 108] };
const manifest = {
  kind: 'relief',
  height: 1.95,
  top,
  origin: [r1(meta.footMid), r1(meta.ground)],
  eye: [1.42, 5.4],
  step: 3,
  body: { color: 'hero/body.webp', depth: 'hero/body-depth.png', ...bodyDepth, rect: bodyRect },
  head: { color: 'hero/head.webp', depth: 'hero/head-depth.png', ...headDepth, rect: headRect },
  pivot: [NECK[0], NECK[1], 0],
  lids: { map: 'hero/lids.png', size: lidsInfo.size, height: LID_HMAX / S, lash: lashHex, lashWidth: 2.4, eyes: lidsInfo.rects },
  mouth: { c: [r1(MOUTH.cx / S), r1(MOUTH.top / S)], w: MOUTH_OPEN.w, thin: MOUTH_OPEN.thin, drop: MOUTH_OPEN.drop, lip: hex(lip), inside: hex(MOUTH_OPEN.inside), tongue: hex(MOUTH_OPEN.tongue) },
  jaw: { c: [r1(MOUTH.cx / S), 283], r: [60, 27], from: r1(MOUTH.corners / S) - 2, drop: 3 },
  smile: { corners: [[r1((MOUTH.cx - MOUTH.half) / S), r1(MOUTH.corners / S)], [r1((MOUTH.cx + MOUTH.half) / S), r1(MOUTH.corners / S)]], r: 17, lift: 2.4 },
  glow: { c: glow.map(r1), r: 34, color: '#7fe6ff' },
  hair: { below: 150, sway: 1.1 },
  framing: { bust: { h: 1.3, y: 1.42, lift: 0.1 } },
};
fs.writeFileSync(`${assets}/../hero.json`, JSON.stringify(manifest, null, 2) + '\n');
// a copy: `npm run hero -- --remove` brings this hero back after a 3D model has been tried
fs.writeFileSync(`${assets}/../hero.relief.json`, JSON.stringify(manifest, null, 2) + '\n');
log('saved', `${assets}/../hero.json`);

/* ------------------------------------------------------------------ previews */
// the two layers put back together must be the cut-out again
const comp = (dx = 0, dy = 0) => {
  const out = new Uint8Array(N * 3);
  const oa = new Float32Array(N);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const sx = x - dx;
      const sy = y - dy;
      const j = sx >= 0 && sx < W && sy >= 0 && sy < H ? sy * W + sx : -1;
      const ha = j >= 0 ? headA[j] : 0;
      const ba = bodyA[i];
      const a = ha + ba * (1 - ha);
      oa[i] = a;
      for (let c = 0; c < 3; c++) out[i * 3 + c] = a > 0 ? Math.round(((j >= 0 ? headRgb[j * 3 + c] : 0) * ha + bodyRgb[i * 3 + c] * ba * (1 - ha)) / a) : 0;
    }
  return [out, oa];
};
{
  const [c0, a0] = comp();
  await savePng(`${dbg}/rest-dark.png`, c0, a0, W, H, { on: '#0b0a14', scale: 0.5 });
  await savePng(`${dbg}/rest-light.png`, c0, a0, W, H, { on: '#eef0f7', scale: 0.5 });
  let worst = 0;
  let sum = 0;
  let cnt = 0;
  for (let i = 0; i < N; i++) {
    if (A[i] < 0.999 || dBg[i] < 6) continue;
    const e = Math.abs(c0[i * 3] - rgb[i * 3]) + Math.abs(c0[i * 3 + 1] - rgb[i * 3 + 1]) + Math.abs(c0[i * 3 + 2] - rgb[i * 3 + 2]);
    if (e > worst) worst = e;
    sum += e;
    cnt++;
  }
  log('layers put together vs the cut-out (inside): mean error', (sum / cnt / 3).toFixed(3), 'worst', worst);
  const crop = [220, 0, 1100, 1300];
  await savePng(`${dbg}/body-only.png`, bodyRgb, bodyA, W, H, { on: '#ff00ff', crop, scale: 0.75 });
  await savePng(`${dbg}/head-only.png`, headRgb, headA, W, H, { on: '#ff00ff', crop, scale: 0.75 });
  for (const [name, dx, dy] of [['left-up', -64, -44], ['right-down', 64, 40]]) {
    const [c1, a1] = comp(dx, dy);
    await savePng(`${dbg}/shift-${name}.png`, c1, a1, W, H, { on: '#7a7a7a', crop: [220, 700, 1100, 600], scale: 1 });
  }
  await saveGrey(`${dbg}/depth-head.png`, hHead, PW, PH, { max: 100, scale: 2 });
  const hb = new Float32Array(PN);
  for (let i = 0; i < PN; i++) hb[i] = hBody[i] + BODY_H.back;
  await saveGrey(`${dbg}/depth-body.png`, hb, PW, PH, { max: 70, scale: 2 });
}
// eyes closed and half closed, mouth open: the same formulas the page uses
{
  const LASH = 2.4 * S;
  const draw = (close, open) => {
    const out = new Uint8Array(headRgb);
    for (const e of eyes) {
      for (let y = 0; y < e.bh; y++)
        for (let x = 0; x < e.bw; x++) {
          const k = y * e.bw + x;
          const d = (close - e.q[k]) * e.hgt[k]; // px above the lid's edge
          const a = e.mask[k] * sstep(0, 2, d);
          if (a <= 0) continue;
          const lashK = (1 - sstep(LASH * 0.35, LASH, d)) * sstep(0.08, 0.3, close) * sstep(8, 40, e.hgt[k]) * 0.92;
          const i = (y + e.by) * W + x + e.bx;
          for (let c = 0; c < 3; c++) out[i * 3 + c] = Math.round(clamp(mix(out[i * 3 + c], mix(e.lid[k * 3 + c], e.lash[c], lashK), a), 0, 255));
        }
    }
    if (open > 0.02) {
      const w = MOUTH_OPEN.w * S;
      const hgt = (MOUTH_OPEN.thin + open * MOUTH_OPEN.drop) * S;
      const cy = MOUTH.top + hgt / 2;
      for (let y = Math.round(cy - hgt); y <= cy + hgt; y++)
        for (let x = MOUTH.cx - w - 4; x <= MOUTH.cx + w + 4; x++) {
          const u = (x - MOUTH.cx) / w;
          const v = (y - cy) / (hgt / 2);
          const r = Math.hypot(u, v);
          if (r > 1.08) continue;
          const i = y * W + x;
          const tk = 1 - sstep(0.8, 1, Math.hypot(u / 0.62, (v - 0.62) / 0.5));
          const edge = sstep(0.82, 0.98, r);
          const a = 1 - sstep(1, 1.08, r);
          for (let c = 0; c < 3; c++) out[i * 3 + c] = Math.round(mix(out[i * 3 + c], mix(mix(MOUTH_OPEN.inside[c], MOUTH_OPEN.tongue[c], tk), lip[c], edge), a));
        }
    }
    return out;
  };
  const crop = [400, 600, 700, 620];
  await savePng(`${dbg}/face-closed.png`, draw(1, 0), headA, W, H, { on: '#7a7a7a', crop });
  await savePng(`${dbg}/face-half-open.png`, draw(0.5, 0.5), headA, W, H, { on: '#7a7a7a', crop });
  await savePng(`${dbg}/face-talk.png`, draw(0, 1), headA, W, H, { on: '#7a7a7a', crop });
}
log('done');
