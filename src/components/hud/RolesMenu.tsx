'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { OPEN_TO, PLAYER } from '@/data/portfolio';
import { useGame } from '@/providers/GameProvider';
import { play } from '@/lib/sound';
import { Icon } from '@/components/ui/Icon';
import { GameButton } from '@/components/ui/GameButton';
import { roleIcon } from '@/components/ui/roleIcon';

/** "Open to roles" status chip. Click it to see which roles are on the table. */
export function RolesMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { go } = useGame();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Open to roles"
        onClick={() => {
          setOpen((o) => !o);
          play('click');
        }}
        onMouseEnter={() => play('hover')}
        className={`para tile flex h-9 items-center gap-2 px-5 text-[11px] font-semibold uppercase tracking-[0.2em] sm:px-6 ${
          open ? 'bg-gold/20 text-gold' : 'bg-white/[0.06] text-zinc-200'
        }`}
      >
        <span className="h-2 w-2 animate-dot rounded-full bg-ok shadow-[0_0_8px_#5fd16a]" />
        <span className="hidden sm:inline">Open to roles</span>
        <Icon name="chevron" className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Roles I am open to"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className="panel absolute right-0 top-full z-40 mt-2 w-[min(21rem,calc(100vw-2rem))] origin-top-right p-4"
          >
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">
              <span className="h-2 w-2 animate-dot rounded-full bg-ok shadow-[0_0_8px_#5fd16a]" />
              Open to roles
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              Currently {PLAYER.status.toLowerCase()} in {PLAYER.location.split(',')[0]}. Happy to talk about:
            </p>
            <ul className="mt-3 space-y-1.5">
              {OPEN_TO.map((o) => (
                <li key={o.role} className="cut tile flex h-14 items-center gap-3 bg-white/[0.05] px-3">
                  <Icon name={roleIcon(o.role)} className="h-5 w-5 shrink-0 text-gold" />
                  <div className="min-w-0">
                    <div className="truncate font-display text-lg font-bold italic uppercase leading-tight">{o.role}</div>
                    <div className="truncate text-xs text-zinc-400">{o.focus}</div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <GameButton
                icon="mail"
                label="Say hello"
                sub="Open contact"
                onClick={() => {
                  setOpen(false);
                  go('squad');
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
