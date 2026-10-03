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

/**
 * Little jetpack robot mascot. Idle: glowing visor eyes that track `eyeX/eyeY`.
 * Happy: eyes turn into smiling arcs and the arm waves. All colors are inline so it
 * renders the same wherever it is placed.
 */
export function Robot({ className = '', mood = 'idle', eyeX = 0, eyeY = 0, flame = true }: Props) {
  const id = useId().replace(/:/g, '');
  const happy = mood === 'happy';

  return (
    <svg viewBox="0 0 64 78" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b3d47" />
          <stop offset="1" stopColor="#1a1b20" />
        </linearGradient>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd36b" />
          <stop offset="0.5" stopColor="#ff7a00" />
          <stop offset="1" stopColor="#ff7a00" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* jet flame */}
      {flame && <path className="robot-flame" d="M26.5 65 Q32 80 37.5 65 Z" fill={`url(#${id}f)`} />}

      {/* arms */}
      <rect x="11" y="51" width="6" height="12" rx="3" fill="#2c2e36" stroke="#ffb400" strokeOpacity="0.5" strokeWidth="1" />
      <g className={happy ? 'robot-wave' : ''}>
        <rect x="47" y="51" width="6" height="12" rx="3" fill="#2c2e36" stroke="#ffb400" strokeOpacity="0.5" strokeWidth="1" />
        <circle cx="50" cy="63.5" r="2.2" fill="#ffb400" />
      </g>
      <circle cx="14" cy="63.5" r="2.2" fill="#ffb400" />

      {/* body */}
      <rect x="19" y="49" width="26" height="17" rx="6" fill={`url(#${id}s)`} stroke="#ffb400" strokeOpacity="0.45" strokeWidth="1.2" />
      <circle className="robot-pulse" cx="32" cy="57.5" r="3.2" fill="#ffb400" />
      <circle cx="32" cy="57.5" r="5.5" fill="none" stroke="#ffb400" strokeOpacity="0.35" strokeWidth="1" />

      {/* antenna */}
      <line x1="32" y1="12" x2="32" y2="18" stroke="#8a8d99" strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="9" r="6" fill="#ffb400" opacity="0.22" />
      <circle className="robot-tip" cx="32" cy="9" r="3.4" fill="#ffb400" />

      {/* head */}
      <rect x="4" y="27" width="5" height="12" rx="2" fill="#ffb400" />
      <rect x="55" y="27" width="5" height="12" rx="2" fill="#ffb400" />
      <rect x="9" y="17" width="46" height="31" rx="10" fill={`url(#${id}s)`} stroke="#ffb400" strokeOpacity="0.75" strokeWidth="1.6" />
      <rect x="14" y="23" width="36" height="19" rx="7" fill="#0a0b0d" />

      {/* eyes */}
      <motion.g style={{ x: eyeX, y: eyeY }}>
        {happy ? (
          <g className="robot-eye" fill="none" stroke="#ffb400" strokeWidth="3" strokeLinecap="round">
            <path d="M21 36 q3.5 -9 7 0" />
            <path d="M36 36 q3.5 -9 7 0" />
          </g>
        ) : (
          <g className="robot-blink robot-eye" fill="#ffb400">
            <rect x="21" y="27.5" width="7" height="10" rx="3" />
            <rect x="36" y="27.5" width="7" height="10" rx="3" />
          </g>
        )}
      </motion.g>
    </svg>
  );
}
