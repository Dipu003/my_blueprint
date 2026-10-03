'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

const RAIL = 220; // rail length in px
const TOP = 20; // rail start offset in px

const TICKS = Array.from({ length: 11 }, (_, i) => ({ y: TOP + i * (RAIL / 10), major: i % 5 === 0 }));

/**
 * Scroll gauge, shown only while the page is scrolling: a gold rail with a diamond marker that
 * tracks position, a live percentage and chevrons that flow in the scroll direction.
 * (The companion character hides during scrolling, so this takes over.)
 */
export function ScrollHud() {
  const [visible, setVisible] = useState(false);
  const [dir, setDir] = useState<'up' | 'down'>('down');
  const [percent, setPercent] = useState(0);

  const progress = useMotionValue(0);
  const smooth = useSpring(progress, { stiffness: 260, damping: 30, mass: 0.4 });
  const y = useTransform(smooth, (p) => p * RAIL);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastTop = 0;

    const onScroll = (e: Event) => {
      const el = e.target;
      if (!(el instanceof HTMLElement) || !el.classList.contains('game-scroll')) return;
      const max = el.scrollHeight - el.clientHeight;
      if (max <= 8) return;

      const p = Math.min(1, Math.max(0, el.scrollTop / max));
      progress.set(p);
      setPercent(Math.round(p * 100));
      if (el.scrollTop !== lastTop) {
        setDir(el.scrollTop > lastTop ? 'down' : 'up');
        lastTop = el.scrollTop;
      }
      setVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => setVisible(false), 900);
    };

    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true });
      clearTimeout(timer);
    };
  }, [progress]);

  const flow = dir === 'down' ? 1 : -1;

  return (
    // Above the role briefing (z-60), which scrolls on its own and should show the gauge too.
    <div aria-hidden className="pointer-events-none fixed right-4 top-1/2 z-[62] hidden -translate-y-1/2 md:block">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 14 }}
            transition={{ duration: 0.18 }}
            className="relative h-[260px] w-[88px] text-gold"
          >
            {/* ticks (left of the rail so they never cross it) */}
            <svg viewBox="0 0 28 260" className="absolute right-0 top-0 h-full w-7">
              <line x1="20" y1={TOP} x2="20" y2={TOP + RAIL} stroke="currentColor" strokeOpacity="0.28" strokeWidth="2" />
              {TICKS.map((t) => (
                <line
                  key={t.y}
                  x1={t.major ? 6 : 11}
                  y1={t.y}
                  x2={15}
                  y2={t.y}
                  stroke="currentColor"
                  strokeOpacity={t.major ? 0.8 : 0.4}
                  strokeWidth="1.5"
                />
              ))}
            </svg>

            {/* progress fill */}
            <motion.div
              style={{ height: y, top: TOP }}
              className="absolute right-[7px] w-[2px] bg-gradient-to-b from-flame/10 to-flame shadow-[0_0_8px_rgb(var(--glow-b))]"
            />

            {/* chevrons flowing in the scroll direction, riding with the marker */}
            <motion.div style={{ y }} className="absolute right-[1px] top-0 h-0 w-[14px]">
              {[0, 1, 2].map((i) => (
                <motion.svg
                  key={`${dir}-${i}`}
                  viewBox="0 0 14 10"
                  className="absolute left-0 h-[9px] w-[14px]"
                  style={{ top: TOP + (flow > 0 ? 14 + i * 9 : -23 - i * 9), rotate: flow > 0 ? 0 : 180 }}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: (flow > 0 ? i : 2 - i) * 0.16 }}
                >
                  <path d="M1 1 L7 8 L13 1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </motion.svg>
              ))}
            </motion.div>

            {/* diamond marker */}
            <motion.div style={{ y }} className="absolute right-[-1px] top-0 h-[18px] w-[18px]">
              <svg viewBox="0 0 18 18" className="absolute left-0 h-[18px] w-[18px]" style={{ top: TOP - 9 }}>
                <path d="M9 1L17 9 9 17 1 9z" strokeWidth="1.5" strokeLinejoin="round" style={{ fill: 'rgb(var(--flame))', stroke: 'rgb(var(--ink))' }} />
                <path d="M9 5.5L12.5 9 9 12.5 5.5 9z" style={{ fill: 'rgb(var(--ink))' }} />
              </svg>
            </motion.div>

            {/* live percentage */}
            <motion.div style={{ y }} className="absolute right-[36px] top-0 h-0">
              <div
                className="absolute right-0 whitespace-nowrap font-display text-xl font-extrabold italic leading-none tabular-nums text-gold drop-shadow-[0_0_6px_rgb(var(--glow-b)/0.6)]"
                style={{ top: TOP - 10 }}
              >
                {percent}
                <span className="text-xs">%</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
