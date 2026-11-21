import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import type {
  ManifestoBodyBlock,
  ManifestoItem,
} from '../data/manifestoItems';
import { useLenis } from '../lib/lenis';
import { getPreloadHandlers } from '../lib/routePreload';
import { usePrefersReducedMotion } from '../lib/useViewportActivity';

interface ReadingSectionProps {
  items: ManifestoItem[];
  onOpenNote?: (slug: string) => void;
  /** Distraction-free reading mode: hides side chrome and centers 62ch column */
  readingMode?: boolean;
}

/**
 * Parses lightweight inline Markdown (*italic* and `code`) inside body strings.
 */
function renderInlineText(text: string) {
  const tokens = text.split(/(\*[^*]+\*|`[^`]+`)/g);
  return tokens.map((token, idx) => {
    if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      return (
        <em key={idx} className="italic" style={{ color: 'var(--color-text)' }}>
          {token.slice(1, -1)}
        </em>
      );
    }
    if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      return (
        <code
          key={idx}
          className="font-mono px-1.5 py-0.5 border"
          style={{
            fontSize: '0.84em',
            color: 'var(--color-text)',
            backgroundColor: 'var(--color-bg-elevated)',
            borderColor: 'var(--color-border)',
            borderRadius: 'var(--radius-xs)',
          }}
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={idx}>{token}</Fragment>;
  });
}

function formatNumber(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Thin 1px rule separating items that draws smoothly from left to right via CSS
 * when it enters the viewport via IntersectionObserver.
 */
function DrawingRule() {
  const ruleRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [drawn, setDrawn] = useState<boolean>(prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion) {
      setDrawn(true);
      return;
    }

    const node = ruleRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setDrawn(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25, rootMargin: '0px 0px -6% 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  return (
    <div
      ref={ruleRef}
      role="separator"
      className="my-16 sm:my-24 w-full"
      style={{ maxWidth: 'var(--measure)' }}
    >
      <div
        className="h-px w-full origin-left"
        style={{
          backgroundColor: 'var(--color-border-strong)',
          transform: drawn ? 'scaleX(1)' : 'scaleX(0)',
          transition: prefersReducedMotion
            ? undefined
            : 'transform 850ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />
    </div>
  );
}

interface TypedHeadingProps {
  number: number;
  title: string;
  start: boolean;
}

function TypedItemHeading({ number, title, start }: TypedHeadingProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const fullTitle = `${number}. ${title}`;
  const [visibleCount, setVisibleCount] = useState<number>(() =>
    prefersReducedMotion ? fullTitle.length : 0,
  );
  const [done, setDone] = useState<boolean>(prefersReducedMotion);
  const completedRef = useRef(false);

  useEffect(() => {
    if (prefersReducedMotion) {
      completedRef.current = true;
      setVisibleCount(fullTitle.length);
      setDone(true);
      return;
    }

    if (!start || completedRef.current) return;

    let cancelled = false;
    let timeoutId: number | undefined;

    const step = (next: number) => {
      if (cancelled) return;
      if (next > fullTitle.length) {
        completedRef.current = true;
        setDone(true);
        return;
      }
      setVisibleCount(next);
      timeoutId = window.setTimeout(() => step(next + 1), 22);
    };

    timeoutId = window.setTimeout(() => step(1), 60);

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [start, fullTitle, prefersReducedMotion]);

  const showCursor = !prefersReducedMotion && start && !done;

  return (
    <h3
      className="m-0 mb-7 sm:mb-8 font-mono font-normal tracking-[0.01em]"
      style={{
        maxWidth: 'var(--measure)',
        fontSize: 'clamp(1rem, 1.3vw + 0.65rem, 1.375rem)',
        lineHeight: 1.4,
      }}
    >
      <span className="sr-only">
        {number}. {title}
      </span>

      <span className="grid" aria-hidden="true">
        <span className="col-start-1 row-start-1 invisible select-none pointer-events-none">
          <span className="mr-2.5">###</span>
          <span>{fullTitle}</span>
        </span>

        <span className="col-start-1 row-start-1">
          <span
            className="mr-2.5 select-none"
            style={{ color: 'var(--color-text-muted)', opacity: 0.62 }}
          >
            ###
          </span>
          <span style={{ color: 'var(--color-text)' }}>
            {fullTitle.slice(0, visibleCount)}
          </span>
          {showCursor && (
            <span
              className="inline-block align-[-0.14em] ml-[0.15ch] w-[0.5ch] h-[1.02em] terminal-cursor-blink"
              style={{ backgroundColor: 'var(--color-accent)' }}
            />
          )}
        </span>
      </span>
    </h3>
  );
}

function BodyBlock({
  block,
  index,
  revealed,
  prefersReducedMotion,
}: {
  block: ManifestoBodyBlock;
  index: number;
  revealed: boolean;
  prefersReducedMotion: boolean;
}) {
  const show = prefersReducedMotion || revealed;
  const delayMs = 140 + index * 80;
  const animStyle = prefersReducedMotion
    ? undefined
    : {
        opacity: show ? 1 : 0,
        transform: show ? 'translate3d(0, 0, 0)' : 'translate3d(0, 18px, 0)',
        transition: `opacity 650ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms, transform 650ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms`,
      };

  if (block.type === 'paragraph') {
    return (
      <p
        className="m-0 font-body"
        style={{
          maxWidth: 'var(--measure)',
          fontSize: 'var(--text-body)',
          lineHeight: 'var(--leading-body)',
          color: 'var(--color-text-secondary)',
          ...animStyle,
        }}
      >
        {renderInlineText(block.text)}
      </p>
    );
  }

  if (block.type === 'bullets') {
    return (
      <ul
        className="m-0 p-0 list-none space-y-3"
        style={{ maxWidth: 'var(--measure)', ...animStyle }}
      >
        {block.items.map((entry, bulletIdx) => (
          <li
            key={bulletIdx}
            className="flex items-baseline gap-3.5 font-body"
            style={{
              fontSize: 'var(--text-body)',
              lineHeight: 'var(--leading-body)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <span
              aria-hidden="true"
              className="shrink-0 font-mono select-none"
              style={{ color: 'var(--color-accent)' }}
            >
              –
            </span>
            <span>{renderInlineText(entry)}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div
      className="space-y-1.5 pl-4 border-l font-body"
      style={{
        maxWidth: 'var(--measure)',
        borderColor: 'var(--color-border)',
        fontSize: 'var(--text-body)',
        lineHeight: 1.65,
        color: 'var(--color-text-secondary)',
        ...animStyle,
      }}
    >
      {block.lines.map((line, lineIdx) => (
        <p key={lineIdx} className="m-0">
          {renderInlineText(line)}
        </p>
      ))}
    </div>
  );
}

interface ReadingItemCardProps {
  item: ManifestoItem;
  registerRef: (number: number, node: HTMLElement | null) => void;
  onOpenNote?: (slug: string) => void;
}

function ReadingItemCard({
  item,
  registerRef,
  onOpenNote,
}: ReadingItemCardProps) {
  const articleRef = useRef<HTMLElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [revealed, setRevealed] = useState<boolean>(prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion) {
      setRevealed(true);
      return;
    }

    const node = articleRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.16, rootMargin: '0px 0px -10% 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  return (
    <article
      id={`item-${item.number}`}
      ref={(node) => {
        articleRef.current = node;
        registerRef(item.number, node);
      }}
      data-item-number={item.number}
      className="scroll-mt-28 sm:scroll-mt-32 [contain:layout_style]"
    >
      <div
        aria-hidden="true"
        className="lg:hidden mb-3 font-display font-normal tabular-nums leading-none select-none outlined-number"
        style={{ fontSize: 'clamp(3.25rem, 15vw, 5.25rem)' }}
      >
        {formatNumber(item.number)}
      </div>

      <TypedItemHeading
        number={item.number}
        title={item.title}
        start={revealed}
      />

      <div className="space-y-6">
        {item.body.map((block, idx) => (
          <BodyBlock
            key={idx}
            block={block}
            index={idx}
            revealed={revealed}
            prefersReducedMotion={prefersReducedMotion}
          />
        ))}
      </div>

      <div
        className="mt-7 flex flex-wrap items-center justify-between gap-3 font-mono"
        style={{
          maxWidth: 'var(--measure)',
          fontSize: 'var(--text-micro)',
          color: 'var(--color-text-muted)',
        }}
      >
        <div className="flex flex-wrap items-center gap-2.5">
          {item.draft && (
            <span
              className="px-1.5 py-0.5 border uppercase tracking-[var(--tracking-micro)]"
              style={{
                borderColor: 'var(--color-status-warn)',
                color: 'var(--color-status-warn)',
                backgroundColor: 'rgba(233, 168, 59, 0.12)',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              draft
            </span>
          )}
          <span>{item.readingTimeMinutes} min read</span>
          <span aria-hidden="true">·</span>
          <span>{item.tags.slice(0, 3).map((t) => `#${t}`).join(' ')}</span>
        </div>

        {onOpenNote && (
          <a
            href={`/notes/principles/${item.slug}`}
            {...getPreloadHandlers('notes')}
            onClick={(e) => {
              e.preventDefault();
              onOpenNote(item.slug);
            }}
            className="link-draw uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {item.toc.length >= 2 ? 'read full note + toc →' : 'open note →'}
          </a>
        )}
      </div>
    </article>
  );
}

