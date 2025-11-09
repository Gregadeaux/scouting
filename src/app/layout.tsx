import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { OfflineProvider, SyncProvider } from '@/lib/offline/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FRC Scouting System',
  description: 'FIRST Robotics Competition scouting and analytics platform',
  keywords: ['FRC', 'FIRST Robotics', 'Scouting', 'Competition'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FRC Scout',
  },
};

// Viewport configuration moved to separate export per Next.js 15 requirements
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#3b82f6',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <OfflineProvider>
            <SyncProvider>
              {children}
            </SyncProvider>
          </OfflineProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
