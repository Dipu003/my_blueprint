// Geometry helpers for the character: everything is smooth (high segment counts, averaged normals), so
// the figure reads as one clean sculpted object rather than a pile of primitives.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const TAU = Math.PI * 2;

export const sphere = (r: number, ws = 40, hs = 28) => new THREE.SphereGeometry(r, ws, hs);

/** Indexed (so parts can be merged) rounded box; more segments for bigger radii. */
export const rbox = (w: number, h: number, d: number, r: number, seg = r > 0.03 ? 4 : 3) =>
  mergeVertices(new RoundedBoxGeometry(w, h, d, seg, r), 1e-5);

/** Squashes a geometry non-uniformly into its vertices (normals follow). */
export function bake(g: THREE.BufferGeometry, sx: number, sy: number, sz: number) {
  g.scale(sx, sy, sz);
  return g;
}

/** Bends a flat shape so it hugs a sphere of radius `r`, instead of floating at its edges. */
export function bendOnto(g: THREE.BufferGeometry, r: number) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    p.setZ(i, p.getZ(i) - (x * x + y * y) / (2 * r));
  }
  p.needsUpdate = true;
  return g;
}

/** A lathe from a handful of (radius, y) points, bottom to top, smoothed with a spline. */
export function smoothLathe(profile: [number, number][], segments = 44, samples = 40) {
  const curve = new THREE.SplineCurve(profile.map(([x, y]) => new THREE.Vector2(x, y)));
  const pts = curve.getPoints(samples).map((p) => new THREE.Vector2(Math.max(0, p.x), p.y));
  return new THREE.LatheGeometry(pts, segments);
}

/**
 * A tapered limb: the hull of two spheres, radius `r1` at the top joint (y = 0) and `r2` at the bottom
 * joint (y = -len). The joints are the sphere centres, so rotating a joint never opens a gap.
 */
export function taper(r1: number, r2: number, len: number, segments = 32) {
  const pts: THREE.Vector2[] = [];
  const cap = 9;
  for (let i = 0; i <= cap; i++) {
    const a = (i / cap) * (Math.PI / 2); // pole -> equator
    pts.push(new THREE.Vector2(Math.max(1e-4, r2 * Math.sin(a)), -len - r2 * Math.cos(a)));
  }
  for (let i = 1; i <= cap; i++) {
    const a = Math.PI / 2 - (i / cap) * (Math.PI / 2); // equator -> pole
    pts.push(new THREE.Vector2(Math.max(1e-4, r1 * Math.sin(a)), r1 * Math.cos(a)));
  }
  return new THREE.LatheGeometry(pts, segments);
}

/** Writes per-vertex colours from a function of the vertex position. */
export function paint(g: THREE.BufferGeometry, fn: (x: number, y: number, z: number, out: THREE.Color) => void) {
  const p = g.attributes.position;
  const c = new Float32Array(p.count * 3);
  const col = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    fn(p.getX(i), p.getY(i), p.getZ(i), col);
    c[i * 3] = col.r;
    c[i * 3 + 1] = col.g;
    c[i * 3 + 2] = col.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}

export interface LoftOptions {
  /** Rings along the path. */
  segments?: number;
  /** Points around each ring. */
  radial?: number;
  /** The direction the cross-section is widest in (it is flattened against the path). */
  width?: THREE.Vector3;
  /** Per-vertex colour along the length (0..1). */
  color?: (t: number) => THREE.Color;
}

/**
 * A smooth tube with an elliptical cross-section that changes along a path: the shape of a lock of hair,
 * an eyebrow, a strap. `size(t)` gives the half-width and half-thickness at t = 0..1; make it shrink to
 * nothing at the end for a pointed tip.
 */
