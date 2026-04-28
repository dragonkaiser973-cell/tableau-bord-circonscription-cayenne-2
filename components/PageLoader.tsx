'use client';

import { useEffect, useRef, useState } from 'react';

type PageLoaderProps = {
  /** Cycled words shown in the center glass pill. */
  words?: string[];
  /** Externally controlled 0..100 progress. If omitted, the loader self-animates. */
  progress?: number;
  /** Self-animation duration in ms (used when `progress` is undefined). */
  duration?: number;
  /** Compact mode for inline / contextual usage (no fullscreen, no fade). */
  inline?: boolean;
  /** Optional sub-label rendered above the progress bar. */
  label?: string;
};

const DEFAULT_WORDS = ['Circonscription', 'Cayenne', '2'];

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export default function PageLoader({
  words = DEFAULT_WORDS,
  progress: externalProgress,
  duration = 4500,
  inline = false,
  label,
}: PageLoaderProps) {
  const [activeWord, setActiveWord] = useState(0);
  const [exiting, setExiting] = useState<number | null>(null);
  const [internalPct, setInternalPct] = useState(0);
  const [displayed, setDisplayed] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const progress =
    typeof externalProgress === 'number'
      ? Math.max(0, Math.min(100, Math.round(externalProgress)))
      : internalPct;

  // Word carousel
  useEffect(() => {
    const id = setInterval(() => {
      setExiting(activeWord);
      setTimeout(() => setExiting(null), 480);
      setActiveWord((cur) => (cur + 1) % words.length);
    }, 2200);
    return () => clearInterval(id);
  }, [activeWord, words.length]);

  // Self-animated progress (only when not externally controlled)
  useEffect(() => {
    if (typeof externalProgress === 'number') return;
    const tick = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const t = Math.min((ts - startRef.current) / duration, 1);
      const pct = Math.round(easeInOut(t) * 100);
      setInternalPct(pct);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [externalProgress, duration]);

  // Counter chases progress at ~60fps
  useEffect(() => {
    if (displayed >= progress) return;
    const id = setTimeout(() => setDisplayed((d) => Math.min(d + 1, progress)), 16);
    return () => clearTimeout(id);
  }, [displayed, progress]);

  const wrapperClass = inline
    ? 'relative w-full overflow-hidden rounded-3xl'
    : 'fixed inset-0 z-[100] overflow-hidden';

  return (
    <div
      className={`${wrapperClass} flex flex-col items-center justify-center pl-loader-root`}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-busy={progress < 100}
      aria-label="Chargement"
    >
      {/* Aurora gradient background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            'linear-gradient(155deg, #1e5a78 0%, #2d8ba8 35%, #6bbfd8 62%, #c8eaf4 80%, #ffffff 100%)',
        }}
      />
      {/* Aurora blobs */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden>
        <span className="pl-blob pl-blob-1" />
        <span className="pl-blob pl-blob-2" />
        <span className="pl-blob pl-blob-3" />
      </div>
      {/* Grid overlay */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.25) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          opacity: 0.08,
        }}
        aria-hidden
      />
      {/* Bottom white fade */}
      <div
        className="absolute bottom-0 left-0 right-0 z-[2] pointer-events-none"
        style={{
          height: '38%',
          background:
            'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.7) 35%, #ffffff 70%)',
        }}
        aria-hidden
      />

      {/* Word carousel */}
      <div className="relative z-10 w-full flex-1 flex items-center justify-center">
        <div className="pl-carousel">
          {words.map((word, i) => {
            const isActive = i === activeWord;
            const isExiting = exiting === i;
            return (
              <span
                key={`${word}-${i}`}
                className={`pl-word ${isActive ? 'pl-enter' : ''} ${isExiting ? 'pl-exit' : ''}`}
                aria-hidden={!isActive}
              >
                {word}
              </span>
            );
          })}
        </div>
      </div>

      {/* Bottom progress */}
      <div className="relative z-10 w-full px-[4vw] pb-[4vh]">
        {label && (
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#1e5a78]/60 font-bold mb-2 text-right">
            {label}
          </div>
        )}
        <div className="pl-pct" aria-hidden>
          <span>{displayed}</span>
          <span className="pl-pct-sign">%</span>
        </div>
        <div className="pl-bar-track">
          <div className="pl-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <style jsx global>{`
        .pl-blob {
          position: absolute;
          border-radius: 9999px;
          filter: blur(72px);
          opacity: 0.45;
          animation: plAuroraShift 18s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
          will-change: transform;
        }
        .pl-blob-1 {
          width: 60vw;
          height: 60vw;
          background: radial-gradient(circle, #45b8a0 0%, transparent 70%);
          top: -20%;
          left: -15%;
        }
        .pl-blob-2 {
          width: 45vw;
          height: 45vw;
          background: radial-gradient(circle, #2d8ba8 0%, transparent 70%);
          bottom: -10%;
          right: -10%;
          animation-delay: -6s;
        }
        .pl-blob-3 {
          width: 35vw;
          height: 35vw;
          background: radial-gradient(circle, #a8e6da 0%, transparent 70%);
          top: 30%;
          right: 15%;
          animation-delay: -12s;
        }
        @keyframes plAuroraShift {
          0%   { transform: translate(0, 0) scale(1); }
          33%  { transform: translate(3%, 5%) scale(1.05); }
          66%  { transform: translate(-4%, 2%) scale(0.97); }
          100% { transform: translate(0, 0) scale(1); }
        }
        .pl-carousel {
          position: relative;
          width: 100%;
          height: clamp(5rem, 10vw, 10rem);
          overflow: hidden;
        }
        .pl-word {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, calc(-50% + 120px));
          opacity: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.12em 0.6em 0.18em;
          font-family: 'Outfit', sans-serif;
          font-weight: 900;
          font-size: clamp(1.8rem, 5vw, 5rem);
          letter-spacing: -0.04em;
          line-height: 1;
          white-space: nowrap;
          background: rgba(255, 255, 255, 0.18);
          border: 1.5px solid rgba(255, 255, 255, 0.55);
          border-radius: 9999px;
          box-shadow:
            inset 0 1.5px 0 rgba(255, 255, 255, 0.7),
            inset 0 -1px 0 rgba(255, 255, 255, 0.1),
            0 4px 24px rgba(30, 90, 120, 0.18);
          color: #ffffff;
          text-shadow:
            0 1px 2px rgba(20, 60, 90, 0.3),
            0 0 20px rgba(255, 255, 255, 0.4);
          will-change: transform, opacity;
        }
        .pl-word.pl-enter {
          animation: plWordEnter 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .pl-word.pl-exit {
          animation: plWordExit 0.45s cubic-bezier(0.55, 0, 0.8, 0.2) forwards;
        }
        @keyframes plWordEnter {
          from { transform: translate(-50%, calc(-50% - 120px)); opacity: 0; }
          to   { transform: translate(-50%, -50%);                opacity: 1; }
        }
        @keyframes plWordExit {
          from { transform: translate(-50%, -50%);                opacity: 1; }
          to   { transform: translate(-50%, calc(-50% + 120px)); opacity: 0; }
        }
        .pl-pct {
          font-family: 'Outfit', sans-serif;
          font-weight: 900;
          font-size: clamp(3.5rem, 12vw, 11rem);
          letter-spacing: -0.04em;
          color: #ffffff;
          text-shadow:
            0 2px 24px rgba(30, 90, 120, 0.35),
            0 1px 4px rgba(0, 0, 0, 0.18);
          line-height: 1;
          margin-bottom: 1rem;
          font-variant-numeric: tabular-nums;
          display: flex;
          align-items: baseline;
          justify-content: flex-end;
          gap: 0.1em;
        }
        .pl-pct-sign {
          font-size: 0.45em;
          font-weight: 700;
          opacity: 0.7;
          text-shadow:
            0 2px 24px rgba(30, 90, 120, 0.35),
            0 1px 4px rgba(0, 0, 0, 0.18);
        }
        .pl-bar-track {
          width: 100%;
          height: 4px;
          background: rgba(30, 90, 120, 0.15);
          border-radius: 9999px;
          overflow: hidden;
        }
        .pl-bar-fill {
          height: 100%;
          width: 0%;
          border-radius: 9999px;
          background: linear-gradient(90deg, #1e5a78, #2d8ba8, #45b8a0);
          background-size: 200% 100%;
          animation: plBarShimmer 2s linear infinite;
          transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 0 12px rgba(45, 139, 168, 0.4);
        }
        @keyframes plBarShimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
