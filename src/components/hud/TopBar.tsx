'use client';

import { PLAYER, SECTIONS } from '@/data/portfolio';
import { useGame } from '@/providers/GameProvider';
import { Meter } from '@/components/ui/Meter';
import { Icon } from '@/components/ui/Icon';
import { RolesMenu } from '@/components/hud/RolesMenu';
import { ThemeToggle } from '@/components/hud/ThemeToggle';

/**
 * Player card on the left: avatar, name and rank, with a "recon" bar showing how many of the tabs
 * the visitor has opened. Status and settings (roles, theme, sound) on the right.
 */
export function TopBar() {
  const { xp, visited, soundOn, toggleSound } = useGame();

  return (
    <header className="relative z-30 shrink-0 px-4 pt-3 sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="cut grid h-14 w-14 shrink-0 place-items-center bg-gradient-to-br from-flame to-flame-hot font-display text-2xl font-extrabold italic text-on-gold">
            {PLAYER.initials}
          </div>

          <div className="min-w-0">
            <div className="truncate font-display text-lg font-bold italic uppercase leading-none tracking-wide text-white sm:text-2xl">
              {PLAYER.name}
            </div>
            <div className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400 sm:text-[11px] sm:tracking-[0.2em]">
              {PLAYER.rank}
            </div>
            <div className="mt-1.5 w-40 sm:w-56">
              <Meter
                label="Recon"
                ariaLabel={`Recon: ${visited.length} of ${SECTIONS.length} tabs explored`}
                value={xp}
                right={`${visited.length}/${SECTIONS.length}`}
              />
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <RolesMenu />
          <ThemeToggle />
          <button
            type="button"
            aria-pressed={soundOn}
            aria-label={soundOn ? 'Mute sound effects' : 'Unmute sound effects'}
            onClick={toggleSound}
            className={`para grid h-9 w-9 place-items-center transition-colors sm:w-14 ${
              soundOn ? 'bg-flame/20 text-gold hover:bg-flame/30' : 'bg-white/[0.06] text-zinc-400 hover:text-white'
            }`}
          >
            <Icon name={soundOn ? 'sound' : 'mute'} className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
