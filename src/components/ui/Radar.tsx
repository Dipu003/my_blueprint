// Decorative radar: rings, degree ticks, a rotating sweep and pulsing blips. No interaction.
const TICKS = Array.from({ length: 48 }, (_, i) => {
  const a = (i / 48) * Math.PI * 2;
  const major = i % 4 === 0;
  const r1 = 97;
  const r2 = major ? 90 : 93.5;
  // Rounded so server and client render identical attribute strings.
  const p = (v: number) => Math.round(v * 100) / 100;
  return {
    key: i,
    x1: p(100 + r1 * Math.sin(a)),
    y1: p(100 - r1 * Math.cos(a)),
    x2: p(100 + r2 * Math.sin(a)),
    y2: p(100 - r2 * Math.cos(a)),
    major,
  };
});

const BLIPS = [
  { x: 134, y: 64, d: '0s' },
  { x: 62, y: 122, d: '0.8s' },
  { x: 120, y: 148, d: '1.6s' },
  { x: 76, y: 56, d: '2.1s' },
];

/** `className` must position the radar (`absolute` or `relative`) and size it. */
export function Radar({ className = '' }: { className?: string }) {
  return (
    // text-gold: the radar is drawn in the theme's accent colour (lilac on dark, deep purple on light).
    <div aria-hidden className={`text-gold ${className}`}>
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full">
        <g fill="none" stroke="currentColor">
          <circle cx="100" cy="100" r="86" strokeOpacity="0.3" />
          <circle cx="100" cy="100" r="58" strokeOpacity="0.22" />
          <circle cx="100" cy="100" r="30" strokeOpacity="0.16" />
          <circle cx="100" cy="100" r="86" strokeOpacity="0.5" strokeDasharray="2 10" strokeWidth="2" />
        </g>
        <g stroke="currentColor">
          {TICKS.map((t) => (
            <line key={t.key} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} strokeOpacity={t.major ? 0.7 : 0.35} />
          ))}
        </g>
        {BLIPS.map((b) => (
          <g key={b.d}>
            <circle cx={b.x} cy={b.y} r="7" fill="currentColor" opacity="0.16" className="radar-blip" style={{ animationDelay: b.d }} />
            <circle cx={b.x} cy={b.y} r="2.4" className="radar-blip" style={{ animationDelay: b.d, fill: 'rgb(var(--blip))' }} />
          </g>
        ))}
        <circle cx="100" cy="100" r="3" fill="currentColor" />
      </svg>
      <div className="radar-sweep absolute inset-[7%] rounded-full" />
    </div>
  );
}
