'use client';

import { useRef } from 'react';
import { useTheme } from '@/providers/ThemeProvider';
import { Icon } from '@/components/ui/Icon';

/**
 * Dark / light switch. Shows the sun while the page is dark (click for light) and the moon while it
 * is light; the two icons turn into each other. The theme change itself is a circular wipe that
 * grows from this button (see ThemeProvider).
 */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const ref = useRef<HTMLButtonElement>(null);
  const light = theme === 'light';
  const label = light ? 'Switch to dark theme' : 'Switch to light theme';

  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={`${label} (T)`}
      onClick={() => {
        const r = ref.current?.getBoundingClientRect();
        toggle(r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined);
      }}
      className="para grid h-9 w-9 place-items-center bg-flame/20 text-gold transition-colors hover:bg-flame/30 sm:w-14"
    >
      <span className="relative block h-5 w-5">
        <Icon
          name="sun"
          className={`absolute inset-0 h-5 w-5 transition-all duration-500 ease-out ${
            light ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100'
          }`}
        />
        <Icon
          name="moon"
          className={`absolute inset-0 h-5 w-5 transition-all duration-500 ease-out ${
            light ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0'
          }`}
        />
      </span>
    </button>
  );
}
