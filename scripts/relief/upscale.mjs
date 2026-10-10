// Enlarges a picture 4x with an AI super-resolution model that runs locally (transformers.js, on the CPU).
// The model weights are downloaded once from Hugging Face; the picture never leaves this machine.
// Usage: node scripts/relief/upscale.mjs <in.png> <out.png> [model] [tile=0]   (see scripts/relief/README.md)
import { pipeline, RawImage } from '@huggingface/transformers';
import sharp from 'sharp';

const [, , input, output, model = 'Xenova/swin2SR-realworld-sr-x4-64-bsrgan-psnr', tileArg = '0'] = process.argv;
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s]`, ...a);
const up = await pipeline('image-to-image', model, { dtype: 'fp32' });
log('model ready', model);

const src = sharp(input).removeAlpha();
const meta = await src.metadata();
const tile = Number(tileArg);
const run = async (buf, w, h) => {
  const img = new RawImage(new Uint8ClampedArray(buf), w, h, 3);
  const out = await up(img);
  return out; // RawImage
};
if (!tile) {
  const { data, info } = await src.raw().toBuffer({ resolveWithObject: true });
  const out = await run(data, info.width, info.height);
  await sharp(Buffer.from(out.data), { raw: { width: out.width, height: out.height, channels: out.channels } }).png().toFile(output);
  log('saved', output, out.width + 'x' + out.height);
} else {
  // tiles with an overlap, blended with a feathered weight, so a big picture fits in memory
  const S = 4;
  const pad = 16;
  const W = meta.width;
  const H = meta.height;
  const acc = new Float32Array(W * S * H * S * 3);
  const wsum = new Float32Array(W * S * H * S);
  let n = 0;
  for (let y = 0; y < H; y += tile - pad * 2) {
    for (let x = 0; x < W; x += tile - pad * 2) {
      const x0 = Math.max(0, Math.min(x, W - tile));
      const y0 = Math.max(0, Math.min(y, H - tile));
      const tw = Math.min(tile, W - x0);
      const th = Math.min(tile, H - y0);
      const { data } = await sharp(input).removeAlpha().extract({ left: x0, top: y0, width: tw, height: th }).raw().toBuffer({ resolveWithObject: true });
      const out = await run(data, tw, th);
      for (let yy = 0; yy < out.height; yy++) {
        for (let xx = 0; xx < out.width; xx++) {
          // feather: weight falls off towards the tile's edges
          const wx = Math.min(xx + 1, out.width - xx) / (pad * S);
          const wy = Math.min(yy + 1, out.height - yy) / (pad * S);
          const wgt = Math.min(1, wx) * Math.min(1, wy) + 1e-3;
          const X = x0 * S + xx;
          const Y = y0 * S + yy;
          const k = Y * W * S + X;
          const j = (yy * out.width + xx) * out.channels;
          acc[k * 3] += out.data[j] * wgt;
          acc[k * 3 + 1] += out.data[j + 1] * wgt;
          acc[k * 3 + 2] += out.data[j + 2] * wgt;
          wsum[k] += wgt;
        }
      }
      n++;
      log('tile', n, `${x0},${y0}`);
      if (x0 + tw >= W) break;
    }
    if (Math.max(0, Math.min(y, H - tile)) + Math.min(tile, H) >= H) break;
  }
  const outBuf = Buffer.alloc(W * S * H * S * 3);
  for (let k = 0; k < W * S * H * S; k++) {
    outBuf[k * 3] = Math.max(0, Math.min(255, Math.round(acc[k * 3] / wsum[k])));
    outBuf[k * 3 + 1] = Math.max(0, Math.min(255, Math.round(acc[k * 3 + 1] / wsum[k])));
    outBuf[k * 3 + 2] = Math.max(0, Math.min(255, Math.round(acc[k * 3 + 2] / wsum[k])));
  }
  await sharp(outBuf, { raw: { width: W * S, height: H * S, channels: 3 } }).png().toFile(output);
  log('saved', output, W * S + 'x' + H * S);
}
process.exit(0);
