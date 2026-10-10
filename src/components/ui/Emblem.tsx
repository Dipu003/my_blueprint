'use client';

import { useEffect, useId, useRef } from 'react';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Hexagon operator emblem with the initials inside. Outer ring slowly rotates, and the whole badge turns
 * in 3D towards the pointer like a medal on a stand (mouse only). The badge is not a hover target, so
 * moving it never changes what is under the pointer.
 */
export function Emblem({ initials, className = '' }: { initials: string; className?: string }) {
  const gid = `emb${useId().replace(/:/g, '')}`;
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    let px = 0;
    let py = 0;
    let rect: DOMRect | null = null;
    const paint = () => {
      frame = 0;
      rect ??= el.getBoundingClientRect();
      const dx = clamp((px - (rect.left + rect.width / 2)) / 480, -1, 1);
      const dy = clamp((py - (rect.top + rect.height / 2)) / 480, -1, 1);
      el.style.transform = `perspective(460px) rotateX(${(-dy * 24).toFixed(1)}deg) rotateY(${(dx * 24).toFixed(1)}deg)`;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      px = e.clientX;
      py = e.clientY;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const dirty = () => {
      rect = null;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', dirty, { passive: true, capture: true });
    window.addEventListener('resize', dirty, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', dirty, { capture: true });
      window.removeEventListener('resize', dirty);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <svg ref={ref} viewBox="0 0 120 120" role="img" aria-label={`${initials} emblem`} className={className} style={{ willChange: 'transform' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          {/* the theme's emblem gradient (--emb-a to --emb-b): orchid to violet */}
          <stop offset="0" style={{ stopColor: 'rgb(var(--emb-a))' }} />
          <stop offset="1" style={{ stopColor: 'rgb(var(--emb-b))' }} />
        </linearGradient>
      </defs>
      <polygon
        points="60,2 113,31 113,89 60,118 7,89 7,31"
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth="1.5"
        strokeDasharray="6 8"
        className="animate-[spin_40s_linear_infinite] motion-reduce:animate-none"
        style={{ transformOrigin: '60px 60px' }}
      />
      <polygon
        points="60,10 105,35 105,85 60,110 15,85 15,35"
        style={{ fill: 'rgb(var(--gold) / 0.08)' }}
        stroke={`url(#${gid})`}
        strokeWidth="2.5"
      />
      <polygon points="60,20 96,40 96,80 60,100 24,80 24,40" fill={`url(#${gid})`} />
      <polygon points="60,26 91,43 91,77 60,94 29,77 29,43" fill="none" stroke="#060810" strokeOpacity="0.35" strokeWidth="1.5" />
      <text
        x="60"
        y="71"
        textAnchor="middle"
        className="font-display"
        fontSize="44"
        style={{ fill: 'rgb(var(--emb-text))' }}
      >
        {initials}
      </text>
    </svg>
  );
}
