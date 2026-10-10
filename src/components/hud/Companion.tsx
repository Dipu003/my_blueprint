'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useAnimationControls, useMotionValue, useSpring, useTransform, useVelocity } from 'framer-motion';
import { Robot, type RobotMood } from '@/components/ui/Robot';
import { Orb } from '@/components/ui/Orb';

type Kind = 'robot' | 'orb';
type Facing = 'left' | 'right';

// Rendered size in px of each character (matches each SVG's aspect ratio).
const DIMS: Record<Kind, { w: number; h: number }> = {
  robot: { w: 46, h: Math.round((46 * 78) / 64) },
  orb: { w: 56, h: Math.round((56 * 40) / 64) },
};
// Listed as an effect dependency below so the pointer listener re-subscribes whenever this
// module is re-evaluated (hot reload in dev); otherwise an open tab keeps the stale listener.
const SELECTORS = { clickable: 'button, a, [role="tab"]', tile: '.tile', box: '.panel' };

// How long it keeps standing at an element after the pointer leaves it. Tiles sit a few pixels
// apart, so crossing the gap between two of them must not make it flip to idle and back.
const PERCH_GRACE_MS = 140;
// On a box: how long he waves after landing, how far his disc sinks onto its top edge, and how far
// along a wide box the pointer may wander before he hops after it.
const GREET_MS = 1600;
const BOX_FEET_PX = 9;
const BOX_FOLLOW_PX = 260;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * A companion that trails the pointer with a springy lag and looks at it.
 * - Over a button or link, the robot hops over, stands beside it and waves.
 * - Over a tile (skills, chips, cards), it turns into a small recon orb that hovers beside the
 *   tile and scans it with a beam.
 * - Over a box (a panel), he hops up onto its top edge, waves, then stands there watching the
 *   pointer: he presents the box instead of trailing over the text being read.
 * - Hidden over the scrollbar and while scrolling.
 * Mouse only: hidden on touch screens and when reduced motion is requested.
 *
 * Kept cheap on purpose: pointer events are handled once per animation frame, an element is
 * measured once when the companion lands on it, and nothing here touches layout or page-wide CSS.
 */
