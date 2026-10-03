'use client';

import { useEffect, useState } from 'react';
import { motion, useAnimationControls, useMotionValue, useSpring, useTransform, useVelocity } from 'framer-motion';
import { Robot, type RobotMood } from '@/components/ui/Robot';

const W = 46; // rendered width in px
const H = Math.round((W * 78) / 64);
const SELECTOR = 'button, a, [role="tab"]';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * A robot buddy that trails the pointer with a springy lag, looks at it, and hops over to
 * stand beside whichever button, tab or link you hover (waving while it's there).
 * Mouse only: hidden on touch screens and when reduced motion is requested.
 */
export function Companion() {
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [mood, setMood] = useState<RobotMood>('idle');
  const hop = useAnimationControls();

  const px = useMotionValue(0); // raw pointer
  const py = useMotionValue(0);
  const tx = useMotionValue(-200); // where the robot wants to be
  const ty = useMotionValue(-200);
  const x = useSpring(tx, { stiffness: 170, damping: 17, mass: 0.7 });
  const y = useSpring(ty, { stiffness: 170, damping: 17, mass: 0.7 });
  const tilt = useTransform(useVelocity(x), (v) => clamp(v / 70, -14, 14));
  const eyeX = useTransform([x, px], ([rx, p]: number[]) => clamp((p - (rx + W / 2)) / 14, -3.2, 3.2));
  const eyeY = useTransform([y, py], ([ry, p]: number[]) => clamp((p - (ry + H * 0.42)) / 14, -2.2, 2.2));

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return;
    setEnabled(true);

    const root = document.documentElement;
    let last = { x: 0, y: 0 };
    let perched: Element | null = null;

    const aim = (cx: number, cy: number, target: Element | null) => {
      px.set(cx);
      py.set(cy);
      last = { x: cx, y: cy };
      root.style.setProperty('--mx', `${cx}px`);
      root.style.setProperty('--my', `${cy}px`);

      const el = target?.closest(SELECTOR) as HTMLButtonElement | null;
      if (el && !el.disabled) {
        // Stand just outside the left edge of the element (right edge if there's no room).
        const r = el.getBoundingClientRect();
        const left = r.left > W + 8;
        tx.set(clamp(left ? r.left - W + 6 : r.right - 6, 2, window.innerWidth - W - 2));
        ty.set(clamp(r.top + r.height / 2 - H / 2, 2, window.innerHeight - H - 2));
        setMood('happy');
        if (perched !== el) {
          perched = el;
          void hop.start({ y: [0, -11, 0], transition: { duration: 0.36, ease: 'easeOut' } });
        }
      } else {
        perched = null;
        tx.set(clamp(cx + 16, 2, window.innerWidth - W - 2));
        ty.set(clamp(cy + 14, 2, window.innerHeight - H - 2));
        setMood('idle');
      }
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      setVisible(true);
      aim(e.clientX, e.clientY, e.target as Element | null);
    };
    // Scrolling moves content under a still pointer, so re-check what is under it.
    const onScroll = () => aim(last.x, last.y, document.elementFromPoint(last.x, last.y));
    const onLeave = () => setVisible(false);

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    document.documentElement.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', onScroll, { capture: true });
      document.documentElement.removeEventListener('mouseleave', onLeave);
    };
  }, [px, py, tx, ty, hop]);

  if (!enabled) return null;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[65]"
      style={{ x, y, rotate: tilt, width: W }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div animate={hop}>
        <div className="robot-bob drop-shadow-[0_6px_10px_rgba(0,0,0,0.55)]">
          <Robot mood={mood} eyeX={eyeX} eyeY={eyeY} className="h-auto w-full" />
        </div>
      </motion.div>
    </motion.div>
  );
}
