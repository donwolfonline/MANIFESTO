import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  getRouteTransitionLabel,
  shouldUseShortRouteFade,
} from '../lib/routeTransitions';
import { usePrefersReducedMotion } from '../lib/useViewportActivity';
import { FilmGrain } from './FilmGrain';

export interface RouteTransitionStageProps {
  /** Current location pathname driving AnimatePresence mode="wait" */
  pathname: string;
  /** Number of route transitions performed in this session (0 on initial load) */
  transitionCount: number;
  /** Callback fired once the new route is revealed so focus moves to h1 */
  onTransitionSettled?: (pathname: string) => void;
  children: ReactNode;
}

type CurtainPhase = 'idle' | 'entering' | 'typing' | 'lifting';

const CURTAIN_EASE: [number, number, number, number] = [0.77, 0, 0.18, 1];

export function RouteTransitionStage({
  pathname,
  transitionCount,
  onTransitionSettled,
  children,
}: RouteTransitionStageProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const useShortFade = shouldUseShortRouteFade(prefersReducedMotion);

  const routeLabel = getRouteTransitionLabel(pathname);

  const [curtainPhase, setCurtainPhase] = useState<CurtainPhase>('idle');
  const [typedChars, setTypedChars] = useState<number>(routeLabel.length);
  const [activeLabel, setActiveLabel] = useState<string>(routeLabel);

  // Orchestrate the 2-panel dark curtain on route transitions:
  // 1. Slide up from bottom (600ms)
  // 2. Type incoming route name in center mono with orange ">_" prompt
  // 3. Lift off to top (500ms), revealing the new page whose first elements stagger in
  // Safe interruption: cleanup cancels all pending timers immediately if the user clicks again mid-transition.
  useEffect(() => {
    const nextLabel = getRouteTransitionLabel(pathname);
    setActiveLabel(nextLabel);

    if (transitionCount === 0) {
      setCurtainPhase('idle');
      setTypedChars(nextLabel.length);
      return;
    }

    if (useShortFade) {
      setCurtainPhase('idle');
      setTypedChars(nextLabel.length);
      const fadeTimer = window.setTimeout(() => {
        onTransitionSettled?.(pathname);
      }, 150);
      return () => window.clearTimeout(fadeTimer);
    }

    // Start two-panel curtain slide-up (600ms) + progressive typing of the route name
    setCurtainPhase('entering');
    setTypedChars(1);

    const charStepMs = Math.max(
      18,
      Math.min(36, Math.floor(260 / Math.max(1, nextLabel.length))),
    );
    let currentChar = 1;

    const typingInterval = window.setInterval(() => {
      currentChar += 1;
      setTypedChars(Math.min(nextLabel.length, currentChar));
      if (currentChar >= nextLabel.length) {
        window.clearInterval(typingInterval);
      }
    }, charStepMs);

    const enterDoneTimer = window.setTimeout(() => {
      setCurtainPhase('typing');
      setTypedChars(nextLabel.length);
    }, 340);

    const liftStartTimer = window.setTimeout(() => {
      setCurtainPhase('lifting');
    }, 600);

    const completeTimer = window.setTimeout(() => {
      setCurtainPhase('idle');
      onTransitionSettled?.(pathname);
    }, 1100);

    return () => {
      window.clearInterval(typingInterval);
      window.clearTimeout(enterDoneTimer);
      window.clearTimeout(liftStartTimer);
      window.clearTimeout(completeTimer);
    };
  }, [pathname, transitionCount, useShortFade, onTransitionSettled]);

  const showCurtain = !useShortFade && curtainPhase !== 'idle';
  const isLifting = curtainPhase === 'lifting';

  return (
    <div className="relative">
      {/* Two-panel dark transition curtain (slides up 600ms from bottom, lifts off 500ms to top) */}
      <AnimatePresence>
        {showCurtain && (
          <motion.div
            key={`curtain-${pathname}-${transitionCount}`}
            aria-hidden="true"
            data-testid="route-transition-curtain"
            data-curtain-phase={curtainPhase}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            className="pointer-events-none fixed inset-x-0 bottom-0 flex overflow-hidden"
            style={{
              top: 'calc(var(--header-h, 4.25rem) + env(safe-area-inset-top, 0px))',
              zIndex: 'var(--z-preloader)',
            }}
          >
            {/* Left panel */}
            <motion.div
              data-testid="transition-curtain-panel-left"
              initial={{ y: '100%' }}
              animate={{ y: isLifting ? '-102%' : '0%' }}
              transition={{
                duration: isLifting ? 0.5 : 0.6,
                ease: CURTAIN_EASE,
              }}
              className="w-1/2 h-full border-r"
              style={{
                backgroundColor: '#191718',
                borderColor: 'rgba(242, 238, 232, 0.08)',
              }}
            />

            {/* Right panel (staggered by 30ms for tactile two-panel split) */}
            <motion.div
              data-testid="transition-curtain-panel-right"
              initial={{ y: '100%' }}
              animate={{ y: isLifting ? '-102%' : '0%' }}
              transition={{
                duration: isLifting ? 0.5 : 0.6,
                delay: 0.03,
                ease: CURTAIN_EASE,
              }}
              className="w-1/2 h-full"
              style={{ backgroundColor: '#201e1f' }}
            />

            <FilmGrain />

            {/* Center mono route label typing out with the orange ">_" prompt */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{
                opacity: isLifting ? 0 : 1,
                y: isLifting ? -16 : 0,
              }}
              transition={{
                duration: isLifting ? 0.28 : 0.26,
                ease: CURTAIN_EASE,
              }}
              className="absolute inset-0 flex items-center justify-center px-6"
            >
              <div
                data-testid="transition-curtain-prompt"
                className="px-5 py-3 border font-mono uppercase tracking-[var(--tracking-micro)] inline-flex items-center gap-2.5 shadow-2xl"
                style={{
                  backgroundColor: '#201e1f',
                  borderColor: 'rgba(242, 238, 232, 0.22)',
                  borderTop: '2px solid var(--color-accent)',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: 'clamp(0.85rem, 1.4vw, 1.1rem)',
                  color: '#f2eee8',
                }}
              >
                <span style={{ color: 'var(--color-accent)' }}>&gt;_</span>
                <span>{activeLabel.slice(0, typedChars)}</span>
                <span
                  className="inline-block w-2 h-4 terminal-cursor-blink"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Framer Motion AnimatePresence (mode="wait") wrapping the routed page content */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          data-testid="route-transition-page"
          data-route-path={pathname}
          initial={
            transitionCount === 0
              ? false
              : useShortFade
                ? { opacity: 0 }
                : { opacity: 0, y: 14 }
          }
          animate={{ opacity: 1, y: 0 }}
          exit={
            useShortFade
              ? { opacity: 0, transition: { duration: 0.15 } }
              : {
                  opacity: 0,
                  y: -10,
                  transition: { duration: 0.22, ease: CURTAIN_EASE },
                }
          }
          transition={
            useShortFade
              ? { duration: 0.15, ease: 'easeOut' }
              : {
                  duration: 0.42,
                  delay: transitionCount > 0 ? 0.18 : 0,
                  ease: [0.22, 1, 0.36, 1],
                }
          }
          className={
            transitionCount > 0 && !useShortFade ? 'route-stagger-enter' : ''
          }
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