export function Companion() {
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [hide, setHide] = useState(false);
  const [kind, setKind] = useState<Kind>('robot');
  const [mood, setMood] = useState<RobotMood>('idle');
  const [facing, setFacing] = useState<Facing>('right'); // which way the orb's beam points
  const hop = useAnimationControls();
  const dimsRef = useRef(DIMS.robot);

  const px = useMotionValue(0); // raw pointer
  const py = useMotionValue(0);
  const tx = useMotionValue(-200); // where the companion wants to be
  const ty = useMotionValue(-200);
  const x = useSpring(tx, { stiffness: 170, damping: 17, mass: 0.7 });
  const y = useSpring(ty, { stiffness: 170, damping: 17, mass: 0.7 });
  const tilt = useTransform(useVelocity(x), (v) => clamp(v / 70, -14, 14));
  const eyeX = useTransform([x, px], ([rx, p]: number[]) => clamp((p - (rx + dimsRef.current.w / 2)) / 14, -3.2, 3.2));
  const eyeY = useTransform([y, py], ([ry, p]: number[]) => clamp((p - (ry + dimsRef.current.h * 0.42)) / 14, -2.2, 2.2));
  const lensX = useTransform(eyeX, (v) => v * 0.6); // the orb's eye has less room to move
  const lensY = useTransform(eyeY, (v) => v * 0.6);

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return;
    setEnabled(true);

    // Mirror of the React state, so setters only run when something actually changed.
    const cur = { shown: false, hide: false, kind: 'robot' as Kind, mood: 'idle' as RobotMood, facing: 'right' as Facing };
    const apply = (n: Partial<typeof cur>) => {
      if (n.shown !== undefined && n.shown !== cur.shown) setVisible((cur.shown = n.shown));
      if (n.hide !== undefined && n.hide !== cur.hide) setHide((cur.hide = n.hide));
      if (n.kind !== undefined && n.kind !== cur.kind) setKind((cur.kind = n.kind));
      if (n.mood !== undefined && n.mood !== cur.mood) setMood((cur.mood = n.mood));
      if (n.facing !== undefined && n.facing !== cur.facing) setFacing((cur.facing = n.facing));
    };

    const mainEl = document.querySelector('main');
    let last = { x: 0, y: 0 };
    let pending: { x: number; y: number; target: Element | null } | null = null;
    let frame = 0;
    let perched: Element | null = null;
    let onBox = false; // is the perch a box (he stands on top of it) rather than a button or tile (beside it)?
    let standX = 0; // where he stands on the box (his centre)
    let greeted: Element | null = null; // the box he last waved from: no second wave for coming back to it
    let scrolling = false;
    let scrollTimer: ReturnType<typeof setTimeout> | undefined;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let greetTimer: ReturnType<typeof setTimeout> | undefined;

    const follow = () => {
      const d = DIMS.robot;
      dimsRef.current = d;
      tx.set(clamp(last.x + 16, 2, window.innerWidth - d.w - 2));
      ty.set(clamp(last.y + 14, 2, window.innerHeight - d.h - 2));
    };

    /** Up onto the top edge of a box, above where the pointer is. */
    const standOn = (box: Element, cx: number) => {
      const d = DIMS.robot;
      dimsRef.current = d;
      const r = box.getBoundingClientRect();
      const ceiling = mainEl?.getBoundingClientRect().top ?? 0; // above this are the top bar and the tabs
      let left = clamp(cx - d.w / 2, r.left + 14, Math.max(r.left + 14, r.right - d.w - 14));
      let top = r.top - d.h + BOX_FEET_PX;
      if (top < ceiling - 14) {
        // The box's top edge has scrolled away: he keeps to its right-hand edge (mostly in the gap beside
        // it), at the top of what is left of it, clear of the lines being read.
        left = r.right - 16;
        top = ceiling + 6;
      }
      left = clamp(left, 2, window.innerWidth - d.w - 2);
      perched = box;
      onBox = true;
      standX = left + d.w / 2;
      tx.set(left);
      ty.set(clamp(top, 2, window.innerHeight - d.h - 2));
      clearTimeout(greetTimer);
      if (greeted !== box) {
        // a new box: he waves from it for a moment, then just watches
        greeted = box;
        apply({ kind: 'robot', mood: 'happy' });
        greetTimer = setTimeout(() => {
          if (perched === box) apply({ mood: 'idle' });
        }, GREET_MS);
      } else {
        apply({ kind: 'robot', mood: 'idle' });
      }
      void hop.start({ y: [0, -11, 0], transition: { duration: 0.36, ease: 'easeOut' } });
    };

    const process = () => {
      frame = 0;
      if (!pending) return;
      const { x: cx, y: cy, target } = pending;
      pending = null;

      px.set(cx);
      py.set(cy);
      last = { x: cx, y: cy };

      // The page scrollbar belongs to <main>, so a pointer over it targets <main> itself, at the edge.
      const overBar = target === mainEl && cx > window.innerWidth - 14;
      apply({ hide: scrolling || overBar });

      // Buttons win over tiles, so a tile that is itself a button still gets the robot.
      const btn = target?.closest(SELECTORS.clickable) as HTMLButtonElement | null;
      const tile = btn ? null : (target?.closest(SELECTORS.tile) as HTMLElement | null);
      const el = btn && !btn.disabled ? btn : tile;
      // A box counts only inside the page itself: a dialog or a menu has no room above it.
      const panel = el ? null : (target?.closest(SELECTORS.box) ?? null);
      const box = panel && mainEl?.contains(panel) ? panel : null;

      if (el) {
        clearTimeout(idleTimer);
        idleTimer = undefined;
        if (perched === el) return; // already standing here: nothing to measure or move

        perched = el;
        onBox = false;
        clearTimeout(greetTimer);
        const next: Kind = tile ? 'orb' : 'robot';
        const d = DIMS[next];
        dimsRef.current = d;

        // Stand just outside the left edge of the element (right edge if there's no room).
        const r = el.getBoundingClientRect();
        const left = r.left > d.w + 8;
        const overlap = next === 'orb' ? 8 : 6; // tuck in a little so the beam/hand touches the element
        tx.set(clamp(left ? r.left - d.w + overlap : r.right - overlap, 2, window.innerWidth - d.w - 2));
        ty.set(clamp(r.top + r.height / 2 - d.h / 2, 2, window.innerHeight - d.h - 2));
        apply({ kind: next, facing: left ? 'right' : 'left', mood: 'happy' });
        void hop.start({ y: [0, -11, 0], transition: { duration: 0.36, ease: 'easeOut' } });
      } else if (box && (!perched || onBox)) {
        // Inside a box: he stands on top of it instead of trailing the pointer over its text. He stays
        // put while the pointer moves about in the box (on a wide one he hops along once it is far off).
        clearTimeout(idleTimer);
        idleTimer = undefined;
        if (perched === box && Math.abs(cx - standX) < BOX_FOLLOW_PX) return;
        standOn(box, cx);
      } else if (perched) {
        // Left a button, a tile or a box. Hold the perch briefly in case the pointer is only crossing a
        // gap, then go by what is under the pointer now: a box to stand on, or nothing (trail again).
        if (idleTimer === undefined) {
          idleTimer = setTimeout(() => {
            idleTimer = undefined;
            perched = null;
            if (!pending) pending = { x: last.x, y: last.y, target: document.elementFromPoint(last.x, last.y) };
            process();
          }, PERCH_GRACE_MS);
        }
      } else {
        greeted = null;
        clearTimeout(greetTimer);
        apply({ kind: 'robot', mood: 'idle' });
        follow();
      }
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      apply({ shown: true });
      pending = { x: e.clientX, y: e.clientY, target: e.target as Element | null };
      if (!frame) frame = requestAnimationFrame(process);
    };

    // Scrolling moves content under a still pointer: hide while it scrolls, then re-check what
    // is under the pointer once it settles (re-measuring, since everything has moved).
    const onScroll = () => {
      scrolling = true;
      apply({ hide: true });
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        scrolling = false;
        perched = null;
        pending = { x: last.x, y: last.y, target: document.elementFromPoint(last.x, last.y) };
        process();
      }, 600);
    };
    const onResize = () => {
      perched = null;
    };
    const onLeave = () => apply({ shown: false });

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', onResize, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', onResize);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(frame);
      clearTimeout(scrollTimer);
      clearTimeout(idleTimer);
      clearTimeout(greetTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- SELECTORS is intentional (see above)
  }, [px, py, tx, ty, hop, SELECTORS]);

  if (!enabled) return null;

  const { w } = DIMS[kind];

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[65]"
      style={{ x, y, rotate: tilt, width: w }}
      animate={{ opacity: visible && !hide ? 1 : 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div animate={hop}>
        <motion.div
          key={kind}
          initial={{ scale: 0.55, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.18 }}
          className="drop-shadow-[0_6px_10px_rgb(var(--shadow)/0.55)]"
        >
          {kind === 'robot' ? (
            <div className="robot-bob">
              <Robot mood={mood} eyeX={eyeX} eyeY={eyeY} className="h-auto w-full" />
            </div>
          ) : (
            // The flip lives on its own wrapper: the bob animation below owns `transform`, so an
            // inline flip on the same element would be overridden and never show.
            <div style={{ transform: facing === 'left' ? 'scaleX(-1)' : undefined }}>
              <div className="orb-bob">
                <Orb eyeX={lensX} eyeY={lensY} className="h-auto w-full" />
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
