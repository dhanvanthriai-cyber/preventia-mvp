import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import AppShellFrame from '@/components/AppShellFrame';

export const metadata: Metadata = {
  title: 'Preventia Portal',
  description: 'Patient · Doctor · Pharmacist portal — Project Preventia',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShellFrame>{children}</AppShellFrame>
      </body>
    </html>
  );
}
