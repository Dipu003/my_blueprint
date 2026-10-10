'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { DEFAULT_SLOT, LOADOUT } from '@/data/portfolio';
import { play } from '@/lib/sound';
import { Panel } from '@/components/ui/Panel';
import { Heading } from '@/components/ui/Heading';
import { Icon, type IconName } from '@/components/ui/Icon';
import { item, stagger } from './motion';

const SLOT_ICON: Record<string, IconName> = {
  Languages: 'code',
  Backend: 'server',
  'Agentic AI': 'chip',
  Cloud: 'cloud',
  DevOps: 'gear',
  Databases: 'database',
  'Messaging & Security': 'loadout',
  Frontend: 'window',
  Other: 'star',
};

export function Loadout() {
  const [sel, setSel] = useState(DEFAULT_SLOT);
  const cur = LOADOUT[sel];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <Heading kicker="Gunsmith" title="Loadout" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <motion.div variants={item}>
          <ul role="tablist" aria-label="Loadout slots" className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-1">
            {LOADOUT.map((g, i) => {
              const active = i === sel;
              return (
                <li key={g.slot} role="presentation">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setSel(i);
                      play('click');
                    }}
                    className={`para tile flex min-h-[3.75rem] w-full items-center gap-2 py-2 pl-4 pr-6 text-left sm:gap-3 sm:pl-6 sm:pr-8 ${
                      active ? 'bg-flame/20' : 'bg-white/[0.05]'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="slot-bar"
                        transition={{ type: 'spring', stiffness: 700, damping: 40 }}
                        className="absolute inset-y-0 left-0 w-1.5 bg-flame"
                      />
                    )}
                    <Icon name={SLOT_ICON[g.name] ?? 'star'} className="h-5 w-5 shrink-0 text-gold max-sm:hidden" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.625rem] font-semibold uppercase tracking-[0.25em] text-gold">{g.slot}</span>
                      <span className={`block hyphens-auto pr-1 font-display text-[0.8125rem] uppercase leading-tight sm:text-base ${active ? 'text-white' : ''}`}>
                        {g.name}
                      </span>
                    </span>
                    <span className="w-6 shrink-0 text-right font-display text-lg text-zinc-500">{g.items.length}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </motion.div>

        <motion.div variants={item}>
          <Panel title={cur.slot} tag={`${cur.items.length} attachments`} className="min-h-[22rem]">
            <motion.div
              key={cur.name}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              <Icon name={SLOT_ICON[cur.name] ?? 'star'} className="pointer-events-none absolute right-0 top-0 h-28 w-28 text-gold/[0.12] sm:h-32 sm:w-32" />
              <h2 className="relative font-display text-5xl uppercase leading-none text-white sm:text-6xl">
                {cur.name}
              </h2>
              <ul className="relative mt-5 grid auto-rows-[3.5rem] grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                {cur.items.map((it, i) => (
                  <li key={it} className="para tile flex h-full items-center gap-3 bg-white/[0.05] pl-6 pr-8">
                    <span className="tile-num w-6 shrink-0 font-display text-sm tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                    <span className="line-clamp-2 min-w-0 text-[0.8125rem] font-semibold uppercase leading-tight tracking-wide">{it}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </Panel>
        </motion.div>
      </div>
    </motion.div>
  );
}
