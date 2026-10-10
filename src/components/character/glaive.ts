// The hero's ice glaive: a wooden shaft with leather wraps and bronze fittings, a broad translucent ice blade
// with two curved wings, a glowing diamond core, a soft glow sprite and a point light that lights him in cyan.
// Shared by the code-built hero (boy.ts) and the hero made from a real model file (model.ts).
//
// The group's origin is the grip; the shaft runs along +y (about 0.65 below the grip, 1.5 above it).

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface Glaive {
  group: THREE.Group;
  /** The core's pulse; `t` in seconds. */
  update(t: number): void;
  dispose(): void;
}

const GEM = '#5ee3ff';

export function createGlaive(clip: THREE.Plane[] = []): Glaive {
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const texs: THREE.Texture[] = [];
  const mat = <M extends THREE.Material>(m: M): M => {
    m.clippingPlanes = clip;
    m.clipShadows = true;
    mats.push(m);
    return m;
  };
  const wood = mat(new THREE.MeshStandardMaterial({ color: '#8a5a32', roughness: 0.72 }));
  const leather = mat(new THREE.MeshStandardMaterial({ color: '#58331b', roughness: 0.65 }));
  const bronze = mat(new THREE.MeshStandardMaterial({ color: '#c38b4c', roughness: 0.3, metalness: 0.9 }));
  const ice = mat(
    new THREE.MeshPhysicalMaterial({
      color: '#a6e8ff',
      roughness: 0.08,
      emissive: new THREE.Color('#3fc4ff'),
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.9,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
    }),
  );
  const core = mat(new THREE.MeshBasicMaterial({ color: '#dff9ff', toneMapped: false }));

  const group = new THREE.Group();
  group.name = 'glaive';

  // the shaft and its fittings, merged into one mesh per material
  const headY = 1.06;
  const at = (g: THREE.BufferGeometry, y: number) => g.translate(0, y, 0);
  const ring = (r: number, tube: number) => new THREE.TorusGeometry(r, tube, 10, 28).rotateX(Math.PI / 2);
  const parts = new Map<THREE.Material, THREE.BufferGeometry[]>([
    [wood, [at(new THREE.CylinderGeometry(0.0165, 0.0185, 1.64, 20), 0.22)]],
    [leather, [-0.13, -0.075, -0.02, 0.6].map((y) => at(ring(0.02, 0.006), y))],
    [
      bronze,
      [
        at(new THREE.ConeGeometry(0.02, 0.07, 16).rotateX(Math.PI), -0.63),
        at(new THREE.CylinderGeometry(0.031, 0.021, 0.08, 24), headY - 0.04),
        at(ring(0.03, 0.007), headY - 0.002),
      ],
    ],
  ]);
  for (const [m, list] of parts) {
    const merged = mergeGeometries(list, false);
    list.forEach((g) => g.dispose());
    if (!merged) continue;
    geos.push(merged);
    const mesh = new THREE.Mesh(merged, m);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // the head: a broad, leaf-shaped ice blade with two curved side wings, and a glowing diamond core
  const head = new THREE.Group();
  head.position.y = headY;
  group.add(head);
  const blade = new THREE.Shape();
  blade.moveTo(0, -0.01);
  blade.bezierCurveTo(0.07, 0.02, 0.078, 0.14, 0.046, 0.25);
  blade.lineTo(0, 0.41);
  blade.lineTo(-0.046, 0.25);
  blade.bezierCurveTo(-0.078, 0.14, -0.07, 0.02, 0, -0.01);
  const wing = (s: number) => {
    const w = new THREE.Shape();
    w.moveTo(s * 0.032, 0.018);
    w.bezierCurveTo(s * 0.1, -0.005, s * 0.152, 0.05, s * 0.165, 0.175);
    w.bezierCurveTo(s * 0.125, 0.11, s * 0.09, 0.085, s * 0.04, 0.09);
    w.lineTo(s * 0.032, 0.018);
    return w;
  };
  const bladeGeo = new THREE.ExtrudeGeometry([blade, wing(1), wing(-1)], {
    depth: 0.014,
    bevelEnabled: true,
    bevelThickness: 0.007,
    bevelSize: 0.006,
    bevelSegments: 3,
    curveSegments: 18,
  }).translate(0, 0, -0.007);
  geos.push(bladeGeo);
  const bladeMesh = new THREE.Mesh(bladeGeo, ice);
  bladeMesh.renderOrder = 2;
  head.add(bladeMesh);
  const diamond = new THREE.Shape();
  diamond.moveTo(0, 0.06);
  diamond.lineTo(0.026, 0.13);
  diamond.lineTo(0, 0.2);
  diamond.lineTo(-0.026, 0.13);
  diamond.lineTo(0, 0.06);
  const coreGeo = new THREE.ExtrudeGeometry(diamond, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.004, bevelSegments: 2 }).translate(0, 0, -0.006);
  geos.push(coreGeo);
  head.add(new THREE.Mesh(coreGeo, core));

  // a soft glow round the core (it materialises with the rest, so it is clipped too), and its cyan light
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const g = canvas.getContext('2d')!;
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.3, 'rgba(255,255,255,0.4)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  const glowTex = new THREE.CanvasTexture(canvas);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  texs.push(glowTex);
  const glowMat = mat(new THREE.SpriteMaterial({ map: glowTex, color: GEM, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0.8 }));
  const glow = new THREE.Sprite(glowMat);
  glow.position.y = 0.13;
  glow.scale.setScalar(0.42);
  head.add(glow);
  const light = new THREE.PointLight(GEM, 0.5, 2.2, 2);
  light.position.y = 0.13;
  head.add(light);

  return {
    group,
    update(t) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.1);
      glow.scale.setScalar(0.38 + pulse * 0.08);
      light.intensity = 0.42 + pulse * 0.2;
    },
    dispose() {
      geos.forEach((x) => x.dispose());
      mats.forEach((x) => x.dispose());
      texs.forEach((x) => x.dispose());
    },
  };
}
