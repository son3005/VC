import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Playfair_Display } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SCHOOL_NAME } from '@/lib/constants';

const beVietnamPro = Be_Vietnam_Pro({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin', 'vietnamese'],
  variable: '--font-be-vietnam-pro',
  display: 'swap',
});

const playfairDisplay = Playfair_Display({
  weight: ['500', '600', '700', '800'],
  subsets: ['latin', 'vietnamese'],
  variable: '--font-playfair',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#010E1C',
};

export const metadata: Metadata = {
  title: {
    default: `${SCHOOL_NAME} — Xác thực văn bằng`,
    template: `%s | ${SCHOOL_NAME}`,
  },
  description:
    'Hệ thống quản lý, cấp phát và xác minh văn bằng chứng chỉ của Raccoon University trên Ethereum Sepolia và IPFS.',
  icons: {
    icon: '/logo.png',
  },
  openGraph: {
    title: `${SCHOOL_NAME} — Xác thực văn bằng trên Blockchain`,
    description:
      'Hệ thống quản lý, cấp phát và xác minh văn bằng chứng chỉ của Raccoon University trên Ethereum Sepolia và IPFS.',
    siteName: SCHOOL_NAME,
    locale: 'vi_VN',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} ${playfairDisplay.variable}`}>
      <body className="font-sans min-h-screen flex flex-col bg-[#FAF4DF] text-[#010E1C] antialiased">
        <Providers>
          <Header />
          <main className="flex-1 flex flex-col">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
