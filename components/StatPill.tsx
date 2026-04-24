'use client';

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
};

/**
 * StatPill — metric chip with gradient mini-box.
 *
 * Used in AuroraHeader children slot to display key metrics, or on page content for stats rows.
 */
export default function StatPill({
  value,
  label,
  gradient,
  variant = 'dark',
}: StatPillProps) {
  const isDark = variant === 'dark';
  return (
    <div
      className={`inline-flex items-center gap-3 rounded-2xl px-2 py-2 transition-all duration-300 hover:-translate-y-0.5 ${
        isDark
          ? 'bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/15'
          : 'bg-white border border-slate-200 shadow-[0_1px_0_rgba(15,23,42,0.02),0_8px_20px_-10px_rgba(15,23,42,0.1)] hover:shadow-[0_1px_0_rgba(15,23,42,0.04),0_16px_32px_-16px_rgba(30,90,120,0.2)]'
      }`}
    >
      <div
        className={`flex items-center justify-center min-w-[44px] h-11 px-3 rounded-xl bg-gradient-to-br ${gradient} font-[Outfit,sans-serif] font-bold text-white tabular-nums text-lg shadow-[0_4px_12px_-2px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.3)]`}
      >
        {value}
      </div>
      <div
        className={`pr-3 text-[11px] font-bold tracking-[0.18em] uppercase ${
          isDark ? 'text-white/85' : 'text-slate-600'
        }`}
      >
        {label}
      </div>
    </div>
  );
}
