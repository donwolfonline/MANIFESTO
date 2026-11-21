/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState } from 'react';
import { preloadTarget } from '../lib/routePreload';
import { usePrefersReducedMotion } from '../lib/useViewportActivity';

export const PRELOADER_SESSION_KEY = 'manifesto_preloader_seen_v1';

export const BOOT_LOG_LINES = [
  '> opening working_copy.md',
  '> reading 10 principles',
  '> verifying self-hosted woff2 fonts',
  '> warming hero assets & first route chunk',
  '> setting the table',
] as const;

export function hasSeenPreloaderThisSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(PRELOADER_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markPreloaderSeenThisSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(PRELOADER_SESSION_KEY, 'true');
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

export interface PreloaderProps {
  /** Minimum display duration (ms) for first-visit preloader (default: 900ms) */
  minDurationMs?: number;
  /** Maximum wait cap (ms) for real fonts/assets/chunk readiness (default: 3000ms) */
  maxDurationMs?: number;
  /** Legacy alias for minDurationMs */
  durationMs?: number;
  /** Small mono label displayed beside the counter */
  label?: string;
  /** Fired right as the counter finishes and lifts */
  onComplete?: () => void;
  /** Optional override for unit tests to force running even if sessionStorage is set */
  forceRun?: boolean;
  /** Optional custom promise array for unit testing real milestone tracking */
  milestones?: Promise<unknown>[];
}

function waitForDocumentFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts?.ready) {
    return Promise.resolve();
  }
  return document.fonts.ready.then(() => undefined).catch(() => undefined);
}

function waitForHeroAssets(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  const images = Array.from(document.querySelectorAll('img'));
  if (images.length === 0) return Promise.resolve();

  return Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
      });
    }),
  ).then(() => undefined);
}

function waitForFirstRouteChunk(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  try {
    preloadTarget(window.location.pathname || 'home');
  } catch {
    // Ignore
  }
  return Promise.resolve();
}

