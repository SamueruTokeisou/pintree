import type { Metadata } from 'next';
import { SessionProvider } from '@/components/providers/SessionProvider';
import './globals.css';
export const metadata: Metadata = {
  title: '栞 · Samueru 的上网工作台', description: '收藏有归处，灵感随时可达。',
  robots: { index: false, follow: false, noarchive: true }, referrer: 'no-referrer',
  icons: { icon: '/nav-icon.svg' },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN"><body><SessionProvider>{children}</SessionProvider></body></html>;
}
