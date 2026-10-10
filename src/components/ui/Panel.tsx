'use client';

import type { ReactNode } from 'react';

interface Props {
  title?: string;
  tag?: ReactNode;
  children: ReactNode;
  className?: string;
  active?: boolean;
}

/** Cut-corner glass panel with an accent notch. Lights up on hover. */
export function Panel({ title, tag, children, className = '', active }: Props) {
  return (
    <section className={`panel flex flex-col ${className}`} data-active={active}>
      {(title || tag) && (
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 pb-2 pt-3.5">
          <h2 className="flex items-center gap-2 font-display text-lg uppercase tracking-wide text-white">
            <span aria-hidden className="h-3.5 w-1 -skew-x-12 bg-flame" />
            {title}
          </h2>
          {tag && <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-zinc-400">{tag}</div>}
        </header>
      )}
      <div className="flex flex-1 flex-col p-4">{children}</div>
    </section>
  );
}
