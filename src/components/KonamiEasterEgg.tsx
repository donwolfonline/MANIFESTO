import { useEffect, useRef } from 'react';
import {
  useDocumentVisible,
  usePrefersReducedMotion,
} from '../lib/useViewportActivity';

export interface KonamiEasterEggProps {
  /** Monotonic counter incremented each time the Konami code is completed */
  burstId: number;
  /** Whether the unlocked phosphor notification banner is visible */
  unlocked: boolean;
  /** Dismisses the notification toast */
  onDismiss: () => void;
  /** Restores the user's saved accent color */
  onRevertTheme: () => void;
}

const CODE_SYMBOLS = [
  '{}',
  '=>',
  '/>',
  ';',
  '&&',
  '!=',
  '[]',
  '::',
  '//',
  'λ',
  '0x',
  'git',
  'md',
];

const CONFETTI_COLORS = ['#9bf065', '#f0642d', '#f2eee8', '#7cb8e8', '#e9a83b'];

interface SymbolParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  text: string;
  color: string;
  size: number;
  alpha: number;
}

export function KonamiEasterEgg({
  burstId,
  unlocked,
  onDismiss,
  onRevertTheme,
}: KonamiEasterEggProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const docVisible = useDocumentVisible();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Code-symbol confetti burst — skips under reduced motion and pauses cleanly when tab is hidden
  useEffect(() => {
    if (burstId === 0 || prefersReducedMotion || !docVisible) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = width < 768 ? 42 : 76;
    const particles: SymbolParticle[] = Array.from({ length: count }).map(
      (_, i) => ({
        x: width * (0.15 + Math.random() * 0.7),
        y: height * (0.15 + Math.random() * 0.25),
        vx: (Math.random() - 0.5) * 9,
        vy: -3.5 - Math.random() * 7.5,
        rot: (Math.random() - 0.5) * 0.8,
        vrot: (Math.random() - 0.5) * 0.08,
        text: CODE_SYMBOLS[i % CODE_SYMBOLS.length],
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 13 + Math.floor(Math.random() * 10),
        alpha: 1,
      }),
    );

    const startTime = performance.now();
    const durationMs = 2600;
    let rafId = 0;

    const tick = (now: number) => {
      if (document.hidden) {
        rafId = 0;
        return;
      }

      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);

      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.24;
        p.vx *= 0.992;
        p.rot += p.vrot;
        p.alpha =
          progress > 0.65 ? Math.max(0, 1 - (progress - 0.65) / 0.35) : 1;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.font = `500 ${p.size}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.text, 0, 0);
        ctx.restore();
      }

      if (progress < 1) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
      ctx.clearRect(0, 0, width, height);
    };
  }, [burstId, prefersReducedMotion, docVisible]);

  return (
    <>
      {!prefersReducedMotion && burstId > 0 && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="fixed inset-0 w-screen h-dvh pointer-events-none"
          style={{ zIndex: 'var(--z-cursor)' }}
        />
      )}

      {unlocked && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 max-w-sm border px-4 py-3.5 font-mono flex flex-col gap-2.5 shadow-xl panel-enter"
          style={{
            zIndex: 'var(--z-overlay)',
            backgroundColor: '#191718',
            borderColor: 'var(--color-accent)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-micro)',
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <span
              className="uppercase tracking-[var(--tracking-micro)]"
              style={{ color: 'var(--color-accent)' }}
            >
              ↑↑↓↓←→←→BA · unlocked
            </span>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss notification"
              className="cursor-pointer"
              style={{ color: 'var(--color-text-muted)' }}
            >
              ×
            </button>
          </div>

          <p
            className="m-0 leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Hidden CRT phosphor accent unlocked
            {prefersReducedMotion
              ? ' (confetti paused for reduced motion).'
              : '.'}
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onRevertTheme();
                onDismiss();
              }}
              className="link-draw uppercase tracking-[var(--tracking-micro)] cursor-pointer"
              style={{ color: 'var(--color-text)' }}
            >
              restore default accent
            </button>
          </div>
        </div>
      )}
    </>
  );
}
