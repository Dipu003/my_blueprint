'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { Depth } from '@/components/hud/Depth';
import { Snow } from '@/components/hud/Snow';
import { gsap, reducedMotion } from '@/lib/gsap';

// The scenery behind the page, like the night landscapes of fantasy-game websites: northern lights rippling
// across the sky, twinkling stars and the odd shooting star, three ridges of mountains with pine forests, a
// few slowly turning ice crystals, and gently falling snow. The ridges drift against the pointer by different
// amounts (parallax); the lights, stars, shooting stars and crystals are driven by GSAP; the snow is a small
// canvas (Snow.tsx). Colours come from the --land-* and --aur-* tokens, so both themes use the same shapes.

const W = 1440;
const H = 400;

/** Small seeded random numbers: the scenery is identical on the server and in the browser. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Rounded, so the server and the browser print identical numbers (they can differ in the last digits of Math.sin).
const r1 = (n: number) => Math.round(n * 10) / 10;

const ridgeY = (seed: number, base: number, amp: number, x: number) =>
  base - amp * (0.5 + 0.3 * Math.sin(x * 0.0049 + seed) + 0.17 * Math.sin(x * 0.0113 + seed * 2.1) + 0.09 * Math.sin(x * 0.0271 + seed * 3.7));

/** A ridge of mountains as a closed shape filling the area below it. */
function ridge(seed: number, base: number, amp: number): string {
  const pts: string[] = [];
  for (let x = 0; x <= W; x += 24) pts.push(`${x} ${r1(ridgeY(seed, base, amp, x))}`);
  return `M0 ${H}L${pts.join('L')}L${W} ${H}Z`;
}

/** A row of pines (three stacked triangles each) standing on the ridge. */
function pines(seed: number, base: number, amp: number, step: number, hMin: number, hMax: number): string {
  const r = rng(seed);
  let d = '';
  for (let x = -12; x <= W + 12; x += step * (0.7 + r() * 0.6)) {
    const y = ridgeY(seed, base, amp, x) + 6;
    const h = hMin + r() * (hMax - hMin);
    const w = h * 0.3;
    for (let t = 0; t < 3; t++) {
      const wt = w * (1 - t * 0.2);
      const y0 = y - h * t * 0.3;
      const y1 = y0 - h * 0.46;
      d += `M${r1(x - wt)} ${r1(y0)}L${r1(x)} ${r1(y1)}L${r1(x + wt)} ${r1(y0)}Z`;
    }
  }
  return d;
}

const FAR = ridge(0.6, 232, 96);
const MID = ridge(2.4, 296, 70) + pines(7, 296, 70, 30, 34, 70);
const NEAR = ridge(4.1, 366, 34) + pines(13, 366, 34, 26, 70, 128);

const STARS = Array.from({ length: 63 }, (_, i) => ({
  x: r1((i * 97.3 + 31) % W),
  y: r1(((i * 53.7 + 11) % 300) + 6),
  r: r1(0.7 + (i % 4) * 0.4),
  g: i % 3,
}));

/** Four lit and four shaded tones: the faces of a crystal, in ice blue or amethyst. */
const AMETHYST = [
  'linear-gradient(170deg, rgb(244 236 255 / .95), rgb(196 168 255 / .8))',
  'linear-gradient(170deg, rgb(206 182 255 / .92), rgb(140 100 255 / .75))',
  'linear-gradient(170deg, rgb(150 110 250 / .9), rgb(90 50 200 / .8))',
  'linear-gradient(170deg, rgb(182 150 255 / .92), rgb(120 80 240 / .75))',
];
const ICE = [
  'linear-gradient(170deg, rgb(236 250 255 / .95), rgb(120 200 255 / .8))',
  'linear-gradient(170deg, rgb(150 215 255 / .92), rgb(62 132 255 / .75))',
  'linear-gradient(170deg, rgb(86 152 255 / .9), rgb(40 72 206 / .8))',
  'linear-gradient(170deg, rgb(120 190 255 / .92), rgb(76 104 244 / .75))',
];

/**
 * An ice crystal made of CSS 3D faces: a square bipyramid, four triangles up and four down, each one
 * hinged on the equator and tilted in. `size` is the width; it is about twice as tall.
 */
function Gem({ size, tone }: { size: number; tone: 'ice' | 'amethyst' }) {
  const face = tone === 'ice' ? ICE : AMETHYST;
  const a = size / 2;
  const h = size * 0.95;
  const slant = Math.hypot(h, a);
  const tilt = (Math.atan2(a, h) * 180) / Math.PI;
  const faces: ReactNode[] = [];
  for (let i = 0; i < 4; i++) {
    for (const up of [true, false]) {
      faces.push(
        <div
          key={`${up ? 'u' : 'd'}${i}`}
          className="absolute"
          style={{
            width: size,
            height: slant,
            left: -a,
            top: up ? -slant : 0,
            transformOrigin: up ? '50% 100%' : '50% 0%',
            transform: `rotateY(${i * 90}deg) translateZ(${a}px) rotateX(${up ? tilt : -tilt}deg)`,
            clipPath: up ? 'polygon(50% 0, 100% 100%, 0 100%)' : 'polygon(0 0, 100% 0, 50% 100%)',
            background: face[(i + (up ? 0 : 2)) % 4],
            backfaceVisibility: 'hidden',
          }}
        />,
      );
    }
  }
  return (
    <div className="sc-gem" style={{ width: 0, height: 0, transformStyle: 'preserve-3d' }}>
      {faces}
    </div>
  );
}

