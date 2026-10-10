'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Intro } from '@/components/Intro';
import { Backdrop } from '@/components/hud/Backdrop';
import { TopBar } from '@/components/hud/TopBar';
import { NavTabs } from '@/components/hud/NavTabs';
import { ReconComplete } from '@/components/hud/ReconComplete';
import { Companion } from '@/components/hud/Companion';
import { PointerRotator } from '@/components/hud/PointerRotator';
import { RoleBrief } from '@/components/hud/RoleBrief';
import { ScrollHud } from '@/components/hud/ScrollHud';
import { SectionBanner } from '@/components/hud/SectionBanner';
import { SectionView } from '@/components/sections';
import { useGame } from '@/providers/GameProvider';

export default function Page() {
  const { section, phase, startIntro, markIntroExited } = useGame();
  const ready = phase === 'ready';
  const mainRef = useRef<HTMLElement>(null);
  const uiRef = useRef<HTMLDivElement>(null);

  // While the loading screen or the intro is up, the site underneath cannot be reached with Tab or by a
  // screen reader (it is mounted, so it is ready the moment the intro ends, but it is not shown yet).
  useEffect(() => {
    const el = uiRef.current;
    if (!el) return;
    if (ready) el.removeAttribute('inert');
    else el.setAttribute('inert', '');
  }, [ready]);

  // A new tab starts at the top instead of inheriting the old tab's scroll position.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [section]);

  return (
    <>
      <Backdrop />
      {/* boot: loading bar, then "Press start"; intro: the character's welcome; ready: the site */}
      <AnimatePresence>{phase === 'boot' && <LoadingScreen key="loading" onStart={startIntro} />}</AnimatePresence>
      <AnimatePresence onExitComplete={markIntroExited}>{phase === 'intro' && <Intro key="intro" />}</AnimatePresence>

      <motion.div
        ref={uiRef}
        initial={false}
        animate={ready ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 flex h-dvh flex-col"
      >
        <TopBar />
        <NavTabs />
        <main ref={mainRef} className="game-scroll relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 sm:px-8">
          {/* The perspective lives on this plain wrapper, not on the page itself: once a tab has arrived its
              container goes back to `transform: none` (crisp text, no extra compositor layer). */}
          <div style={{ perspective: 1500, perspectiveOrigin: '50% 12%' }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={section}
                // a slide with a slight turn in 3D: the page swings in like a card on a hinge
                initial={{ opacity: 0, x: 40, rotateY: 9 }}
                animate={{ opacity: 1, x: 0, rotateY: 0 }}
                exit={{ opacity: 0, x: -40, rotateY: -9 }}
                transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                className="mx-auto max-w-7xl"
              >
                <SectionView id={section} />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </motion.div>

      {/* Not over the loading screen or the intro: a link straight to a role would otherwise open on top of them. */}
      {ready && <RoleBrief />}
      <ReconComplete />
      <ScrollHud />
      <SectionBanner />
      {/* the cursor companion only joins once the site is open (not over the loading screen or during the intro) */}
      {ready && <Companion />}
      <PointerRotator />
    </>
  );
}
