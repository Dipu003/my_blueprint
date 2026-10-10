'use client';

import { useEffect, useRef } from 'react';
import { reducedMotion } from '@/lib/gsap';

/**
 * Gently falling snow (it suits the ice knight and the pine forest of the backdrop). One small canvas, drawn
 * about 30 times a second: a few dozen soft dots drifting down and swaying in a light wind. It sleeps while
 * the browser tab is hidden and is not drawn at all for visitors who ask for less motion. The flakes take the
 * theme's `--land-star` colour (white on the dark page, lilac on the light one).
 */
export function Snow({ className = '', density = 1 }: { className?: string; density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || reducedMotion()) return;
    const g = canvas.getContext('2d');
    if (!g) return;

    let w = 0;
    let h = 0;
    let colour = '255 255 255';
    const readColour = () => {
      colour = getComputedStyle(document.documentElement).getPropertyValue('--land-star').trim() || '255 255 255';
    };
    readColour();
    const mo = new MutationObserver(readColour);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    type Flake = { x: number; y: number; r: number; v: number; p: number; a: number };
    let flakes: Flake[] = [];
    const make = (anywhere: boolean): Flake => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : -6,
      r: 0.6 + Math.random() * 1.7,
      v: 12 + Math.random() * 26,
      p: Math.random() * Math.PI * 2,
      a: 0.35 + Math.random() * 0.55,
    });
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w));
      canvas.height = Math.max(1, Math.round(h));
      // fewer flakes on small screens
      const n = Math.round(Math.min(90, Math.max(28, (w * h) / 18000)) * density);
      flakes = Array.from({ length: n }, () => make(true));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    let last = 0;
    let t = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - last < 32) return; // about 30 fps is plenty for drifting snow
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      t += dt;
      g.clearRect(0, 0, w, h);
      for (const f of flakes) {
        f.y += f.v * dt;
        f.x += Math.sin(t * 0.7 + f.p) * 10 * dt + 4 * dt; // sway, and a little wind
        if (f.y > h + 6) Object.assign(f, make(false));
        if (f.x > w + 6) f.x = -6;
        g.fillStyle = `rgb(${colour} / ${f.a})`;
        g.beginPath();
        g.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        g.fill();
      }
    };
    const sync = () => {
      cancelAnimationFrame(raf);
      last = 0;
      if (!document.hidden) raf = requestAnimationFrame(frame);
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', sync);
      ro.disconnect();
      mo.disconnect();
    };
  }, [density]);

  return <canvas ref={ref} aria-hidden className={`pointer-events-none ${className}`} />;
}
