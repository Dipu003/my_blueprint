import type { SectionId } from '@/data/portfolio';

export type IconName =
  | SectionId
  | 'sound'
  | 'mute'
  | 'lock'
  | 'check'
  | 'arrow'
  | 'chevron'
  | 'mail'
  | 'phone'
  | 'pin'
  | 'linkedin'
  | 'code'
  | 'server'
  | 'chip'
  | 'cloud'
  | 'gear'
  | 'database'
  | 'window'
  | 'star'
  | 'bolt'
  | 'briefcase'
  | 'graduation'
  | 'medal';

// 24x24 stroke icons. Paths only, so they inherit color from `currentColor`.
const PATHS: Record<IconName, string[]> = {
  lobby: ['M12 2.5 20 7v10l-8 4.5L4 17V7z', 'M12 8l3.5 2v4L12 16l-3.5-2v-4z'],
  missions: ['M6 3v18', 'M6 4h12l-2.5 4.5L18 13H6'],
  loadout: ['M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z', 'M12 8v8'],
  career: ['M12 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10z', 'M8.5 12.5 7 21l5-3 5 3-1.5-8.5'],
  squad: [
    'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
    'M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6',
    'M16 4.2a3.5 3.5 0 0 1 0 6.6',
    'M18 14.3c2 .7 3.5 2.5 3.5 5.7',
  ],
  sound: ['M4 9v6h4l5 4V5L8 9z', 'M16 8.5a5 5 0 0 1 0 7', 'M18.5 6a8.5 8.5 0 0 1 0 12'],
  mute: ['M4 9v6h4l5 4V5L8 9z', 'M16.5 9.5l4 5', 'M20.5 9.5l-4 5'],
  lock: ['M6 11h12v9H6z', 'M8.5 11V8a3.5 3.5 0 0 1 7 0v3'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  arrow: ['M5 12h14', 'M13 6l6 6-6 6'],
  chevron: ['M6 9l6 6 6-6'],
  mail: ['M3 6h18v12H3z', 'M3 7l9 6 9-6'],
  phone: ['M6 3h3l1.5 4-2 1.5a11 11 0 0 0 6 6L16 12.5l4 1.5v3a2 2 0 0 1-2 2A15 15 0 0 1 4 5a2 2 0 0 1 2-2z'],
  pin: ['M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z', 'M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'],
  linkedin: ['M7 10v7', 'M7 7v.01', 'M11 17v-7', 'M11 13a3 3 0 0 1 6 0v4'],
  code: ['M8 7l-5 5 5 5', 'M16 7l5 5-5 5', 'M14 5l-4 14'],
  server: ['M4 4h16v6H4z', 'M4 14h16v6H4z', 'M8 7v.01', 'M8 17v.01'],
  chip: [
    'M7 7h10v10H7z',
    'M10 10h4v4h-4z',
    'M9 3v4',
    'M15 3v4',
    'M9 17v4',
    'M15 17v4',
    'M3 9h4',
    'M3 15h4',
    'M17 9h4',
    'M17 15h4',
  ],
  cloud: ['M6.5 18a4 4 0 0 1-.4-8A6 6 0 0 1 17.8 8.6 4.7 4.7 0 0 1 17.5 18z'],
  gear: [
    'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    'M12 3v2.5',
    'M12 18.5V21',
    'M3 12h2.5',
    'M18.5 12H21',
    'M5.6 5.6l1.8 1.8',
    'M16.6 16.6l1.8 1.8',
    'M18.4 5.6l-1.8 1.8',
    'M7.4 16.6l-1.8 1.8',
  ],
  database: [
    'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z',
    'M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6',
    'M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6',
  ],
  window: ['M3 5h18v14H3z', 'M3 9h18', 'M6 7v.01'],
  star: ['M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z'],
  bolt: ['M13 3L5 14h6l-1 7 8-11h-6z'],
  briefcase: ['M4 8h16v11H4z', 'M9 8V5h6v3', 'M4 13h16'],
  graduation: ['M2 9l10-5 10 5-10 5z', 'M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5'],
  medal: ['M12 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10z', 'M8.5 12.5 7 21l5-3 5 3-1.5-8.5', 'M10 8l1.5 1.5L14.5 6.5'],
};

export function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
