import { useEffect, useState } from 'react';

/**
 * Whether a CSS media query matches right now. Starts false on the server and for the first render,
 * unless `eager` is set: use that only in components that are never rendered on the server (the
 * intro), so they get the right answer straight away and do not flash the wrong layout.
 */
export function useMedia(query: string, eager = false): boolean {
  const [matches, setMatches] = useState(() => eager && typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return matches;
}
