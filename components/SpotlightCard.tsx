'use client';

import { motion } from 'framer-motion';
import { ReactNode, useRef, MouseEvent } from 'react';

type SpotlightCardProps = {
  /** Tailwind gradient classes for the top accent bar, e.g. "from-sky-400 via-cyan-400 to-teal-400" */
  accent?: string;
  /** Additional classes for the wrapper */
  className?: string;
  /** Click handler — makes the card behave as a button (adds cursor-pointer) */
  onClick?: () => void;
  /** Disable the hover lift animation */
  noLift?: boolean;
  /** Optional padding override (default: "p-6 md:p-7") */
  padding?: string;
  children: ReactNode;
};

/**
 * SpotlightCard — premium card with cursor-follow spotlight + optional gradient accent bar.
 *
 * Matches the aesthetic of the Annuaire cards: subtle hover lift, teal spotlight
 * that follows the cursor, inner refraction, and a configurable gradient bar on top.
 */
export default function SpotlightCard({
  accent,
  className = '',
  onClick,
  noLift = false,
  padding = 'p-6 md:p-7',
  children,
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLElement>(null);

  const handleMove = (e: MouseEvent<HTMLElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width) * 100}%`);
    el.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height) * 100}%`);
  };

  const cursorClass = onClick ? 'cursor-pointer' : '';

  return (
    <motion.article
      ref={cardRef as any}
      onMouseMove={handleMove}
      onClick={onClick}
      whileHover={noLift ? undefined : { y: -4 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className={`spotlight-card group relative h-full rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-[0_1px_0_rgba(15,23,42,0.02),0_16px_36px_-20px_rgba(15,23,42,0.1)] hover:shadow-[0_1px_0_rgba(15,23,42,0.04),0_32px_60px_-24px_rgba(30,90,120,0.28)] hover:border-[#45b8a0]/40 transition-[box-shadow,border-color] duration-300 ${cursorClass} ${className}`}
    >
      {/* Top gradient bar */}
      {accent && (
        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />
      )}

      {/* Inner refraction */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]" />

      {/* Content */}
      <div className={`relative ${padding}`}>{children}</div>
    </motion.article>
  );
}
