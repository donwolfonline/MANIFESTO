import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type {
  ManifestoBodyBlock,
  ManifestoItem,
} from '../data/manifestoItems';
import { useLenis } from '../lib/lenis';
import { EASE_OUT_EXPO } from '../lib/motion';

interface ReadingSectionProps {
  items: ManifestoItem[];
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
 * Thin 1px rule separating items that draws smoothly from left to right
 * when it enters the viewport via IntersectionObserver.
 */
function DrawingRule() {
  const ruleRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const [drawn, setDrawn] = useState<boolean>(() =>
    Boolean(prefersReducedMotion),
  );

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
      <motion.div
        className="h-px w-full origin-left"
        style={{ backgroundColor: 'var(--color-border-strong)' }}
        initial={prefersReducedMotion ? false : { scaleX: 0 }}
        animate={{ scaleX: drawn ? 1 : 0 }}
        transition={{
          duration: prefersReducedMotion ? 0 : 0.85,
          ease: EASE_OUT_EXPO,
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

/**
 * Renders "### ### 1. title" style mono heading with dimmed hash marks;
 * types in on scroll entry and skips typing under prefers-reduced-motion.
 */
function TypedItemHeading({ number, title, start }: TypedHeadingProps) {
  const prefersReducedMotion = useReducedMotion();
  const fullTitle = `${number}. ${title}`;
  const [visibleCount, setVisibleCount] = useState<number>(() =>
    prefersReducedMotion ? fullTitle.length : 0,
  );
  const [done, setDone] = useState<boolean>(() =>
    Boolean(prefersReducedMotion),
  );
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
      {/* Screen-reader clean full heading */}
      <span className="sr-only">
        {number}. {title}
      </span>

      <span className="grid" aria-hidden="true">
        {/* Invisible sizing layer prevents layout shift while typing */}
        <span className="col-start-1 row-start-1 invisible select-none pointer-events-none">
          <span className="mr-2.5">###</span>
          <span>{fullTitle}</span>
        </span>

        {/* Visible dimmed hash marks + typing title */}
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
  const transition = {
    duration: prefersReducedMotion ? 0 : 0.65,
    delay: prefersReducedMotion ? 0 : 0.14 + index * 0.08, // 80ms stagger
    ease: EASE_OUT_EXPO,
  };

  const initial = prefersReducedMotion ? false : { opacity: 0, y: 18 };
  const animate =
    prefersReducedMotion || revealed
      ? { opacity: 1, y: 0 }
      : { opacity: 0, y: 18 };

  if (block.type === 'paragraph') {
    return (
      <motion.p
        initial={initial}
        animate={animate}
        transition={transition}
        className="m-0 font-body"
        style={{
          maxWidth: 'var(--measure)',
          fontSize: 'var(--text-body)',
          lineHeight: 'var(--leading-body)',
          color: 'var(--color-text-secondary)',
        }}
      >
        {renderInlineText(block.text)}
      </motion.p>
    );
  }

  if (block.type === 'bullets') {
    return (
      <motion.ul
        initial={initial}
        animate={animate}
        transition={transition}
        className="m-0 p-0 list-none space-y-3"
        style={{ maxWidth: 'var(--measure)' }}
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
      </motion.ul>
    );
  }

  // Short line-broken list (no bullets)
  return (
    <motion.div
      initial={initial}
      animate={animate}
      transition={transition}
      className="space-y-1.5 pl-4 border-l font-body"
      style={{
        maxWidth: 'var(--measure)',
        borderColor: 'var(--color-border)',
        fontSize: 'var(--text-body)',
        lineHeight: 1.65,
        color: 'var(--color-text-secondary)',
      }}
    >
      {block.lines.map((line, lineIdx) => (
        <p key={lineIdx} className="m-0">
          {renderInlineText(line)}
        </p>
      ))}
    </motion.div>
  );
}

interface ReadingItemCardProps {
  item: ManifestoItem;
  registerRef: (number: number, node: HTMLElement | null) => void;
}

function ReadingItemCard({ item, registerRef }: ReadingItemCardProps) {
  const articleRef = useRef<HTMLElement | null>(null);
  const prefersReducedMotion = Boolean(useReducedMotion());
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
      className="scroll-mt-28 sm:scroll-mt-32"
    >
      {/* Mobile-only outlined number placed directly above the title */}
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
    </article>
  );
}

export function ReadingSection({ items }: ReadingSectionProps) {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const { scrollTo } = useLenis();
  const [activeNumber, setActiveNumber] = useState<number>(
    items[0]?.number ?? 1,
  );
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());

  const registerRef = useCallback((number: number, node: HTMLElement | null) => {
    if (node) {
      itemRefs.current.set(number, node);
    } else {
      itemRefs.current.delete(number);
    }
  }, []);

  // Track active item via IntersectionObserver + viewport position tiebreaker
  useEffect(() => {
    const nodes = Array.from(itemRefs.current.values());
    if (nodes.length === 0) return;

    const visibleSet = new Set<number>();

    const updateActive = () => {
      const anchorY = window.innerHeight * 0.34;

      if (visibleSet.size > 0) {
        let bestNumber: number | null = null;
        let smallestDistance = Number.POSITIVE_INFINITY;

        visibleSet.forEach((num) => {
          const el = itemRefs.current.get(num);
          if (!el) return;
          const dist = Math.abs(el.getBoundingClientRect().top - anchorY);
          if (dist < smallestDistance) {
            smallestDistance = dist;
            bestNumber = num;
          }
        });

        if (bestNumber !== null) {
          setActiveNumber(bestNumber);
        }
        return;
      }

      // Fallback when scrolling fast between items: pick last item above anchor
      let fallback = items[0]?.number ?? 1;
      for (const item of items) {
        const el = itemRefs.current.get(item.number);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= anchorY + 40) {
          fallback = item.number;
        }
      }
      setActiveNumber(fallback);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const num = Number(
            (entry.target as HTMLElement).dataset.itemNumber,
          );
          if (Number.isNaN(num)) return;
          if (entry.isIntersecting) {
            visibleSet.add(num);
          } else {
            visibleSet.delete(num);
          }
        });
        updateActive();
      },
      {
        rootMargin: '-18% 0px -48% 0px',
        threshold: [0, 0.2, 0.5],
      },
    );

