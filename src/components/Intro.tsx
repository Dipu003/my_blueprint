'use client';

import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { PLAYER } from '@/data/portfolio';
import { CharacterSlot } from '@/components/character/CharacterSlot';
import { loadStage } from '@/components/character/load';
import { Icon } from '@/components/ui/Icon';
import { GameButton } from '@/components/ui/GameButton';
import { Snow } from '@/components/hud/Snow';
import { gsap, reducedMotion } from '@/lib/gsap';
import { play } from '@/lib/sound';
import { useMedia } from '@/lib/useMedia';
import { INTRO_LINES, VOICE, lineSeconds, preloadIntro, speak, stopSpeaking } from '@/lib/voice';
import { useGame } from '@/providers/GameProvider';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Resolves once the browser tab is in front again. */
const whenVisible = () =>
  new Promise<void>((resolve) => {
    if (!document.hidden) return resolve();
    const on = () => {
      if (document.hidden) return;
      document.removeEventListener('visibilitychange', on);
      resolve();
    };
    document.addEventListener('visibilitychange', on);
  });

/**
 * A caption whose words appear one by one, spread over `seconds`, in step with the voice. GSAP lifts each
 * word up out of its own slot, sharp and solid the whole way, so it reads on the light page too.
 */
function Caption({ text, seconds }: { text: string; seconds: number }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const words = text.split(' ');

  useLayoutEffect(() => {
    if (!ref.current || reducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.cap-word',
        { yPercent: 112 },
        { yPercent: 0, duration: 0.42, ease: 'back.out(1.4)', stagger: (seconds * 0.8) / words.length },
      );
    }, ref);
    return () => ctx.revert();
  }, [text, seconds, words.length]);

  return (
    <p ref={ref} className="font-ui text-xl font-semibold leading-snug text-white sm:text-[1.55rem] short:text-lg">
      {words.map((w, i) => (
        <Fragment key={i}>
          {i > 0 && ' '}
          <span className="cap-mask">
            <span className="cap-word inline-block">{w}</span>
          </span>
        </Fragment>
      ))}
    </p>
  );
}

/** The line counter: each dot fills while its line is spoken (a GSAP tween as long as the line). */
function Dots({ line, seconds, done }: { line: number; seconds: number; done: boolean }) {
  const fills = useRef<(HTMLSpanElement | null)[]>([]);
  useLayoutEffect(() => {
    fills.current.forEach((el, i) => {
      if (!el) return;
      gsap.killTweensOf(el);
      if (i < line || (i === line && done) || (i === line && reducedMotion())) gsap.set(el, { scaleX: 1 });
      else if (i === line) gsap.fromTo(el, { scaleX: 0 }, { scaleX: 1, duration: seconds, ease: 'none' });
      else gsap.set(el, { scaleX: 0 });
    });
  }, [line, seconds, done]);
  return (
    <div className="in-panel-item mt-4 flex items-center gap-1.5 short:mt-2" aria-hidden>
      {INTRO_LINES.map((_, i) => (
        <span key={i} className="relative h-1.5 w-7 -skew-x-12 overflow-hidden bg-white/15">
          <span
            ref={(el) => {
              fills.current[i] = el;
            }}
            className="absolute inset-0 origin-left bg-flame"
            style={{ transform: 'scaleX(0)' }}
          />
        </span>
      ))}
    </div>
  );
}

/** Radio-transmission bars: they dance while he is talking and rest between lines. */
function Bars({ active }: { active: boolean }) {
  return (
    <div aria-hidden className="flex h-5 items-center gap-[3px]">
      {[0, 0.12, 0.24, 0.08, 0.2].map((d, i) => (
        <span key={i} className="comms-bar" style={{ animationDelay: `${d}s`, animationPlayState: active ? 'running' : 'paused', opacity: active ? 1 : 0.35 }} />
      ))}
    </div>
  );
}

/**
 * The welcome scene: a 3D game character of Deepak materialises on a hologram pad, waves and introduces
 * himself line by line (voice, captions and gestures in step, his mouth following the speech), then
 * waits for "Enter lobby". Skip (button, Esc, Enter or Space) goes straight to the site at any time.
 */
