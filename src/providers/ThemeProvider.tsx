'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { play } from '@/lib/sound';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'theme';
// Browser UI colour (mobile address bar etc.) for each theme.
const BROWSER_COLOR: Record<Theme, string> = { dark: '#0a0b11', light: '#f7f6fb' };

interface ThemeState {
  theme: Theme;
  /** Flip the theme. Pass the toggle button's centre so the circular wipe grows from it. */
  toggle: (origin?: { x: number; y: number }) => void;
}

const Ctx = createContext<ThemeState | null>(null);

/** Writes the theme where the CSS reads it, and updates the browser UI colour. */
function paint(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BROWSER_COLOR[theme]);
}

type ViewTransitionDoc = Document & {
  startViewTransition?: (update: () => void) => { ready: Promise<void> };
};

/**
 * Dark / light theme. The page starts with whatever the inline script in layout.tsx chose before
 * first paint (saved choice, else dark); this provider keeps React in sync and handles switching.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const current = useRef<Theme>('dark');

  useEffect(() => {
    const t: Theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    current.current = t;
    setTheme(t);
    paint(t);
  }, []);

  const toggle = useCallback((origin?: { x: number; y: number }) => {
    const next: Theme = current.current === 'dark' ? 'light' : 'dark';
    current.current = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    play(next === 'light' ? 'sunrise' : 'nightfall');

    const commit = () => {
      flushSync(() => setTheme(next));
      paint(next);
    };

    const doc = document as ViewTransitionDoc;
    if (!doc.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      commit();
      return;
    }

    // Circular reveal growing from the toggle button, using the View Transitions API.
    const x = origin?.x ?? window.innerWidth - 48;
    const y = origin?.y ?? 40;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    doc
      .startViewTransition(commit)
      .ready.then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 700, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' },
        );
      })
      .catch(() => {});
  }, []);

  // Keyboard: T flips the theme.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.key.toLowerCase() !== 't') return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeState {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTheme must be used inside <ThemeProvider>');
  return c;
}
