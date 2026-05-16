'use client';

// Trophée / coupe SVG dessinée pour les paliers du podium.
// Variant : 'or' (1ʳᵉ place), 'argent' (2ᵉ place), 'bronze' (3ᵉ place).
// Le composant retourne un SVG inline coloré + détails (anses, socle, étoile,
// reflets) pour donner du relief sans dépendre d'une image externe.

type TropheeProps = {
  variant: 'or' | 'argent' | 'bronze';
  size?: number; // px (carré)
  className?: string;
};

const PALETTES: Record<TropheeProps['variant'], { stops: [string, string, string]; ombre: string; reflet: string }> = {
  or: {
    stops: ['#fef3c7', '#fbbf24', '#b45309'],
    ombre: '#78350f',
    reflet: '#fffbeb',
  },
  argent: {
    stops: ['#f8fafc', '#cbd5e1', '#64748b'],
    ombre: '#334155',
    reflet: '#ffffff',
  },
  bronze: {
    stops: ['#fed7aa', '#f97316', '#9a3412'],
    ombre: '#7c2d12',
    reflet: '#fff7ed',
  },
};

export default function Trophee({ variant, size = 96, className = '' }: TropheeProps) {
  const p = PALETTES[variant];
  const id = `trophee-${variant}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 120"
      className={className}
      aria-label={`Coupe ${variant}`}
      role="img"
    >
      <defs>
        <linearGradient id={`${id}-coupe`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={p.stops[0]} />
          <stop offset="50%" stopColor={p.stops[1]} />
          <stop offset="100%" stopColor={p.stops[2]} />
        </linearGradient>
        <linearGradient id={`${id}-socle`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={p.stops[1]} />
          <stop offset="100%" stopColor={p.stops[2]} />
        </linearGradient>
        <radialGradient id={`${id}-brillance`} cx="35%" cy="30%" r="50%">
          <stop offset="0%" stopColor={p.reflet} stopOpacity="0.85" />
          <stop offset="100%" stopColor={p.reflet} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Socle bas */}
      <rect x="28" y="105" width="44" height="10" rx="2" fill={`url(#${id}-socle)`} stroke={p.ombre} strokeWidth="0.6" />
      {/* Pied */}
      <rect x="42" y="88" width="16" height="18" fill={`url(#${id}-socle)`} stroke={p.ombre} strokeWidth="0.6" />
      {/* Coupe principale */}
      <path
        d="M 22 18 Q 22 70 50 80 Q 78 70 78 18 Z"
        fill={`url(#${id}-coupe)`}
        stroke={p.ombre}
        strokeWidth="0.8"
      />
      {/* Bord supérieur de la coupe */}
      <rect x="20" y="14" width="60" height="6" rx="2" fill={`url(#${id}-coupe)`} stroke={p.ombre} strokeWidth="0.6" />
      {/* Anse gauche */}
      <path
        d="M 22 22 Q 8 24 8 42 Q 8 56 22 56"
        fill="none"
        stroke={`url(#${id}-coupe)`}
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* Anse droite */}
      <path
        d="M 78 22 Q 92 24 92 42 Q 92 56 78 56"
        fill="none"
        stroke={`url(#${id}-coupe)`}
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* Brillance/reflet sur la coupe */}
      <ellipse cx="40" cy="38" rx="14" ry="22" fill={`url(#${id}-brillance)`} />
      {/* Étoile gravée au centre */}
      <path
        d="M 50 32 L 53.5 41 L 63 41.5 L 55.5 47.5 L 58 56.5 L 50 51.5 L 42 56.5 L 44.5 47.5 L 37 41.5 L 46.5 41 Z"
        fill={p.reflet}
        opacity="0.85"
        stroke={p.ombre}
        strokeWidth="0.4"
      />
    </svg>
  );
}
