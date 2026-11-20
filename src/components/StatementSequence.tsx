import { useEffect, useRef, useState } from 'react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion';

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
    lead: 'Software got ',
    emphasis: 'louder',
    punctuation: '.',
  },
  {
    emphasis: 'Faster',
    punctuation: '.',
  },
  {
    lead: 'More ',
    emphasis: 'disposable',
    punctuation: '.',
  },
  {
    lead: 'Nobody asked for ',
    emphasis: 'that',
    punctuation: '.',
  },
  {
    lead: "I'm not building for the ",
    emphasis: 'feed',
    punctuation: '.',
  },
  {
    lead: "I'm building for ",
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

interface StatementSlideProps {
  phrase: StatementPhrase;
  index: number;
  total: number;
  progress: MotionValue<number>;
  isActive: boolean;
}

function StatementSlide({
  phrase,
  index,
  total,
  progress,
  isActive,
}: StatementSlideProps) {
  const isLast = index === total - 1;
  const step = 1 / total;
  const segStart = index * step;
  const segEnd = (index + 1) * step;

  // Enter over first 28% of the phrase's scroll slot, hold clearly in the middle,
  // and fade out cleanly over the final 22% before the next phrase arrives.
  const enterEnd = segStart + step * 0.28;
  const holdEnd = segEnd - step * 0.22;

  const opacity = useTransform(
    progress,
    isLast ? [segStart, enterEnd, 1] : [segStart, enterEnd, holdEnd, segEnd],
    isLast ? [0, 1, 1] : [0, 1, 1, 0],
  );

  const y = useTransform(
    progress,
    isLast ? [segStart, enterEnd, 1] : [segStart, enterEnd, holdEnd, segEnd],
    isLast ? [40, 0, 0] : [40, 0, 0, -28],
  );

  const blurPx = useTransform(
    progress,
    isLast ? [segStart, enterEnd, 1] : [segStart, enterEnd, holdEnd, segEnd],
    isLast ? [8, 0, 0] : [8, 0, 0, 6],
  );

  const filter = useTransform(blurPx, (value) =>
    value <= 0.05 ? 'blur(0px)' : `blur(${value.toFixed(2)}px)`,
  );

  return (
    <motion.p
      aria-hidden={!isActive}
      className="col-start-1 row-start-1 m-0 max-w-[16ch] font-display font-normal text-center will-change-[transform,opacity,filter]"
      style={{
        fontSize: 'clamp(2.1rem, 8.5vw, 8.25rem)',
        lineHeight: 0.98,
        letterSpacing: 'var(--tracking-display)',
        color: 'var(--color-text)',
        opacity,
        y,
        filter,
        pointerEvents: isActive ? 'auto' : 'none',
      }}
    >
      <PhraseText phrase={phrase} />
    </motion.p>
  );
}

export function StatementSequence({
  statements = DEFAULT_STATEMENTS,
}: StatementSequenceProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);

  // Start tracking slightly before the pinned stage locks (start 18%) so the
  // opening statement glides in cleanly with zero blank dead-space on arrival.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start 18%', 'end end'],
  });

  useEffect(() => {
    if (prefersReducedMotion) return;

    return scrollYProgress.on('change', (latest) => {
      const clamped = Math.min(0.9999, Math.max(0, latest));
      const nextIndex = Math.floor(clamped * statements.length);
      setActiveIndex((prev) => (prev === nextIndex ? prev : nextIndex));
    });
  }, [scrollYProgress, statements.length, prefersReducedMotion]);

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
      className="relative h-[300dvh]"
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
            <motion.span
              className="absolute inset-0 origin-top block"
              style={{
                backgroundColor: 'var(--color-accent)',
                scaleY: scrollYProgress,
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
            {statements.map((phrase, index) => (
              <StatementSlide
                key={index}
                phrase={phrase}
                index={index}
                total={statements.length}
                progress={scrollYProgress}
                isActive={activeIndex === index}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
