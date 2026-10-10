// The hero made from a real 3D model file (GLB, GLTF or FBX): for example one generated from his reference
// picture with an image-to-3D tool, then rigged and animated (in that tool, or in Mixamo). It behaves exactly
// like the code-built hero (the same BoyApi, so the stage, the intro and the lobby do not know the difference):
// animations by role (idle, talk, wave, point...), his head turns towards the pointer, the materialise scan,
// the ice glaive.
//
// Everything about the files is described by public/models/hero.json (see docs/character-model.md). Nothing is
// loaded unless that file names a model, so the site works the same without one.

import * as THREE from 'three';
import type { MouthShape } from '@/lib/voice';
import type { BoyApi, Pose, Theme } from './hero';
import { createGlaive, type Glaive } from './glaive';

/** What an animation is used for. */
export type Role = 'idle' | 'talk' | 'wave' | 'chest' | 'explain' | 'point' | 'welcome';

export interface HeroManifest {
  /** The model file, relative to the manifest: .glb, .gltf or .fbx. null = no model yet (the code-built hero is used). */
  model: string | null;
  /** Extra animation files (the same skeleton, e.g. Mixamo downloads "without skin"), by role. */
  animations?: Partial<Record<Role, string>>;
  /** Names of animations inside the model file to use for each role; found by name when not given. */
  clips?: Partial<Record<Role, string>>;
  /** His height in the scene, glaive not included (the code-built hero is about 1.95). */
  height?: number;
  /** Turns the model round its vertical axis (degrees) if it does not face the camera. */
  rotationY?: number;
  /** The glowing ice glaive: standing beside him (default), in his left hand, or none (his model carries one). */
  glaive?: 'beside' | 'hand' | 'none';
}

const D2R = Math.PI / 180;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const damp = (cur: number, target: number, lambda: number, dt: number) => target + (cur - target) * Math.exp(-lambda * Math.max(0, dt));

// (scripts/add-hero.mjs prints the same matching: keep the two tables below in step with it)
/** Names that usually mean each role (Mixamo's own names first). */
const ROLE_NAMES: Record<Role, RegExp> = {
  idle: /idle|breath|stand/i,
  talk: /talk|speak|convers|explain/i,
  wave: /wav(e|ing)|hello|\bhi\b/i,
  chest: /chest|heart|bow|acknowledg|humble|thank/i,
  explain: /explain|talk|gesture|argu|telling/i,
  point: /point|thumbs|indicat/i,
  welcome: /welcome|greet|open|cheer|yes|agree/i,
};
/** Which role to fall back on when a pose has no animation of its own. */
const FALLBACK: Record<Role, Role[]> = {
  idle: [],
  talk: ['explain', 'idle'],
  wave: ['welcome', 'talk', 'idle'],
  chest: ['talk', 'idle'],
  explain: ['talk', 'idle'],
  point: ['explain', 'talk', 'idle'],
  welcome: ['wave', 'talk', 'idle'],
};

async function loadFile(url: string): Promise<{ scene: THREE.Object3D; animations: THREE.AnimationClip[] }> {
  if (/\.fbx(\?|$)/i.test(url)) {
    const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js');
    const obj = await new FBXLoader().loadAsync(url);
    return { scene: obj, animations: obj.animations ?? [] };
  }
  const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/libs/meshopt_decoder.module.js'),
  ]);
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder); // models compressed by scripts/add-hero.mjs (gltf-transform) load too
  const gltf = await loader.loadAsync(url);
  return { scene: gltf.scene, animations: gltf.animations ?? [] };
}

/**
 * Keeps only the turning of the bones. Animations made for another file (or another scale: Mixamo works in
 * centimetres) would otherwise move bones to the wrong places; the hips' travel is dropped too, so he stays on
 * his pad.
 */
function rotationsOnly(clip: THREE.AnimationClip) {
  const c = clip.clone();
  c.tracks = c.tracks.filter((t) => t.name.endsWith('.quaternion'));
  return c;
}

/** The first bone (or plain node) under `root` whose name matches `test` and not `not`. */
const findBone = (root: THREE.Object3D, test: RegExp, not?: RegExp) => {
  let found: THREE.Object3D | null = null;
  root.traverse((o) => {
    if (found) return;
    if (test.test(o.name) && !(not && not.test(o.name)) && ((o as THREE.Bone).isBone || o.type === 'Object3D' || o.type === 'Group')) found = o;
  });
  return found as THREE.Object3D | null;
};

