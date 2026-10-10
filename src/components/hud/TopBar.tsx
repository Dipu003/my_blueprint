'use client';

import { PLAYER, SECTIONS } from '@/data/portfolio';
import { useGame } from '@/providers/GameProvider';
import { Meter } from '@/components/ui/Meter';
import { Icon } from '@/components/ui/Icon';
import { BackButton } from '@/components/hud/BackButton';
import { RolesMenu } from '@/components/hud/RolesMenu';
import { ThemeToggle } from '@/components/hud/ThemeToggle';

/**
 * Player card on the left: avatar, name and rank, with a "recon" bar showing how many of the tabs
 * the visitor has opened. Status and settings (roles, theme, sound) on the right.
 */
export function TopBar() {
  const { xp, visited, soundOn, toggleSound, canGoBack, role } = useGame();
  // Below the desktop layout (no slanted tab strip to hold it) the back arrow takes the badge's place.
  const arrowShown = canGoBack && !role;

  return (
    <header className="relative z-30 shrink-0 px-4 pt-3 sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-2 sm:gap-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="lg:hidden">
            <BackButton variant="tile" />
          </div>
          <div
            className={`cut h-11 w-11 shrink-0 place-items-center bg-gradient-to-br from-flame to-flame-hot font-display text-xl text-on-gold sm:h-14 sm:w-14 sm:text-2xl ${
              arrowShown ? 'hidden lg:grid' : 'grid'
            }`}
          >
            {PLAYER.initials}
          </div>

          <div className="min-w-0">
            <div className="truncate font-display text-[0.8rem] uppercase leading-none tracking-normal text-white sm:text-lg sm:tracking-wide">
              {PLAYER.name}
            </div>
            <div className="mt-1 text-[0.625rem] font-semibold uppercase leading-tight tracking-[0.06em] text-zinc-400 max-sm:line-clamp-2 sm:truncate sm:text-[0.6875rem] sm:tracking-[0.2em]">
              {PLAYER.rank}
            </div>
            <div className="mt-1.5 w-full max-w-[10rem] sm:w-56 sm:max-w-none">
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
