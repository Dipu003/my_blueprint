import type { ReactNode } from 'react';

/** Screen title with a slanted gold bar and a run of fading slashes, like a CoD menu header. */
export function Heading({ kicker, title, aside }: { kicker: string; title: string; aside?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-stretch gap-3">
        <span aria-hidden className="w-1.5 -skew-x-12 bg-gradient-to-b from-gold to-gold-hot" />
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold">{kicker}</div>
          <h1 className="font-display text-4xl font-extrabold italic uppercase leading-none tracking-wide text-white sm:text-5xl">
            {title}
          </h1>
        </div>
      </div>
      {aside ?? (
        <svg aria-hidden viewBox="0 0 132 22" className="hidden h-5 w-32 sm:block">
          {Array.from({ length: 7 }, (_, i) => (
            <path key={i} d={`M${i * 19 + 8} 20 l7 -18`} stroke="#ffb400" strokeOpacity={0.12 + i * 0.14} strokeWidth="5" />
          ))}
        </svg>
      )}
    </div>
  );
}
