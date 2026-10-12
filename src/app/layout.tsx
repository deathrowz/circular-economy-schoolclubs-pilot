import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Circular-Economy Student Enterprise Platform | 15-School Pilot',
  description:
    'Gamified validation engine, Telegram EXIF student submission bot, RBAC adjudication dashboard, and circular-economy leaderboard across 15 pilot schools.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${plusJakarta.variable}`}>
      <body className="min-h-screen bg-[#181C21] text-[#E0FFF9] antialiased selection:bg-[#14C7C3] selection:text-[#074140]">
        {children}
      </body>
    </html>
  );
}
