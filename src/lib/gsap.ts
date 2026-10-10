// One place that loads and sets up GSAP (timelines, SplitText), so every component uses the
// same instance and defaults. GSAP drives the cinematic bits (intro, loading screen, hero title, backdrop
// parallax and 3D crystals); Framer Motion keeps doing the page and panel transitions; three.js is the
// 3D character (see components/character).

import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(SplitText);
  gsap.defaults({ ease: 'power3.out', duration: 0.6 });
  // for tests: lets a script freeze the timelines and look at any frame (not in production builds)
  if (process.env.NODE_ENV !== 'production') Object.assign(window, { __gsap: gsap });
}

export { gsap, SplitText };

/** True when the visitor asked for less motion: decorative loops are skipped and reveals jump to the end. */
export const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** True on a desktop-style pointer (a mouse): the pointer-driven effects only make sense there. */
export const finePointer = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
