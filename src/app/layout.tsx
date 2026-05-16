import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MrWrite',
  description: 'A writing studio with AI',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="font-sans">{children}</body>
    </html>
  );
}
