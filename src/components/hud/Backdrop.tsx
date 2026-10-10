import { PLAYER } from '@/data/portfolio';
import { Depth } from '@/components/hud/Depth';
import { Scenery } from '@/components/hud/Scenery';
import { Spotlight } from '@/components/hud/Spotlight';

// Deterministic values so server and client render identically (no Math.random).
const EMBERS = Array.from({ length: 18 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  size: 2 + (i % 3),
  duration: 9 + ((i * 7) % 8),
  delay: -((i * 5) % 12),
  dx: ((i % 5) - 2) * 26,
}));

/**
 * One closed, hand-drawn-looking contour loop around (cx, cy). Rounded to 1 decimal so the server
 * and the browser print identical numbers (they can differ in the last digits of Math.sin/cos).
 */
function loop(cx: number, cy: number, r: number, seed: number): string {
  const n = 72;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const wob = 1 + 0.15 * Math.sin(3 * a + seed) + 0.09 * Math.sin(5 * a + seed * 1.7) + 0.05 * Math.sin(8 * a + seed * 2.3);
    const rr = r * wob;
    const x = Math.round((cx + rr * Math.cos(a)) * 10) / 10;
    const y = Math.round((cy + rr * Math.sin(a) * 0.8) * 10) / 10;
    pts.push(`${x} ${y}`);
  }
  return `M${pts.join('L')}Z`;
}

/** Topographic map: two "hills" of nested contour loops, every 4th line drawn heavier. */
const CONTOURS = [
  ...Array.from({ length: 10 }, (_, k) => ({ d: loop(960, 200, 36 + k * 42, 0.6 + k * 0.28), major: k % 4 === 0 })),
  ...Array.from({ length: 8 }, (_, k) => ({ d: loop(140, 640, 30 + k * 40, 2.1 + k * 0.33), major: k % 4 === 0 })),
];

/**
 * Fixed background. Dark: a night landscape (stars, mountains, pines, ice crystals: see Scenery), blue glow,
 * hex field, slanted light streaks, a pointer-following spotlight, rising embers and the full name set
 * diagonally. Light: the same layers re-coloured (cool blue glows, a faint blueprint grid), plus a
 * topographic contour map (see globals.css).
 */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-ink">
      <div className="stripes absolute inset-0" />

      {/* far layers (hex field, contours) drift against the pointer, near ones (streaks, name) with it */}
      <Depth depth={-7} className="absolute -inset-8">
      <svg
        className="bd-hex absolute inset-0 h-full w-full"
        style={{
          WebkitMaskImage: 'radial-gradient(ellipse at 70% 40%, #000 0%, transparent 75%)',
          maskImage: 'radial-gradient(ellipse at 70% 40%, #000 0%, transparent 75%)',
        }}
      >
        <defs>
          <pattern id="hex-field" width="56" height="100" patternUnits="userSpaceOnUse">
            <path d="M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100" fill="none" stroke="currentColor" />
            <path d="M28 0L28 34L0 50L0 84L28 100L56 84L56 50L28 34" fill="none" stroke="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hex-field)" />
      </svg>
      </Depth>

      <Depth depth={-11} className="absolute -inset-8">
      <svg className="bd-contour absolute inset-0 h-full w-full" viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid slice" fill="none">
        {CONTOURS.map((c, i) => (
          <path key={i} d={c.d} stroke="currentColor" strokeWidth={c.major ? 1.8 : 1} strokeLinejoin="round" />
        ))}
      </svg>
      </Depth>

      <div className="bd-glow absolute inset-0" />
      <Scenery />
      <div className="absolute -right-[10%] top-0 h-full w-[38%] -skew-x-[18deg] bg-gradient-to-l from-flame/[0.10] via-flame/[0.03] to-transparent" />
      <div className="bd-streak absolute right-[24%] top-0 h-full w-[5%] -skew-x-[18deg] bg-white/[0.025]" />
      <div className="bd-streak absolute -left-[6%] bottom-0 h-[45%] w-[40%] -skew-x-[18deg] bg-gradient-to-r from-white/[0.04] to-transparent" />

      {/* Full name, diagonal, fully inside the viewport at every width. */}
      <Depth depth={20} className="absolute inset-0">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[18deg] opacity-50 sm:opacity-100">
        <div
          className="watermark select-none whitespace-nowrap pr-4 font-display uppercase leading-none"
          style={{ fontSize: 'min(5.6vw, 5.2rem)' }}
        >
          {PLAYER.name}
        </div>
      </div>
      </Depth>

      <Spotlight />

      {EMBERS.map((e, i) => (
        <span
          key={i}
          className="ember"
          style={
            {
              left: e.left,
              width: e.size,
              height: e.size,
              animationDuration: `${e.duration}s`,
              animationDelay: `${e.delay}s`,
              '--dx': `${e.dx}px`,
            } as React.CSSProperties
          }
        />
      ))}

      <div className="bd-vignette absolute inset-0" />
    </div>
  );
}
