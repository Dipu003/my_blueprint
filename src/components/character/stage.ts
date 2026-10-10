// The 3D stage: one WebGL canvas, one hero, one glowing rune pad. It is created once and moved between
// places (the intro screen, the lobby) by re-parenting the canvas, so there is only ever one WebGL
// context and the character keeps his pose when he "moves". It draws only while its canvas is on screen
// and the browser tab is visible.
//
// Look: physically based materials lit by a custom reflective environment (soft boxes tinted like the
// page), one shadow-casting key light, cyan and violet rim lights, soft contact shadows on the pad. The
// camera drifts a little with the pointer (a 3D parallax), and his head keeps turning towards it.

import * as THREE from 'three';
import { KEY_SKILLS } from '@/data/portfolio';
import { gsap } from '@/lib/gsap';
import { mouth } from '@/lib/voice';
import { PALETTES, noHero, type BoyApi, type HeroFraming, type Pose, type Theme } from './hero';

export type StageMode = 'intro' | 'lobby' | 'bust';

/**
 * Where he stands in the canvas and how much of it he fills. The intro canvas covers the whole screen
 * (so there are no hard edges to the glow) with him on the left: `ax`/`ay` are his centre as a fraction
 * of the canvas (0.5 = middle) and `fill` the share of the canvas height he may take (1 = all of it).
 */
export interface StageView {
  ax: number;
  ay: number;
  fill: number;
}

/** How the camera frames him in each place (a hero can adjust it for himself: see BoyApi.framing). */
const FRAMING: Record<StageMode, HeroFraming> = {
  intro: { h: 2.2, w: 2.0, y: 0.98, lift: 0.42, yaw: 0.32 },
  lobby: { h: 2.24, w: 1.9, y: 0.98, lift: 0.44, yaw: -0.3 },
  bust: { h: 1.1, w: 1.5, y: 1.3, lift: 0.18, yaw: -0.2 },
};
const FOV = 28;

const easeOut = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/* ---------------------------------------------------------------- textures */

function canvasTex(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void, w = size, h = size) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** White rings, ticks and arcs; tinted by the material colour. */
const padTexture = () =>
  canvasTex(512, (g, S) => {
    g.translate(S / 2, S / 2);
    g.strokeStyle = '#fff';
    g.lineCap = 'butt';
    const ring = (r: number, w: number, a: number) => {
      g.globalAlpha = a;
      g.lineWidth = w;
      g.beginPath();
      g.arc(0, 0, r, 0, Math.PI * 2);
      g.stroke();
    };
    ring(246, 5, 1);
    ring(150, 2, 0.45);
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      const long = i % 5 === 0;
      g.globalAlpha = long ? 1 : 0.6;
      g.lineWidth = long ? 4 : 2;
      g.beginPath();
      g.moveTo(Math.cos(a) * 232, Math.sin(a) * 232);
      g.lineTo(Math.cos(a) * (long ? 206 : 218), Math.sin(a) * (long ? 206 : 218));
      g.stroke();
    }
    g.globalAlpha = 0.9;
    g.lineWidth = 5;
    for (let i = 0; i < 6; i++) {
      const a0 = (i / 6) * Math.PI * 2 + 0.1;
      g.beginPath();
      g.arc(0, 0, 186, a0, a0 + Math.PI / 6);
      g.stroke();
    }
    g.globalAlpha = 0.7;
    g.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const a0 = (i / 4) * Math.PI * 2 + Math.PI / 4 - 0.28;
      g.beginPath();
      g.arc(0, 0, 118, a0, a0 + 0.56);
      g.stroke();
    }
    // a hexagram of thin lines in the middle, like a summoning circle
    g.globalAlpha = 0.5;
    g.lineWidth = 2;
    for (const off of [0, Math.PI / 6]) {
      g.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = off + (i / 3) * Math.PI * 2 - Math.PI / 2;
        const px = Math.cos(a) * 112;
        const py = Math.sin(a) * 112;
        if (i) g.lineTo(px, py);
        else g.moveTo(px, py);
      }
      g.closePath();
      g.stroke();
    }
  });

const glowTexture = () =>
  canvasTex(128, (g, S) => {
    const r = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, S, S);
  });

/** His key skills (KEY_SKILLS in the portfolio data): these orbit him while he talks about them. */
const CHIP_LABELS = KEY_SKILLS.map((k) => k.name);

/** The site's display font, as a canvas font family (next/font gives it a generated name in --font-display). */
function displayFont() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim();
  return v || 'Impact, sans-serif';
}

