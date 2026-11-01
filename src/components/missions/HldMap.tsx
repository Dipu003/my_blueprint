'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HLD_NODES, HLD_SCENARIOS } from '@/data/nexus';
import { gsap, reducedMotion } from '@/lib/gsap';
import { useMedia } from '@/lib/useMedia';
import { play } from '@/lib/sound';
import { Icon, ICON_PATHS } from '@/components/ui/Icon';

/* ---------------- Geometry ----------------
   Two drawings of the same system: a wide one for desktops and a tall one for phones (titles only, so
   the type stays readable). Boxes are given by their centre; an edge runs from one box side to
   another as a cubic curve, so it can be re-routed by moving the boxes. */

type Side = 't' | 'b' | 'l' | 'r';
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Pt {
  x: number;
  y: number;
  side: Side;
}
interface EdgeDef {
  a: Pt;
  b: Pt;
  label: string;
  /** How far the curve's handles reach out of the boxes. */
  k?: number;
  /** Where along the curve its label sits (0-1). */
  at?: number;
  /** Moves the label off the line (for short edges, so it does not hide the packet). */
  lift?: number;
}
interface Layout {
  w: number;
  h: number;
  nodes: Record<string, Box>;
  /** `end`: the zone's title sits at its right end (where the left one would collide with an edge label). */
  zones: { x: number; y: number; w: number; h: number; label: string; end?: boolean }[];
  edges: Record<string, EdgeDef>;
  title: number;
  /** Font size of the second line in a box; 0 = titles only. */
  sub: number;
  label: number;
}

const NORMAL: Record<Side, [number, number]> = { t: [0, -1], b: [0, 1], l: [-1, 0], r: [1, 0] };

/** A point on one side of a box, `shift` units along that side from its middle. */
function side(nodes: Record<string, Box>, id: string, s: Side, shift = 0): Pt {
  const n = nodes[id];
  if (s === 't' || s === 'b') return { x: n.x + shift, y: n.y + (s === 't' ? -n.h / 2 : n.h / 2), side: s };
  return { x: n.x + (s === 'l' ? -n.w / 2 : n.w / 2), y: n.y + shift, side: s };
}

function curve(e: EdgeDef) {
  const dist = Math.hypot(e.b.x - e.a.x, e.b.y - e.a.y);
  const k = e.k ?? Math.min(140, Math.max(20, dist * 0.45));
  const [ax, ay] = NORMAL[e.a.side];
  const [bx, by] = NORMAL[e.b.side];
  const p = [e.a.x, e.a.y, e.a.x + ax * k, e.a.y + ay * k, e.b.x + bx * k, e.b.y + by * k, e.b.x, e.b.y];
  const t = e.at ?? 0.5;
  const u = 1 - t;
  const c = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  const mid = {
    x: c[0] * p[0] + c[1] * p[2] + c[2] * p[4] + c[3] * p[6],
    y: c[0] * p[1] + c[1] * p[3] + c[2] * p[5] + c[3] * p[7] - (e.lift ?? 0),
  };
  const r = (v: number) => Math.round(v * 10) / 10;
  return { d: `M${r(p[0])} ${r(p[1])}C${r(p[2])} ${r(p[3])} ${r(p[4])} ${r(p[5])} ${r(p[6])} ${r(p[7])}`, mid };
}

