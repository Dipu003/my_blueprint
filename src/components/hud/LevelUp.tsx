'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '@/providers/GameProvider';
import { play } from '@/lib/sound';
import { Rank } from '@/components/ui/Rank';

/** "Level up" banner that slides in once, when every tab has been visited. */
export function LevelUp() {
  const { xp, level } = useGame();
  const [show, setShow] = useState(false);
  const fired = useRef(false);

  useEffect(() => {
    if (xp >= 100 && !fired.current) {
      fired.current = true;
      setShow(true);
      play('confirm');
    }
  }, [xp]);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(false), 3400);
    return () => clearTimeout(t);
  }, [show]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 md:bottom-auto md:top-3">
      <AnimatePresence>
        {show && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: -24, scaleX: 0.8 }}
            animate={{ opacity: 1, y: 0, scaleX: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="para flex items-center gap-4 bg-gradient-to-r from-gold-hot via-gold to-gold-hot px-12 py-3 text-ink shadow-[0_0_30px_rgba(255,160,0,0.5)]"
          >
            <Rank count={3} className="h-8 w-8" />
            <div className="leading-none">
              <div className="font-display text-3xl font-extrabold italic uppercase tracking-wide">Level up</div>
              <div className="mt-1 text-xs font-bold uppercase tracking-[0.2em]">All tabs explored · Level {level}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
