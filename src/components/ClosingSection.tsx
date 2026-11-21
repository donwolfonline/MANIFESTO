import { useRef } from 'react';
import {
  CLOSING_SIGN_OFF,
  DO_MORE_ITEMS,
  STOP_DOING_ITEMS,
  type ClosingSignOff,
} from '../data/manifestoItems';
import {
  useInViewOnce,
  usePrefersReducedMotion,
} from '../lib/useViewportActivity';
import { HoverLink } from './HoverLink';

interface ClosingSectionProps {
  stopItems?: string[];
  doMoreItems?: string[];
  signOff?: ClosingSignOff;
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
  const show = prefersReducedMotion || entered;
  const itemDelayMs = index * 80;
  const strikeDelayMs = 240 + index * 95;

  return (
    <li
      className="flex items-baseline gap-3.5 font-body"
      style={{
        fontSize: 'var(--text-body)',
        lineHeight: 'var(--leading-body)',
        opacity: show ? 1 : 0,
        transform: show ? 'translate3d(0, 0, 0)' : 'translate3d(0, 12px, 0)',
        transition: prefersReducedMotion
          ? undefined
          : `opacity 550ms cubic-bezier(0.16, 1, 0.3, 1) ${itemDelayMs}ms, transform 550ms cubic-bezier(0.16, 1, 0.3, 1) ${itemDelayMs}ms`,
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

      <span
        className="inline"
        style={{
          color: show
            ? 'var(--color-text-muted)'
            : 'var(--color-text-secondary)',
          backgroundImage:
            'linear-gradient(rgba(240, 100, 45, 0.76), rgba(240, 100, 45, 0.76))',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: '0% 54%',
          backgroundSize: show ? '100% 1.25px' : '0% 1.25px',
          transitionProperty: 'background-size, color',
          transitionDuration: prefersReducedMotion ? '0ms' : '680ms, 520ms',
          transitionDelay: prefersReducedMotion ? '0ms' : `${strikeDelayMs}ms`,
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {text}
      </span>
    </li>
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
  const show = prefersReducedMotion || entered;
  const itemDelayMs = index * 80;

  return (
    <li
      className="flex items-start gap-3.5 font-body"
      style={{
        fontSize: 'var(--text-body)',
        lineHeight: 'var(--leading-body)',
        color: 'var(--color-text-secondary)',
        opacity: show ? 1 : 0,
        transform: show ? 'translate3d(0, 0, 0)' : 'translate3d(0, 12px, 0)',
        transition: prefersReducedMotion
          ? undefined
          : `opacity 550ms cubic-bezier(0.16, 1, 0.3, 1) ${itemDelayMs}ms, transform 550ms cubic-bezier(0.16, 1, 0.3, 1) ${itemDelayMs}ms`,
      }}
    >
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
          <path
            d="M2.5 8.5L6.2 12L13.5 4.2"
            stroke="var(--color-accent)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={show ? 0 : 1}
            style={{
              opacity: show ? 1 : 0,
              transition: prefersReducedMotion
                ? undefined
                : `stroke-dashoffset 500ms cubic-bezier(0.16, 1, 0.3, 1) ${160 + itemDelayMs}ms, opacity 280ms ease ${160 + itemDelayMs}ms`,
            }}
          />
        </svg>
      </span>

      <span>{text}</span>
    </li>
  );
}

export function ClosingSection({
  stopItems = STOP_DOING_ITEMS,
  doMoreItems = DO_MORE_ITEMS,
  signOff = CLOSING_SIGN_OFF,
}: ClosingSectionProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const stopRef = useRef<HTMLDivElement | null>(null);
  const doMoreRef = useRef<HTMLDivElement | null>(null);
  const signOffRef = useRef<HTMLDivElement | null>(null);

  const stopEntered = useInViewOnce(stopRef, prefersReducedMotion, {
    threshold: 0.18,
    rootMargin: '0px 0px -8% 0px',
  });
  const doMoreEntered = useInViewOnce(doMoreRef, prefersReducedMotion, {
    threshold: 0.18,
    rootMargin: '0px 0px -8% 0px',
  });
  const signOffEntered = useInViewOnce(signOffRef, prefersReducedMotion, {
    threshold: 0.18,
    rootMargin: '0px 0px -8% 0px',
  });

  const signatureParts = signOff.signature.match(/^([—–-])\s*(.+)$/);
  const showSignOff = prefersReducedMotion || signOffEntered;

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-14 lg:gap-24">
          <div ref={stopRef}>
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
                  entered={stopEntered}
                  prefersReducedMotion={prefersReducedMotion}
                />
              ))}
            </ul>
          </div>

          <div ref={doMoreRef}>
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
                  entered={doMoreEntered}
                  prefersReducedMotion={prefersReducedMotion}
                />
              ))}
            </ul>
          </div>
        </div>

        <div
          ref={signOffRef}
          className="mt-28 sm:mt-40 pt-16 sm:pt-20 border-t flex flex-col items-center text-center"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div
            className="flex flex-col items-center"
            style={{
              opacity: showSignOff ? 1 : 0,
              transform: showSignOff
                ? 'translate3d(0, 0, 0)'
                : 'translate3d(0, 18px, 0)',
              transition: prefersReducedMotion
                ? undefined
                : 'opacity 750ms cubic-bezier(0.16, 1, 0.3, 1), transform 750ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
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
          </div>
        </div>
      </div>
    </section>
  );
}
