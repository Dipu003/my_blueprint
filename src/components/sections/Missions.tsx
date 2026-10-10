'use client';

import { motion } from 'framer-motion';
import { MISSION, NEXT_MISSION, OBJECTIVES } from '@/data/portfolio';
import { Panel } from '@/components/ui/Panel';
import { Meter } from '@/components/ui/Meter';
import { Heading } from '@/components/ui/Heading';
import { Icon, type IconName } from '@/components/ui/Icon';
import { item, stagger } from './motion';

const OBJ_ICON: Record<string, IconName> = {
  ai: 'chip',
  backend: 'server',
  security: 'loadout',
  cloud: 'cloud',
  devops: 'gear',
};

export function Missions() {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <Heading kicker="Mission select" title="Missions" />

      <motion.div variants={item}>
        <section className="panel p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.3em] text-gold">
                {MISSION.code} · Main mission
                <span className="para flex items-center gap-1 bg-ok/15 px-4 py-0.5 text-ok">
                  <Icon name="check" className="h-3.5 w-3.5" /> Complete
                </span>
              </div>
              <h2 className="mt-1 font-display text-4xl uppercase leading-none text-white sm:text-5xl">
                {MISSION.title}
              </h2>
              <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">Role: {MISSION.role}</p>
            </div>
            <div className="w-full sm:w-64">
              <Meter label="Objectives" value={100} right={`${OBJECTIVES.length}/${OBJECTIVES.length}`} />
              <div className="mt-3 flex flex-wrap gap-2">
                {MISSION.rewards.map((r) => (
                  <span key={r} className="para bg-gradient-to-r from-flame-hot to-flame px-4 py-1 text-xs font-bold uppercase tracking-wider text-on-gold">
                    Reward · {r}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Equal-width cells so every chip lines up, however long its label. */}
          <ul aria-label="Tech stack" className="mt-5 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-7">
            {MISSION.stack.map((t) => (
              <li
                key={t}
                className="para tile flex h-9 items-center justify-center bg-white/[0.07] px-4 text-center text-[0.6875rem] font-semibold uppercase leading-tight tracking-wider text-zinc-300"
              >
                {t}
              </li>
            ))}
          </ul>
        </section>
      </motion.div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {OBJECTIVES.map((o, i) => (
          <motion.div key={o.id} variants={item} className="flex">
            <Panel
              title={o.title}
              tag={
                <span className="flex items-center gap-1 text-ok">
                  <Icon name="check" className="h-3.5 w-3.5" /> Obj {i + 1}
                </span>
              }
              className="flex w-full flex-col"
            >
              <div className="flex flex-1 flex-col">
                <Icon name={OBJ_ICON[o.id] ?? 'star'} className="pointer-events-none absolute right-4 top-14 h-16 w-16 text-gold/[0.12]" />
                <ul className="relative space-y-2">
                  {o.points.map((p) => (
                    <li key={p} className="flex gap-2.5 text-sm leading-relaxed text-zinc-300">
                      <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rotate-45 bg-flame" />
                      {p}
                    </li>
                  ))}
                </ul>
                <ul className="mt-auto grid grid-cols-2 gap-1.5 pt-4">
                  {o.tools.map((t) => (
                    <li
                      key={t}
                      className="para tile flex h-8 items-center justify-center bg-flame/10 px-3 text-center text-[0.6875rem] font-semibold uppercase tracking-wider text-gold"
                    >
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>
          </motion.div>
        ))}

        <motion.div variants={item} className="flex">
          <section className="panel flex w-full flex-col opacity-80" aria-label={`${NEXT_MISSION.code}, locked`}>
            <div className="hazard h-2 w-full" aria-hidden />
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
              <Icon name="lock" className="h-10 w-10 text-zinc-500" />
              <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.3em] text-gold">{NEXT_MISSION.code} · Locked</div>
              <div className="font-display text-3xl uppercase text-white">{NEXT_MISSION.title}</div>
              <p className="text-sm text-zinc-400">{NEXT_MISSION.hint}</p>
            </div>
          </section>
        </motion.div>
      </div>
    </motion.div>
  );
}
