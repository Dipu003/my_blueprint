import type { Metadata, Viewport } from 'next';
import { Barlow_Condensed, Rajdhani } from 'next/font/google';
import './globals.css';
import { GameProvider } from '@/providers/GameProvider';

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable}`}>
      <body className="font-ui antialiased">
        <GameProvider>{children}</GameProvider>
      </body>
    </html>
  );
}
