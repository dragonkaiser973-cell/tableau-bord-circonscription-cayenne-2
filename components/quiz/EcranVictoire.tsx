'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import Trophee from './Trophee';

type Props = {
  rang: 1 | 2 | 3;
  pseudo: string;
  score: number;
};

const TEXTES: Record<Props['rang'], { titre: string; sousTitre: string; couleurFond: string; couleurRuban: string }> = {
  1: {
    titre: 'CHAMPION·NE !',
    sousTitre: 'Tu es 1ᵉʳ !',
    couleurFond: '#7c2d12',                                          // halo rouge foncé derrière
    couleurRuban: 'linear-gradient(180deg,#ef4444 0%,#b91c1c 100%)', // bandeau rouge
  },
  2: {
    titre: 'BRAVO !',
    sousTitre: 'Tu es 2ᵉ !',
    couleurFond: '#475569',
    couleurRuban: 'linear-gradient(180deg,#94a3b8 0%,#475569 100%)',
  },
  3: {
    titre: 'BELLE PERFO !',
    sousTitre: 'Tu es 3ᵉ !',
    couleurFond: '#9a3412',
    couleurRuban: 'linear-gradient(180deg,#fb923c 0%,#c2410c 100%)',
  },
};

const VARIANTS_TROPHEE: Record<Props['rang'], 'or' | 'argent' | 'bronze'> = {
  1: 'or', 2: 'argent', 3: 'bronze',
};