/** A crystal in its own perspective box, drifting with the pointer (Depth) and floating (GSAP, see Scenery). */
function GemSpot({ className, depth, size, tone = 'ice' }: { className: string; depth: number; size: number; tone?: 'ice' | 'amethyst' }) {
  return (
    <Depth depth={depth} className={`absolute short:hidden ${className}`}>
      <div className="sc-float" style={{ perspective: 700 }}>
        <Gem size={size} tone={tone} />
      </div>
    </Depth>
  );
}

export function Scenery() {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (reducedMotion()) return;
    const ctx = gsap.context(() => {
      // stars: three groups twinkling out of step
      gsap.utils.toArray<SVGSVGElement>('.sc-star-group').forEach((g, i) => {
        gsap.fromTo(g, { opacity: 0.2 }, { opacity: 1, duration: 1.3 + i * 0.8, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.5 });
      });
      // crystals: a slow spin, tipped a little towards us, and a float
      gsap.utils.toArray<HTMLElement>('.sc-gem').forEach((el, i) => {
        gsap.set(el, { rotationX: -16 });
        gsap.to(el, { rotationY: i % 2 ? -360 : 360, duration: 18 + i * 5, ease: 'none', repeat: -1 });
      });
      gsap.utils.toArray<HTMLElement>('.sc-float').forEach((el, i) => {
        gsap.to(el, { y: i % 2 ? -18 : 18, duration: 3.6 + i * 0.7, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      });
      // the mist between the ridges breathes
      gsap.to('.sc-mist', { opacity: 0.45, duration: 6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      // northern lights: each curtain sways, stretches and brightens on its own slow rhythm
      gsap.utils.toArray<HTMLElement>('.aurora').forEach((el, i) => {
        const tl = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: 'sine.inOut' } });
        tl.fromTo(
          el,
          { xPercent: -6, skewX: -6, scaleY: 0.85, opacity: 0.35 },
          { xPercent: 8, skewX: 7, scaleY: 1.15, opacity: 1, duration: 9 + i * 3.5 },
        );
        tl.progress((i * 0.37) % 1);
      });
      // a shooting star now and then, from a new spot each time
      gsap.fromTo(
        '.sc-meteor',
        { x: () => gsap.utils.random(-200, 300), y: () => gsap.utils.random(-40, 120), opacity: 0 },
        {
          keyframes: [
            { opacity: 1, duration: 0.15 },
            { x: '-=460', y: '+=210', duration: 0.85, ease: 'power1.in' },
            { opacity: 0, duration: 0.2 },
          ],
          repeat: -1,
          repeatDelay: 6,
          repeatRefresh: true,
          delay: 3,
        },
      );
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} aria-hidden className="absolute inset-0">
      {/* northern lights, behind the stars */}
      <div className="absolute inset-x-0 top-0 h-[60%] overflow-hidden">
        <div className="aurora aurora-1" />
        <div className="aurora aurora-2" />
        <div className="aurora aurora-3" />
      </div>
      {/* stars (hidden on the light page) */}
      {/* one svg per twinkle group, so fading a group is a cheap opacity change on its own layer */}
      <Depth depth={-5} className="bd-stars absolute inset-x-0 top-0 h-[62%]">
        {[0, 1, 2].map((g) => (
          <svg key={g} className="bd-star sc-star-group absolute inset-0 h-full w-full will-change-[opacity]" viewBox={`0 0 ${W} 330`} preserveAspectRatio="xMidYMin slice">
            <g fill="currentColor">
              {STARS.filter((s) => s.g === g).map((s, i) => (
                <circle key={i} cx={s.x} cy={s.y} r={s.r} />
              ))}
            </g>
          </svg>
        ))}
      </Depth>
      {/* a shooting star (dark page only) */}
      <div className="bd-stars absolute right-[12%] top-[10%]">
        <div className="sc-meteor" />
      </div>

      {/* ridges, far to near: the near ones move the most */}
      <Depth depth={-8} className="absolute inset-x-0 bottom-0 h-[56vh]">
        <svg className="bd-land-far h-full w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice">
          <path d={FAR} fill="currentColor" />
        </svg>
      </Depth>
      <div className="sc-mist absolute inset-x-0 bottom-0 h-[34vh] bg-gradient-to-t from-ink/80 via-ink/20 to-transparent will-change-[opacity]" />
      <Depth depth={-16} className="absolute inset-x-0 bottom-0 h-[44vh]">
        <svg className="bd-land-mid h-full w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice">
          <path d={MID} fill="currentColor" />
        </svg>
      </Depth>
      <Depth depth={-28} className="absolute inset-x-[-2%] bottom-0 h-[34vh]">
        <svg className="bd-land-near h-full w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice">
          <path d={NEAR} fill="currentColor" />
        </svg>
      </Depth>

      {/* crystals */}
      <GemSpot className="left-[3%] top-[26%] hidden md:block" depth={22} size={30} />
      <GemSpot className="right-[2.5%] top-[17%] hidden md:block" depth={-18} size={44} tone="amethyst" />
      <GemSpot className="left-[1.2%] top-[66%] hidden lg:block" depth={-26} size={22} tone="amethyst" />
      <GemSpot className="right-[1.5%] top-[62%] hidden lg:block" depth={30} size={26} />

      {/* gently falling snow, in front of the mountains */}
      <Snow className="absolute inset-0 h-full w-full" />
    </div>
  );
}
