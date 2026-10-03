'use client';

import { useId } from 'react';
import { motion, type MotionValue } from 'framer-motion';

interface Props {
  className?: string;
  /** Where the eye looks, in SVG units (about -2..2). Motion values avoid re-renders. */
  eyeX?: MotionValue<number> | number;
  eyeY?: MotionValue<number> | number;
}

// Mascot colours come from the --m-* theme tokens (globals.css).
const c = (token: string) => `rgb(var(--${token}))`;

/**
 * Recon orb: a small glowing sphere with an eye that tracks the pointer, a tilted ring of light
 * flowing around it and a short scan beam to the right. The beam points at whatever the orb is
 * inspecting; flip the wrapper horizontally to aim it left.
 */
export function Orb({ className = '', eyeX = 0, eyeY = 0 }: Props) {
  const id = useId().replace(/:/g, '');

  return (
    <svg viewBox="0 0 64 40" className={className} aria-hidden>
      <defs>
        <radialGradient id={`${id}s`} cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" style={{ stopColor: c('m-metal') }} />
          <stop offset="0.55" style={{ stopColor: c('m-steel-a') }} />
          <stop offset="1" style={{ stopColor: c('m-steel-b') }} />
        </radialGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopOpacity="0.8" style={{ stopColor: c('m-fl-a') }} />
          <stop offset="1" stopOpacity="0" style={{ stopColor: c('m-fl-b') }} />
        </linearGradient>
      </defs>

      {/* scan beam */}
      <polygon className="orb-beam" points="31,20 63,8 63,32" fill={`url(#${id}b)`} />

      {/* ring (behind the body): a tilted circle whose dashes flow around it */}
      <g transform="rotate(-18 20 20) translate(20 20) scale(1 0.34) translate(-20 -20)">
        <circle className="orb-ring" cx="20" cy="20" r="17" fill="none" strokeWidth="2.4" strokeDasharray="7 5" strokeLinecap="round" style={{ stroke: c('m-a') }} />
      </g>

      {/* body */}
      <circle cx="20" cy="20" r="10" fill={`url(#${id}s)`} strokeOpacity="0.8" strokeWidth="1.3" style={{ stroke: c('m-a') }} />

      {/* eye */}
      <circle cx="21.5" cy="20.5" r="5.4" strokeOpacity="0.9" strokeWidth="1" style={{ fill: c('m-visor'), stroke: c('m-a') }} />
      <motion.g style={{ x: eyeX, y: eyeY }}>
        <circle className="robot-eye" cx="21.5" cy="20.5" r="3" style={{ fill: c('m-eye') }} />
        <circle cx="20.6" cy="19.5" r="0.9" fill="#fff" opacity="0.85" />
      </motion.g>

      {/* front half of the ring, passing over the body */}
      <g transform="rotate(-18 20 20) translate(20 20) scale(1 0.34) translate(-20 -20)">
        <path d="M3 20 A17 17 0 0 0 37 20" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeOpacity="0.9" style={{ stroke: c('m-a') }} />
      </g>

      {/* status light */}
      <circle className="orb-led" cx="20" cy="6.5" r="1.8" fill="#ff4a3d" />
    </svg>
  );
}
