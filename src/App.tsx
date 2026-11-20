import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MotionConfig } from 'framer-motion';
import manifestoRaw from './content/manifesto.md?raw';
import {
  MANIFESTO_ITEMS,
  serializeManifestoToMarkdown,
} from './data/manifestoItems';
import { parseManifesto } from './lib/markdown';
import { SmoothScrollProvider, useLenis } from './lib/lenis';
import { Layout } from './components/Layout';
import { Hero } from './components/Hero';
import { StatementSequence } from './components/StatementSequence';
import { FullBleedTransition } from './components/FullBleedTransition';
import { ReadingSection } from './components/ReadingSection';
import { ClosingSection } from './components/ClosingSection';
import type { ViewMode } from './components/Header';
import type { OverlaySectionItem } from './components/IndexOverlay';

const RawMarkdownView = lazy(() =>
  import('./components/RawMarkdownView').then((mod) => ({
    default: mod.RawMarkdownView,
  })),
);

function ManifestoPage() {
  const { meta, raw, stats } = useMemo(() => {
    const parsedMeta = parseManifesto(manifestoRaw).meta;
    const serialized = serializeManifestoToMarkdown(
      parsedMeta,
      MANIFESTO_ITEMS,
    );
    const parsedFull = parseManifesto(serialized);
    return {
      meta: parsedMeta,
      raw: parsedFull.raw,
      stats: parsedFull.stats,
    };
  }, []);

  const overlaySections = useMemo<OverlaySectionItem[]>(
    () => [
      { id: 'top', index: '00', label: meta.title, meta: 'Prologue' },
      {
        id: 'statements',
        index: '01',
        label: 'Six Statements',
        meta: '240dvh Scroll',
      },
      {
        id: 'transition',
        index: '02',
        label: 'the actual (human) job',
        meta: 'Interlude',
      },
      {
        id: 'read',
        index: '03',
        label: 'Ten Working Notes',
        meta: '#read',
      },
      {
        id: 'closing',
        index: '04',
        label: 'Stop / Do More & Sign-Off',
        meta: 'Colophon',
      },
    ],
    [meta.title],
  );

  const [viewMode, setViewMode] = useState<ViewMode>('editorial');
  const [preloaderDone, setPreloaderDone] = useState(false);
  const pendingScrollTargetRef = useRef<string | null>(null);
  const { scrollTo, resize } = useLenis();

  // Recalculate Lenis scroll dimensions when toggling between Editorial and Raw .md
  useEffect(() => {
    const pendingTarget = pendingScrollTargetRef.current;
    const frame = window.requestAnimationFrame(() => {
      resize();
      if (pendingTarget) {
        pendingScrollTargetRef.current = null;
        if (pendingTarget === '#top') {
          scrollTo(0, { offset: 0 });
        } else {
          scrollTo(pendingTarget, {
            offset: pendingTarget === '#statements' || pendingTarget === '#transition' ? 0 : -104,
          });
        }
      } else {
        scrollTo(0, { offset: 0, immediate: true });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [viewMode, scrollTo, resize]);

  const navigateToTarget = useCallback(
    (target: string) => {
      if (viewMode !== 'editorial') {
        pendingScrollTargetRef.current = target;
        setViewMode('editorial');
        return;
      }

      if (target === '#top') {
        scrollTo(0, { offset: 0 });
        return;
      }

      const offset =
        target === '#statements' || target === '#transition' ? 0 : -104;
      scrollTo(target, { offset });
    },
    [viewMode, scrollTo],
  );

  const handleSelectSection = useCallback(
    (sectionId: string) => {
      navigateToTarget(`#${sectionId}`);
    },
    [navigateToTarget],
  );

  const handleSelectReadingItem = useCallback(
    (itemNumber: number) => {
      navigateToTarget(`#item-${itemNumber}`);
    },
    [navigateToTarget],
  );

  const handlePreloaderComplete = useCallback(() => {
    setPreloaderDone(true);
  }, []);

  return (
    <Layout
      meta={meta}
      stats={stats}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      sections={overlaySections}
      onSelectSection={handleSelectSection}
      readingItems={MANIFESTO_ITEMS}
      onSelectReadingItem={handleSelectReadingItem}
      onPreloaderComplete={handlePreloaderComplete}
    >
      {viewMode === 'editorial' ? (
        <>
          <Hero meta={meta} ready={preloaderDone} />
          <StatementSequence />
          <FullBleedTransition />
          <ReadingSection items={MANIFESTO_ITEMS} />
          <ClosingSection />
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
          <RawMarkdownView raw={raw} meta={meta} stats={stats} />
        </Suspense>
      )}
    </Layout>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <SmoothScrollProvider>
        <ManifestoPage />
      </SmoothScrollProvider>
    </MotionConfig>
  );
}
