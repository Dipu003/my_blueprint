'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Backdrop } from '@/components/hud/Backdrop';
import { TopBar } from '@/components/hud/TopBar';
import { NavTabs } from '@/components/hud/NavTabs';
import { LevelUp } from '@/components/hud/LevelUp';
import { Companion } from '@/components/hud/Companion';
import { SectionView } from '@/components/sections';
import { useGame } from '@/providers/GameProvider';

const LOADED_KEY = 'lobby:loaded';

export default function Page() {
  const { section } = useGame();
  const [loaded, setLoaded] = useState(false);

  // Skip the loading screen on repeat visits within a session.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(LOADED_KEY)) setLoaded(true);
    } catch {}
  }, []);

  const finishLoading = useCallback(() => {
    setLoaded(true);
    try {
      sessionStorage.setItem(LOADED_KEY, '1');
    } catch {}
  }, []);

  return (
    <>
      <Backdrop />
      <AnimatePresence>{!loaded && <LoadingScreen key="loading" onDone={finishLoading} />}</AnimatePresence>

      <motion.div
        initial={false}
        animate={loaded ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 flex h-dvh flex-col"
      >
        <TopBar />
        <NavTabs />
        <main className="game-scroll relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 sm:px-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={section}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
              className="mx-auto max-w-7xl"
            >
              <SectionView id={section} />
            </motion.div>
          </AnimatePresence>
        </main>
      </motion.div>

      <LevelUp />
      <Companion />
    </>
  );
}
