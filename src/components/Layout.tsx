import { lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import type { ManifestoMeta, ManifestoStats } from '../lib/markdown';
import { FilmGrain } from './FilmGrain';
import { Footer } from './Footer';
import { Header, type ViewMode } from './Header';
import type { OverlayOrigin, OverlaySectionItem } from './IndexOverlay';

const LazyIndexOverlay = lazy(() =>
  import('./IndexOverlay').then((mod) => ({ default: mod.IndexOverlay })),
);

interface LayoutProps {
  meta: ManifestoMeta;
  stats: ManifestoStats;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sections: OverlaySectionItem[];
  onSelectSection: (sectionId: string) => void;
  readingItems?: { number: number; title: string }[];
  onSelectReadingItem?: (itemNumber: number) => void;
  onOpenTerminal?: () => void;
  onOpenMuseum?: () => void;
  onOpenCommitLog?: () => void;
  onOpenToday?: () => void;
  onOpenPrivacy?: () => void;
  onNavigateRoute?: (target: string) => void;
  skipPreloader?: boolean;
  onPreloaderComplete?: () => void;
  /** When true (in Reading Mode), hides header, custom cursor, and footer chrome */
  hideChrome?: boolean;
  /** When true, the persistent Header & Field Index are already mounted at the App root */
  hasGlobalHeader?: boolean;
  children: ReactNode;
}

export function Layout({
  meta,
  stats,
  viewMode,
  onViewModeChange,
  sections,
  onSelectSection,
  readingItems,
  onSelectReadingItem,
  onOpenTerminal,
  onOpenMuseum,
  onOpenCommitLog,
  onOpenToday,
  onOpenPrivacy,
  onNavigateRoute,
  onPreloaderComplete,
  hideChrome = false,
  hasGlobalHeader = false,
  children,
}: LayoutProps) {
  const [indexOpen, setIndexOpen] = useState(false);
  const [indexOrigin, setIndexOrigin] = useState<OverlayOrigin>({
    x: 0,
    y: 0,
  });

  // Immediately signal ready so Hero renders with zero blocking preloader delay (fast LCP)
  useEffect(() => {
    onPreloaderComplete?.();
  }, [onPreloaderComplete]);

  const handleToggleIndex = useCallback((origin: OverlayOrigin) => {
    setIndexOrigin(origin);
    setIndexOpen((prev) => !prev);
  }, []);

  const handleCloseIndex = useCallback(() => {
    setIndexOpen(false);
  }, []);

  return (
    <div
      className="relative min-h-dvh flex flex-col"
      style={{
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)',
      }}
    >
      <a
        href="#read"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:font-mono focus:uppercase"
        style={{
          zIndex: 'var(--z-progress)',
          backgroundColor: 'var(--color-accent)',
          color: 'var(--color-accent-ink)',
          fontSize: 'var(--text-micro)',
        }}
      >
        Skip to the text
      </a>

      <FilmGrain />

      {!hideChrome && !hasGlobalHeader && (
        <Header
          filename={meta.filename}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          indexLabel="field index"
          isIndexOpen={indexOpen}
          onToggleIndex={handleToggleIndex}
          onNavigateRoute={onNavigateRoute}
          onOpenTerminal={onOpenTerminal}
          onOpenMuseum={onOpenMuseum}
          onOpenCommitLog={onOpenCommitLog}
          onOpenToday={onOpenToday}
        />
      )}

      {!hideChrome && !hasGlobalHeader && indexOpen && (
        <Suspense fallback={null}>
          <LazyIndexOverlay
            isOpen={indexOpen}
            onClose={handleCloseIndex}
            origin={indexOrigin}
            sections={sections}
            onSelectSection={onSelectSection}
            readingItems={readingItems}
            onSelectReadingItem={onSelectReadingItem}
            filename={meta.filename}
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
          />
        </Suspense>
      )}

      <main id="manifesto-content" className="flex-1">
        {children}
      </main>

      {!hideChrome && (
        <Footer
          meta={meta}
          stats={stats}
          onOpenPrivacy={onOpenPrivacy}
          onNavigateRoute={onNavigateRoute}
        />
      )}
    </div>
  );
}
