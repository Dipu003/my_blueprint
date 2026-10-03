'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CAREER, CERTIFICATIONS, EDUCATION, type Role } from '@/data/portfolio';
import { play } from '@/lib/sound';
import { Heading } from '@/components/ui/Heading';
import { Icon } from '@/components/ui/Icon';
import { Panel } from '@/components/ui/Panel';
import { Rank } from '@/components/ui/Rank';
import { item, stagger } from './motion';

function Header({ r, expandable, open }: { r: Role; expandable: boolean; open: boolean }) {
  return (
    <>
      <div className="cut grid h-14 w-14 shrink-0 place-items-center bg-flame/15 text-gold">
        <Rank count={r.stripes} className="h-9 w-9" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span
            className={`para px-4 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
              r.tag === 'Current' ? 'bg-ok text-on-ok' : 'bg-gradient-to-r from-flame-hot to-flame text-on-gold'
            }`}
          >
            {r.tag}
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            {r.period}
            {r.length ? ` · ${r.length}` : ''}
          </span>
        </div>
        <h2 className="mt-1 font-display text-2xl font-bold italic uppercase leading-tight text-white sm:text-3xl">{r.role}</h2>
        <p className="text-sm text-zinc-400">{[r.company, r.location].filter(Boolean).join(' · ')}</p>
      </div>
      {expandable && (
        <Icon name="chevron" className={`h-6 w-6 shrink-0 text-gold transition-transform ${open ? 'rotate-180' : ''}`} />
      )}
    </>
  );
}

function Entry({ r, open, onToggle }: { r: Role; open: boolean; onToggle: () => void }) {
  const panelId = `career-${r.id}`;
  const expandable = r.points.length > 0;

  return (
    <div className="relative">
      {/* Node on the timeline rail */}
      <span
        aria-hidden
        className={`absolute -left-6 top-[34px] h-3 w-3 rotate-45 border-2 border-gold transition-colors ${open ? 'bg-flame' : 'bg-ink'}`}
      />
      <div className="panel" data-active={open}>
        {expandable ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => {
              onToggle();
              play('click');
            }}
            className="flex w-full items-center gap-4 p-4 text-left"
          >
            <Header r={r} expandable open={open} />
          </button>
        ) : (
          <div className="flex w-full items-center gap-4 p-4">
            <Header r={r} expandable={false} open={false} />
          </div>
        )}

        {expandable && (
          <motion.div
            id={panelId}
            initial={false}
            animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
            aria-hidden={!open}
          >
            <ul className="space-y-2.5 border-t border-white/10 px-4 pb-5 pt-4">
              {r.points.map((p) => (
                <li key={p} className="flex gap-3 text-sm leading-relaxed text-zinc-300">
                  <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rotate-45 bg-flame" />
                  {p}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export function Career() {
  const [open, setOpen] = useState<string | null>('sde2');

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <Heading kicker="Match history" title="Career" />

      <div className="space-y-6">
        {CAREER.map((g, gi) => (
          <motion.section key={g.label ?? gi} variants={item} aria-label={g.label ?? 'Current'}>
            {g.label && (
              <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                <Icon name="briefcase" className="h-4 w-4 text-gold" /> {g.label}
              </h2>
            )}
            <div className="relative space-y-3 pl-7">
              <span aria-hidden className="absolute bottom-3 left-[9px] top-3 w-px bg-gradient-to-b from-gold/70 via-gold/25 to-transparent" />
              {g.roles.map((r) => (
                <Entry key={r.id} r={r} open={open === r.id} onToggle={() => setOpen(open === r.id ? null : r.id)} />
              ))}
            </div>
          </motion.section>
        ))}

        <motion.div variants={item}>
          <Panel title="Boot camp" tag="Education">
            <ul className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {EDUCATION.map((e) => (
                <li key={e.title} className="cut tile flex min-h-[8.5rem] flex-col gap-1 bg-white/[0.05] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Icon name="graduation" className="h-6 w-6 shrink-0 text-gold" />
                    {e.score && (
                      <span className="para bg-gradient-to-r from-flame-hot to-flame px-4 py-0.5 text-[11px] font-bold uppercase tracking-wider text-on-gold">
                        {e.score}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1 font-display text-xl font-bold italic uppercase leading-tight">{e.title}</h3>
                  <p className="text-sm text-zinc-400">{e.school}</p>
                  <p className="mt-auto text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">{e.period}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </motion.div>

        <motion.div variants={item}>
          <Panel title="Medals" tag="Certifications">
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {CERTIFICATIONS.map((c) => (
                <li key={c} className="cut tile flex min-h-[7.5rem] flex-col justify-between gap-3 bg-white/[0.05] p-3">
                  <Icon name="medal" className="h-8 w-8 text-gold" />
                  <span className="font-display text-lg font-bold italic uppercase leading-tight">{c}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </motion.div>
      </div>
    </motion.div>
  );
}
