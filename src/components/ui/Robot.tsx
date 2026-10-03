'use client';

import { useId } from 'react';
import { motion, type MotionValue } from 'framer-motion';

export type RobotMood = 'idle' | 'happy';

interface Props {
  className?: string;
  mood?: RobotMood;
  /** Where the eyes look, in SVG units (about -3..3). Motion values avoid re-renders. */
  eyeX?: MotionValue<number> | number;
  eyeY?: MotionValue<number> | number;
  flame?: boolean;
}

// Mascot colours come from the --m-* theme tokens (globals.css): amber on steel in the dark theme,
// sky-blue on slate in the light theme.
const c = (token: string) => `rgb(var(--${token}))`;

/**
 * Little jetpack robot mascot. Idle: glowing visor eyes that track `eyeX/eyeY`.
 * Happy: eyes turn into smiling arcs and the arm waves.
 */
export function Robot({ className = '', mood = 'idle', eyeX = 0, eyeY = 0, flame = true }: Props) {
  const id = useId().replace(/:/g, '');
  const happy = mood === 'happy';

  return (
    <svg viewBox="0 0 64 78" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: c('m-steel-a') }} />
          <stop offset="1" style={{ stopColor: c('m-steel-b') }} />
        </linearGradient>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: c('m-fl-a') }} />
          <stop offset="0.5" style={{ stopColor: c('m-fl-b') }} />
          <stop offset="1" stopOpacity="0" style={{ stopColor: c('m-fl-b') }} />
        </linearGradient>
      </defs>

      {/* jet flame */}
      {flame && <path className="robot-flame" d="M26.5 65 Q32 80 37.5 65 Z" fill={`url(#${id}f)`} />}

      {/* arms */}
      <rect x="11" y="51" width="6" height="12" rx="3" strokeOpacity="0.5" strokeWidth="1" style={{ fill: c('m-limb'), stroke: c('m-a') }} />
      <g className={happy ? 'robot-wave' : ''}>
        <rect x="47" y="51" width="6" height="12" rx="3" strokeOpacity="0.5" strokeWidth="1" style={{ fill: c('m-limb'), stroke: c('m-a') }} />
        <circle cx="50" cy="63.5" r="2.2" style={{ fill: c('m-a') }} />
      </g>
      <circle cx="14" cy="63.5" r="2.2" style={{ fill: c('m-a') }} />

      {/* body */}
      <rect x="19" y="49" width="26" height="17" rx="6" fill={`url(#${id}s)`} strokeOpacity="0.45" strokeWidth="1.2" style={{ stroke: c('m-a') }} />
      <circle className="robot-pulse" cx="32" cy="57.5" r="3.2" style={{ fill: c('m-eye') }} />
      <circle cx="32" cy="57.5" r="5.5" fill="none" strokeOpacity="0.35" strokeWidth="1" style={{ stroke: c('m-eye') }} />

      {/* antenna */}
      <line x1="32" y1="12" x2="32" y2="18" strokeWidth="2" strokeLinecap="round" style={{ stroke: c('m-metal') }} />
      <circle cx="32" cy="9" r="6" opacity="0.22" style={{ fill: c('m-eye') }} />
      <circle className="robot-tip" cx="32" cy="9" r="3.4" style={{ fill: c('m-eye') }} />

      {/* head */}
      <rect x="4" y="27" width="5" height="12" rx="2" style={{ fill: c('m-a') }} />
      <rect x="55" y="27" width="5" height="12" rx="2" style={{ fill: c('m-a') }} />
      <rect x="9" y="17" width="46" height="31" rx="10" fill={`url(#${id}s)`} strokeOpacity="0.75" strokeWidth="1.6" style={{ stroke: c('m-a') }} />
      <rect x="14" y="23" width="36" height="19" rx="7" style={{ fill: c('m-visor') }} />

      {/* eyes */}
      <motion.g style={{ x: eyeX, y: eyeY }}>
        {happy ? (
          <g className="robot-eye" fill="none" strokeWidth="3" strokeLinecap="round" style={{ stroke: c('m-eye') }}>
            <path d="M21 36 q3.5 -9 7 0" />
            <path d="M36 36 q3.5 -9 7 0" />
          </g>
        ) : (
          <g className="robot-blink robot-eye" style={{ fill: c('m-eye') }}>
            <rect x="21" y="27.5" width="7" height="10" rx="3" />
            <rect x="36" y="27.5" width="7" height="10" rx="3" />
          </g>
        )}
      </motion.g>
    </svg>
  );
}