export default function EcranVictoire({ rang, pseudo, score }: Props) {
  const txt = TEXTES[rang];
  const audioStartedRef = useRef(false);

  // ─── Son de fanfare (Web Audio API — pas de fichier à télécharger) ───
  useEffect(() => {
    if (audioStartedRef.current) return;
    audioStartedRef.current = true;
    try {
      const AudioCtor: typeof AudioContext | undefined =
        (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
          .AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return;
      const ctx = new AudioCtor();

      // Petite mélodie ascendante de fanfare : do — mi — sol — do aigu
      const notes = rang === 1
        ? [
            { freq: 523.25, t: 0.0, dur: 0.18 }, // do5
            { freq: 659.25, t: 0.18, dur: 0.18 }, // mi5
            { freq: 783.99, t: 0.36, dur: 0.18 }, // sol5
            { freq: 1046.5, t: 0.6, dur: 0.5 },  // do6 (final, plus long)
          ]
        : rang === 2
        ? [
            { freq: 392.0, t: 0.0, dur: 0.18 },  // sol4
            { freq: 523.25, t: 0.18, dur: 0.18 }, // do5
            { freq: 783.99, t: 0.4, dur: 0.45 }, // sol5
          ]
        : [
            { freq: 329.63, t: 0.0, dur: 0.22 }, // mi4
            { freq: 523.25, t: 0.25, dur: 0.4 }, // do5
          ];

      const start = ctx.currentTime;
      for (const n of notes) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = n.freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t0 = start + n.t;
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(0.25, t0 + 0.02);
        gain.gain.linearRampToValueAtTime(0.001, t0 + n.dur);
        osc.start(t0);
        osc.stop(t0 + n.dur + 0.02);
      }
      // Petit cymbal/swoosh blanc pour la note finale (1ʳᵉ place uniquement)
      if (rang === 1) {
        const noise = ctx.createBufferSource();
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
        noise.buffer = buf;
        const ng = ctx.createGain();
        ng.gain.value = 0.15;
        noise.connect(ng);
        ng.connect(ctx.destination);
        noise.start(start + 0.55);
      }
    } catch {
      // Audio bloqué (autoplay policy) : silencieux, pas grave
    }
  }, [rang]);

  // ─── Confettis ───
  useEffect(() => {
    const colors = ['#fbbf24', '#fde047', '#facc15', '#ef4444', '#22c55e', '#06b6d4', '#a78bfa'];
    const fin = Date.now() + (rang === 1 ? 5000 : rang === 2 ? 3500 : 2500);
    const it = setInterval(() => {
      if (Date.now() > fin) { clearInterval(it); return; }
      confetti({
        particleCount: 5,
        startVelocity: 0,
        ticks: 200,
        gravity: 0.7,
        spread: 360,
        origin: { x: Math.random(), y: 0 },
        colors,
        scalar: 1,
      });
    }, 90);

    const canon = (origin: { x: number; y: number }, angle: number) => confetti({
      particleCount: 100, spread: 80, startVelocity: 65, angle, origin, colors, scalar: 1.1,
    });
    const t1 = setTimeout(() => canon({ x: 0.1, y: 0.85 }, 60), 200);
    const t2 = setTimeout(() => canon({ x: 0.9, y: 0.85 }, 120), 450);
    const t3 = setTimeout(() => canon({ x: 0.5, y: 0.7 }, 90), 800);
    return () => { clearInterval(it); [t1, t2, t3].forEach(clearTimeout); };
  }, [rang]);

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden" style={{ zIndex: 30, backgroundColor: '#020617' }}>
      {/* Halo coloré de fond */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 45%, ${txt.couleurFond} 0%, #020617 70%)`,
        }}
      />

      {/* Rayons lumineux tournants (SVG conique animé) */}
      <Rayons />

      {/* Contenu principal — les étoiles sont rendues dans le wrapper de la coupe */}
      <div className="relative flex flex-col items-center px-6 text-center" style={{ zIndex: 2 }}>
        {/* Titre haut */}
        <motion.h1
          initial={{ scale: 0.5, opacity: 0, y: -30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 220, damping: 14 }}
          className="text-4xl md:text-5xl font-black text-amber-300 mb-4 drop-shadow-[0_4px_20px_rgba(251,191,36,0.6)]"
          style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '0.05em' }}
        >
          {txt.titre}
        </motion.h1>

        {/* Coupe géante + étoiles symétriques autour */}
        <div className="relative my-2" style={{ width: 220, height: 220 }}>
          <Etoiles />
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 180, damping: 12 }}
            className="drop-shadow-[0_15px_40px_rgba(0,0,0,0.6)]"
          >
            <Trophee variant={VARIANTS_TROPHEE[rang]} size={220} />
          </motion.div>
        </div>

        {/* Bandeau ruban */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="relative w-full max-w-xs mt-4"
        >
          <Ruban couleurFond={txt.couleurRuban}>
            <p className="text-white font-black text-2xl md:text-3xl" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {txt.sousTitre}
            </p>
          </Ruban>
        </motion.div>

        {/* Pseudo + score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.4 }}
          className="mt-6 text-center"
        >
          <p className="text-white/90 text-xl font-bold">{pseudo}</p>
          <p className="font-mono text-amber-300 font-black text-4xl mt-1 drop-shadow-[0_2px_10px_rgba(251,191,36,0.4)]">
            {score}
          </p>
          <p className="text-white/50 text-xs uppercase tracking-widest mt-1">Score final</p>
        </motion.div>
      </div>
    </div>
  );
}

// ─────────── Sous-composants ───────────

function Rayons() {
  // 12 rayons coniques dorés qui tournent doucement.
  // Conteneur **carré** (pas étiré au ratio écran) centré sur la viewport,
  // assez grand pour donner l'effet « rayons longs » comme à l'origine.
  // Le viewBox est carré et les rayons tournent autour de (0,0) = centre du
  // viewBox = centre du conteneur = centre de la coupe (car même centrage).
  // overflow: visible permet aux rayons de dépasser du SVG si nécessaire,
  // mais comme le conteneur est carré, le résultat reste centré.
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        top: '50%',
        left: '50%',
        width: 'min(150vmin, 900px)',
        height: 'min(150vmin, 900px)',
        transform: 'translate(-50%, -50%)',
        zIndex: 1,
      }}
      aria-hidden
    >
      <svg
        viewBox="-100 -100 200 200"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ mixBlendMode: 'screen' as React.CSSProperties['mixBlendMode'], overflow: 'visible' }}
      >
        <defs>
          <radialGradient id="rayon-fade" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(251,191,36,0.55)" />
            <stop offset="55%" stopColor="rgba(251,191,36,0.18)" />
            <stop offset="100%" stopColor="rgba(251,191,36,0)" />
          </radialGradient>
        </defs>
        <g className="rayons-rotation" style={{ transformOrigin: 'center' }}>
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 360) / 12;
            return (
              <polygon
                key={i}
                points="0,0 -6,-90 6,-90"
                fill="url(#rayon-fade)"
                transform={`rotate(${angle})`}
              />
            );
          })}
        </g>
        <style>{`
          .rayons-rotation { animation: tourneRayons 18s linear infinite; }
          @keyframes tourneRayons { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </svg>
    </div>
  );
}

function Etoiles() {
  // 2 étoiles dorées symétriques, positionnées par rapport au wrapper de la coupe
  // (220×220 px). Le parent en `relative my-2 w-[220px] h-[220px]` nous sert de
  // référence : on place chaque étoile en absolute avec un offset miroir.
  // Pour éviter le bug Framer Motion qui écrase nos transforms, le positionnement
  // est fait via top/marginTop (numeric) au lieu de transform.
  const TAILLE = 56; // px
  const ECART = 14;  // px entre le bord de la coupe (220 px) et l'étoile — petit pour rentrer sur mobile 375 px
  // Centre vertical de l'étoile aligné sur le centre de la coupe (110 px du haut du wrapper).
  // Bord gauche horizontal : -ECART - TAILLE
  // Bord droit horizontal :  220 + ECART
  const topCentre = 220 / 2 - TAILLE / 2; // 82
  const leftGauche = -ECART - TAILLE;     // -86
  const leftDroite = 220 + ECART;         // 250

  const Etoile = ({ left, delay }: { left: number; delay: number }) => (
    <div
      className="absolute"
      style={{ top: topCentre, left, width: TAILLE, height: TAILLE, zIndex: 2 }}
    >
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5 + delay, type: 'spring', stiffness: 200, damping: 14 }}
      >
        <motion.svg
          width={TAILLE}
          height={TAILLE}
          viewBox="0 0 100 100"
          animate={{ y: [0, -8, 0], rotate: [0, 8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="drop-shadow-[0_4px_12px_rgba(251,191,36,0.7)]"
        >
          <defs>
            <linearGradient id="etoile-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
          </defs>
          <polygon
            points="50,8 60,38 92,42 67,62 75,92 50,75 25,92 33,62 8,42 40,38"
            fill="url(#etoile-grad)"
            stroke="#78350f"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </motion.svg>
      </motion.div>
    </div>
  );
  return (
    <>
      <Etoile left={leftGauche} delay={0} />
      <Etoile left={leftDroite} delay={0.15} />
    </>
  );
}

function Ruban({ children, couleurFond }: { children: React.ReactNode; couleurFond: string }) {
  // Bandeau central + queues latérales triangulaires pour l'effet ruban
  return (
    <div className="relative">
      {/* Queue gauche */}
      <div
        className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-10"
        style={{
          background: couleurFond,
          clipPath: 'polygon(0 50%, 100% 0, 100% 100%)',
          filter: 'brightness(0.7)',
          zIndex: 1,
        }}
      />
      {/* Queue droite */}
      <div
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-10"
        style={{
          background: couleurFond,
          clipPath: 'polygon(0 0, 100% 50%, 0 100%)',
          filter: 'brightness(0.7)',
          zIndex: 1,
        }}
      />
      {/* Corps du ruban */}
      <div
        className="relative px-6 py-4 rounded-md text-center"
        style={{
          background: couleurFond,
          boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.25), 0 6px 20px rgba(0,0,0,0.5)',
          zIndex: 2,
        }}
      >
        {/* Encoche supérieure du ruban */}
        <div
          className="absolute -left-2 -bottom-2 w-4 h-4"
          style={{ background: couleurFond, clipPath: 'polygon(0 0, 100% 0, 100% 100%)', filter: 'brightness(0.5)' }}
        />
        <div
          className="absolute -right-2 -bottom-2 w-4 h-4"
          style={{ background: couleurFond, clipPath: 'polygon(0 0, 100% 0, 0 100%)', filter: 'brightness(0.5)' }}
        />
        {children}
      </div>
    </div>
  );
}
