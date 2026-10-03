import type { Metadata, Viewport } from 'next';
import { Barlow_Condensed, Rajdhani } from 'next/font/google';
import './globals.css';
import { GameProvider } from '@/providers/GameProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';

const display = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  style: ['normal', 'italic'],
  variable: '--font-display',
});
const ui = Rajdhani({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-ui' });

export const metadata: Metadata = {
  title: 'Deepak Senapati | Agentic AI & Software Developer',
  description:
    'Portfolio of Deepak Senapati: Node.js, NestJS, AWS, Kafka, LangGraph and RAG. Built as a Call of Duty: Mobile style lobby.',
};

export const viewport: Viewport = { themeColor: '#0a0b0d' };

// Runs before first paint so the saved theme is applied with no flash. Dark is the default.
const THEME_SCRIPT = `try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark')t='dark';var r=document.documentElement;r.dataset.theme=t;r.style.colorScheme=t}catch(e){}`;

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
