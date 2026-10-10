// The hero built from his own picture: a "relief". The picture (sharpened and cut out; see
// docs/character-model.md) is laid over two meshes that have real depth, one for the body and one for the
// head. Seen from the front he is exactly the artwork, and he still lives in 3D: his head turns towards the
// pointer (the face slides over a rounded head, like a real one), he breathes, blinks with real eyelids,
// talks with a small mouth that follows the voice (his chin drops with it), his hair stirs, and the core of
// his spear glows.
//
// He behaves like the other heroes (the same BoyApi), so the stage, the intro and the lobby do not know the
// difference. Everything about the picture is described by public/models/hero.json ("kind": "relief").
// All positions there are in the picture's own pixels (x right, y down).

import * as THREE from 'three';
import type { MouthShape } from '@/lib/voice';
import type { BoyApi, Pose, Theme } from './hero';

type Box = [number, number, number, number];

interface Layer {
  /** The layer's picture (straight alpha). */
  color: string;
  /** Its height map: red = height, green = where the layer has anything at all. */
  depth: string;
  /** Height (picture pixels) of a full-red value, and of a zero one. */
  depthScale: number;
  lift: number;
  /** Where the layer sits in the picture: x, y, width, height. */
  rect: Box;
}

export interface ReliefManifest {
  kind: 'relief';
  /** His height in the scene (the code-built hero is about 1.95). */
  height: number;
  /** The top of his hair (y). */
  top: number;
  /** The point on the ground between his feet. */
  origin: [number, number];
  /** Where he is meant to be seen from: the camera's height and its distance, in scene units. */
  eye?: [number, number];
  /** Mesh fineness: one vertex every `step` pixels. */
  step?: number;
  body: Layer;
  head: Layer;
  /** The neck: what the head turns about (x, y, and depth in pixels). */
  pivot: [number, number, number];
  /** The closed eyelids: one small picture holding, for each eye, the lid's skin and how the lid travels. */
  lids?: { map: string; size: [number, number]; height: number; lash: string; lashWidth: number; eyes: { box: Box; skin: Box; data: Box }[] };
  /** The mouth: top centre, half width, height when just parted, how much further it opens; its colours. */
  mouth?: { c: [number, number]; w: number; thin: number; drop: number; lip: string; inside: string; tongue: string };
  /** The chin, which drops as the mouth opens: centre, radii, the line it starts below, how far (pixels). */
  jaw?: { c: [number, number]; r: [number, number]; from: number; drop: number };
  /** A hint of a smile when he greets: the corners of the mouth, how far round each the skin moves, how far up (pixels). */
  smile?: { corners: [number, number][]; r: number; lift: number };
  /** The spear's glowing core: centre and radius of the glow. */
  glow?: { c: [number, number]; r: number; color?: string };
  /** Hair that stirs: everything of the head above this line, more the higher it is (pixels of travel at the top). */
  hair?: { below: number; sway: number };
  framing?: BoyApi['framing'];
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const sstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const damp = (cur: number, target: number, lambda: number, dt: number) => target + (cur - target) * Math.exp(-lambda * Math.max(0, dt));

async function loadImage(url: string) {
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  await img.decode(); // rejects when the file is missing or is not a picture
  return img;
}

/** Reads a picture's pixels and returns a sampler: channel `ch` (0..1) at u, v (0..1 across the picture). */
function sampler(img: HTMLImageElement) {
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0);
  const { data } = g.getImageData(0, 0, W, H);
  const at = (x: number, y: number, ch: number) => data[(clamp(y, 0, H - 1) * W + clamp(x, 0, W - 1)) * 4 + ch] / 255;
  return (u: number, v: number, ch: number) => {
    const x = u * W - 0.5;
    const y = v * H - 0.5;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    return (at(x0, y0, ch) * (1 - fx) + at(x0 + 1, y0, ch) * fx) * (1 - fy) + (at(x0, y0 + 1, ch) * (1 - fx) + at(x0 + 1, y0 + 1, ch) * fx) * fy;
  };
}

/** A colour as the three numbers a shader writes straight to the screen (no conversion). */
const srgb = (hex: string) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

const OVERLAY_VERTEX = 'varying vec2 vUv;\nvoid main() {\n  vUv = uv;\n  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n}';

