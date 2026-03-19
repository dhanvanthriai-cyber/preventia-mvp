import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

type Metric = {
  label: string;
  value: string;
  detail: string;
};

type Spotlight = {
  eyebrow: string;
  title: string;
  body: string;
  icon: LucideIcon;
  tone?: 'neutral' | 'sage' | 'gold';
};

type AdminSectionPageProps = {
  badge: string;
  title: string;
  description: string;
  metrics: Metric[];
  spotlights: Spotlight[];
  children?: ReactNode;
};

function toneClasses(tone: Spotlight['tone']) {
  if (tone === 'sage') {
    return 'bg-[#EEF3EA] text-[#657C62]';
  }
  if (tone === 'gold') {
    return 'bg-[#F5EEE2] text-[#8E7342]';
  }
  return 'bg-[#F4EFE7] text-[#6D675F]';
}

export default function AdminSectionPage({
  badge,
  title,
  description,
  metrics,
  spotlights,
  children,
}: Readonly<AdminSectionPageProps>) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#E5E1DA] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,245,240,0.94))] p-6 shadow-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex rounded-full border border-[#E5E1DA] bg-[#F8F5F0] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7B746C]">
              {badge}
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[#2D2D2D] md:text-[2.5rem]">
                {title}
              </h2>
              <p className="max-w-2xl text-[15px] leading-7 text-[#6F6A63] md:text-base">
                {description}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[520px]">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-2xl border border-[#E9E3DB] bg-white/90 p-4 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8A837A]">
                  {metric.label}
                </p>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#2D2D2D]">
                  {metric.value}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#6F6A63]">{metric.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {spotlights.map(({ eyebrow, title: cardTitle, body, icon: Icon, tone = 'neutral' }) => (
          <article
            key={cardTitle}
            className="rounded-2xl border border-[#E5E1DA] bg-[#FFFCF8] p-5 shadow-sm"
          >
            <div
              className={`mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl ${toneClasses(tone)}`}
            >
              <Icon className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8A837A]">
              {eyebrow}
            </p>
            <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-[#2D2D2D]">
              {cardTitle}
            </h3>
            <p className="mt-3 text-sm leading-7 text-[#6F6A63]">{body}</p>
          </article>
        ))}
      </section>

      {children}
    </div>
  );
}