/** A slanted game-HUD tag with a label, drawn on a canvas: dark glass with an accent edge (light glass on the light theme). */
function drawChip(c: HTMLCanvasElement, label: string, accent: string, dark: boolean) {
  const g = c.getContext('2d')!;
  const W = c.width;
  const H = c.height;
  const k = 24; // slant
  g.clearRect(0, 0, W, H);
  g.beginPath();
  g.moveTo(k + 6, 8);
  g.lineTo(W - 6, 8);
  g.lineTo(W - 6 - k, H - 8);
  g.lineTo(6, H - 8);
  g.closePath();
  g.fillStyle = dark ? 'rgba(10,16,40,0.9)' : 'rgba(255,255,255,0.94)';
  g.fill();
  g.lineWidth = 5;
  g.strokeStyle = accent;
  g.stroke();
  // accent bar on the left edge
  g.fillStyle = accent;
  g.beginPath();
  g.moveTo(k + 6, 8);
  g.lineTo(k + 26, 8);
  g.lineTo(26, H - 8);
  g.lineTo(6, H - 8);
  g.closePath();
  g.fill();
  // as big as fits between the accent bar and the slanted right edge
  let size = 58;
  g.font = `700 ${size}px ${displayFont()}`;
  while (size > 30 && g.measureText(label.toUpperCase()).width > W - 96) {
    size -= 2;
    g.font = `700 ${size}px ${displayFont()}`;
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = dark ? '#ffffff' : '#0b1430';
  g.fillText(label.toUpperCase(), W / 2 + 14, H / 2 + 5);
}

/**
 * The reflections everything in the scene picks up: a dim gradient sky and a few bright "soft boxes"
 * (a big warm key, a cool fill, a cyan and a violet strip behind), baked once into a prefiltered
 * environment map. The light theme gets a brighter, whiter sky.
 */
function buildEnvironment(renderer: THREE.WebGLRenderer, dark: boolean): THREE.WebGLRenderTarget {
  const env = new THREE.Scene();
  const sky = new THREE.SphereGeometry(30, 32, 18);
  const top = new THREE.Color(dark ? '#2b2357' : '#f1edfb');
  const mid = new THREE.Color(dark ? '#110f22' : '#ddd6ef');
  const bot = new THREE.Color(dark ? '#06050d' : '#a99cc9');
  {
    const p = sky.attributes.position;
    const col = new Float32Array(p.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) / 30;
      if (y > 0) c.copy(mid).lerp(top, Math.pow(y, 0.7));
      else c.copy(mid).lerp(bot, Math.pow(-y, 0.7));
      col.set([c.r, c.g, c.b], i * 3);
    }
    sky.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  env.add(new THREE.Mesh(sky, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const box = (w: number, h: number, x: number, y: number, z: number, r: number, g: number, b: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 1, 0);
    env.add(m);
  };
  if (dark) {
    box(9, 6, -7, 7, 6, 7, 6.6, 6); // key: big, warm white, above left of the camera
    box(5, 7, 8, 3, 5, 2.0, 1.7, 2.8); // fill: soft lavender from the right
    box(2.2, 9, 7, 3, -6, 0.3, 3.4, 4.8); // cyan strip behind right
    box(2.2, 9, -7, 3, -6, 2.6, 1.0, 4.6); // violet strip behind left
    box(5, 3, 0, 9, 1, 2.4, 2.6, 3.4); // top
  } else {
    box(10, 7, -7, 7, 6, 6.4, 6.4, 6.2);
    box(5, 7, 8, 3, 5, 2.2, 2.7, 3.6);
    box(2.2, 9, 7, 3, -6, 1.2, 2.2, 3.4);
    box(2.2, 9, -7, 3, -6, 2.0, 1.4, 3.2);
    box(6, 4, 0, 9, 1, 3.6, 3.8, 4.4);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(env, 0.03);
  pmrem.dispose();
  env.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
  });
  return rt;
}

/** Drops undefined entries, so a missing prop does not overwrite a default. */
const stripUndefined = <T extends object>(o?: T): Partial<T> => Object.fromEntries(Object.entries(o ?? {}).filter(([, v]) => v !== undefined)) as Partial<T>;

/* ---------------------------------------------------------------- the stage */

export class Stage {
  readonly canvas: HTMLCanvasElement;
  /** The hero. Nobody at first: loadStage() puts him on (see useModel and useBuiltIn). */
  boy: BoyApi;

  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);
  private host: HTMLElement | null = null;
  private mode: StageMode = 'lobby';
  private theme: Theme = 'dark';
  private ro: ResizeObserver;
  private io: IntersectionObserver;
  private onScreen = true;
  private running = false;
  private last = 0;
  private lastRender = 0;
  // quality governor: if frames stay slow the stage gets cheaper (see `strain`)
  private quality = 0; // 0 full, 1 lower resolution, 2 lower resolution and frame rate
  private avgGap = 16;
  private strain = 0;
  private time = 0;
  private aspect = 1;
  private size = { w: 2, h: 2 };
  private view: StageView = { ax: 0.5, ay: 0.5, fill: 1 };

  // pointer
  private px = 0;
  private py = 0;
  private seen = false; // has a mouse ever moved over the page?
  private inside = false; // is it over the window now?
  private lastMove = -1e9;
  private rect: DOMRect | null = null;
  private fine = true;
  private v = new THREE.Vector3();
  // camera drift: eased towards the pointer (-1..1)
  private orbit = { x: 0, y: 0 };

  // timed pose
  private poseUntil = 0;

  /** For testing the face by hand: when set, this is used instead of the voice. */
  mouthOverride: import('@/lib/voice').MouthShape | null = null;

  // the entrance dolly (a GSAP tween): 1 = the normal distance, bigger = further away
  private dolly = 1;
  private tweening = 0;

  // scene parts
  private lights: { key: THREE.DirectionalLight; rimA: THREE.DirectionalLight; rimB: THREE.DirectionalLight; fill: THREE.HemisphereLight };
  private envs: Partial<Record<Theme, THREE.WebGLRenderTarget>> = {};
  private padGroup = new THREE.Group();
  private padBase: THREE.Mesh;
  private padDisc: THREE.Mesh;
  private padRing: THREE.Mesh;
  private floorGlow: THREE.Mesh;
  private catcher: THREE.Mesh;
  private halo: THREE.Mesh;
  private beam: THREE.Mesh;
  private beamMat: THREE.ShaderMaterial;
  private pulse: THREE.Mesh;
  private scan: THREE.Mesh;
  private particles: THREE.Points;
  private pPos: Float32Array;
  private pVel: Float32Array;
  private fxMats: THREE.MeshBasicMaterial[] = [];
  private chips: { sprite: THREE.Sprite; canvas: HTMLCanvasElement; tex: THREE.CanvasTexture; label: string }[] = [];
  private chipsShown = 0; // eased 0..1
  private chipsTarget = 0;
  private pulseT = 1;
  private beamBoost = 0;
  private textures: THREE.Texture[] = [];
  private mo: MutationObserver;
  private disposed = false;

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'default' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.localClippingEnabled = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap; // filtered, soft-edged shadows (PCFSoftShadowMap is deprecated in this three.js)
    this.renderer.setPixelRatio(this.pixelRatio());
    this.canvas = this.renderer.domElement;
    this.canvas.setAttribute('aria-hidden', 'true');
    this.canvas.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none;touch-action:none';
    this.canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());

    this.theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    this.boy = noHero();
    this.scene.add(this.boy.group);

    /* lights: a warm key that casts the shadows, a cyan and a violet rim from behind, a faint sky fill;
       the rest of the light comes from the environment map (see applyTheme). */
    const key = new THREE.DirectionalLight('#fff3e6', 1.9);
    key.position.set(-2.4, 3.6, 4.2);
    key.target.position.set(0, 1, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 14;
    key.shadow.camera.left = key.shadow.camera.bottom = -1.8;
    key.shadow.camera.right = key.shadow.camera.top = 1.8;
    key.shadow.bias = -0.0003;
    key.shadow.normalBias = 0.012;
    const rimA = new THREE.DirectionalLight('#4cc8ff', 2.2);
    rimA.position.set(3.6, 2.4, -3.2);
    const rimB = new THREE.DirectionalLight('#9a7bff', 1.8);
    rimB.position.set(-3.6, 2.8, -2.8);
    const fill = new THREE.HemisphereLight('#c4b5ff', '#1d1830', 0.3);
    this.scene.add(key, key.target, rimA, rimB, fill);
    this.lights = { key, rimA, rimB, fill };

    /* pad */
    const mk = (g: THREE.BufferGeometry, m: THREE.Material) => new THREE.Mesh(g, m);
    const baseMat = new THREE.MeshStandardMaterial({ color: '#15121f', metalness: 0.6, roughness: 0.35 });
    this.padBase = mk(new THREE.CylinderGeometry(0.8, 0.86, 0.08, 72), baseMat);
    this.padBase.position.y = -0.04;
    const padTex = padTexture();
    const glowTex = glowTexture();
    this.textures.push(padTex, glowTex);

    const fx = (m: THREE.MeshBasicMaterialParameters) => {
      const mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, ...m });
      this.fxMats.push(mat);
      return mat;
    };
    this.padDisc = mk(new THREE.CircleGeometry(0.92, 72).rotateX(-Math.PI / 2), fx({ map: padTex, opacity: 0.95 }));
    this.padDisc.position.y = 0.006;
    this.padRing = mk(new THREE.RingGeometry(0.735, 0.775, 96).rotateX(-Math.PI / 2), fx({ opacity: 1 }));
    this.padRing.position.y = 0.004;
    this.floorGlow = mk(new THREE.CircleGeometry(1.1, 48).rotateX(-Math.PI / 2), fx({ map: glowTex, opacity: 0.55 }));
    this.floorGlow.position.y = 0.002;
    // soft contact shadows of the hero on the pad (only the shadow is drawn)
    this.catcher = mk(new THREE.CircleGeometry(1.2, 48).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ color: 0x02061a, opacity: 0.45, transparent: true, depthWrite: false }));
    this.catcher.position.y = 0.012;
    this.catcher.receiveShadow = true;
    // A column of light behind him. Only its far wall is drawn (BackSide), and a shader fades it towards
    // the sides and the top, so it never has an edge that ends at the canvas border.
    this.beamMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      toneMapped: false,
      uniforms: { uColor: { value: new THREE.Color() }, uOpacity: { value: 0.5 } },
      vertexShader: 'varying vec3 vP;\nvoid main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
      fragmentShader: `uniform vec3 uColor;
        uniform float uOpacity;
        varying vec3 vP;
        void main() {
          float v = clamp( ( vP.y + 1.15 ) / 2.3, 0.0, 1.0 );
          float vert = pow( 1.0 - v, 1.5 );
          float side = pow( clamp( 1.0 - abs( vP.x ) / 0.82, 0.0, 1.0 ), 1.2 );
          gl_FragColor = vec4( uColor, uOpacity * vert * side );
          #include <colorspace_fragment>
        }`,
    });
    this.beam = mk(new THREE.CylinderGeometry(0.8, 0.86, 2.3, 56, 1, true), this.beamMat);
    this.beam.position.y = 1.15;
    // a big soft halo standing behind him, like the glowing circle behind a hero on a title screen
    this.halo = mk(new THREE.PlaneGeometry(2.2, 2.2), fx({ map: glowTex, opacity: 0.4 }));
    this.halo.position.set(0, 1.12, -0.85);
    this.pulse = mk(new THREE.RingGeometry(0.76, 0.82, 80).rotateX(-Math.PI / 2), fx({ opacity: 0 }));
    this.pulse.position.y = 0.01;
    this.scan = mk(new THREE.RingGeometry(0.0, 0.5, 48).rotateX(-Math.PI / 2), fx({ opacity: 0 }));
    this.scan.visible = false;
    this.padGroup.add(this.padBase, this.padDisc, this.padRing, this.floorGlow, this.catcher, this.pulse, this.scan);
    this.scene.add(this.padGroup, this.beam, this.halo);
    // What lies behind and under him is drawn before him, the rest after: the picture hero is drawn with
    // soft, blended edges, and those need the background to be there already.
    for (const o of [this.halo, this.beam, this.padDisc, this.padRing, this.floorGlow, this.catcher]) o.renderOrder = -5;

    /* rising sparks */
    const N = 70;
    this.pPos = new Float32Array(N * 3);
    this.pVel = new Float32Array(N);
    for (let i = 0; i < N; i++) this.respawn(i, true);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3).setUsage(THREE.DynamicDrawUsage));
    const pm = new THREE.PointsMaterial({ size: 0.07, map: glowTex, transparent: true, depthWrite: false, sizeAttenuation: true, toneMapped: false });
    this.particles = new THREE.Points(pg, pm);
    this.particles.frustumCulled = false;
    this.scene.add(this.particles);
    this.fxMats.push(pm as unknown as THREE.MeshBasicMaterial);

    /* orbiting tech tags (shown by showChips) */
    for (const label of CHIP_LABELS) {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 110;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
      sprite.scale.set(0.72, 0.198, 1);
      sprite.renderOrder = 10;
      sprite.visible = false;
      this.scene.add(sprite);
      this.chips.push({ sprite, canvas, tex, label });
    }

    this.applyTheme(this.theme);
    this.boy.face(FRAMING[this.mode].yaw);

    /* observers */
    this.ro = new ResizeObserver(() => this.resize());
    this.io = new IntersectionObserver((e) => {
      this.onScreen = e.some((x) => x.isIntersecting);
      this.syncLoop();
    });
    this.mo = new MutationObserver(() => {
      const t: Theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
      if (t !== this.theme) this.applyTheme(t);
    });
    this.mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    this.fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    window.addEventListener('pointermove', this.onMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', this.onLeave);
    document.documentElement.addEventListener('mouseenter', this.onEnter);
    window.addEventListener('scroll', this.dirtyRect, { passive: true, capture: true });
    window.addEventListener('resize', this.dirtyRect, { passive: true });
    document.addEventListener('visibilitychange', this.syncLoop);
  }

  /* ------------------------------------------------------------ placing him */

  /** Puts the canvas inside `host` and starts drawing (until `detach`). */
  attach(host: HTMLElement, mode: StageMode, view?: Partial<StageView>) {
    if (this.host && this.host !== host) this.ro.unobserve(this.host), this.io.unobserve(this.host);
    this.host = host;
    this.view = { ax: 0.5, ay: 0.5, fill: 1, ...stripUndefined(view) };
    host.appendChild(this.canvas);
    // He fades in rather than popping up (the intro overlay is fading out as he lands in the lobby).
    this.canvas.style.transition = 'none';
    this.canvas.style.opacity = '0';
    requestAnimationFrame(() => {
      this.canvas.style.transition = 'opacity 0.4s ease-out';
      this.canvas.style.opacity = '1';
    });
    this.ro.observe(host);
    this.io.observe(host);
    this.setMode(mode);
    this.resize();
    this.syncLoop();
  }

  /** Takes the canvas out of `host`, if it is still there, and stops drawing. */
  detach(host: HTMLElement) {
    if (this.host !== host) return;
    this.ro.unobserve(host);
    this.io.unobserve(host);
    if (this.canvas.parentElement === host) host.removeChild(this.canvas);
    this.host = null;
    this.syncLoop();
  }

  /** The framing for where he is now, with this hero's own adjustments. */
  private frame(): HeroFraming {
    return { ...FRAMING[this.mode], ...this.boy.framing?.[this.mode] };
  }

  setMode(mode: StageMode) {
    this.mode = mode;
    const k = mode === 'intro' ? 1 : 0.84;
    this.padGroup.scale.set(k, 1, k);
    this.boy.face(this.frame().yaw);
    this.boy.showStaff(mode !== 'bust');
    this.resize();
  }

  /**
   * Puts the hero public/models/hero.json describes on the stage: the one made from his own picture
   * ("kind": "relief") or a real 3D model (see docs/character-model.md). Resolves true when he is in place,
   * false when the file is missing, describes no hero, or he fails to load or is not ready within `deadline`
   * (ms): the intro does not wait longer than that, and he must never change in front of the visitor, so a
   * hero that arrives later is thrown away. The caller then falls back to the code-built one (useBuiltIn).
   */
  async useModel(url: string, deadline = 12000): Promise<boolean> {
    const load = async () => {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) return null;
      const manifest = (await res.json()) as import('./model').HeroManifest | import('./relief').ReliefManifest;
      const base = new URL(url, window.location.href);
      if (manifest && 'kind' in manifest && manifest.kind === 'relief') {
        // the hero made from his own picture
        const { createReliefHero } = await import('./relief');
        return createReliefHero(manifest, base, this.theme);
      }
      if (!manifest || !('model' in manifest) || !manifest.model) return null;
      const { createModelHero } = await import('./model');
      return createModelHero(manifest, base, this.theme);
    };
    const loading = load();
    const timer = new Promise<'late'>((r) => setTimeout(() => r('late'), deadline));
    try {
      const hero = await Promise.race([loading, timer]);
      if (hero === 'late' || this.disposed) {
        void loading.then((h) => h?.dispose(), () => {});
        if (hero === 'late') console.warn(`hero model not used: it took longer than ${deadline / 1000} s to load`);
        return false;
      }
      if (!hero) return false;
      this.setHero(hero);
      return true;
    } catch (e) {
      console.warn('hero model not used:', e);
      return false;
    }
  }

  /** Puts the code-built hero on the stage: the fallback when hero.json describes no hero or he could not be loaded. */
  async useBuiltIn() {
    const { createBoy } = await import('./boy');
    if (!this.disposed) this.setHero(createBoy(this.theme));
  }

  private setHero(hero: BoyApi) {
    const old = this.boy;
    this.scene.remove(old.group);
    old.dispose();
    this.boy = hero;
    this.scene.add(hero.group);
    hero.textures?.forEach((t) => this.renderer.initTexture(t));
    hero.face(this.frame().yaw);
    hero.showStaff(this.mode !== 'bust');
    if (this.host) this.resize(); // his own framing, if he has one
  }

  /**
   * Compiles all the shaders (without blocking the page, where the browser allows) and uploads the
   * textures, so the first frame he is drawn does not stall. Called while the loading screen is up.
   */
  async warm() {
    try {
      this.textures.forEach((t) => this.renderer.initTexture(t));
      await this.renderer.compileAsync(this.scene, this.camera);
    } catch {
      /* not critical: the first frame just compiles then */
    }
  }

  /** Plays a pose for a while, then back to idle (a wave when he is clicked, say). */
  play(p: Pose, ms = 1900) {
    this.boy.pose(p);
    this.poseUntil = p === 'idle' ? 0 : performance.now() + ms;
  }

  /** Tech tags float up and orbit him (the intro, while he talks about his loadout), or settle away. */
  showChips(on: boolean) {
    this.chipsTarget = on ? 1 : 0;
  }

  /** Entrance: a scan line climbs his body, a ring of light spreads over the pad, the beam flashes. */
  materialise() {
    this.boy.materialise();
    this.pulseT = 0;
    this.beamBoost = 1;
    // the camera glides in from a little further back (GSAP)
    gsap.killTweensOf(this, 'dolly');
    this.dolly = 1.22;
    this.tweening++;
    gsap.to(this, {
      dolly: 1,
      duration: 1.9,
      ease: 'power3.out',
      onUpdate: () => this.placeCamera(),
      onComplete: () => {
        this.tweening = Math.max(0, this.tweening - 1);
      },
      onInterrupt: () => {
        this.tweening = Math.max(0, this.tweening - 1);
      },
    });
  }

  /* ------------------------------------------------------------ theme */

  private applyTheme(theme: Theme) {
    this.theme = theme;
    const p = PALETTES[theme];
    this.boy.setTheme(theme);
    const dark = theme === 'dark';
    const accent = new THREE.Color(p.accent);
    const blend = dark ? THREE.AdditiveBlending : THREE.NormalBlending;

    // reflections: built once per theme
    const rt = (this.envs[theme] ??= buildEnvironment(this.renderer, dark));
    this.scene.environment = rt.texture;
    this.scene.environmentIntensity = dark ? 0.62 : 0.85;

    const base = this.padBase.material as THREE.MeshStandardMaterial;
    base.color.set(dark ? '#15121f' : '#d9d3ea');
    base.metalness = dark ? 0.6 : 0.25;
    for (const m of this.fxMats) {
      m.color.copy(accent);
      m.blending = blend;
      m.needsUpdate = true;
    }
    // on the light page glows are drawn as plain, deeper colour instead of light
    (this.padDisc.material as THREE.MeshBasicMaterial).opacity = dark ? 0.95 : 0.8;
    (this.floorGlow.material as THREE.MeshBasicMaterial).opacity = dark ? 0.55 : 0.28;
    const haloMat = this.halo.material as THREE.MeshBasicMaterial;
    haloMat.color.set(p.accent2);
    haloMat.opacity = dark ? 0.34 : 0.2;
    this.beamMat.uniforms.uColor.value.copy(accent);
    this.beamMat.blending = blend;
    this.beamMat.needsUpdate = true;
    (this.particles.material as THREE.PointsMaterial).opacity = dark ? 0.95 : 0.8;
    (this.catcher.material as THREE.ShadowMaterial).opacity = dark ? 0.5 : 0.28;
    const paintChips = () =>
      this.chips.forEach((c) => {
        drawChip(c.canvas, c.label, PALETTES[this.theme].accent, this.theme === 'dark');
        c.tex.needsUpdate = true;
      });
    paintChips();
    // the display font may not have been downloaded yet (it is only fetched once some text uses it)
    void document.fonts?.load(`700 58px ${displayFont()}`).then(paintChips, () => {});

    this.lights.fill.color.set(dark ? '#c4b5ff' : '#ffffff');
    this.lights.fill.groundColor.set(dark ? '#1d1830' : '#b3a6d6');
    this.lights.fill.intensity = dark ? 0.3 : 0.5;
    this.lights.key.intensity = dark ? 1.9 : 1.8;
    this.lights.rimA.color.set(p.rim1);
    this.lights.rimB.color.set(p.rim2);
    this.lights.rimA.intensity = dark ? 2.0 : 1.2;
    this.lights.rimB.intensity = dark ? 1.6 : 0.9;
  }

  /* ------------------------------------------------------------ input */

  private onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    this.px = e.clientX;
    this.py = e.clientY;
    this.seen = true;
    this.inside = true;
    this.lastMove = performance.now();
  };
  private onLeave = () => {
    this.inside = false;
  };
  private onEnter = () => {
    this.inside = true;
  };
  private dirtyRect = () => {
    this.rect = null;
  };

  /* ------------------------------------------------------------ size and camera */

  /** Sharp enough on a retina screen, cheap enough on an integrated GPU: the full-screen intro gets less. */
  private pixelRatio() {
    const dpr = window.devicePixelRatio || 1;
    if (this.quality > 0) return 1;
    // never below 1.35: drawing a little larger than the screen and shrinking it gives clean edges on ordinary monitors too
    return Math.min(Math.max(dpr, 1.35), this.mode === 'intro' ? 1.5 : 1.75);
  }

  private resize() {
    if (!this.host || this.disposed) return;
    const w = Math.max(2, this.host.clientWidth);
    const h = Math.max(2, this.host.clientHeight);
    this.renderer.setPixelRatio(this.pixelRatio());
    this.renderer.setSize(w, h, false);
    this.size = { w, h };
    this.aspect = w / h;
    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
    this.rect = null;
    this.placeCamera();
  }

  private placeCamera() {
    const f = this.frame();
    const tan = Math.tan((FOV * Math.PI) / 360);
    const { ax, ay, fill } = this.view;
    const d = Math.max(f.h / 2 / tan / fill, f.w / 2 / (tan * this.aspect)) * this.dolly;
    // the camera swings a little round him as the pointer moves: a cheap, convincing 3D parallax
    const az = this.orbit.x * 0.2;
    const el = this.orbit.y * 0.05;
    this.camera.position.set(Math.sin(az) * d, f.y + f.lift + el * d, Math.cos(az) * d);
    this.camera.lookAt(0, f.y, 0);
    // Slide the picture so he stands at (ax, ay) of the canvas instead of dead centre.
    if (ax !== 0.5 || ay !== 0.5) {
      const { w, h } = this.size;
      this.camera.setViewOffset(w, h, (0.5 - ax) * w, (0.5 - ay) * h, w, h);
    } else {
      this.camera.clearViewOffset();
    }
  }

  /* ------------------------------------------------------------ loop */

  private syncLoop = () => {
    const should = !!this.host && this.onScreen && !document.hidden && !this.disposed;
    if (should && !this.running) {
      this.running = true;
      this.last = 0; // set by the first frame, from the same clock as `now`
      this.renderer.setAnimationLoop(this.tick);
    } else if (!should && this.running) {
      this.running = false;
      this.renderer.setAnimationLoop(null);
    }
  };

  private respawn(i: number, scatter: boolean) {
    const a = Math.random() * Math.PI * 2;
    const r = 0.2 + Math.random() * 0.65;
    this.pPos[i * 3] = Math.cos(a) * r;
    this.pPos[i * 3 + 1] = scatter ? Math.random() * 2.4 : 0.02;
    this.pPos[i * 3 + 2] = Math.sin(a) * r;
    this.pVel[i] = 0.14 + Math.random() * 0.34;
  }

  private tick = (now: number) => {
    // Pace: full rate while anything is moving (intro, talking, a gesture, the pointer), about 30 fps when
    // he is just standing there reading along with you, and never faster than ~60 on a 120/144 Hz screen.
    const busy =
      this.mode === 'intro' ||
      this.boy.entrance() < 1 ||
      this.boy.current() !== 'idle' ||
      this.mouthOverride !== null ||
      this.pulseT < 1 ||
      this.tweening > 0 ||
      now - this.lastMove < 1500 ||
      mouth().speaking;
    const slow = this.quality >= 2 ? 2.8 : 1;
    const gap = now - this.lastRender;
    if (gap < (busy ? 14 : 30) * slow) return;
    this.lastRender = now;

    // How is this machine coping? If frames we meant to draw at ~60 fps keep arriving slower than ~24 fps,
    // step down: first the resolution, then the frame rate. The page stays responsive whatever the GPU.
    if (busy && gap < 600) {
      this.avgGap = this.avgGap * 0.9 + gap * 0.1;
      this.strain = this.avgGap > 42 ? this.strain + gap / 1000 : Math.max(0, this.strain - gap / 500);
      if (this.strain > 2.5 && this.quality < 2) {
        this.quality++;
        this.strain = 0;
        this.avgGap = 16;
        this.resize(); // picks up the new pixel ratio
      }
    }

    // `now` is the frame's timestamp, which can be a little EARLIER than the time we noted when starting; a
    // negative step would make the easing blow up (exp of a positive number), so clamp it at zero.
    if (!this.last) this.last = now;
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.time += dt;
    const t = this.time;

    // The pointer steers the camera swing and his head. Once a mouse has been seen he keeps following it
    // for as long as it is over the window (no time-out); on touch screens he just glances about. Not during
    // the intro: there he looks at the viewer while he talks (following the cursor there looked wrong).
    const steering = this.fine && this.seen && this.inside && this.mode !== 'intro';
    const wantX = steering ? clamp((this.px / window.innerWidth) * 2 - 1, -1, 1) : 0;
    const wantY = steering ? clamp((this.py / window.innerHeight) * 2 - 1, -1, 1) : 0;
    const ox = this.orbit.x;
    const oy = this.orbit.y;
    const k = 1 - Math.exp(-3.5 * dt);
    this.orbit.x += (wantX - ox) * k;
    this.orbit.y += (wantY - oy) * k;
    if (Math.abs(this.orbit.x - ox) > 1e-4 || Math.abs(this.orbit.y - oy) > 1e-4) this.placeCamera();

    if (!this.rect && this.host) this.rect = this.host.getBoundingClientRect();
    const r = this.rect;
    if (r) {
      // where his head is on the screen, and so how far (and which way) the pointer is from it
      this.camera.updateMatrixWorld();
      this.boy.headWorld(this.v).project(this.camera);
      const hx = r.left + (this.v.x * 0.5 + 0.5) * r.width;
      const hy = r.top + (-this.v.y * 0.5 + 0.5) * r.height;
      const D = Math.max(480, window.innerHeight * 0.8);
      this.boy.look(Math.atan2(this.px - hx, D), Math.atan2(hy - this.py, D) * 0.9, steering);
    }

    // a timed pose (a wave on click) ends by itself
    if (this.poseUntil && now > this.poseUntil) {
      this.poseUntil = 0;
      this.boy.pose('idle');
    }

    this.boy.talk(this.mouthOverride ?? mouth());
    this.boy.seenFrom?.(this.camera);
    this.boy.update(dt);

    // pad
    this.padDisc.rotation.y = t * 0.18;
    this.beamMat.uniforms.uOpacity.value = (this.theme === 'dark' ? 0.62 : 0.4) * (0.86 + 0.14 * Math.sin(t * 1.7)) + this.beamBoost * 0.5;
    this.beamBoost = Math.max(0, this.beamBoost - dt * 0.9);
    this.padRing.scale.setScalar(1 + Math.sin(t * 2.0) * 0.006);
    this.halo.scale.setScalar(1 + Math.sin(t * 0.8) * 0.025);

    // entrance effects
    if (this.pulseT < 1) {
      this.pulseT = Math.min(1, this.pulseT + dt / 1.4);
      const e = easeOut(this.pulseT);
      this.pulse.scale.setScalar(0.55 + e * 1.5);
      (this.pulse.material as THREE.MeshBasicMaterial).opacity = (1 - this.pulseT) * 0.9;
    } else {
      (this.pulse.material as THREE.MeshBasicMaterial).opacity = 0;
    }
    const scanY = this.boy.scanHeight();
    this.scan.visible = scanY !== null && scanY < 2.25;
    if (scanY !== null) {
      this.scan.position.y = Math.max(0, scanY);
      (this.scan.material as THREE.MeshBasicMaterial).opacity = this.theme === 'dark' ? 0.55 : 0.45;
    }

    // Orbiting skill tags: two rings (every other tag a level up) circling him, sized to the screen so they
    // never run off a phone's edge, and fading while they pass in front of him so they never hide his face
    // or body. They ease in and out with `show`.
    this.chipsShown += (this.chipsTarget - this.chipsShown) * Math.min(1, dt * 4);
    const show = this.chipsShown;
    if (show > 0.02) {
      const tan = Math.tan((FOV * Math.PI) / 360);
      const ppu = this.size.h / (2 * this.camera.position.length() * tan); // screen px per world unit at his depth
      const room = (Math.min(this.view.ax, 1 - this.view.ax) * this.size.w) / ppu; // world units to the nearer side edge
      const chipW = clamp(this.size.w * 0.11, 92, 170) / ppu;
      const rx = clamp(room - chipW / 2 - 0.08, 0.55, 1.2) * (0.6 + 0.4 * show);
      const n = this.chips.length;
      for (let i = 0; i < n; i++) {
        const c = this.chips[i];
        c.sprite.visible = true;
        const a = (i / n) * Math.PI * 2 + t * 0.4;
        const x = Math.cos(a) * rx;
        const z = Math.sin(a) * 0.55;
        const y = (i % 2 ? 0.9 : 0.36) + Math.sin(t * 0.9 + i * 1.3) * 0.04 - (1 - show) * 0.25;
        c.sprite.position.set(x, y, z);
        // in front of his body: mostly see-through
        const inFront = THREE.MathUtils.smoothstep(z, 0.05, 0.3) * (1 - THREE.MathUtils.smoothstep(Math.abs(x), 0.3, 0.62));
        c.sprite.material.opacity = Math.min(1, show * 1.3) * (1 - 0.82 * inFront);
        const sc = chipW * (0.6 + 0.4 * show);
        c.sprite.scale.set(sc, sc * (110 / 400), 1);
      }
    } else {
      for (const c of this.chips) c.sprite.visible = false;
    }

    // sparks
    for (let i = 0; i < this.pVel.length; i++) {
      this.pPos[i * 3 + 1] += this.pVel[i] * dt;
      this.pPos[i * 3] += Math.sin(t * 0.8 + i) * 0.0009;
      if (this.pPos[i * 3 + 1] > 2.5) this.respawn(i, false);
    }
    (this.particles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.ro.disconnect();
    this.io.disconnect();
    this.mo.disconnect();
    window.removeEventListener('pointermove', this.onMove);
    document.documentElement.removeEventListener('mouseleave', this.onLeave);
    document.documentElement.removeEventListener('mouseenter', this.onEnter);
    window.removeEventListener('scroll', this.dirtyRect, { capture: true });
    window.removeEventListener('resize', this.dirtyRect);
    document.removeEventListener('visibilitychange', this.syncLoop);
    this.boy.dispose();
    this.textures.forEach((t) => t.dispose());
    Object.values(this.envs).forEach((rt) => rt?.dispose());
    this.chips.forEach((c) => {
      c.tex.dispose();
      c.sprite.material.dispose();
    });
    this.renderer.dispose();
  }
}

/* ---------------------------------------------------------------- one shared stage */

let shared: Stage | null = null;

/** The shared stage, created on first use. Throws if WebGL is not available. */
export function getStage(): Stage {
  if (!shared) {
    shared = new Stage();
    if (process.env.NODE_ENV !== 'production') Object.assign(window, { __stage: shared, __mouth: mouth });
  }
  return shared;
}
