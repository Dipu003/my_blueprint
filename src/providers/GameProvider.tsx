'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { PLAYER, SECTIONS, type SectionId } from '@/data/portfolio';
import { play, setSoundEnabled } from '@/lib/sound';

interface GameState {
  section: SectionId;
  go: (id: SectionId) => void;
  visited: SectionId[];
  xp: number; // 0-100, earned by opening every tab
  level: number; // starts at PLAYER.level, +1 when XP is full
  soundOn: boolean;
  toggleSound: () => void;
}

const Ctx = createContext<GameState | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [section, setSection] = useState<SectionId>('lobby');
  const [visited, setVisited] = useState<SectionId[]>(['lobby']);
  const [soundOn, setSoundOn] = useState(true);

  const go = useCallback((id: SectionId) => {
    setSection(id);
    setVisited((v) => (v.includes(id) ? v : [...v, id]));
    play('click');
  }, []);

  const toggleSound = useCallback(() => {
    setSoundOn((on) => {
      setSoundEnabled(!on);
      if (!on) setTimeout(() => play('confirm'), 0);
      return !on;
    });
  }, []);

  // Keyboard: 1-5 jump between tabs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      const idx = Number(e.key) - 1;
      if (Number.isInteger(idx) && SECTIONS[idx]) go(SECTIONS[idx].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  // Objective-style diamond ping where a button or link is pressed.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!(e.target as HTMLElement | null)?.closest('button, a')) return;
      const m = document.createElement('div');
      m.className = 'ping';
      m.style.left = `${e.clientX}px`;
      m.style.top = `${e.clientY}px`;
      document.body.appendChild(m);
      setTimeout(() => m.remove(), 460);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, []);

  const xp = Math.round((visited.length / SECTIONS.length) * 100);
  const level = PLAYER.level + (xp >= 100 ? 1 : 0);
  const value = useMemo(
    () => ({ section, go, visited, xp, level, soundOn, toggleSound }),
    [section, go, visited, xp, level, soundOn, toggleSound],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGame(): GameState {
  const c = useContext(Ctx);
  if (!c) throw new Error('useGame must be used inside <GameProvider>');
  return c;
}
