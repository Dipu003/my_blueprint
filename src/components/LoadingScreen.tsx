'use client';

import { useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue } from 'framer-motion';
import { PLAYER } from '@/data/portfolio';
import { play } from '@/lib/sound';
import { Robot } from '@/components/ui/Robot';

const TIPS = [
  'Press 1–5 to jump between tabs.',
  'Open every tab to complete your recon.',
  'Missions shows the featured project, objective by objective.',
];

/** CoD-style loading screen: emblem, tip and a progress bar. Skippable with any key or click. */
export function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const ready = progress >= 100;

  // The loading robot glances around while it waits.
  const eyeX = useMotionValue(0);
  const eyeY = useMotionValue(0);
  useEffect(() => {
    const a = animate(eyeX, [0, -3, 3, 0, 2.5, -2, 0], { duration: 4.5, repeat: Infinity, ease: 'easeInOut' });
    const b = animate(eyeY, [0, 0, 0.5, -1.5, 0, 1, 0], { duration: 4.5, repeat: Infinity, ease: 'easeInOut' });
    return () => {
      a.stop();
      b.stop();
    };
  }, [eyeX, eyeY]);

  // React's dev mode runs effects twice; only play the stinger once.
  const bootPlayed = useRef(false);
  useEffect(() => {
    if (!bootPlayed.current) {
      bootPlayed.current = true;
      play('boot');
    }
    const t = setInterval(() => setProgress((p) => Math.min(100, p + (p < 70 ? 4 : 2))), 55);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(onDone, 500);
    return () => clearTimeout(t);
  }, [ready, onDone]);

  useEffect(() => {
    window.addEventListener('keydown', onDone);
    return () => window.removeEventListener('keydown', onDone);
  }, [onDone]);

  const tip = TIPS[Math.floor(progress / 34) % TIPS.length];

  return (
    <motion.div
      role="status"
      aria-label="Loading"
      onClick={onDone}
      className="fixed inset-0 z-50 flex flex-col justify-between overflow-hidden bg-ink px-6 py-8 sm:px-12"
      exit={{ opacity: 0, scale: 1.03 }}
      transition={{ duration: 0.3 }}
    >
      <div aria-hidden className="load-glow absolute inset-0" />
      <div aria-hidden className="stripes absolute inset-0" />
      <div aria-hidden className="absolute -right-[8%] top-0 h-full w-[30%] -skew-x-[18deg] bg-gradient-to-l from-flame/[0.10] to-transparent" />

      <div className="relative flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-400">
        <span>Portfolio · Lobby</span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 animate-dot rounded-full bg-flame" /> Loading
        </span>
      </div>

      <div className="relative flex flex-col items-center text-center">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
          <div className="robot-bob">
            <Robot
              mood={progress >= 100 ? 'happy' : 'idle'}
              eyeX={eyeX}
              eyeY={eyeY}
              className="h-36 w-36 drop-shadow-[0_0_30px_rgb(var(--glow-e)/0.5)] sm:h-48 sm:w-48"
            />
          </div>
        </motion.div>
        <h1 className="mt-5 font-display text-5xl font-extrabold italic uppercase leading-none tracking-wide text-white sm:text-7xl">
          {PLAYER.firstName} <span className="text-gold">{PLAYER.lastName}</span>
        </h1>
        <p className="mt-2 text-sm font-semibold uppercase tracking-[0.35em] text-zinc-400">{PLAYER.title}</p>
      </div>

      <div className="relative mx-auto w-full max-w-3xl">
        <p className="mb-3 text-center text-sm text-zinc-300">
          <span className="mr-2 font-display text-base font-bold italic uppercase tracking-wider text-gold">Tip</span>
          {tip}
        </p>
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 -skew-x-12 bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-flame-hot to-flame shadow-[0_0_12px_rgb(var(--glow)/0.8)] transition-[width] duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="w-12 text-right font-display text-xl font-bold italic tabular-nums text-white">{progress}%</span>
        </div>
        <p className="mt-4 text-center text-[10px] font-semibold uppercase tracking-[0.35em] text-zinc-500">
          Tap anywhere or press any key to skip
        </p>
      </div>
    </motion.div>
  );
}
