import type { Config } from 'tailwindcss';

// Colours come from CSS variables (see globals.css) so one set of classes serves both themes.
// Each variable holds an "R G B" triplet, which lets Tailwind's opacity modifiers keep working
// (bg-white/10, text-gold/60, ...).
const c = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // The "foreground" colour: white on the dark theme, near-black ink on the light theme.
        // Overlays (bg-white/5), borders (border-white/10) and strong text (text-white) all follow it.
        white: c('fg'),
        // Translucent scrims (kill-feed rows, banners): black on dark, white on light.
        black: c('black'),
        // Secondary text greys, inverted for the light theme.
        zinc: { 100: c('z100'), 200: c('z200'), 300: c('z300'), 400: c('z400'), 500: c('z500'), 600: c('z600') },
        // Page and surface colours.
        ink: { DEFAULT: c('ink'), 2: c('ink-2'), 3: c('ink-3'), 4: c('ink-4') },
        // Accent for TEXT, icons and thin lines: bright amber on dark, a deeper burnt orange on light
        // so small text keeps its contrast.
        gold: { DEFAULT: c('gold'), hot: c('flame-hot'), soft: c('gold-soft') },
        // Accent for FILLS (bars, pills, dots, buttons): vivid in both themes.
        flame: { DEFAULT: c('flame'), hot: c('flame-hot') },
        // Text that sits on a flame (or ok) fill.
        'on-gold': c('on-gold'),
        'on-ok': c('on-ok'),
        ok: c('ok'),
        danger: c('danger'),
      },
      fontFamily: {
        display: ['var(--font-display)', 'Impact', 'sans-serif'],
        ui: ['var(--font-ui)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        blink: { '50%': { opacity: '0' } },
        dot: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.5)', opacity: '0.6' },
        },
      },
      animation: {
        blink: 'blink 1s steps(1) infinite',
        dot: 'dot 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
