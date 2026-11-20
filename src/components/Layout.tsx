import { useCallback, useState, type ReactNode } from 'react';
import { CustomCursor } from './CustomCursor';
import { FilmGrain } from './FilmGrain';
import { Footer } from './Footer';
import { Header, type ViewMode } from './Header';
import {
  IndexOverlay,
  type OverlayOrigin,
  type OverlaySectionItem,
} from './IndexOverlay';
import { Preloader } from './Preloader';
import { ReadingProgress } from './ReadingProgress';
import type { ManifestoMeta, ManifestoStats } from '../lib/markdown';

interface LayoutProps {
  meta: ManifestoMeta;
  stats: ManifestoStats;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sections: OverlaySectionItem[];
  onSelectSection: (sectionId: string) => void;
  readingItems?: { number: number; title: string }[];
  onSelectReadingItem?: (itemNumber: number) => void;
  onPreloaderComplete?: () => void;
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
  onPreloaderComplete,
  children,
}: LayoutProps) {
  const [indexOpen, setIndexOpen] = useState(false);
  const [indexOrigin, setIndexOrigin] = useState<OverlayOrigin>({
    x: 0,
    y: 0,
  });

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

      <Preloader
        durationMs={900}
        label={`loading ~/${meta.filename}`}
        onComplete={onPreloaderComplete}
      />
      <CustomCursor readSectionSelector="#read" readLabel="read" />
      <FilmGrain />
      <ReadingProgress height={2} color="var(--color-accent)" />

      <Header
        filename={meta.filename}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        indexLabel="field index"
        isIndexOpen={indexOpen}
        onToggleIndex={handleToggleIndex}
      />

      <IndexOverlay
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

      <main id="manifesto-content" className="flex-1">
        {children}
      </main>

      <Footer meta={meta} stats={stats} />
    </div>
  );
}
