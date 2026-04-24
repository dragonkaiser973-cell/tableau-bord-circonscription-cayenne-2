'use client';

import { motion } from 'framer-motion';

type GradientMonogramProps = {
  /** Text to display (typically initials, 1–3 chars) */
  text: string;
  /** Tailwind gradient classes, e.g. "from-sky-400 via-cyan-400 to-teal-400" */
  gradient: string;
  /** Size — "sm" (w-10 h-10), "md" (w-14 h-14), "lg" (w-16 h-16) */
  size?: 'sm' | 'md' | 'lg';
  /** Disable the rotate+scale hover micro-interaction */
  noHover?: boolean;
};

const SIZE_MAP = {
  sm: { box: 'w-10 h-10 rounded-xl text-sm', font: 'text-sm' },
  md: { box: 'w-14 h-14 rounded-2xl', font: 'text-lg' },
  lg: { box: 'w-16 h-16 rounded-2xl', font: 'text-xl' },
};

/**
 * GradientMonogram — initials/abbreviation in a gradient square with hover micro-interaction.
 *
 * Used as avatar for people cards, icon for school cards, badge for stat pills.
 */
export default function GradientMonogram({
  text,
  gradient,
  size = 'md',
  noHover = false,
}: GradientMonogramProps) {
  const sizeClasses = SIZE_MAP[size];
  return (
    <motion.div
      whileHover={noHover ? undefined : { rotate: -6, scale: 1.06 }}
      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
      className={`flex-shrink-0 ${sizeClasses.box} bg-gradient-to-br ${gradient} flex items-center justify-center font-[Outfit,sans-serif] font-bold text-white ${sizeClasses.font} tracking-tight shadow-[0_8px_20px_-6px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.3)]`}
    >
      {text}
    </motion.div>
  );
}

/** Utility: extract initials from a full name (up to 2 chars) */
export function initials(name: string): string {
  return name
    .replace(/^(Mme|M\.|Mr|Mlle)\s+/, '')
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}