// An eyelid. The texture holds its skin (alpha = where the lid is) and, for every point, how far down the eye
// it is (red, 0 top .. 1 bottom) and how tall the eye is there (green): the lid covers what lies above its
// edge, and the lash line rides on that edge.
const LID_FRAGMENT = `
uniform sampler2D map;
uniform vec2 uSize;
uniform vec4 uSkin;
uniform vec4 uData;
uniform float uClose;
uniform float uHeight;
uniform float uLashW;
uniform vec3 uLash;
varying vec2 vUv;
vec4 cell( vec4 r ) {
  vec2 st = ( r.xy + vUv * r.zw ) / uSize;
  return texture2D( map, vec2( st.x, 1.0 - st.y ) );
}
void main() {
  vec4 skin = cell( uSkin );
  vec4 dat = cell( uData );
  float tall = dat.g * uHeight;
  float d = ( uClose - dat.r ) * tall;
  float a = skin.a * smoothstep( 0.0, 0.5, d );
  if ( a < 0.004 ) discard;
  float lash = ( 1.0 - smoothstep( uLashW * 0.35, uLashW, d ) ) * smoothstep( 0.08, 0.3, uClose ) * smoothstep( 2.0, 10.0, tall ) * 0.92;
  gl_FragColor = vec4( mix( skin.rgb, uLash, lash ), a );
}`;

// The open mouth: an oval hanging from the line of the closed mouth; dark inside, a tongue, a thin lip line.
const MOUTH_FRAGMENT = `
uniform float uOpen;
uniform float uWide;
uniform vec3 uDims;
uniform vec3 uLip;
uniform vec3 uInside;
uniform vec3 uTongue;
varying vec2 vUv;
void main() {
  float w = uDims.x * ( 0.9 + 0.16 * uWide - 0.06 * uOpen );
  float h = uDims.y + uOpen * uDims.z;
  vec2 c = vec2( 0.0, h * 0.5 );
  vec2 r = vec2( w, h * 0.5 );
  float d = length( ( vUv - c ) / r );
  float aa = fwidth( d ) * 1.2 + 0.0001;
  float a = ( 1.0 - smoothstep( 1.0 - aa, 1.0 + aa, d ) ) * smoothstep( 0.04, 0.14, uOpen );
  if ( a < 0.004 ) discard;
  float inner = length( ( vUv - c ) / max( r - vec2( 1.2, 0.8 ), vec2( 0.01 ) ) );
  float rim = smoothstep( 1.0 - aa * 1.5, 1.0 + aa * 1.5, inner );
  vec2 tp = ( vUv - vec2( 0.0, h * 0.9 ) ) / vec2( w * 0.62, h * 0.36 );
  float tongue = ( 1.0 - smoothstep( 0.7, 1.0, length( tp ) ) ) * smoothstep( 0.3, 0.7, uOpen );
  vec3 col = mix( uInside * mix( 0.72, 1.0, clamp( vUv.y / h, 0.0, 1.0 ) ), uTongue, tongue );
  gl_FragColor = vec4( mix( col, uLip, rim ), a );
}`;

