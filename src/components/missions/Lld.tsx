'use client';

import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LLD_CHAPTERS,
  NEXUS_COLLECTIONS,
  NEXUS_INVARIANTS,
  NEXUS_MODULES,
  NEXUS_PIPELINE,
  NEXUS_SECURITY,
  NEXUS_SERVICES,
  SEQ_ACTORS,
  SEQ_MESSAGES,
  type FieldMark,
  type LldChapter,
} from '@/data/nexus';
import { reducedMotion } from '@/lib/gsap';
import { play } from '@/lib/sound';
import { Icon, type IconName } from '@/components/ui/Icon';
import { allocate, parseRupees, rupees, settle, settles } from './algorithms';

/** Small heading over a block inside a chapter. */
function Sub({ icon, children, aside }: { icon: IconName; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h4 className="flex items-center gap-2 font-display text-lg uppercase tracking-wide text-white">
        <Icon name={icon} className="h-4 w-4 text-gold" />
        {children}
      </h4>
      {aside}
    </div>
  );
}

/** Runs `fn` once, the first time `ref` is at least partly on screen. */
function useFirstSight(ref: RefObject<HTMLElement>, fn: () => void) {
  const done = useRef(false);
  const cb = useRef(fn);
  cb.current = fn;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !done.current) {
        done.current = true;
        cb.current();
      }
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
}

/* ---------------- Write path: a sequence diagram that draws itself ---------------- */

const COLS = SEQ_ACTORS.length;
const centre = (i: number) => `${((i + 0.5) / COLS) * 100}%`;

