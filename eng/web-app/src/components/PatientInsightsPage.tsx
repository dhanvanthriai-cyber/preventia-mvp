'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { AuthUser } from '@preventia/shared';
import {
  pill,
  surface,
  textStyles,
  webTheme,
  pageShell,
} from '@/lib/designSystem';

interface InsightItem {
  id: number;
  doctorId: number;
  doctorName?: string;
  category: string;
  title: string;
  body: string;
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
}

function categoryTone(category: string): 'rose' | 'gold' | 'success' | 'accent' | 'neutral' {
  switch (category) {
    case 'NUTRITION':     return 'success';
    case 'FITNESS':       return 'accent';
    case 'MENTAL_HEALTH': return 'gold';
    case 'SLEEP':         return 'rose';
    default:              return 'neutral';
  }
}

function categoryLabel(category: string): string {
  switch (category) {
    case 'NUTRITION':     return 'NOURISHMENT';
    case 'FITNESS':       return 'MOVEMENT';
    case 'MENTAL_HEALTH': return 'MINDSET';
    case 'SLEEP':         return 'SLEEP';
    default:              return category;
  }
}

function categoryEmoji(category: string): string {
  switch (category) {
    case 'NUTRITION':     return '🥗';
    case 'FITNESS':       return '🏃';
    case 'MENTAL_HEALTH': return '🧘';
    case 'SLEEP':         return '😴';
    default:              return '💡';
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

const outlinedBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px 16px',
  borderRadius: webTheme.radius.pill,
  backgroundColor: 'transparent',
  color: webTheme.colors.text,
  border: `1px solid ${webTheme.colors.borderStrong}`,
  fontFamily: webTheme.font.sans,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  cursor: 'pointer',
  textDecoration: 'none',
  whiteSpace: 'nowrap' as const,
};

interface Props {
  user: AuthUser;
}

export default function PatientInsightsPage({ user }: Readonly<Props>) {
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  const loadInsights = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/insights', {
        headers: { Authorization: `Bearer ${user.token}` },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json() as InsightItem[];
        setInsights(data);
      }
    } catch {
      // Non-fatal
    } finally {
      setLoading(false);
    }
  }, [user.token]);

  useEffect(() => {
    void loadInsights();
  }, [loadInsights]);

  const handleReact = async (insightId: number) => {
    try {
      const res = await fetch(`/api/v1/insights/${insightId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ reaction: 'like' }),
      });
      if (res.ok) await loadInsights();
    } catch {
      // Non-fatal
    }
  };

  const categories = ['ALL', ...Array.from(new Set(insights.map((i) => i.category)))];
  const filtered = activeCategory === 'ALL'
    ? insights
    : insights.filter((i) => i.category === activeCategory);

  return (
    <div style={pageShell}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <a href="/patient/health" style={outlinedBtn}>← Back</a>
        <span style={{ ...textStyles.eyebrow }}>From Your Doctors</span>
      </div>

      <h1 style={{ ...textStyles.display, fontSize: 28, margin: '0 0 8px' }}>
        Health Insights
      </h1>
      <p style={{ ...textStyles.muted, margin: '0 0 24px', fontSize: 13 }}>
        Lifestyle tips and clinical notes broadcast by your care team.
      </p>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            style={{
              ...outlinedBtn,
              fontSize: 11,
              padding: '6px 14px',
              ...(activeCategory === cat ? {
                backgroundColor: webTheme.colors.text,
                color: webTheme.colors.background,
              } : {}),
            }}
            onClick={() => setActiveCategory(cat)}
          >
            {cat === 'ALL' ? 'ALL' : categoryLabel(cat)}
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        <p style={{ ...textStyles.muted, fontSize: 13 }}>Loading insights…</p>
      ) : filtered.length === 0 ? (
        <div style={surface({ padding: 32, textAlign: 'center' })}>
          <p style={{ ...textStyles.muted, margin: 0, fontSize: 13 }}>
            {activeCategory === 'ALL'
              ? 'No insights yet. Your doctors will post lifestyle tips here.'
              : `No ${categoryLabel(activeCategory).toLowerCase()} insights yet.`}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 20,
        }}>
          {filtered.map((insight) => (
            <div
              key={insight.id}
              style={surface({
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              })}
            >
              {/* Category + emoji */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={pill(categoryTone(insight.category))}>
                  {categoryEmoji(insight.category)} {categoryLabel(insight.category)}
                </span>
                <span style={{ ...textStyles.muted, fontSize: 11 }}>{timeAgo(insight.createdAt)}</span>
              </div>

              {/* Title */}
              <h2 style={{ ...textStyles.title, margin: 0, fontSize: 15, lineHeight: '22px' }}>
                {insight.title}
              </h2>

              {/* Body */}
              <p style={{ ...textStyles.muted, margin: 0, fontSize: 13, lineHeight: '20px', flexGrow: 1 }}>
                {insight.body}
              </p>

              {/* Footer: doctor + like */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                {insight.doctorName ? (
                  <span style={{ ...textStyles.muted, fontSize: 12, fontWeight: 600 }}>
                    Dr. {insight.doctorName}
                  </span>
                ) : <span />}

                <button
                  type="button"
                  style={{
                    ...outlinedBtn,
                    fontSize: 11,
                    padding: '5px 12px',
                    ...(insight.likedByMe ? {
                      backgroundColor: '#FEF2F2',
                      borderColor: '#F87171',
                      color: '#DC2626',
                    } : {}),
                  }}
                  onClick={() => void handleReact(insight.id)}
                >
                  {insight.likedByMe ? '♥ Liked' : '♡ Like'}
                  {insight.likeCount > 0 && (
                    <span style={{ marginLeft: 6, fontWeight: 700 }}>{insight.likeCount}</span>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
