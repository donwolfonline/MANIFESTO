import { useEffect, useState } from 'react';
import {
  BUG_CATEGORY_LABELS,
  type BugExhibit,
} from '../data/bugExhibits';
import { useLenis } from '../lib/lenis';
import { getPreloadHandlers } from '../lib/routePreload';
import { usePrefersReducedMotion } from '../lib/useViewportActivity';
import { InteractiveCodeDiff } from './InteractiveCodeDiff';

export interface CardRectInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ExhibitModalProps {
  exhibit: BugExhibit | null;
  /** Viewport inset coordinates of the clicked placard for clip-path expansion */
  originInsets: CardRectInsets;
  /** Index of the active exhibit inside the current filtered list */
  currentIndex: number;
  totalCount: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onOpenNote?: (slug: string) => void;
}

export function ExhibitModal({
  exhibit,
  originInsets,
  currentIndex,
  totalCount,
  onClose,
  onPrev,
  onNext,
  onOpenNote,
}: ExhibitModalProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { lenis } = useLenis();
  const isOpen = exhibit !== null;
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setExpanded(false);
      return;
    }
    if (prefersReducedMotion) {
      setExpanded(true);
      return;
    }
    const id = window.requestAnimationFrame(() => setExpanded(true));
    return () => window.cancelAnimationFrame(id);
  }, [isOpen, prefersReducedMotion]);

  // Lock background scroll & handle Escape + Left/Right arrow navigation
  useEffect(() => {
    if (!isOpen) return;

    lenis?.stop();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        onNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      lenis?.start();
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, lenis, onClose, onNext, onPrev]);

  const collapsedClip = `inset(${originInsets.top}px ${originInsets.right}px ${originInsets.bottom}px ${originInsets.left}px round 4px)`;
  const expandedClip = 'inset(0px 0px 0px 0px round 0px)';

  if (!exhibit) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="exhibit-modal-title"
      data-lenis-prevent
      className="fixed inset-0 flex flex-col overflow-y-auto"
      style={{
        zIndex: 'var(--z-overlay)',
        backgroundColor: 'var(--color-bg-deep)',
        color: 'var(--color-text)',
        clipPath: prefersReducedMotion
          ? undefined
          : expanded
            ? expandedClip
            : collapsedClip,
        opacity: prefersReducedMotion ? 1 : expanded ? 1 : 0.92,
        transition: prefersReducedMotion
          ? undefined
          : 'clip-path 560ms cubic-bezier(0.16, 1, 0.3, 1), opacity 220ms ease',
      }}
    >
          {/* Sticky modal header */}
          <div
            className="sticky top-0 shrink-0 border-b"
            style={{
              height: 'var(--header-height)',
              zIndex: 10,
              backgroundColor: 'rgba(25, 23, 24, 0.96)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="editorial-shell h-full flex items-center justify-between gap-4 font-mono">
              <div
                className="flex items-center gap-3 uppercase tracking-[var(--tracking-micro)]"
                style={{
                  fontSize: 'var(--text-micro)',
                  color: 'var(--color-text-muted)',
                }}
              >
                <span style={{ color: 'var(--color-accent)' }}>
                  EXHIBIT {exhibit.number}
                </span>
                <span aria-hidden="true">·</span>
                <span>{exhibit.year}</span>
                <span className="hidden sm:inline" aria-hidden="true">
                  ·
                </span>
                <span className="hidden sm:inline">
                  {BUG_CATEGORY_LABELS[exhibit.category]}
                </span>
                <span className="hidden md:inline" aria-hidden="true">
                  ·
                </span>
                <span className="hidden md:inline">
                  {exhibit.readingTimeMinutes} min read
                </span>
              </div>

              <div className="flex items-center gap-4 sm:gap-6">
                {totalCount > 1 && (
                  <div
                    className="flex items-center gap-2 font-mono"
                    style={{ fontSize: 'var(--text-micro)' }}
                  >
                    <button
                      type="button"
                      onClick={onPrev}
                      aria-label="Previous exhibit"
                      className="px-2 py-1 border transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer"
                      style={{
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-secondary)',
                        borderRadius: 'var(--radius-xs)',
                      }}
                    >
                      ←
                    </button>
                    <span
                      className="tabular-nums px-1"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {String(currentIndex + 1).padStart(2, '0')} /{' '}
                      {String(totalCount).padStart(2, '0')}
                    </span>
                    <button
                      type="button"
                      onClick={onNext}
                      aria-label="Next exhibit"
                      className="px-2 py-1 border transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer"
                      style={{
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-secondary)',
                        borderRadius: 'var(--radius-xs)',
                      }}
                    >
                      →
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  autoFocus
                  className="link-draw font-mono uppercase tracking-[var(--tracking-micro)] py-1 cursor-pointer"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: 'var(--color-text)',
                  }}
                >
                  close [esc]
                </button>
              </div>
            </div>
          </div>

          {/* Exhibit full story + interactive diff */}
          <div className="editorial-shell py-10 sm:py-16 flex-1">
            <div className="max-w-[68rem] mx-auto">
              {/* Placard title header */}
              <div className="mb-10 sm:mb-14">
                <p
                  className="m-0 mb-3 font-mono uppercase tracking-[var(--tracking-micro)]"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: 'var(--color-accent)',
                  }}
                >
                  Bug Museum · Artifact {exhibit.number} ({exhibit.year})
                </p>

                <h2
                  id="exhibit-modal-title"
                  className="m-0 font-display font-normal max-w-[20ch]"
                  style={{
                    fontSize: 'clamp(2.25rem, 5.8vw, 4.75rem)',
                    lineHeight: 0.98,
                    letterSpacing: 'var(--tracking-section)',
                    color: 'var(--color-text)',
                  }}
                >
                  {exhibit.title}
                </h2>
              </div>

              {/* Museum placard ledger strip (Cause / Cost / Lesson) */}
              <dl
                className="m-0 mb-12 sm:mb-14 grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-y"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div>
                  <dt
                    className="mb-2 font-mono uppercase tracking-[var(--tracking-micro)]"
                    style={{
                      fontSize: 'var(--text-micro)',
                      color: 'var(--color-accent)',
                    }}
                  >
                    Cause
                  </dt>
                  <dd
                    className="m-0 font-body"
                    style={{
                      fontSize: 'var(--text-meta)',
                      lineHeight: 1.6,
                      color: 'var(--color-text)',
                    }}
                  >
                    {exhibit.cause}
                  </dd>
                </div>

                <div>
                  <dt
                    className="mb-2 font-mono uppercase tracking-[var(--tracking-micro)]"
                    style={{
                      fontSize: 'var(--text-micro)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    Cost
                  </dt>
                  <dd
                    className="m-0 font-body"
                    style={{
                      fontSize: 'var(--text-meta)',
                      lineHeight: 1.6,
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {exhibit.cost}
                  </dd>
                </div>

                <div>
                  <dt
                    className="mb-2 font-mono uppercase tracking-[var(--tracking-micro)]"
                    style={{
                      fontSize: 'var(--text-micro)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    Lesson
                  </dt>
                  <dd
                    className="m-0 font-body italic"
                    style={{
                      fontSize: 'var(--text-meta)',
                      lineHeight: 1.6,
                      color: 'var(--color-text)',
                    }}
                  >
                    {exhibit.lesson}
                  </dd>
                </div>
              </dl>

              {/* Story prose + interactive "fix it" diff */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
                <div className="lg:col-span-6 space-y-6">
                  <p
                    className="m-0 font-mono uppercase tracking-[var(--tracking-micro)]"
                    style={{
                      fontSize: 'var(--text-micro)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    Field Report
                  </p>
                  {exhibit.story.map((paragraph, idx) => (
                    <p
                      key={idx}
                      className="m-0 font-body"
                      style={{
                        maxWidth: 'var(--measure)',
                        fontSize: 'var(--text-body)',
                        lineHeight: 'var(--leading-body)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {paragraph}
                    </p>
                  ))}

                  {onOpenNote && (
                    <div className="pt-2">
                      <a
                        href={`/notes/bug-stories/${exhibit.slug}`}
                        {...getPreloadHandlers('notes')}
                        onClick={(e) => {
                          e.preventDefault();
                          onClose();
                          onOpenNote(exhibit.slug);
                        }}
                        className="link-draw font-mono uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
                        style={{
                          fontSize: 'var(--text-micro)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        {exhibit.toc.length >= 2
                          ? 'open full note + toc →'
                          : 'open full note →'}
                      </a>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-6 space-y-4">
                  <p
                    className="m-0 font-mono uppercase tracking-[var(--tracking-micro)]"
                    style={{
                      fontSize: 'var(--text-micro)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    Specimen — Interactive Diff
                  </p>
                  <InteractiveCodeDiff
                    snippet={exhibit.snippet}
                    exhibitId={exhibit.id}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
  );
}
