/* eslint-disable react-refresh/only-export-components */
import { useRef, useState } from 'react';
import {
  usePrefersReducedMotion,
  useScrollScrub,
} from '../lib/useViewportActivity';

export interface StatementPhrase {
  /** Leading text before the emphasized word */
  lead?: string;
  /** Emphasized word rendered in italic (and optionally accent color) */
  emphasis: string;
  /** Optional text after the emphasized word */
  tail?: string;
  /** Closing punctuation mark (e.g. "." or ":") rendered in the accent color */
  punctuation?: string;
  /** Render the emphasized word itself in the accent color */
  accentWord?: boolean;
}

export const DEFAULT_STATEMENTS: StatementPhrase[] = [
  {
    lead: 'Deadlines got ',
    emphasis: 'tighter',
    punctuation: '.',
  },
  {
    lead: 'Stacks got ',
    emphasis: 'louder',
    punctuation: '.',
  },
  {
    lead: 'Half the room is ',
    emphasis: 'guessing',
    punctuation: '.',
  },
  {
    lead: 'Nobody admits ',
    emphasis: 'that',
    punctuation: '.',
  },
  {
    lead: "I'm not writing for the ",
    emphasis: 'keynote',
    punctuation: '.',
  },
  {
    lead: "I'm writing for ",
    emphasis: 'this',
    punctuation: ':',
    accentWord: true,
  },
];

interface StatementSequenceProps {
  /** Sequence of short statements (defaults to six manifesto phrases) */
  statements?: StatementPhrase[];
}

