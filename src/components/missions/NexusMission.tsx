'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import {
  HLD_DECISIONS,
  NEXUS,
  NEXUS_FEATURES,
  NEXUS_HIGHLIGHTS,
  NEXUS_STACK,
  NEXUS_VIEWS,
  type LldChapter,
  type NexusView,
} from '@/data/nexus';
import { useTheme } from '@/providers/ThemeProvider';
import { reducedMotion } from '@/lib/gsap';
import { play } from '@/lib/sound';
import { GameButton } from '@/components/ui/GameButton';
import { Icon } from '@/components/ui/Icon';
import { item, stagger } from '@/components/sections/motion';
import { HldMap } from './HldMap';
import { Lld } from './Lld';
import { Pipeline } from './Pipeline';

const VIEW_HINT: Record<NexusView, string> = {
  overview: 'What it does',
  hld: 'Architecture, animated',
  lld: 'Code-level design',
  cicd: 'Ship and host',
};

function BlockTitle({ children, tag }: { children: string; tag?: string }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 font-display text-xl uppercase tracking-wide text-white">
      <span aria-hidden className="h-4 w-1 -skew-x-12 bg-flame" />
      {children}
      {tag && <span className="ml-1 text-xs font-semibold tracking-[0.2em] text-zinc-500">{tag}</span>}
    </h3>
  );
}

/** The live app in a browser window, with the phone view beside it. Opens the app. */
function Preview() {
  const { theme } = useTheme();
  return (
    <a
      href={NEXUS.url}
      target="_blank"
      rel="noreferrer"
      onClick={() => play('click')}
      aria-label={`Open ${NEXUS.name} (${NEXUS.host}) in a new tab`}
      className="group relative mx-auto block w-full max-w-xl pb-6 pr-4 [perspective:1400px] lg:max-w-none"
    >
      <span className="block transition-transform duration-500 ease-out [transform:rotateY(-8deg)_rotateX(3deg)] group-hover:[transform:rotateY(0deg)_rotateX(0deg)] motion-reduce:transition-none">
        <span className="cut block overflow-hidden bg-ink-3 shadow-[inset_0_0_0_1px_rgb(var(--hl-line)/0.45)]">
          <span className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-danger/70" />
            <span className="h-2 w-2 rounded-full bg-white/25" />
            <span className="h-2 w-2 rounded-full bg-ok/70" />
            <span className="ml-2 flex min-w-0 flex-1 items-center gap-1.5 bg-white/[0.06] px-2 py-0.5 text-[0.625rem] text-zinc-300">
              <Icon name="lock" className="h-3 w-3 shrink-0 text-ok" />
              <span className="truncate">{NEXUS.host}</span>
            </span>
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/missions/nexus/desktop-${theme}.webp`}
            alt="The Nexus landing page: Split expenses. Not friendships."
            width={1280}
            height={800}
            loading="lazy"
            decoding="async"
            className="block h-auto w-full"
          />
        </span>
        <span className="absolute -bottom-1 right-0 block w-[23%] overflow-hidden rounded-[0.9rem] border-[3px] border-ink-4 bg-ink shadow-[0_14px_30px_rgb(var(--shadow)/0.45)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/missions/nexus/phone-${theme}.webp`}
            alt=""
            width={780}
            height={1560}
            loading="lazy"
            decoding="async"
            className="block h-auto w-full"
          />
        </span>
      </span>
      <span className="absolute bottom-8 left-3 overflow-hidden">
        <span className="para flex translate-y-[130%] items-center gap-2 bg-gradient-to-r from-flame to-flame-hot px-5 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-on-gold transition-transform duration-300 ease-out group-hover:translate-y-0 group-focus-visible:translate-y-0">
          Open the live app <Icon name="external" className="h-3.5 w-3.5" />
        </span>
      </span>
    </a>
  );
}

