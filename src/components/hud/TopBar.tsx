'use client';

import { PLAYER } from '@/data/portfolio';
import { useGame } from '@/providers/GameProvider';
import { play } from '@/lib/sound';
import { Meter } from '@/components/ui/Meter';
import { Icon } from '@/components/ui/Icon';
import { RolesMenu } from '@/components/hud/RolesMenu';

/** Player card (avatar, level, rank, XP) on the left; status and settings on the right. */
export function TopBar() {
  const { xp, level, visited, soundOn, toggleSound } = useGame();

  return (
    <header className="relative z-30 shrink-0 px-4 pt-3 sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative shrink-0">
            <div className="cut grid h-14 w-14 place-items-center bg-gradient-to-br from-gold to-gold-hot font-display text-2xl font-extrabold italic text-ink">
              {PLAYER.initials}
            </div>
            <span
              aria-label={`Level ${level}`}
              className="absolute -bottom-1.5 -left-1.5 grid h-6 min-w-6 place-items-center bg-ink px-1 font-display text-sm font-bold text-gold ring-1 ring-gold/70"
            >
              {level}
            </span>
          </div>

          <div className="min-w-0">
            <div className="truncate font-display text-xl font-bold italic uppercase leading-none tracking-wide text-white sm:text-2xl">
              {PLAYER.name}
            </div>
            <div className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400 sm:text-[11px] sm:tracking-[0.2em]">
              {PLAYER.rank}
            </div>
            <div className="mt-1.5 w-40 sm:w-56">
              <Meter label={`LV ${level} · XP`} value={xp} right={`${visited.length}/5 tabs`} />
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <RolesMenu />
          <button
            type="button"
            aria-pressed={soundOn}
            aria-label={soundOn ? 'Mute sound effects' : 'Unmute sound effects'}
            onClick={toggleSound}
            onMouseEnter={() => play('hover')}
            className={`para grid h-9 w-12 place-items-center transition-colors sm:w-14 ${
              soundOn ? 'bg-gold/20 text-gold hover:bg-gold/30' : 'bg-white/[0.06] text-zinc-400 hover:text-white'
            }`}
          >
            <Icon name={soundOn ? 'sound' : 'mute'} className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