function wideLayout(): Layout {
  const nodes: Record<string, Box> = {
    dns: { x: 125, y: 82, w: 200, h: 60 },
    user: { x: 125, y: 250, w: 200, h: 60 },
    gh: { x: 125, y: 420, w: 200, h: 60 },
    ci: { x: 125, y: 522, w: 200, h: 60 },
    caddy: { x: 362, y: 250, w: 186, h: 60 },
    web: { x: 625, y: 152, w: 200, h: 60 },
    api: { x: 625, y: 330, w: 200, h: 60 },
    deploy: { x: 625, y: 522, w: 200, h: 60 },
    db: { x: 884, y: 330, w: 186, h: 60 },
  };
  const at = (id: string, s: Side, shift = 0) => side(nodes, id, s, shift);
  return {
    w: 1000,
    h: 600,
    title: 15,
    sub: 11,
    label: 10.5,
    nodes,
    zones: [
      { x: 262, y: 40, w: 492, h: 536, label: 'Oracle Cloud VM · Mumbai · Ubuntu 24.04' },
      { x: 508, y: 102, w: 234, h: 284, label: 'systemd' },
      { x: 778, y: 272, w: 212, h: 116, label: 'Managed database' },
      { x: 18, y: 376, w: 214, h: 186, label: 'GitHub' },
    ],
    edges: {
      dns: { a: at('user', 't'), b: at('dns', 'b'), label: 'DNS' },
      https: { a: at('user', 'r'), b: at('caddy', 'l'), label: 'HTTPS', lift: 17 },
      web: { a: at('caddy', 'r', -12), b: at('web', 'l'), label: '/' },
      api: { a: at('caddy', 'r', 12), b: at('api', 'l'), label: '/api/v1' },
      db: { a: at('api', 'r'), b: at('db', 'l'), label: 'TLS' },
      push: { a: at('gh', 'b'), b: at('ci', 't'), label: 'push' },
      ssh: { a: at('ci', 'r', 14), b: at('deploy', 'l', 14), label: 'SSH' },
      restart: { a: at('deploy', 't'), b: { x: 625, y: 386, side: 'b' }, label: 'restart' },
      health: { a: at('ci', 'r', -14), b: at('caddy', 'b'), label: 'health check', k: 110 },
    },
  };
}

function tallLayout(): Layout {
  const nodes: Record<string, Box> = {
    user: { x: 95, y: 60, w: 150, h: 48 },
    dns: { x: 305, y: 60, w: 150, h: 48 },
    caddy: { x: 130, y: 175, w: 160, h: 48 },
    web: { x: 112, y: 315, w: 160, h: 48 },
    api: { x: 288, y: 315, w: 160, h: 48 },
    deploy: { x: 98, y: 505, w: 150, h: 48 },
    db: { x: 297, y: 656, w: 164, h: 48 },
    ci: { x: 106, y: 666, w: 164, h: 48 },
    gh: { x: 106, y: 796, w: 164, h: 48 },
  };
  const at = (id: string, s: Side, shift = 0) => side(nodes, id, s, shift);
  return {
    w: 400,
    h: 870,
    title: 15,
    sub: 0,
    label: 11.5,
    nodes,
    zones: [
      { x: 12, y: 118, w: 376, h: 452, label: 'Oracle Cloud VM · Mumbai', end: true },
      { x: 24, y: 244, w: 352, h: 126, label: 'systemd' },
      { x: 206, y: 608, w: 182, h: 96, label: 'Database' },
      { x: 12, y: 608, w: 188, h: 238, label: 'GitHub' },
    ],
    edges: {
      dns: { a: at('user', 'r'), b: at('dns', 'l'), label: 'DNS' },
      https: { a: at('user', 'b'), b: at('caddy', 't'), label: 'HTTPS' },
      web: { a: at('caddy', 'b', -16), b: at('web', 't'), label: '/' },
      api: { a: at('caddy', 'r'), b: at('api', 't'), label: '/api/v1' },
      db: { a: at('api', 'b'), b: at('db', 't'), label: 'TLS' },
      push: { a: at('gh', 't'), b: at('ci', 'b'), label: 'push' },
      ssh: { a: at('ci', 't', -10), b: at('deploy', 'b'), label: 'SSH' },
      restart: { a: at('deploy', 't'), b: { x: 98, y: 370, side: 'b' }, label: 'restart' },
      health: { a: at('ci', 't', 42), b: at('api', 'b', -40), label: 'health', k: 110, at: 0.6 },
    },
  };
}

/** Box outline with two cut corners, the site's signature shape. */
const cutBox = (w: number, h: number, c = 10) => `M0 0H${w - c}L${w} ${c}V${h}H${c}L0 ${h - c}Z`;

/** Seconds a caption stays up: long enough to read it, never shorter than its hops. */
const readTime = (text: string) => 1.2 + text.split(/\s+/).length * 0.2;

/* ---------------- The map ---------------- */

/**
 * The high-level design of Nexus as a live map, played like a story: pick a scenario (open the app,
 * add an expense, settle up, ship a change) and a request travels the lines step by step, lighting the
 * boxes it passes through, with a caption for each step. Plays only while it is on screen; with reduced
 * motion it is a still map you step through by hand.
 */
