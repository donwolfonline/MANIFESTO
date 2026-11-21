import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { useLenis } from '../lib/lenis';
import type { ManifestoMeta } from '../lib/markdown';
import { usePrefersReducedMotion } from '../lib/useViewportActivity';
import { resolveSiteAuthor, SITE_CONFIG } from '../site.config';
import { HoverLink } from './HoverLink';
import { TypedLine } from './TypedLine';

interface HeroProps {
  meta: ManifestoMeta;
  /** Optional override for the giant display title */
  title?: string;
  /** Optional override for the 3 blockquote subtitle lines */
  subtitles?: [string, string, string] | string[];
  /** Retained for prop compatibility; Hero paints immediately for fast LCP */
  ready?: boolean;
}

const LETTER_STAGGER_MS = 50;
const SCROLL_CUE_HIDE_THRESHOLD_PX = 24;
const TITLE_PARALLAX_FACTOR = 0.04;

export function Hero({ meta, title, subtitles, ready = true }: HeroProps) {
  const heroRef = useRef<HTMLElement | null>(null);
  const titleParallaxRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { scrollTo } = useLenis();

  const displayTitle = title ?? (meta.title || SITE_CONFIG.title);
  const resolvedAuthor = resolveSiteAuthor(meta.author);
  const resolvedDate = meta.date || SITE_CONFIG.date;

  const lines = useMemo(
    () =>
      subtitles && subtitles.length > 0
        ? subtitles
        : meta.subtitles?.length
          ? meta.subtitles
          : SITE_CONFIG.subtitles,
    [subtitles, meta.subtitles],
  );

  // Split extension ("WORKING_COPY" + "." + "md") and mobile line-break ("WORKING_" / "COPY")
  const { line1Chars, line2StemChars, extChars, totalLetters, dotDelayMs } =
    useMemo(() => {
      const extIndex = displayTitle.lastIndexOf('.');
      const hasExt = extIndex > 0 && extIndex < displayTitle.length - 1;
      const stem = (
        hasExt ? displayTitle.slice(0, extIndex) : displayTitle
      ).toUpperCase();
      const ext = hasExt ? displayTitle.slice(extIndex + 1) : '';

      const underscoreIdx = stem.indexOf('_');
      const firstPart =
        underscoreIdx >= 0 ? stem.slice(0, underscoreIdx + 1) : stem;
      const secondPart =
        underscoreIdx >= 0 ? stem.slice(underscoreIdx + 1) : '';

      const l1 = Array.from(firstPart);
      const l2 = Array.from(secondPart);
      const extArr = Array.from(ext);
      const lettersCount = l1.length + l2.length + extArr.length;

      return {
        line1Chars: l1,
        line2StemChars: l2,
        extChars: extArr,
        totalLetters: lettersCount,
        // The orange dot pops in last after all letters have staggered in (50ms each)
        dotDelayMs: lettersCount * LETTER_STAGGER_MS,
      };
    }, [displayTitle]);

  const [activeLine, setActiveLine] = useState<number>(0);
  const [hasScrolled, setHasScrolled] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? window.scrollY > SCROLL_CUE_HIDE_THRESHOLD_PX
      : false,
  );

  // Subtle 4% title parallax (moves 4% slower than scroll) + hide scroll cue once user scrolls
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateOnScroll = () => {
      const rawScrollY = Math.max(0, window.scrollY || 0);
      const scrolledPastTop = rawScrollY > SCROLL_CUE_HIDE_THRESHOLD_PX;
      setHasScrolled((prev) =>
        prev === scrolledPastTop ? prev : scrolledPastTop,
      );

      const titleNode = titleParallaxRef.current;
      if (!titleNode) return;

      if (prefersReducedMotion) {
        titleNode.style.transform = 'translate3d(0, 0px, 0)';
        titleNode.setAttribute('data-parallax-y', '0.00');
        return;
      }

      const offsetY = rawScrollY * TITLE_PARALLAX_FACTOR;
      titleNode.style.transform = `translate3d(0, ${offsetY.toFixed(2)}px, 0)`;
      titleNode.setAttribute('data-parallax-y', offsetY.toFixed(2));
    };

    updateOnScroll();
    window.addEventListener('scroll', updateOnScroll, { passive: true });
    window.addEventListener('resize', updateOnScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', updateOnScroll);
      window.removeEventListener('resize', updateOnScroll);
    };
  }, [prefersReducedMotion]);

  const handleJumpToRead = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    scrollTo('#read', { offset: -88 });
  };

  const handleScrollDown = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    scrollTo('#statements', { offset: 0 });
  };

  const typingReady = prefersReducedMotion || ready;

  const renderMaskedChar = (
    char: string,
    charIndex: number,
    extraClassName = '',
  ) => {
    const delayMs = charIndex * LETTER_STAGGER_MS;
    return (
      <span
        key={`char-${charIndex}-${char}`}
        className="hero-char-mask"
        data-char-index={charIndex}
        data-stagger-delay={`${delayMs}ms`}
      >
        <span
          className={`hero-char ${
            prefersReducedMotion ? '' : 'hero-char-reveal'
          } ${extraClassName}`.trim()}
          style={
            prefersReducedMotion
              ? undefined
              : { animationDelay: `${delayMs}ms` }
          }
        >
          {char}
        </span>
      </span>
    );
  };

  return (
    <section
      id="top"
      ref={heroRef}
      aria-label="Manifesto introduction"
      className="hero-section relative min-h-svh md:min-h-dvh w-full max-w-full overflow-x-clip flex flex-col justify-between pt-[calc(var(--header-height)+1.25rem)] pb-7 sm:pb-9"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      {/* Top Meta Row: Author · Date (left) & Skip to the text -> #read (right); stacks on mobile */}
      <div className="editorial-shell">
        <div
          data-testid="hero-meta-row"
          className="flex flex-col items-start sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4 font-mono tracking-[var(--tracking-mono)]"
          style={{
            fontSize: 'var(--text-micro)',
            color: 'var(--color-text-muted)',
          }}
        >
          <p
            data-testid="hero-author-date"
            className="m-0 uppercase flex items-center gap-2.5"
          >
            <span style={{ color: 'var(--color-text)' }}>{resolvedAuthor}</span>
            <span aria-hidden="true" style={{ color: 'var(--color-accent)' }}>
              ·
            </span>
            <span>{resolvedDate}</span>
          </p>

          <HoverLink
            href="#read"
            data-testid="hero-skip-link"
            restingRule
            onClick={handleJumpToRead}
            className="hero-skip-link uppercase transition-colors hover:text-[var(--color-text)]"
            style={{
              color: 'var(--color-text-secondary)',
              transitionDuration: 'var(--duration-fast)',
            }}
          >
            Skip to the text
          </HoverLink>
        </div>
      </div>

      {/* Center: Display Title + Blinking Underscore Cursor + 3 Sequential Blockquote Lines */}
      <div className="editorial-shell my-auto py-10 sm:py-16 flex flex-col items-center text-center max-w-full overflow-x-clip">
        <div
          ref={titleParallaxRef}
          data-testid="hero-title-parallax"
          data-parallax-factor={String(TITLE_PARALLAX_FACTOR)}
          data-parallax-y="0.00"
          className="w-full max-w-full flex flex-col items-center will-change-transform"
        >
          <h1
            aria-label={displayTitle}
            className="hero-display-title font-display font-normal m-0 select-text"
            style={{
              color: 'var(--color-text)',
            }}
          >
            <span
              data-testid="hero-title-line-1"
              className="hero-title-line uppercase"
            >
              {line1Chars.map((ch, idx) => renderMaskedChar(ch, idx))}
            </span>
            {(line2StemChars.length > 0 || extChars.length > 0) && (
              <span
                data-testid="hero-title-line-2"
                className="hero-title-line"
              >
                {line2StemChars.length > 0 && (
                  <span className="uppercase">
                    {line2StemChars.map((ch, idx) =>
                      renderMaskedChar(ch, line1Chars.length + idx),
                    )}
                  </span>
                )}
                {extChars.length > 0 && (
                  <>
                    <span
                      data-testid="hero-title-dot"
                      data-pop-delay={`${dotDelayMs}ms`}
                      data-total-letters={String(totalLetters)}
                      className={`inline-block ${
                        prefersReducedMotion ? '' : 'hero-dot-pop'
                      }`.trim()}
                      style={{
                        color: 'var(--color-accent)',
                        animationDelay: prefersReducedMotion
                          ? undefined
                          : `${dotDelayMs}ms`,
                      }}
                    >
                      .
                    </span>
                    <span
                      data-testid="hero-title-ext"
                      className="italic font-light lowercase"
                      style={{
                        color: 'var(--color-text-secondary)',
                        fontWeight: 300,
                      }}
                    >
                      {extChars.map((ch, idx) =>
                        renderMaskedChar(
                          ch,
                          line1Chars.length + line2StemChars.length + idx,
                          'italic font-light',
                        ),
                      )}
                    </span>
                  </>
                )}
              </span>
            )}
          </h1>

          {/* Blinking underscore cursor below the title */}
          <div
            aria-hidden="true"
            data-testid="hero-title-cursor"
            className="mt-2 sm:mt-3 font-mono select-none leading-none"
            style={{
              fontSize: 'clamp(1.15rem, 2.2vw, 2rem)',
              color: 'var(--color-accent)',
            }}
          >
            <span className="inline-block terminal-cursor-blink">_</span>
          </div>
        </div>

        {/* Three Markdown blockquote lines typed sequentially like a terminal */}
        <div
          data-testid="hero-blockquote-group"
          className="hero-blockquote-list mt-8 sm:mt-12 w-full max-w-[56ch] text-left px-[20px] sm:px-0 space-y-2.5 sm:space-y-3"
          aria-label="Manifesto summary"
        >
          {lines.map((line, index) => {
            const isFinalLine = index === lines.length - 1;
            return (
              <TypedLine
                key={line}
                text={line}
                prefix=">"
                start={typingReady && activeLine >= index}
                delayMs={index === 0 ? 120 : 180}
                charIntervalMs={24}
                keepCursorOnComplete={isFinalLine}
                onComplete={() =>
                  setActiveLine((prev) => Math.max(prev, index + 1))
                }
              />
            );
          })}
        </div>
      </div>

      {/* Bottom Center: "scroll" label + looping downward-animated thin 1px line, hidden once scrolled */}
      <div className="editorial-shell flex justify-center">
        <a
          href="#statements"
          data-testid="hero-scroll-cue"
          data-scrolled={hasScrolled ? 'true' : 'false'}
          aria-hidden={hasScrolled ? 'true' : undefined}
          tabIndex={hasScrolled ? -1 : 0}
          onClick={handleScrollDown}
          aria-label="Scroll down to manifesto statements"
          className={`group inline-flex flex-col items-center gap-3 transition-all duration-300 ${
            hasScrolled
              ? 'opacity-0 pointer-events-none translate-y-2'
              : 'opacity-100 translate-y-0'
          }`}
        >
          <span
            className="font-mono lowercase tracking-[var(--tracking-micro)] transition-colors"
            style={{
              fontSize: 'var(--text-micro)',
              color: 'var(--color-text-muted)',
            }}
          >
            scroll
          </span>

          <span
            aria-hidden="true"
            data-testid="hero-scroll-line"
            className="relative block w-px h-12 sm:h-14 overflow-hidden"
            style={{ backgroundColor: 'var(--color-border)' }}
          >
            {prefersReducedMotion ? (
              <span
                className="block w-full h-1/2"
                style={{ backgroundColor: 'var(--color-accent)' }}
              />
            ) : (
              <span
                className="hero-scroll-drop absolute inset-x-0 top-0 h-1/2 block"
                style={{
                  background:
                    'linear-gradient(to bottom, transparent, var(--color-accent) 45%, var(--color-text))',
                }}
              />
            )}
          </span>
        </a>
      </div>
    </section>
  );
}
