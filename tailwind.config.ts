import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#0a0b0d', 2: '#111215', 3: '#18191d', 4: '#212227' },
        gold: { DEFAULT: '#ffb400', hot: '#ff7a00', soft: '#ffd36b' },
        ok: '#5fd16a',
        danger: '#ff4a3d',
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
