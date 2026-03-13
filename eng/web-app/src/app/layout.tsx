import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dhanvanthri Portal',
  description: 'Doctor · Pharmacist · Coach portal — Project Dhanvanthri',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: '"JetBrains Mono", monospace',
          backgroundColor: '#f5f5f0',
          color: '#111',
        }}
      >
        <nav
          style={{
            borderBottom: '2px solid #111',
            padding: '12px 24px',
            display: 'flex',
            gap: '24px',
            backgroundColor: '#fff',
          }}
        >
          <strong style={{ fontFamily: 'Georgia, serif', fontSize: '18px' }}>
            Dhanvanthri
          </strong>
          <a href="/doctor" style={navLink}>Doctor Portal</a>
          <a href="/pharmacist" style={navLink}>Pharmacist Portal</a>
        </nav>
        <main style={{ padding: '24px' }}>{children}</main>
      </body>
    </html>
  );
}

const navLink: React.CSSProperties = {
  color: '#0047AB',
  textDecoration: 'none',
  fontWeight: 700,
  fontSize: '13px',
  letterSpacing: '0.05em',
};
