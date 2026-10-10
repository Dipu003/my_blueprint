'use client';

import { useLayoutEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FEED, KEY_SKILLS, OPEN_TO, PLAYER } from '@/data/portfolio';
import { useGame } from '@/providers/GameProvider';
import { CharacterSlot } from '@/components/character/CharacterSlot';
import { loadStage } from '@/components/character/load';
import { INTRO_LINES, mouth, speak } from '@/lib/voice';
import { play } from '@/lib/sound';
import { gsap, reducedMotion, SplitText } from '@/lib/gsap';
import { useMedia } from '@/lib/useMedia';
import { Panel } from '@/components/ui/Panel';
import { GameButton } from '@/components/ui/GameButton';
import { Emblem } from '@/components/ui/Emblem';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Radar } from '@/components/ui/Radar';
import { Rank } from '@/components/ui/Rank';
import { roleIcon } from '@/components/ui/roleIcon';
import { item, stagger } from './motion';

/**
 * The 3D operator: Deepak's game character on his hologram pad. His eyes follow the pointer; click him
 * and he waves and says hello. "Replay intro" brings the welcome speech back.
 */
const SKILL_ICON: Record<string, IconName> = {
  'Node.js': 'server',
  NestJS: 'code',
  AWS: 'cloud',
  DevOps: 'infinity',
  Kafka: 'bolt',
  'Agentic AI': 'chip',
  MongoDB: 'database',
  'Problem Solving': 'puzzle',
};

function OperatorStage() {
  const { phase, introExited, replayIntro } = useGame();
  const small = useMedia('(max-width: 639px), (max-height: 520px)');
  const active = phase === 'ready' && introExited;

  const wave = async () => {
    const stage = await loadStage();
    if (!stage) return;
    play('confirm');
    stage.play('wave', 2200);
    if (!mouth().speaking) void speak(INTRO_LINES[0]); // "Hey there!"
  };

  return (
    <div className="relative h-[23rem] sm:h-[27rem] xl:h-[35rem] short:h-[17rem]">
      {/* a faint radar behind him */}
      <Radar className="absolute right-0 top-2 hidden h-56 w-56 opacity-40 xl:block" />
      {/* wider than its column, so an outstretched arm is never cut off */}
      <CharacterSlot mode={small ? 'bust' : 'lobby'} active={active} className="absolute inset-y-0 inset-x-0 sm:-inset-x-8 xl:-inset-x-12" />
      <button
        type="button"
        onClick={wave}
        aria-label={"Wave at " + PLAYER.firstName + "'s avatar"}
        className="absolute left-1/2 top-[6%] h-[80%] w-[44%] -translate-x-1/2 rounded-[40%]"
      />
      <div className="absolute inset-x-0 bottom-0 flex justify-center">
        <button
          type="button"
          onClick={replayIntro}
          className="para tile flex h-9 items-center gap-2 bg-black/50 pl-6 pr-8 font-display text-base uppercase tracking-wide"
        >
          <Icon name="play" className="h-4 w-4 text-gold" /> Replay intro
        </button>
      </div>
    </div>
  );
}

