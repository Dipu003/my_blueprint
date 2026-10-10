'use client';

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CAREER, OPEN_TO, roleById, type OpenRole } from '@/data/portfolio';
import { useGame } from '@/providers/GameProvider';
import { Icon, type IconName } from '@/components/ui/Icon';
import { GameButton } from '@/components/ui/GameButton';
import { roleIcon } from '@/components/ui/roleIcon';
import { item, stagger } from '@/components/sections/motion';

const CAREER_ROLES = CAREER.flatMap((g) => g.roles);
const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/** Small heading above a block in the side column (same look as the Career group labels). */
function SideHeading({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    // h-7 and mb-3 match the "What I've done" heading, so the first row of both columns lines up.
    <h3 className="mb-3 flex h-7 items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
      <Icon name={icon} className="h-4 w-4 text-gold" /> {children}
    </h3>
  );
}

function Briefing({ def }: { def: OpenRole }) {
  const { openRole, closeRole, go, years } = useGame();
  const dialog = useRef<HTMLDivElement>(null);
  const backButton = useRef<HTMLButtonElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const number =String(OPEN_TO.findIndex((r) => r.id === def.id) + 1).padStart(2, '0');
  const where = def.from.flatMap((id) => CAREER_ROLES.filter((r) => r.id === id));

  // Focus moves into the dialog (onto Back) while it is open and back to whatever opened it afterwards.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    backButton.current?.focus({ preventScroll: true });
    return () => {
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, []);

  // Another role starts at the top.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [def.id]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault(); // so the global Esc (back) does not also fire
        closeRole();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeRole]);

  // Tab and Shift+Tab wrap around inside the dialog instead of reaching the page underneath.
  const keepFocusInside = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !dialog.current) return;
    const stops = Array.from(dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (!stops.length) return;
    const first = stops[0];
    const last = stops[stops.length - 1];
    const at = document.activeElement;
    if (e.shiftKey && (at === first || at === dialog.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && at === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[60] flex sm:items-center sm:justify-center sm:p-6"
    >
      {/* Plain translucent scrim: a blur here would be redone every frame under the animated backdrop. */}
      <div aria-hidden onClick={closeRole} className="absolute inset-0 bg-black/80" />

      <motion.div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mode-title"
        tabIndex={-1}
        onKeyDown={keepFocusInside}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 440, damping: 38 }}
        // bg-ink-2 puts a solid colour under the panel's translucent gradient, so the page behind doesn't show through the text.
        className="panel flex h-full w-full max-w-6xl flex-col bg-ink-2 outline-none after:!opacity-0 max-sm:[clip-path:none] sm:h-auto sm:max-h-full"
      >
        <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/10 px-4 py-3 sm:px-6">
          <button
            ref={backButton}
            type="button"
            onClick={closeRole}
            className="para tile flex h-10 shrink-0 items-center gap-2 bg-white/[0.08] pl-6 pr-8 font-display text-lg uppercase tracking-wide"
          >
            <Icon name="back" className="h-5 w-5 text-gold" /> Back
          </button>

          <nav
            aria-label="Modes"
            className="order-last -mx-1 flex basis-full gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:order-none sm:basis-auto sm:pb-0 [&::-webkit-scrollbar]:hidden"
          >
            {OPEN_TO.map((r) => {
              const active = r.id === def.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  aria-current={active ? 'true' : undefined}
                  onClick={() => openRole(r.id)}
                  className={`para tile flex h-9 shrink-0 items-center gap-2 pl-6 pr-8 font-display text-base uppercase tracking-wide ${
                    active ? 'bg-flame/25 text-white' : 'bg-white/[0.05]'
                  }`}
                >
                  {active && <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-flame" />}
                  <Icon name={roleIcon(r.role)} className="h-4 w-4 shrink-0 text-gold" />
                  {r.short}
                </button>
              );
            })}
          </nav>
        </header>

        <div ref={scroller} className="game-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-5 sm:px-6">
          <motion.div key={def.id} variants={stagger} initial="hidden" animate="show">
            <motion.div variants={item} className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="cut grid h-16 w-16 shrink-0 place-items-center bg-gradient-to-br from-flame to-flame-hot text-on-gold sm:h-20 sm:w-20">
                  <Icon name={roleIcon(def.role)} className="h-9 w-9 sm:h-11 sm:w-11" />
                </div>
                <div className="min-w-0">
                  <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.3em] text-gold">
                    Mode briefing · {number}/{String(OPEN_TO.length).padStart(2, '0')}
                  </div>
                  <h2
                    id="mode-title"
                    className="mt-1 font-display text-4xl uppercase leading-[0.95] text-white sm:text-5xl"
                  >
                    {def.role}
                  </h2>
                  <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">{def.focus}</p>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">{def.pitch}</p>
                </div>
              </div>

              <dl className="grid shrink-0 grid-cols-3 gap-2 lg:w-[26rem]">
                {def.proof.map((p) => (
                  <div key={p.label} className="cut tile flex min-h-[5.5rem] flex-col justify-between bg-white/[0.05] px-3 py-2.5">
                    <dd className="order-1 font-display text-3xl leading-none text-gold sm:text-4xl">
                      {p.live === 'years' ? years : p.value}
                    </dd>
                    <dt className="order-2 mt-1.5 hyphens-auto text-[0.625rem] font-semibold uppercase leading-tight tracking-normal text-zinc-400 sm:text-[0.6875rem] sm:tracking-widest">
                      {p.label}
                    </dt>
                  </div>
                ))}
              </dl>
            </motion.div>

            <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <section aria-labelledby="mode-work">
                <h3
                  id="mode-work"
                  className="mb-3 flex items-center gap-2 font-display text-xl uppercase tracking-wide text-white"
                >
                  <span aria-hidden className="h-4 w-1 -skew-x-12 bg-flame" /> What I&apos;ve done
                  <span className="ml-1 text-xs font-semibold not-italic tracking-[0.2em] text-zinc-500">EXPERIENCE</span>
                </h3>
                <div className="space-y-3">
                  {def.work.map((g, i) => (
                    <motion.div key={g.title} variants={item} className="cut bg-white/[0.04] p-4">
                      <h4 className="flex items-center gap-2.5 font-display text-lg uppercase tracking-wide text-gold">
                        <span className="text-sm tabular-nums text-zinc-500">{String(i + 1).padStart(2, '0')}</span>
                        {g.title}
                      </h4>
                      <ul className="mt-2.5 space-y-2.5">
                        {g.points.map((p) => (
                          <li key={p} className="flex gap-3 text-sm leading-relaxed text-zinc-300">
                            <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rotate-45 bg-flame" />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  ))}
                </div>
              </section>

              <aside className="space-y-5">
                <motion.section variants={item} aria-label="Toolkit">
                  <SideHeading icon="gear">Toolkit</SideHeading>
                  <ul className="grid grid-cols-2 gap-1.5">
                    {def.tools.map((t) => (
                      <li
                        key={t}
                        className="para tile flex h-8 items-center justify-center bg-flame/10 px-3 text-center text-[0.6875rem] font-semibold uppercase leading-tight tracking-wider text-gold"
                      >
                        {t}
                      </li>
                    ))}
                  </ul>
                </motion.section>

                <motion.section variants={item} aria-label="Where I did it">
                  <SideHeading icon="briefcase">Where</SideHeading>
                  <ul className="space-y-1.5">
                    {where.map((r) => (
                      <li key={r.id} className="cut tile flex items-center gap-3 bg-white/[0.05] px-3 py-2.5">
                        <Icon name="briefcase" className="h-5 w-5 shrink-0 text-gold" />
                        <div className="min-w-0">
                          <div className="font-display text-base uppercase leading-tight">{r.role}</div>
                          <div className="mt-0.5 text-xs text-zinc-400">
                            {[r.company, r.period].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </motion.section>

                {def.medals && (
                  <motion.section variants={item} aria-label="Certifications">
                    <SideHeading icon="medal">Medals</SideHeading>
                    <ul className="space-y-1.5">
                      {def.medals.map((m) => (
                        <li key={m} className="cut tile flex items-center gap-3 bg-white/[0.05] px-3 py-2.5">
                          <Icon name="medal" className="h-5 w-5 shrink-0 text-gold" />
                          <span className="font-display text-base uppercase leading-tight">{m}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.section>
                )}
              </aside>
            </div>

            <motion.div
              variants={item}
              className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5"
            >
              <p className="text-sm text-zinc-400">Open to {def.role} roles.</p>
              <GameButton icon="mail" label="Say hello" sub="Open contact" onClick={() => go('squad')} />
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * The screen behind a "mode": pick a role in the lobby (or in the top-bar menu) and this opens over
 * the current tab with what I did in that role, written from the resume and the LinkedIn profile.
 * Back, Esc, a click outside and the browser's Back button all close it; the modes along the top
 * switch to another role without leaving.
 */
export function RoleBrief() {
  const { role } = useGame();
  const def = roleById(role);
  return <AnimatePresence>{def && <Briefing key="briefing" def={def} />}</AnimatePresence>;
}
