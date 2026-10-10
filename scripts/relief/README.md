# The hero made from his picture: how the files are built

The hero on the site is not modelled by hand. He is built from one picture (`source.png`, the reference
screenshot) by the four scripts in this folder. They write the files the site loads:

```
public/models/hero.json          what the page needs to know (sizes, neck, eyes, mouth, spear core)
public/models/hero.relief.json   a copy of it (lets `npm run hero -- --remove` bring this hero back)
public/models/hero/body.webp     the body layer (picture, with transparency)
public/models/hero/head.webp     the head layer
public/models/hero/body-depth.png, head-depth.png   how far each point stands out (red) and where the layer is (green)
public/models/hero/lids.png      the closed eyelids: their skin, and how each lid travels down its eye
```

The page code that draws him is `src/components/character/relief.ts`.

## Rebuilding him

You only need this if you change the picture or the measurements. The site does not need it to run.

The scripts use two packages that are not part of the site. Install them without touching `package.json`:

```
npm i --no-save sharp @huggingface/transformers
```

Then, from the project folder:

```
node scripts/relief/upscale.mjs scripts/relief/source.png relief-work/up4.png Xenova/swin2SR-realworld-sr-x4-64-bsrgan-psnr 160
node scripts/relief/matte.mjs relief-work/up4.png relief-work/mask.png
node scripts/relief/stage1.mjs
node scripts/relief/stage2.mjs
```

1. **upscale** enlarges the picture 4x with an AI model (Swin2SR), in tiles. About 7 minutes on a laptop CPU.
2. **matte** cuts the character out of the background with an AI model (BiRefNet lite). Under a minute.
3. **stage1** cleans the cut-out and paints the soles of his boots (the screenshot cuts them off).
4. **stage2** splits head and body, fills in the neck under the head, builds the height maps and the
   eyelids, and writes the files listed above. It also saves previews in `relief-work/preview/`
   (the layers, closed eyes, open mouth). Look at them before you trust a new build.

Both AI models run on this computer. They are downloaded once (about 60 MB and 180 MB) from Hugging Face.
The picture is not uploaded anywhere. `relief-work/` is scratch space: it is ignored by git and can be deleted.

## If you use a different picture

The scripts were measured for this one picture. In `stage2.mjs`, the block "what was measured in the
picture" holds every number that depends on it, in pixels of the 4x picture: the outline that separates
head from body (`HEAD_POLY`), where the jaw runs, the two eyes, the mouth line, the spear core, the neck
and the bulge of the face. `stage1.mjs` has the row where the page's white band starts (`BAND`) and the
shape of the painted soles. A new picture needs these measured again; the previews show whether they fit.
