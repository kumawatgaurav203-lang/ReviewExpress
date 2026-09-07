import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rate & Review | AI Google Growth',
  description: '1-Tap AI-powered Google Review booster for local businesses',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-50 antialiased">
      <body className="h-full flex flex-col selection:bg-blue-500 selection:text-white font-sans">
        {children}
      </body>
    </html>
  );
}
