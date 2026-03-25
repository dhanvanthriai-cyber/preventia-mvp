'use client';

import React from 'react';
import type { AuthUser } from '@preventia/shared';
import {
  pill,
  surface,
  textStyles,
  webTheme,
  pageShell,
} from '@/lib/designSystem';

interface Article {
  tag: string;
  title: string;
  source: string;
  url: string;
  date: string;
}

const HEALTH_ARTICLES: Article[] = [
  {
    tag: 'DIABETES',
    title: 'Advanced Continuous Glucose Monitoring Techniques',
    source: 'American Diabetes Association',
    url: 'https://diabetes.org/tools-support/devices-technology/cgm',
    date: '2026-02',
  },
  {
    tag: 'HYPERTENSION',
    title: 'New Guidelines for Managing High Blood Pressure at Home',
    source: 'American Heart Association',
    url: 'https://www.heart.org/en/health-topics/high-blood-pressure',
    date: '2026-01',
  },
  {
    tag: 'NUTRITION',
    title: 'Mediterranean Diet and Cardiovascular Risk Reduction',
    source: 'NIH / NEJM',
    url: 'https://www.nejm.org/doi/full/10.1056/NEJMoa1200303',
    date: '2025-11',
  },
  {
    tag: 'TELEHEALTH',
    title: 'The Future of Remote Patient Monitoring in Primary Care',
    source: 'WHO Digital Health',
    url: 'https://www.who.int/teams/digital-health-and-innovation',
    date: '2026-01',
  },
  {
    tag: 'MENTAL HEALTH',
    title: 'Digital CBT Tools for Managing Chronic Disease Anxiety',
    source: 'Lancet Digital Health',
    url: 'https://www.thelancet.com/journals/landig/home',
    date: '2025-12',
  },
  {
    tag: 'ALLERGIES',
    title: 'Seasonal Allergy Management: 2026 Clinical Updates',
    source: 'AAAAI',
    url: 'https://www.aaaai.org/tools-for-the-public/allergy,-asthma-immunology-glossary',
    date: '2026-02',
  },
];

function tagTone(tag: string): 'rose' | 'gold' | 'success' | 'accent' | 'neutral' {
  if (tag === 'DIABETES') return 'rose';
  if (tag === 'HYPERTENSION') return 'rose';
  if (tag === 'NUTRITION') return 'success';
  if (tag === 'TELEHEALTH') return 'accent';
  if (tag === 'MENTAL HEALTH') return 'gold';
  return 'neutral';
}

function formatMonth(ym: string): string {
  const [year, month] = ym.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'long' });
}

interface Props {
  user: AuthUser;
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

export default function PatientNewsPage({ user: _user }: Readonly<Props>) {
  return (
    <div style={pageShell}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <a href="/patient/health" style={outlinedBtn}>← Back</a>
        <span style={{ ...textStyles.eyebrow }}>Health Newsroom</span>
      </div>

      <h1 style={{ ...textStyles.display, fontSize: 28, margin: '0 0 24px' }}>
        Newsroom
      </h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 20,
      }}>
        {HEALTH_ARTICLES.map((article) => (
          <div
            key={article.url}
            style={surface({
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            })}
          >
            <span style={pill(tagTone(article.tag))}>{article.tag}</span>
            <h2 style={{ ...textStyles.title, margin: 0, fontSize: 15, lineHeight: '22px' }}>
              {article.title}
            </h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ ...textStyles.muted, fontSize: 12 }}>{article.source}</span>
              <span style={{ ...textStyles.muted, fontSize: 11 }}>{formatMonth(article.date)}</span>
            </div>
            <a
              href={article.url}
              target="_blank"
              rel="noreferrer"
              style={{
                ...textStyles.muted,
                fontSize: 12,
                color: webTheme.colors.accentStrong,
                textDecoration: 'none',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase' as const,
                marginTop: 'auto',
              }}
            >
              Read Article →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
