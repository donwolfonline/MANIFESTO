import { useEffect, useState } from 'react';
import type { PreloadableRouteKey } from '../lib/routePreload';

export interface RouteSkeletonProps {
  routeKey: PreloadableRouteKey;
  /** Delay in ms before rendering the skeleton to avoid fast-load flashes (default: 150ms) */
  delayMs?: number;
  /** Set true in tests to bypass the 150ms anti-flash delay */
  immediate?: boolean;
}

/**
 * Terminal Route Skeleton:
 * 1px outlined dark terminal frame with window dots, blinking cursor prompt line,
 * and outlined quick-command pills. Reserves exact aspect-ratio and min-height.
 */
export function TerminalRouteSkeleton() {
  return (
    <div
      data-testid="skeleton-terminal"
      className="editorial-shell py-8 sm:py-12 min-h-[calc(100dvh-4.25rem)] flex flex-col justify-center"
    >
      <div
        className="skeleton-outline-block w-full max-w-4xl mx-auto flex flex-col justify-between p-5 sm:p-7"
        style={{
          minHeight: '30rem',
          aspectRatio: '16 / 10',
        }}
      >
        {/* Top terminal title bar */}
        <div
          className="pb-4 border-b flex items-center justify-between gap-4"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-2">
            <span className="skeleton-outline-block inline-block w-2.5 h-2.5 rounded-full" />
            <span className="skeleton-outline-block inline-block w-2.5 h-2.5 rounded-full" />
            <span className="skeleton-outline-block inline-block w-2.5 h-2.5 rounded-full" />
          </div>
          <span
            className="uppercase tracking-[var(--tracking-micro)]"
            style={{
              fontSize: 'var(--text-micro)',
              color: 'var(--color-text-muted)',
            }}
          >
            /terminal · interactive shell
          </span>
        </div>

        {/* Prompt line with blinking cursor */}
        <div className="my-auto py-8 space-y-4">
          <div
            className="flex items-center gap-2.5 font-mono"
            style={{
              fontSize: 'var(--text-meta)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <span style={{ color: 'var(--color-accent)' }}>
              guest@working-copy:~$
            </span>
            <span
              data-testid="terminal-skeleton-cursor"
              className="inline-block w-2.5 h-4 terminal-cursor-blink"
              style={{ backgroundColor: 'var(--color-accent)' }}
            />
          </div>
          <div className="skeleton-outline-block h-4 w-64" />
          <div className="skeleton-outline-block h-4 w-48" />
        </div>

        {/* Outlined quick-command pill strip */}
        <div
          className="pt-4 border-t flex flex-wrap gap-2"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {['help', 'manifesto', 'random', 'ls', 'theme'].map((cmd) => (
            <span
              key={cmd}
              className="skeleton-outline-block px-3 py-1 uppercase"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-muted)',
              }}
            >
              {cmd}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Bug Museum Route Skeleton:
 * 1px outlined header & filter pills + horizontal gallery of placard cards
 * with reserved aspect-ratio (4/5) and min-height.
 */
export function BugMuseumRouteSkeleton() {
  return (
    <div
      data-testid="skeleton-bug-museum"
      className="editorial-shell py-10 sm:py-14 min-h-[calc(100dvh-4.25rem)] space-y-10"
    >
      <div
        className="pb-6 border-b space-y-4"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="skeleton-outline-block h-4 w-40" />
        <div className="skeleton-outline-block h-12 w-72 sm:w-96" />
        <div className="flex flex-wrap gap-2 pt-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className="skeleton-outline-block h-7 w-24" />
          ))}
        </div>
      </div>

      {/* Placard cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((idx) => (
          <div
            key={idx}
            data-testid="bug-museum-skeleton-placard"
            className="skeleton-outline-block p-6 flex flex-col justify-between"
            style={{
              minHeight: '22rem',
              aspectRatio: '4 / 5',
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className="uppercase tracking-[var(--tracking-micro)]"
                style={{
                  fontSize: 'var(--text-micro)',
                  color: 'var(--color-accent)',
                }}
              >
                exhibit 0{idx}
              </span>
              <span className="skeleton-outline-block h-5 w-16" />
            </div>
            <div className="space-y-3 my-auto">
              <div className="skeleton-outline-block h-7 w-4/5" />
              <div className="skeleton-outline-block h-4 w-full" />
              <div className="skeleton-outline-block h-4 w-3/4" />
            </div>
            <div className="skeleton-outline-block h-20 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Commit Log Route Skeleton:
 * Outlined --grep search bar + vertical timeline rail with circular node dots
 * and 1px outlined commit diff cards.
 */
export function CommitLogRouteSkeleton() {
  return (
    <div
      data-testid="skeleton-commit-log"
      className="editorial-shell py-10 sm:py-16 min-h-[calc(100dvh-4.25rem)]"
    >
      <div className="max-w-[66rem] mx-auto space-y-8">
        <div
          className="pb-6 border-b space-y-3"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="skeleton-outline-block h-4 w-48" />
          <div className="skeleton-outline-block h-12 w-80" />
        </div>

        {/* --grep search bar outline */}
        <div className="skeleton-outline-block h-11 w-full" />

        {/* Timeline with dots */}
        <div className="relative pl-8 sm:pl-12 space-y-5">
          <div
            className="absolute left-[11px] sm:left-[15px] top-3 bottom-3 w-px"
            style={{ backgroundColor: 'var(--color-border-strong)' }}
          />
          {[1, 2, 3, 4].map((idx) => (
            <div key={idx} className="relative">
              <span
                data-testid="commit-log-skeleton-dot"
                className="skeleton-outline-block absolute -left-8 sm:-left-12 top-6 w-3 h-3 rounded-full"
              />
              <div
                className="skeleton-outline-block p-5 space-y-3"
                style={{ minHeight: '7.25rem' }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="skeleton-outline-block h-4 w-36" />
                  <div className="skeleton-outline-block h-4 w-16" />
                </div>
                <div className="skeleton-outline-block h-6 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Shelf Route Skeleton:
 * Row of vertical 1px outlined book spines (aspect-ratio 1/4) resting on a
 * shelf baseline + workbench tool cards.
 */
export function ShelfRouteSkeleton() {
  return (
    <div
      data-testid="skeleton-shelf"
      className="editorial-shell py-10 sm:py-16 min-h-[calc(100dvh-4.25rem)] space-y-10"
    >
      <div
        className="pb-6 border-b space-y-3"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="skeleton-outline-block h-4 w-40" />
        <div className="skeleton-outline-block h-12 w-72" />
      </div>

      {/* Book spines row */}
      <div
        className="pb-6 border-b grid grid-cols-5 sm:grid-cols-10 gap-3 items-end"
        style={{
          borderColor: 'var(--color-border-strong)',
          minHeight: '19rem',
        }}
      >
        {Array.from({ length: 10 }).map((_, idx) => (
          <div
            key={idx}
            data-testid="shelf-skeleton-spine"
            className="skeleton-outline-block w-full flex flex-col items-center justify-between py-4"
            style={{
              minHeight: '16.5rem',
              aspectRatio: '1 / 4.2',
            }}
          >
            <span
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-muted)',
              }}
            >
              {String(idx + 1).padStart(2, '0')}
            </span>
            <span className="skeleton-outline-block w-2 h-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Playground Route Skeleton:
 * 1px outlined generative canvas box (aspect-ratio 16/10) + parameter slider rows.
 */
export function PlaygroundRouteSkeleton() {
  return (
    <div
      data-testid="skeleton-playground"
      className="editorial-shell py-10 sm:py-14 min-h-[calc(100dvh-4.25rem)] space-y-8"
    >
      <div
        className="pb-6 border-b space-y-3"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="skeleton-outline-block h-4 w-44" />
        <div className="skeleton-outline-block h-12 w-80" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Canvas box */}
        <div
          data-testid="playground-skeleton-canvas"
          className="skeleton-outline-block lg:col-span-8 w-full flex items-center justify-center"
          style={{
            minHeight: '24rem',
            aspectRatio: '16 / 10',
          }}
        >
          <span
            className="uppercase tracking-[var(--tracking-micro)]"
            style={{
              fontSize: 'var(--text-micro)',
              color: 'var(--color-text-muted)',
            }}
          >
            canvas · 60fps flow field
          </span>
        </div>

        {/* Slider rows */}
        <div className="lg:col-span-4 space-y-4">
          {['density', 'turbulence', 'speed', 'line weight', 'seed'].map(
            (param) => (
              <div
                key={param}
                data-testid="playground-skeleton-slider"
                className="skeleton-outline-block p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="uppercase tracking-[var(--tracking-micro)]"
                    style={{
                      fontSize: 'var(--text-micro)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {param}
                  </span>
                  <span className="skeleton-outline-block h-3 w-10" />
                </div>
                <div className="skeleton-outline-block h-2 w-full" />
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Editorial / Generic Route Skeleton for /today, /focus, /naming, /delete, /wall, /home, /notes:
 * 1px outlined blocks reserving exact min-height and aspect-ratio.
 */
export function EditorialRouteSkeleton({
  routeKey,
}: {
  routeKey: PreloadableRouteKey;
}) {
  return (
    <div
      data-testid={`skeleton-${routeKey}`}
      className="editorial-shell py-10 sm:py-16 min-h-[calc(100dvh-4.25rem)] space-y-8"
    >
      <div
        className="pb-6 border-b space-y-3"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="skeleton-outline-block h-4 w-40" />
        <div className="skeleton-outline-block h-12 w-72 sm:w-96" />
      </div>

      <div
        className="skeleton-outline-block p-8 space-y-5"
        style={{
          minHeight: '22rem',
          aspectRatio: '16 / 9',
        }}
      >
        <div className="skeleton-outline-block h-5 w-48" />
        <div className="skeleton-outline-block h-10 w-3/4" />
        <div className="skeleton-outline-block h-4 w-full" />
        <div className="skeleton-outline-block h-4 w-5/6" />
      </div>
    </div>
  );
}

/**
 * Renders the layout-matched skeleton for a route ONLY if loading takes longer
 * than `delayMs` (default 150ms) to avoid sub-150ms skeleton flashes, while
 * reserving `min-h-dvh` from frame 0 so CLS is strictly 0.
 */
export function RouteSkeleton({
  routeKey,
  delayMs = 150,
  immediate = false,
}: RouteSkeletonProps) {
  const [visible, setVisible] = useState<boolean>(immediate || delayMs <= 0);

  useEffect(() => {
    if (immediate || delayMs <= 0) {
      setVisible(true);
      return;
    }
    const timer = window.setTimeout(() => {
      setVisible(true);
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, immediate]);

  if (!visible) {
    // Zero-CLS reserved height placeholder during the first 150ms
    return (
      <div
        aria-busy="true"
        data-testid="skeleton-delay-spacer"
        className="min-h-[calc(100dvh-4.25rem)]"
      />
    );
  }

  switch (routeKey) {
    case 'terminal':
      return <TerminalRouteSkeleton />;
    case 'bug-museum':
      return <BugMuseumRouteSkeleton />;
    case 'commit-log':
      return <CommitLogRouteSkeleton />;
    case 'shelf':
      return <ShelfRouteSkeleton />;
    case 'playground':
      return <PlaygroundRouteSkeleton />;
    default:
      return <EditorialRouteSkeleton routeKey={routeKey} />;
  }
}
