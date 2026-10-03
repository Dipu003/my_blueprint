import { PLAYER } from '@/data/portfolio';

// Deterministic values so server and client render identically (no Math.random).
const EMBERS = Array.from({ length: 18 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  size: 2 + (i % 3),
  duration: 9 + ((i * 7) % 8),
  delay: -((i * 5) % 12),
  dx: ((i % 5) - 2) * 26,
}));

/**
 * Fixed lobby background: amber glow, SVG hex field, slanted light streaks, a pointer-following
 * spotlight (--mx/--my are set by the Companion), rising embers and the full name set diagonally.
 */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-ink">
      <div className="stripes absolute inset-0" />

      <svg
        className="absolute inset-0 h-full w-full"
        style={{
          WebkitMaskImage: 'radial-gradient(ellipse at 70% 40%, #000 0%, transparent 75%)',
          maskImage: 'radial-gradient(ellipse at 70% 40%, #000 0%, transparent 75%)',
        }}
      >
        <defs>
          <pattern id="hex-field" width="56" height="100" patternUnits="userSpaceOnUse">
            <path d="M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100" fill="none" stroke="rgba(255,190,60,0.10)" />
            <path d="M28 0L28 34L0 50L0 84L28 100L56 84L56 50L28 34" fill="none" stroke="rgba(255,190,60,0.10)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hex-field)" />
      </svg>

      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(55% 70% at 80% 38%, rgba(255,122,0,0.20), transparent 70%), radial-gradient(40% 50% at 8% 100%, rgba(255,180,0,0.07), transparent 70%)',
        }}
      />
      <div className="absolute -right-[10%] top-0 h-full w-[38%] -skew-x-[18deg] bg-gradient-to-l from-gold/[0.10] via-gold/[0.03] to-transparent" />
      <div className="absolute right-[24%] top-0 h-full w-[5%] -skew-x-[18deg] bg-white/[0.025]" />
      <div className="absolute -left-[6%] bottom-0 h-[45%] w-[40%] -skew-x-[18deg] bg-gradient-to-r from-white/[0.04] to-transparent" />

      {/* Full name, diagonal, fully inside the viewport at every width. */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[18deg] opacity-50 sm:opacity-100">
        <div
          className="watermark select-none whitespace-nowrap pr-4 font-display font-extrabold italic uppercase leading-none"
          style={{ fontSize: 'min(11vw, 10.5rem)' }}
        >
          {PLAYER.name}
        </div>
      </div>

      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(360px circle at var(--mx, 72%) var(--my, 32%), rgba(255,170,0,0.13), transparent 65%)',
        }}
      />

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

      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.6) 100%)' }} />
    </div>
  );
}
