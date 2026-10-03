'use client';

import { motion } from 'framer-motion';
import { SECTIONS } from '@/data/portfolio';
import { useGame } from '@/providers/GameProvider';
import { Icon } from '@/components/ui/Icon';

/** Red "new" dot on tabs you have not opened yet, like unread badges in CoD menus. */
function NewDot({ className = '' }: { className?: string }) {
  return <span aria-label="new" className={`absolute h-2 w-2 animate-dot rounded-full bg-danger shadow-[0_0_6px_#ff4a3d] ${className}`} />;
}

/**
 * Slanted tab strip under the top bar on desktop, icon bar at the bottom on phones.
 * Desktop tabs have their own hover treatment (scanning underline, glint, spinning icon), and the
 * robot companion hops over to stand beside the hovered tab, like it does for any other button.
 */
export function NavTabs() {
  const { section, go, visited } = useGame();

  return (
    <>
      <nav aria-label="Sections" className="relative z-20 hidden shrink-0 pt-4 md:block">
        <div className="mx-auto flex max-w-7xl items-end gap-1 px-8">
          {SECTIONS.map((s, i) => {
            const active = s.id === section;
            const seen = visited.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                data-nav-tab
                aria-current={active ? 'page' : undefined}
                onClick={() => go(s.id)}
                className={`para tab relative flex items-center gap-2.5 px-8 py-2.5 ${
                  active ? 'text-on-gold' : 'bg-white/[0.05] text-zinc-300'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="tab-pill"
                    transition={{ type: 'spring', stiffness: 700, damping: 40 }}
                    className="absolute inset-0 bg-gradient-to-b from-flame to-flame-hot"
                  />
                )}
                <Icon name={s.id} className="tab-icon relative h-5 w-5" />
                <span className="tab-label relative font-display text-lg font-bold italic uppercase leading-none tracking-wider">
                  {s.label}
                </span>
                <kbd className={`relative font-ui text-[10px] font-bold ${active ? 'text-on-gold/60' : 'text-zinc-500'}`}>{i + 1}</kbd>
                {!seen && <NewDot className="right-4 top-1.5" />}
              </button>
            );
          })}
        </div>
        <div className="h-0.5 bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
      </nav>

      <nav
        aria-label="Sections"
        className="relative z-20 grid shrink-0 grid-cols-5 border-t border-gold/40 bg-ink-2/95 backdrop-blur md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {SECTIONS.map((s) => {
          const active = s.id === section;
          const seen = visited.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => go(s.id)}
              className={`relative flex flex-col items-center gap-0.5 py-2 transition-colors ${
                active ? 'bg-flame/10 text-gold' : 'text-zinc-400'
              }`}
            >
              {active && <span className="absolute inset-x-3 top-0 h-0.5 bg-flame shadow-[0_0_8px_rgb(var(--glow-b))]" />}
              <Icon name={s.id} className="h-5 w-5" />
              <span className="font-display text-xs font-bold italic uppercase tracking-wide">{s.label}</span>
              {!seen && <NewDot className="right-[28%] top-1.5" />}
            </button>
          );
        })}
      </nav>
    </>
  );
}
