'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { PLAYER, SECTIONS, roleById, yearsOfExperience, type SectionId } from '@/data/portfolio';
import { currentEntry, pushEntry, replaceEntry, type NavState } from '@/lib/nav-history';
import { announce, play, setSoundEnabled, warmUp } from '@/lib/sound';

interface GameState {
  section: SectionId;
  go: (id: SectionId) => void;
  /** Id of the role whose briefing is open on top of the current tab, or null. */
  role: string | null;
  /** Opens a role briefing (or switches the open one to another role). */
  openRole: (id: string) => void;
  closeRole: () => void;
  visited: SectionId[];
  xp: number; // 0-100, "recon" progress: how many of the tabs have been opened
  years: number; // whole years of professional experience (see yearsOfExperience)
  soundOn: boolean;
  toggleSound: () => void;
}

const Ctx = createContext<GameState | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [section, setSection] = useState<SectionId>('lobby');
  const [role, setRole] = useState<string | null>(null);
  const [visited, setVisited] = useState<SectionId[]>(['lobby']);
  const [soundOn, setSoundOn] = useState(true);

  // Years of experience start at the static fallback so server and client render the same first
  // frame, then the live value is worked out from today's date.
  const [years, setYears] = useState<number>(PLAYER.years);
  useEffect(() => {
    setYears(yearsOfExperience());
  }, []);

  // Mirrors of `section` and `role` for callbacks and listeners that must not go stale.
  const current = useRef<SectionId>('lobby');
  const openedRole = useRef<string | null>(null);
  const voiceTimer = useRef<ReturnType<typeof setTimeout>>();

  // Brings the screen to `n`. It leaves the browser history alone: a visitor who navigates pushes
  // an entry first, and the Back/Forward listener below shows the entry the browser landed on.
  const show = useCallback((n: NavState, quiet = false) => {
    const changed = n.section !== current.current;
    current.current = n.section;
    openedRole.current = n.role;
    setSection(n.section);
    setRole(n.role);
    setVisited((v) => (v.includes(n.section) ? v : [...v, n.section]));

    if (!changed || quiet) return;
    // Opening a section: menu chime, a burst of "data stream" chirps, then the announcer.
    play('nav');
    play('fetch');
    clearTimeout(voiceTimer.current);
    const def = SECTIONS.find((s) => s.id === n.section);
    if (def) voiceTimer.current = setTimeout(() => void announce(def.id, def.voice), 340);
  }, []);

  const go = useCallback(
    (id: SectionId) => {
      const same = id === current.current;
      if (same && !openedRole.current) return play('click');
      const next: NavState = { section: id, role: null };
      pushEntry(next);
      show(next);
      if (same) play('click'); // leaving a briefing for the tab under it
    },
    [show],
  );

  const openRole = useCallback(
    (id: string) => {
      if (!roleById(id) || id === openedRole.current) return;
      const switching = openedRole.current !== null;
      const next: NavState = { section: current.current, role: id };
      // Moving between roles inside the briefing is one Back stop, not one per role.
      if (switching) replaceEntry(next);
      else pushEntry(next);
      show(next);
      play(switching ? 'click' : 'nav');
    },
    [show],
  );

  const closeRole = useCallback(() => {
    if (!openedRole.current) return;
    play('click');
    const here = currentEntry();
    if (here.role && here.depth > 0) {
      // We pushed this entry when the briefing opened, so Back lands on the tab underneath it.
      // Hide it now rather than waiting for the popstate event.
      openedRole.current = null;
      setRole(null);
      window.history.back();
    } else {
      // Opened straight from a link: there is nothing of ours below it to go Back to.
      const next: NavState = { section: current.current, role: null };
      replaceEntry(next);
      show(next);
    }
  }, [show]);

  // Browser Back/Forward: show whatever entry the browser landed on. A reload or a shared link can
  // also arrive on any tab or role, which opens without the cues.
  useEffect(() => {
    const onPop = () => show(currentEntry());
    window.addEventListener('popstate', onPop);
    const first = currentEntry();
    if (first.section !== 'lobby' || first.role) show(first, true);
    return () => window.removeEventListener('popstate', onPop);
  }, [show]);

  // Get audio ready on the first gesture (context, noise, announcer clips) so the first real
  // sound doesn't stutter.
  useEffect(() => {
    const ready = () => warmUp(SECTIONS.map((s) => s.id));
    window.addEventListener('pointerdown', ready, { once: true });
    window.addEventListener('keydown', ready, { once: true });
    return () => {
      window.removeEventListener('pointerdown', ready);
      window.removeEventListener('keydown', ready);
    };
  }, []);

  const toggleSound = useCallback(() => {
    setSoundOn((on) => {
      setSoundEnabled(!on);
      if (!on) setTimeout(() => play('confirm'), 0);
      return !on;
    });
  }, []);

  // Keyboard: 1-5 jump between tabs (not while a role briefing is open on top of them).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || openedRole.current) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      const idx = Number(e.key) - 1;
      if (Number.isInteger(idx) && SECTIONS[idx]) go(SECTIONS[idx].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  // Hover sounds for everything interactive, in one place: main tabs, buttons and links, and tiles
  // each get their own cue. Plays once per element you enter, and stays quiet while content is
  // scrolling under a still pointer.
  useEffect(() => {
    const CLICKABLE = 'button, a, [role="tab"]';
    let current: Element | null = null;
    let lastScroll = 0;
    let lastPlayed: Element | null = null;
    let lastPlayedAt = 0;

    const onScroll = () => {
      lastScroll = performance.now();
    };
    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const t = e.target as Element | null;
      const tab = t?.closest('[data-nav-tab]') ?? null;
      const el = tab ?? t?.closest(`${CLICKABLE}, .tile`) ?? null;
      if (el === current) return;
      current = el;
      const now = performance.now();
      if (!el || now - lastScroll < 300) return;
      // Safety net: re-entering the very same element within half a second stays silent, so an
      // edge-flicker can never turn into repeating sounds.
      if (el === lastPlayed && now - lastPlayedAt < 500) return;
      lastPlayed = el;
      lastPlayedAt = now;
      if (tab) play('tab');
      else if (el.matches(CLICKABLE)) play('hover');
      else play('tile');
    };

    window.addEventListener('pointerover', onOver, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener('pointerover', onOver);
      window.removeEventListener('scroll', onScroll, { capture: true });
    };
  }, []);

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
  const value = useMemo(
    () => ({ section, go, role, openRole, closeRole, visited, xp, years, soundOn, toggleSound }),
    [section, go, role, openRole, closeRole, visited, xp, years, soundOn, toggleSound],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGame(): GameState {
  const c = useContext(Ctx);
  if (!c) throw new Error('useGame must be used inside <GameProvider>');
  return c;
}
