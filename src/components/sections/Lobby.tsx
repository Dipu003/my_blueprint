'use client';

import { motion } from 'framer-motion';
import { FEED, OPEN_TO, PLAYER, STATS } from '@/data/portfolio';
import { useGame } from '@/providers/GameProvider';
import { Panel } from '@/components/ui/Panel';
import { GameButton } from '@/components/ui/GameButton';
import { Emblem } from '@/components/ui/Emblem';
import { Icon } from '@/components/ui/Icon';
import { Radar } from '@/components/ui/Radar';
import { Rank } from '@/components/ui/Rank';
import { roleIcon } from '@/components/ui/roleIcon';
import { item, stagger } from './motion';

export function Lobby() {
  const { go, openRole, years } = useGame();

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="relative">
          <Radar className="absolute -right-8 -top-1 hidden h-64 w-64 opacity-70 xl:block" />

          <motion.div variants={item} className="relative flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-gold">
            <Rank count={3} className="h-4 w-4" /> Operator profile
          </motion.div>

          <motion.h1
            variants={item}
            className="relative mt-2 font-display text-[clamp(3.6rem,11vw,7.5rem)] font-extrabold italic uppercase leading-[0.82] tracking-tight"
          >
            <span className="block text-white">{PLAYER.firstName}</span>
            <span className="block bg-[linear-gradient(90deg,rgb(var(--hero-a)),rgb(var(--hero-b)))] bg-clip-text pr-3 text-transparent">{PLAYER.lastName}</span>
          </motion.h1>

          <motion.p variants={item} className="relative mt-3 font-display text-2xl font-semibold italic uppercase tracking-wider text-zinc-200">
            {PLAYER.title}
          </motion.p>
          <motion.p variants={item} className="relative mt-3 max-w-xl text-base leading-relaxed text-zinc-400">
            {PLAYER.bio}
          </motion.p>

          <motion.div variants={item} className="relative mt-6">
            <GameButton label="Start missions" sub="Featured deployment" onClick={() => go('missions')} />
          </motion.div>

          <motion.ul variants={item} aria-label="Highlights" className="relative mt-7 max-w-xl space-y-1">
            {FEED.map((f) => (
              <li key={f.target} className="para tile flex h-9 items-center gap-2 bg-black/50 pl-5 pr-8 text-sm">
                <span aria-hidden className="font-display text-base font-extrabold italic leading-none text-gold">»</span>
                <span className="font-display text-base font-bold italic uppercase tracking-wide">Deepak</span>
                <span className="bg-white/10 px-1.5 text-[10px] font-semibold uppercase tracking-widest text-gold">{f.weapon}</span>
                <span className="min-w-0 flex-1 truncate text-zinc-300">{f.target}</span>
                <span className="font-display text-base font-extrabold italic text-danger">{f.result}</span>
              </li>
            ))}
          </motion.ul>
        </div>

        <motion.div variants={item}>
          <Panel title="Combat record" tag="Career">
            <div className="flex items-center gap-4">
              <Emblem initials={PLAYER.initials} className="h-24 w-24 shrink-0 drop-shadow-[0_0_18px_rgb(var(--glow-e)/0.4)]" />
              <div className="min-w-0">
                <div className="font-display text-2xl font-bold italic uppercase leading-none text-white">{PLAYER.name}</div>
                <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
                  <Rank count={3} className="h-4 w-4 shrink-0" /> {PLAYER.rank}
                </div>
                <div className="mt-1 text-xs text-zinc-400">{PLAYER.location}</div>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-2">
              {STATS.map((s, i) => (
                <div key={s.label} className="cut tile h-[5.5rem] bg-white/[0.05] px-3 py-2.5">
                  <dd className="font-display text-4xl font-extrabold italic leading-none text-gold">{s.live === 'years' ? years : s.value}</dd>
                  <dt className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">{s.label}</dt>
                  {s.bar !== undefined && (
                    <div className="mt-2 h-1 -skew-x-12 bg-white/10">
                      <motion.div
                        className="h-full bg-gradient-to-r from-flame-hot to-flame"
                        initial={{ width: 0 }}
                        animate={{ width: `${s.bar}%` }}
                        transition={{ duration: 0.9, delay: 0.3 + i * 0.1 }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </dl>
          </Panel>
        </motion.div>
      </div>

      <motion.section variants={item} aria-labelledby="open-to">
        <h2 id="open-to" className="mb-3 flex items-center gap-2 font-display text-xl font-bold italic uppercase tracking-wide text-white">
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
              <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-gold">
                <Icon name={roleIcon(o.role)} className="h-4 w-4" /> Role
              </span>
              <span className="line-clamp-2 font-display text-xl font-bold italic uppercase leading-tight">{o.role}</span>
              <span className="text-xs text-zinc-400">{o.focus}</span>
            </button>
          ))}
        </div>
      </motion.section>
    </motion.div>
  );
}
