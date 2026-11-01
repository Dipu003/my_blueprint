'use client';

import { useEffect, useRef, useState } from 'react';
import { NEXUS, NEXUS_DEPLOY_FACTS, NEXUS_DEPLOY_STEPS, NEXUS_HOSTING } from '@/data/nexus';
import { reducedMotion } from '@/lib/gsap';
import { Icon } from '@/components/ui/Icon';

const N = NEXUS_DEPLOY_STEPS.length;

function StepIcon({ state, icon }: { state: 'queued' | 'running' | 'done'; icon: (typeof NEXUS_DEPLOY_STEPS)[number]['icon'] }) {
  if (state === 'done')
    return (
      <span className="cut relative grid h-11 w-11 place-items-center bg-ok text-on-ok shadow-[0_0_18px_rgb(var(--ok)/0.45)]">
        <Icon name="check" className="h-5 w-5" />
      </span>
    );
  return (
    <span className={`cut relative grid h-11 w-11 place-items-center ${state === 'running' ? 'bg-flame/30 text-white' : 'bg-ink-3 text-zinc-500'}`}>
      <Icon name={icon} className="h-5 w-5" />
      {state === 'running' && (
        <svg aria-hidden viewBox="0 0 44 44" className="absolute inset-0 h-full w-full animate-spin motion-reduce:animate-none">
          <circle cx="22" cy="22" r="19" fill="none" strokeWidth="2.5" strokeDasharray="30 90" strokeLinecap="round" className="stroke-neon" />
        </svg>
      )}
    </span>
  );
}

/**
 * The deploy pipeline as a run you can watch: each step goes queued → running → done, then the
 * app is live, and the run starts again. Runs only while on screen; still (all done) with reduced motion.
 */
export function Pipeline() {
  const box = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(() => (reducedMotion() ? N : 0));
  const [run, setRun] = useState(1);
  const [onScreen, setOnScreen] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el || reducedMotion()) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!onScreen) return;
    const t =
      done < N
        ? setTimeout(() => setDone((d) => d + 1), done === 0 ? 700 : 1300)
        : setTimeout(() => {
            setDone(0);
            setRun((r) => r + 1);
          }, 4200);
    return () => clearTimeout(t);
  }, [onScreen, done]);

  const live = done === N;
  const fill = Math.min(done, N - 1) / (N - 1);

  return (
    <div className="space-y-5">
      <section ref={box} className="panel overflow-hidden" aria-label="Deploy pipeline">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
          <h3 className="flex items-center gap-2 font-display text-lg uppercase tracking-wide text-white">
            <span aria-hidden className="h-3.5 w-1 -skew-x-12 bg-flame" />
            Deploy · push to main
          </h3>
          <div className="flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-wider">
            <span className="text-zinc-400">Run #{run}</span>
            <span className={`para flex items-center gap-1.5 px-4 py-1 ${live ? 'bg-ok/15 text-ok' : 'bg-flame/15 text-gold'}`}>
              {live ? <Icon name="check" className="h-3.5 w-3.5" /> : <span className="h-2 w-2 animate-dot rounded-full bg-neon motion-reduce:animate-none" />}
              {live ? 'Success' : 'In progress'}
            </span>
          </div>
        </div>

        <div className="bp-paper relative px-4 py-6 sm:px-6">
          {/* the rail that fills as steps pass: across on wide screens, down on phones */}
          <span aria-hidden className="absolute left-[10%] right-[10%] top-[2.875rem] hidden h-0.5 bg-white/10 lg:block">
            <span className="block h-full origin-left bg-gradient-to-r from-ok to-neon transition-transform duration-700 ease-out" style={{ transform: `scaleX(${fill})` }} />
          </span>
          <span aria-hidden className="absolute bottom-10 left-[2.4rem] top-10 w-0.5 bg-white/10 sm:left-[2.9rem] lg:hidden">
            <span className="block h-full w-full origin-top bg-gradient-to-b from-ok to-neon transition-transform duration-700 ease-out" style={{ transform: `scaleY(${fill})` }} />
          </span>

          <ol className="relative grid grid-cols-1 gap-5 lg:grid-cols-5 lg:gap-4">
            {NEXUS_DEPLOY_STEPS.map((s, i) => {
              const state = i < done ? 'done' : i === done ? 'running' : 'queued';
              return (
                <li key={s.title} className="flex gap-4 lg:flex-col lg:items-center lg:text-center">
                  <StepIcon state={state} icon={s.icon} />
                  <div className="min-w-0">
                    <div className="text-[0.625rem] font-semibold uppercase tracking-[0.25em] text-gold">
                      Step {i + 1} · {state === 'done' ? 'passed' : state === 'running' ? 'running' : 'queued'}
                    </div>
                    <div className={`font-display text-lg uppercase leading-tight ${state === 'queued' ? 'text-zinc-400' : 'text-white'}`}>{s.title}</div>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-400">{s.text}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3 sm:px-5">
          <p className={`flex items-center gap-2 text-sm font-semibold transition-colors ${live ? 'text-ok' : 'text-zinc-400'}`}>
            <span className={live ? 'live-dot' : 'inline-block h-2 w-2 rounded-full bg-zinc-500'} />
            {live ? `Live on ${NEXUS.host}` : 'The running version keeps serving until the new one passes.'}
          </p>
          <a href={NEXUS.url} target="_blank" rel="noreferrer" className="para tile flex h-8 items-center gap-2 bg-white/[0.06] px-5 text-[0.6875rem] font-semibold uppercase tracking-wider">
            Open the app <Icon name="external" className="h-3.5 w-3.5" />
          </a>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {NEXUS_DEPLOY_FACTS.map((f) => (
          <div key={f.label} className="cut tile flex min-h-[5rem] flex-col justify-between bg-white/[0.05] px-3.5 py-3">
            <span className="font-display text-3xl leading-none text-gold">{f.value}</span>
            <span className="mt-1.5 text-[0.6875rem] font-semibold uppercase tracking-widest text-zinc-400">{f.label}</span>
          </div>
        ))}
      </div>

      <section className="panel p-4 sm:p-5" aria-label="Hosting">
        <h3 className="mb-3 flex items-center gap-2 font-display text-lg uppercase tracking-wide text-white">
          <span aria-hidden className="h-3.5 w-1 -skew-x-12 bg-flame" />
          Hosting for ₹0
        </h3>
        <ul className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {NEXUS_HOSTING.map((h) => (
            <li key={h} className="flex gap-2.5 text-sm leading-relaxed text-zinc-300">
              <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rotate-45 bg-flame" />
              {h}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-zinc-500">
          Two repositories (nexus_frontend, nexus_backend), one workflow each. Pushes that only change documentation skip the deploy.
        </p>
      </section>
    </div>
  );
}
