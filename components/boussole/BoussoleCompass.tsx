'use client';

import { useEffect, useRef, useState } from 'react';
import { EMOJIS, EMOJI_LABELS } from './emojis';

export interface Deposit {
  id: string;
  phase: 'avant' | 'apres';
  emoji: string;
  label: string | null;
  x: number;
  y: number;
  created_at: string;
}

export type BoussoleMode = 'avant' | 'apres' | 'evolution';

interface DragInfo {
  from: 'palette' | 'compass';
  emoji: string;
  label: string;
  id?: string;
}

interface Props {
  deposits: Deposit[];
  mode: BoussoleMode;
  onAdd?: (phase: 'avant' | 'apres', emoji: string, label: string, x: number, y: number) => void;
  onMove?: (id: string, x: number, y: number) => void;
  onRemove?: (id: string) => void;
  readOnly?: boolean;
  showPalette?: boolean;
  size?: 'compact' | 'full';
}

function centroid(pts: { x: number; y: number }[]) {
  if (pts.length === 0) return null;
  const sx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
  const sy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
  return { x: sx, y: sy };
}

export default function BoussoleCompass({
  deposits, mode, onAdd, onMove, onRemove, readOnly, showPalette = true, size = 'compact',
}: Props) {
  const compassRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragInfo | null>(null);
  const [dragging, setDragging] = useState<DragInfo | null>(null);
  const [selectedPaletteEmoji, setSelectedPaletteEmoji] = useState<string | null>(null);

  const visible = mode === 'evolution' ? deposits : deposits.filter(d => d.phase === mode);
  const avantPts = deposits.filter(d => d.phase === 'avant');
  const apresPts = deposits.filter(d => d.phase === 'apres');
  const cAvant = centroid(avantPts);
  const cApres = centroid(apresPts);

  const interactive = !readOnly && (mode === 'avant' || mode === 'apres');

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: PointerEvent) => {
      if (ghostRef.current) {
        ghostRef.current.style.left = e.clientX + 'px';
        ghostRef.current.style.top = e.clientY + 'px';
      }
    };

    const handleUp = (e: PointerEvent) => {
      const info = dragRef.current;
      if (!info || !compassRef.current) {
        dragRef.current = null;
        setDragging(null);
        return;
      }
      const r = compassRef.current.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      if (info.from === 'palette') {
        if (inside && onAdd && (mode === 'avant' || mode === 'apres')) {
          onAdd(mode, info.emoji, info.label, Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y)));
        }
      } else if (info.from === 'compass' && info.id) {
        if (inside && onMove) {
          onMove(info.id, Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y)));
        } else if (!inside && onRemove) {
          onRemove(info.id);
        }
      }
      dragRef.current = null;
      setDragging(null);
    };

    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
    document.addEventListener('pointercancel', handleUp);
    return () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
      document.removeEventListener('pointercancel', handleUp);
    };
  }, [dragging, mode, onAdd, onMove, onRemove]);

  const startDragFromPalette = (e: React.PointerEvent, emoji: string, label: string) => {
    if (!interactive) return;
    e.preventDefault();
    setSelectedPaletteEmoji(emoji);
    const info: DragInfo = { from: 'palette', emoji, label };
    dragRef.current = info;
    setDragging(info);
    requestAnimationFrame(() => {
      if (ghostRef.current) {
        ghostRef.current.style.left = e.clientX + 'px';
        ghostRef.current.style.top = e.clientY + 'px';
      }
    });
  };

  const startDragFromCompass = (e: React.PointerEvent, dep: Deposit) => {
    if (!interactive) return;
    if (dep.phase !== mode) return;
    e.preventDefault();
    e.stopPropagation();
    const info: DragInfo = { from: 'compass', emoji: dep.emoji, label: dep.label || '', id: dep.id };
    dragRef.current = info;
    setDragging(info);
    requestAnimationFrame(() => {
      if (ghostRef.current) {
        ghostRef.current.style.left = e.clientX + 'px';
        ghostRef.current.style.top = e.clientY + 'px';
      }
    });
  };

  const negEmojis = EMOJIS.filter(e => e.group === 'neg');
  const neuEmojis = EMOJIS.filter(e => e.group === 'neu');
  const posEmojis = EMOJIS.filter(e => e.group === 'pos');

  const showArrow = mode === 'evolution' && cAvant && cApres;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex-1 flex items-center justify-center min-h-0">
        <div
          ref={compassRef}
          className="relative aspect-square"
          style={{
            height: size === 'full' ? 'min(70vh, 70vw)' : 'min(480px, 70vw)',
            width: size === 'full' ? 'min(70vh, 70vw)' : 'min(480px, 70vw)',
          }}
        >
          <div
            className="absolute inset-0 rounded-xl border border-dashed"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '10% 10%',
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          />
          <div className="absolute left-0 right-0 top-1/2 h-px bg-white/20" />
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/20" />

          <div className="absolute left-1/2 -translate-x-1/2 -top-7 text-xs font-semibold uppercase tracking-widest text-emerald-400 whitespace-nowrap">↑ Confiance</div>
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-7 text-xs font-semibold uppercase tracking-widest text-red-400 whitespace-nowrap">↓ Doute</div>
          <div className="absolute top-1/2 -translate-y-1/2 -left-20 text-xs font-semibold uppercase tracking-widest text-amber-400 whitespace-nowrap">Calme ←</div>
          <div className="absolute top-1/2 -translate-y-1/2 -right-[72px] text-xs font-semibold uppercase tracking-widest text-blue-400 whitespace-nowrap">→ Énergie</div>

          <div className="absolute top-2 left-2 text-[10px] uppercase tracking-widest text-white/25">confiance posée</div>
          <div className="absolute top-2 right-2 text-[10px] uppercase tracking-widest text-white/25">confiance active</div>
          <div className="absolute bottom-2 left-2 text-[10px] uppercase tracking-widest text-white/25">abattement</div>
          <div className="absolute bottom-2 right-2 text-[10px] uppercase tracking-widest text-white/25">tension</div>

          {showArrow && cAvant && cApres && (
            <>
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <marker id="boussole-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M0,0 L10,5 L0,10 z" fill="#6366f1" />
                  </marker>
                </defs>
                <line
                  x1={cAvant.x} y1={cAvant.y} x2={cApres.x} y2={cApres.y}
                  stroke="#6366f1" strokeWidth="0.7" strokeDasharray="2,2"
                  markerEnd="url(#boussole-arr)" opacity="0.8"
                />
              </svg>
              <div
                className="absolute rounded-full border-2 pointer-events-none"
                style={{
                  left: `${cAvant.x}%`, top: `${cAvant.y}%`,
                  width: 14, height: 14,
                  borderColor: '#94a3b8',
                  transform: 'translate(-50%, -50%)',
                  opacity: 0.5,
                }}
              />
              <div
                className="absolute rounded-full border-2 pointer-events-none"
                style={{
                  left: `${cApres.x}%`, top: `${cApres.y}%`,
                  width: 18, height: 18,
                  background: 'rgba(99,102,241,0.15)',
                  borderColor: '#6366f1',
                  transform: 'translate(-50%, -50%)',
                }}
              />
            </>
          )}

          {visible.map(d => {
            const isBeforePhase = d.phase === 'avant';
            const isDragging = dragging?.from === 'compass' && dragging.id === d.id;
            return (
              <div
                key={d.id}
                onPointerDown={(e) => startDragFromCompass(e, d)}
                className="absolute select-none"
                style={{
                  left: `${d.x}%`,
                  top: `${d.y}%`,
                  transform: 'translate(-50%, -50%)',
                  fontSize: isBeforePhase ? 26 : 30,
                  opacity: isDragging ? 0.3 : (isBeforePhase && mode === 'evolution' ? 0.35 : 1),
                  filter: (isBeforePhase && mode === 'evolution') ? 'grayscale(0.6) drop-shadow(0 2px 4px rgba(0,0,0,0.4))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
                  cursor: interactive && d.phase === mode ? 'grab' : 'default',
                  touchAction: 'none',
                }}
              >
                {d.emoji}
              </div>
            );
          })}
        </div>
      </div>

      {showPalette && interactive && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 mr-1 whitespace-nowrap">Choisir un émoji</span>
          {[negEmojis, neuEmojis, posEmojis].map((grp, gi) => (
            <div key={gi} className="flex items-center gap-2 flex-wrap">
              {gi > 0 && <div className="w-px self-stretch bg-white/10 mx-0.5" />}
              {grp.map(e => (
                <div
                  key={e.emoji}
                  onPointerDown={(ev) => startDragFromPalette(ev, e.emoji, e.label)}
                  className={`w-16 min-h-[68px] flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 rounded-xl cursor-grab border-2 transition-all select-none ${
                    selectedPaletteEmoji === e.emoji
                      ? 'bg-indigo-500/20 border-indigo-500 scale-110'
                      : 'bg-white/[0.04] border-transparent hover:bg-white/[0.08]'
                  }`}
                  style={{ touchAction: 'none' }}
                >
                  <span className="text-[28px] leading-none">{e.emoji}</span>
                  <span className="text-[10px] text-slate-400 lowercase">{e.label}</span>
                </div>
              ))}
            </div>
          ))}
          <span className="ml-auto text-xs italic text-slate-400 hidden md:inline">Glissez un émoji sur la boussole</span>
        </div>
      )}

      {mode === 'evolution' && (
        <div className="flex gap-5 justify-center text-xs text-slate-400 pt-1">
          <span className="flex items-center gap-1.5">
            <span style={{ fontSize: 16, opacity: 0.45, filter: 'grayscale(0.6)' }}>🤔</span> avant
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ fontSize: 16 }}>💪</span> après
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-indigo-400">⇢</span> déplacement du nuage
          </span>
        </div>
      )}

      {dragging && (
        <div
          ref={ghostRef}
          className="fixed pointer-events-none z-[1000]"
          style={{
            left: -1000,
            top: -1000,
            transform: 'translate(-50%, -50%)',
            fontSize: 40,
            filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.6))',
          }}
        >
          {dragging.emoji}
        </div>
      )}
    </div>
  );
}

export { EMOJI_LABELS };
