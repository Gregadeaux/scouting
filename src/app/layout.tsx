import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { OfflineProvider } from '@/components/OfflineProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FRC Scouting System',
  description: 'FIRST Robotics Competition scouting and analytics platform',
  keywords: ['FRC', 'FIRST Robotics', 'Scouting', 'Competition'],
  manifest: '/manifest.json',
  themeColor: '#3b82f6',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FRC Scout',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <OfflineProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </OfflineProvider>
      </body>
    </html>
  );
}
