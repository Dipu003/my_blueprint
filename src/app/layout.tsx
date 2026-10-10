import type { Metadata, Viewport } from 'next';
import { Chakra_Petch, Inter } from 'next/font/google';
import './globals.css';
import { GameProvider } from '@/providers/GameProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';

// Chakra Petch (an angular game-HUD face with real weights) for headings, buttons and numbers, and Inter
// (the clearest UI sans there is) for everything else: game-like, and easy for a recruiter to read.
const display = Chakra_Petch({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-display' });
const ui = Inter({ subsets: ['latin', 'latin-ext'], weight: ['400', '500', '600', '700'], variable: '--font-ui' });

export const metadata: Metadata = {
  title: 'Deepak Senapati | Agentic AI & Software Developer',
  description:
    'Portfolio of Deepak Senapati: Node.js, NestJS, AWS, Kafka, LangGraph and RAG. Built as a Call of Duty: Mobile style lobby.',
};

export const viewport: Viewport = { themeColor: '#0a0b11' };

// Runs before first paint so the saved theme is applied with no flash (dark is the default), and so a
// tab that has already seen the intro never flashes the loading screen (see .boot-screen in globals.css).
const THEME_SCRIPT = `try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark')t='dark';var r=document.documentElement;r.dataset.theme=t;r.style.colorScheme=t}catch(e){}try{if(sessionStorage.getItem('lobby:loaded'))document.documentElement.dataset.boot='skip'}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the script above sets data-theme/style before React hydrates.
    <html lang="en" data-theme="dark" className={`${display.variable} ${ui.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="font-ui antialiased">
        <ThemeProvider>
          <GameProvider>{children}</GameProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