export function ReadingSection({
  items,
  onOpenNote,
  readingMode = false,
}: ReadingSectionProps) {
  const { scrollTo } = useLenis();
  const [activeNumber, setActiveNumber] = useState<number>(
    items[0]?.number ?? 1,
  );
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());

  const registerRef = useCallback(
    (number: number, node: HTMLElement | null) => {
      if (node) {
        itemRefs.current.set(number, node);
      } else {
        itemRefs.current.delete(number);
      }
    },
    [],
  );

  // Pure asynchronous IntersectionObserver active-item tracking (zero per-frame scroll work)
  useEffect(() => {
    const nodes = Array.from(itemRefs.current.values());
    if (nodes.length === 0) return;

    const visibleRatios = new Map<number, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const num = Number(
            (entry.target as HTMLElement).dataset.itemNumber,
          );
          if (Number.isNaN(num)) return;
          if (entry.isIntersecting) {
            visibleRatios.set(num, entry.intersectionRatio);
          } else {
            visibleRatios.delete(num);
          }
        });

        if (visibleRatios.size === 0) return;

        let bestNumber: number | null = null;
        let bestRatio = -1;
        visibleRatios.forEach((ratio, num) => {
          if (
            ratio > bestRatio ||
            (ratio === bestRatio && (bestNumber === null || num < bestNumber))
          ) {
            bestRatio = ratio;
            bestNumber = num;
          }
        });

        if (bestNumber !== null) {
          const nextActive = bestNumber;
          setActiveNumber((prev) => (prev === nextActive ? prev : nextActive));
        }
      },
      {
        rootMargin: '-22% 0px -52% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [items]);

  const handleJumpToItem = (number: number) => {
    scrollTo(`#item-${number}`, { offset: -116 });
  };

  return (
    <section
      id="read"
      tabIndex={-1}
      aria-label="Manifesto reading section"
      className="relative scroll-mt-20 pt-20 sm:pt-32 pb-16 sm:pb-24 focus:outline-none"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <div className="editorial-shell">
        {!readingMode && (
          <nav
            aria-label="Manifesto sections (mobile)"
            className="lg:hidden sticky top-[var(--header-height)] -mx-[var(--gutter)] px-[var(--gutter)] py-3 mb-12 flex items-center justify-between gap-2 sm:gap-4 border-y"
            style={{
              zIndex: 'var(--z-sticky)',
              backgroundColor: 'var(--color-bg-glass)',
              borderColor: 'var(--color-border)',
            }}
          >
            <span
              className="shrink-0 font-mono tabular-nums uppercase tracking-[var(--tracking-micro)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-muted)',
              }}
            >
              {formatNumber(activeNumber)} / {formatNumber(items.length)}
            </span>

            <ol className="flex items-center gap-1 sm:gap-2 list-none p-0 m-0">
              {items.map((item) => {
                const isActive = item.number === activeNumber;
                return (
                  <li key={item.number}>
                    <button
                      type="button"
                      onClick={() => handleJumpToItem(item.number)}
                      aria-label={`Jump to ${item.number}. ${item.title}`}
                      aria-current={isActive ? 'location' : undefined}
                      className="p-1 sm:p-1.5 flex items-center justify-center cursor-pointer"
                    >
                      <span
                        className="block rounded-full transition-all"
                        style={{
                          width: isActive ? '8px' : '5px',
                          height: isActive ? '8px' : '5px',
                          backgroundColor: isActive
                            ? 'var(--color-accent)'
                            : 'var(--color-border-strong)',
                          boxShadow: isActive
                            ? '0 0 0 3px var(--color-accent-soft)'
                            : 'none',
                        }}
                      />
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        <div
          className={
            readingMode
              ? 'max-w-[62ch] mx-auto'
              : 'grid grid-cols-1 lg:grid-cols-12 lg:gap-10'
          }
        >
          {/* Left Sticky Column: Huge Outlined Active Item Number */}
          {!readingMode && (
            <div className="hidden lg:block lg:col-span-4">
            <div
              className="sticky top-32 pt-2 select-none"
              style={{ zIndex: 'var(--z-sticky)' }}
              aria-hidden="true"
            >
              <div className="grid items-start">
                <span
                  key={activeNumber}
                  className="col-start-1 row-start-1 font-display font-normal tabular-nums leading-[0.82] outlined-number panel-enter"
                  style={{
                    fontSize: 'clamp(7.5rem, 15.5vw, 15rem)',
                    letterSpacing: '-0.04em',
                  }}
                >
                  {formatNumber(activeNumber)}
                </span>
              </div>

              <div
                className="mt-6 flex items-center gap-3 font-mono uppercase tracking-[var(--tracking-micro)]"
                style={{
                  fontSize: 'var(--text-micro)',
                  color: 'var(--color-text-muted)',
                }}
              >
                <span
                  className="inline-block h-px w-6"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                />
                <span className="tabular-nums">
                  {formatNumber(activeNumber)} / {formatNumber(items.length)}
                </span>
              </div>
            </div>
            </div>
          )}

          {/* Right Column: Manifesto Items */}
          <div className={readingMode ? 'w-full' : 'lg:col-span-7'}>
            {items.map((item, idx) => (
              <Fragment key={item.number}>
                <ReadingItemCard
                  item={item}
                  registerRef={registerRef}
                  onOpenNote={onOpenNote}
                />
                {idx < items.length - 1 && <DrawingRule />}
              </Fragment>
            ))}
          </div>

          {/* Right Edge: Sticky Mini Table-of-Contents */}
          {!readingMode && (
            <div className="hidden lg:flex lg:col-span-1 justify-end">
            <nav
              aria-label="Manifesto sections"
              className="sticky top-[34dvh] h-fit py-2"
              style={{ zIndex: 'var(--z-sticky)' }}
            >
              <ol className="flex flex-col items-end gap-2 list-none p-0 m-0">
                {items.map((item) => {
                  const isActive = item.number === activeNumber;
                  return (
                    <li key={item.number} className="relative">
                      <button
                        type="button"
                        onClick={() => handleJumpToItem(item.number)}
                        aria-label={`Jump to ${item.number}. ${item.title}`}
                        aria-current={isActive ? 'location' : undefined}
                        className="group relative flex items-center justify-end gap-2.5 py-1.5 pl-4 pr-1 cursor-pointer"
                      >
                        <span
                          className="pointer-events-none absolute right-6 whitespace-nowrap px-2 py-0.5 font-mono opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0 transition-[opacity,transform]"
                          style={{
                            fontSize: 'var(--text-micro)',
                            color: isActive
                              ? 'var(--color-text)'
                              : 'var(--color-text-secondary)',
                            backgroundColor: 'var(--color-bg-elevated)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-xs)',
                            transitionDuration: 'var(--duration-fast)',
                          }}
                        >
                          <span
                            className="mr-1.5"
                            style={{ color: 'var(--color-accent)' }}
                          >
                            {formatNumber(item.number)}
                          </span>
                          {item.title}
                        </span>

                        <span
                          className="block rounded-full transition-all"
                          style={{
                            width: isActive ? '8px' : '5px',
                            height: isActive ? '8px' : '5px',
                            backgroundColor: isActive
                              ? 'var(--color-accent)'
                              : 'var(--color-border-strong)',
                            boxShadow: isActive
                              ? '0 0 0 3px var(--color-accent-soft)'
                              : 'none',
                            transitionDuration: 'var(--duration-fast)',
                          }}
                        />
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>
          )}
        </div>
      </div>
    </section>
  );
}
