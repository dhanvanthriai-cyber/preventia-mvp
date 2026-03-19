'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { surface, textStyles, webTheme } from '@/lib/designSystem';
// Initialize the API client for the browser bundle.
// This import is safe here because AppShellFrame is a 'use client' component —
// it is never evaluated during SSR. The @daily-co/daily-js transitive dep
// is also aliased to `false` on the server in next.config.js.
import '@/lib/apiClient';

const AUTH_PATHS = new Set(['/', '/login', '/signup']);

interface AppShellFrameProps {
  readonly children: ReactNode;
}

export default function AppShellFrame({ children }: Readonly<AppShellFrameProps>) {
  const pathname = usePathname();
  const hideChrome = pathname ? AUTH_PATHS.has(pathname) : false;


  return (
    <>
      {!hideChrome && (
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            backdropFilter: 'blur(18px)',
            backgroundColor: 'rgba(249, 248, 246, 0.82)',
            borderBottom: `1px solid ${webTheme.colors.border}`,
          }}
        >
          <div
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '18px clamp(24px, 4vw, 56px)',
              display: 'flex',
              gap: 16,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  ...surface({
                    borderRadius: webTheme.radius.pill,
                    padding: '8px 14px',
                    boxShadow: 'none',
                  }),
                }}
              >
                <strong style={{ ...textStyles.label, fontSize: 14 }}>Preventia</strong>
              </div>
              <span style={textStyles.muted}>Family care, with a softer touch.</span>
            </div>
          </div>
        </div>
      )}
      <main style={{ padding: hideChrome ? '0' : '24px 0 40px' }}>{children}</main>
    </>
  );
}