function PhraseText({ phrase }: { phrase: StatementPhrase }) {
  return (
    <>
      {phrase.lead && <span>{phrase.lead}</span>}
      <em
        className="italic font-normal"
        style={{
          color: phrase.accentWord
            ? 'var(--color-accent)'
            : 'var(--color-text)',
        }}
      >
        {phrase.emphasis}
      </em>
      {phrase.tail && <span>{phrase.tail}</span>}
      {phrase.punctuation && (
        <span style={{ color: 'var(--color-accent)' }}>
          {phrase.punctuation}
        </span>
      )}
    </>
  );
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

export function StatementSequence({
  statements = DEFAULT_STATEMENTS,
}: StatementSequenceProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const progressBarRef = useRef<HTMLSpanElement | null>(null);
  const slideRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);

  // Scrub all 6 phrases via GPU transforms — pauses automatically when off-screen or tab is hidden
  useScrollScrub(
    sectionRef,
    (latest) => {
      const clamped = Math.min(0.9999, Math.max(0, latest));
      const total = statements.length;
      const step = 1 / total;
      const nextIndex = Math.floor(clamped * total);

      setActiveIndex((prev) => (prev === nextIndex ? prev : nextIndex));

      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleY(${latest.toFixed(4)})`;
      }

      for (let i = 0; i < total; i++) {
        const el = slideRefs.current[i];
        if (!el) continue;

        const isLast = i === total - 1;
        const segStart = i * step;
        const segEnd = (i + 1) * step;
        const enterEnd = segStart + step * 0.28;
        const holdEnd = segEnd - step * 0.22;

        let opacity: number;
        let y: number;
        let scale: number;

        if (latest <= segStart) {
          opacity = 0;
          y = 36;
          scale = 0.965;
        } else if (latest < enterEnd) {
          const t = (latest - segStart) / (enterEnd - segStart);
          opacity = lerp(0, 1, t);
          y = lerp(36, 0, t);
          scale = lerp(0.965, 1, t);
        } else if (isLast || latest <= holdEnd) {
          opacity = 1;
          y = 0;
          scale = 1;
        } else if (latest < segEnd) {
          const t = (latest - holdEnd) / (segEnd - holdEnd);
          opacity = lerp(1, 0, t);
          y = lerp(0, -24, t);
          scale = lerp(1, 0.985, t);
        } else {
          opacity = 0;
          y = -24;
          scale = 0.985;
        }

        el.style.opacity = opacity.toFixed(3);
        el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
      }
    },
    { disabled: prefersReducedMotion, startViewportFraction: 0.18 },
  );

  // Accessible static layout when prefers-reduced-motion is active (no pinning)
  if (prefersReducedMotion) {
    return (
      <section
        id="statements"
        aria-labelledby="statements-heading"
        className="editorial-shell py-20 sm:py-28 border-y"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-bg)',
        }}
      >
        <h2 id="statements-heading" className="sr-only">
          Opening statements
        </h2>
        <ol className="list-none p-0 m-0 max-w-[46ch] mx-auto space-y-10 sm:space-y-14">
          {statements.map((phrase, idx) => (
            <li
              key={idx}
              className="pl-6 border-l"
              style={{ borderColor: 'var(--color-border-strong)' }}
            >
              <span
                className="block mb-2 font-mono tabular-nums tracking-[var(--tracking-micro)]"
                style={{
                  fontSize: 'var(--text-micro)',
                  color: 'var(--color-text-muted)',
                }}
              >
                {String(idx + 1).padStart(2, '0')} /{' '}
                {String(statements.length).padStart(2, '0')}
              </span>
              <p
                className="m-0 font-display font-normal"
                style={{
                  fontSize: 'clamp(2.25rem, 6vw, 4.75rem)',
                  lineHeight: 1.02,
                  letterSpacing: 'var(--tracking-section)',
                  color: 'var(--color-text)',
                }}
              >
                <PhraseText phrase={phrase} />
              </p>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  return (
    <section
      id="statements"
      ref={sectionRef}
      aria-labelledby="statements-heading"
      className="relative h-[240dvh]"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <h2 id="statements-heading" className="sr-only">
        Opening statements
      </h2>
      {/* Screen-reader linear transcript of all statements */}
      <ol className="sr-only">
        {statements.map((phrase, idx) => (
          <li key={idx}>
            {phrase.lead ?? ''}
            {phrase.emphasis}
            {phrase.tail ?? ''}
            {phrase.punctuation ?? ''}
          </li>
        ))}
      </ol>

      {/* Pinned 100dvh viewport stage */}
      <div className="sticky top-0 h-dvh w-full flex items-center justify-center overflow-hidden">
        {/* Left-edge vertical scroll progress indicator */}
        <div
          aria-hidden="true"
          className="absolute left-4 sm:left-8 lg:left-12 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3 select-none"
        >
          <span
            className="font-mono tabular-nums tracking-[var(--tracking-micro)]"
            style={{
              fontSize: 'var(--text-micro)',
              color: 'var(--color-text)',
            }}
          >
            {String(activeIndex + 1).padStart(2, '0')}
          </span>

          <div
            className="relative w-[1.5px] h-32 sm:h-44 overflow-hidden"
            style={{ backgroundColor: 'var(--color-border)' }}
          >
            <span
              ref={progressBarRef}
              className="absolute inset-0 origin-top block"
              style={{
                backgroundColor: 'var(--color-accent)',
                transform: 'scaleY(0)',
              }}
            />
          </div>

          <span
            className="font-mono tabular-nums tracking-[var(--tracking-micro)]"
            style={{
              fontSize: 'var(--text-micro)',
              color: 'var(--color-text-muted)',
            }}
          >
            {String(statements.length).padStart(2, '0')}
          </span>
        </div>

        {/* Stacked huge-type statements appearing in the same focal spot */}
        <div className="editorial-shell flex items-center justify-center pl-11 pr-5 sm:px-16">
          <div className="grid place-items-center w-full">
            {statements.map((phrase, index) => {
              const isActive = activeIndex === index;
              return (
                <p
                  key={index}
                  ref={(node) => {
                    slideRefs.current[index] = node;
                  }}
                  aria-hidden={!isActive}
                  className="col-start-1 row-start-1 m-0 max-w-[16ch] font-display font-normal text-center"
                  style={{
                    fontSize: 'clamp(2.1rem, 8.5vw, 8.25rem)',
                    lineHeight: 0.98,
                    letterSpacing: 'var(--tracking-display)',
                    color: 'var(--color-text)',
                    opacity: index === 0 ? 1 : 0,
                    transform:
                      index === 0
                        ? 'translate3d(0, 0, 0) scale(1)'
                        : 'translate3d(0, 36px, 0) scale(0.965)',
                    pointerEvents: isActive ? 'auto' : 'none',
                  }}
                >
                  <PhraseText phrase={phrase} />
                </p>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
