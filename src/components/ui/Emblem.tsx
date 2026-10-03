'use client';

import { useId } from 'react';

/** Hexagon operator emblem with the initials inside. Outer ring slowly rotates. */
export function Emblem({ initials, className = '' }: { initials: string; className?: string }) {
  const gid = `emb${useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label={`${initials} emblem`} className={className}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffc21f" />
          <stop offset="1" stopColor="#ff6a00" />
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
      <polygon points="60,10 105,35 105,85 60,110 15,85 15,35" fill="rgba(255,180,0,0.08)" stroke={`url(#${gid})`} strokeWidth="2.5" />
      <polygon points="60,20 96,40 96,80 60,100 24,80 24,40" fill={`url(#${gid})`} />
      <polygon points="60,26 91,43 91,77 60,94 29,77 29,43" fill="none" stroke="#0a0b0d" strokeOpacity="0.35" strokeWidth="1.5" />
      <text
        x="60"
        y="71"
        textAnchor="middle"
        className="font-display"
        fontSize="40"
        fontWeight="800"
        fontStyle="italic"
        fill="#0a0b0d"
      >
        {initials}
      </text>
    </svg>
  );
}
