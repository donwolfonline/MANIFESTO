import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BOOK_CATEGORIES,
  BOOK_CATEGORY_LABELS,
  SHELF_DATA,
  TOOL_KIND_LABELS,
  type ShelfBook,
  type ShelfBookCategory,
  type ShelfTool,
} from '../data/shelfData';
import { useLenis } from '../lib/lenis';
import type { ManifestoMeta } from '../lib/markdown';
import { getPreloadHandlers } from '../lib/routePreload';
import { usePrefersReducedMotion } from '../lib/useViewportActivity';
import { FilmGrain } from './FilmGrain';
import { HoverLink } from './HoverLink';

export interface ShelfPageProps {
  meta: ManifestoMeta;
  books?: ShelfBook[];
  tools?: ShelfTool[];
  onNavigateHome: (section?: string) => void;
  onOpenTerminal: () => void;
  onOpenWall: () => void;
}

type CategoryFilter = 'all' | ShelfBookCategory;

export function ShelfPage({
  meta,
  books = SHELF_DATA.books,
  tools = SHELF_DATA.tools,
  onNavigateHome,
  onOpenTerminal,
  onOpenWall,
}: ShelfPageProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { lenis } = useLenis();

  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [hoveredBookId, setHoveredBookId] = useState<string | null>(null);
  const [pullingBookId, setPullingBookId] = useState<string | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);

  const lastRandomIdRef = useRef<string | null>(null);
  const pullTimerRef = useRef<number | null>(null);
  const bookButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const hasPlaceholders = useMemo(
    () =>
      books.some((b) => b.isPlaceholder) || tools.some((t) => t.isPlaceholder),
    [books, tools],
  );

  const visibleBooks = useMemo(() => {
    if (activeCategory === 'all') return books;
    return books.filter((b) => b.category === activeCategory);
  }, [books, activeCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: books.length };
    BOOK_CATEGORIES.forEach((cat) => {
      counts[cat] = books.filter((b) => b.category === cat).length;
    });
    return counts;
  }, [books]);

  // Split visible books into tidy visual shelves (up to 5 books per wooden shelf)
  const shelves = useMemo(() => {
    const perShelf = 5;
    const rows: ShelfBook[][] = [];
    for (let i = 0; i < visibleBooks.length; i += perShelf) {
      rows.push(visibleBooks.slice(i, i + perShelf));
    }
    return rows;
  }, [visibleBooks]);

  const previewBook = useMemo(() => {
    const id = pullingBookId ?? hoveredBookId;
    if (!id) return null;
    return visibleBooks.find((b) => b.id === id) ?? null;
  }, [pullingBookId, hoveredBookId, visibleBooks]);

  const selectedIndex = useMemo(() => {
    if (!selectedBookId) return -1;
    return visibleBooks.findIndex((b) => b.id === selectedBookId);
  }, [visibleBooks, selectedBookId]);

  const selectedBook =
    selectedIndex >= 0 ? visibleBooks[selectedIndex] : null;

  useEffect(() => {
    return () => {
      if (pullTimerRef.current !== null) {
        window.clearTimeout(pullTimerRef.current);
      }
    };
  }, []);

  const longPressTimerRef = useRef<number | null>(null);
  const longPressedBookRef = useRef<boolean>(false);

  const handleBookPointerDown = (bookId: string) => {
    longPressedBookRef.current = false;
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = window.setTimeout(() => {
      longPressedBookRef.current = true;
      setHoveredBookId(bookId);
    }, 380);
  };

  const handleBookPointerCancel = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleCloseDetail = useCallback(() => {
    const returnId = selectedBookId;
    setSelectedBookId(null);
    if (returnId) {
      window.requestAnimationFrame(() => {
        bookButtonRefs.current.get(returnId)?.focus();
      });
    }
  }, [selectedBookId]);

  const handleStepDetail = useCallback(
    (delta: -1 | 1) => {
      if (visibleBooks.length <= 1 || selectedIndex === -1) return;
      const nextIdx =
        (selectedIndex + delta + visibleBooks.length) % visibleBooks.length;
      setSelectedBookId(visibleBooks[nextIdx].id);
    },
    [visibleBooks, selectedIndex],
  );

  // Keyboard shortcuts & scroll lock when detail panel is open
  useEffect(() => {
    if (!selectedBook) return;

    lenis?.stop();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleCloseDetail();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleStepDetail(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handleStepDetail(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      lenis?.start();
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedBook, lenis, handleCloseDetail, handleStepDetail]);

  const handleRandomPick = () => {
    if (visibleBooks.length === 0) return;

    if (pullTimerRef.current !== null) {
      window.clearTimeout(pullTimerRef.current);
      pullTimerRef.current = null;
    }

    let candidate =
      visibleBooks[Math.floor(Math.random() * visibleBooks.length)];
    if (visibleBooks.length > 1 && candidate.id === lastRandomIdRef.current) {
      const idx = visibleBooks.indexOf(candidate);
      candidate = visibleBooks[(idx + 1) % visibleBooks.length];
    }
    lastRandomIdRef.current = candidate.id;

    const btn = bookButtonRefs.current.get(candidate.id);
    btn?.scrollIntoView({
      block: 'nearest',
      inline: 'center',
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });

    if (prefersReducedMotion) {
      setSelectedBookId(candidate.id);
      return;
    }

    // Pull the chosen spine off the shelf first, then open its detail panel
    setPullingBookId(candidate.id);
    pullTimerRef.current = window.setTimeout(() => {
      setPullingBookId(null);
      setSelectedBookId(candidate.id);
      pullTimerRef.current = null;
    }, 460);
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

      {/* Minimal top header */}
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
              href="/wall"
              {...getPreloadHandlers('wall')}
              onClick={(e) => {
                e.preventDefault();
                onOpenWall();
              }}
              className="hidden md:inline-flex uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              /wall
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
        aria-label="Bookshelf and toolbox"
        className="flex-1 editorial-shell py-10 sm:py-16"
      >
        {/* Header & Random Pick CTA */}
        <div
          className="pb-8 border-b flex flex-col md:flex-row md:items-end justify-between gap-6"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div data-legacy-title-block="true">
            <p
              className="m-0 mb-3 font-mono uppercase tracking-[var(--tracking-micro)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-accent)',
              }}
            >
              /shelf · Bookshelf &amp; Workbench
            </p>
            <h1
              className="m-0 font-display font-normal"
              style={{
                fontSize: 'clamp(2.5rem, 6vw, 5rem)',
                lineHeight: 0.94,
                letterSpacing: 'var(--tracking-display)',
                color: 'var(--color-text)',
              }}
            >
              Books &amp; <span className="italic">Tools</span>
              <span style={{ color: 'var(--color-accent)' }}>.</span>
            </h1>
            <p
              className="mt-4 mb-0 font-body"
              style={{
                maxWidth: '54ch',
                fontSize: 'var(--text-body)',
                lineHeight: 1.6,
                color: 'var(--color-text-secondary)',
              }}
            >
              Hover a spine to see why it earned a spot on the shelf; click any book to open the notes inside.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRandomPick}
            disabled={visibleBooks.length === 0}
            className="shrink-0 self-start md:self-auto px-4 py-2.5 border font-mono uppercase tracking-[var(--tracking-micro)] transition-opacity cursor-pointer disabled:opacity-40"
            style={{
              fontSize: 'var(--text-micro)',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: 'var(--color-accent)',
              borderColor: 'var(--color-accent)',
              color: 'var(--color-accent-ink)',
            }}
          >
            random pick ↗
          </button>
        </div>

        {/* Honest placeholder banner when template slots have not yet been filled */}
        {hasPlaceholders && (
          <div
            className="mt-6 px-4 py-3 border font-mono flex flex-wrap items-center justify-between gap-2"
            style={{
              borderColor: 'var(--color-border-strong)',
              backgroundColor: 'var(--color-bg-elevated)',
              borderRadius: 'var(--radius-xs)',
              fontSize: 'var(--text-micro)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <span>
              <strong style={{ color: 'var(--color-accent)' }}>
                Template slots:
              </strong>{' '}
              no unchosen books or tools have been pre-filled. Add your own picks
              in <code style={{ color: 'var(--color-text)' }}>content/shelf-items/*.mdx</code>{' '}
              or run <code style={{ color: 'var(--color-text)' }}>npm run new</code>.
            </span>
          </div>
        )}

        {/* Category Filter Bar */}
        <div
          role="group"
          aria-label="Filter books by category"
          className="pt-7 pb-6 flex flex-wrap items-center gap-2 font-mono"
        >
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            aria-pressed={activeCategory === 'all'}
            className="px-3 py-1.5 border transition-colors cursor-pointer"
            style={{
              fontSize: 'var(--text-micro)',
              borderRadius: 'var(--radius-xs)',
              backgroundColor:
                activeCategory === 'all' ? 'var(--color-text)' : 'transparent',
              borderColor:
                activeCategory === 'all'
                  ? 'var(--color-text)'
                  : 'var(--color-border)',
              color:
                activeCategory === 'all'
                  ? 'var(--color-bg)'
                  : 'var(--color-text-secondary)',
            }}
          >
            all ({categoryCounts.all})
          </button>

          {BOOK_CATEGORIES.map((category) => {
            const selected = activeCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                aria-pressed={selected}
                className="px-3 py-1.5 border transition-colors cursor-pointer"
                style={{
                  fontSize: 'var(--text-micro)',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: selected
                    ? 'var(--color-accent)'
                    : 'transparent',
                  borderColor: selected
                    ? 'var(--color-accent)'
                    : 'var(--color-border)',
                  color: selected
                    ? 'var(--color-accent-ink)'
                    : 'var(--color-text-secondary)',
                }}
              >
                {BOOK_CATEGORY_LABELS[category]} ({categoryCounts[category]})
              </button>
            );
          })}
        </div>

        {/* Live one-line recommendation preview rail (prevents layout jump on hover) */}
        <div
          aria-live="polite"
          className="mb-10 px-4 py-3.5 border min-h-[3.5rem] flex items-center justify-between gap-4"
          style={{
            borderColor: previewBook
              ? 'var(--color-accent)'
              : 'var(--color-border)',
            backgroundColor: 'var(--color-bg-deep)',
            borderRadius: 'var(--radius-xs)',
          }}
        >
          {previewBook ? (
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span
                className="font-mono uppercase tracking-[var(--tracking-micro)]"
                style={{
                  fontSize: 'var(--text-micro)',
                  color: 'var(--color-accent)',
                }}
              >
                {previewBook.title} · {previewBook.author}
              </span>
              <span
                className="font-body italic"
                style={{
                  fontSize: 'var(--text-meta)',
                  color: 'var(--color-text)',
                }}
              >
                {previewBook.oneLineReason}
              </span>
            </div>
          ) : (
            <span
              className="font-mono"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-muted)',
              }}
            >
              hover or focus a spine to read why it is on the shelf · click to inspect
            </span>
          )}
        </div>

        {/* Visual Bookshelves with Horizontal Snap Scroll */}
        <section aria-label="Visual bookshelf" className="cq-shelf space-y-14">
          {shelves.map((shelfBooks, shelfIdx) => (
            <div key={shelfIdx} className="relative">
              {/* Row of standing vertical spines with CSS scroll snap */}
              <div
                data-testid="shelf-scroll-row"
                data-lenis-prevent
                className="flex flex-nowrap overflow-x-auto snap-x snap-mandatory items-end justify-start gap-3 sm:gap-3.5 px-3 sm:px-6 pt-10 min-h-[18.5rem] scroll-px-4"
                style={{
                  scrollbarColor: 'var(--color-border-strong) transparent',
                }}
              >
                {shelfBooks.map((book) => {
                  const isPulled = pullingBookId === book.id;
                  const isHovered = hoveredBookId === book.id;
                  const isSelected = selectedBookId === book.id;

                  return (
                    <button
                      key={book.id}
                      data-shelf-book="true"
                      ref={(node) => {
                        if (node) {
                          bookButtonRefs.current.set(book.id, node);
                        } else {
                          bookButtonRefs.current.delete(book.id);
                        }
                      }}
                      type="button"
                      onMouseEnter={() => setHoveredBookId(book.id)}
                      onMouseLeave={() =>
                        setHoveredBookId((prev) =>
                          prev === book.id ? null : prev,
                        )
                      }
                      onPointerDown={() => handleBookPointerDown(book.id)}
                      onPointerUp={handleBookPointerCancel}
                      onPointerCancel={handleBookPointerCancel}
                      onFocus={() => setHoveredBookId(book.id)}
                      onBlur={() =>
                        setHoveredBookId((prev) =>
                          prev === book.id ? null : prev,
                        )
                      }
                      onClick={() => {
                        if (longPressedBookRef.current) {
                          longPressedBookRef.current = false;
                          return;
                        }
                        setSelectedBookId(book.id);
                      }}
                      className="snap-start touch-target relative shrink-0 flex flex-col items-center justify-between py-3.5 px-1.5 border text-left select-none cursor-pointer origin-bottom"
                      style={{
                        width: `${Math.max(44, book.widthPx)}px`,
                        height: `${book.heightPx}px`,
                        backgroundColor: book.color,
                        color: book.inkColor,
                        borderColor:
                          isPulled || isHovered || isSelected
                            ? 'var(--color-accent)'
                            : 'rgba(242, 238, 232, 0.16)',
                        borderRadius: '3px 3px 1px 1px',
                        boxShadow:
                          'inset 3px 0 6px rgba(0, 0, 0, 0.28), inset -2px 0 4px rgba(255, 255, 255, 0.08), 0 10px 22px rgba(0, 0, 0, 0.35)',
                        transform: prefersReducedMotion
                          ? undefined
                          : isPulled
                            ? 'translate3d(0, -40px, 0) rotate(-4deg) scale(1.05)'
                            : isHovered || isSelected
                              ? 'translate3d(0, -16px, 0) rotate(-1.2deg) scale(1.01)'
                              : 'translate3d(0, 0, 0)',
                        transition: prefersReducedMotion
                          ? undefined
                          : 'transform 340ms cubic-bezier(0.16, 1, 0.3, 1), border-color 180ms ease',
                      }}
                    >
                      {/* Subtle top binding band */}
                      <span
                        aria-hidden="true"
                        className="w-full h-px opacity-30"
                        style={{ backgroundColor: book.inkColor }}
                      />

                      {/* Vertical spine title & author */}
                      <span
                        className="flex-1 py-2.5 flex items-center justify-between gap-2 overflow-hidden"
                        style={{
                          writingMode: 'vertical-rl',
                          textOrientation: 'mixed',
                        }}
                      >
                        <span
                          className="font-display tracking-[0.01em] truncate"
                          style={{ fontSize: '1.05rem', lineHeight: 1 }}
                        >
                          {book.title}
                        </span>
                        <span
                          className="font-mono uppercase tracking-[0.08em] truncate"
                          style={{ fontSize: '0.58rem' }}
                        >
                          {book.author}
                        </span>
                        <span className="sr-only">
                          {' '}
                          ({BOOK_CATEGORY_LABELS[book.category]}): {book.oneLineReason}
                        </span>
                      </span>

                      {/* Bottom accent dot + binding band */}
                      <span
                        aria-hidden="true"
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor:
                            isPulled || isHovered
                              ? 'var(--color-accent)'
                              : 'rgba(242, 238, 232, 0.45)',
                        }}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Physical shelf ledge */}
              <div
                aria-hidden="true"
                className="h-3.5 w-full border-t border-b"
                style={{
                  borderTopColor: 'rgba(242, 238, 232, 0.18)',
                  borderBottomColor: 'rgba(0, 0, 0, 0.65)',
                  background:
                    'linear-gradient(to bottom, #302b2a 0%, #242020 65%, #171516 100%)',
                  boxShadow: '0 14px 28px rgba(0, 0, 0, 0.36)',
                }}
              />
            </div>
          ))}
        </section>

        {/* Separate "tools I keep coming back to" section */}
        <section
          aria-label="Tools I keep coming back to"
          className="mt-24 sm:mt-32 pt-14 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="mb-10">
            <h2
              className="m-0 font-mono font-normal tracking-[0.02em]"
              style={{
                fontSize: 'clamp(1rem, 1.5vw, 1.35rem)',
                color: 'var(--color-text)',
              }}
            >
              <span
                aria-hidden="true"
                className="mr-2"
                style={{ color: 'var(--color-accent)' }}
              >
                ##
              </span>
              tools I keep coming back to
            </h2>
            <p
              className="mt-3 mb-0 font-body"
              style={{
                maxWidth: '52ch',
                fontSize: 'var(--text-body)',
                color: 'var(--color-text-secondary)',
              }}
            >
              The small, quiet pieces of software that stay open every weekday.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {tools.map((tool) => (
              <article
                key={tool.id}
                className="border p-5 sm:p-6 flex flex-col justify-between gap-5"
                style={{
                  borderColor: 'var(--color-border-strong)',
                  backgroundColor: 'var(--color-bg-elevated)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div className="space-y-3">
                  <span
                    className="inline-block font-mono uppercase tracking-[var(--tracking-micro)]"
                    style={{
                      fontSize: 'var(--text-micro)',
                      color: 'var(--color-accent)',
                    }}
                  >
                    {TOOL_KIND_LABELS[tool.kind]}
                  </span>

                  <h3
                    className="m-0 font-display font-normal"
                    style={{
                      fontSize: 'clamp(1.5rem, 2.2vw, 1.9rem)',
                      lineHeight: 1.08,
                      color: 'var(--color-text)',
                    }}
                  >
                    {tool.url ? (
                      <HoverLink
                        href={tool.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        restingRule
                        className="transition-colors hover:text-[var(--color-accent)]"
                      >
                        {tool.name}
                      </HoverLink>
                    ) : (
                      tool.name
                    )}
                  </h3>

                  <p
                    className="m-0 font-body"
                    style={{
                      fontSize: 'var(--text-meta)',
                      lineHeight: 1.6,
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {tool.why}
                  </p>
                </div>

                {tool.url && (
                  <HoverLink
                    href={tool.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="self-start font-mono uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
                    style={{
                      fontSize: 'var(--text-micro)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    visit ↗
                  </HoverLink>
                )}
              </article>
            ))}
          </div>
        </section>
      </main>

      {/* Book Detail Slide-Over Panel */}
      {selectedBook && (
        <div
          onClick={handleCloseDetail}
          className="fixed inset-0 flex justify-end backdrop-enter"
          style={{
            zIndex: 'var(--z-overlay)',
            backgroundColor: 'rgba(14, 12, 13, 0.72)',
          }}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="shelf-book-title"
            data-lenis-prevent
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg h-full overflow-y-auto border-l flex flex-col justify-between p-6 sm:p-8 panel-enter"
            style={{
              backgroundColor: 'var(--color-bg-deep)',
              borderColor: 'var(--color-border-strong)',
            }}
          >
              <div>
                {/* Top panel actions */}
                <div
                  className="pb-5 mb-7 border-b flex items-center justify-between gap-4 font-mono"
                  style={{
                    borderColor: 'var(--color-border)',
                    fontSize: 'var(--text-micro)',
                  }}
                >
                  <span
                    className="uppercase tracking-[var(--tracking-micro)]"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    {BOOK_CATEGORY_LABELS[selectedBook.category]}
                    {selectedBook.yearRead ? ` · ${selectedBook.yearRead}` : ''}
                  </span>

                  <button
                    type="button"
                    onClick={handleCloseDetail}
                    autoFocus
                    className="link-draw uppercase tracking-[var(--tracking-micro)] py-0.5 cursor-pointer"
                    style={{ color: 'var(--color-text)' }}
                  >
                    close [esc]
                  </button>
                </div>

                {/* Tactile mini book cover swatch */}
                <div
                  className="mb-7 p-6 border flex flex-col justify-between min-h-[11rem]"
                  style={{
                    backgroundColor: selectedBook.color,
                    color: selectedBook.inkColor,
                    borderColor: 'rgba(242, 238, 232, 0.16)',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: 'inset 6px 0 12px rgba(0, 0, 0, 0.25)',
                  }}
                >
                  <span
                    className="font-mono uppercase tracking-[var(--tracking-micro)] opacity-80"
                    style={{ fontSize: 'var(--text-micro)' }}
                  >
                    {selectedBook.author}
                  </span>
                  <h2
                    id="shelf-book-title"
                    className="m-0 font-display font-normal"
                    style={{
                      fontSize: 'clamp(1.85rem, 3.6vw, 2.65rem)',
                      lineHeight: 1.02,
                    }}
                  >
                    {selectedBook.title}
                  </h2>
                </div>

                {/* One-line reason */}
                <blockquote
                  className="m-0 mb-7 pl-5 border-l-2 font-body italic"
                  style={{
                    borderColor: 'var(--color-accent)',
                    fontSize: 'var(--text-lead)',
                    lineHeight: 'var(--leading-lead)',
                    color: 'var(--color-text)',
                  }}
                >
                  {selectedBook.oneLineReason}
                </blockquote>

                {/* Extended reading notes */}
                <div className="space-y-3">
                  <p
                    className="m-0 font-mono uppercase tracking-[var(--tracking-micro)]"
                    style={{
                      fontSize: 'var(--text-micro)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    Shelf Notes
                  </p>
                  <p
                    className="m-0 font-body"
                    style={{
                      fontSize: 'var(--text-body)',
                      lineHeight: 'var(--leading-body)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {selectedBook.notes}
                  </p>
                </div>
              </div>

              {/* Prev / Next book navigation */}
              {visibleBooks.length > 1 && (
                <div
                  className="mt-10 pt-5 border-t flex items-center justify-between font-mono"
                  style={{
                    borderColor: 'var(--color-border)',
                    fontSize: 'var(--text-micro)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleStepDetail(-1)}
                    className="px-3 py-1.5 border transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer"
                    style={{
                      borderColor: 'var(--color-border-strong)',
                      color: 'var(--color-text-secondary)',
                      borderRadius: 'var(--radius-xs)',
                    }}
                  >
                    ← prev book
                  </button>

                  <span
                    className="tabular-nums"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {String(selectedIndex + 1).padStart(2, '0')} /{' '}
                    {String(visibleBooks.length).padStart(2, '0')}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleStepDetail(1)}
                    className="px-3 py-1.5 border transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer"
                    style={{
                      borderColor: 'var(--color-border-strong)',
                      color: 'var(--color-text-secondary)',
                      borderRadius: 'var(--radius-xs)',
                    }}
                  >
                    next book →
                  </button>
                </div>
              )}
            </aside>
          </div>
      )}
    </div>
  );
}
