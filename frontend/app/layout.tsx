import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Playfair_Display } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

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
    default: 'Xác Thực Văn Bằng Blockchain — Verify Certification',
    template: '%s | Xác Thực Văn Bằng Blockchain',
  },
  description:
    'Hệ thống quản lý, cấp phát và xác minh văn bằng chứng chỉ minh bạch, chống làm giả dựa trên Ethereum Sepolia Blockchain và IPFS.',
  icons: {
    icon: '/logo.svg',
  },
  openGraph: {
    title: 'Xác Thực Văn Bằng Blockchain — Ethereum Sepolia & IPFS',
    description:
      'Hệ thống quản lý, cấp phát và xác minh văn bằng chứng chỉ minh bạch, chống làm giả dựa trên Ethereum Sepolia Blockchain và IPFS.',
    siteName: 'Hệ thống Xác thực Văn bằng Blockchain',
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
