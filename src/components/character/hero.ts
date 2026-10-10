// What every hero on the stage has in common. There are three: the one made from his own picture
// (relief.ts, the one the site uses), a real 3D model (model.ts) and the code-built knight (boy.ts, the
// fallback). The stage only ever talks to this interface, so each is loaded only when it is the one in use.

import * as THREE from 'three';
import type { Gesture, MouthShape } from '@/lib/voice';

export type Theme = 'dark' | 'light';
export type Pose = Gesture | 'idle';

/** What the scene around him is tinted with, per theme (used by stage.ts). */
export interface Palette {
  accent: string; // pad rings, sparks, tags
  accent2: string; // second glow colour
  rim1: string; // rim lights
  rim2: string;
}

export const PALETTES: Record<Theme, Palette> = {
  dark: { accent: '#b39bff', accent2: '#c58bff', rim1: '#7fd8ff', rim2: '#a78bff' },
  light: { accent: '#7c5cf0', accent2: '#a875f0', rim1: '#9ab8ff', rim2: '#c3a8ff' },
};

export interface BoyApi {
  group: THREE.Group;
  update(dt: number): void;
  setTheme(theme: Theme): void;
  /**
   * Where he should look, as angles in the world: yaw (+ = towards the viewer's right) and pitch (+ = up),
   * both measured from his head, plus whether anyone is steering him (a visible pointer). Without it he
   * glances about on his own.
   */
  look(yaw: number, pitch: number, tracking: boolean): void;
  /** What the mouth is doing; call every frame. */
  talk(m: MouthShape): void;
  pose(p: Pose): void;
  current(): Pose;
  /** Turns the whole body (radians, + = towards the viewer's right). */
  face(yaw: number): void;
  materialise(): void;
  entrance(): number;
  scanHeight(): number | null;
  /** Where his head is, in world space. */
  headWorld(out: THREE.Vector3): THREE.Vector3;
  /** Shows or hides the glaive (it would cross his face in the close-up framing). */
  showStaff(on: boolean): void;
  dispose(): void;
  /** How the camera should frame this hero, where that differs from the stage's own framing (FRAMING in stage.ts). */
  framing?: Partial<Record<'intro' | 'lobby' | 'bust', Partial<HeroFraming>>>;
  /** Told every frame where he is seen from, for a hero who has to know (the picture hero always faces the camera). */
  seenFrom?(camera: THREE.Camera): void;
  /** His textures, so the stage can upload them before he is first drawn. */
  textures?: THREE.Texture[];
}

/** How the camera frames him: the height and width (world units) that must fit, where it looks, and which way he faces. */
export interface HeroFraming {
  h: number;
  w: number;
  y: number;
  lift: number;
  yaw: number;
}

/** Nobody: what stands on the stage until the hero has been loaded. */
export function noHero(): BoyApi {
  return {
    group: new THREE.Group(),
    update() {},
    setTheme() {},
    look() {},
    talk() {},
    pose() {},
    current: () => 'idle',
    face() {},
    materialise() {},
    entrance: () => 1,
    scanHeight: () => null,
    headWorld: (out) => out.set(0, 1.45, 0),
    showStaff() {},
    dispose() {},
  };
}