/** Loads the picture layers the manifest names and builds the hero from them. Throws if a file is missing. */
export async function createReliefHero(m: ReliefManifest, base: URL, _theme: Theme): Promise<BoyApi> {
  const url = (f: string) => new URL(f, base).href;
  const [bodyImg, headImg, bodyDepth, headDepth, lidsImg] = await Promise.all([
    loadImage(url(m.body.color)),
    loadImage(url(m.head.color)),
    loadImage(url(m.body.depth)),
    loadImage(url(m.head.depth)),
    m.lids ? loadImage(url(m.lids.map)) : Promise.resolve(null),
  ]);

  /* ------------ picture pixels -> scene units: x right, y up, z towards the viewer; the origin is on the ground */
  const s = m.height / (m.origin[1] - m.top);
  const X = (px: number) => (px - m.origin[0]) * s;
  const Y = (py: number) => (m.origin[1] - py) * s;
  const [eyeY, eyeZ] = m.eye ?? [1.42, 5.4];
  /**
   * A point of the picture raised by `h` pixels. It is raised along the line of sight of the camera he is
   * meant to be seen by, so from there every point stays exactly where the picture has it, however high.
   */
  const raise = (px: number, py: number, h: number, out: THREE.Vector3) => {
    const k = (h * s) / eyeZ;
    const x = X(px);
    const y = Y(py);
    return out.set(x * (1 - k), y + (eyeY - y) * k, h * s);
  };

  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 10); // hides everything above it while he materialises
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const texs: THREE.Texture[] = [];
  const time = { value: 0 };

  /** One layer as a mesh with depth: a grid over its rectangle, pushed out by its height map. */
  const buildLayer = (layer: Layer, img: HTMLImageElement, depthImg: HTMLImageElement, origin: THREE.Vector3, opts: { bias?: number; shapes?: ((px: number, py: number) => [number, number])[]; sway?: (px: number, py: number) => number } = {}) => {
    const field = sampler(depthImg);
    const [rx, ry, rw, rh] = layer.rect;
    const heightAt = (px: number, py: number) => field((px - rx) / rw, (py - ry) / rh, 0) * layer.depthScale + layer.lift;
    const step = m.step ?? 3;
    const nx = Math.max(2, Math.round(rw / step));
    const ny = Math.max(2, Math.round(rh / step));
    const count = (nx + 1) * (ny + 1);
    const pos = new Float32Array(count * 3);
    const uv = new Float32Array(count * 2);
    const covered = new Uint8Array(count);
    // shapes the mesh can be pulled into (the chin dropping, a smile): for each, how far every point moves, in pixels
    const shapes = (opts.shapes ?? []).map(() => new Float32Array(count * 3));
    const sway = opts.sway ? new Float32Array(count) : null;
    const p = new THREE.Vector3();
    for (let iy = 0; iy <= ny; iy++) {
      for (let ix = 0; ix <= nx; ix++) {
        const u = ix / nx;
        const v = iy / ny;
        const k = iy * (nx + 1) + ix;
        const px = rx + u * rw;
        const py = ry + v * rh;
        raise(px, py, heightAt(px, py), p).sub(origin);
        pos[k * 3] = p.x;
        pos[k * 3 + 1] = p.y;
        pos[k * 3 + 2] = p.z;
        uv[k * 2] = u;
        uv[k * 2 + 1] = 1 - v;
        covered[k] = field(u, v, 1) > 0.02 ? 1 : 0;
        shapes.forEach((a, n) => {
          const [dx, dy] = opts.shapes![n](px, py);
          a[k * 3] = dx * s;
          a[k * 3 + 1] = -dy * s;
        });
        if (sway) sway[k] = opts.sway!(px, py) * s;
      }
    }
    // only the cells that have something in them
    const index: number[] = [];
    for (let iy = 0; iy < ny; iy++) {
      for (let ix = 0; ix < nx; ix++) {
        const a = iy * (nx + 1) + ix;
        const b = a + 1;
        const c = a + nx + 1;
        const d = c + 1;
        if (!(covered[a] || covered[b] || covered[c] || covered[d])) continue;
        index.push(a, c, b, b, c, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    if (sway) geo.setAttribute('aSway', new THREE.BufferAttribute(sway, 1));
    if (shapes.length) {
      geo.morphAttributes.position = shapes.map((a) => new THREE.BufferAttribute(a, 3));
      geo.morphTargetsRelative = true;
    }
    geo.setIndex(index);
    geo.computeBoundingSphere();
    geos.push(geo);

    const map = new THREE.Texture(img);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    map.needsUpdate = true;
    texs.push(map);
    // The picture has its own painted light and shade, so it is drawn as it is (not lit again by the scene).
    const mat = new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: 0.03, toneMapped: false, clippingPlanes: [clip] });
    const bias = opts.bias ?? 0;
    if (bias || sway) {
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uBias = { value: bias };
        shader.uniforms.uTime = time;
        shader.vertexShader =
          'uniform float uBias;\nuniform float uTime;\n' +
          (sway ? 'attribute float aSway;\n' : '') +
          shader.vertexShader
            // hair stirring: the higher a lock, the further it travels, each a little out of step
            .replace('#include <begin_vertex>', sway ? '#include <begin_vertex>\n  transformed.x += aSway * ( sin( uTime * 1.3 + position.y * 9.0 ) + 0.4 * sin( uTime * 2.9 + position.x * 13.0 ) );' : '#include <begin_vertex>')
            // drawn as if it stood `uBias` nearer: the head always wins against the body it overlaps
            .replace('#include <project_vertex>', '#include <project_vertex>\n  { vec4 nearer = projectionMatrix * vec4( mvPosition.xyz + vec3( 0.0, 0.0, uBias ), 1.0 ); gl_Position.z = nearer.z / nearer.w * gl_Position.w; }');
      };
      mat.customProgramCacheKey = () => `relief-${bias ? 'b' : ''}${sway ? 's' : ''}`;
    }
    mats.push(mat);
    // (He casts no shadow of his own: he is nearly flat, so it would be a few thin streaks on the pad. A soft
    // shadow is laid under his feet instead, see below.)
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    return { mesh, heightAt, has: (px: number, py: number) => field((px - rx) / rw, (py - ry) / rh, 1) > 0.5 };
  };

  /* ------------ the figure */
  const root = new THREE.Group();
  root.name = 'hero-relief';
  const sway = new THREE.Group(); // breathing, hops, leaning
  root.add(sway);
  const body = buildLayer(m.body, bodyImg, bodyDepth, new THREE.Vector3());
  body.mesh.renderOrder = -2;
  sway.add(body.mesh);

  // the head turns about the neck
  const pivot = new THREE.Vector3(X(m.pivot[0]), Y(m.pivot[1]), m.pivot[2] * s);
  const neck = new THREE.Group();
  neck.position.copy(pivot);
  sway.add(neck);
  const jaw = m.jaw;
  const smile = m.smile;
  const hair = m.hair;
  const head = buildLayer(m.head, headImg, headDepth, pivot, {
    bias: 0.1,
    shapes: [
      // 0: the chin drops (as the mouth opens)
      (px, py) => [0, jaw ? jaw.drop * (1 - sstep(0.35, 1, Math.abs(px - jaw.c[0]) / jaw.r[0])) * sstep(jaw.from, jaw.from + 14, py) : 0],
      // 1: the corners of the mouth lift and widen a little
      (px, py) => {
        let dx = 0;
        let dy = 0;
        for (const [cx, cy] of smile?.corners ?? []) {
          const k = 1 - sstep(0.15, 1, Math.hypot(px - cx, py - cy) / smile!.r);
          dx += Math.sign(cx - m.pivot[0]) * k * smile!.lift * 0.4;
          dy -= k * smile!.lift;
        }
        return [dx, dy];
      },
    ],
    sway: hair ? (px, py) => hair.sway * Math.pow(clamp((hair.below - py) / (hair.below - m.top), 0, 1), 1.6) : undefined,
  });
  head.mesh.renderOrder = -1;
  neck.add(head.mesh);

  /** A small grid lying on the head's surface over a box of the picture; `uv` runs 0..1 across it (v down), or holds `at`. */
  const onHead = (box: Box, nx: number, ny: number, at?: (px: number, py: number) => [number, number]) => {
    const [bx, by, bw, bh] = box;
    const pos = new Float32Array((nx + 1) * (ny + 1) * 3);
    const uv = new Float32Array((nx + 1) * (ny + 1) * 2);
    const index: number[] = [];
    const p = new THREE.Vector3();
    for (let iy = 0; iy <= ny; iy++) {
      for (let ix = 0; ix <= nx; ix++) {
        const k = iy * (nx + 1) + ix;
        const px = bx + (ix / nx) * bw;
        const py = by + (iy / ny) * bh;
        raise(px, py, head.heightAt(px, py) + 0.6, p).sub(pivot);
        pos.set([p.x, p.y, p.z], k * 3);
        uv.set(at ? at(px, py) : [ix / nx, iy / ny], k * 2);
        if (ix < nx && iy < ny) index.push(k, k + nx + 1, k + 1, k + 1, k + nx + 1, k + nx + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(index);
    geos.push(geo);
    return geo;
  };
  const overlay = (geo: THREE.BufferGeometry, fragmentShader: string, uniforms: Record<string, THREE.IUniform>) => {
    // drawn over the head whatever the depth says: they lie on its surface, and nothing of him is in front of his face
    const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: OVERLAY_VERTEX, fragmentShader, transparent: true, depthTest: false, depthWrite: false });
    mats.push(mat);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = -0.5;
    mesh.frustumCulled = false;
    mesh.visible = false;
    neck.add(mesh);
    return mesh;
  };

  /* ------------ eyelids */
  const close = { value: 0 };
  const lids: THREE.Mesh[] = [];
  if (m.lids && lidsImg) {
    const map = new THREE.Texture(lidsImg);
    map.colorSpace = THREE.NoColorSpace; // it also holds numbers; the shader writes its colours out as they are
    map.generateMipmaps = false;
    map.minFilter = map.magFilter = THREE.LinearFilter;
    map.needsUpdate = true;
    texs.push(map);
    for (const e of m.lids.eyes) {
      lids.push(
        overlay(onHead(e.box, 8, 6), LID_FRAGMENT, {
          map: { value: map },
          uSize: { value: new THREE.Vector2(...m.lids.size) },
          uSkin: { value: new THREE.Vector4(...e.skin) },
          uData: { value: new THREE.Vector4(...e.data) },
          uClose: close,
          uHeight: { value: m.lids.height },
          uLashW: { value: m.lids.lashWidth },
          uLash: { value: srgb(m.lids.lash) },
        }),
      );
    }
  }

  /* ------------ the mouth (hidden while it is shut: the picture's own closed mouth shows then) */
  const open = { value: 0 };
  const wide = { value: 0 };
  let mouth: THREE.Mesh | null = null;
  if (m.mouth) {
    const { c, w, thin, drop } = m.mouth;
    mouth = overlay(onHead([c[0] - w - 4, c[1] - 3, w * 2 + 8, thin + drop + 8], 8, 5, (px, py) => [px - c[0], py - c[1]]), MOUTH_FRAGMENT, {
      uOpen: open,
      uWide: wide,
      uDims: { value: new THREE.Vector3(w, thin, drop) },
      uLip: { value: srgb(m.mouth.lip) },
      uInside: { value: srgb(m.mouth.inside) },
      uTongue: { value: srgb(m.mouth.tongue) },
    });
  }

  /* ------------ the spear's glowing core */
  let glow: THREE.Sprite | null = null;
  let glowBase = 0;
  if (m.glow) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.3, 'rgba(255,255,255,0.4)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    texs.push(t);
    const mat = new THREE.SpriteMaterial({ map: t, color: m.glow.color ?? '#7fe6ff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0.6, clippingPlanes: [clip] });
    mats.push(mat);
    glow = new THREE.Sprite(mat);
    const [gx, gy] = m.glow.c;
    raise(gx, gy, body.heightAt(gx, gy) + 6, glow.position);
    glowBase = m.glow.r * 2 * s;
    glow.scale.setScalar(glowBase);
    sway.add(glow);
  }

  /* ------------ a soft shadow where he stands (his own cast shadow is thin and falls far behind him) */
  const shade = (() => {
    // how wide he stands: the picture's last rows
    let x0 = Infinity;
    let x1 = -Infinity;
    for (let py = m.origin[1] - 14; py < m.origin[1] - 1; py += 2) {
      for (let px = m.body.rect[0]; px < m.body.rect[0] + m.body.rect[2]; px += 2) {
        if (!body.has(px, py)) continue;
        x0 = Math.min(x0, px);
        x1 = Math.max(x1, px);
      }
    }
    if (!(x1 > x0)) return null;
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.45, 'rgba(255,255,255,0.55)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    texs.push(t);
    const mat = new THREE.MeshBasicMaterial({ map: t, color: '#05030f', transparent: true, depthWrite: false, toneMapped: false, opacity: 0 });
    mats.push(mat);
    const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    geos.push(geo);
    const mesh = new THREE.Mesh(geo, mat);
    const w = (x1 - x0) * s * 1.3;
    mesh.position.set(X((x0 + x1) / 2), 0.014, 0.03);
    mesh.scale.set(w, 1, Math.max(0.16, w * 0.36));
    mesh.renderOrder = -3;
    root.add(mesh);
    return { mesh, mat, w };
  })();
  let shadeOpacity = _theme === 'dark' ? 0.55 : 0.3;

  /* ------------ state */
  const st = {
    t: 0,
    pose: 'idle' as Pose,
    poseT: 0,
    camAz: 0,
    yaw: 0,
    yawT: 0,
    lookYaw: 0,
    lookPitch: 0,
    tracking: false,
    turn: 0, // where his head points, as seen on the screen
    nod: 0,
    glance: 0,
    glanceIn: 3,
    glanceYaw: 0,
    glancePitch: 0,
    talking: false,
    open: 0,
    openT: 0,
    wide: 0,
    beat: 0,
    beatCool: 0,
    lastOpen: 0,
    blinkIn: 1.8,
    blinkPhase: -1,
    lean: 0,
    hop: 0,
    tilt: 0,
    flare: 0,
    smile: 0,
    ent: 1,
    entActive: false,
  };
  // between the eyes, on his face (what the stage calls "his head")
  const face = new THREE.Vector3();
  {
    const e = m.lids?.eyes ?? [];
    const cx = e.length ? e.reduce((a, b) => a + b.box[0] + b.box[2] / 2, 0) / e.length : m.pivot[0];
    const cy = e.length ? e.reduce((a, b) => a + b.box[1] + b.box[3] / 2, 0) / e.length : m.pivot[1] - (m.pivot[1] - m.top) * 0.28;
    raise(cx, cy, head.heightAt(cx, cy), face).sub(pivot);
  }

  const api: BoyApi = {
    group: root,
    framing: m.framing,
    textures: texs,
    setTheme(theme) {
      shadeOpacity = theme === 'dark' ? 0.55 : 0.3;
    },
    seenFrom(camera) {
      // A picture has only one good side: he keeps it towards the camera, wherever the camera swings to.
      st.camAz = Math.atan2(camera.position.x - root.position.x, camera.position.z - root.position.z);
    },
    look(yaw, pitch, tracking) {
      st.lookYaw = yaw;
      st.lookPitch = pitch;
      st.tracking = tracking;
    },
    talk(mm: MouthShape) {
      st.talking = mm.speaking;
      st.openT = mm.open;
      st.wide = mm.wide;
      if (mm.open > 0.62 && st.lastOpen < 0.45 && st.beatCool <= 0) {
        st.beat = 1;
        st.beatCool = 0.42;
      }
      st.lastOpen = mm.open;
    },
    pose(p) {
      if (st.pose !== p) {
        st.pose = p;
        st.poseT = 0;
      }
    },
    current: () => st.pose,
    face(yaw) {
      // he cannot turn far: he only angles a little towards where the page wants him to face
      st.yawT = clamp(yaw, -0.12, 0.12);
    },
    materialise() {
      st.ent = 0;
      st.entActive = true;
    },
    entrance: () => st.ent,
    scanHeight: () => (st.entActive ? clip.constant : null),
    headWorld(out) {
      return neck.localToWorld(out.copy(face));
    },
    showStaff() {},
    update(dt) {
      dt = clamp(dt, 0, 0.05);
      st.t += dt;
      st.poseT += dt;
      st.beatCool -= dt;
      st.beat = Math.max(0, st.beat - dt * 4.5);
      const t = st.t;
      time.value = t;

      // the materialise scan, feet to hair
      if (st.entActive) {
        st.ent = Math.min(1, st.ent + dt / 1.15);
        clip.constant = THREE.MathUtils.lerp(-0.05, m.height * 1.12, 1 - Math.pow(1 - st.ent, 3));
        if (st.ent >= 1) {
          st.entActive = false;
          clip.constant = 10;
        }
      }

      // where he looks: the pointer when someone is steering, the viewer while talking, otherwise a glance now and then
      st.glanceIn -= dt;
      if (st.glanceIn <= 0) {
        st.glanceIn = 2.4 + Math.random() * 3.2;
        st.glance = 1;
        st.glanceYaw = (Math.random() - 0.5) * 0.5;
        st.glancePitch = (Math.random() - 0.4) * 0.2;
      }
      st.glance = Math.max(0, st.glance - dt * 0.22);
      const wantTurn = st.tracking ? clamp(st.lookYaw * 0.46, -0.36, 0.36) : st.talking ? 0 : st.glanceYaw * st.glance;
      const wantNod = st.tracking ? clamp(st.lookPitch * 0.42, -0.2, 0.2) : st.talking ? 0 : st.glancePitch * st.glance;
      st.turn = damp(st.turn, wantTurn, 7, dt);
      st.nod = damp(st.nod, wantNod, 7, dt);

      // what his gesture adds: he is a picture, so gestures are body language (a lean, a hop, a tilt of the
      // head) and the light of his spear
      const p = st.pose;
      const pt = st.poseT;
      const wantLean = p === 'point' ? 0.03 : p === 'wave' ? Math.sin(pt * 9) * 0.026 * Math.exp(-pt * 0.9) : p === 'explain' ? Math.sin(t * 2.3) * 0.012 : 0;
      const wantTilt = p === 'wave' ? -0.07 : p === 'chest' ? 0.05 : p === 'point' ? 0.055 : p === 'welcome' ? -0.05 : p === 'explain' ? Math.sin(t * 2.3 + 1) * 0.03 : 0;
      const wantHop = p === 'wave' || p === 'welcome' ? Math.abs(Math.sin(pt * 6)) * Math.exp(-pt * 1.4) * 0.05 : 0;
      const wantFlare = p === 'point' || p === 'explain' ? 1 : p === 'welcome' ? 0.7 : 0;
      st.lean = damp(st.lean, wantLean, 9, dt);
      st.tilt = damp(st.tilt, wantTilt, 6, dt);
      st.hop = damp(st.hop, wantHop, 16, dt);
      st.flare = damp(st.flare, wantFlare, 4, dt);
      st.smile = damp(st.smile, p === 'wave' || p === 'welcome' ? 1 : p === 'chest' ? 0.6 : p === 'idle' ? 0 : 0.3, 5, dt);

      // body: it faces the camera, angled a little the way the page wants and a little after his head
      st.yaw = damp(st.yaw, st.yawT, 5, dt);
      const bodyTurn = st.yaw + st.turn * 0.24;
      root.rotation.y = st.camAz + bodyTurn;
      const br = Math.sin(t * 1.7);
      sway.position.y = br * 0.004 + st.hop + st.beat * 0.005;
      sway.scale.y = 1 + br * 0.004;
      sway.rotation.z = Math.sin(t * 0.43) * 0.006 + st.lean;

      // head: turns and nods about the neck
      neck.rotation.y = clamp(st.turn - bodyTurn, -0.4, 0.4);
      neck.rotation.x = -st.nod + st.beat * 0.04 + (st.talking ? Math.sin(t * 5.1) * 0.008 : 0) + Math.sin(t * 0.9) * 0.006;
      neck.rotation.z = st.tilt + Math.sin(t * 0.6) * 0.008;

      // blink: down fast, up a little slower; never while he is still appearing
      st.blinkIn -= dt;
      if (st.blinkIn <= 0 && st.blinkPhase < 0 && !st.entActive) {
        st.blinkPhase = 0;
        st.blinkIn = 2.2 + Math.random() * 3.6;
        if (Math.random() < 0.16) st.blinkIn = 0.32; // now and then a double blink
      }
      if (st.blinkPhase >= 0) {
        st.blinkPhase += dt / 0.2;
        const ph = st.blinkPhase;
        close.value = ph < 0.38 ? sstep(0, 0.38, ph) : 1 - sstep(0.46, 1, ph);
        if (ph >= 1) {
          st.blinkPhase = -1;
          close.value = 0;
        }
      }
      for (const lid of lids) lid.visible = close.value > 0.01;

      // mouth: quick to open, a little slower to close; the chin goes with it
      st.open = damp(st.open, st.openT, st.openT > st.open ? 38 : 20, dt);
      open.value = st.open;
      wide.value = st.wide;
      if (mouth) mouth.visible = st.open > 0.04 && !st.entActive;
      const pull = head.mesh.morphTargetInfluences;
      if (pull) {
        pull[0] = st.open;
        pull[1] = st.smile * (1 - st.open * 0.6);
      }

      // his shadow on the ground: there once he has appeared, smaller and fainter while he is off it
      if (shade) {
        const up = clamp(st.hop / 0.05, 0, 1);
        shade.mat.opacity = shadeOpacity * sstep(0.05, 0.5, st.ent) * (1 - up * 0.45);
        shade.mesh.scale.x = shade.w * (1 - up * 0.2);
      }

      // the spear's core breathes, and flares when he presents something
      if (glow) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.1);
        glow.scale.setScalar(glowBase * (0.9 + pulse * 0.2 + st.flare * 0.55));
        glow.material.opacity = 0.42 + pulse * 0.2 + st.flare * 0.3;
      }
    },
    dispose() {
      geos.forEach((g) => g.dispose());
      mats.forEach((x) => x.dispose());
      texs.forEach((x) => x.dispose());
    },
  };
  return api;
}