/** Loads the model the manifest names and builds the hero round it. Throws if the model cannot be loaded. */
export async function createModelHero(manifest: HeroManifest, base: URL, _theme: Theme): Promise<BoyApi> {
  if (!manifest.model) throw new Error('hero.json names no model');
  const resolve = (file: string) => new URL(file, base).href;
  const height = manifest.height ?? 1.95;

  // the model, and any separate animation files, in parallel
  const animEntries = Object.entries(manifest.animations ?? {}) as [Role, string][];
  const [main, ...extra] = await Promise.all([loadFile(resolve(manifest.model)), ...animEntries.map(([, f]) => loadFile(resolve(f)).catch(() => null))]);
  const model = main.scene;

  /* ------------ fit him on the pad: feet on the floor, centred, the right height, facing the camera */
  const root = new THREE.Group();
  root.name = 'hero-model';
  const sway = new THREE.Group(); // breathing and turning, for a model without animations of its own
  root.add(sway);
  const fit = new THREE.Group();
  sway.add(fit);
  fit.add(model);
  model.rotation.y = (manifest.rotationY ?? 0) * D2R;
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model, true);
  const size = box.getSize(new THREE.Vector3());
  const k = height / Math.max(size.y, 1e-6);
  fit.scale.setScalar(k);
  const centre = box.getCenter(new THREE.Vector3());
  fit.position.set(-centre.x * k, -box.min.y * k, -centre.z * k);

  /* ------------ materials: shadows, the materialise clip, never culled while animating */
  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 10);
  const mats = new Set<THREE.Material>();
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = true;
    m.receiveShadow = true;
    if ((m as THREE.SkinnedMesh).isSkinnedMesh) m.frustumCulled = false;
    (Array.isArray(m.material) ? m.material : [m.material]).forEach((mat) => {
      mat.clippingPlanes = [clip];
      mat.clipShadows = true;
      mats.add(mat);
    });
  });

  /* ------------ animations by role */
  const mixer = new THREE.AnimationMixer(model);
  root.userData.mixer = mixer; // for tests and debugging
  const all = main.animations.map(rotationsOnly);
  const byRole = new Map<Role, THREE.AnimationClip>();
  animEntries.forEach(([role], i) => {
    const clips = extra[i]?.animations;
    if (clips?.length) byRole.set(role, rotationsOnly(clips[0]));
  });
  for (const role of Object.keys(ROLE_NAMES) as Role[]) {
    if (byRole.has(role)) continue;
    const wanted = manifest.clips?.[role];
    const clipFound = wanted ? all.find((c) => c.name === wanted) : all.find((c) => ROLE_NAMES[role].test(c.name));
    if (clipFound) byRole.set(role, clipFound);
  }
  // with nothing named "idle", his first animation is his standing one (a Mixamo file calls its clip "mixamo.com")
  if (!byRole.has('idle') && all.length) byRole.set('idle', all[0]);
  const actions = new Map<Role, THREE.AnimationAction>();
  byRole.forEach((c, role) => actions.set(role, mixer.clipAction(c)));
  const pick = (role: Role): Role | null => {
    if (actions.has(role)) return role;
    for (const r of FALLBACK[role]) if (actions.has(r)) return r;
    return null;
  };
  let playing: Role | null = null;
  const play = (role: Role) => {
    const r = pick(role);
    if (!r || r === playing) return;
    const next = actions.get(r)!;
    next.reset().setEffectiveWeight(1);
    // the first one starts at once (a fade-in would show his bare T-pose first); later ones cross-fade
    if (playing) {
      next.fadeIn(0.35);
      actions.get(playing)!.fadeOut(0.35);
    }
    next.play();
    playing = r;
  };
  play('idle');

  /* ------------ bones for the look and the talking */
  const head = findBone(model, /head$/i, /headtop|head_?end|headfront|forehead/i);
  const neck = findBone(model, /neck\d?$/i);
  const jaw = findBone(model, /jaw$/i);
  // their rest pose: the look and the jaw are added on top of the animation each frame, so they start from here
  // when no animation moves them (otherwise the turns would add up, frame after frame)
  const rest = [head, neck, jaw].filter((b): b is THREE.Object3D => !!b).map((b) => ({ b, q: b.quaternion.clone() }));
  mixer.update(0); // his first animated pose, before he is ever drawn
  const mouthMorphs: { mesh: THREE.Mesh; index: number }[] = [];
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    const dict = m.morphTargetDictionary;
    if (!m.isMesh || !dict) return;
    const key = Object.keys(dict).find((n) => /^(jawopen|mouthopen|mouth_open|viseme_aa|aa|a)$/i.test(n));
    if (key !== undefined && m.morphTargetInfluences) mouthMorphs.push({ mesh: m, index: dict[key] });
  });

  /* ------------ the glaive */
  // It always stands upright with its butt on the pad. "beside": a fixed spot on his left. "hand": it follows his
  // left hand (every rig turns its hand bones differently, so it only takes the hand's position, never its
  // rotation), within reach of where the hand rests, so a big gesture does not drag it across the pad.
  let glaive: Glaive | null = null;
  const where = manifest.glaive ?? 'beside';
  const BUTT = 0.665; // the glaive's grip is this far above its butt
  let grip: { hand: THREE.Object3D; finger: THREE.Object3D | null; rest: THREE.Vector3 } | null = null;
  const gripTarget = new THREE.Vector3();
  const tmpV = new THREE.Vector3();
  const tmpW = new THREE.Vector3();
  if (where !== 'none') {
    glaive = createGlaive([clip]);
    glaive.group.position.set(0.48, BUTT, 0.05);
    glaive.group.rotation.z = -0.08;
    root.add(glaive.group);
    const hand = where === 'hand' ? findBone(model, /left_?hand$/i) : null;
    if (hand) {
      // the palm is a little way from the wrist, towards the middle finger
      const finger = findBone(hand, /middle\w*1$/i) ?? hand.children.find((c) => (c as THREE.Bone).isBone) ?? null;
      grip = { hand, finger, rest: new THREE.Vector3() };
    }
  }
  /** Where his left palm is, in the hero's own space (the glaive's parent). */
  const palm = (out: THREE.Vector3) => {
    if (!grip) return out;
    grip.hand.getWorldPosition(tmpV);
    if (grip.finger) tmpV.lerp(grip.finger.getWorldPosition(tmpW), 0.75);
    return root.worldToLocal(out.copy(tmpV));
  };
  if (grip && glaive) {
    // where the hand rests in his standing animation (the first pose of it)
    root.updateMatrixWorld(true);
    palm(grip.rest);
    glaive.group.position.set(grip.rest.x, BUTT, grip.rest.z);
    glaive.group.rotation.z = -0.06; // the top leans a little away from him
  }

  /* ------------ state */
  const st = {
    t: 0,
    pose: 'idle' as Pose,
    yaw: 0,
    yawT: 0,
    lookYaw: 0,
    lookPitch: 0,
    tracking: false,
    aimYaw: 0,
    aimPitch: 0,
    glance: 0,
    glanceIn: 3,
    glanceYaw: 0,
    glancePitch: 0,
    talking: false,
    open: 0,
    beat: 0,
    beatCool: 0,
    lastOpen: 0,
    ent: 1,
    entActive: false,
  };
  const up = new THREE.Vector3(0, 1, 0);
  const qParent = new THREE.Quaternion();
  const qWorld = new THREE.Quaternion();
  const qOff = new THREE.Quaternion();
  const qPitch = new THREE.Quaternion();
  const right = new THREE.Vector3();
  /** Turns a bone by yaw (round the world's up) and pitch (round his left-right axis), on top of the animation. */
  const turn = (bone: THREE.Object3D, yaw: number, pitch: number) => {
    const parent = bone.parent;
    if (!parent) return;
    parent.updateWorldMatrix(true, false);
    parent.getWorldQuaternion(qParent);
    qWorld.copy(qParent).multiply(bone.quaternion);
    right.set(1, 0, 0).applyQuaternion(root.quaternion);
    qOff.setFromAxisAngle(up, yaw);
    qPitch.setFromAxisAngle(right, -pitch);
    qOff.multiply(qPitch);
    bone.quaternion.copy(qParent.invert().multiply(qOff.multiply(qWorld)));
  };

  const api: BoyApi = {
    group: root,
    setTheme() {},
    look(yaw, pitch, tracking) {
      st.lookYaw = yaw;
      st.lookPitch = pitch;
      st.tracking = tracking;
    },
    talk(m: MouthShape) {
      st.talking = m.speaking;
      st.open = m.open;
      if (m.open > 0.62 && st.lastOpen < 0.45 && st.beatCool <= 0) {
        st.beat = 1;
        st.beatCool = 0.42;
      }
      st.lastOpen = m.open;
    },
    pose(p) {
      st.pose = p;
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
      return head ? head.getWorldPosition(out) : out.set(0, height * 0.82, 0);
    },
    showStaff(on) {
      if (glaive) glaive.group.visible = on;
    },
    update(dt) {
      dt = clamp(dt, 0, 0.05);
      st.t += dt;
      st.beatCool -= dt;
      st.beat = Math.max(0, st.beat - dt * 4.5);

      // the materialise scan, feet to hair
      if (st.entActive) {
        st.ent = Math.min(1, st.ent + dt / 1.15);
        clip.constant = THREE.MathUtils.lerp(-0.05, height * 1.2, 1 - Math.pow(1 - st.ent, 3));
        if (st.ent >= 1) {
          st.entActive = false;
          clip.constant = 10;
        }
      }

      // facing
      st.yaw = damp(st.yaw, st.yawT, 5, dt);
      root.rotation.y = st.yaw;

      // the animation for what he is doing: his gesture, or talking, or standing
      play(st.pose !== 'idle' ? st.pose : st.talking ? 'talk' : 'idle');
      for (const r of rest) r.b.quaternion.copy(r.q);
      mixer.update(dt);

      // where he looks: the pointer when someone is steering, ahead while talking, otherwise a glance now and then
      st.glanceIn -= dt;
      if (st.glanceIn <= 0) {
        st.glanceIn = 2 + Math.random() * 3;
        st.glance = 1;
        st.glanceYaw = (Math.random() - 0.5) * 0.7;
        st.glancePitch = (Math.random() - 0.4) * 0.25;
      }
      st.glance = Math.max(0, st.glance - dt * 0.2);
      const wantYaw = st.tracking ? st.lookYaw : st.talking ? 0 : st.glanceYaw * st.glance;
      const wantPitch = st.tracking ? st.lookPitch : st.talking ? 0 : st.glancePitch * st.glance;
      st.aimYaw = damp(st.aimYaw, wantYaw, 8, dt);
      st.aimPitch = damp(st.aimPitch, wantPitch, 8, dt);
      const yaw = clamp(st.aimYaw - st.yaw, -0.9, 0.9);
      const pitch = clamp(st.aimPitch, -0.45, 0.4) - st.beat * 0.06;
      if (neck) turn(neck, yaw * 0.4, pitch * 0.4);
      if (head) turn(head, yaw * 0.6, pitch * 0.6);

      // a model without animations of its own: breathe, and turn a little towards whatever he looks at
      if (!actions.size) {
        sway.position.y = Math.sin(st.t * 1.7) * 0.006;
        sway.rotation.y = damp(sway.rotation.y, head ? 0 : clamp(st.aimYaw - st.yaw, -0.6, 0.6) * 0.45, 6, dt);
      }

      // the glaive follows his left hand (position only, within reach of where the hand rests)
      if (grip && glaive) {
        palm(gripTarget);
        tmpV.subVectors(gripTarget, grip.rest).setY(0);
        if (tmpV.length() > 0.28) tmpV.setLength(0.28);
        const g = glaive.group.position;
        g.x = damp(g.x, grip.rest.x + tmpV.x, 14, dt);
        g.z = damp(g.z, grip.rest.z + tmpV.z, 14, dt);
      }

      // the mouth, if the model has one that can move (a jaw bone or a mouth shape key)
      if (jaw) jaw.rotation.x += st.open * 0.25;
      for (const { mesh, index } of mouthMorphs) mesh.morphTargetInfluences![index] = st.open;

      glaive?.update(st.t);
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      model.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) m.geometry.dispose();
      });
      mats.forEach((m) => {
        for (const v of Object.values(m)) if ((v as THREE.Texture | null)?.isTexture) (v as THREE.Texture).dispose();
        m.dispose();
      });
      glaive?.dispose();
    },
  };
  return api;
}