export function HldMap() {
  const wide = useMedia('(min-width: 1024px)');
  const L = useMemo(() => (wide ? wideLayout() : tallLayout()), [wide]);
  const curves = useMemo(
    () => Object.fromEntries(Object.entries(L.edges).map(([id, e]) => [id, curve(e)])),
    [L],
  );

  const [sc, setSc] = useState(0);
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [still, setStill] = useState(false); // reduced motion: no autoplay, no packets
  useEffect(() => setStill(reducedMotion()), []);

  const scenario = HLD_SCENARIOS[sc];
  const cur = scenario.steps[Math.min(step, scenario.steps.length - 1)];
  // edge id -> true when the step's first trip along it is a reply (its dashes then flow backwards)
  const liveEdges = new Map<string, boolean>();
  cur.hops.forEach(([e, reply]) => {
    if (!liveEdges.has(e)) liveEdges.set(e, !!reply);
  });
  const lit = new Set(cur.lit);

  const root = useRef<HTMLDivElement>(null);
  const dot = useRef<SVGGElement>(null);
  const paths = useRef<Record<string, SVGPathElement | null>>({});
  const comets = useRef<Record<string, SVGPathElement | null>>({});
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const starts = useRef<number[]>([]);
  const inView = useRef(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  const resume = useCallback(() => {
    const t = tl.current;
    if (!t) return;
    if (inView.current && !pausedRef.current) t.play();
    else t.pause();
  }, []);

  // Build the story of the current scenario as one timeline: packets along the edges, the progress
  // bars, and the step number (read back from the playhead, so seeking also moves the caption).
  useLayoutEffect(() => {
    if (still) return;
    const ctx = gsap.context(() => {
      const t = gsap.timeline({
        paused: true,
        onUpdate: () => {
          const now = t.time();
          let i = 0;
          starts.current.forEach((s, j) => {
            if (now >= s - 0.001) i = j;
          });
          setStep((p) => (p === i ? p : i));
        },
      });
      const segs = bars.current.slice(0, scenario.steps.length).filter(Boolean) as HTMLSpanElement[];
      t.set(segs, { scaleX: 0 }, 0);
      t.set(dot.current, { autoAlpha: 0 }, 0);
      starts.current = [];

      scenario.steps.forEach((st, i) => {
        const t0 = t.duration();
        starts.current.push(t0);
        let at = t0 + 0.3;
        st.hops.forEach(([edge, reply]) => {
          const path = paths.current[edge];
          const comet = comets.current[edge];
          if (!path || !comet) return;
          const len = path.getTotalLength();
          const seg = Math.min(90, len * 0.6);
          const dur = 0.7 + Math.min(0.6, len / 700);
          t.set(dot.current, { autoAlpha: 1 }, at);
          t.to(
            dot.current,
            {
              motionPath: { path, align: path, alignOrigin: [0.5, 0.5], start: reply ? 1 : 0, end: reply ? 0 : 1 },
              duration: dur,
              ease: 'power1.inOut',
              immediateRender: false,
            },
            at,
          );
          t.fromTo(
            comet,
            { strokeDasharray: `${seg} ${len + seg}`, strokeDashoffset: reply ? -len : seg, opacity: 1 },
            { strokeDashoffset: reply ? 0 : seg - len, duration: dur, ease: 'power1.inOut', immediateRender: false },
            at,
          );
          t.to(comet, { opacity: 0, duration: 0.3, immediateRender: false }, at + dur);
          at += dur + 0.05;
        });
        t.set(dot.current, { autoAlpha: 0 }, at);
        const dur = Math.max(at - t0 + 1.2, readTime(st.say));
        if (segs[i]) t.fromTo(segs[i], { scaleX: 0 }, { scaleX: 1, duration: dur, ease: 'none', immediateRender: false }, t0);
        else t.to({}, { duration: dur }, t0);
      });
      // Then on to the next scenario, like the next story. Part of the timeline, so switching scenario
      // or leaving the tab cancels it with everything else.
      t.call(() => setSc((s) => (s + 1) % HLD_SCENARIOS.length), [], t.duration() + 1.1);

      tl.current = t;
      setStep(0);
      resume();
    }, root);
    return () => {
      tl.current = null;
      ctx.revert();
    };
  }, [scenario, L, still, resume]);

  // Play only while the map is on screen.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      inView.current = e.isIntersecting;
      resume();
    }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, [resume]);

  useEffect(() => resume(), [paused, resume]);

  const pick = (i: number) => {
    play('click');
    if (i === sc) {
      tl.current?.seek(0);
      setStep(0);
    } else {
      setSc(i);
      setStep(0);
    }
  };

  const goStep = (dir: 1 | -1) => {
    play('click');
    const n = step + dir;
    if (n < 0 || n >= scenario.steps.length) {
      setSc((s) => (s + dir + HLD_SCENARIOS.length) % HLD_SCENARIOS.length);
      setStep(0);
      return;
    }
    setStep(n);
    tl.current?.seek(starts.current[n] ?? 0);
  };

  return (
    <div ref={root} className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
        <h3 className="flex items-center gap-2 font-display text-lg uppercase tracking-wide text-white">
          <span aria-hidden className="h-3.5 w-1 -skew-x-12 bg-flame" />
          Architecture · live map
        </h3>
        <div role="tablist" aria-label="Scenarios" className="-mx-1 flex max-w-full gap-1.5 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {HLD_SCENARIOS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === sc}
              onClick={() => pick(i)}
              className={`para tile flex h-8 shrink-0 items-center px-5 text-[0.6875rem] font-semibold uppercase tracking-wider ${
                i === sc ? 'bg-flame/25 text-white' : 'bg-white/[0.05] text-zinc-300'
              }`}
            >
              {i === sc && <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-flame" />}
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* story progress, one bar per step */}
      <div aria-hidden className="flex gap-1 px-4 pt-3 sm:px-5">
        {scenario.steps.map((_, i) => (
          <span key={`${scenario.id}-${i}`} className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
            <span
              ref={(el) => {
                bars.current[i] = el;
              }}
              className="block h-full origin-left bg-gradient-to-r from-flame to-neon"
              style={still ? { transform: `scaleX(${i <= step ? 1 : 0})` } : { transform: 'scaleX(0)' }}
            />
          </span>
        ))}
      </div>

      <div className={`mx-auto px-2 pt-2 sm:px-4 ${wide ? '' : 'max-w-[30rem]'}`}>
        <svg
          viewBox={`0 0 ${L.w} ${L.h}`}
          className="bp-map block h-auto w-full"
          role="img"
          aria-labelledby="hld-title"
          data-playing={!still}
        >
          <title id="hld-title">
            Nexus architecture: browser, DuckDNS, Caddy on an Oracle Cloud VM serving Next.js and the NestJS API, MongoDB Atlas, and
            the GitHub Actions deploy path.
          </title>
          <defs>
            <pattern id="bp-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M20 0H0V20" className="bp-grid-line" />
            </pattern>
            <marker id="bp-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 1L9 5L0 9z" className="bp-arrowhead" />
            </marker>
            <linearGradient id="bp-tile" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" className="bp-tile-a" />
              <stop offset="1" className="bp-tile-b" />
            </linearGradient>
          </defs>

          <rect width={L.w} height={L.h} fill="url(#bp-grid)" />

          {L.zones.map((z) => (
            <g key={z.label} className="bp-zone">
              <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="14" />
              <text x={z.end ? z.x + z.w - 12 : z.x + 12} y={z.y - 8} fontSize={L.label} textAnchor={z.end ? 'end' : 'start'}>
                {z.label}
              </text>
            </g>
          ))}

          {Object.entries(curves).map(([id, c]) => (
            <g key={id}>
              <path
                d={c.d}
                className={`bp-edge ${liveEdges.has(id) ? 'on' : ''} ${liveEdges.get(id) ? 'back' : ''}`}
                markerEnd="url(#bp-arrow)"
              />
              <path
                ref={(el) => {
                  paths.current[id] = el;
                }}
                d={c.d}
                className="bp-track"
              />
              <path
                ref={(el) => {
                  comets.current[id] = el;
                }}
                d={c.d}
                className="bp-comet"
              />
            </g>
          ))}

          {Object.entries(curves).map(([id, c]) => {
            const label = L.edges[id].label;
            const w = label.length * L.label * 0.62 + 14;
            const h = L.label + 9;
            return (
              <g key={id} className={`bp-elabel ${liveEdges.has(id) ? 'on' : ''}`} transform={`translate(${c.mid.x - w / 2} ${c.mid.y - h / 2})`}>
                <rect width={w} height={h} rx={h / 2} />
                <text x={w / 2} y={h / 2} fontSize={L.label} textAnchor="middle" dominantBaseline="central">
                  {label}
                </text>
              </g>
            );
          })}

          {Object.entries(L.nodes).map(([id, n]) => {
            const def = HLD_NODES[id];
            const tile = n.h - 24;
            const tx = 12 + tile + 10;
            return (
              <g key={id} className={`bp-node ${lit.has(id) ? 'on' : ''}`} transform={`translate(${n.x - n.w / 2} ${n.y - n.h / 2})`}>
                <path d={cutBox(n.w, n.h)} className="bp-ring" />
                <path d={cutBox(n.w, n.h)} className="bp-box" />
                <rect x="12" y="12" width={tile} height={tile} rx="6" fill="url(#bp-tile)" />
                <g
                  transform={`translate(${12 + tile * 0.18} ${12 + tile * 0.18}) scale(${(tile * 0.64) / 24})`}
                  className="bp-glyph"
                >
                  {ICON_PATHS[def.icon].map((d) => (
                    <path key={d} d={d} />
                  ))}
                </g>
                {L.sub ? (
                  <>
                    <text x={tx} y={n.h / 2 - 3} fontSize={L.title} className="bp-title">
                      {def.title}
                    </text>
                    <text x={tx} y={n.h / 2 + 13} fontSize={L.sub} className="bp-sub">
                      {def.sub}
                    </text>
                  </>
                ) : (
                  <text x={tx} y={n.h / 2} fontSize={L.title} className="bp-title" dominantBaseline="central">
                    {def.title}
                  </text>
                )}
              </g>
            );
          })}

          <g ref={dot} className="bp-packet" style={{ visibility: 'hidden' }}>
            <circle r="11" className="bp-halo" />
            <circle r="4.5" className="bp-core" />
          </g>
        </svg>
      </div>

      {/* caption, like the text on a reel */}
      <div className="border-t border-white/10 px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <span className="cut shrink-0 bg-gradient-to-br from-flame to-flame-hot px-2.5 py-1 font-display text-sm tabular-nums text-on-gold">
            {String(step + 1).padStart(2, '0')}/{String(scenario.steps.length).padStart(2, '0')}
          </span>
          <div className="min-h-[3rem] min-w-0 flex-1 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={`${scenario.id}-${step}`}
                initial={{ y: '110%' }}
                animate={{ y: 0 }}
                exit={{ y: '-110%' }}
                transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
                className="text-sm leading-relaxed text-zinc-200 sm:text-base"
              >
                {cur.say}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <ul aria-label="In this step" className="flex min-h-7 flex-wrap gap-1.5">
            {(cur.chips ?? []).map((c, i) => (
              <motion.li
                key={`${scenario.id}-${step}-${c}`}
                initial={still ? false : { scale: 0.6, y: 6 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 520, damping: 26, delay: 0.25 + i * 0.12 }}
                className="para bg-flame/15 px-4 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-gold"
              >
                {c}
              </motion.li>
            ))}
          </ul>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => goStep(-1)} aria-label="Previous step" className="para tile grid h-8 w-12 place-items-center bg-white/[0.06]">
              <Icon name="back" className="h-4 w-4" />
            </button>
            {!still && (
              <button
                type="button"
                onClick={() => {
                  play('click');
                  setPaused((p) => !p);
                }}
                aria-label={paused ? 'Play' : 'Pause'}
                className="para tile grid h-8 w-12 place-items-center bg-white/[0.06]"
              >
                <Icon name={paused ? 'play' : 'pause'} className="h-4 w-4" />
              </button>
            )}
            <button type="button" onClick={() => goStep(1)} aria-label="Next step" className="para tile grid h-8 w-12 place-items-center bg-white/[0.06]">
              <Icon name="arrow" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <ol className="sr-only">
        {scenario.steps.map((s) => (
          <li key={s.say}>{s.say}</li>
        ))}
      </ol>
    </div>
  );
}
