import { useRef } from 'react';
import { useLenis } from '../lib/lenis';
import type { ManifestoMeta, ManifestoStats } from '../lib/markdown';
import { getPreloadHandlers } from '../lib/routePreload';
import {
  getRoutesByGroup,
  ROUTE_GROUP_META,
  ROUTE_GROUPS,
} from '../lib/routes';
import {
  useInViewOnce,
  usePrefersReducedMotion,
} from '../lib/useViewportActivity';

interface FooterProps {
  meta: ManifestoMeta;
  stats: ManifestoStats;
  onOpenPrivacy?: () => void;
  onNavigateRoute?: (target: string) => void;
}

export function Footer({
  meta,
  stats,
  onOpenPrivacy,
  onNavigateRoute,
}: FooterProps) {
  const { scrollTo, isReducedMotion } = useLenis();
  const prefersReducedMotion = usePrefersReducedMotion();
  const wordmarkRef = useRef<HTMLParagraphElement | null>(null);
  const revealed = useInViewOnce(wordmarkRef, prefersReducedMotion, {
    threshold: 0.2,
  });

  // Split title cleanly on trailing extension (e.g. "WORKING_COPY" + "." + "md")
  const extIndex = meta.title.lastIndexOf('.');
  const hasExtension = extIndex > 0 && extIndex < meta.title.length - 1;
  const wordmarkStem = hasExtension ? meta.title.slice(0, extIndex) : meta.title;
  const wordmarkExt = hasExtension ? meta.title.slice(extIndex + 1) : '';

  return (
    <footer
      className="mt-16 sm:mt-24 border-t overflow-hidden"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      {/* Grouped route directory driven by src/lib/routes.ts */}
      <div
        className="editorial-shell pt-10 pb-8 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <nav
          aria-label="Footer route directory"
          className="grid grid-cols-1 sm:grid-cols-3 gap-8 font-mono"
        >
          {ROUTE_GROUPS.map((groupKey) => {
            const groupRoutes = getRoutesByGroup(groupKey);
            const groupMeta = ROUTE_GROUP_META[groupKey];
            return (
              <div key={groupKey} className="space-y-3">
                <div
                  className="flex items-center gap-2 uppercase tracking-[var(--tracking-micro)]"
                  style={{ fontSize: 'var(--text-micro)' }}
                >
                  <span style={{ color: 'var(--color-accent)' }}>
                    {groupMeta.label}
                  </span>
                  <span aria-hidden="true" style={{ color: 'var(--color-text-muted)' }}>
                    ·
                  </span>
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    {groupMeta.title}
                  </span>
                </div>

                <ul className="list-none p-0 m-0 flex flex-wrap gap-x-5 gap-y-2">
                  {groupRoutes.map((route) => (
                    <li key={route.id}>
                      <a
                        href={route.path}
                        title={route.description}
                        {...getPreloadHandlers(route.id)}
                        onClick={(e) => {
                          if (onNavigateRoute) {
                            e.preventDefault();
                            onNavigateRoute(route.id);
                          }
                        }}
                        className="link-draw inline-flex items-center gap-1.5 uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
                        style={{
                          fontSize: 'var(--text-micro)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        <span
                          aria-hidden="true"
                          className="inline-flex items-center shrink-0"
                          style={{
                            color:
                              route.id === 'terminal'
                                ? 'var(--color-accent)'
                                : 'var(--color-text-muted)',
                          }}
                          dangerouslySetInnerHTML={{ __html: route.icon }}
                        />
                        <span>{route.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Compact colophon metadata strip */}
      <div className="editorial-shell pt-8 pb-8 sm:pt-10 sm:pb-10">
        <div
          className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 font-mono uppercase tracking-[var(--tracking-micro)]"
          style={{
            fontSize: 'var(--text-micro)',
            color: 'var(--color-text-muted)',
          }}
        >
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span>File: {meta.filename}</span>
            <span>Author: {meta.author}</span>
            <span>Words: {stats.wordCount}</span>
            <span>Lines: {stats.lineCount}</span>
            <span className="hidden sm:inline">
              Motion: {isReducedMotion ? 'Reduced' : 'Native Smooth'}
            </span>
            <span className="hidden md:inline">Keys: ⌘K · / · ?</span>
            <a
              href="/privacy"
              {...getPreloadHandlers('privacy')}
              onClick={(e) => {
                if (onOpenPrivacy) {
                  e.preventDefault();
                  onOpenPrivacy();
                }
              }}
              className="link-draw link-draw--resting transition-colors hover:text-[var(--color-accent)]"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              /privacy
            </a>
          </div>

          <button
            type="button"
            onClick={() => scrollTo(0, { offset: 0 })}
            className="link-draw link-draw--resting inline-flex items-center gap-2 transition-colors hover:text-[var(--color-accent)] cursor-pointer"
            style={{
              fontSize: 'var(--text-micro)',
              color: 'var(--color-text)',
            }}
          >
            Back to top <span aria-hidden="true">↑</span>
          </button>
        </div>
      </div>

      {/* Oversized footer wordmark that slides up on reveal */}
      <div className="editorial-shell pt-4 pb-6 sm:pt-8 sm:pb-10">
        <div className="overflow-hidden pt-[0.06em]">
          <p
            ref={wordmarkRef}
            aria-hidden="true"
            className="m-0 font-display font-normal text-center select-none whitespace-nowrap"
            style={{
              fontSize: 'clamp(2.35rem, 10.8vw, 10.5rem)',
              lineHeight: 0.84,
              letterSpacing: '-0.035em',
              color: 'var(--color-text)',
              opacity: prefersReducedMotion || revealed ? 1 : 0,
              transform:
                prefersReducedMotion || revealed
                  ? 'translate3d(0, 0, 0)'
                  : 'translate3d(0, 105%, 0)',
              transition: prefersReducedMotion
                ? undefined
                : 'transform 1000ms cubic-bezier(0.16, 1, 0.3, 1), opacity 800ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <span>{wordmarkStem}</span>
            {hasExtension && (
              <>
                <span style={{ color: 'var(--color-accent)' }}>.</span>
                <span
                  className="italic"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {wordmarkExt}
                </span>
              </>
            )}
          </p>
        </div>
      </div>
    </footer>
  );
}