function Header({ onView }: { onView: (v: NexusView) => void }) {
  return (
    <section className="panel p-5 sm:p-6" aria-labelledby="nexus-title">
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.3em] text-gold">
            {NEXUS.code} · {NEXUS.kind}
            <span className="para flex items-center gap-2 bg-ok/15 px-4 py-0.5 tracking-[0.2em] text-ok">
              <span className="live-dot" /> Live
            </span>
          </div>
          <h2 id="nexus-title" className="ex3d mt-2 font-display text-6xl uppercase leading-none tracking-wide text-white sm:text-7xl">
            {NEXUS.name}
          </h2>
          <p className="mt-3 font-display text-xl uppercase leading-snug tracking-wide text-zinc-200 sm:text-2xl">{NEXUS.tagline}</p>
          <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">Role: {NEXUS.role}</p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">{NEXUS.summary}</p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <GameButton icon="play" label="Launch Nexus" sub={NEXUS.host} href={NEXUS.url} newTab />
            <GameButton
              variant="ghost"
              icon="layers"
              label="See the HLD"
              sub="Animated architecture"
              onClick={() => {
                play('click');
                onView('hld');
              }}
            />
          </div>

          <ul aria-label="Main stack" className="mt-6 flex flex-wrap gap-1.5">
            {NEXUS.stack.map((t) => (
              <li key={t} className="para bg-white/[0.07] px-4 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-zinc-300">
                {t}
              </li>
            ))}
          </ul>
        </div>
        <Preview />
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {NEXUS.stats.map((s) => (
          <div key={s.label} className="cut tile flex min-h-[5rem] flex-col justify-between bg-white/[0.05] px-3.5 py-3">
            <dd className="order-1 font-display text-3xl leading-none text-gold sm:text-4xl">{s.value}</dd>
            <dt className="order-2 mt-1.5 text-[0.6875rem] font-semibold uppercase tracking-widest text-zinc-400">{s.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Overview({ onView }: { onView: (v: NexusView) => void }) {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
      <motion.section variants={item} aria-label="Features">
        <BlockTitle tag="FEATURES">What it does</BlockTitle>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {NEXUS_FEATURES.map((f) => (
            <li key={f.title} className="cut tile flex gap-3 bg-white/[0.05] p-4">
              <span className="cut grid h-10 w-10 shrink-0 place-items-center bg-gradient-to-br from-flame to-flame-hot text-on-gold">
                <Icon name={f.icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-base uppercase leading-tight">{f.title}</span>
                <span className="mt-1 block text-xs leading-relaxed text-zinc-400">{f.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </motion.section>

      <motion.section variants={item} aria-label="Tech stack">
        <BlockTitle tag="LOADOUT">Tech stack</BlockTitle>
        <div className="panel">
          <ul className="divide-y divide-white/10">
            {NEXUS_STACK.map((s) => (
              <li key={s.layer} className="grid grid-cols-1 gap-2 px-4 py-3 md:grid-cols-[9rem_minmax(0,1.3fr)_minmax(0,1fr)] md:items-center md:gap-4">
                <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.25em] text-gold">{s.layer}</span>
                <span className="flex flex-wrap gap-1.5">
                  {s.tech.map((t) => (
                    <span key={t} className="para bg-flame/10 px-4 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-zinc-200">
                      {t}
                    </span>
                  ))}
                </span>
                <span className="text-xs leading-relaxed text-zinc-400">{s.why}</span>
              </li>
            ))}
          </ul>
        </div>
      </motion.section>

      <motion.section variants={item} aria-label="Engineering highlights">
        <BlockTitle tag="UNDER THE HOOD">Engineering highlights</BlockTitle>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {NEXUS_HIGHLIGHTS.map((h, i) => (
            <li key={h.title} className="cut flex flex-col bg-white/[0.04] p-4 shadow-[inset_0_0_0_1px_rgb(var(--hl-line)/0.22)]">
              <div className="flex items-baseline gap-2.5">
                <span className="font-display text-sm tabular-nums text-zinc-500">{String(i + 1).padStart(2, '0')}</span>
                <h4 className="font-display text-lg uppercase leading-tight text-gold">{h.title}</h4>
              </div>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-300">{h.text}</p>
              <ul className="mt-3 flex flex-wrap gap-1">
                {h.tags.map((t) => (
                  <li key={t} className="bg-white/[0.07] px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wider text-zinc-300">
                    {t}
                  </li>
                ))}
              </ul>
            </li>
          ))}
          <li className="flex">
            <button
              type="button"
              onClick={() => {
                play('click');
                onView('lld');
              }}
              className="cut tile flex w-full flex-col items-start justify-between gap-4 bg-gradient-to-br from-flame/25 to-flame-hot/10 p-4 text-left"
            >
              <Icon name="code" className="h-8 w-8 text-gold" />
              <span>
                <span className="block font-display text-lg uppercase leading-tight text-white">Open the LLD</span>
                <span className="mt-1 block text-sm text-zinc-300">The write path call by call, the data model, and the split and settle-up maths running live.</span>
              </span>
              <Icon name="arrow" className="h-5 w-5 text-gold" />
            </button>
          </li>
        </ul>
      </motion.section>
    </motion.div>
  );
}

function HldView() {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      <motion.p variants={item} className="max-w-3xl text-sm leading-relaxed text-zinc-400">
        Caddy on one free VM serves both apps from one HTTPS address. Only the NestJS API touches the database, and GitHub Actions
        deploys each app after its tests pass. Pick a scenario and watch a request travel; it plays like a story, scenario after
        scenario.
      </motion.p>
      <motion.div variants={item}>
        <HldMap />
      </motion.div>
      <motion.section variants={item} aria-label="Design decisions">
        <BlockTitle tag="WHY">Design decisions</BlockTitle>
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {HLD_DECISIONS.map((d) => (
            <li key={d.title} className="cut tile bg-white/[0.05] p-4">
              <span className="block font-display text-base uppercase leading-tight">{d.title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-zinc-400">{d.text}</span>
            </li>
          ))}
        </ul>
      </motion.section>
    </motion.div>
  );
}

interface Props {
  view: NexusView;
  onView: (v: NexusView) => void;
  chapter: LldChapter;
  onChapter: (c: LldChapter) => void;
}

/** Mission 02: Nexus. A header with the live app, then four views: overview, HLD, LLD and CI/CD. */
export function NexusMission({ view, onView, chapter, onChapter }: Props) {
  const tabs = useRef<HTMLElement>(null);
  // From a button away from the tabs (the header, the end of the overview): bring the new view into sight.
  const jump = (v: NexusView) => {
    onView(v);
    requestAnimationFrame(() => tabs.current?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' }));
  };

  return (
    <div className="space-y-5">
      <Header onView={jump} />

      <nav ref={tabs} aria-label="Nexus views" role="tablist" className="grid scroll-mt-4 grid-cols-2 gap-1.5 sm:grid-cols-4">
        {NEXUS_VIEWS.map((v) => {
          const active = v.id === view;
          return (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                play('click');
                onView(v.id);
              }}
              className={`para tile flex min-h-[3.5rem] items-center gap-3 py-2 pl-6 pr-8 text-left ${active ? 'bg-flame/25' : 'bg-white/[0.05]'}`}
            >
              {active && (
                <motion.span
                  layoutId="nexus-view-bar"
                  transition={{ type: 'spring', stiffness: 700, damping: 40 }}
                  className="absolute inset-y-0 left-0 w-1.5 bg-flame"
                />
              )}
              <Icon name={v.icon} className="h-5 w-5 shrink-0 text-gold" />
              <span className="min-w-0">
                <span className={`block font-display text-lg uppercase leading-none ${active ? 'text-white' : ''}`}>{v.label}</span>
                <span className="mt-1 hidden truncate text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-zinc-400 sm:block">{VIEW_HINT[v.id]}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <motion.div key={view} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
        {view === 'overview' && <Overview onView={jump} />}
        {view === 'hld' && <HldView />}
        {view === 'lld' && <Lld chapter={chapter} onChapter={onChapter} />}
        {view === 'cicd' && <Pipeline />}
      </motion.div>
    </div>
  );
}
