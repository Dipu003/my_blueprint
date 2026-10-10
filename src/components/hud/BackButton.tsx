'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '@/providers/GameProvider';
import { Icon } from '@/components/ui/Icon';

/**
 * The on-screen Back button, like the back arrow in a game menu. It shows on every screen that has
 * somewhere to go back to (any tab but the lobby) and does what the browser's Back does: returns to the
 * tab you came from, or to the lobby if you landed straight on this one. Esc does the same.
 *
 * - `bar`: slanted button at the right end of the tab strip (desktop).
 * - `tile`: square arrow that takes the place of the DS badge in the top bar (phones and tablets).
 */
export function BackButton({ variant }: { variant: 'bar' | 'tile' }) {
  const { canGoBack, goBack, role } = useGame();
  // While a briefing is open it has its own Back button on top of everything.
  const show = canGoBack && !role;

  return (
    <AnimatePresence initial={false}>
      {show &&
        (variant === 'bar' ? (
          <motion.button
            key="bar"
            type="button"
            onClick={goBack}
            aria-label="Go back"
            title="Back (Esc)"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.18 }}
            className="para tile ml-auto flex h-10 shrink-0 items-center gap-2 bg-white/[0.08] pl-6 pr-8 font-display text-lg uppercase tracking-wide"
          >
            <Icon name="back" className="h-5 w-5 text-gold" /> Back
            <kbd className="font-ui text-[0.625rem] font-bold not-italic text-zinc-500">Esc</kbd>
          </motion.button>
        ) : (
          <motion.button
            key="tile"
            type="button"
            onClick={goBack}
            aria-label="Go back"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.16 }}
            className="cut grid h-14 w-14 shrink-0 place-items-center bg-gradient-to-br from-flame to-flame-hot text-on-gold"
          >
            <Icon name="back" className="h-8 w-8" />
          </motion.button>
        ))}
    </AnimatePresence>
  );
}
