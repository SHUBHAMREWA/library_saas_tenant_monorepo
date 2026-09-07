import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { ThemeProvider } from '../components/ThemeProvider';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'seeLibrary - Study Library & Reading Room Management SaaS',
  description: 'Mobile-first management system for physical study libraries and reading rooms',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'seeLibrary',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

const themeInitScript = `
  (function() {
    try {
      var saved = localStorage.getItem('seelibrary_theme');
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (saved === 'dark' || (!saved && prefersDark) || (saved === 'system' && prefersDark)) {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={plusJakartaSans.variable} suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${plusJakartaSans.className} font-sans antialiased min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white transition-colors duration-150`} suppressHydrationWarning>
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
