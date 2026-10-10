'use client';

import { useId } from 'react';
import { motion, useMotionValue, useTransform, type MotionValue } from 'framer-motion';

export type RobotMood = 'idle' | 'happy';

interface Props {
  className?: string;
  mood?: RobotMood;
  /** Where the eyes look, in SVG units (about -3..3). Motion values avoid re-renders. */
  eyeX?: MotionValue<number> | number;
  eyeY?: MotionValue<number> | number;
  /** The glowing rune disc he hovers over. */
  flame?: boolean;
}

// The hero's own colours are fixed (he looks the same on both pages); only the glow, the outline and his
// floating crystal come from the --m-* theme tokens (globals.css).
const c = (token: string) => `rgb(var(--${token}))`;
const SKIN = '#f9dccb';
const ENAMEL = '#4693e0'; // blue enamel (chest chevron, armour rims)
const LEATHER = '#7a4a2a';
const BRONZE = '#c38b4c';
const GEM = '#5ee3ff';
const SILVER = '#dfe9f6';
const SLEEVE = '#2f88bb';
const SCARF = '#3b8ce4';
const CLOTH = '#a87c55';

/**
 * The little hero: the same white-haired ice knight as the 3D one, in a chibi mascot version (silver armour with a
 * blue chevron, blue scarf, teal sleeves, brown leather, plate skirt). He hovers over a glowing rune disc with a
 * crystal floating beside him. Idle: his big, determined eyes track `eyeX/eyeY`. Happy: the eyes turn into smiling
 * arcs, his mouth opens in a grin and the arm waves.
 * (The component keeps its old name: the cursor companion and the loading screen import it.)
 */
