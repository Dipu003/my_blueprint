'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MISSION, OBJECTIVES } from '@/data/portfolio';
import { LLD_CHAPTERS, NEXUS, NEXUS_VIEWS, type LldChapter, type NexusView } from '@/data/nexus';
import { hashTail, setHashTail } from '@/lib/nav-history';
import { play } from '@/lib/sound';
import { Panel } from '@/components/ui/Panel';
import { Meter } from '@/components/ui/Meter';
import { Heading } from '@/components/ui/Heading';
import { Icon, type IconName } from '@/components/ui/Icon';
import { NexusMission } from '@/components/missions/NexusMission';
import { item, stagger } from './motion';

const OBJ_ICON: Record<string, IconName> = {
  ai: 'chip',
  backend: 'server',
  security: 'loadout',
  cloud: 'cloud',
  devops: 'gear',
};

type MissionId = 'healthcare' | 'nexus';

/** The cards of the mission select, in mission order. Nexus is the newest, so the tab opens on it. */
const SELECT: { id: MissionId; code: string; title: string; kind: string; status: string; live?: boolean; isNew?: boolean }[] = [
  { id: 'healthcare', code: MISSION.code, title: MISSION.title, kind: 'Work · Squbix Digital', status: 'Complete' },
  { id: 'nexus', code: NEXUS.code, title: `${NEXUS.name} · Expense splitting`, kind: 'Own build · Full-stack', status: 'Live', live: true, isNew: true },
];

const isView = (v: string | undefined): v is NexusView => NEXUS_VIEWS.some((x) => x.id === v);
const isChapter = (v: string | undefined): v is LldChapter => LLD_CHAPTERS.some((x) => x.id === v);

function HealthcareMission() {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
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
      </div>
    </motion.div>
  );
}

/**
 * The projects tab. A mission select on top (the healthcare platform from work, and Nexus, my own
 * full-stack build), the chosen mission below. Where you are inside it shows in the address
 * (#missions/nexus/lld/data), so a link can open straight on the HLD or one LLD chapter.
 */
export function Missions() {
  const [mission, setMission] = useState<MissionId>('nexus');
  const [view, setView] = useState<NexusView>('overview');
  const [chapter, setChapter] = useState<LldChapter>('write');

  // A shared link or Back to this tab: open on the view the address names.
  useEffect(() => {
    const [m, v, c] = hashTail();
    if (m === 'healthcare') setMission('healthcare');
    if (m === 'nexus') {
      if (isView(v)) setView(v);
      if (isChapter(c)) setChapter(c);
    }
  }, []);

  const show = (m: MissionId, v = view, c = chapter) => {
    setMission(m);
    setView(v);
    setChapter(c);
    setHashTail('missions', m === 'healthcare' ? ['healthcare'] : v === 'lld' ? ['nexus', v, c] : ['nexus', v]);
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <Heading kicker="Projects · mission select" title="Missions" />

      <motion.div variants={item} role="tablist" aria-label="Missions" className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SELECT.map((s) => {
          const active = s.id === mission;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                if (active) return;
                play('click');
                show(s.id);
              }}
              className={`para tile flex min-h-[4.5rem] items-center gap-3 py-3 pl-6 pr-8 text-left sm:gap-4 sm:pl-7 sm:pr-10 ${active ? 'bg-flame/25' : 'bg-white/[0.05]'}`}
            >
              {active && (
                <motion.span
                  layoutId="mission-bar"
                  transition={{ type: 'spring', stiffness: 700, damping: 40 }}
                  className="absolute inset-y-0 left-0 w-1.5 bg-flame"
                />
              )}
              <span className={`cut grid h-11 w-11 shrink-0 place-items-center ${active ? 'bg-gradient-to-br from-flame to-flame-hot text-on-gold' : 'bg-white/10 text-gold'}`}>
                <Icon name={s.id === 'nexus' ? 'split' : 'missions'} className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                {/* phones: the code and the status share the small line, so the title gets the full width */}
                <span className="flex flex-wrap items-center gap-x-2 text-[0.625rem] font-semibold uppercase tracking-[0.25em] text-gold">
                  {s.code}
                  <span className="hidden sm:inline">· {s.kind}</span>
                  <span className={`sm:hidden ${s.live ? 'text-ok' : 'text-zinc-400'}`}>· {s.status}</span>
                </span>
                <span className={`mt-0.5 block font-display text-base uppercase leading-tight sm:text-xl ${active ? 'text-white' : ''}`}>{s.title}</span>
              </span>
              <span
                className={`hidden shrink-0 items-center gap-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.2em] sm:flex ${s.live ? 'text-ok' : 'text-zinc-400'}`}
              >
                {s.live ? <span className="live-dot" /> : <Icon name="check" className="h-3.5 w-3.5 text-ok" />}
                {s.status}
              </span>
              {s.isNew && (
                <span className="absolute right-6 top-1.5 bg-danger px-1.5 text-[0.5625rem] font-bold uppercase tracking-wider text-on-gold">
                  New
                </span>
              )}
            </button>
          );
        })}
      </motion.div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mission}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.2 }}
        >
          {mission === 'nexus' ? (
            <NexusMission
              view={view}
              onView={(v) => show('nexus', v)}
              chapter={chapter}
              onChapter={(c) => show('nexus', 'lld', c)}
            />
          ) : (
            <HealthcareMission />
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
