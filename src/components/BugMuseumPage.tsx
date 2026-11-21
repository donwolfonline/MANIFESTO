import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  BUG_CATEGORIES,
  BUG_CATEGORY_LABELS,
  BUG_EXHIBITS,
  type BugCategory,
  type BugExhibit,
} from '../data/bugExhibits';
import type { ManifestoMeta } from '../lib/markdown';
import { getPreloadHandlers } from '../lib/routePreload';
import { usePrefersReducedMotion } from '../lib/useViewportActivity';
import {
  ExhibitModal,
  type CardRectInsets,
} from './ExhibitModal';
import { FilmGrain } from './FilmGrain';
import { HoverLink } from './HoverLink';

export interface BugMuseumPageProps {
  meta: ManifestoMeta;
  exhibits?: BugExhibit[];
  onNavigateHome: (section?: string) => void;
  onOpenTerminal: () => void;
  onOpenNote?: (slug: string) => void;
}

type FilterValue = 'all' | BugCategory;

const DEFAULT_INSETS: CardRectInsets = {
  top: 80,
  right: 80,
  bottom: 80,
  left: 80,
};

export function BugMuseumPage({
  meta,
  exhibits = BUG_EXHIBITS,
  onNavigateHome,
  onOpenTerminal,
  onOpenNote,
}: BugMuseumPageProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [activeFilter, setActiveFilter] = useState<FilterValue>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [originInsets, setOriginInsets] =
    useState<CardRectInsets>(DEFAULT_INSETS);
  const [focusedCardIdx, setFocusedCardIdx] = useState<number>(0);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);

  const filteredExhibits = useMemo(() => {
    if (activeFilter === 'all') return exhibits;
    return exhibits.filter((item) => item.category === activeFilter);
  }, [exhibits, activeFilter]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: exhibits.length };
    BUG_CATEGORIES.forEach((cat) => {
      counts[cat] = exhibits.filter((item) => item.category === cat).length;
    });
    return counts;
  }, [exhibits]);

  const selectedIndex = useMemo(() => {
    if (!selectedId) return -1;
    return filteredExhibits.findIndex((item) => item.id === selectedId);
  }, [filteredExhibits, selectedId]);

  const selectedExhibit =
    selectedIndex >= 0 ? filteredExhibits[selectedIndex] : null;

  // Reset gallery scroll to start when changing filter
  useEffect(() => {
    if (trackRef.current && typeof trackRef.current.scrollTo === 'function') {
      trackRef.current.scrollTo({
        left: 0,
        top: 0,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    }
    setFocusedCardIdx(0);
  }, [activeFilter, prefersReducedMotion]);

  const measureCardInsets = useCallback((el: HTMLElement | null): CardRectInsets => {
    if (!el) return DEFAULT_INSETS;
    const rect = el.getBoundingClientRect();
    return {
      top: Math.max(0, Math.round(rect.top)),
      right: Math.max(0, Math.round(window.innerWidth - rect.right)),
      bottom: Math.max(0, Math.round(window.innerHeight - rect.bottom)),
      left: Math.max(0, Math.round(rect.left)),
    };
  }, []);

  const handleOpenExhibit = useCallback(
    (exhibit: BugExhibit, cardEl: HTMLButtonElement | null) => {
      lastTriggerRef.current = cardEl;
      setOriginInsets(measureCardInsets(cardEl));
      setSelectedId(exhibit.id);
    },
    [measureCardInsets],
  );

  const handleCloseModal = useCallback(() => {
    const currentCard = selectedId
      ? cardRefs.current.get(selectedId) ?? lastTriggerRef.current
      : lastTriggerRef.current;
    if (currentCard) {
      setOriginInsets(measureCardInsets(currentCard));
    }
    setSelectedId(null);
    window.requestAnimationFrame(() => {
      currentCard?.focus();
    });
  }, [selectedId, measureCardInsets]);

  const handleStepModal = useCallback(
    (delta: 1 | -1) => {
      if (filteredExhibits.length <= 1 || selectedIndex === -1) return;
      const nextIdx =
        (selectedIndex + delta + filteredExhibits.length) %
        filteredExhibits.length;
      const nextExhibit = filteredExhibits[nextIdx];
      setSelectedId(nextExhibit.id);
      const nextEl = cardRefs.current.get(nextExhibit.id);
      if (nextEl) {
        nextEl.scrollIntoView({
          inline: 'center',
          block: 'nearest',
          behavior: 'auto',
        });
      }
    },
    [filteredExhibits, selectedIndex],
  );

    const scrollGalleryBy = useCallback(
    (direction: -1 | 1) => {
      const track = trackRef.current;
      if (!track || typeof track.scrollBy !== 'function') return;
      const step = Math.max(340, track.clientWidth * 0.72);
      track.scrollBy({
        left: direction * step,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    },
    [prefersReducedMotion],
  );

  // Keyboard arrow navigation across the horizontal gallery when modal is closed
  const touchSwipeStartYRef = useRef<number | null>(null);

  const stepVerticalCard = useCallback(
    (delta: -1 | 1) => {
      if (filteredExhibits.length === 0) return;
      const nextIdx = Math.min(
        filteredExhibits.length - 1,
        Math.max(0, focusedCardIdx + delta),
      );
      setFocusedCardIdx(nextIdx);
      const target = filteredExhibits[nextIdx];
      const node = target ? cardRefs.current.get(target.id) : null;
      node?.scrollIntoView?.({
        block: 'start',
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    },
    [filteredExhibits, focusedCardIdx, prefersReducedMotion],
  );

  const handleGalleryKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (selectedId || filteredExhibits.length === 0) return;

    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      const nextIdx = Math.min(
        filteredExhibits.length - 1,
        Math.max(0, focusedCardIdx + delta),
      );
      setFocusedCardIdx(nextIdx);
      const target = filteredExhibits[nextIdx];
      const node = target ? cardRefs.current.get(target.id) : null;
      node?.focus();
      node?.scrollIntoView({
        inline: 'center',
        block: 'nearest',
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    }
  };

  return (
    <div
      className="relative min-h-dvh flex flex-col"
      style={{
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)',
      }}
    >
      <FilmGrain />

      {/* Minimal top bar */}
      <header
        className="shrink-0 border-b"
        style={{
          height: 'var(--header-height)',
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-bg)',
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

          <div className="flex items-center gap-4 sm:gap-6">
            <HoverLink
              href="/today"
              {...getPreloadHandlers('today')}
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome('today');
              }}
              className="hidden md:inline-flex uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              /today
            </HoverLink>

            <HoverLink
              href="/naming"
              {...getPreloadHandlers('naming')}
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome('naming');
              }}
              className="inline-flex uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              /naming
            </HoverLink>

            <HoverLink
              href="/focus"
              {...getPreloadHandlers('focus')}
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome('focus');
              }}
              className="hidden lg:inline-flex uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              /focus
            </HoverLink>

            <HoverLink
              href="/commit-log"
              {...getPreloadHandlers('commit-log')}
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome('commit-log');
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

      <main
        aria-label="Bug Museum exhibit gallery"
        className="flex-1 py-10 sm:py-14 flex flex-col justify-between"
      >
        {/* Title & Filter Bar */}
        <div className="editorial-shell">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 pb-8 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div data-legacy-title-block="true">
              <p
                className="m-0 mb-3 font-mono uppercase tracking-[var(--tracking-micro)]"
                style={{
                  fontSize: 'var(--text-micro)',
                  color: 'var(--color-accent)',
                }}
              >
                /bug-museum · Permanent Collection ({exhibits.length} Exhibits)
              </p>
              <h1
                className="m-0 font-display font-normal"
                style={{
                  fontSize: 'clamp(2.5rem, 6.2vw, 5.25rem)',
                  lineHeight: 0.94,
                  letterSpacing: 'var(--tracking-display)',
                  color: 'var(--color-text)',
                }}
              >
                The Bug <span className="italic">Museum</span>
                <span style={{ color: 'var(--color-accent)' }}>.</span>
              </h1>
              <p
                className="mt-4 mb-0 font-body"
                style={{
                  maxWidth: '52ch',
                  fontSize: 'var(--text-body)',
                  lineHeight: 1.6,
                  color: 'var(--color-text-secondary)',
                }}
              >
                Small, anonymized postmortems mounted behind glass. Click any placard to read the field report and toggle the fix.
              </p>
            </div>

            {/* Desktop horizontal gallery scroll buttons */}
            <div className="hidden md:flex items-center gap-2.5 shrink-0 font-mono">
              <span
                className="mr-2 uppercase tracking-[var(--tracking-micro)]"
                style={{
                  fontSize: 'var(--text-micro)',
                  color: 'var(--color-text-muted)',
                }}
              >
                ←/→ keys
              </span>
              <button
                type="button"
                onClick={() => scrollGalleryBy(-1)}
                className="px-3 py-1.5 border transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer"
                style={{
                  fontSize: 'var(--text-micro)',
                  borderColor: 'var(--color-border-strong)',
                  color: 'var(--color-text)',
                  borderRadius: 'var(--radius-xs)',
                }}
              >
                <span aria-hidden="true">← </span>prev
                <span className="sr-only"> (scroll gallery left)</span>
              </button>
              <button
                type="button"
                onClick={() => scrollGalleryBy(1)}
                className="px-3 py-1.5 border transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer"
                style={{
                  fontSize: 'var(--text-micro)',
                  borderColor: 'var(--color-border-strong)',
                  color: 'var(--color-text)',
                  borderRadius: 'var(--radius-xs)',
                }}
              >
                next<span aria-hidden="true"> →</span>
                <span className="sr-only"> (scroll gallery right)</span>
              </button>
            </div>
          </div>

          {/* Category Filter Bar */}
          <div
            role="group"
            aria-label="Filter exhibits by category"
            className="pt-6 pb-8 flex flex-wrap items-center gap-2 font-mono"
          >
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              aria-pressed={activeFilter === 'all'}
              className="px-3 py-1.5 border transition-colors cursor-pointer"
              style={{
                fontSize: 'var(--text-micro)',
                borderRadius: 'var(--radius-xs)',
                backgroundColor:
                  activeFilter === 'all' ? 'var(--color-text)' : 'transparent',
                borderColor:
                  activeFilter === 'all'
                    ? 'var(--color-text)'
                    : 'var(--color-border)',
                color:
                  activeFilter === 'all'
                    ? 'var(--color-bg)'
                    : 'var(--color-text-secondary)',
              }}
            >
              all ({categoryCounts.all})
            </button>

            {BUG_CATEGORIES.map((category) => {
              const isSelected = activeFilter === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveFilter(category)}
                  aria-pressed={isSelected}
                  className="px-3 py-1.5 border transition-colors cursor-pointer"
                  style={{
                    fontSize: 'var(--text-micro)',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: isSelected
                      ? 'var(--color-accent)'
                      : 'transparent',
                    borderColor: isSelected
                      ? 'var(--color-accent)'
                      : 'var(--color-border)',
                    color: isSelected
                      ? 'var(--color-accent-ink)'
                      : 'var(--color-text-secondary)',
                  }}
                >
                  {BUG_CATEGORY_LABELS[category]} ({categoryCounts[category]})
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile vertical swipe controls */}
        <div
          data-testid="bug-museum-mobile-swipe-bar"
          className="editorial-shell flex md:hidden items-center justify-between gap-2 pb-4 font-mono"
          style={{ fontSize: 'var(--text-micro)' }}
        >
          <span style={{ color: 'var(--color-text-muted)' }}>
            swipe ↑/↓ cards · {String(focusedCardIdx + 1).padStart(2, '0')} /{' '}
            {String(filteredExhibits.length).padStart(2, '0')}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => stepVerticalCard(-1)}
              aria-label="Previous exhibit card"
              className="touch-target min-w-[44px] min-h-[44px] px-3 border cursor-pointer"
              style={{
                borderColor: 'var(--color-border-strong)',
                borderRadius: 'var(--radius-xs)',
                color: 'var(--color-text)',
              }}
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => stepVerticalCard(1)}
              aria-label="Next exhibit card"
              className="touch-target min-w-[44px] min-h-[44px] px-3 border cursor-pointer"
              style={{
                borderColor: 'var(--color-border-strong)',
                borderRadius: 'var(--radius-xs)',
                color: 'var(--color-text)',
              }}
            >
              ↓
            </button>
          </div>
        </div>

        {/* Vertical snap-swipe cards on mobile, horizontal scroll-snap gallery on md+ */}
        <div
          ref={trackRef}
          data-testid="bug-museum-track"
          onKeyDown={handleGalleryKeyDown}
          onTouchStart={(e) => {
            touchSwipeStartYRef.current = e.touches[0]?.clientY ?? null;
          }}
          onTouchEnd={(e) => {
            if (touchSwipeStartYRef.current === null) return;
            const endY =
              e.changedTouches[0]?.clientY ?? touchSwipeStartYRef.current;
            const deltaY = endY - touchSwipeStartYRef.current;
            touchSwipeStartYRef.current = null;
            if (Math.abs(deltaY) > 48) {
              stepVerticalCard(deltaY < 0 ? 1 : -1);
            }
          }}
          data-lenis-prevent
          className="cq-card editorial-shell flex flex-col gap-5 max-h-[70dvh] overflow-y-auto snap-y snap-mandatory md:max-h-none md:overflow-y-visible md:max-w-none md:flex-row md:overflow-x-auto md:snap-x md:snap-mandatory md:gap-7 md:pb-8 md:px-[var(--gutter)] scroll-px-[var(--gutter)]"
          style={{ scrollbarColor: 'var(--color-border-strong) transparent' }}
        >
          {filteredExhibits.map((exhibit, idx) => (
            <button
              key={exhibit.id}
              data-exhibit-card="true"
              ref={(node) => {
                if (node) {
                  cardRefs.current.set(exhibit.id, node);
                } else {
                  cardRefs.current.delete(exhibit.id);
                }
              }}
              type="button"
              onFocus={() => setFocusedCardIdx(idx)}
              onClick={(e) => handleOpenExhibit(exhibit, e.currentTarget)}
              className="group snap-start text-left w-full md:w-[24rem] lg:w-[26rem] md:shrink-0 border p-6 sm:p-7 flex flex-col justify-between transition-colors hover:border-[var(--color-accent)] cursor-pointer panel-enter"
              style={{
                borderColor: 'var(--color-border-strong)',
                backgroundColor: 'var(--color-bg-elevated)',
                borderRadius: 'var(--radius-sm)',
                animationDelay: prefersReducedMotion
                  ? '0ms'
                  : `${Math.min(idx * 40, 240)}ms`,
              }}
            >
              <div>
                {/* Placard top label strip */}
                <div
                  className="flex items-center justify-between gap-3 pb-4 mb-5 border-b font-mono uppercase tracking-[var(--tracking-micro)]"
                  style={{
                    fontSize: 'var(--text-micro)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  <span style={{ color: 'var(--color-accent)' }}>
                    EXHIBIT {exhibit.number}
                  </span>
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    {exhibit.year}
                  </span>
                </div>

                {/* Category pill */}
                <span
                  className="inline-block mb-3 font-mono lowercase tracking-[var(--tracking-mono)]"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  [{BUG_CATEGORY_LABELS[exhibit.category]}]
                </span>

                {/* Placard title */}
                <h2
                  className="m-0 mb-6 font-display font-normal"
                  style={{
                    fontSize: 'clamp(1.65rem, 2.3vw, 2.15rem)',
                    lineHeight: 1.08,
                    letterSpacing: 'var(--tracking-section)',
                    color: 'var(--color-text)',
                  }}
                >
                  {exhibit.title}
                </h2>

                {/* Museum placard specs: Cause / Cost / Lesson */}
                <dl className="m-0 space-y-4">
                  <div
                    className="pt-3 border-t"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <dt
                      className="mb-1 font-mono uppercase tracking-[var(--tracking-micro)]"
                      style={{
                        fontSize: 'var(--text-micro)',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      Cause
                    </dt>
                    <dd
                      className="m-0 font-body"
                      style={{
                        fontSize: 'var(--text-meta)',
                        lineHeight: 1.55,
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {exhibit.cause}
                    </dd>
                  </div>

                  <div
                    className="pt-3 border-t"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <dt
                      className="mb-1 font-mono uppercase tracking-[var(--tracking-micro)]"
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
                        lineHeight: 1.55,
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {exhibit.cost}
                    </dd>
                  </div>

                  <div
                    className="pt-3 border-t"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <dt
                      className="mb-1 font-mono uppercase tracking-[var(--tracking-micro)]"
                      style={{
                        fontSize: 'var(--text-micro)',
                        color: 'var(--color-accent)',
                      }}
                    >
                      Lesson
                    </dt>
                    <dd
                      className="m-0 font-body italic"
                      style={{
                        fontSize: 'var(--text-meta)',
                        lineHeight: 1.55,
                        color: 'var(--color-text)',
                      }}
                    >
                      {exhibit.lesson}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Card footer cue */}
              <div
                className="mt-7 pt-4 border-t flex items-center justify-between font-mono uppercase tracking-[var(--tracking-micro)]"
                style={{
                  fontSize: 'var(--text-micro)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <span className="link-draw group-hover:text-[var(--color-text)] transition-colors">
                  open exhibit
                </span>
                <span
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-1"
                  style={{ color: 'var(--color-accent)' }}
                >
                  →
                </span>
              </div>
            </button>
          ))}
        </div>
      </main>

      <ExhibitModal
        exhibit={selectedExhibit}
        originInsets={originInsets}
        currentIndex={selectedIndex}
        totalCount={filteredExhibits.length}
        onClose={handleCloseModal}
        onPrev={() => handleStepModal(-1)}
        onNext={() => handleStepModal(1)}
        onOpenNote={onOpenNote}
      />
    </div>
  );
}
