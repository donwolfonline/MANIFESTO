import { lazy, Suspense, useMemo } from 'react';
import {
  MANIFESTO_ITEMS,
  serializeManifestoToMarkdown,
  type ManifestoItem,
} from '../data/manifestoItems';
import {
  parseManifesto,
  type ManifestoMeta,
  type ManifestoStats,
} from '../lib/markdown';
import { useReadingMode } from '../lib/readingMode';
import { LazyRawMarkdownView } from '../lib/routePreload';
import type { ViewMode } from './Header';
import { Hero } from './Hero';
import type { OverlaySectionItem } from './IndexOverlay';
import { Layout } from './Layout';
import { ReadingModeBar } from './ReadingModeBar';
import { ReadingSection } from './ReadingSection';

const LazyPrincipleOfTheDayCard = lazy(() =>
  import('./PrincipleOfTheDayCard').then((mod) => ({
    default: mod.PrincipleOfTheDayCard,
  })),
);
const LazyStatementSequence = lazy(() =>
  import('./StatementSequence').then((mod) => ({
    default: mod.StatementSequence,
  })),
);
const LazyFullBleedTransition = lazy(() =>
  import('./FullBleedTransition').then((mod) => ({
    default: mod.FullBleedTransition,
  })),
);
const LazyClosingSection = lazy(() =>
  import('./ClosingSection').then((mod) => ({ default: mod.ClosingSection })),
);

export interface HomePageProps {
  meta: ManifestoMeta;
  raw?: string;
  stats?: ManifestoStats;
  items?: ManifestoItem[];
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sections: OverlaySectionItem[];
  onSelectSection: (sectionId: string) => void;
  onSelectReadingItem: (itemNumber: number) => void;
  onOpenNote: (slug: string) => void;
  onOpenTerminal: () => void;
  onOpenMuseum: () => void;
  onOpenCommitLog: () => void;
  onOpenToday?: () => void;
  onOpenPrivacy?: () => void;
  onNavigateRoute?: (target: string) => void;
  skipPreloader: boolean;
  onPreloaderComplete: () => void;
  preloaderDone: boolean;
  hasGlobalHeader?: boolean;
}

export function HomePage({
  meta,
  raw: rawProp,
  stats: statsProp,
  items = MANIFESTO_ITEMS,
  viewMode,
  onViewModeChange,
  sections,
  onSelectSection,
  onSelectReadingItem,
  onOpenNote,
  onOpenTerminal,
  onOpenMuseum,
  onOpenCommitLog,
  onOpenToday,
  onOpenPrivacy,
  onNavigateRoute,
  skipPreloader,
  onPreloaderComplete,
  preloaderDone,
  hasGlobalHeader = false,
}: HomePageProps) {
  const { raw, stats } = useMemo(() => {
    if (rawProp && statsProp) {
      return { raw: rawProp, stats: statsProp };
    }
    const serialized = serializeManifestoToMarkdown(meta, items);
    const parsed = parseManifesto(serialized);
    return {
      raw: rawProp,
      stats: statsProp ?? parsed.stats,
    };
  }, [rawProp, statsProp, meta, items]);

  const { prefs: readingPrefs, resolvedTheme } = useReadingMode();
  const isReadingMode = readingPrefs.enabled && viewMode === 'editorial';

  return (
    <Layout
      key={resolvedTheme}
      meta={meta}
      stats={stats}
      viewMode={viewMode}
      onViewModeChange={onViewModeChange}
      sections={sections}
      onSelectSection={onSelectSection}
      readingItems={items}
      onSelectReadingItem={onSelectReadingItem}
      onOpenTerminal={onOpenTerminal}
      onOpenMuseum={onOpenMuseum}
      onOpenCommitLog={onOpenCommitLog}
      onOpenToday={onOpenToday}
      onOpenPrivacy={onOpenPrivacy}
      onNavigateRoute={onNavigateRoute}
      skipPreloader={skipPreloader}
      onPreloaderComplete={onPreloaderComplete}
      hideChrome={isReadingMode}
      hasGlobalHeader={hasGlobalHeader}
    >
      {viewMode === 'editorial' ? (
        <>
          {!isReadingMode && <Hero meta={meta} ready={preloaderDone} />}
          <div className={isReadingMode ? 'pt-6' : ''}>
            <ReadingModeBar
              totalWords={stats.wordCount}
              contextLabel="Manifesto reading mode and theme controls"
            />
          </div>
          {!isReadingMode && (
            <Suspense fallback={null}>
              <LazyPrincipleOfTheDayCard
                items={items}
                onOpenToday={onOpenToday}
                onSelectReadingItem={onSelectReadingItem}
              />
              <LazyStatementSequence />
              <LazyFullBleedTransition />
            </Suspense>
          )}
          <ReadingSection
            items={items}
            onOpenNote={onOpenNote}
            readingMode={isReadingMode}
          />
          {!isReadingMode && (
            <Suspense fallback={null}>
              <LazyClosingSection />
            </Suspense>
          )}
        </>
      ) : (
        <Suspense
          fallback={
            <div
              className="editorial-shell pt-36 pb-20 font-mono uppercase tracking-[var(--tracking-micro)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-muted)',
              }}
            >
              Loading raw markdown…
            </div>
          }
        >
          <LazyRawMarkdownView
            raw={raw}
            meta={meta}
            stats={stats}
            routePath="/"
          />
        </Suspense>
      )}
    </Layout>
  );
}
