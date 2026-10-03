'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SECTIONS, type SectionId } from '@/data/portfolio';
import { useGame } from '@/providers/GameProvider';
import { Icon } from '@/components/ui/Icon';

/**
 * Game-style notification when you open a tab: "Fetching MISSIONS..." with a loading bar, then
 * "Mission intel fetched" with a check mark. Bottom-left, like the notices in a match HUD.
 */
export function SectionBanner() {
  const { section } = useGame();
  const [shown, setShown] = useState<{ id: SectionId; n: number } | null>(null);
  const [done, setDone] = useState(false);
  const prev = useRef(section);

  // Only react to real changes (not the first render, and not React's dev double-invoke).
  useEffect(() => {
    if (prev.current === section) return;
    prev.current = section;
    setDone(false);
    setShown({ id: section, n: Date.now() });
  }, [section]);

  useEffect(() => {
    if (!shown) return;
    const ready = setTimeout(() => setDone(true), 450);
    const gone = setTimeout(() => setShown(null), 2800);
    return () => {
      clearTimeout(ready);
      clearTimeout(gone);
    };
  }, [shown]);

  const def = shown ? SECTIONS.find((s) => s.id === shown.id) : undefined;

  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-20 left-4 z-40 md:bottom-8 md:left-8">
      <AnimatePresence mode="wait">
        {shown && def && (
          <motion.div
            key={shown.n}
            initial={{ opacity: 0, x: -48 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -32 }}
            transition={{ type: 'spring', stiffness: 460, damping: 34 }}
            className="para relative w-[20rem] max-w-[calc(100vw-2rem)] overflow-hidden bg-black/80 py-2.5 pl-9 pr-10 shadow-[0_0_24px_rgb(var(--glow)/0.25)]"
          >
            <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-flame to-flame-hot" />
            <div className="flex items-center gap-3">
              <div className={`grid h-9 w-9 shrink-0 place-items-center transition-colors ${done ? 'text-ok' : 'text-gold'}`}>
                <Icon name={done ? 'check' : def.id} className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="font-display text-2xl font-extrabold italic uppercase leading-none tracking-wide text-white">
                  {def.label}
                </div>
                <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-300">
                  {done ? def.status : 'Fetching…'}
                </div>
              </div>
            </div>
            {/* "transmission" bars: the announcer is on the radio */}
            <div aria-hidden className="absolute right-10 top-3 flex h-5 items-center gap-[3px]">
              {[0, 0.12, 0.24, 0.08, 0.2].map((d, i) => (
                <span key={i} className="comms-bar" style={{ animationDelay: `${d}s` }} />
              ))}
            </div>
            <div className="mt-2 h-1 -skew-x-12 bg-white/10">
              <motion.div
                className="h-full bg-gradient-to-r from-flame-hot to-flame shadow-[0_0_8px_rgb(var(--glow)/0.8)]"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.42, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