    nodes.forEach((node) => observer.observe(node));
    window.addEventListener('scroll', updateActive, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', updateActive);
    };
  }, [items]);

  const handleJumpToItem = (number: number) => {
    scrollTo(`#item-${number}`, { offset: -116 });
  };

  return (
    <section
      id="read"
      aria-label="Manifesto reading section"
      className="relative scroll-mt-20 pt-20 sm:pt-32 pb-16 sm:pb-24"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <div className="editorial-shell">
        {/* Mobile / tablet compact 1–10 dot navigation bar */}
        <nav
          aria-label="Manifesto sections (mobile)"
          className="lg:hidden sticky top-[var(--header-height)] -mx-[var(--gutter)] px-[var(--gutter)] py-3 mb-12 flex items-center justify-between gap-2 sm:gap-4 border-y backdrop-blur-md"
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

        {/* Desktop two-column layout + sticky right-edge 1–10 dot mini ToC */}
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-10">
          {/* Left Sticky Column: Huge Outlined Active Item Number */}
          <div className="hidden lg:block lg:col-span-4">
            <div
              className="sticky top-32 pt-2 select-none"
              style={{ zIndex: 'var(--z-sticky)' }}
              aria-hidden="true"
            >
              <div className="grid items-start">
                <AnimatePresence mode="sync" initial={false}>
                  <motion.span
                    key={activeNumber}
                    className="col-start-1 row-start-1 font-display font-normal tabular-nums leading-[0.82] outlined-number"
                    style={{
                      fontSize: 'clamp(7.5rem, 15.5vw, 15rem)',
                      letterSpacing: '-0.04em',
                    }}
                    initial={
                      prefersReducedMotion
                        ? false
                        : { opacity: 0, y: 12 }
                    }
                    animate={{ opacity: 1, y: 0 }}
                    exit={
                      prefersReducedMotion
                        ? { opacity: 0 }
                        : { opacity: 0, y: -12 }
                    }
                    transition={{
                      duration: prefersReducedMotion ? 0 : 0.38,
                      ease: EASE_OUT_EXPO,
                    }}
                  >
                    {formatNumber(activeNumber)}
                  </motion.span>
                </AnimatePresence>
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

          {/* Right Column: 10 Manifesto Items */}
          <div className="lg:col-span-7">
            {items.map((item, idx) => (
              <Fragment key={item.number}>
                <ReadingItemCard item={item} registerRef={registerRef} />
                {idx < items.length - 1 && <DrawingRule />}
              </Fragment>
            ))}
          </div>

          {/* Right Edge: Sticky Mini Table-of-Contents (1–10 Dots) */}
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
                        {/* Subtle mono tooltip on hover / focus */}
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
        </div>
      </div>
    </section>
  );
}
