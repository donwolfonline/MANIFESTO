import { useRef } from 'react';
import {
  DELETE_COMPARISONS,
  type BeforeAfterExample,
} from '../data/deleteExamples';
import type { ManifestoMeta } from '../lib/markdown';
import { getPreloadHandlers } from '../lib/routePreload';
import {
  usePrefersReducedMotion,
  useScrollScrub,
} from '../lib/useViewportActivity';
import { CodeCompareSlider } from './CodeCompareSlider';
import { DeleteLineGame } from './DeleteLineGame';
import { FilmGrain } from './FilmGrain';
import { HoverLink } from './HoverLink';

export interface DeletePageProps {
  meta: ManifestoMeta;
  comparisons?: BeforeAfterExample[];
  onNavigateHome: (section?: string) => void;
  onOpenTerminal: () => void;
  onOpenCommitLog: () => void;
}

const START_LINES = 4000;
const END_LINES = 400;

export function DeletePage({
  meta,
  comparisons = DELETE_COMPARISONS,
  onNavigateHome,
  onOpenTerminal,
  onOpenCommitLog,
}: DeletePageProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const heroRef = useRef<HTMLElement | null>(null);
  const countRef = useRef<HTMLSpanElement | null>(null);
  const removedRef = useRef<HTMLSpanElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);

  // Direct DOM scrub for 4,000 -> 400 counter; pauses automatically when off-screen or tab is hidden
  useScrollScrub(
    heroRef,
    (progress) => {
      const clamped = Math.min(1, Math.max(0, progress / 0.92));
      const eased = 1 - Math.pow(1 - clamped, 2.2);
      const current = Math.round(
        START_LINES - (START_LINES - END_LINES) * eased,
      );
      const removed = START_LINES - current;
      const scaleX = 1 - 0.9 * clamped;

      if (countRef.current) {
        countRef.current.textContent = current.toLocaleString('en-US');
      }
      if (removedRef.current) {
        removedRef.current.textContent = `-${removed.toLocaleString('en-US')}`;
      }
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${scaleX.toFixed(4)})`;
      }
    },
    { disabled: prefersReducedMotion },
  );

  return (
    <div
      className="relative min-h-dvh flex flex-col"
      style={{
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)',
      }}
    >
      <FilmGrain />

      {/* Minimal sticky header */}
      <header
        className="sticky top-0 shrink-0 border-b"
        style={{
          height: 'var(--header-height)',
          zIndex: 'var(--z-header)',
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-bg-glass)',
        }}
      >
        <div className="editorial-shell h-full flex items-center justify-between gap-4 font-mono">
          <HoverLink
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigateHome();
            }}
            className="inline-flex items-center gap-2.5 uppercase tracking-[var(--tracking-mono)]"
            style={{
              fontSize: 'var(--text-meta)',
              color: 'var(--color-text)',
            }}
          >
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: 'var(--color-accent)' }}
            />
            <span>~/{meta.filename}</span>
          </HoverLink>

          <div className="flex items-center gap-5 sm:gap-7">
            <HoverLink
              href="/commit-log"
              {...getPreloadHandlers('commit-log')}
              onClick={(e) => {
                e.preventDefault();
                onOpenCommitLog();
              }}
              className="hidden md:inline-flex uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              /commit-log
            </HoverLink>

            <HoverLink
              href="/terminal"
              {...getPreloadHandlers('terminal')}
              onClick={(e) => {
                e.preventDefault();
                onOpenTerminal();
              }}
              className="hidden sm:inline-flex items-center gap-1.5 uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <span aria-hidden="true" style={{ color: 'var(--color-accent)' }}>
                &gt;_
              </span>
              <span>/terminal</span>
            </HoverLink>

            <HoverLink
              href="/#read"
              restingRule
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome('read');
              }}
              className="uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              ← back to editorial
            </HoverLink>
          </div>
        </div>
      </header>

      <main aria-label="The joy of deleting code" className="flex-1">
        {/* Scroll-driven Hero: huge counter counting down 4,000 -> 400 */}
        {prefersReducedMotion ? (
          <section
            aria-label="Line count reduction hero"
            className="editorial-shell py-20 sm:py-28 border-b text-center"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <p
              className="m-0 mb-5 font-mono uppercase tracking-[var(--tracking-micro)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-accent)',
              }}
            >
              /delete · The Joy of Subtracting Code
            </p>
            <h1
              className="m-0 font-display font-normal tabular-nums"
              style={{
                fontSize: 'clamp(3.25rem, 11vw, 9.5rem)',
                lineHeight: 0.9,
                letterSpacing: '-0.03em',
                color: 'var(--color-text)',
              }}
            >
              4,000{' '}
              <span style={{ color: 'var(--color-accent)' }}>→</span> 400
            </h1>
            <p
              className="mt-6 mb-0 mx-auto font-body"
              style={{
                maxWidth: '48ch',
                fontSize: 'var(--text-lead)',
                lineHeight: 'var(--leading-lead)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Every line you remove is one fewer branch to test, explain, and debug during a 2am alert.
            </p>
          </section>
        ) : (
          <section
            ref={heroRef}
            aria-label="Line count reduction hero"
            className="relative h-[185dvh] border-b"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="sticky top-0 h-dvh flex flex-col justify-center items-center text-center px-5">
              <p
                className="m-0 mb-4 font-mono uppercase tracking-[var(--tracking-micro)]"
                style={{
                  fontSize: 'var(--text-micro)',
                  color: 'var(--color-accent)',
                }}
              >
                /delete · scroll to cut the weight
              </p>

              <h1 className="sr-only">
                The joy of deleting code: 4,000 lines reduced to 400
              </h1>

              <div
                aria-hidden="true"
                className="font-display font-normal tabular-nums leading-[0.86] select-none"
                style={{
                  fontSize: 'clamp(4.5rem, 18vw, 15.5rem)',
                  letterSpacing: '-0.04em',
                  color: 'var(--color-text)',
                }}
              >
                <span ref={countRef}>4,000</span>
              </div>

              <div
                className="mt-6 flex items-center gap-4 font-mono uppercase tracking-[var(--tracking-micro)]"
                style={{
                  fontSize: 'var(--text-micro)',
                  color: 'var(--color-text-muted)',
                }}
              >
                <span>lines remaining</span>
                <span aria-hidden="true">·</span>
                <span
                  ref={removedRef}
                  className="tabular-nums"
                  style={{ color: '#f4726b' }}
                >
                  -0
                </span>
              </div>

              {/* Shrinking mass bar 100% -> 10% */}
              <div
                aria-hidden="true"
                className="mt-6 w-56 sm:w-80 h-[2px] overflow-hidden"
                style={{ backgroundColor: 'var(--color-border)' }}
              >
                <div
                  ref={barRef}
                  className="h-full origin-left"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    transform: 'scaleX(1)',
                  }}
                />
              </div>

              <p
                className="mt-8 mb-0 font-body"
                style={{
                  maxWidth: '46ch',
                  fontSize: 'var(--text-lead)',
                  lineHeight: 'var(--leading-lead)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                The safest, fastest, easiest-to-maintain code is the block you no longer have to ship.
              </p>
            </div>
          </section>
        )}

        {/* Three Before / After Draggable Comparison Sections */}
        <section
          aria-label="Before and after code comparisons"
          className="editorial-shell py-20 sm:py-28 space-y-24 sm:space-y-32"
        >
          {comparisons.map((example) => (
            <article
              key={example.id}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start"
            >
              {/* Lesson & editorial title column */}
              <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-5">
                <div
                  className="flex items-center gap-3 font-mono uppercase tracking-[var(--tracking-micro)]"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <span style={{ color: 'var(--color-accent)' }}>
                    {example.number}
                  </span>
                  <span
                    aria-hidden="true"
                    className="h-px w-6 inline-block"
                    style={{ backgroundColor: 'var(--color-border-strong)' }}
                  />
                  <span>before / after</span>
                </div>

                <h2
                  className="m-0 font-display font-normal"
                  style={{
                    fontSize: 'clamp(1.85rem, 3.2vw, 2.75rem)',
                    lineHeight: 1.04,
                    letterSpacing: 'var(--tracking-section)',
                    color: 'var(--color-text)',
                  }}
                >
                  {example.title}
                </h2>

                <blockquote
                  className="m-0 pl-5 border-l-2 font-body italic"
                  style={{
                    borderColor: 'var(--color-accent)',
                    fontSize: 'var(--text-lead)',
                    lineHeight: 'var(--leading-lead)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {example.lesson}
                </blockquote>
              </div>

              {/* Draggable comparison slider */}
              <div className="lg:col-span-8 min-w-0">
                <CodeCompareSlider
                  title={example.title}
                  filename={example.filename}
                  beforeCode={example.beforeCode}
                  afterCode={example.afterCode}
                />
              </div>
            </article>
          ))}
        </section>

        {/* Final Interactive "Delete the Line" Game */}
        <section
          aria-label="Interactive delete the line game"
          className="border-t py-20 sm:py-28"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="editorial-shell">
            <div className="max-w-[58rem] mx-auto">
              <div className="mb-8 sm:mb-10">
                <p
                  className="m-0 mb-3 font-mono uppercase tracking-[var(--tracking-micro)]"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: 'var(--color-accent)',
                  }}
                >
                  Interactive Practice · Delete the Line
                </p>
                <h2
                  className="m-0 font-display font-normal"
                  style={{
                    fontSize: 'clamp(2.1rem, 4.8vw, 3.85rem)',
                    lineHeight: 1.02,
                    letterSpacing: 'var(--tracking-section)',
                    color: 'var(--color-text)',
                  }}
                >
                  Your turn with the <span className="italic">red pencil</span>
                  <span style={{ color: 'var(--color-accent)' }}>.</span>
                </h2>
                <p
                  className="mt-4 mb-0 font-body"
                  style={{
                    maxWidth: '58ch',
                    fontSize: 'var(--text-body)',
                    lineHeight: 'var(--leading-body)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Click every line in this checkout helper that you believe can be deleted safely without breaking callers, then run the diff check to see why each line stayed or went.
                </p>
              </div>

              <DeleteLineGame />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