export function Intro() {
  const { finishIntro, soundOn, toggleSound } = useGame();
  const [line, setLine] = useState(-1);
  const [seconds, setSeconds] = useState(2);
  const [speaking, setSpeaking] = useState(false);
  const [done, setDone] = useState(false);
  const desktop = useMedia('(min-width: 768px)', true);
  const stopped = useRef(false);
  const mountedAt = useRef(0);
  const root = useRef<HTMLDivElement>(null);

  // Opening shot (GSAP): letterbox bars slide in, the giant name rises letter by letter behind him, the panel
  // swings in like a card on a hinge and its rows follow, then the name drifts slowly while he talks.
  useLayoutEffect(() => {
    if (reducedMotion()) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.in-bar-top', { yPercent: -101, duration: 0.8 }, 0)
        .from('.in-bar-bot', { yPercent: 101, duration: 0.8 }, 0)
        .from('.in-mark-char', { yPercent: 115, opacity: 0, duration: 1, stagger: 0.06, ease: 'power4.out' }, 0.15)
        .from('.in-panel', { x: 80, rotationY: 30, opacity: 0, transformPerspective: 1100, transformOrigin: '0% 50%', duration: 1, ease: 'power4.out' }, 0.35)
        .from('.in-panel-item', { y: 18, opacity: 0, duration: 0.55, stagger: 0.08 }, 0.8)
        .from('.in-corner', { opacity: 0, scale: 0.7, duration: 0.5, stagger: 0.1, ease: 'back.out(2)' }, 1);
      gsap.to('.in-mark', { xPercent: -3, duration: 16, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    }, root);
    return () => ctx.revert();
  }, []);

  const leave = useCallback(() => {
    if (stopped.current) return;
    stopped.current = true;
    stopSpeaking();
    play('click');
    finishIntro();
  }, [finishIntro]);

  // The script: wait for him to be ready, bring him in, then say each line with its gesture.
  useEffect(() => {
    mountedAt.current = performance.now();
    const alive = () => !stopped.current;
    let cancelled = false;
    const live = () => alive() && !cancelled;

    (async () => {
      const stage = await loadStage();
      if (!live()) return;
      if (!stage) return leave(); // no WebGL: carry on to the site without him
      await Promise.race([preloadIntro(), sleep(4000)]);
      await sleep(250); // the canvas moves into its slot first
      if (!live()) return;
      stage.boy.pose('idle');
      stage.materialise();
      await sleep(1500);

      for (let i = 0; i < INTRO_LINES.length && live(); i++) {
        const l = INTRO_LINES[i];
        setSeconds(await lineSeconds(l));
        if (!live()) return;
        setLine(i);
        stage.boy.pose(l.gesture);
        stage.showChips(!!l.chips); // the key-skills lines: his skills orbit him as tags
        setSpeaking(true);
        let completed = false;
        while (!completed && live()) {
          if (document.hidden) await whenVisible(); // paused while the browser tab is in the background
          if (!live()) return;
          completed = await speak(l);
        }
        setSpeaking(false);
        await sleep(VOICE.gap * 1000);
      }
      if (!live()) return;
      setDone(true);
      await sleep(2600);
      if (live()) stage.boy.pose('idle');
    })();

    return () => {
      cancelled = true;
      stopSpeaking();
      void loadStage().then((s) => s?.showChips(false));
    };
  }, [leave]);

  // Esc, Enter or Space move on. (A moment's grace so the key that pressed "Start" cannot also skip.)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key !== 'Escape' && e.key !== 'Enter' && e.key !== ' ') return;
      if (performance.now() - mountedAt.current < 700) return;
      e.preventDefault();
      leave();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [leave]);

  return (
    <motion.div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label="Introduction"
      className="fixed inset-0 z-50 overflow-hidden bg-ink"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div aria-hidden className="load-glow absolute inset-0" />
      <div aria-hidden className="stripes absolute inset-0" />
      <Snow className="absolute inset-0 h-full w-full" density={0.8} />
      <div aria-hidden className="absolute -right-[8%] top-0 h-full w-[34%] -skew-x-[18deg] bg-gradient-to-l from-flame/[0.10] to-transparent" />
      <div aria-hidden className="absolute left-[8%] top-0 h-full w-[5%] -skew-x-[18deg] bg-white/[0.025]" />

      {/* the giant name behind him, and the letterbox bars */}
      <div aria-hidden className="in-mark pointer-events-none absolute inset-y-0 left-[3%] flex items-center">
        <div className="watermark flex select-none overflow-hidden whitespace-nowrap font-display uppercase leading-none" style={{ fontSize: 'clamp(7rem, 24vw, 21rem)' }}>
          {'DEEPAK'.split('').map((c, i) => (
            <span key={i} className="in-mark-char inline-block">
              {c}
            </span>
          ))}
        </div>
      </div>
      <div aria-hidden className="in-bar-top pointer-events-none absolute inset-x-0 top-0 z-[5] h-[5vh] bg-ink-2">
        <span className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent" />
      </div>
      <div aria-hidden className="in-bar-bot pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-[5vh] bg-ink-2">
        <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent" />
      </div>

      {/* the boy */}
      {/* The canvas covers the whole screen, so the glow has no edge; he stands on the left (desktop) or in
          the top half (phones), and the panel sits over the rest. */}
      <CharacterSlot mode="intro" view={desktop ? { ax: 0.28, fill: 0.92 } : { ay: 0.31, fill: 0.44 }} className="absolute inset-0" />

      {/* sound on / off, top right */}
      <button
        type="button"
        aria-pressed={soundOn}
        aria-label={soundOn ? 'Mute the intro' : 'Unmute the intro'}
        onClick={toggleSound}
        className={`in-corner para absolute right-4 top-4 z-10 grid h-9 w-12 place-items-center transition-colors sm:right-8 sm:top-6 ${
          soundOn ? 'bg-flame/20 text-gold hover:bg-flame/30' : 'bg-white/[0.06] text-zinc-400 hover:text-white'
        }`}
      >
        <Icon name={soundOn ? 'sound' : 'mute'} className="h-5 w-5" />
      </button>

      {/* what he says */}
      <div className="absolute inset-x-0 bottom-0 flex h-[50%] items-center px-4 pb-5 md:inset-y-0 md:left-auto md:h-auto md:w-[48%] md:pl-0 md:pr-12">
        <section className="in-panel panel w-full max-w-xl px-5 py-5 sm:px-8 sm:py-7 short:py-3">
          <div className="in-panel-item flex items-center justify-between gap-4 short:hidden">
            <div className="flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.3em] text-gold">
              <span className="h-2 w-2 animate-dot rounded-full bg-flame" /> Incoming transmission
            </div>
            <Bars active={speaking} />
          </div>

          <div className="in-panel-item mt-4 flex items-center gap-3 short:mt-0">
            <div className="cut grid h-12 w-12 shrink-0 place-items-center bg-gradient-to-br from-flame to-flame-hot font-display text-xl text-on-gold">
              {PLAYER.initials}
            </div>
            <div className="min-w-0">
              <div className="font-display text-2xl uppercase leading-none tracking-wide text-white">{PLAYER.name}</div>
              <div className="mt-1 text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-zinc-400">Operator · online</div>
            </div>
          </div>

          <div aria-live="polite" className="in-panel-item mt-5 min-h-[7.6rem] sm:min-h-[9.4rem] short:mt-2 short:min-h-[5.2rem]">
            {line >= 0 && <Caption key={line} text={INTRO_LINES[line].text} seconds={seconds} />}
          </div>

          <Dots line={line} seconds={seconds} done={done} />

          <div className="in-panel-item mt-6 flex min-h-[3.6rem] short:mt-3 flex-wrap items-center justify-between gap-3">
            {!done && (
              <button
                type="button"
                onClick={leave}
                className="para tile flex h-10 items-center gap-2 bg-white/[0.07] pl-6 pr-8 font-display text-lg uppercase tracking-wide"
              >
                Skip intro <Icon name="arrow" className="h-4 w-4 text-gold" />
              </button>
            )}
            {done && (
              <motion.div className="ml-auto" initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                <GameButton label="Enter lobby" sub="Start exploring" onClick={leave} />
              </motion.div>
            )}
          </div>
        </section>
      </div>
    </motion.div>
  );
}
