// Cuts the character out of a picture with BiRefNet_lite (MIT), run locally with transformers.js on the CPU.
// Writes the soft mask (greyscale) and a preview on grey. The picture never leaves this machine.
// Usage: node scripts/relief/matte.mjs <in.png> <out-mask.png> [model=onnx-community/BiRefNet_lite-ONNX]   (see scripts/relief/README.md)
import { AutoModel, AutoProcessor, RawImage } from '@huggingface/transformers';
import sharp from 'sharp';

const [, , input, output, modelId = 'onnx-community/BiRefNet_lite-ONNX'] = process.argv;
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s]`, ...a);
const model = await AutoModel.from_pretrained(modelId, { dtype: 'fp32' });
const processor = await AutoProcessor.from_pretrained(modelId);
log('model ready');
const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const image = new RawImage(new Uint8ClampedArray(data), info.width, info.height, 3);
const { pixel_values } = await processor(image);
const out = await model({ input_image: pixel_values });
const tensor = out.output_image ?? Object.values(out)[0];
const mask = await RawImage.fromTensor(tensor[0].sigmoid().mul(255).to('uint8')).resize(info.width, info.height);
log('mask', mask.width + 'x' + mask.height, 'channels', mask.channels);
await sharp(Buffer.from(mask.data), { raw: { width: mask.width, height: mask.height, channels: mask.channels } }).png().toFile(output);
// preview: the cutout on mid grey
const rgba = Buffer.alloc(info.width * info.height * 4);
for (let i = 0; i < info.width * info.height; i++) {
  rgba[i * 4] = data[i * 3];
  rgba[i * 4 + 1] = data[i * 3 + 1];
  rgba[i * 4 + 2] = data[i * 3 + 2];
  rgba[i * 4 + 3] = mask.data[i * mask.channels];
}
await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } }).flatten({ background: '#7a7a7a' }).png().toFile(output.replace(/\.png$/, '-preview.png'));
log('saved', output);
process.exit(0);
