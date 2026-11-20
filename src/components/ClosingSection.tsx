import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  CLOSING_SIGN_OFF,
  DO_MORE_ITEMS,
  STOP_DOING_ITEMS,
  type ClosingSignOff,
} from '../data/manifestoItems';
import { EASE_OUT_EXPO } from '../lib/motion';
import { HoverLink } from './HoverLink';

interface ClosingSectionProps {
  stopItems?: string[];
  doMoreItems?: string[];
  signOff?: ClosingSignOff;
}

function useRevealOnce(prefersReducedMotion: boolean) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [entered, setEntered] = useState<boolean>(prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion) {
      setEntered(true);
      return;
    }

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setEntered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  return { ref, entered };
}

function StopListItem({
  text,
  index,
  entered,
  prefersReducedMotion,
}: {
  text: string;
  index: number;
  entered: boolean;
  prefersReducedMotion: boolean;
}) {
  const strikeDelayMs = 240 + index * 95;

  return (
    <motion.li
      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
      animate={
        prefersReducedMotion || entered
          ? { opacity: 1, y: 0 }
          : { opacity: 0, y: 12 }
      }
      transition={{
        duration: prefersReducedMotion ? 0 : 0.55,
        delay: prefersReducedMotion ? 0 : index * 0.08,
        ease: EASE_OUT_EXPO,
      }}
      className="flex items-baseline gap-3.5 font-body"
      style={{
        fontSize: 'var(--text-body)',
        lineHeight: 'var(--leading-body)',
      }}
    >
      <span
        aria-hidden="true"
        className="shrink-0 font-mono select-none"
        style={{
          fontSize: 'var(--text-meta)',
          color: 'var(--color-text-muted)',
          opacity: 0.65,
        }}
      >
        ×
      </span>

      {/* Multi-line safe left-to-right strikethrough drawn via inline background-size */}
      <span
        className="inline"
        style={{
          color:
            prefersReducedMotion || entered
              ? 'var(--color-text-muted)'
              : 'var(--color-text-secondary)',
          backgroundImage:
            'linear-gradient(rgba(240, 100, 45, 0.76), rgba(240, 100, 45, 0.76))',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: '0% 54%',
          backgroundSize:
            prefersReducedMotion || entered ? '100% 1.25px' : '0% 1.25px',
          transitionProperty: 'background-size, color',
          transitionDuration: prefersReducedMotion ? '0ms' : '680ms, 520ms',
          transitionDelay: prefersReducedMotion ? '0ms' : `${strikeDelayMs}ms`,
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {text}
      </span>
    </motion.li>
  );
}

function DoMoreListItem({
  text,
  index,
  entered,
  prefersReducedMotion,
}: {
  text: string;
  index: number;
  entered: boolean;
  prefersReducedMotion: boolean;
}) {
  const itemDelay = index * 0.08;

  return (
    <motion.li
      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
      animate={
        prefersReducedMotion || entered
          ? { opacity: 1, y: 0 }
          : { opacity: 0, y: 12 }
      }
      transition={{
        duration: prefersReducedMotion ? 0 : 0.55,
        delay: prefersReducedMotion ? 0 : itemDelay,
        ease: EASE_OUT_EXPO,
      }}
      className="flex items-start gap-3.5 font-body"
      style={{
        fontSize: 'var(--text-body)',
        lineHeight: 'var(--leading-body)',
        color: 'var(--color-text-secondary)',
      }}
    >
      {/* Animated hand-drawn checkmark stroke */}
      <span
        aria-hidden="true"
        className="shrink-0 mt-[0.42em] flex items-center justify-center"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.path
            d="M2.5 8.5L6.2 12L13.5 4.2"
            stroke="var(--color-accent)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={
              prefersReducedMotion
                ? false
                : { pathLength: 0, opacity: 0 }
            }
            animate={
              prefersReducedMotion || entered
                ? { pathLength: 1, opacity: 1 }
                : { pathLength: 0, opacity: 0 }
            }
            transition={{
              duration: prefersReducedMotion ? 0 : 0.5,
              delay: prefersReducedMotion ? 0 : 0.16 + itemDelay,
              ease: EASE_OUT_EXPO,
            }}
          />
        </svg>
      </span>

      <span>{text}</span>
    </motion.li>
  );
}

export function ClosingSection({
  stopItems = STOP_DOING_ITEMS,
  doMoreItems = DO_MORE_ITEMS,
  signOff = CLOSING_SIGN_OFF,
}: ClosingSectionProps) {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const stopReveal = useRevealOnce(prefersReducedMotion);
  const doMoreReveal = useRevealOnce(prefersReducedMotion);
  const signOffReveal = useRevealOnce(prefersReducedMotion);

  const signatureParts = signOff.signature.match(/^([—–-])\s*(.+)$/);

  return (
    <section
      id="closing"
      aria-label="Closing commitments and sign-off"
      className="relative pt-20 sm:pt-32 pb-8 sm:pb-16 border-t"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      <div className="editorial-shell">
        {/* Two-column lists: Stop doing vs. Do more */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-14 lg:gap-24">
          {/* Left column: things I am trying to stop doing */}
          <div ref={stopReveal.ref}>
            <h2
              className="m-0 mb-8 sm:mb-10 pb-4 border-b font-mono font-normal tracking-[0.02em]"
              style={{
                fontSize: 'var(--text-heading-mono)',
                borderColor: 'var(--color-border)',
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
              things I am trying to stop doing
            </h2>

            <ul className="m-0 p-0 list-none space-y-5">
              {stopItems.map((item, idx) => (
                <StopListItem
                  key={item}
                  text={item}
                  index={idx}
                  entered={stopReveal.entered}
                  prefersReducedMotion={prefersReducedMotion}
                />
              ))}
            </ul>
          </div>

          {/* Right column: things I am trying to do more */}
          <div ref={doMoreReveal.ref}>
            <h2
              className="m-0 mb-8 sm:mb-10 pb-4 border-b font-mono font-normal tracking-[0.02em]"
              style={{
                fontSize: 'var(--text-heading-mono)',
                borderColor: 'var(--color-border)',
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
              things I am trying to do more
            </h2>

            <ul className="m-0 p-0 list-none space-y-5">
              {doMoreItems.map((item, idx) => (
                <DoMoreListItem
                  key={item}
                  text={item}
                  index={idx}
                  entered={doMoreReveal.entered}
                  prefersReducedMotion={prefersReducedMotion}
                />
              ))}
            </ul>
          </div>
        </div>

        {/* Centered editorial sign-off block */}
        <div
          ref={signOffReveal.ref}
          className="mt-28 sm:mt-40 pt-16 sm:pt-20 border-t flex flex-col items-center text-center"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
            animate={
              prefersReducedMotion || signOffReveal.entered
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 18 }
            }
            transition={{
              duration: prefersReducedMotion ? 0 : 0.75,
              ease: EASE_OUT_EXPO,
            }}
            className="flex flex-col items-center"
          >
            {/* Short disclaimer sentence in serif */}
            <p
              className="m-0 font-body italic"
              style={{
                maxWidth: '46ch',
                fontSize: 'var(--text-lead)',
                lineHeight: 'var(--leading-lead)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {signOff.disclaimer}
            </p>

            {/* Signature ("— initials") */}
            <p
              className="mt-8 mb-0 font-display italic"
              style={{
                fontSize: 'clamp(1.85rem, 3.2vw, 2.75rem)',
                lineHeight: 1.1,
                color: 'var(--color-text)',
              }}
            >
              {signatureParts ? (
                <>
                  <span style={{ color: 'var(--color-accent)' }}>
                    {signatureParts[1]}
                  </span>{' '}
                  <span>{signatureParts[2]}</span>
                </>
              ) : (
                signOff.signature
              )}
            </p>

            {/* "last touched" + contact email link */}
            <div
              className="mt-8 flex flex-col items-center gap-2.5 font-mono tracking-[var(--tracking-mono)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-muted)',
              }}
            >
              <p className="m-0 lowercase">
                last touched{' '}
                <span
                  aria-hidden="true"
                  className="mx-1.5"
                  style={{ color: 'var(--color-accent)' }}
                >
                  ·
                </span>
                <span>{signOff.lastTouched}</span>
              </p>

              <HoverLink
                href={`mailto:${signOff.email}`}
                restingRule
                className="lowercase transition-colors hover:text-[var(--color-accent)]"
                style={{
                  color: 'var(--color-text)',
                  transitionDuration: 'var(--duration-fast)',
                }}
              >
                {signOff.email}
              </HoverLink>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
