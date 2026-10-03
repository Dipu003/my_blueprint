'use client';

import { motion } from 'framer-motion';

interface Props {
  label: string;
  /** Longer name for screen readers; defaults to `label`. */
  ariaLabel?: string;
  value: number; // 0-100
  right?: string;
  delay?: number;
}

/** Slanted XP-style bar. The fill is a spring so value changes feel physical. */
export function Meter({ label, ariaLabel, value, right, delay = 0 }: Props) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="meter"
      aria-label={ariaLabel ?? label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
    >
      <div className="mb-1 flex justify-between text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
        <span>{label}</span>
        <span className="text-zinc-200">{right ?? `${v}%`}</span>
      </div>
      <div className="h-1.5 -skew-x-12 overflow-hidden bg-white/10">
        <motion.div
          className="h-full bg-gradient-to-r from-flame-hot to-flame shadow-[0_0_10px_rgb(var(--glow)/0.7)]"
          initial={{ width: 0 }}
          animate={{ width: `${v}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20, delay }}
        />
      </div>
    </div>
  );
}