export function Lobby() {
  const { go, openRole, years, phase, introExited } = useGame();
  const root = useRef<HTMLDivElement>(null);
  // The hero title is staged with GSAP once the lobby is actually on screen (after the intro has faded out).
  const live = phase === 'ready' && introExited;

  useLayoutEffect(() => {
    if (reducedMotion()) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'power4.out' } });
      // the two name lines rise out of a slot, solid all the way, then their 3D depth pops out
      tl.fromTo('.hero-line', { yPercent: 140, '--ex-k': 0 }, { yPercent: 0, duration: 0.9, stagger: 0.13 });
      tl.to('.hero-line', { '--ex-k': 1, duration: 0.55, stagger: 0.13, ease: 'back.out(2.4)' }, 0.55);
      // the role title types in, letter by letter
      const role = SplitText.create('.hero-role', { type: 'chars', mask: 'chars' });
      tl.from(role.chars, { yPercent: 100, duration: 0.32, stagger: 0.022, ease: 'power3.out' }, 0.4);
      // the experience figure counts up
      tl.fromTo('.count-up', { textContent: 0 }, { textContent: years, duration: 1.2, ease: 'power2.out', snap: { textContent: 1 } }, 0.5);
      if (live) tl.play();
      else tl.progress(0); // parked at the first frame (hidden) behind the intro
    }, root);
    return () => ctx.revert();
  }, [live, years]);

  return (
    <motion.div ref={root} variants={stagger} initial="hidden" animate="show" className="space-y-8">
      <div className="lobby-grid">
        <div className="lobby-text relative">
          <motion.div variants={item} className="relative flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.3em] text-gold">
            <Rank count={3} className="h-4 w-4" /> Operator profile
          </motion.div>

          <h1 className="relative mt-2 font-display text-[clamp(2.4rem,5vw,3.9rem)] uppercase leading-[1] tracking-wide">
            <span className="hero-mask">
              <span className="hero-line ex3d block text-white">{PLAYER.firstName}</span>
            </span>
            <span className="hero-mask">
              <span
                data-text={PLAYER.lastName}
                className="hero-line ex3d-grad block bg-[linear-gradient(90deg,rgb(var(--hero-a)),rgb(var(--hero-b)))] bg-clip-text pr-3 text-transparent"
              >
                {PLAYER.lastName}
              </span>
            </span>
          </h1>

          <p aria-label={PLAYER.title} className="hero-role relative mt-3 font-display text-2xl uppercase tracking-wider text-zinc-200">
            {PLAYER.title}
          </p>
          <motion.p variants={item} className="relative mt-3 max-w-xl text-base leading-relaxed text-zinc-400">
            {PLAYER.bio}
          </motion.p>

          <motion.div variants={item} className="relative mt-6">
            <GameButton label="Start missions" sub="Featured deployment" onClick={() => go('missions')} />
          </motion.div>

          <motion.ul variants={item} aria-label="Highlights" className="relative mt-7 max-w-xl space-y-1">
            {FEED.map((f) => (
              <li
                key={f.target}
                className="para tile flex min-h-9 flex-wrap items-center gap-x-2 bg-black/50 py-1.5 pl-5 pr-8 text-sm sm:h-9 sm:flex-nowrap sm:py-0"
              >
                <span aria-hidden className="font-display text-base leading-none text-gold">»</span>
                <span className="hidden font-display text-base uppercase tracking-wide sm:inline">Deepak</span>
                <span className="bg-white/10 px-1.5 text-[0.625rem] font-semibold uppercase tracking-widest text-gold">{f.weapon}</span>
                <span className="order-last basis-full pl-4 text-zinc-300 sm:order-none sm:min-w-0 sm:flex-1 sm:basis-auto sm:truncate sm:pl-0">
                  {f.target}
                </span>
                <span className="ml-auto font-display text-base text-danger sm:ml-0">{f.result}</span>
              </li>
            ))}
          </motion.ul>
        </div>

        <motion.div variants={item} className="lobby-stage">
          <OperatorStage />
        </motion.div>

        <motion.div variants={item} className="lobby-record">
          <Panel title="Key skills" tag="Core stack">
            <div className="flex items-center gap-4">
              <Emblem initials={PLAYER.initials} className="h-24 w-24 shrink-0 drop-shadow-[0_0_18px_rgb(var(--glow-e)/0.4)]" />
              <div className="min-w-0">
                <div className="font-display text-2xl uppercase leading-none text-white">{PLAYER.name}</div>
                <div className="mt-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-gold">
                  <Rank count={3} className="h-4 w-4 shrink-0" /> {PLAYER.rank}
                </div>
                <div className="mt-1 text-xs text-zinc-400">{PLAYER.location}</div>
                <span className="para mt-1.5 inline-block bg-hl/20 px-4 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider text-gold">
                  <span className="count-up tabular-nums">{years}</span> years experience
                </span>
              </div>
            </div>

            <ul aria-label="Key skills" className="mt-4 grid grid-cols-2 gap-2">
              {KEY_SKILLS.map((k) => (
                <li key={k.name} className="cut tile flex min-h-[3.7rem] items-center gap-3 bg-white/[0.05] px-3 py-2">
                  <span className="grid h-9 w-9 shrink-0 place-items-center bg-hl/20 text-gold">
                    <Icon name={SKILL_ICON[k.name] ?? 'star'} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block pr-2 font-display text-base uppercase leading-tight">{k.name}</span>
                    <span className="mt-1 block text-[0.625rem] font-bold uppercase leading-tight tracking-[0.1em] text-zinc-400 sm:tracking-[0.16em]">{k.group}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </motion.div>
      </div>

      <motion.section variants={item} aria-labelledby="open-to">
        <h2 id="open-to" className="mb-3 flex items-center gap-2 font-display text-xl uppercase tracking-wide text-white">
          <span aria-hidden className="h-4 w-1 -skew-x-12 bg-flame" /> Select mode
          <span className="ml-1 text-xs font-semibold not-italic tracking-[0.2em] text-zinc-500">OPEN TO</span>
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {OPEN_TO.map((o) => (
            <button
              key={o.role}
              type="button"
              aria-haspopup="dialog"
              onClick={() => openRole(o.id)}
              className="para tile flex h-full min-h-[6.75rem] flex-col items-start justify-between bg-white/[0.05] px-8 py-3 text-left"
            >
              <span className="flex items-center gap-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.25em] text-gold">
                <Icon name={roleIcon(o.role)} className="h-4 w-4" /> Role
              </span>
              <span className="line-clamp-2 font-display text-xl uppercase leading-tight">{o.role}</span>
              <span className="text-xs text-zinc-400">{o.focus}</span>
            </button>
          ))}
        </div>
      </motion.section>
    </motion.div>
  );
}
