'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

type AuroraHeaderProps = {
  /** Small pill above the title, e.g. "ANNÉE SCOLAIRE 2025 — 2026" */
  kicker?: string;
  /** Main title — displayed in white */
  title: string;
  /** Second half of the title — rendered with the animated teal→cyan→sky gradient */
  titleAccent?: string;
  /** Subtitle paragraph under the title */
  subtitle?: string;
  /** Back link target (default: "/") */
  backHref?: string;
  /** Back link label (default: "Retour") */
  backLabel?: string;
  /** Right-aligned slot next to the back link — typically an action button (e.g. Export PDF) */
  action?: ReactNode;
  /** Optional slot rendered below the subtitle — for stat pills, search bars, filter chips, etc. */
  children?: ReactNode;
  /** Show the soft fade-to-content gradient at the bottom (default: true) */
  fadeToContent?: boolean;
  /** Additional top/bottom padding (default: "py-14 md:py-16") */
  padding?: string;
};

/**
 * AuroraHeader — Shared hero header for all pages.
 *
 * Combines the signature blue-green gradient of the app with aurora blobs,
 * a grid overlay, and an optional animated gradient title. Used on every
 * landing page to keep visual identity consistent.
 */
export default function AuroraHeader({
  kicker,
  title,
  titleAccent,
  subtitle,
  backHref = '/',
  backLabel = 'Retour',
  action,
  children,
  fadeToContent = true,
  padding = 'py-14 md:py-16',
}: AuroraHeaderProps) {
  return (
    <header className="relative overflow-hidden">
      {/* Base gradient — matches the rest of the app */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]" />

      {/* Aurora blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div
          className="aurora-blob"
          style={{
            top: '-10%',
            left: '-5%',
            width: '55vw',
            height: '55vw',
            background: 'radial-gradient(circle, #45b8a0 0%, transparent 60%)',
          }}
        />
        <div
          className="aurora-blob"
          style={{
            top: '10%',
            right: '-15%',
            width: '60vw',
            height: '60vw',
            background: 'radial-gradient(circle, #2d8ba8 0%, transparent 60%)',
            animationDelay: '-6s',
          }}
        />
        <div
          className="aurora-blob"
          style={{
            bottom: '-20%',
            left: '20%',
            width: '50vw',
            height: '50vw',
            background: 'radial-gradient(circle, #0891b2 0%, transparent 60%)',
            animationDelay: '-12s',
          }}
        />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.08] pointer-events-none" aria-hidden>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.3)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.3)_1px,transparent_1px)] bg-[size:72px_72px]" />
      </div>

      {/* Bottom fade to content */}
      {fadeToContent && (
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-b from-transparent to-slate-50 pointer-events-none" />
      )}

      {/* Content */}
      <div className={`relative ${padding} px-6`}>
        <div className="container mx-auto max-w-7xl">
          {/* Top row — back link + optional action */}
          <div className="flex items-center justify-between mb-8">
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 text-white/90 hover:text-white text-sm font-medium transition-colors group"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform group-hover:-translate-x-0.5"
              >
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
              {backLabel}
            </Link>
            {action && <div className="flex items-center gap-2">{action}</div>}
          </div>

          {/* Kicker pill */}
          {kicker && (
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-4 py-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase text-white/90 mb-6 animate-fadein">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-[#45b8a0] animate-ping opacity-75" />
                <span className="relative rounded-full h-2 w-2 bg-[#45b8a0]" />
              </span>
              {kicker}
            </div>
          )}

          {/* Title */}
          <h1 className="font-[Outfit,sans-serif] font-bold tracking-[-0.04em] leading-[0.92] text-white text-[clamp(2.5rem,6vw,5rem)] mb-5 animate-fadein">
            {title}
            {titleAccent && (
              <>
                {' '}
                <span className="block bg-gradient-to-r from-[#e0f7f0] via-cyan-200 to-sky-100 bg-clip-text text-transparent animate-gradient-text">
                  {titleAccent}
                </span>
              </>
            )}
          </h1>

          {/* Subtitle */}
          {subtitle && (
            <p
              className="text-white/80 text-base md:text-lg max-w-2xl leading-relaxed animate-fadein"
              style={{ animationDelay: '0.1s' }}
            >
              {subtitle}
            </p>
          )}

          {/* Custom children slot */}
          {children && (
            <div className="mt-8 animate-fadein" style={{ animationDelay: '0.15s' }}>
              {children}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
