// The 3D hero: Deepak's avatar, a young ice knight drawn after his reference picture: big white spiky hair,
// bold blue brows, teal eyes, a blue scarf, silver armour with a blue enamel chevron and two cyan gems, layered
// pauldrons, teal sleeves under brown leather bracers, a brown belt with a round bronze buckle, plate tassets
// over a tan skirt with a blue hem, teal trousers, tall brown boots, and an ice glaive on a wooden shaft.
// Built from code (no model files to download), with a small skeleton so he can blink, look at the pointer,
// wave, gesture and talk (the mouth follows the voice, see lib/voice.ts).
//
// Look: the polished "game studio" cartoon style. Smooth sculpted shapes (high segment counts, averaged
// normals), soft physically based shading with a reflective environment, real shadows and coloured rim
// lights (set up in stage.ts). Proportions are "chibi": a big head so the face (and the talking) reads at
// any size.
//
// Axes: y is up, he faces +z (towards the camera), so his right hand is on -x (the viewer's left).

import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { MouthShape } from '@/lib/voice';
import { TAU, bake, loft, makeHead, paint, rbox, smoothLathe, sphere, taper } from './geometry';
import { createGlaive } from './glaive';
import type { BoyApi, Pose, Theme } from './hero';
import { FACE, chestTexture, irisTexture, pauldronTexture, skinTexture } from './textures';

/* ------------------------------------------------------------------ colours */

/** His own colours: the same in both themes (from the reference picture). */
const C = {
  skin: '#f9dccb',
  skinDark: '#e7a796', // inside the ears
  nose: '#f2bca8',
  hairRoot: '#9cc4ec',
  hairMid: '#e2f0ff',
  hairTip: '#ffffff',
  brow: '#4a90d8',
  lash: '#1b2440',
  lip: '#d98078',
  mouth: '#3a1018',
  teeth: '#fbf6f0',
  tongue: '#e0707e',
  scarf: '#3b8ce4',
  scarfLight: '#66b0f8',
  plate: '#dfe9f6', // silver-white armour
  enamel: '#4693e0', // blue enamel inlay
  enamelLight: '#cfe6ff',
  enamelDark: '#2c6cc0',
  sleeve: '#2f88bb', // teal undershirt
  pants: '#2a76a3',
  leather: '#7a4a2a',
  leatherDark: '#58331b',
  bronze: '#c38b4c',
  gem: '#5ee3ff',
  cloth: '#a87c55', // tan cloth under the plates
  sole: '#4a2e1c',
};

/* ------------------------------------------------------------------ small helpers */

const D2R = Math.PI / 180;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = THREE.MathUtils.lerp;
/** Frame-rate independent smoothing: moves `cur` towards `target`; `lambda` is how snappy (per second). */
const damp = (cur: number, target: number, lambda: number, dt: number) => target + (cur - target) * Math.exp(-lambda * Math.max(0, dt));

/** Small seeded random numbers, so he looks the same on every load. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A flat shape given as points, extruded into a thin plate (indexed, so it can be merged with other parts). */
function plate(pts: [number, number][], depth: number, bevel = 0) {
  const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 8,
  });
  return mergeVertices(g, 1e-5);
}

/* ------------------------------------------------------------------ the torso's shape (shared by the mesh and its texture) */

const TORSO: [number, number][] = [
  [0.0, -0.02], [0.14, -0.02], [0.178, 0.02], [0.196, 0.1], [0.21, 0.2], [0.212, 0.28], [0.186, 0.34], [0.106, 0.378], [0.0, 0.388],
];
const TORSO_SAMPLES = 48;
const TORSO_DEPTH = 0.78; // front to back, relative to side to side
const torsoPts = new THREE.SplineCurve(TORSO.map(([x, y]) => new THREE.Vector2(x, y)))
  .getPoints(TORSO_SAMPLES)
  .map((p) => new THREE.Vector2(Math.max(0, p.x), p.y));
/** Row (as the texture's v) and radius of the torso at height y. */
function torsoAt(y: number) {
  for (let j = 0; j < torsoPts.length - 1; j++) {
    const a = torsoPts[j];
    const b = torsoPts[j + 1];
    if (b.y <= a.y + 1e-6) continue;
    if (y >= a.y && y <= b.y) {
      const f = (y - a.y) / (b.y - a.y);
      return { v: (j + f) / TORSO_SAMPLES, r: a.x + (b.x - a.x) * f };
    }
  }
  return y < torsoPts[0].y ? { v: 0, r: torsoPts[1].x } : { v: 1, r: 0 };
}
/** Texture coordinates of the point (x, y) on the front of the torso (its seam is at the back). */
const torsoUV = (x: number, y: number): [number, number] => {
  const { v, r } = torsoAt(y);
  return [0.5 + Math.asin(clamp(x / Math.max(r, 1e-4), -1, 1)) / TAU, v];
};
/** How far forward the torso's surface is at (x, y). */
const torsoFrontZ = (x: number, y: number) => {
  const { r } = torsoAt(y);
  return TORSO_DEPTH * Math.sqrt(Math.max(0, r * r - x * x));
};

/* ------------------------------------------------------------------ poses */

interface ArmPose {
  sh: [number, number, number];
  el: [number, number, number];
  wr: [number, number, number];
  /** Curl of thumb, index, middle, ring, little finger: 0 straight, 1 fully curled. */
  fingers: number[];
}
interface BodyPose {
  r: ArmPose;
  l: ArmPose;
  head?: [number, number, number];
  smile?: number;
  brow?: number;
}

const FIST = [0.55, 0.8, 0.86, 0.9, 0.94];
const OPEN = [0.06, 0.04, 0.04, 0.06, 0.1];
const POINT = [0.5, 0.0, 0.92, 0.95, 0.95];
const GRIP = [0.9, 0.95, 1.0, 1.0, 1.0];
const arm = (sh: ArmPose['sh'], el: ArmPose['el'] = [0, 0, 0], wr: ArmPose['wr'] = [0, 0, 0], fingers = FIST): ArmPose => ({ sh, el, wr, fingers });

const REST = arm([5, 0, -10], [-18, 0, 0], [0, 0, 4]);
// his left hand always holds the glaive, planted beside him
const HOLD = arm([-6, 0, -30], [-40, 0, 0], [-44, -30, 0], GRIP);

// He is a serious, determined young knight (as in the picture): a calm face at rest, smiles while greeting.
const POSES: Record<Pose, BodyPose> = {
  idle: { r: REST, l: HOLD, smile: 0.05 },
  // right arm up and out, palm to the viewer
  wave: { r: arm([-14, 0, -100], [0, 0, -46], [0, -90, 0], OPEN), l: HOLD, head: [0, 0, -5], smile: 0.85, brow: 0.6 },
  // right hand on his chest: "I'm Deepak"
  chest: { r: arm([-40, 39, 19], [-89, -13, 0], [-17, -18, 26], [0.12, 0.1, 0.12, 0.16, 0.2]), l: HOLD, head: [3, 0, 3], smile: 0.55, brow: 0.2 },
  // right hand out, palm up: explaining
  explain: { r: arm([-58, -10, 0], [-48, -41, -6], [14, -38, -5], OPEN), l: HOLD, smile: 0.45, brow: 0.35 },
  // arm out to the side, pointing
  point: { r: arm([-10, 0, -82], [-10, 0, 0], [0, -10, 0], POINT), l: HOLD, head: [0, 0, 4], smile: 0.5, brow: 0.3 },
  // arm open wide: welcome
  welcome: { r: arm([-57, -2, -29], [-58, 2, -44], [14, -25, -20], OPEN), l: HOLD, head: [-4, 0, 0], smile: 0.85, brow: 0.5 },
};

