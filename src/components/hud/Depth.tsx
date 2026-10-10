'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { finePointer, gsap, reducedMotion } from '@/lib/gsap';

/**
 * Parallax. The backdrop is built from layers at different "distances": as the pointer moves, near layers
 * shift more than far ones (and far ones the other way), which is what makes a flat page read as depth.
 * One shared pointer listener feeds every layer; GSAP's quickTo eases each layer towards the pointer on
 * its own ticker with a GPU transform only (no layout, no repaint).
 */
interface Layer {
  qx: (v: number) => void;
  qy: (v: number) => void;
  depth: number;
}

const layers = new Set<Layer>();
let bound = false;

function onMove(e: PointerEvent) {
  if (e.pointerType !== 'mouse') return;
  const nx = (e.clientX / window.innerWidth) * 2 - 1;
  const ny = (e.clientY / window.innerHeight) * 2 - 1;
  layers.forEach((l) => {
    l.qx(nx * l.depth);
    l.qy(ny * l.depth * 0.6);
  });
}

/** `depth` is the shift in px at the screen edge: positive moves with the pointer, negative against it. */
export function Depth({ depth, className = '', children }: { depth: number; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !finePointer() || reducedMotion()) return;
    const layer: Layer = {
      qx: gsap.quickTo(el, 'x', { duration: 1.1, ease: 'power3.out' }),
      qy: gsap.quickTo(el, 'y', { duration: 1.1, ease: 'power3.out' }),
      depth,
    };
    layers.add(layer);
    if (!bound) {
      bound = true;
      window.addEventListener('pointermove', onMove, { passive: true });
    }
    return () => {
      layers.delete(layer);
      gsap.killTweensOf(el);
      gsap.set(el, { clearProps: 'transform' });
    };
  }, [depth]);

  return (
    <div ref={ref} className={`will-change-transform ${className}`}>
      {children}
    </div>
  );
}
