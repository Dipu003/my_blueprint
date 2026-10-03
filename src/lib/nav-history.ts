import { SECTIONS, roleById, type SectionId } from '@/data/portfolio';

/** Where the visitor is: a tab, and optionally the briefing of one role open on top of it. */
export interface NavState {
  section: SectionId;
  role: string | null;
}

/** A history entry: where it points, and how many of our own entries sit below it. */
export interface NavEntry extends NavState {
  /** 0 = the first entry the page was opened on (nothing of ours to go Back to). */
  depth: number;
}

// Our slice of `history.state`. Next.js keeps its own bookkeeping in the same object, so ours is
// namespaced and every write carries the existing keys along (the router reloads the page when it
// meets an entry it doesn't recognise).
const KEY = 'nav';

const isSection = (v: unknown): v is SectionId => SECTIONS.some((s) => s.id === v);

/** "#career" or "#lobby/ai-ml-engineer" to a state. Anything unknown falls back to the lobby. */
export function parseHash(hash: string): NavState {
  const [section = '', role = ''] = hash.replace(/^#\/?/, '').split('/');
  return { section: isSection(section) ? section : 'lobby', role: roleById(role) ? role : null };
}

export const hashFor = (n: NavState) => `#${n.section}${n.role ? `/${n.role}` : ''}`;

/** The history entry the browser is on right now. */
export function currentEntry(): NavEntry {
  const saved = (window.history.state ?? {})[KEY] as Partial<NavEntry> | undefined;
  if (saved && isSection(saved.section) && typeof saved.depth === 'number') {
    return { section: saved.section, role: roleById(saved.role) ? saved.role! : null, depth: saved.depth };
  }
  // The first entry, or one made by editing the address bar: read where it points from the URL.
  return { ...parseHash(window.location.hash), depth: 0 };
}

const write = (method: 'pushState' | 'replaceState', n: NavState, depth: number) =>
  window.history[method]({ ...window.history.state, [KEY]: { ...n, depth } }, '', hashFor(n));

/** Adds a history entry, so the browser's Back button returns to where the visitor was. */
export const pushEntry = (n: NavState) => write('pushState', n, currentEntry().depth + 1);

/** Rewrites the current entry in place, with no new Back stop. */
export const replaceEntry = (n: NavState) => write('replaceState', n, currentEntry().depth);
