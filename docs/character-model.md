# Your hero

## The hero on your site: made from your own picture

The character in the loading screen, the intro and the lobby **is your reference picture**. Nothing was
redrawn: the picture was enlarged four times with an AI sharpener, cut out of its background, and laid
over a shaped surface, with the head and the body as separate pieces. That is why he looks exactly like
the picture, and why he can still move:

- **His head turns to your mouse** in the lobby (left, right, up, down). The face slides over a rounded
  head, an ear goes out of sight on the far side, the chin moves over the scarf.
- **He blinks**, with real eyelids and lashes.
- **He talks**: a small mouth opens and closes with the voice, and his chin drops a little with it.
- **He breathes**, his hair stirs, and the core of his spear glows (brighter while he presents your skills).
- **He greets**: a small hop, a tilt of the head and a hint of a smile when he waves.
- He appears on the pad with the scan effect, and stands in a soft shadow.

### What he cannot do

He is a picture with depth, not a model that was sculpted all the way round. So:

- He cannot turn far. His head turns about 20 degrees each way, his body only a few.
- His arms and legs do not move. His gestures are body language: a lean, a hop, a tilt of the head.
- There is no back or side view of him.

For a turn-around hero with moving arms you need a real 3D model. The site is ready for one: see
"Optional: a full 3D model" below.

### His files

| File | What it is |
| --- | --- |
| `public/models/hero.json` | Everything the page needs to know about the picture |
| `public/models/hero/body.webp`, `head.webp` | The two picture layers |
| `public/models/hero/body-depth.png`, `head-depth.png` | How far each point stands out |
| `public/models/hero/lids.png` | The closed eyelids |

Together about 430 KB. If any of them is missing or broken, the site shows the code-built knight instead,
so the page never breaks.

### Small changes you can make yourself

Open `public/models/hero.json`, change a number, save, and reload the site.

| To change | Edit |
| --- | --- |
| How tall he stands on the pad | `height` (1.95 now) |
| How wide the mouth opens when he talks | `mouth.w` (half the width) and `mouth.drop` (how far down), in picture pixels |
| The colours inside the mouth | `mouth.inside`, `mouth.tongue`, `mouth.lip` |
| How far the chin drops | `jaw.drop` |
| The smile when he greets | `smile.lift` (0 turns it off) |
| The glow on the spear | `glow.color` and `glow.r` (its size) |
| How much the hair stirs | `hair.sway` (0 turns it off) |
| How he is framed on a phone | `framing.bust` |

How far his head turns, how often he blinks and how he gestures are in
`src/components/character/relief.ts`.

### How he was built, and building him again

The files are made by the scripts in `scripts/relief/` from `scripts/relief/source.png`. Both AI steps
(sharpening and cutting out) run on your own computer; the picture is not uploaded anywhere. The steps,
and what to do for a different picture, are in `scripts/relief/README.md`.

---

## Optional: a full 3D model

The site can also show a real 3D model of your hero instead. When you add one, it replaces the picture
hero everywhere. He still materialises on the pad, plays his animations (idle, talking, waving...), turns
his head to your mouse in the lobby, holds the glowing ice spear, and speaks the intro.

You do not need this. It is here for the day you want arms that move and a hero you can turn round.

Time needed: about 20 minutes. Cost: free accounts are enough to start.

### Step 1. Prepare the picture (2 min)

1. Use the **biggest, sharpest copy** of your character picture you have. The character should be whole
   (hair to boots) and facing the camera. If the picture is small (under about 1000 px tall), enlarge it
   first with any free AI upscaler.
2. Recommended: **remove the spear** from the picture. 3D tools glue a held spear to the hand, and it
   then bends badly when he moves. The site adds its own glowing ice spear in his hand.
   - Windows 11: open the picture in **Photos**, then **Edit**, then **Erase** (generative erase). Paint
     over the spear and the shaft. **Save as copy**.
   - You can skip this. If the spear stays in the model, install it with `--glaive=none` (Step 4).

### Step 2. Make the 3D model (5 min)

1. Go to **[meshy.ai](https://www.meshy.ai)** and sign up (free). (**[tripo3d.ai](https://www.tripo3d.ai)**
   works the same way if you prefer it.)
2. Choose **Image to 3D** and upload your picture.
3. If there is a **pose** option, choose **A-pose** (or T-pose). Arms away from the body make the next
   step, rigging, work much better.
4. Generate, then keep the result that looks most like your picture, with **texture** on. Check it against
   the list below before you continue.
5. If it asks for a polycount, about **30,000 to 50,000 triangles** is plenty for a website.

**What a good result must have** (from your character brief):

- big head, compact body; round young face, serious look
- large blue eyes, thick cyan-blue eyebrows, small nose, ears showing
- big spiky white hair in separate clumps, pale blue in the shadows
- blue scarf with folds
- silver-white chest and shoulder armour with blue patterns and round cyan gems
- brown leather bracers, wide brown belt with a round cyan gem buckle
- layered white and blue panels hanging from the waist
- tall brown boots
- hands with normal fingers (reject results with melted hands or a melted face)

If the tool asks for a text prompt as well, paste this:

> Stylized young male fantasy ice warrior, chibi proportions with a large head, fair skin, big glossy blue
> eyes, thick cyan-blue eyebrows, serious determined expression, big spiky fluffy white hair with pale blue
> shadows, blue scarf, silver-white engraved armour with cyan gemstones, brown leather bracers, belt and
> tall boots, layered white and blue waist panels, polished stylized 3D game character, PBR materials,
> A-pose, full body.

### Step 3. Give him a skeleton and animations (5 min)

**Option A: in Meshy (easiest)**

1. On your model, choose **Animate** (or **Rig**). Pick **humanoid**. If it asks, place the markers
   (chin, wrists, elbows, knees).
2. Add these animations if you can. Names like these are recognised automatically:
   - an **Idle** (standing, breathing). This is the most important one.
   - **Talking**
   - **Waving**
   - optional: **Pointing**, **Greeting**/**Welcome**
3. **Download** as **GLB**, with the animations included.

Some features or downloads may need credits or a paid plan. If the animations are not available on
your free plan, download the model (FBX or GLB) and use Option B.

**Option B: Mixamo (free with an Adobe account)**

1. Go to **[mixamo.com](https://www.mixamo.com)**, then **Upload Character**. Upload the FBX (or OBJ)
   from Meshy, place the markers, then **Next**.
2. Search and download each animation as **FBX Binary**:
   - **Idle**: Skin **With Skin** (this file is the model itself)
   - **Talking**, **Waving**, **Pointing**, **Standing Greeting**: Skin **Without Skin**
3. Use the animations from the same place you rigged him (all from Mixamo, or all from Meshy).

### Step 4. Put him in your site (1 min)

Open the project in VS Code, open a terminal (**Ctrl+`**), and run one of these.

**A GLB (Option A):**

```
npm run hero -- "C:\Users\HP\Downloads\hero.glb"
```

**Mixamo FBX files (Option B):**

```
npm run hero -- "C:\Users\HP\Downloads\Idle.fbx" talk="C:\Users\HP\Downloads\Talking.fbx" wave="C:\Users\HP\Downloads\Waving.fbx" point="C:\Users\HP\Downloads\Pointing.fbx" welcome="C:\Users\HP\Downloads\Standing Greeting.fbx"
```

It copies the files to `public/models/`, makes a GLB smaller for the web (geometry and textures
compressed: usually several MB down to 1 or 2 MB), and prints what it found: the animations it will use
for idle, talking and waving, the head bone, and the hand for the spear.

Then reload the site: run `npm run dev`, or `npm run build` and then `npm start`.

A model with no skeleton also works (he stands on the pad, breathes and turns a little towards your
mouse), so you can try the model from Step 2 straight away and add the animations later.

### Fixing things

| Problem | Fix |
| --- | --- |
| He faces away from you | add `--turn=180` (or 90 / -90) to the command |
| Too big or too small next to the pad | add `--height=1.8` (default 1.95) |
| Two spears, or none | `--glaive=none` (his model has one), `--glaive=hand` (in his left hand), `--glaive=beside` (standing next to him) |
| The wrong animation for talking or waving | open `public/models/hero.json` and add `"clips": { "talk": "Exact Animation Name", "wave": "..." }` |
| Go back to the hero made from your picture | `npm run hero -- --remove` |

### Good to know

- **The mouth.** Generated models usually have no moving mouth. He talks with his body (the talking
  animation) and the voice and captions play as before. The mouth only moves if the model has a jaw bone
  or a `jawOpen` / `mouthOpen` shape key. (The picture hero's mouth does move.)
- **Size.** Keep the final `hero.glb` under about 8 MB so the site loads fast for recruiters on phones.
  The script warns you if it is too heavy. If a hero takes longer than 12 seconds to load, the site
  shows the code-built knight instead, so visitors never wait.
- **Licence.** Free-plan models from these tools can come with conditions (for example, a credit to the
  tool). Check the tool's current terms before you publish.

---

## For developers

- `public/models/hero.json` describes the hero on stage. `"kind": "relief"` is the picture hero (fields
  are documented on `ReliefManifest` in `src/components/character/relief.ts`). Otherwise it names a 3D
  model: `model` (file, or `null`), `animations` (role to file), `clips` (role to animation name),
  `height`, `rotationY` (degrees), `glaive` (`hand` | `beside` | `none`).
- `public/models/hero.relief.json` is a copy of the picture hero's description, so
  `npm run hero -- --remove` can bring him back after a model has been installed.
- Model roles: `idle`, `talk`, `wave`, `chest`, `explain`, `point`, `welcome`. A missing role borrows
  another (for example wave uses welcome, then talk, then idle).
- Code, in `src/components/character/`: `hero.ts` (what every hero has in common), `relief.ts` (the
  picture hero), `model.ts` (GLB/glTF/FBX loader and animation; meshopt-compressed GLB supported),
  `boy.ts` (the code-built knight: the fallback, loaded only when needed), `stage.ts` (`useModel` and
  `useBuiltIn`, called from `load.ts`), `glaive.ts` (the ice spear of the model and the knight).
- Scripts: `scripts/relief/` (builds the picture hero's files), `scripts/add-hero.mjs` (installs a 3D model).