/* ------------------------------------------------------------------ the character */

interface Hand {
  root: THREE.Group;
  pn: number; // palm normal along x (+1 for the right hand)
  fingers: { root: THREE.Group; j2: THREE.Group }[];
  thumb: { root: THREE.Group; j2: THREE.Group };
}
interface Arm {
  pad: THREE.Group; // the pauldron: follows the arm only a little, like a real shoulder plate
  sh: THREE.Group;
  el: THREE.Group;
  wr: THREE.Group;
  hand: Hand;
  side: 1 | -1; // +1 = his left (x+), -1 = his right (x-)
}
interface Eye {
  gaze: THREE.Group;
  lid: THREE.Group;
}

export function createBoy(initial: Theme = 'dark'): BoyApi {
  /* ------------ bookkeeping */
  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 10); // hides everything above it while he materialises
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const texs: THREE.Texture[] = [];
  const track = <G extends THREE.BufferGeometry>(g: G): G => {
    geos.push(g);
    return g;
  };
  const clipped = <M extends THREE.Material>(m: M): M => {
    m.clippingPlanes = [clip];
    m.clipShadows = true;
    mats.push(m);
    return m;
  };
  const std = (color: string, roughness = 0.6, extra: THREE.MeshStandardMaterialParameters = {}) =>
    clipped(new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...extra }));
  const phys = (color: string, roughness = 0.4, extra: THREE.MeshPhysicalMaterialParameters = {}) =>
    clipped(new THREE.MeshPhysicalMaterial({ color, roughness, metalness: 0, ...extra }));
  const basic = (color: string, extra: THREE.MeshBasicMaterialParameters = {}) => clipped(new THREE.MeshBasicMaterial({ color, toneMapped: false, ...extra }));

  /** A mesh that casts and receives shadows. Marked so a bone's rigid parts can be merged later. */
  const part = (geo: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh => {
    track(geo);
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData.part = true;
    return m;
  };
  const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number): T => {
    o.position.set(x, y, z);
    return o;
  };
  /**
   * Rigid parts of one bone are merged into one mesh per material: the same picture for far fewer draw
   * calls. `deep` also takes parts of the groups below it (only for groups that never move inside).
   */
  const fuse = (bone: THREE.Object3D, deep = false) => {
    bone.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(bone.matrixWorld).invert();
    const found: THREE.Mesh[] = [];
    if (deep) {
      bone.traverse((o) => {
        if (o !== bone && o instanceof THREE.Mesh && o.userData.part) found.push(o);
      });
    } else {
      for (const c of bone.children) if (c instanceof THREE.Mesh && c.userData.part) found.push(c);
    }
    const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
    for (const m of found) {
      const list = buckets.get(m.material as THREE.Material) ?? [];
      list.push(m.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld)));
      buckets.set(m.material as THREE.Material, list);
      m.geometry.dispose();
      m.parent?.remove(m);
    }
    for (const [mat, list] of buckets) {
      const merged = list.length === 1 ? list[0] : mergeGeometries(list, false);
      if (!merged) throw new Error('hero: could not merge parts');
      if (list.length > 1) list.forEach((g) => g.dispose());
      bone.add(part(merged, mat));
    }
  };
  const torus = (R: number, tube: number, arc = TAU) => track(new THREE.TorusGeometry(R, tube, 18, 56, arc).rotateX(Math.PI / 2));

  /* ------------ materials */
  const skinMap = skinTexture(C.skin);
  const irisMap = irisTexture();
  const chestMap = chestTexture(torsoUV);
  const padMap = pauldronTexture();
  texs.push(skinMap, irisMap, chestMap, padMap);

  const metal = { metalness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.2 };
  const enamel = { metalness: 0.25, clearcoat: 0.85, clearcoatRoughness: 0.12 };
  const skinSheen = { sheen: 0.6, sheenColor: new THREE.Color('#ffc4b4'), sheenRoughness: 0.5 };
  const M = {
    head: phys('#ffffff', 0.55, { map: skinMap, ...skinSheen }),
    skin: phys(C.skin, 0.56, skinSheen),
    skinDark: std(C.skinDark, 0.7),
    nose: phys(C.nose, 0.5, skinSheen),
    lid: phys(C.skin, 0.55, skinSheen),
    lowerLid: phys('#ffeadf', 0.55, skinSheen), // lighter: it faces down, away from the light
    rim: std('#e2a994', 0.6),
    hair: phys('#ffffff', 0.4, { vertexColors: true, clearcoat: 0.3, clearcoatRoughness: 0.35, sheen: 1, sheenColor: new THREE.Color('#e8f3ff'), sheenRoughness: 0.45 }),
    brow: std(C.brow, 0.6),
    lash: std(C.lash, 0.5),
    sclera: phys('#eef3fb', 0.3, { clearcoat: 0.6, clearcoatRoughness: 0.1 }),
    iris: clipped(
      new THREE.MeshStandardMaterial({
        map: irisMap,
        roughness: 0.5,
        envMapIntensity: 0.25,
        emissiveMap: irisMap,
        emissive: new THREE.Color('#ffffff'),
        emissiveIntensity: 0.22,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    ),
    catch: basic('#ffffff'),
    mouth: basic(C.mouth, { side: THREE.DoubleSide }),
    lipMat: std(C.lip, 0.5, { side: THREE.DoubleSide }),
    teeth: basic(C.teeth, { side: THREE.DoubleSide }),
    tongue: basic(C.tongue, { side: THREE.DoubleSide }),
    chest: phys('#ffffff', 0.3, { map: chestMap, ...metal }),
    pauldron: phys('#ffffff', 0.3, { map: padMap, ...metal }),
    plate: phys(C.plate, 0.3, metal),
    enamel: phys(C.enamel, 0.3, enamel),
    enamelLight: phys(C.enamelLight, 0.3, enamel),
    enamelDark: phys(C.enamelDark, 0.3, enamel),
    sleeve: std(C.sleeve, 0.75),
    pants: std(C.pants, 0.78),
    leather: std(C.leather, 0.6),
    leatherDark: std(C.leatherDark, 0.65),
    bronze: std(C.bronze, 0.3, { metalness: 0.9 }),
    gem: phys(C.gem, 0.08, { emissive: new THREE.Color(C.gem), emissiveIntensity: 0.55, clearcoat: 1, clearcoatRoughness: 0.05 }),
    cloth: std(C.cloth, 0.85),
    scarf: std('#ffffff', 0.85, { vertexColors: true }),
    scarfTail: std('#ffffff', 0.85, { vertexColors: true, side: THREE.DoubleSide }),
    sole: std(C.sole, 0.7),
  };

  const root = new THREE.Group();
  root.name = 'hero';
  const body = new THREE.Group();
  root.add(body);

  /* ------------ legs and tall leather boots */
  const legs: { hip: THREE.Group; knee: THREE.Group; ankle: THREE.Group; side: number }[] = [];
  for (const side of [-1, 1] as const) {
    const hip = at(new THREE.Group(), side * 0.1, 0.62, 0);
    body.add(hip);
    hip.add(part(taper(0.094, 0.078, 0.25), M.pants));
    const knee = at(new THREE.Group(), 0, -0.25, 0);
    hip.add(knee);
    knee.add(part(taper(0.078, 0.064, 0.25), M.pants));
    const ankle = at(new THREE.Group(), 0, -0.25, 0);
    knee.add(ankle);
    // the boot: a leather shaft up the shin with a folded cuff and a bronze-buckled strap, a dark sole
    ankle.add(at(part(new THREE.CylinderGeometry(0.082, 0.072, 0.2, 32), M.leather), 0, 0.1, 0));
    ankle.add(at(part(torus(0.087, 0.022), M.leatherDark), 0, 0.2, 0));
    ankle.add(at(part(torus(0.079, 0.008), M.leatherDark), 0, 0.09, 0));
    ankle.add(at(part(rbox(0.026, 0.022, 0.012, 0.004), M.bronze), side * 0.03, 0.09, 0.077));
    ankle.add(at(part(bake(sphere(1, 40, 28), 0.076, 0.068, 0.168), M.leather), 0, -0.03, 0.062));
    ankle.add(at(part(bake(sphere(1, 36, 24), 0.074, 0.082, 0.09), M.leather), 0, -0.012, -0.03));
    ankle.add(at(part(rbox(0.152, 0.04, 0.318, 0.018), M.sole), 0, -0.098, 0.05));
    hip.rotation.y = side * 0.12;
    fuse(hip);
    fuse(knee);
    fuse(ankle);
    legs.push({ hip, knee, ankle, side });
  }

  /* ------------ pelvis: tan skirt with a blue jagged hem, plate tassets, a blue front flap */
  const pelvis = at(new THREE.Group(), 0, 0.6, 0);
  body.add(pelvis);
  pelvis.add(part(bake(sphere(1, 36, 24), 0.19, 0.12, 0.14), M.pants));
  const skirt = new THREE.Group();
  pelvis.add(skirt);
  {
    skirt.add(part(bake(smoothLathe([[0.25, -0.19], [0.232, -0.12], [0.212, -0.05], [0.196, 0.0], [0.186, 0.045]], 64, 20), 1, 1, 0.82), M.cloth));
    // the hem: a ring of small blue points
    const tri = plate([[-0.03, 0], [0.03, 0], [0, -0.06]], 0.006);
    for (let k = 0; k < 28; k++) {
      const a = (k / 28) * TAU;
      const p = new THREE.Group();
      p.position.set(Math.sin(a) * 0.25, -0.18, Math.cos(a) * 0.205);
      p.rotation.order = 'YXZ';
      p.rotation.set(-0.32, a, 0);
      p.add(part(tri.clone(), M.enamel));
      skirt.add(p);
    }
    tri.dispose();
    // the tassets: twelve silver plates with a blue stripe, the front one a longer blue flap
    const w = 0.108;
    const h = 0.165;
    const pt = 0.05;
    const slab = plate([[-w / 2, 0], [w / 2, 0], [w / 2, -h], [0, -h - pt], [-w / 2, -h]], 0.01, 0.003);
    const stripe = plate([[-0.016, -0.02], [0.016, -0.02], [0.016, -h + 0.004], [0, -h - pt + 0.03], [-0.016, -h + 0.004]], 0.003);
    const fw = 0.13;
    const fh = 0.235;
    const flap = plate([[-fw / 2, 0], [fw / 2, 0], [fw / 2, -fh], [0, -fh - 0.06], [-fw / 2, -fh]], 0.012, 0.003);
    const flapEdge = plate([[-fw / 2 - 0.008, 0], [fw / 2 + 0.008, 0], [fw / 2 + 0.008, -fh - 0.004], [0, -fh - 0.072], [-fw / 2 - 0.008, -fh - 0.004]], 0.008, 0.002);
    const diamond = (cy: number, rx: number, ry: number) => plate([[0, cy + ry], [rx, cy], [0, cy - ry], [-rx, cy]], 0.004);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * TAU;
      const front = k === 0;
      const lift = k % 2 ? 0.006 : 0; // every other plate overlaps its neighbours
      const p = new THREE.Group();
      p.position.set(Math.sin(a) * (0.214 + lift), 0.05, Math.cos(a) * (0.176 + lift) + (front ? 0.012 : 0));
      p.rotation.order = 'YXZ';
      p.rotation.set(front ? -0.2 : -0.26, a, 0);
      if (front) {
        p.add(at(part(flapEdge.clone(), M.plate), 0, 0, -0.004));
        p.add(part(flap.clone(), M.enamel));
        p.add(at(part(diamond(-0.12, 0.034, 0.06), M.enamelLight), 0, 0, 0.016));
        p.add(at(part(diamond(-0.12, 0.016, 0.03), M.enamelDark), 0, 0, 0.0205));
        p.add(at(part(diamond(-0.035, 0.022, 0.022), M.enamelLight), 0, 0, 0.016));
      } else {
        p.add(part(slab.clone(), M.plate));
        p.add(at(part(stripe.clone(), M.enamel), 0, 0, 0.0135));
      }
      skirt.add(p);
    }
    [slab, stripe, flap, flapEdge].forEach((g) => g.dispose());
  }
  fuse(skirt, true);

  const spine = at(new THREE.Group(), 0, 0.03, 0);
  pelvis.add(spine);
  const chest = new THREE.Group();
  spine.add(chest);

  /* ------------ torso: the chest plate (painted: blue chevron, engravings), belt, buckle, gems, scarf */
  chest.add(part(bake(smoothLathe(TORSO, 64, TORSO_SAMPLES).rotateY(Math.PI), 1, 1, TORSO_DEPTH), M.chest));
  chest.add(at(part(bake(torus(0.19, 0.032), 1, 1, 0.8), M.leather), 0, 0.012, 0)); // belt
  {
    // round bronze buckle with a cyan gem
    const z = 0.8 * 0.19 + 0.03;
    chest.add(at(part(new THREE.CylinderGeometry(0.047, 0.047, 0.022, 36).rotateX(Math.PI / 2), M.bronze), 0, 0.012, z));
    chest.add(at(part(new THREE.TorusGeometry(0.044, 0.007, 12, 40), M.bronze), 0, 0.012, z + 0.012));
    chest.add(at(part(bake(sphere(0.027, 28, 20), 1, 1, 0.65), M.gem), 0, 0.012, z + 0.014));
    // a pouch on his right hip
    chest.add(at(part(rbox(0.062, 0.072, 0.046, 0.018), M.leatherDark), -0.165, -0.005, 0.095));
    chest.add(at(part(bake(sphere(0.009, 12, 8), 1, 1, 0.6), M.bronze), -0.165, 0.012, 0.12));
  }
  // two cyan gems in bronze settings high on the chest, where the scarf meets the pauldrons
  for (const side of [-1, 1] as const) {
    const x = side * 0.1;
    const y = 0.305;
    const z = torsoFrontZ(x, y) + 0.006;
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = side * 0.45; // facing out along the chest's curve
    g.add(part(new THREE.CylinderGeometry(0.026, 0.026, 0.012, 32).rotateX(Math.PI / 2), M.bronze));
    g.add(at(part(bake(sphere(0.019, 24, 16), 1, 1, 0.7), M.gem), 0, 0, 0.007));
    chest.add(g);
  }
  // the scarf: a thick, soft blue roll round the neck, sagging a little at the front, with fold shading
  {
    const scarf = new THREE.TorusGeometry(0.155, 0.08, 24, 80).rotateX(Math.PI / 2);
    const p = scarf.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const a = Math.atan2(x, z); // 0 at the front
      const k = 1 + 0.035 * Math.sin(a * 6 + 0.4) + 0.015 * Math.sin(a * 15 + 1.3);
      const sag = -0.05 * Math.max(0, Math.cos(a)) ** 2;
      p.setXYZ(i, x * k, p.getY(i) * (1 + 0.14 * Math.sin(a * 5 + 0.6)) + sag, z * k);
    }
    scarf.computeVertexNormals();
    const c0 = new THREE.Color(C.scarf);
    const c1 = new THREE.Color(C.scarfLight);
    paint(scarf, (x, y, z, c) => {
      const a = Math.atan2(x, z);
      c.copy(c0).lerp(c1, clamp(0.5 + 0.5 * Math.sin(a * 6 + 0.4) + y * 3, 0, 1) * 0.55);
    });
    chest.add(at(part(bake(scarf, 1, 0.95, 0.88), M.scarf), 0, 0.356, 0.0));
  }
  fuse(chest);

  /* ------------ the scarf's long end: a cloth strip hanging down his back from behind his left shoulder */
  const TU = 8;
  const TV = 18;
  const tailGeo = track(new THREE.BufferGeometry());
  const tailPos = new Float32Array((TU + 1) * (TV + 1) * 3);
  {
    const idx: number[] = [];
    const uv: number[] = [];
    const col = new Float32Array((TU + 1) * (TV + 1) * 3);
    const c0 = new THREE.Color(C.scarf);
    const c1 = new THREE.Color(C.scarfLight);
    const c = new THREE.Color();
    for (let iy = 0; iy <= TV; iy++) {
      const v = iy / TV;
      for (let ix = 0; ix <= TU; ix++) {
        const k = iy * (TU + 1) + ix;
        uv.push(ix / TU, 1 - v);
        c.copy(c0).lerp(c1, 0.25 + 0.35 * Math.sin(ix * 0.9 + v * 6) ** 2);
        col.set([c.r, c.g, c.b], k * 3);
      }
    }
    for (let iy = 0; iy < TV; iy++) {
      for (let ix = 0; ix < TU; ix++) {
        const a = iy * (TU + 1) + ix;
        const b = a + TU + 1;
        idx.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
    tailGeo.setAttribute('position', new THREE.BufferAttribute(tailPos, 3).setUsage(THREE.DynamicDrawUsage));
    tailGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    tailGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    tailGeo.setIndex(idx);
  }
  const writeTail = (t: number, sway: number) => {
    for (let iy = 0; iy <= TV; iy++) {
      const v = iy / TV;
      const w = lerp(0.12, 0.165, v);
      const cx = 0.07 + 0.08 * v; // drifts out over his left side as it falls
      for (let ix = 0; ix <= TU; ix++) {
        const u = ix / TU - 0.5;
        const wob = Math.sin(t * 1.9 + v * 5.2 + u * 2.6) * 0.018 * v * v + Math.sin(t * 1.1 + u * 4) * 0.008 * v;
        const k = (iy * (TU + 1) + ix) * 3;
        tailPos[k] = cx + u * w + Math.sin(t * 1.3 + v * 3) * 0.012 * v;
        tailPos[k + 1] = lerp(0.36, -0.12, v);
        tailPos[k + 2] = -0.175 - 0.15 * Math.pow(v, 1.25) - 0.9 * (u * w) ** 2 + wob + sway * v * v * 0.18;
      }
    }
    (tailGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    tailGeo.computeVertexNormals();
    tailGeo.computeBoundingSphere();
  };
  writeTail(0, 0);
  const tailMesh = new THREE.Mesh(tailGeo, M.scarfTail);
  tailMesh.castShadow = true;
  tailMesh.receiveShadow = true;
  tailMesh.frustumCulled = false;
  chest.add(tailMesh);

  /* ------------ arms and hands */
  const buildHand = (side: 1 | -1): Hand => {
    const hand = new THREE.Group();
    const pn = -side; // the palm faces his body: +x for the right hand
    hand.add(at(part(rbox(0.042, 0.074, 0.074, 0.019), M.skin), 0, -0.04, 0));
    const lens = [0.037, 0.041, 0.038, 0.031];
    const zs = [0.027, 0.009, -0.009, -0.027];
    const fingers = lens.map((L, i) => {
      const r = at(new THREE.Group(), pn * 0.002, -0.076, zs[i]);
      r.add(part(taper(0.0118, 0.0106, L * 0.55, 16), M.skin));
      const j2 = at(new THREE.Group(), 0, -L * 0.55, 0);
      j2.add(part(taper(0.0106, 0.0092, L * 0.45, 16), M.skin));
      r.add(j2);
      hand.add(r);
      return { root: r, j2 };
    });
    const tr = at(new THREE.Group(), pn * 0.006, -0.03, 0.04);
    tr.rotation.x = -0.7;
    tr.add(part(taper(0.0138, 0.0122, 0.03, 16), M.skin));
    const tj = at(new THREE.Group(), 0, -0.03, 0);
    tj.add(part(taper(0.0122, 0.0106, 0.026, 16), M.skin));
    tr.add(tj);
    hand.add(tr);
    return { root: hand, pn, fingers, thumb: { root: tr, j2: tj } };
  };
  const setFingers = (h: Hand, f: number[]) => {
    h.thumb.root.rotation.z = h.pn * f[0] * 0.9;
    h.thumb.j2.rotation.z = h.pn * f[0] * 0.8;
    h.fingers.forEach((fg, i) => {
      fg.root.rotation.z = h.pn * f[i + 1] * 1.25;
      fg.j2.rotation.z = h.pn * f[i + 1] * 1.2;
    });
  };

  const arms: Arm[] = [];
  for (const side of [1, -1] as const) {
    const sh = at(new THREE.Group(), side * 0.222, 0.315, 0);
    chest.add(sh);
    sh.add(part(taper(0.062, 0.054, 0.19, 28), M.sleeve));
    // pauldron: two layered silver plates with blue rims and scrolls, and a cyan gem
    const pad = at(new THREE.Group(), side * 0.222, 0.315, 0);
    chest.add(pad);
    const dome = (sx: number, sy: number, sz: number) => bake(new THREE.SphereGeometry(1, 44, 24, 0, TAU, 0, Math.PI * 0.5), sx, sy, sz);
    pad.add(at(part(dome(0.138, 0.095, 0.128), M.pauldron), side * 0.014, 0.032, 0));
    const lower = part(dome(0.128, 0.07, 0.118), M.pauldron);
    lower.position.set(side * 0.04, -0.012, 0);
    lower.rotation.z = side * -0.42;
    pad.add(lower);
    pad.add(at(part(bake(torus(0.136, 0.007), 1, 1, 0.93), M.plate), side * 0.014, 0.032, 0));
    pad.add(at(part(bake(sphere(0.022, 20, 14), 1, 1, 0.75), M.gem), side * 0.07, 0.115, 0.045));
    fuse(pad);
    const el = at(new THREE.Group(), 0, -0.19, 0);
    sh.add(el);
    el.add(part(taper(0.054, 0.047, 0.17, 28), M.sleeve));
    // brown leather bracer with bronze-edged straps
    el.add(at(part(taper(0.061, 0.055, 0.12, 28), M.leather), 0, -0.035, 0));
    el.add(at(part(torus(0.06, 0.008), M.leatherDark), 0, -0.05, 0));
    el.add(at(part(torus(0.057, 0.008), M.leatherDark), 0, -0.13, 0));
    el.add(at(part(torus(0.062, 0.006), M.bronze), 0, -0.035, 0));
    const wr = at(new THREE.Group(), 0, -0.185, 0);
    el.add(wr);
    const hand = buildHand(side);
    wr.add(hand.root);
    fuse(sh);
    fuse(el);
    arms.push({ pad, sh, el, wr, hand, side });
  }
  const armR = arms.find((a) => a.side === -1)!;
  const armL = arms.find((a) => a.side === 1)!;

  // his left hand is a fixed fist: curl it once and fuse it into one mesh
  setFingers(armL.hand, GRIP);
  fuse(armL.hand.root, true);

  /* ------------ the ice glaive (held in his left fist, standing beside him; see glaive.ts) */
  const glaive = createGlaive([clip]);
  const staff = glaive.group;
  staff.position.set(armL.hand.pn * 0.037, -0.072, 0);
  staff.rotation.x = Math.PI / 2; // the shaft (y) runs along the hand's z, which is "up" when the forearm is level
  armL.hand.root.add(staff);

  /* ------------ neck + head */
  const neck = at(new THREE.Group(), 0, 0.37, 0);
  spine.add(neck);
  neck.add(part(taper(0.07, 0.078, 0.07, 24), M.skin));

  const R = 0.33;
  const headRoot = at(new THREE.Group(), 0, 0.29, 0.01);
  neck.add(headRoot);
  const headGeo = makeHead(R);
  headRoot.add(part(headGeo, M.head));

  // Face features are placed by firing rays at a copy of the head that sits at the origin.
  const probe = new THREE.Mesh(headGeo);
  probe.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  const onFace = (d: THREE.Vector3, lift = 0) => {
    const dir = d.clone().normalize();
    ray.set(dir.clone().multiplyScalar(2), dir.clone().negate());
    const hit = ray.intersectObject(probe, false)[0];
    const pos = hit ? hit.point.clone() : dir.clone().multiplyScalar(R);
    const n = hit?.face ? hit.face.normal.clone().lerp(dir, 0.6).normalize() : dir;
    return { position: pos.addScaledVector(n, lift), normal: n };
  };

  // round ears that stick out a little, pink inside
  for (const side of [-1, 1] as const) {
    const e = onFace(new THREE.Vector3(side, -0.1, -0.04));
    const ear = new THREE.Group();
    ear.position.copy(e.position).addScaledVector(e.normal, 0.004);
    ear.rotation.set(0, side * 0.5, side * -0.08);
    ear.add(part(bake(sphere(0.072, 28, 18), 0.46, 1, 0.76), M.skin));
    ear.add(at(part(bake(sphere(0.047, 24, 16), 0.36, 0.78, 0.58), M.skinDark), side * 0.016, -0.004, 0.01));
    headRoot.add(ear);
  }
  // a small round nose with a pink tip
  {
    const n = onFace(FACE.nose, -0.006);
    headRoot.add(at(part(bake(sphere(0.027, 24, 18), 1, 0.85, 1.05), M.nose), n.position.x, n.position.y, n.position.z));
  }

  /* ------------ eyes: big glossy eyeballs, a dark lash line on the lid, the lid comes down to blink */
  const re = 0.088; // eyeball radius
  const sink = 0.05; // how far its centre is below the skin
  const sy = 1.06; // a little taller than wide
  const eyes: Eye[] = [];
  const ellipsoidZ = (x: number, y: number, r: number) => r * Math.sqrt(Math.max(0, 1 - (x / r) ** 2 - (y / (r * sy)) ** 2));
  for (const side of [-1, 1] as const) {
    const f = onFace(FACE.eye(side));
    const socket = new THREE.Group(); // sits on the skin, its z axis along the surface normal
    socket.position.copy(f.position);
    socket.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), f.normal);
    headRoot.add(socket);

    const ballRoot = new THREE.Group(); // undoes the socket's tilt: the eyes always look straight ahead
    ballRoot.position.set(0, 0, -sink);
    ballRoot.quaternion.copy(socket.quaternion).invert();
    socket.add(ballRoot);
    const gaze = new THREE.Group();
    ballRoot.add(gaze);

    gaze.add(part(bake(sphere(re, 48, 36), 1, sy, 1), M.sclera));
    // the iris: a disc laid on the front of the eyeball (sized like the picture's: white shows round it)
    const ri = 0.061;
    const irisGeo = track(new THREE.RingGeometry(0, ri, 64, 14)); // many rings, so it can follow the curve of the eyeball
    {
      const p = irisGeo.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, ellipsoidZ(p.getX(i), p.getY(i), re) + 0.0012);
      p.needsUpdate = true;
      irisGeo.computeVertexNormals();
    }
    gaze.add(new THREE.Mesh(irisGeo, M.iris));
    // a fixed catchlight on the cornea (it stays put while the eye turns, like a real reflection)
    const cx = 0.02;
    const cy = 0.026;
    const catchGeo = track(new THREE.RingGeometry(0, 0.0135, 28, 4));
    {
      const p = catchGeo.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, ellipsoidZ(p.getX(i) + cx, p.getY(i) + cy, re * 1.04) - ellipsoidZ(cx, cy, re * 1.04));
      p.needsUpdate = true;
      catchGeo.computeVertexNormals();
    }
    const catchlight = new THREE.Mesh(catchGeo, M.catch);
    catchlight.position.set(cx, cy, ellipsoidZ(cx, cy, re * 1.04));
    ballRoot.add(catchlight);

    // the rim of the eye socket: a soft ring of skin hides the hard edge where the eyeball meets the face
    const ringR = re * 0.86;
    const ring = part(bake(new THREE.TorusGeometry(ringR, 0.008, 14, 56), 1, sy, 0.7), M.rim);
    ring.position.z = -0.007;
    socket.add(ring);
    // the upper lid: a skin-coloured dome over the top of the eyeball with a dark lash line on its edge. It
    // rests just over the top of the iris and tilts down towards the nose (a determined look), and swings
    // down to blink.
    const lid = new THREE.Group();
    lid.rotation.z = side * 0.16;
    ballRoot.add(lid);
    const lidR = re * 1.08;
    lid.add(part(bake(new THREE.SphereGeometry(lidR, 44, 24, 0, TAU, 0, Math.PI * 0.5), 1, sy, 1), M.lid));
    {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 18; i++) {
        const a = (i / 18) * Math.PI;
        pts.push(new THREE.Vector3(Math.cos(a) * (lidR + 0.001), 0.001, Math.sin(a) * (lidR + 0.001) * 1.0));
      }
      lid.add(part(loft(pts, (t) => [0.0066 + 0.0062 * Math.sin(Math.PI * t), 0.0105], { segments: 28, radial: 8 }), M.lash));
    }
    const lower = part(bake(new THREE.SphereGeometry(re * 1.07, 44, 16, 0, TAU, 2.25, Math.PI - 2.25), 1, sy, 1), M.lowerLid);
    lower.rotation.z = side * -0.1;
    ballRoot.add(lower);
    eyes.push({ gaze, lid });
  }

  /* ------------ brows: bold, blue, low and angled down towards the nose */
  const brows: { m: THREE.Mesh; base: number }[] = [];
  for (const side of [-1, 1] as const) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const d = new THREE.Vector3(side * (0.1 + 0.37 * t), 0.2 + 0.1 * t + 0.025 * Math.sin(Math.PI * t), 0.94);
      pts.push(onFace(d, 0.006).position);
    }
    const n = onFace(new THREE.Vector3(side * 0.28, 0.25, 0.93)).normal;
    // [half-thickness out of the skin, half-height on the skin]: thick at the nose end, tapering outwards
    const g = loft(pts, (t) => [0.0072, 0.0215 * (1 - 0.6 * t) * (t < 0.12 ? 0.7 + 2.5 * t : 1)], { segments: 22, radial: 10, width: n });
    const b = part(g, M.brow);
    headRoot.add(b);
    brows.push({ m: b, base: b.position.y });
  }

  /* ------------ mouth (rebuilt every frame from open / width / smile) */
  const MOUTH_N = 18;
  const mf = onFace(FACE.mouth, 0.004);
  const mouthGroup = new THREE.Group();
  mouthGroup.position.copy(mf.position);
  mouthGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), mf.normal);
  headRoot.add(mouthGroup);
  const strip = () => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((MOUTH_N + 1) * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage));
    const idx: number[] = [];
    for (let i = 0; i < MOUTH_N; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    g.setIndex(idx);
    return track(g);
  };
  const mouthGeo = strip();
  const teethGeo = strip();
  const tongueGeo = strip();
  const upLipGeo = strip();
  const loLipGeo = strip();
  [
    new THREE.Mesh(mouthGeo, M.mouth),
    new THREE.Mesh(tongueGeo, M.tongue),
    new THREE.Mesh(teethGeo, M.teeth),
    new THREE.Mesh(upLipGeo, M.lipMat),
    new THREE.Mesh(loLipGeo, M.lipMat),
  ].forEach((m, i) => {
    m.position.z = i * 0.0007;
    m.frustumCulled = false;
    mouthGroup.add(m);
  });

  const writeMouth = (half: number, h: number, smile: number) => {
    const attr = (g: THREE.BufferGeometry) => g.attributes.position as THREE.BufferAttribute;
    const mp = attr(mouthGeo);
    const tp = attr(teethGeo);
    const gp = attr(tongueGeo);
    const up = attr(upLipGeo);
    const lp = attr(loLipGeo);
    const bend = (x: number, y: number) => -(x * x + y * y) / (2 * R * 0.9);
    const toothH = Math.min(0.018, h * 0.42);
    const lipT = 0.008;
    for (let i = 0; i <= MOUTH_N; i++) {
      const s = (i / MOUTH_N) * 2 - 1;
      const x = s * half;
      const edge = Math.pow(Math.max(0, 1 - s * s), 0.72);
      const lipY = smile * 0.02 * (s * s - 0.45);
      const top = lipY + 0.002 * edge;
      const bot = lipY - (0.004 + h * edge);
      mp.setXYZ(i * 2, x, top, bend(x, top));
      mp.setXYZ(i * 2 + 1, x, bot, bend(x, bot));
      const tl = h > 0.012 ? top - toothH * edge : top;
      tp.setXYZ(i * 2, x * 0.88, top - 0.0008, bend(x, top));
      tp.setXYZ(i * 2 + 1, x * 0.88, tl, bend(x, tl));
      const tg = h > 0.03 ? Math.pow(Math.max(0, 1 - s * s * 1.6), 0.8) : 0;
      gp.setXYZ(i * 2, x * 0.7, bot + 0.001 + h * 0.45 * tg, bend(x, bot));
      gp.setXYZ(i * 2 + 1, x * 0.7, bot + 0.001, bend(x, bot));
      const fat = lipT * (0.35 + 0.65 * edge);
      up.setXYZ(i * 2, x, top, bend(x, top));
      up.setXYZ(i * 2 + 1, x, top + fat, bend(x, top + fat));
      lp.setXYZ(i * 2, x, bot - fat * 1.2, bend(x, bot - fat * 1.2));
      lp.setXYZ(i * 2 + 1, x, bot, bend(x, bot));
    }
    for (const a of [mp, tp, gp, up, lp]) a.needsUpdate = true;
  };

  /* ------------ hair: a big, messy crown of white spikes, ice-blue at the roots */
  const hairGroup = new THREE.Group();
  headRoot.add(hairGroup);
  {
    const Rc = R * 1.04;
    const root = new THREE.Color(C.hairRoot);
    const mid = new THREE.Color(C.hairMid);
    const tip = new THREE.Color(C.hairTip);
    const ramp = (u: number, out: THREE.Color) => (u < 0.5 ? out.copy(root).lerp(mid, u / 0.5) : out.copy(mid).lerp(tip, (u - 0.5) / 0.5));
    const dir = (azDeg: number, polDeg: number) => {
      const a = azDeg * D2R;
      const p = polDeg * D2R;
      return new THREE.Vector3(Math.sin(p) * Math.sin(a), Math.cos(p), Math.sin(p) * Math.cos(a));
    };

    // the scalp: a smooth cap (a little wider than the head) under the locks
    const cap = new THREE.SphereGeometry(Rc, 72, 44, 0, TAU, 0, Math.PI * 0.56);
    cap.scale(1.08, 1.02, 1.04);
    paint(cap, (_x, y, _z, c) => ramp(clamp(0.08 + (y / Rc) * 0.36, 0, 1), c));
    const capMesh = part(cap, M.hair);
    capMesh.rotation.x = -0.45;
    capMesh.position.set(0, 0.012, -0.02);
    hairGroup.add(capMesh);

    const rand = rng(41);
    const jit = (s: number) => (rand() - 0.5) * 2 * s;
    /** One tapered clump growing out of the scalp in direction `d`, heading along `flow`. */
    const lock = (d: THREE.Vector3, flow: THREE.Vector3, len: number, w: number, curl = 0) => {
      const f = flow.clone().normalize();
      // the tips curve: outwards and back for the standing locks, a small outward flick for the hanging ones
      const bend = new THREE.Vector3(d.x, 0, d.z);
      if (bend.lengthSq() > 1e-6) bend.normalize();
      bend.multiplyScalar(f.y > 0 ? 0.35 : 0.25).add(new THREE.Vector3(0, 0, f.y > 0 ? -0.25 : 0));
      const p0 = d.clone().multiplyScalar(Rc * 0.95).multiply(new THREE.Vector3(1.06, 1, 1.02));
      const pts = [p0];
      const t = d.clone().multiplyScalar(0.55).add(f).normalize();
      const n = 6;
      let p = p0.clone();
      for (let i = 1; i <= n; i++) {
        const k = i / n;
        t.lerp(f, 0.32).add(new THREE.Vector3(0, -curl * 0.18, 0)).addScaledVector(bend, k * k * 0.35).normalize();
        p = p.clone().addScaledVector(t, len / n);
        pts.push(p);
      }
      const hint = new THREE.Vector3().crossVectors(f, d);
      if (hint.lengthSq() < 1e-6) hint.set(1, 0, 0);
      const g = loft(
        pts,
        (u) => [w * 1.12 * Math.pow(1 - u, 0.9) * (0.84 + 0.16 * Math.sin(Math.PI * Math.min(1, u * 1.1))), w * 0.74 * Math.pow(1 - u, 0.75)],
        { segments: 18, radial: 12, width: hint, color: (u) => ramp(Math.pow(u, 0.85) * 0.94 + 0.06, new THREE.Color()) },
      );
      hairGroup.add(part(g, M.hair));
    };
    // Hand-placed, like an artist would block it in (after his picture): a big messy mass swept up and
    // fanning out, chunky locks over the ears and the nape that hang down, and a heavy fringe of a few
    // pointed locks falling over the forehead and crossing, ending above the brows.
    // [azimuth, polar, flow x, flow y, flow z, length, width]
    const LOCKS: [number, number, number, number, number, number, number][] = [
      // crown: standing up, fanning out and leaning back
      [0, 12, 0.05, 1, -0.3, 0.36, 0.13],
      [-38, 22, -0.35, 1, -0.2, 0.34, 0.125],
      [38, 22, 0.35, 1, -0.2, 0.35, 0.125],
      [-95, 26, -0.6, 1, -0.15, 0.32, 0.12],
      [95, 26, 0.65, 1, -0.15, 0.33, 0.12],
      [-150, 24, -0.4, 0.9, -0.6, 0.31, 0.12],
      [150, 24, 0.4, 0.9, -0.6, 0.31, 0.12],
      [180, 18, 0, 0.8, -0.8, 0.32, 0.125],
      [-18, 32, -0.25, 1, 0.05, 0.3, 0.12],
      [20, 32, 0.3, 1, 0.05, 0.31, 0.12],
      [-128, 36, -0.55, 0.9, -0.45, 0.29, 0.12],
      [128, 36, 0.55, 0.9, -0.45, 0.29, 0.12],
      // upper sides and back: flaring up and out at about 45 degrees
      [-58, 48, -0.85, 0.75, 0.05, 0.27, 0.115],
      [58, 48, 0.85, 0.8, 0.05, 0.28, 0.115],
      [-120, 50, -0.8, 0.55, -0.45, 0.27, 0.115],
      [120, 50, 0.8, 0.55, -0.45, 0.27, 0.115],
      [-165, 52, -0.3, 0.35, -0.9, 0.25, 0.115],
      [165, 52, 0.3, 0.35, -0.9, 0.25, 0.115],
      // above and behind the ears (which show, as in his picture): hanging down and back
      [-100, 60, -0.45, -0.7, -0.45, 0.15, 0.1],
      [100, 60, 0.45, -0.7, -0.45, 0.15, 0.1],
      [-112, 80, -0.3, -0.9, -0.45, 0.18, 0.1],
      [112, 80, 0.3, -0.9, -0.45, 0.18, 0.1],
      // the nape
      [-140, 98, -0.2, -0.95, -0.35, 0.16, 0.1],
      [140, 98, 0.2, -0.95, -0.35, 0.16, 0.1],
      [180, 104, 0, -0.95, -0.3, 0.15, 0.1],
      // the fringe: heavy pointed locks falling over the forehead, crossing
      [-36, 44, -0.32, -1, 0.62, 0.16, 0.115],
      [-12, 40, 0.22, -1, 0.66, 0.18, 0.125],
      [10, 41, -0.26, -1, 0.66, 0.175, 0.12],
      [33, 45, 0.38, -1, 0.6, 0.155, 0.11],
      [-58, 54, -0.5, -1, 0.35, 0.13, 0.1],
      [56, 55, 0.55, -1, 0.35, 0.125, 0.1],
    ];
    for (const [az, pol, fx, fy, fz, len, w] of LOCKS) {
      const d = dir(az + jit(3), pol + jit(2));
      lock(d, new THREE.Vector3(fx + jit(0.08), fy, fz + jit(0.06)), len * (0.94 + rand() * 0.12), w, fy < 0 ? 0.12 : 0);
    }
  }
  fuse(hairGroup);

  /* ------------ animation state */
  const st = {
    t: 0,
    pose: 'idle' as Pose,
    poseT: 0,
    yaw: 0,
    yawT: 0,
    aimYaw: 0,
    aimPitch: 0,
    lookYaw: 0,
    lookPitch: 0,
    tracking: false,
    blink: 0,
    blinkIn: 1.6,
    blinkPhase: -1,
    mouthOpen: 0,
    mouthWide: 0,
    mouthTarget: 0,
    mouthWideTarget: 0,
    twist: 0,
    talking: false,
    beat: 0,
    beatCool: 0,
    lastOpen: 0,
    smile: 0.05,
    brow: 0,
    ent: 1,
    entActive: false,
    glance: 0,
    glanceIn: 3,
    glanceYaw: 0,
    glancePitch: 0,
    gazeYaw: 0,
    gazePitch: 0,
    sway: 0,
  };

  const R2 = (a: [number, number, number]) => a.map((v) => v * D2R) as [number, number, number];

  const driveArm = (a: Arm, p: ArmPose, dt: number, extra: { shX?: number; elZ?: number; elX?: number }, fingers: boolean) => {
    const m = a.side === 1 ? -1 : 1;
    const lam = 9;
    const [sx, sy, sz] = R2(p.sh);
    const [ex, ey, ez] = R2(p.el);
    const [wx, wy, wz] = R2(p.wr);
    a.sh.rotation.x = damp(a.sh.rotation.x, sx + (extra.shX ?? 0), lam, dt);
    a.sh.rotation.y = damp(a.sh.rotation.y, sy * m, lam, dt);
    a.sh.rotation.z = damp(a.sh.rotation.z, sz * m, lam, dt);
    a.el.rotation.x = damp(a.el.rotation.x, ex + (extra.elX ?? 0), lam, dt);
    a.el.rotation.y = damp(a.el.rotation.y, ey * m, lam, dt);
    a.el.rotation.z = damp(a.el.rotation.z, (ez + (extra.elZ ?? 0)) * m, lam * 1.5, dt);
    a.wr.rotation.x = damp(a.wr.rotation.x, wx, lam, dt);
    a.wr.rotation.y = damp(a.wr.rotation.y, wy * m, lam, dt);
    a.wr.rotation.z = damp(a.wr.rotation.z, wz * m, lam, dt);
    if (!fingers) return;
    const h = a.hand;
    const f = p.fingers;
    h.thumb.root.rotation.z = damp(h.thumb.root.rotation.z, h.pn * f[0] * 0.9, 14, dt);
    h.thumb.j2.rotation.z = damp(h.thumb.j2.rotation.z, h.pn * f[0] * 0.8, 14, dt);
    h.fingers.forEach((fg, i) => {
      const c = f[i + 1];
      fg.root.rotation.z = damp(fg.root.rotation.z, h.pn * c * 1.25, 14, dt);
      fg.j2.rotation.z = damp(fg.j2.rotation.z, h.pn * c * 1.2, 14, dt);
    });
  };

  // His look is the same on both pages (only the scene round him is tinted per theme, in stage.ts).
  const applyTheme = (_theme: Theme) => {};
  applyTheme(initial);

  const LID_OPEN = -1.5; // upper lid swung up and back, out of sight
  const LID_CLOSED = 0.95; // swung down over the iris
  const LID_REST = 0.3; // how far down it rests: over the top of the iris (a calm, determined look)

  const api: BoyApi = {
    group: root,
    setTheme: applyTheme,

    look(yaw, pitch, tracking) {
      st.lookYaw = yaw;
      st.lookPitch = pitch;
      st.tracking = tracking;
    },

    talk(m) {
      st.talking = m.speaking;
      st.mouthTarget = m.open;
      st.mouthWideTarget = m.wide;
      if (m.open > 0.62 && st.lastOpen < 0.45 && st.beatCool <= 0) {
        st.beat = 1;
        st.beatCool = 0.42;
      }
      st.lastOpen = m.open;
    },

    pose(p) {
      if (!POSES[p]) return;
      if (st.pose !== p) {
        st.pose = p;
        st.poseT = 0;
      }
    },
    current: () => st.pose,

    face(yaw) {
      st.yawT = yaw;
    },

    materialise() {
      st.ent = 0;
      st.entActive = true;
    },
    entrance: () => st.ent,
    scanHeight: () => (st.entActive ? clip.constant : null),

    headWorld(out) {
      return headRoot.getWorldPosition(out);
    },

    showStaff(on) {
      staff.visible = on;
    },

    update(dt) {
      dt = clamp(dt, 0, 0.05);
      st.t += dt;
      st.poseT += dt;
      st.beatCool -= dt;
      st.beat = Math.max(0, st.beat - dt * 4.5);
      const t = st.t;

      // --- entrance: a scan line climbs from the feet to the hair
      if (st.entActive) {
        st.ent = Math.min(1, st.ent + dt / 1.15);
        const e = 1 - Math.pow(1 - st.ent, 3);
        clip.constant = lerp(-0.05, 2.25, e);
        if (st.ent >= 1) {
          st.entActive = false;
          clip.constant = 10;
        }
      }

      // --- facing
      const prevYaw = st.yaw;
      st.yaw = damp(st.yaw, st.yawT, 5, dt);
      root.rotation.y = st.yaw + Math.sin(t * 0.45) * 0.02;
      st.sway = damp(st.sway, clamp((st.yaw - prevYaw) * -22, -1, 1), 4, dt);

      // --- breathing and a relaxed stance
      const br = Math.sin(t * 1.7);
      body.position.y = br * 0.004;
      chest.scale.set(1 + br * 0.006, 1 + br * 0.012, 1 + br * 0.008);
      pelvis.rotation.z = 0.04 + Math.sin(t * 0.37) * 0.008;
      pelvis.position.x = 0.012;
      st.twist = damp(st.twist, st.pose === 'point' ? -0.1 : 0, 4, dt);
      spine.rotation.y = Math.sin(t * 0.5) * 0.035 + st.twist;
      spine.rotation.z = -0.06 + Math.sin(t * 0.43) * 0.01;
      for (const l of legs) {
        const fwd = l.side === 1;
        l.hip.rotation.x = fwd ? -0.16 : 0.02;
        l.knee.rotation.x = fwd ? 0.24 : 0.02;
        l.ankle.rotation.x = fwd ? -0.08 : -0.04;
      }
      writeTail(t, st.sway);

      // --- the glaive's core pulses softly
      glaive.update(t);

      // --- where he is looking. Someone steering (a visible pointer): follow it, always. Otherwise glance about.
      st.glanceIn -= dt;
      if (st.glanceIn <= 0) {
        st.glanceIn = 2 + Math.random() * 3;
        st.glance = 1;
        st.glanceYaw = (Math.random() - 0.5) * 0.8;
        st.glancePitch = (Math.random() - 0.4) * 0.3;
      }
      st.glance = Math.max(0, st.glance - dt * 0.2);
      const wantYaw = st.tracking ? st.lookYaw * (st.talking ? 0.85 : 1) : st.talking ? 0 : st.glanceYaw * st.glance;
      const wantPitch = st.tracking ? st.lookPitch * (st.talking ? 0.85 : 1) : st.talking ? 0 : st.glancePitch * st.glance;
      st.aimYaw = damp(st.aimYaw, wantYaw, 9, dt);
      st.aimPitch = damp(st.aimPitch, wantPitch, 9, dt);

      // The head does most of the turning, the eyes the rest (and lead it: they are quicker).
      const poseDef = POSES[st.pose];
      const extra = poseDef.head ?? [0, 0, 0];
      const rel = clamp(st.aimYaw - st.yaw, -1.6, 1.6);
      const hy = clamp(rel * 0.85, -1.0, 1.0);
      const rp = clamp(st.aimPitch, -0.6, 0.55);
      const hp = rp * 0.7;
      const nod = st.beat * 0.07 + (st.talking ? Math.sin(t * 5.1) * 0.012 : 0);
      neck.rotation.y = damp(neck.rotation.y, hy * 0.5 + extra[1] * D2R, 9, dt);
      neck.rotation.x = damp(neck.rotation.x, -hp * 0.4 + nod + extra[0] * D2R + Math.sin(t * 0.9) * 0.006, 9, dt);
      neck.rotation.z = damp(neck.rotation.z, extra[2] * D2R + 0.05 + Math.sin(t * 0.6) * 0.012, 4, dt);
      headRoot.rotation.y = damp(headRoot.rotation.y, hy * 0.5, 9, dt);
      headRoot.rotation.x = damp(headRoot.rotation.x, -hp * 0.6, 9, dt);
      st.gazeYaw = damp(st.gazeYaw, clamp(rel - hy, -0.5, 0.5), 18, dt);
      st.gazePitch = damp(st.gazePitch, clamp(rp - hp, -0.38, 0.38), 18, dt);

      // --- eyes and lids
      st.blinkIn -= dt;
      if (st.blinkIn <= 0 && st.blinkPhase < 0) {
        st.blinkPhase = 0;
        st.blinkIn = 1.8 + Math.random() * 3.6;
        if (Math.random() < 0.18) st.blinkIn = 0.35;
      }
      if (st.blinkPhase >= 0) {
        st.blinkPhase += dt / 0.17;
        st.blink = Math.sin(Math.min(1, st.blinkPhase) * Math.PI);
        if (st.blinkPhase >= 1) {
          st.blinkPhase = -1;
          st.blink = 0;
        }
      }
      st.smile = damp(st.smile, poseDef.smile ?? 0.05, 5, dt);
      st.brow = damp(st.brow, (poseDef.brow ?? 0) + st.beat * 0.5, 9, dt);
      for (const e of eyes) {
        e.gaze.rotation.set(-st.gazePitch, st.gazeYaw, 0);
        const shut = LID_REST + (1 - LID_REST) * Math.pow(st.blink, 0.7) + st.smile * 0.05;
        e.lid.rotation.x = lerp(LID_OPEN, LID_CLOSED, Math.min(1, shut));
      }
      for (const b of brows) b.m.position.y = b.base + st.brow * 0.012;

      // --- mouth
      st.mouthOpen = damp(st.mouthOpen, st.mouthTarget, st.mouthTarget > st.mouthOpen ? 38 : 20, dt);
      st.mouthWide = damp(st.mouthWide, st.mouthWideTarget, 16, dt);
      const open = st.mouthOpen;
      const wide = st.mouthWide;
      const half = 0.048 * (1 + wide * 0.16 - open * 0.1) * (1 + st.smile * 0.14);
      writeMouth(half, open * 0.085, clamp(st.smile * 0.9 - open * 0.35, -0.2, 1));

      // --- arms
      const poseT = st.poseT;
      let rExtra: { shX?: number; elZ?: number; elX?: number } = {};
      if (st.pose === 'wave') {
        rExtra = { elZ: Math.sin(poseT * 10) * 0.42, shX: Math.sin(poseT * 10) * 0.04 };
      } else if (st.pose === 'explain') {
        rExtra = { elX: Math.sin(t * 2.3) * 0.12, shX: Math.sin(t * 2.3) * 0.06 };
      } else if (st.pose === 'welcome') {
        rExtra = { elX: Math.sin(t * 1.8) * 0.06 };
      } else if (st.pose === 'point') {
        rExtra = { elX: Math.sin(t * 2.0) * 0.05 };
      } else {
        rExtra = { shX: Math.sin(t * 1.1) * 0.025 };
      }
      // a beat flicks the free hand; the glaive hand only rocks a little
      if (st.talking && st.pose === 'idle') rExtra = { ...rExtra, shX: (rExtra.shX ?? 0) - st.beat * 0.16, elX: -st.beat * 0.2 };
      const lExtra = { shX: Math.sin(t * 1.1 + 1) * 0.012 };
      driveArm(armR, poseDef.r, dt, rExtra, true);
      driveArm(armL, poseDef.l, dt, lExtra, false);
      for (const a of arms) {
        a.pad.rotation.z = a.sh.rotation.z * 0.3;
        a.pad.rotation.x = a.sh.rotation.x * 0.25;
      }
    },

    dispose() {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      texs.forEach((x) => x.dispose());
      glaive.dispose();
    },
  };
  return api;
}