export function Robot({ className = '', mood = 'idle', eyeX = 0, eyeY = 0, flame = true }: Props) {
  const id = useId().replace(/:/g, '');
  const happy = mood === 'happy';

  // his irises move a little less than the raw "looking" values (they have to stay inside the eyes)
  const fixedX = useMotionValue(typeof eyeX === 'number' ? eyeX : 0);
  const fixedY = useMotionValue(typeof eyeY === 'number' ? eyeY : 0);
  const lookX = useTransform(typeof eyeX === 'number' ? fixedX : eyeX, (v) => v * 0.42);
  const lookY = useTransform(typeof eyeY === 'number' ? fixedY : eyeY, (v) => v * 0.42);

  return (
    <svg viewBox="0 0 64 78" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}h`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#dbe8ff" />
          <stop offset="1" stopColor="#86a9e6" />
        </linearGradient>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4f8ff" />
          <stop offset="1" stopColor="#a6b9d8" />
        </linearGradient>
        <radialGradient id={`${id}d`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={{ stopColor: c('m-fl-a') }} />
          <stop offset="0.55" style={{ stopColor: c('m-fl-b') }} stopOpacity="0.7" />
          <stop offset="1" style={{ stopColor: c('m-fl-b') }} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* the glowing rune disc under his boots */}
      {flame && <ellipse className="robot-flame" cx="32" cy="75.4" rx="16" ry="2.8" fill={`url(#${id}d)`} />}

      <g transform="translate(1.6 4.2) scale(0.95)">
        {/* a crystal floating beside him */}
        <g className="robot-tip">
          <circle cx="56" cy="14" r="6.5" opacity="0.22" style={{ fill: c('m-eye') }} />
          <path d="M56 6.5 L60 14 L56 21.5 L52 14 Z" style={{ fill: c('m-eye') }} />
          <path d="M56 6.5 L60 14 L56 14 Z" fill="#fff" opacity="0.55" />
        </g>

        {/* boots */}
        {[21, 33].map((x) => (
          <g key={x}>
            <rect x={x} y="66" width="10" height="8" rx="3" fill={LEATHER} />
            <rect x={x - 0.4} y="66" width="10.8" height="2" rx="1" fill="#58331b" />
            <rect x={x - 0.6} y="72.6" width="11.2" height="2.2" rx="1.1" fill="#4a2e1c" />
          </g>
        ))}

        {/* plate skirt over tan cloth, with a blue front flap */}
        <path d="M20.5 62 L43.5 62 L46 69 L18 69 Z" fill={CLOTH} />
        {[20.4, 25.2, 37.6, 42.4].map((x) => (
          <path key={x} d={`M${x - 2.2} 62 h4.4 v5.4 l-2.2 2 l-2.2 -2 Z`} fill={SILVER} stroke={ENAMEL} strokeWidth="0.5" />
        ))}
        <path d="M28.6 62 h6.8 v6.6 l-3.4 2.6 l-3.4 -2.6 Z" fill={ENAMEL} />
        <path d="M32 63.6 l1.4 2 l-1.4 2 l-1.4 -2 Z" fill="#cfe6ff" />
        {/* body: silver cuirass with a blue chevron, brown belt, round bronze buckle with a cyan gem */}
        <rect x="20" y="47.5" width="24" height="15.5" rx="6" fill={`url(#${id}a)`} strokeOpacity="0.5" strokeWidth="1" style={{ stroke: c('m-a') }} />
        <path d="M23.4 49.6 L26.8 49.6 L32 55.4 L37.2 49.6 L40.6 49.6 L32 59.2 Z" fill={ENAMEL} stroke="#f7fbff" strokeWidth="0.6" strokeLinejoin="round" />
        <rect x="20" y="59.6" width="24" height="3.4" fill={LEATHER} />
        <circle cx="32" cy="61.3" r="2.5" fill={BRONZE} />
        <circle cx="32" cy="61.3" r="1.3" fill={GEM} />

        {/* arms: teal sleeves, brown leather bracers, small hands (the right one waves when he is happy) */}
        <g>
          <rect x="11" y="50" width="7.4" height="13.5" rx="3.7" fill={SLEEVE} />
          <rect x="10.6" y="56.6" width="8.2" height="6.6" rx="3.2" fill={LEATHER} />
          <circle cx="14.7" cy="65.4" r="3" fill={SKIN} />
        </g>
        <g className={happy ? 'robot-wave' : ''}>
          <rect x="45.6" y="50" width="7.4" height="13.5" rx="3.7" fill={SLEEVE} />
          <rect x="45.2" y="56.6" width="8.2" height="6.6" rx="3.2" fill={LEATHER} />
          <circle cx="49.3" cy="65.4" r="3" fill={SKIN} />
        </g>
        {/* layered silver pauldrons with blue rims and a cyan gem, and the blue scarf with its tail */}
        {[18.2, 45.8].map((x) => (
          <g key={x}>
            <ellipse cx={x + (x < 32 ? -0.8 : 0.8)} cy="52.6" rx="5.4" ry="2.8" fill={SILVER} stroke={ENAMEL} strokeWidth="0.8" />
            <ellipse cx={x} cy="50.6" rx="5.9" ry="3.8" fill={SILVER} stroke={ENAMEL} strokeWidth="0.9" />
            <circle cx={x} cy="49.6" r="1.1" fill={GEM} />
          </g>
        ))}
        <path d="M24.6 49.4 Q22.4 55 23.8 61 L27.2 60.4 Q26 55 27.8 50.2 Z" fill={SCARF} />
        <ellipse cx="32" cy="48.6" rx="11.8" ry="3.7" fill={SCARF} />

        {/* head */}
        <circle cx="15.8" cy="33.6" r="3" fill={SKIN} />
        <circle cx="48.2" cy="33.6" r="3" fill={SKIN} />
        <ellipse cx="32" cy="31.6" rx="16.4" ry="15.4" fill={SKIN} />

        {/* cheeks */}
        <ellipse cx="21.4" cy="38.6" rx="3.2" ry="2" fill="#ff5c4d" opacity="0.32" />
        <ellipse cx="42.6" cy="38.6" rx="3.2" ry="2" fill="#ff5c4d" opacity="0.32" />

        {/* eyes */}
        {happy ? (
          <g fill="none" stroke="#1a1030" strokeWidth="2.1" strokeLinecap="round">
            <path d="M20.6 35.4 q4.4 -7 8.8 0" />
            <path d="M34.6 35.4 q4.4 -7 8.8 0" />
          </g>
        ) : (
          <g className="robot-blink">
            {[25, 39].map((x) => (
              <g key={x}>
                <ellipse cx={x} cy="33.6" rx="4.5" ry="4.9" fill="#eef3ff" />
                <motion.g style={{ x: lookX, y: lookY }}>
                  <circle cx={x} cy="33.8" r="3.5" fill="#2fb0e6" />
                  <circle cx={x} cy="33.8" r="1.9" fill="#050a24" />
                  <circle cx={x + 1.2} cy="32.3" r="1.05" fill="#fff" />
                </motion.g>
              </g>
            ))}
            <path d="M20 28.2 H30.2 V32.2 Q25 30.2 20 31.2 Z" fill={SKIN} />
            <path d="M33.8 28.2 H44 V31.2 Q39 30.2 33.8 32.2 Z" fill={SKIN} />
            <g fill="none" stroke="#1a1030" strokeWidth="1.5" strokeLinecap="round">
              <path d="M20.2 31.2 Q25 30.2 30 32.1" />
              <path d="M34 32.1 Q39 30.2 43.8 31.2" />
            </g>
          </g>
        )}
        {/* brows and mouth */}
        <g fill="none" stroke="#4a90d8" strokeWidth="2.2" strokeLinecap="round">
          <path d={happy ? 'M20.6 27 q4.6 -3 8.6 -0.6' : 'M20.6 26.6 Q25 26.4 29.6 28.8'} />
          <path d={happy ? 'M34.8 26.4 q4 -2.4 8.6 0.6' : 'M34.4 28.8 Q39 26.4 43.4 26.6'} />
        </g>
        {happy ? (
          <>
            <path d="M27.2 40 q4.8 7 9.6 0 z" fill="#3a0d18" />
            <path d="M29.6 43.4 q2.4 -1.6 4.8 0 q-2.4 1.6 -4.8 0 z" fill="#e0707e" />
          </>
        ) : (
          <path d="M28.4 41 q3.6 2.8 7.2 0" fill="none" stroke="#9a3a3a" strokeWidth="1.4" strokeLinecap="round" />
        )}

        {/* ice-blue spiky hair */}
        <path
          d="M15.2 31 C12.6 21.6 17.4 14.4 24 12.4 L21.4 4.2 L28.6 10.4 L28.4 1 L33.6 9.4 L37.8 0.4 L39.4 9.6 L45.4 3.4 L44 12 C49.8 14.4 51.6 22.4 48.8 31 C47.4 26.2 44.6 23.4 41.2 22.6 L37.6 27.6 L34.6 21.6 L30.8 28 L27.6 21.8 L23.2 26.4 L20.8 23 C17.8 24.4 16.4 27.2 15.2 31 Z"
          fill={`url(#${id}h)`}
          stroke="#5d7fc4"
          strokeWidth="0.6"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
