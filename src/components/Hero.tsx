import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion';
import { useLenis } from '../lib/lenis';
import type { ManifestoMeta } from '../lib/markdown';
import {
  EASE_OUT_EXPO,
  LETTER_STAGGER,
  MOTION_DURATION,
} from '../lib/motion';
import { TypedLine } from './TypedLine';
import { HoverLink } from './HoverLink';

interface HeroProps {
  meta: ManifestoMeta;
  /** Optional override for the giant "HUMAN.md"-style title */
  title?: string;
  /** Optional override for the 3 blockquote subtitle lines */
  subtitles?: [string, string, string] | string[];
  /** Defers load choreography until the page preloader curtain lifts */
  ready?: boolean;
}

interface TitleGlyph {
  char: string;
  index: number;
  isDot: boolean;
  isExtension: boolean;
}

export function Hero({
  meta,
  title,
  subtitles,
  ready = true,
}: HeroProps) {
  const heroRef = useRef<HTMLElement | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollTo } = useLenis();

  const displayTitle = title ?? meta.title;
  const lines = useMemo(
    () => (subtitles && subtitles.length > 0 ? subtitles : meta.subtitles),
    [subtitles, meta.subtitles],
  );

  // Group characters by word so multi-word titles wrap cleanly while preserving
  // a continuous 60ms letter-by-letter stagger index across the whole title.
  const { wordGroups, totalChars } = useMemo(() => {
    const extIndex = displayTitle.lastIndexOf('.');
    const hasExtension = extIndex > 0 && extIndex < displayTitle.length - 1;

    const groups: TitleGlyph[][] = [];
    let currentWord: TitleGlyph[] = [];
    let runningIndex = 0;

    for (const char of Array.from(displayTitle)) {
      const glyph: TitleGlyph = {
        char,
        index: runningIndex,
        isDot: hasExtension && runningIndex === extIndex,
        isExtension: hasExtension && runningIndex > extIndex,
      };
      runningIndex += 1;

      if (char === ' ') {
        if (currentWord.length > 0) {
          groups.push(currentWord);
          currentWord = [];
        }
        groups.push([glyph]);
      } else {
        currentWord.push(glyph);
      }
    }

    if (currentWord.length > 0) {
      groups.push(currentWord);
    }

    return { wordGroups: groups, totalChars: runningIndex };
  }, [displayTitle]);

  const [titleDone, setTitleDone] = useState<boolean>(
    () => Boolean(prefersReducedMotion),
  );
  const [activeLine, setActiveLine] = useState<number>(0);

  const handleTitleComplete = useCallback(() => {
    setTitleDone(true);
  }, []);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, 48]);
  const fadeOut = useTransform(scrollYProgress, [0, 0.85], [1, 0.25]);

  const handleJumpToRead = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    scrollTo('#read', { offset: -88 });
  };

  const handleScrollDown = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    scrollTo('#statements', { offset: 0 });
  };

  const typingReady = Boolean(prefersReducedMotion) || (ready && titleDone);

  return (
    <section
      id="top"
      ref={heroRef}
      aria-label="Manifesto introduction"
      className="relative min-h-dvh flex flex-col justify-between pt-[calc(var(--header-height)+1.25rem)] pb-7 sm:pb-9"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      {/* Top Bar: Author · Date (left) & Skip to the text -> #read (right) */}
      <div className="editorial-shell">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: -8 }}
          animate={
            prefersReducedMotion || ready
              ? { opacity: 1, y: 0 }
              : { opacity: 0, y: -8 }
          }
          transition={{
            duration: MOTION_DURATION.base,
            ease: EASE_OUT_EXPO,
          }}
          className="flex flex-wrap items-center justify-between gap-4 font-mono tracking-[var(--tracking-mono)]"
          style={{
            fontSize: 'var(--text-micro)',
            color: 'var(--color-text-muted)',
          }}
        >
          <p className="m-0 uppercase flex items-center gap-2.5">
            <span style={{ color: 'var(--color-text)' }}>{meta.author}</span>
            <span
              aria-hidden="true"
              style={{ color: 'var(--color-accent)' }}
            >
              ·
            </span>
            <span>{meta.date}</span>
          </p>

          <HoverLink
            href="#read"
            restingRule
            onClick={handleJumpToRead}
            className="uppercase transition-colors hover:text-[var(--color-text)]"
            style={{
              color: 'var(--color-text-secondary)',
              transitionDuration: 'var(--duration-fast)',
            }}
          >
            Skip to the text
          </HoverLink>
        </motion.div>
      </div>

      {/* Center: Giant HUMAN.md-style Title + 3 Terminal Blockquote Subtitles */}
      <motion.div
        className="editorial-shell my-auto py-12 sm:py-16 flex flex-col items-center text-center"
        style={
          prefersReducedMotion
            ? undefined
            : { y: parallaxY, opacity: fadeOut }
        }
      >
        <h1
          aria-label={displayTitle}
          className="font-display font-normal m-0 select-text"
          style={{
            fontSize: 'var(--text-display)',
            lineHeight: 'var(--leading-display)',
            letterSpacing: 'var(--tracking-display)',
            color: 'var(--color-text)',
          }}
        >
          {wordGroups.map((group, groupIndex) => {
            const isSpace = group.length === 1 && group[0].char === ' ';
            if (isSpace) {
              return (
                <span key={`space-${groupIndex}`} aria-hidden="true">
                  {' '}
                </span>
              );
            }

            return (
              <span
                key={`word-${groupIndex}`}
                aria-hidden="true"
                className="inline-block whitespace-nowrap"
              >
                {group.map(({ char, index, isDot, isExtension }) => {
                  const isLastChar = index === totalChars - 1;

                  return (
                    <span
                      key={`${index}-${char}`}
                      className="inline-block overflow-hidden align-bottom py-[0.08em] -my-[0.08em] px-[0.02em] -mx-[0.02em]"
                    >
                      <motion.span
                        className={`inline-block ${isExtension ? 'italic' : ''}`}
                        style={{
                          color: isDot
                            ? 'var(--color-accent)'
                            : isExtension
                              ? 'var(--color-text-secondary)'
                              : 'var(--color-text)',
                        }}
                        initial={
                          prefersReducedMotion
                            ? false
                            : { y: '112%', opacity: 0 }
                        }
                        animate={
                          prefersReducedMotion || ready
                            ? { y: '0%', opacity: 1 }
                            : { y: '112%', opacity: 0 }
                        }
                        transition={{
                          duration: MOTION_DURATION.slow,
                          delay:
                            prefersReducedMotion || !ready
                              ? 0
                              : 0.08 + index * LETTER_STAGGER,
                          ease: EASE_OUT_EXPO,
                        }}
                        onAnimationComplete={
                          isLastChar
                            ? () => {
                                if (ready) handleTitleComplete();
                              }
                            : undefined
                        }
                      >
                        {char}
                      </motion.span>
                    </span>
                  );
                })}
              </span>
            );
          })}
        </h1>

        {/* Three Markdown blockquote lines typed sequentially like a terminal */}
        <div
          className="mt-10 sm:mt-14 w-full max-w-[56ch] text-left space-y-2.5 sm:space-y-3"
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
                delayMs={index === 0 ? 140 : 220}
                charIntervalMs={28}
                keepCursorOnComplete={isFinalLine}
                onComplete={() =>
                  setActiveLine((prev) => Math.max(prev, index + 1))
                }
              />
            );
          })}
        </div>
      </motion.div>

      {/* Bottom Center: "scroll" label + looping downward-animated thin line */}
      <div className="editorial-shell flex justify-center">
        <a
          href="#statements"
          onClick={handleScrollDown}
          aria-label="Scroll down to manifesto statements"
          className="group inline-flex flex-col items-center gap-3"
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
            className="relative block w-px h-12 sm:h-14 overflow-hidden"
            style={{ backgroundColor: 'var(--color-border)' }}
          >
            {prefersReducedMotion ? (
              <span
                className="block w-full h-1/2"
                style={{ backgroundColor: 'var(--color-accent)' }}
              />
            ) : (
              <motion.span
                className="absolute inset-x-0 top-0 h-1/2 block"
                style={{
                  background:
                    'linear-gradient(to bottom, transparent, var(--color-accent) 45%, var(--color-text))',
                }}
                initial={{ y: '-100%' }}
                animate={{ y: '220%' }}
                transition={{
                  duration: 1.75,
                  repeat: Infinity,
                  repeatDelay: 0.25,
                  ease: EASE_OUT_EXPO,
                }}
              />
            )}
          </span>
        </a>
      </div>
    </section>
  );
}