function Message({ i, shown, current }: { i: number; shown: boolean; current: boolean }) {
  const m = SEQ_MESSAGES[i];
  const n = String(i + 1).padStart(2, '0');
  const tone = current ? 'text-white' : 'text-zinc-300';
  const line = current ? 'bg-neon' : m.reply ? 'bg-hl/50' : 'bg-gold/70';

  if (m.from === m.to) {
    // a call inside one service: a small loop on its lifeline, the text beside it
    return (
      <li className="relative py-1.5" style={{ paddingLeft: centre(m.from) }}>
        <div className="flex items-start gap-2">
          <svg aria-hidden viewBox="0 0 26 22" className={`-ml-px mt-0.5 h-5 w-6 shrink-0 transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`}>
            <path d="M1 4h16a5 5 0 0 1 0 10H6" fill="none" strokeWidth="1.8" className={current ? 'stroke-neon' : 'stroke-gold/70'} />
            <path d="M9 10l-4 4 4 4" fill="none" strokeWidth="1.8" className={current ? 'stroke-neon' : 'stroke-gold/70'} />
          </svg>
          <span className="min-w-0 overflow-hidden">
            <span
              className={`block bg-ink-2/90 pr-2 text-xs leading-snug transition-transform duration-500 ease-out sm:text-[0.8125rem] ${tone} ${shown ? 'translate-y-0' : 'translate-y-[120%]'}`}
            >
              <b className="mr-1.5 font-display text-gold">{n}</b>
              {m.text}
            </span>
          </span>
        </div>
      </li>
    );
  }

  const lo = Math.min(m.from, m.to);
  const span = Math.abs(m.to - m.from);
  const right = m.to > m.from;
  return (
    <li className="relative py-1.5">
      <div
        className="overflow-hidden sm:ml-[var(--l)] sm:w-[var(--w)] sm:px-3 sm:text-center"
        style={{ ['--l' as string]: centre(lo), ['--w' as string]: `${(span / COLS) * 100}%` }}
      >
        <span
          className={`inline-block bg-ink-2/90 px-1 text-xs leading-snug transition-transform duration-500 ease-out sm:text-[0.8125rem] ${tone} ${shown ? 'translate-y-0' : 'translate-y-[120%]'}`}
        >
          <b className="mr-1.5 font-display text-gold">{n}</b>
          {m.text}
        </span>
      </div>
      <div className="relative mt-1 h-3" style={{ marginLeft: centre(lo), width: `${(span / COLS) * 100}%` }}>
        <span
          className={`absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 transition-transform duration-500 ease-out ${line} ${
            right ? 'origin-left' : 'origin-right'
          } ${shown ? 'scale-x-100' : 'scale-x-0'} ${m.reply ? '[mask-image:repeating-linear-gradient(90deg,#000_0_6px,transparent_6px_10px)]' : ''}`}
        />
        <svg
          aria-hidden
          viewBox="0 0 10 10"
          className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 transition-opacity delay-300 duration-200 ${right ? '-right-0.5' : '-left-0.5 rotate-180'} ${
            shown ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <path d="M0 0L10 5L0 10z" className={current ? 'fill-neon' : m.reply ? 'fill-hl/60' : 'fill-gold/80'} />
        </svg>
      </div>
    </li>
  );
}

function WritePath() {
  const box = useRef<HTMLDivElement>(null);
  // Starts empty and draws itself once on screen (all at once with reduced motion).
  const [shown, setShown] = useState(() => (reducedMotion() ? SEQ_MESSAGES.length : 0));
  const [playing, setPlaying] = useState(false);

  const replay = () => {
    if (reducedMotion()) return setShown(SEQ_MESSAGES.length);
    setShown(0);
    setPlaying(true);
  };
  useFirstSight(box, replay);

  useEffect(() => {
    if (!playing) return;
    if (shown >= SEQ_MESSAGES.length) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setShown((s) => s + 1), shown === 0 ? 250 : 750);
    return () => clearTimeout(t);
  }, [playing, shown]);

  // Consecutive transaction rows share one shaded box.
  const groups: { tx: boolean; rows: number[] }[] = [];
  SEQ_MESSAGES.forEach((m, i) => {
    const last = groups[groups.length - 1];
    if (last && last.tx === !!m.tx) last.rows.push(i);
    else groups.push({ tx: !!m.tx, rows: [i] });
  });

  return (
    <div ref={box}>
      <Sub
        icon="transfer"
        aside={
          <button type="button" onClick={() => (play('click'), replay())} className="para tile flex h-8 items-center gap-2 bg-white/[0.06] px-5 text-[0.6875rem] font-semibold uppercase tracking-wider">
            <Icon name="refresh" className="h-3.5 w-3.5" /> Replay
          </button>
        }
      >
        Creating an expense, call by call
      </Sub>
      <p className="mb-4 max-w-3xl text-sm leading-relaxed text-zinc-400">
        Every write that changes balances (expenses, settlements, voids, member removal, role changes) follows this pattern. Balances
        are never stored: they are recomputed from the records, so they cannot drift.
      </p>

      <div className="cut bp-paper relative bg-white/[0.03] px-2 pb-4 pt-3 sm:px-4">
        {/* lifelines */}
        {SEQ_ACTORS.map((a, i) => (
          <span key={a.title} aria-hidden className="absolute bottom-3 top-16 w-px -translate-x-1/2 border-l border-dashed border-hl/40" style={{ left: centre(i) }} />
        ))}
        <ol aria-label="Actors" className="relative grid grid-cols-3 gap-2">
          {SEQ_ACTORS.map((a) => (
            <li key={a.title} className="cut mx-auto flex w-full max-w-[11rem] items-center justify-center gap-2 bg-ink-3 px-2 py-2 shadow-[inset_0_0_0_1px_rgb(var(--hl-line)/0.4)]">
              <Icon name={a.icon} className="hidden h-4 w-4 shrink-0 text-gold sm:block" />
              <span className="min-w-0 text-center leading-tight sm:text-left">
                <span className="block font-display text-[0.8125rem] uppercase text-white sm:text-sm">{a.title}</span>
                <span className="block truncate text-[0.625rem] uppercase tracking-wider text-zinc-400">{a.sub}</span>
              </span>
            </li>
          ))}
        </ol>

        <div className="relative mt-3">
          {groups.map((g) =>
            g.tx ? (
              <div key={g.rows[0]} className="relative my-1.5 py-5">
                <div
                  aria-hidden
                  className="absolute inset-y-0 right-1 border border-neon/40 bg-hl/[0.07]"
                  style={{ left: `calc(${(1 / COLS) * 100}% + 4px)` }}
                />
                <span
                  className="absolute top-1 bg-ink-2 px-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-neon"
                  style={{ left: `calc(${(1 / COLS) * 100}% + 10px)` }}
                >
                  Transaction<span className="hidden sm:inline"> · group-locked</span>
                </span>
                <ol className="relative">
                  {g.rows.map((i) => (
                    <Message key={i} i={i} shown={i < shown} current={playing && i === shown - 1} />
                  ))}
                </ol>
              </div>
            ) : (
              <ol key={g.rows[0]} className="relative">
                {g.rows.map((i) => (
                  <Message key={i} i={i} shown={i < shown} current={playing && i === shown - 1} />
                ))}
              </ol>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Data model ---------------- */

const MARK: Record<FieldMark, { text: string; cls: string }> = {
  pk: { text: 'PK', cls: 'bg-flame text-on-gold' },
  fk: { text: 'FK', cls: 'bg-white/10 text-gold' },
  uq: { text: 'UNIQUE', cls: 'bg-ok/15 text-ok' },
  idx: { text: 'INDEX', cls: 'bg-white/10 text-zinc-300' },
  ttl: { text: 'TTL', cls: 'bg-white/10 text-zinc-300' },
};

function DataModel() {
  const [focus, setFocus] = useState<string | null>(null);
  return (
    <div>
      <Sub icon="database">Seven collections, validated twice</Sub>
      <p className="mb-4 max-w-3xl text-sm leading-relaxed text-zinc-400">
        The official MongoDB driver with no ODM: every collection has a strict <code className="text-gold">$jsonSchema</code> validator
        and its indexes defined in code next to its feature. Money is always an integer of minor units. Point at a link to see where it
        leads.
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {NEXUS_COLLECTIONS.map((c) => {
          const active = focus === c.name;
          return (
            <section
              key={c.name}
              aria-label={`Collection ${c.name}`}
              className={`cut flex flex-col p-3.5 transition-colors duration-300 ${
                active ? 'bg-hl/15 shadow-[inset_0_0_0_1.5px_rgb(var(--hl-2))]' : 'bg-white/[0.04] shadow-[inset_0_0_0_1px_rgb(var(--hl-line)/0.25)]'
              }`}
            >
              <header className="flex items-center gap-2 border-b border-white/10 pb-2">
                <Icon name="database" className="h-4 w-4 text-gold" />
                <h5 className="font-mono text-sm font-semibold text-white">{c.name}</h5>
              </header>
              <ul className="mt-2 flex-1 space-y-1">
                {c.fields.map((f) => (
                  <li key={f.name} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
                    <span className="font-mono text-zinc-100">{f.name}</span>
                    {f.mark && (
                      f.ref ? (
                        <button
                          type="button"
                          onMouseEnter={() => setFocus(f.ref!)}
                          onMouseLeave={() => setFocus(null)}
                          onFocus={() => setFocus(f.ref!)}
                          onBlur={() => setFocus(null)}
                          onClick={() => setFocus((x) => (x === f.ref ? null : f.ref!))}
                          className={`px-1.5 text-[0.5625rem] font-bold tracking-wider ${MARK.fk.cls}`}
                        >
                          → {f.ref}
                        </button>
                      ) : (
                        <span className={`px-1.5 text-[0.5625rem] font-bold tracking-wider ${MARK[f.mark].cls}`}>{MARK[f.mark].text}</span>
                      )
                    )}
                    <span className="ml-auto text-right text-zinc-400">{f.type}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-white/10 pt-2 text-xs leading-relaxed text-zinc-400">{c.note}</p>
            </section>
          );
        })}
        <section aria-label="Invariants" className="cut bg-flame/10 p-3.5 shadow-[inset_0_0_0_1px_rgb(var(--hl-line)/0.3)]">
          <header className="flex items-center gap-2 border-b border-white/10 pb-2">
            <Icon name="check" className="h-4 w-4 text-ok" />
            <h5 className="font-display text-sm uppercase tracking-wide text-white">Invariants checked on every write</h5>
          </header>
          <ul className="mt-2 space-y-1.5">
            {NEXUS_INVARIANTS.map((v) => (
              <li key={v} className="flex gap-2 text-xs leading-relaxed text-zinc-300">
                <span aria-hidden className="mt-[6px] h-1.5 w-1.5 shrink-0 rotate-45 bg-ok" />
                {v}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

/* ---------------- Services & modules ---------------- */

function Modules() {
  return (
    <div className="space-y-8">
      <div>
        <Sub icon="layers">One codebase, three services</Sub>
        <p className="mb-4 max-w-3xl text-sm leading-relaxed text-zinc-400">
          <code className="text-gold">NEXUS_SERVICE</code> picks the root module at start-up. Production runs{' '}
          <code className="text-gold">all</code> in one process; the same build splits into three when one part needs to scale. No
          service calls another over HTTP: they share the code and the database, so a request never pays for an extra hop.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {NEXUS_SERVICES.map((s) => (
            <div key={s.id} className="cut tile flex flex-col bg-white/[0.05] p-4">
              <div className="flex items-center gap-2.5">
                <span className="cut grid h-9 w-9 shrink-0 place-items-center bg-gradient-to-br from-flame to-flame-hot text-on-gold">
                  <Icon name={s.icon} className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-[0.625rem] font-semibold uppercase tracking-[0.25em] text-gold">Service</span>
                  <span className="block font-display text-xl uppercase leading-none text-white">{s.id}</span>
                </span>
              </div>
              <ul className="mt-3 flex flex-wrap gap-1">
                {s.routes.map((r) => (
                  <li key={r} className="bg-white/[0.07] px-1.5 py-0.5 font-mono text-[0.6875rem] text-zinc-200">
                    {r}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs leading-relaxed text-zinc-400">{s.holds}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Sub icon="arrow">The path of every request</Sub>
        <ol className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
          {NEXUS_PIPELINE.map((p, i) => (
            <li key={p.name} className="para tile flex min-h-[3.75rem] items-center gap-3 bg-white/[0.05] pl-6 pr-8">
              <span className="tile-num w-6 shrink-0 font-display text-sm tabular-nums">{String(i + 1).padStart(2, '0')}</span>
              <span className="min-w-0">
                <span className="block font-display text-sm uppercase leading-tight">{p.name}</span>
                <span className="block text-[0.6875rem] leading-tight text-zinc-400">{p.does}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <Sub icon="puzzle">NestJS modules</Sub>
        <p className="mb-4 max-w-3xl text-sm leading-relaxed text-zinc-400">
          Controllers are declared only in the service modules; feature modules provide and export services. Memberships has no
          dependencies, so every module can use it without cycles, and a unit test fails if a route ends up in the wrong service.
        </p>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {NEXUS_MODULES.map((m) => (
            <li key={m.name} className="cut bg-white/[0.04] px-3.5 py-3 shadow-[inset_0_0_0_1px_rgb(var(--hl-line)/0.2)]">
              <div className="font-display text-base uppercase leading-tight text-white">{m.name}Module</div>
              <p className="mt-0.5 text-xs text-zinc-400">{m.does}</p>
              {m.uses.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  <span className="text-[0.625rem] font-semibold uppercase tracking-wider text-zinc-500">uses</span>
                  {m.uses.map((u) => (
                    <span key={u} className="bg-flame/15 px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wider text-gold">
                      {u}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
          <li className="cut bg-flame/10 px-3.5 py-3 shadow-[inset_0_0_0_1px_rgb(var(--hl-line)/0.35)]">
            <div className="font-display text-base uppercase leading-tight text-white">Pure engines</div>
            <p className="mt-0.5 text-xs text-zinc-400">No I/O, no framework, unit-tested: the money maths lives here.</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {['split-calculator', 'balance-calculator', 'settlement-optimizer'].map((u) => (
                <span key={u} className="bg-white/[0.08] px-1.5 py-0.5 font-mono text-[0.625rem] text-zinc-200">
                  {u}
                </span>
              ))}
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}

/* ---------------- Algorithms: the real maths, live ---------------- */

const PEOPLE = [
  { id: 'a', name: 'Asha' },
  { id: 'b', name: 'Bilal' },
  { id: 'c', name: 'Chitra' },
];
const METHODS = {
  equal: { label: 'Equally', weights: [1, 1, 1], show: () => '1 part' },
  percent: { label: 'Percentage', weights: [3333, 3333, 3334], show: (w: number) => `${(w / 100).toFixed(2)}%` },
  shares: { label: 'Shares', weights: [2, 1, 1], show: (w: number) => `${w} share${w > 1 ? 's' : ''}` },
} as const;
type Method = keyof typeof METHODS;

function SplitLab() {
  const [text, setText] = useState('1000.00');
  const [method, setMethod] = useState<Method>('equal');
  const total = parseRupees(text);
  const def = METHODS[method];
  const rows = useMemo(
    () => (total ? allocate(total, PEOPLE.map((p, i) => ({ id: p.id, weight: def.weights[i] }))) : null),
    [total, def],
  );
  const sum = rows?.reduce((s, r) => s + r.amount, 0) ?? 0;
  const extras = rows?.filter((r) => r.extra).length ?? 0;
  const weightSum = def.weights.reduce((a, b) => a + b, 0);

  return (
    <div className="cut flex flex-col bg-white/[0.04] p-4 shadow-[inset_0_0_0_1px_rgb(var(--hl-line)/0.25)]">
      <Sub icon="split">Split lab · largest remainder</Sub>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-[0.625rem] font-semibold uppercase tracking-[0.25em] text-gold">Bill (₹)</span>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            inputMode="decimal"
            aria-invalid={!total}
            className="w-36 bg-ink-3 px-3 py-2 font-display text-xl tabular-nums text-white outline-none ring-1 ring-white/20 focus:ring-2 focus:ring-neon"
          />
        </label>
        <div role="tablist" aria-label="Split method" className="flex gap-1">
          {(Object.keys(METHODS) as Method[]).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={m === method}
              onClick={() => (play('click'), setMethod(m))}
              className={`para tile h-9 px-5 text-[0.6875rem] font-semibold uppercase tracking-wider ${m === method ? 'bg-flame/25 text-white' : 'bg-white/[0.05] text-zinc-300'}`}
            >
              {METHODS[m].label}
            </button>
          ))}
        </div>
      </div>

      {rows ? (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[22rem] text-left text-xs">
              <thead>
                <tr className="text-[0.625rem] uppercase tracking-wider text-zinc-500">
                  <th className="pb-1.5 font-semibold">Person</th>
                  <th className="pb-1.5 font-semibold">Weight</th>
                  <th className="pb-1.5 text-right font-semibold">Exact (paise)</th>
                  <th className="pb-1.5 text-right font-semibold">Floor</th>
                  <th className="pb-1.5 text-right font-semibold">Share</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className="border-t border-white/10">
                    <td className="py-2 font-semibold text-white">{PEOPLE[i].name}</td>
                    <td className="py-2 text-zinc-400">{def.show(def.weights[i])}</td>
                    <td className="py-2 text-right tabular-nums text-zinc-300">
                      {r.floor.toLocaleString('en-IN')}
                      <span className="text-zinc-500">
                        .{((r.remainder * 100n) / BigInt(weightSum)).toString().padStart(2, '0')}
                      </span>
                    </td>
                    <td className="py-2 text-right tabular-nums text-zinc-300">{r.floor.toLocaleString('en-IN')}</td>
                    <td className="py-2 text-right font-display text-sm tabular-nums text-white">
                      {r.extra && <span className="mr-1.5 bg-ok/15 px-1 font-ui text-[0.625rem] font-bold text-ok">+1</span>}
                      {rupees(r.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
            <span className={`font-semibold ${sum === total ? 'text-ok' : 'text-danger'}`}>
              Σ {rupees(sum)} {sum === total ? '= the bill ✓' : '≠ the bill'}
            </span>
            <span>
              · {extras === 0 ? 'No paise left over.' : `${extras} leftover ${extras === 1 ? 'paisa goes' : 'paise go'} to the largest remainder${extras === 1 ? '' : 's'}; ties to the lowest id.`}
            </span>
          </p>
        </>
      ) : (
        <p className="mt-4 text-sm text-danger">Type an amount such as 1000.01 (up to two decimals).</p>
      )}
    </div>
  );
}

const FRIENDS = ['Asha', 'Bilal', 'Chitra', 'Dev', 'Esha'];
const START = [
  { id: 'Asha', net: 50000 },
  { id: 'Bilal', net: -30000 },
  { id: 'Chitra', net: -20000 },
];

/** Random net balances for five friends that sum to zero (whole rupees), sometimes with an exact match. */
function shuffleBalances() {
  for (;;) {
    const nets = FRIENDS.slice(0, 4).map(() => (Math.floor(Math.random() * 19) - 9) * 10000 + Math.floor(Math.random() * 10) * 1000);
    if (Math.random() < 0.4) nets[1] = -nets[0];
    const last = -nets.reduce((a, b) => a + b, 0);
    if (Math.abs(last) > 120000) continue;
    const all = [...nets, last];
    if (all.filter((v) => v !== 0).length < 3) continue;
    return FRIENDS.map((id, i) => ({ id, net: all[i] }));
  }
}

function SettleLab() {
  const [balances, setBalances] = useState(START);
  const [round, setRound] = useState(0);
  const transfers = useMemo(() => settle(balances), [balances]);
  const ok = settles(balances, transfers);
  const open = balances.filter((b) => b.net !== 0).length;
  const max = Math.max(...balances.map((b) => Math.abs(b.net)), 1);

  return (
    <div className="cut flex flex-col bg-white/[0.04] p-4 shadow-[inset_0_0_0_1px_rgb(var(--hl-line)/0.25)]">
      <Sub
        icon="transfer"
        aside={
          <button
            type="button"
            onClick={() => {
              play('click');
              setBalances(shuffleBalances());
              setRound((r) => r + 1);
            }}
            className="para tile flex h-8 items-center gap-2 bg-white/[0.06] px-5 text-[0.6875rem] font-semibold uppercase tracking-wider"
          >
            <Icon name="refresh" className="h-3.5 w-3.5" /> Shuffle
          </button>
        }
      >
        Settle-up lab · greedy
      </Sub>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-2 text-[0.625rem] font-semibold uppercase tracking-[0.25em] text-gold">Net balances</div>
          <ul className="space-y-1.5">
            {balances.map((b) => (
              <li key={b.id} className="grid grid-cols-[3.25rem_minmax(0,1fr)_5.75rem] items-center gap-2 text-xs">
                <span className="font-semibold text-white">{b.id}</span>
                {/* owes to the left of the centre line, is owed to the right */}
                <span aria-hidden className="relative h-5">
                  <span className="absolute inset-y-0 left-1/2 w-px bg-white/20" />
                  <motion.span
                    key={`${round}-${b.id}`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
                    className={`absolute inset-y-0.5 ${b.net >= 0 ? 'left-1/2 origin-left bg-ok/60' : 'right-1/2 origin-right bg-danger/60'}`}
                    style={{ width: `${(Math.abs(b.net) / max) * 50}%` }}
                  />
                </span>
                <span className={`text-right tabular-nums ${b.net > 0 ? 'text-ok' : b.net < 0 ? 'text-danger' : 'text-zinc-400'}`}>
                  {b.net > 0 ? '+' : ''}
                  {rupees(b.net)}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-2 text-[0.625rem] font-semibold uppercase tracking-[0.25em] text-gold">Suggested payments</div>
          <ol className="space-y-1.5">
            <AnimatePresence initial={false}>
              {transfers.map((t, i) => (
                <motion.li
                  key={`${round}-${i}`}
                  initial={{ x: -14, scale: 0.96 }}
                  animate={{ x: 0, scale: 1 }}
                  transition={{ delay: 0.15 + i * 0.12, type: 'spring', stiffness: 420, damping: 30 }}
                  className="para flex h-8 items-center gap-2 bg-white/[0.06] pl-5 pr-7 text-xs"
                >
                  <span className="font-semibold text-danger">{t.from}</span>
                  <Icon name="arrow" className="h-3.5 w-3.5 shrink-0 text-gold" />
                  <span className="font-semibold text-ok">{t.to}</span>
                  <span className="ml-auto font-display text-sm tabular-nums text-white">{rupees(t.amount)}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
          <p className="mt-3 text-xs leading-relaxed text-zinc-400">
            <span className="font-semibold text-white">{transfers.length}</span> payment{transfers.length === 1 ? '' : 's'} (at most n − 1 ={' '}
            {Math.max(open - 1, 0)}).{' '}
            <span className={ok ? 'font-semibold text-ok' : 'font-semibold text-danger'}>
              {ok ? 'Replayed: every balance reaches ₹0 ✓' : 'Replay failed'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function StateMachine() {
  const node = (label: string, tone: string) => (
    <span className={`cut px-3 py-1.5 font-display text-sm uppercase tracking-wide ${tone}`}>{label}</span>
  );
  const arrow = (label: string) => (
    <span className="flex flex-col items-center px-1 text-center">
      <span className="text-[0.625rem] font-semibold uppercase tracking-wider text-zinc-400">{label}</span>
      <Icon name="arrow" className="h-4 w-8 text-gold" />
    </span>
  );
  return (
    <div className="cut bg-white/[0.04] p-4 shadow-[inset_0_0_0_1px_rgb(var(--hl-line)/0.25)]">
      <Sub icon="history">Settlement lifecycle</Sub>
      <div className="flex flex-wrap items-center gap-y-3">
        {node('Pending', 'bg-white/10 text-white')}
        {arrow('receiver confirms')}
        {node('Completed', 'bg-ok/20 text-ok')}
        {arrow('void')}
        {node('Voided', 'bg-white/10 text-zinc-300')}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-y-3">
        {node('Pending', 'bg-white/10 text-white')}
        {arrow('cancel')}
        {node('Cancelled', 'bg-white/10 text-zinc-300')}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-zinc-400">
        Only these moves exist; anything else answers 409. Completing twice returns the same settlement, because the ledger entry
        reuses the request&apos;s _id. Pending payments never change a balance.
      </p>
    </div>
  );
}

function Algorithms() {
  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-sm leading-relaxed text-zinc-400">
        Both demos run the same algorithms as the Nexus backend (ported from its pure, unit-tested functions), in whole paise. Change
        the bill or shuffle the balances.
      </p>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SplitLab />
        <SettleLab />
      </div>
      <StateMachine />
    </div>
  );
}

/* ---------------- Security ---------------- */

const SESSION_CHAIN = ['nexus_session cookie', 'Verify JWT (HS256, iss, aud)', 'Session live? (15 s cache)', 'userId'];

function Security() {
  return (
    <div className="space-y-6">
      <div>
        <Sub icon="key">How a request is trusted</Sub>
        <ol className="flex flex-wrap items-center gap-y-2">
          {SESSION_CHAIN.map((s, i) => (
            <Fragment key={s}>
              <li className="para bg-white/[0.06] px-5 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-200">{s}</li>
              {i < SESSION_CHAIN.length - 1 && <Icon name="arrow" className="mx-1 h-4 w-6 shrink-0 text-gold" />}
            </Fragment>
          ))}
        </ol>
        <p className="mt-3 max-w-3xl text-xs leading-relaxed text-zinc-400">
          A session found active is remembered for up to 15 seconds, which saves a database round trip on most requests; a sign-out
          evicts it at once in the same process.
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {NEXUS_SECURITY.map((s) => (
          <li key={s.title} className="cut bg-white/[0.04] p-4 shadow-[inset_0_0_0_1px_rgb(var(--hl-line)/0.25)]">
            <div className="flex items-center gap-2.5">
              <span className="cut grid h-8 w-8 shrink-0 place-items-center bg-gradient-to-br from-flame to-flame-hot text-on-gold">
                <Icon name={s.icon} className="h-4 w-4" />
              </span>
              <h5 className="font-display text-base uppercase tracking-wide text-white">{s.title}</h5>
            </div>
            <ul className="mt-3 space-y-2">
              {s.points.map((p) => (
                <li key={p} className="flex gap-2.5 text-xs leading-relaxed text-zinc-300">
                  <span aria-hidden className="mt-[6px] h-1.5 w-1.5 shrink-0 rotate-45 bg-flame" />
                  {p}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- The LLD view ---------------- */

const CHAPTER: Record<LldChapter, () => JSX.Element> = {
  write: WritePath,
  data: DataModel,
  modules: Modules,
  algo: Algorithms,
  security: Security,
};

/** The low-level design of Nexus, in chapters. */
export function Lld({ chapter, onChapter }: { chapter: LldChapter; onChapter: (c: LldChapter) => void }) {
  const View = CHAPTER[chapter];
  return (
    <section className="panel overflow-hidden" aria-label="Low-level design">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
        <h3 className="flex items-center gap-2 font-display text-lg uppercase tracking-wide text-white">
          <span aria-hidden className="h-3.5 w-1 -skew-x-12 bg-flame" />
          Low-level design
        </h3>
        <div role="tablist" aria-label="LLD chapters" className="-mx-1 flex max-w-full gap-1.5 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {LLD_CHAPTERS.map((c) => {
            const active = c.id === chapter;
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  play('click');
                  onChapter(c.id);
                }}
                className={`para tile flex h-8 shrink-0 items-center gap-2 px-5 text-[0.6875rem] font-semibold uppercase tracking-wider ${
                  active ? 'bg-flame/25 text-white' : 'bg-white/[0.05] text-zinc-300'
                }`}
              >
                {active && <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-flame" />}
                <Icon name={c.icon} className="h-3.5 w-3.5 shrink-0 text-gold" />
                {c.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="p-4 sm:p-5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={chapter}
            initial={{ x: 18, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -18, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <View />
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
