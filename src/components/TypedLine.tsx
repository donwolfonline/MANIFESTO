import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../lib/useViewportActivity';

export interface TypedLineProps {
  /** The sentence to type out */
  text: string;
  /** Leading Markdown blockquote symbol (rendered in the accent color) */
  prefix?: string;
  /** Controls when this line is allowed to begin typing (for sequential chaining) */
  start?: boolean;
  /** Optional pause (ms) after `start` turns true before typing begins */
  delayMs?: number;
  /** Base typing cadence in ms per character */
  charIntervalMs?: number;
  /** Keep the blinking terminal cursor visible after this line finishes */
  keepCursorOnComplete?: boolean;
  /** Called once the line has finished typing */
  onComplete?: () => void;
  className?: string;
}

export function TypedLine({
  text,
  prefix = '>',
  start = true,
  delayMs = 0,
  charIntervalMs = 30,
  keepCursorOnComplete = false,
  onComplete,
  className = '',
}: TypedLineProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [visibleCount, setVisibleCount] = useState<number>(() =>
    prefersReducedMotion ? text.length : 0,
  );
  const [phase, setPhase] = useState<'idle' | 'waiting' | 'typing' | 'done'>(
    () => (prefersReducedMotion ? 'done' : 'idle'),
  );

  // Store latest callback in a ref so parent re-renders never restart typing
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const hasCompletedRef = useRef(false);

  // Reset state if source text changes
  useEffect(() => {
    hasCompletedRef.current = false;
    if (prefersReducedMotion) {
      setVisibleCount(text.length);
      setPhase('done');
    } else {
      setVisibleCount(0);
      setPhase('idle');
    }
  }, [text, prefersReducedMotion]);

  // Skip typing immediately under prefers-reduced-motion
  useEffect(() => {
    if (!prefersReducedMotion) return;

    setVisibleCount(text.length);
    setPhase('done');

    if (start && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      onCompleteRef.current?.();
    }
  }, [prefersReducedMotion, start, text.length]);

  // Sequential character-by-character terminal typing loop
  useEffect(() => {
    if (prefersReducedMotion || !start || hasCompletedRef.current) return;

    let cancelled = false;
    let timeoutId: number | undefined;

    const typeNext = (nextIndex: number) => {
      if (cancelled) return;

      if (nextIndex > text.length) {
        hasCompletedRef.current = true;
        setPhase('done');
        onCompleteRef.current?.();
        return;
      }

      setPhase('typing');
      setVisibleCount(nextIndex);

      const justTypedChar = text[nextIndex - 1];
      const punctuationPause =
        justTypedChar === '.' || justTypedChar === '—'
          ? charIntervalMs * 4.5
          : justTypedChar === ',' || justTypedChar === ';'
            ? charIntervalMs * 2.5
            : 0;

      timeoutId = window.setTimeout(
        () => typeNext(nextIndex + 1),
        charIntervalMs + punctuationPause,
      );
    };

    setPhase('waiting');
    timeoutId = window.setTimeout(() => typeNext(1), Math.max(0, delayMs));

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [start, delayMs, charIntervalMs, text, prefersReducedMotion]);

  const showPrefix = prefersReducedMotion || phase !== 'idle';
  const showCursor =
    (phase === 'done' && keepCursorOnComplete) ||
    (!prefersReducedMotion && (phase === 'waiting' || phase === 'typing'));
  const shouldBlinkCursor = phase === 'waiting' || phase === 'done';

  return (
    <div
      className={`grid font-mono ${className}`}
      style={{
        fontSize: 'var(--hero-blockquote-size, var(--text-meta))',
        lineHeight: 'var(--leading-mono)',
      }}
    >
      {/* Screen-reader full text so assistive tech never hears char-by-char jitter */}
      <span className="sr-only">{text}</span>

      {/* Invisible sizing layer prevents any cumulative layout shift during typing */}
      <p
        aria-hidden="true"
        className="col-start-1 row-start-1 m-0 flex items-baseline gap-3 invisible select-none pointer-events-none"
      >
        <span className="shrink-0">{prefix}</span>
        <span>{text}</span>
      </p>

      {/* Active visual blockquote line */}
      <p
        aria-hidden="true"
        className="col-start-1 row-start-1 m-0 flex items-baseline gap-3"
      >
        <span
          className="shrink-0 select-none transition-opacity"
          style={{
            color: 'var(--color-accent)',
            opacity: showPrefix ? 1 : 0,
            transitionDuration: 'var(--duration-fast)',
          }}
        >
          {prefix}
        </span>

        <span style={{ color: 'var(--color-text-secondary)' }}>
          {text.slice(0, visibleCount)}
          {showCursor && (
            <span
              data-testid="typed-line-cursor"
              className={`inline-block align-[-0.14em] ml-[0.15ch] w-[0.55ch] h-[1.05em] ${
                shouldBlinkCursor ? 'terminal-cursor-blink' : ''
              }`}
              style={{ backgroundColor: 'var(--color-accent)' }}
            />
          )}
        </span>
      </p>
    </div>
  );
}
