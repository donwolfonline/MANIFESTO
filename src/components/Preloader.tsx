import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useLenis } from '../lib/lenis';
import { EASE_OUT_EXPO } from '../lib/motion';

export interface PreloaderProps {
  /** Duration of the 0 -> 100 mono counter in milliseconds */
  durationMs?: number;
  /** Small mono label displayed at the top of the preloader curtain */
  label?: string;
  /** Fired right as the curtain starts lifting (or immediately under reduced motion) */
  onComplete?: () => void;
}

export function Preloader({
  durationMs = 450,
  label = 'loading ~/manifesto.md',
  onComplete,
}: PreloaderProps) {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const { lenis } = useLenis();
  const [count, setCount] = useState<number>(prefersReducedMotion ? 100 : 0);
  const [visible, setVisible] = useState<boolean>(!prefersReducedMotion);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const completedRef = useRef(false);

  // Immediately skip preloader under prefers-reduced-motion
  useEffect(() => {
    if (!prefersReducedMotion) return;
    setCount(100);
    setVisible(false);
    if (!completedRef.current) {
      completedRef.current = true;
      onCompleteRef.current?.();
    }
  }, [prefersReducedMotion]);

  // Lock Lenis scroll cleanly while the curtain is visible
  useEffect(() => {
    if (visible) {
      lenis?.stop();
    } else {
      lenis?.start();
    }
    return () => {
      lenis?.start();
    };
  }, [visible, lenis]);

  // Run 0 -> 100 eased counter, brief pause, then lift the curtain
  useEffect(() => {
    if (prefersReducedMotion || completedRef.current) return;

    const startTime = performance.now();
    let rafId = 0;
    let holdTimer: number | undefined;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const linear = Math.min(1, elapsed / durationMs);
      // Cubic ease-out for crisp, accelerating start and smooth finish at 100
      const eased = 1 - Math.pow(1 - linear, 3);
      const nextCount = Math.round(eased * 100);

      setCount(nextCount);

      if (linear < 1) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        holdTimer = window.setTimeout(() => {
          completedRef.current = true;
          setVisible(false);
          onCompleteRef.current?.();
        }, 60);
      }
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      if (holdTimer !== undefined) window.clearTimeout(holdTimer);
    };
  }, [durationMs, prefersReducedMotion]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-live="polite"
          aria-label={`Loading manifesto: ${count}%`}
          className="fixed inset-0 flex flex-col justify-between py-7 sm:py-9 border-b"
          style={{
            zIndex: 'var(--z-preloader)',
            backgroundColor: '#191718',
            borderColor: 'var(--color-border-strong)',
          }}
          initial={{ y: '0%' }}
          exit={{ y: '-100%' }}
          transition={{
            duration: 0.52,
            ease: EASE_OUT_EXPO,
          }}
        >
          {/* Top mono label */}
          <div className="editorial-shell flex items-center justify-between">
            <span
              className="font-mono uppercase tracking-[var(--tracking-micro)] flex items-center gap-2.5"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-muted)',
              }}
            >
              <span
                aria-hidden="true"
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: 'var(--color-accent)' }}
              />
              {label}
            </span>

            <span
              className="font-mono uppercase tracking-[var(--tracking-micro)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-muted)',
              }}
            >
              UTF-8
            </span>
          </div>

          {/* Center 0 -> 100 mono counter + thin progress track */}
          <div className="editorial-shell my-auto flex flex-col items-center">
            <div className="flex items-baseline gap-1 font-mono tabular-nums leading-none">
              <span
                style={{
                  fontSize: 'clamp(3.25rem, 10vw, 8rem)',
                  letterSpacing: '-0.04em',
                  color: 'var(--color-text)',
                }}
              >
                {String(count).padStart(3, '0')}
              </span>
              <span
                style={{
                  fontSize: 'clamp(1rem, 2vw, 1.75rem)',
                  color: 'var(--color-accent)',
                }}
              >
                %
              </span>
            </div>

            <div
              aria-hidden="true"
              className="mt-6 w-48 sm:w-64 h-px overflow-hidden"
              style={{ backgroundColor: 'var(--color-border)' }}
            >
              <div
                className="h-full origin-left"
                style={{
                  width: `${count}%`,
                  backgroundColor: 'var(--color-accent)',
                }}
              />
            </div>
          </div>

          {/* Bottom spacer for vertical symmetry */}
          <div className="editorial-shell flex justify-center">
            <span
              className="font-mono uppercase tracking-[var(--tracking-micro)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-muted)',
              }}
            >
              plain text / editorial edition
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
