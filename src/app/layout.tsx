import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MrWrite — AI Writing Studio',
  description: 'A local-first, skill-driven AI writing agent',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="dark">
      <body>{children}</body>
    </html>
  );
}
