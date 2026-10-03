'use client';

import { useEffect } from 'react';
import { POINTER_COUNT, POINTER_NAMES, pointerUrls, pointerVars } from '@/lib/pointers';

// Like a wallpaper slideshow: every 20-30 seconds the game pointer moves on to the next design.
const MIN_MS = 20_000;
const MAX_MS = 30_000;
// Changing the cursor makes the browser re-resolve the style of the whole page (a frame or two of
// main-thread work), so the swap waits for the mouse to rest, and never longer than this past its time.
const REST_MS = 600;
const GIVE_UP_MS = 3_000;
const POLL_MS = 200;

export function PointerRotator() {
  useEffect(() => {
    // Touch screens have no pointer to restyle.
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const root = document.documentElement;
    let index = Math.floor(Math.random() * POINTER_COUNT);
    let timer = 0;
    let lastActivity = 0;
    let warm: HTMLImageElement[] = []; // images of the next design, kept alive so the swap finds them decoded

    const apply = () => {
      const vars = pointerVars(index);
      for (const name in vars) root.style.setProperty(name, vars[name]);
      root.dataset.pointer = POINTER_NAMES[index].toLowerCase();
    };
    const preloadNext = () => {
      warm = pointerUrls((index + 1) % POINTER_COUNT).map((url) => {
        const img = new Image();
        img.src = url;
        return img;
      });
    };
    const schedule = () => {
      timer = window.setTimeout(() => swap(0), MIN_MS + Math.random() * (MAX_MS - MIN_MS));
    };
    const swap = (waited: number) => {
      const resting = document.hidden || performance.now() - lastActivity > REST_MS;
      if (!resting && waited < GIVE_UP_MS) {
        timer = window.setTimeout(() => swap(waited + POLL_MS), POLL_MS);
        return;
      }
      index = (index + 1) % POINTER_COUNT;
      apply();
      preloadNext();
      schedule();
    };
    const noteActivity = () => {
      lastActivity = performance.now();
    };

    apply();
    preloadNext();
    schedule();
    const opts = { passive: true, capture: true } as const;
    const events = ['pointermove', 'pointerdown', 'wheel', 'scroll', 'keydown'] as const;
    events.forEach((e) => window.addEventListener(e, noteActivity, opts));
    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, noteActivity, opts));
    };
  }, []);

  return null;
}
