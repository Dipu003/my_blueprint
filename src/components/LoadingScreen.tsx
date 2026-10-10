'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue } from 'framer-motion';
import { PLAYER } from '@/data/portfolio';
import { gsap, reducedMotion, SplitText } from '@/lib/gsap';
import { play, unlockAudio } from '@/lib/sound';
import { preloadIntro } from '@/lib/voice';
import { loadStage } from '@/components/character/load';
import { Robot } from '@/components/ui/Robot';
import { GameButton } from '@/components/ui/GameButton';

const TIPS = [
  'Press 1–5 to jump between tabs.',
  'Open every tab to complete your recon.',
  'Missions shows the featured project, objective by objective.',
];

// Keys that never count as "start" (they are not a real key press, or the browser keeps them).
const IGNORED_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'Escape', 'Tab', 'CapsLock', 'ContextMenu']);

/**
 * CoD-style loading screen and the "Press start" gate. While the bar fills, the 3D character and the
 * voice are fetched. Then it waits for a click, tap or key press: browsers only allow sound after one,
 * so that press is what unlocks audio and plays the first-start sound, and it begins the intro.
 */
export function LoadingScreen({ onStart }: { onStart: () => void }) {
  const [progress, setProgress] = useState(0);
  const [assets, setAssets] = useState(false);
  const started = useRef(false);
  const ready = progress >= 100;

  // The opening shot (GSAP): the rings spin up, the hero pops in, the name rises letter by letter.
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (reducedMotion()) return;
    const ctx = gsap.context(() => {
      const split = SplitText.create('.ld-name', { type: 'chars', mask: 'chars' });
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl.from('.ld-ring-a, .ld-ring-b', { scale: 0.4, opacity: 0, svgOrigin: '120 120', duration: 1.3, stagger: 0.12 }, 0)
        .from('.ld-hero > div', { y: 40, scale: 0.6, opacity: 0, duration: 1, ease: 'back.out(1.8)' }, 0.15)
        .from(split.chars, { yPercent: 110, duration: 0.75, stagger: 0.04 }, 0.5)
        .from('.ld-sub', { opacity: 0, y: 12, duration: 0.7 }, 1.1);
      gsap.to('.ld-ring-a', { rotation: 360, svgOrigin: '120 120', duration: 28, ease: 'none', repeat: -1 });
      gsap.to('.ld-ring-b', { rotation: -360, svgOrigin: '120 120', duration: 19, ease: 'none', repeat: -1 });
    }, root);
    return () => ctx.revert();
  }, []);

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

  // Fetch the 3D library, build the character and decode the voice while the bar fills. Never wait
  // longer than a few seconds for them: the intro copes with a late start, or goes on without him.
  useEffect(() => {
    let alive = true;
    const give = setTimeout(() => alive && setAssets(true), 7000);
    void Promise.all([loadStage(), preloadIntro()]).then(() => alive && setAssets(true));
    return () => {
      alive = false;
      clearTimeout(give);
    };
  }, []);

  // The bar climbs by itself but waits at 92% until those are in.
  useEffect(() => {
    const t = setInterval(() => setProgress((p) => Math.min(assets ? 100 : 92, p + (p < 70 ? 4 : 2))), 55);
    return () => clearInterval(t);
  }, [assets]);

  const start = useCallback(() => {
    if (started.current) return;
    started.current = true;
    // This runs inside the click or key press, which is the one moment the browser lets audio start.
    void unlockAudio().then(() => play('intro'));
    onStart();
  }, [onStart]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || IGNORED_KEYS.has(e.key) || /^F\d+$/.test(e.key)) return;
      start();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [start]);

  const tip = TIPS[Math.floor(progress / 34) % TIPS.length];

  return (
    <motion.div
      ref={root}
      role="status"
      aria-label={ready ? 'Ready. Press start' : 'Loading'}
      onClick={start}
      className="boot-screen fixed inset-0 z-50 flex flex-col justify-between overflow-hidden bg-ink px-6 py-8 sm:px-12 short:py-3"
      exit={{ opacity: 0, scale: 1.03 }}
      transition={{ duration: 0.3 }}
    >
      <div aria-hidden className="load-glow absolute inset-0" />
      <div aria-hidden className="stripes absolute inset-0" />
      <div aria-hidden className="absolute -right-[8%] top-0 h-full w-[30%] -skew-x-[18deg] bg-gradient-to-l from-flame/[0.10] to-transparent" />

      <div className="relative flex items-center justify-between text-[0.6875rem] font-semibold uppercase tracking-[0.3em] text-zinc-400">
        <span>Portfolio · Lobby</span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 animate-dot rounded-full bg-flame" /> {ready ? 'Ready' : 'Loading'}
        </span>
      </div>

      <div className="relative flex flex-col items-center text-center">
        {/* the little hero, inside two slowly turning rings (GSAP) */}
        <div className="ld-hero relative grid h-52 w-52 place-items-center sm:h-64 sm:w-64 short:h-32 short:w-32">
          <svg aria-hidden viewBox="0 0 240 240" className="pointer-events-none absolute inset-0 h-full w-full text-gold">
            <g className="ld-ring-a">
              <circle cx="120" cy="120" r="114" fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.5" strokeDasharray="3 11" />
              <polygon points="120,10 215,65 215,175 120,230 25,175 25,65" fill="none" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.2" />
            </g>
            <g className="ld-ring-b">
              <circle cx="120" cy="120" r="96" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="30 14" />
              <circle cx="120" cy="24" r="4" fill="currentColor" />
              <circle cx="120" cy="216" r="2.5" fill="currentColor" fillOpacity="0.7" />
            </g>
          </svg>
          <div className="robot-bob relative">
            <Robot
              mood={ready ? 'happy' : 'idle'}
              eyeX={eyeX}
              eyeY={eyeY}
              className="h-40 w-40 drop-shadow-[0_0_30px_rgb(var(--glow-e)/0.5)] sm:h-48 sm:w-48 short:h-24 short:w-24"
            />
          </div>
        </div>
        <h1 className="ld-name mt-3 font-display text-5xl uppercase leading-none tracking-wide text-white sm:text-7xl short:mt-1 short:text-4xl">
          {PLAYER.firstName} <span className="text-gold">{PLAYER.lastName}</span>
        </h1>
        <p className="ld-sub mt-3 text-sm font-semibold uppercase tracking-[0.35em] text-zinc-400 short:mt-1 short:text-xs">{PLAYER.title}</p>
      </div>

      <div className="relative mx-auto w-full max-w-3xl">
        <div className="mb-5 flex min-h-[4.5rem] items-center justify-center short:mb-2 short:min-h-[3.6rem]">
          {ready ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="text-center">
              <GameButton label="Press start" sub="Sound on · best with headphones" onClick={start} />
            </motion.div>
          ) : (
            <p className="text-center text-sm text-zinc-300">
              <span className="mr-2 font-display text-base uppercase tracking-wider text-gold">Tip</span>
              {tip}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 -skew-x-12 bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-flame-hot to-flame shadow-[0_0_12px_rgb(var(--glow)/0.8)] transition-[width] duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="w-12 text-right font-display text-xl tabular-nums text-white">{progress}%</span>
        </div>
        <p className="mt-4 text-center text-[0.625rem] font-semibold uppercase tracking-[0.35em] text-zinc-500 short:mt-2">
          {ready ? 'Tap anywhere or press any key to start' : 'Tap anywhere or press any key to start early'}
        </p>
      </div>
    </motion.div>
  );
}
