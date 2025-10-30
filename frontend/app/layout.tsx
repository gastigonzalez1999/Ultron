import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Ultron - Fintech Testing Assistant',
  description: 'AI-powered assistant for testing complex fintech flows',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full min-h-screen bg-gray-900">
      <body className={inter.className + ' h-full min-h-screen bg-gray-900 text-gray-100'}>
        {children}
      </body>
    </html>
  );
}
