'use client';

import Link from 'next/link';

type StatPillProps = {
  /** The stat value, e.g. "18" */
  value: string | number;
  /** Short label under/after the value, e.g. "ÉCOLES" */
  label: string;
  /** Tailwind gradient classes for the value box, e.g. "from-amber-400 via-orange-400 to-rose-500" */
  gradient: string;
  /** Variant:
   *  - "dark": white text on translucent dark background (for use inside AuroraHeader)
   *  - "light": slate text on white background (for use on page content) */
  variant?: 'dark' | 'light';
  /** Optional smaller caption displayed under the label, e.g. "5 élém. · 7 mat. · 6 prim." */
  sub?: string;
  /** Optional destination. When set, the pill becomes a clickable link (with a
   *  discreet chevron affordance) that navigates to the detailed page. */
  href?: string;
};

/**
 * StatPill — metric chip with gradient mini-box.
 *
 * Used in AuroraHeader children slot to display key metrics, or on page content for stats rows.
 * When `href` is provided, the pill turns into a `<Link>` and shows a discreet chevron so the
 * user knows it can be tapped to drill into the relevant page.
 */
export default function StatPill({
  value,
  label,
  gradient,
  variant = 'dark',
  sub,
  href,
}: StatPillProps) {
  const isDark = variant === 'dark';
  const isLink = Boolean(href);

  const containerClass = `group inline-flex items-center gap-3 rounded-2xl px-2 py-2 transition-all duration-300 hover:-translate-y-0.5 ${
    isDark
      ? 'bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/15'
      : 'bg-white border border-slate-200 shadow-[0_1px_0_rgba(15,23,42,0.02),0_8px_20px_-10px_rgba(15,23,42,0.1)] hover:shadow-[0_1px_0_rgba(15,23,42,0.04),0_16px_32px_-16px_rgba(30,90,120,0.2)]'
  }${isLink ? ' cursor-pointer' : ''}`;

  const inner = (
    <>
      <div
        className={`flex items-center justify-center min-w-[44px] h-11 px-3 rounded-xl bg-gradient-to-br ${gradient} font-[Outfit,sans-serif] font-bold text-white tabular-nums text-lg shadow-[0_4px_12px_-2px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.3)]`}
      >
        {value}
      </div>
      <div className={`${isLink ? 'pr-1' : 'pr-3'} flex flex-col`}>
        <div
          className={`text-[11px] font-bold tracking-[0.18em] uppercase leading-tight ${
            isDark ? 'text-white/85' : 'text-slate-600'
          }`}
        >
          {label}
        </div>
        {sub && (
          <div
            className={`text-[10.5px] font-medium mt-0.5 leading-tight ${
              isDark ? 'text-white/60' : 'text-slate-400'
            }`}
          >
            {sub}
          </div>
        )}
      </div>
      {isLink && (
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`shrink-0 mr-2 transition-transform duration-300 group-hover:translate-x-0.5 ${
            isDark ? 'text-white/50 group-hover:text-white/80' : 'text-slate-300 group-hover:text-slate-500'
          }`}
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      )}
    </>
  );

  if (isLink) {
    return (
      <Link href={href!} className={containerClass} aria-label={`${label} — voir le détail`}>
        {inner}
      </Link>
    );
  }

  return <div className={containerClass}>{inner}</div>;
}