export function loft(points: THREE.Vector3[], size: (t: number) => [number, number], o: LoftOptions = {}) {
  const segs = o.segments ?? 18;
  const rad = o.radial ?? 10;
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const pos: number[] = [];
  const uv: number[] = [];
  const col: number[] = [];
  const hint = o.width?.clone().normalize();
  let prev: THREE.Vector3 | null = null;

  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const P = curve.getPointAt(t);
    const T = curve.getTangentAt(t).normalize();
    let W: THREE.Vector3;
    if (hint) {
      W = hint.clone().addScaledVector(T, -hint.dot(T));
    } else {
      W = new THREE.Vector3(0, 1, 0).cross(T);
    }
    if (W.lengthSq() < 1e-6) W = prev ? prev.clone() : new THREE.Vector3(1, 0, 0);
    W.normalize();
    prev = W;
    const H = new THREE.Vector3().crossVectors(T, W).normalize();
    const [w, h] = size(t);
    const c = o.color?.(t);
    for (let j = 0; j <= rad; j++) {
      const a = (j / rad) * TAU;
      const cx = Math.cos(a) * w;
      const cy = Math.sin(a) * h;
      pos.push(P.x + W.x * cx + H.x * cy, P.y + W.y * cx + H.y * cy, P.z + W.z * cx + H.z * cy);
      uv.push(j / rad, t);
      if (c) col.push(c.r, c.g, c.b);
    }
  }
  const ring = rad + 1;
  const index: number[] = [];
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < rad; j++) {
      const a = i * ring + j;
      const b = a + ring;
      index.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (col.length) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(index);
  g.computeVertexNormals();

  // Make sure the faces point outwards whichever way the path runs.
  const n = g.attributes.normal;
  const p = g.attributes.position;
  let facing = 0;
  for (let i = 0; i <= segs; i += Math.max(1, Math.floor(segs / 4))) {
    const P = curve.getPointAt(i / segs);
    for (let j = 0; j < rad; j++) {
      const k = i * ring + j;
      facing += n.getX(k) * (p.getX(k) - P.x) + n.getY(k) * (p.getY(k) - P.y) + n.getZ(k) * (p.getZ(k) - P.z);
    }
  }
  if (facing < 0) {
    for (let i = 0; i < index.length; i += 3) {
      const t = index[i + 1];
      index[i + 1] = index[i + 2];
      index[i + 2] = t;
    }
    g.setIndex(index);
    g.computeVertexNormals();
  }
  return g;
}

/**
 * The head: a young hero's face (after his reference picture), not a plain ball. A big round skull; full,
 * round cheeks; a soft jaw that is only a little narrower than the skull; a small rounded chin; a gentle brow
 * ridge; a slightly flatter face plane. UVs are kept (the face texture is painted on them) and the seam gets
 * one shared normal, so there is no visible line.
 */
export function makeHead(R: number) {
  const W = 80;
  const H = 60;
  const g = new THREE.SphereGeometry(R, W, H);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  const sm = THREE.MathUtils.smoothstep;
  // [direction, height (x R), spread]: soft bumps that give the face its shape
  const bumps: [THREE.Vector3, number, number][] = [
    [new THREE.Vector3(0.56, -0.34, 0.76).normalize(), 0.075, 0.3], // full, round cheeks
    [new THREE.Vector3(-0.56, -0.34, 0.76).normalize(), 0.075, 0.3],
    [new THREE.Vector3(0, -0.8, 0.6).normalize(), 0.032, 0.2], // a small rounded chin
    [new THREE.Vector3(0, 0.2, 0.98).normalize(), 0.02, 0.42], // brow ridge (mostly under the fringe)
  ];
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const d = v.clone().normalize();
    const down = sm(-d.y, 0, 1); // 0 at eye height and above, 1 at the bottom
    const front = sm(d.z, -0.3, 0.85); // 0 at the back of the head, 1 on the face
    // a soft, rounded jaw: only a little narrower than the skull, like a young boy's
    const jaw = 1.04 - (0.13 + 0.06 * front) * Math.pow(down, 1.8);
    let x = v.x * (d.y > 0 ? 1.04 : jaw);
    let y = v.y * (d.y > 0 ? 0.98 : 1.02);
    let z = v.z * (0.97 - 0.04 * down);
    // a slightly flatter face plane
    if (d.z > 0.55) z -= R * 0.03 * sm(d.z, 0.55, 1) * (1 - down * 0.6);
    for (const [c, h, s] of bumps) {
      const dist = d.distanceTo(c);
      const bump = R * h * Math.exp(-(dist * dist) / (2 * s * s));
      x += d.x * bump;
      y += d.y * bump;
      z += d.z * bump;
    }
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  // the first and last vertex of every ring are the same point: give them one normal
  const n = g.attributes.normal;
  for (let iy = 0; iy <= H; iy++) {
    const a = iy * (W + 1);
    const b = a + W;
    const nx = n.getX(a) + n.getX(b);
    const ny = n.getY(a) + n.getY(b);
    const nz = n.getZ(a) + n.getZ(b);
    const l = Math.hypot(nx, ny, nz) || 1;
    n.setXYZ(a, nx / l, ny / l, nz / l);
    n.setXYZ(b, nx / l, ny / l, nz / l);
  }
  return g;
}

/** Equirectangular texture coordinates of a direction from the head's centre (matches SphereGeometry). */
export function uvOfDirection(d: THREE.Vector3): [number, number] {
  const n = d.clone().normalize();
  const theta = Math.acos(THREE.MathUtils.clamp(n.y, -1, 1));
  let phi = Math.atan2(n.z, -n.x);
  if (phi < 0) phi += TAU;
  return [phi / TAU, theta / Math.PI]; // u, and v measured from the top (canvas y)
}
