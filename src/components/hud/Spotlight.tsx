'use client';

import { useEffect, useRef } from 'react';

/**
 * Soft light that follows the pointer (the "lights that follow your mouse" effect).
 * It moves with a GPU transform on a fixed layer and is updated once per animation frame,
 * so tracking the pointer never triggers layout, a page-wide restyle or a gradient repaint.
 */
export function Spotlight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let frame = 0;
    let x = window.innerWidth * 0.72;
    let y = window.innerHeight * 0.32;

    const paint = () => {
      frame = 0;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!frame) frame = requestAnimationFrame(paint);
    };

    paint();
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="bd-spot absolute left-0 top-0 h-[720px] w-[720px] -ml-[360px] -mt-[360px] will-change-transform"
    />
  );
}