export function Preloader({
  minDurationMs,
  maxDurationMs = 3000,
  durationMs,
  label = 'loading ~/working_copy.md',
  onComplete,
  forceRun = false,
  milestones,
}: PreloaderProps) {
  const effectiveMinMs = minDurationMs ?? durationMs ?? 900;
  const prefersReducedMotion = usePrefersReducedMotion();

  const shouldSkip =
    !forceRun &&
    (prefersReducedMotion ||
      hasSeenPreloaderThisSession() ||
      (typeof navigator !== 'undefined' && navigator.webdriver === true));

  const [count, setCount] = useState<number>(shouldSkip ? 100 : 0);
  const [visibleLines, setVisibleLines] = useState<number>(
    shouldSkip ? BOOT_LOG_LINES.length : 1,
  );
  const [lifting, setLifting] = useState<boolean>(shouldSkip);
  const [unmounted, setUnmounted] = useState<boolean>(shouldSkip);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });
  const completedRef = useRef(false);

  useEffect(() => {
    if (!shouldSkip) return;
    setCount(100);
    setVisibleLines(BOOT_LOG_LINES.length);
    setLifting(true);
    setUnmounted(true);
    if (!completedRef.current) {
      completedRef.current = true;
      onCompleteRef.current?.();
    }
  }, [shouldSkip]);

  useEffect(() => {
    if (shouldSkip || completedRef.current) return;

    const tasks =
      milestones && milestones.length > 0
        ? milestones
        : [
            waitForDocumentFonts(),
            waitForHeroAssets(),
            waitForFirstRouteChunk(),
          ];

    const totalTasks = Math.max(1, tasks.length);
    let completedTasks = 0;
    let allRealAssetsReady = false;

    tasks.forEach((p) => {
      Promise.resolve(p)
        .then(() => {
          completedTasks += 1;
          if (completedTasks >= totalTasks) {
            allRealAssetsReady = true;
          }
        })
        .catch(() => {
          completedTasks += 1;
          if (completedTasks >= totalTasks) {
            allRealAssetsReady = true;
          }
        });
    });

    const startTime = performance.now();
    let unmountTimer = 0;

    const step = () => {
      const now = performance.now();
      const elapsed = Math.max(0, now - startTime);

      // Minimum time progress (0 -> 1 over effectiveMinMs, default 900ms)
      const minTimeRatio = Math.min(1, elapsed / Math.max(1, effectiveMinMs));
      // Real asset readiness ratio (0 -> 1 across fonts, hero assets, first route chunk)
      const assetRatio = completedTasks / totalTasks;
      // Hard maximum timeout cap (default 3000ms)
      const timedOut = elapsed >= maxDurationMs;

      // Blend real asset progress (55%) with minimum display duration progress (45%)
      const rawProgress = timedOut
        ? 1
        : allRealAssetsReady
          ? minTimeRatio
          : Math.min(0.94, assetRatio * 0.55 + minTimeRatio * 0.45);

      const nextCount = Math.min(100, Math.max(0, Math.round(rawProgress * 100)));
      setCount(nextCount);

      // Reveal boot log lines quickly as progress advances
      const nextLineCount = Math.min(
        BOOT_LOG_LINES.length,
        Math.max(
          1,
          Math.ceil(( Math.max(minTimeRatio, rawProgress) ) * BOOT_LOG_LINES.length),
        ),
      );
      setVisibleLines(nextLineCount);

      const canFinish =
        (allRealAssetsReady && elapsed >= effectiveMinMs) || timedOut;

      if (canFinish) {
        window.clearInterval(intervalId);
        setCount(100);
        setVisibleLines(BOOT_LOG_LINES.length);
        completedRef.current = true;
        markPreloaderSeenThisSession();
        setLifting(true);
        onCompleteRef.current?.();
        unmountTimer = window.setTimeout(() => {
          setUnmounted(true);
        }, 420);
      }
    };

    const intervalId = window.setInterval(step, 30);
    step();

    return () => {
      window.clearInterval(intervalId);
      if (unmountTimer !== 0) window.clearTimeout(unmountTimer);
    };
  }, [effectiveMinMs, maxDurationMs, shouldSkip, milestones]);

  if (unmounted) return null;

  const formattedCount = String(count).padStart(3, '0');

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`${label}: ${count}%`}
      data-testid="first-visit-preloader"
      className="fixed inset-x-0 top-0 pointer-events-none"
      style={{
        zIndex: 'var(--z-preloader)',
        transform: lifting
          ? 'translate3d(0, -105%, 0)'
          : 'translate3d(0, 0, 0)',
        transition:
          'transform 460ms cubic-bezier(0.77, 0, 0.18, 1), opacity 400ms ease',
        opacity: lifting ? 0 : 1,
      }}
    >
      {/* Thin top progress line */}
      <div
        className="h-[2px] w-full"
        style={{ backgroundColor: 'var(--color-border)' }}
      >
        <div
          data-testid="preloader-progress-line"
          className="h-full origin-left transition-[width] duration-75"
          style={{
            width: `${count}%`,
            backgroundColor: 'var(--color-accent)',
          }}
        />
      </div>

      {/* Mono boot log + 000 -> 100 counter plate that lifts into the hero animation */}
      <div
        className="border-b shadow-2xl"
        style={{
          backgroundColor: 'var(--color-bg-deep)',
          borderColor: 'var(--color-accent)',
        }}
      >
        <div className="editorial-shell py-4 sm:py-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4 font-mono">
          <div className="space-y-1.5">
            <div
              className="flex items-center gap-2.5 uppercase tracking-[var(--tracking-micro)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-accent)',
              }}
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: 'var(--color-accent)' }}
              />
              <span>{label}</span>
            </div>

            {/* 4-5 line mono boot log */}
            <ul
              data-testid="preloader-boot-log"
              className="list-none p-0 m-0 space-y-0.5"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {BOOT_LOG_LINES.slice(0, visibleLines).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          <div
            data-testid="preloader-percent-counter"
            className="font-mono tabular-nums leading-none self-end"
            style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.6rem)',
              letterSpacing: '-0.04em',
              color: 'var(--color-text)',
            }}
          >
            {formattedCount}
            <span style={{ color: 'var(--color-accent)' }}>%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
