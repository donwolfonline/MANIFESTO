import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import manifestoRaw from './content/manifesto.md?raw';
import {
  applyAccentPreset,
  applySecretPhosphorTheme,
  getSavedAccentName,
} from './lib/accentTheme';
import type { ContentCollectionName } from './lib/contentSchema';
import { SmoothScrollProvider, useLenis } from './lib/lenis';
import { parseManifesto } from './lib/markdown';
import {
  applyReadingPrefsToDocument,
  loadReadingPrefs,
  useReadingMode,
} from './lib/readingMode';
import {
  LazyAdminPage,
  LazyBugMuseumPage,
  LazyCommandPalette,
  LazyCommitLogPage,
  LazyDeletePage,
  LazyEntryDetailPage,
  LazyFocusPage,
  LazyHomePage,
  LazyKonamiEasterEgg,
  LazyNamingPage,
  LazyNotFoundPage,
  LazyPlaygroundPage,
  LazyPrivacyPage,
  LazyRawMarkdownView,
  LazyShelfPage,
  LazyShortcutsModal,
  LazyTerminalPage,
  LazyTodayPage,
  LazyWallPage,
  preloadTarget,
} from './lib/routePreload';
import {
  BrowserRouter,
  getSavedScrollPositionForPath,
  useAppRoute,
} from './lib/router';
import { HEADER_SUB_ROUTES } from './lib/routes';
import {
  focusIncomingPageHeading,
  getRouteAnnouncement,
  shouldUseShortRouteFade,
} from './lib/routeTransitions';
import { usePrefersReducedMotion } from './lib/useViewportActivity';
import { loadViewMode, saveViewMode } from './lib/viewMode';
import type { PaletteMode } from './components/CommandPalette';
import type { ViewMode } from './components/Header';
import type {
  OverlayOrigin,
  OverlaySectionItem,
} from './components/IndexOverlay';
import { RouteSkeleton } from './components/RouteSkeletons';
import { RouteErrorBoundary } from './components/RouteStateBox';
import type { RouteTransitionOverlayProps } from './components/RouteTransitionCurtain';

if (typeof window !== 'undefined' && window.location.pathname === '/') {
  preloadTarget('home');
}

const LazyPageShell = lazy(() =>
  import('./components/PageShell').then((mod) => ({
    default: mod.PageShell,
  })),
);

const LazyReadingProgress = lazy(() =>
  import('./components/ReadingProgress').then((mod) => ({
    default: mod.ReadingProgress,
  })),
);

const LazyHeader = lazy(() =>
  import('./components/Header').then((mod) => ({
    default: mod.Header,
  })),
);

const LazyPreloader = lazy(() =>
  import('./components/Preloader').then((mod) => ({
    default: mod.Preloader,
  })),
);

const LazyPwaUpdateToast = lazy(() =>
  import('./components/PwaUpdateToast').then((mod) => ({
    default: mod.PwaUpdateToast,
  })),
);

const LazyCustomCursor = lazy(() =>
  import('./components/CustomCursor').then((mod) => ({
    default: mod.CustomCursor,
  })),
);

const LazyIndexOverlay = lazy(() =>
  import('./components/IndexOverlay').then((mod) => ({
    default: mod.IndexOverlay,
  })),
);

interface ViewTransitionHandle {
  finished: Promise<void>;
  skipTransition: () => void;
}

const KONAMI_SEQUENCE = [
  'arrowup',
  'arrowup',
  'arrowdown',
  'arrowdown',
  'arrowleft',
  'arrowright',
  'arrowleft',
  'arrowright',
  'b',
  'a',
];

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  );
}

function ManifestoApp() {
  const {
    route,
    pathname,
    navigationType,
    transitionCount,
    entryMatch,
    navigate,
  } = useAppRoute();

  const meta = useMemo(() => parseManifesto(manifestoRaw).meta, []);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { prefs: readingPrefs } = useReadingMode();

  const [activeAccentName, setActiveAccentName] = useState<string>(() =>
    getSavedAccentName(),
  );
  const [hasFinePointer, setHasFinePointer] = useState(false);

  // Dynamically load Framer Motion RouteTransitionOverlay on first interaction,
  // route change, or after initial load settles so vendor-motion (42 KB gzip)
  // never competes with Hero LCP or remounts already-mounted route content.
  const [TransitionOverlay, setTransitionOverlay] =
    useState<ComponentType<RouteTransitionOverlayProps> | null>(null);

  useEffect(() => {
    if (TransitionOverlay) return;
    let cancelled = false;
    let timer = 0;

    const loadTransitionOverlay = () => {
      import('./components/RouteTransitionCurtain')
        .then((mod) => {
          if (!cancelled) {
            setTransitionOverlay(() => mod.RouteTransitionOverlay);
          }
        })
        .catch(() => {});
    };

    if (transitionCount > 0) {
      loadTransitionOverlay();
      return () => {
        cancelled = true;
      };
    }

    const scheduleIdleLoad = () => {
      timer = window.setTimeout(loadTransitionOverlay, 2800);
    };

    const onFirstIntent = () => {
      window.removeEventListener('pointerdown', onFirstIntent);
      window.removeEventListener('pointerover', onFirstIntent);
      window.removeEventListener('keydown', onFirstIntent);
      loadTransitionOverlay();
    };
    window.addEventListener('pointerdown', onFirstIntent, {
      once: true,
      passive: true,
    });
    window.addEventListener('pointerover', onFirstIntent, {
      once: true,
      passive: true,
    });
    window.addEventListener('keydown', onFirstIntent, { once: true });

    if (document.readyState === 'complete') {
      scheduleIdleLoad();
    } else {
      window.addEventListener('load', scheduleIdleLoad, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener('pointerdown', onFirstIntent);
      window.removeEventListener('pointerover', onFirstIntent);
      window.removeEventListener('keydown', onFirstIntent);
      window.removeEventListener('load', scheduleIdleLoad);
      if (timer) window.clearTimeout(timer);
    };
  }, [TransitionOverlay, transitionCount]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    setHasFinePointer(
      window.matchMedia('(hover: hover) and (pointer: fine)').matches,
    );
  }, []);

  useEffect(() => {
    applyAccentPreset(activeAccentName);
  }, [activeAccentName]);

  // Apply persisted theme (System / Night / Paper / Sepia), reading mode, and font size on mount
  useEffect(() => {
    const syncTheme = () => {
      applyReadingPrefsToDocument(loadReadingPrefs());
    };
    syncTheme();

    let mq: MediaQueryList | null = null;
    if (typeof window.matchMedia === 'function') {
      try {
        mq = window.matchMedia('(prefers-color-scheme: light)');
        mq.addEventListener('change', syncTheme);
      } catch {
        // Ignore
      }
    }
    return () => {
      mq?.removeEventListener('change', syncTheme);
    };
  }, []);

  // Optional daily browser notification checker
  useEffect(() => {
    if (route === '/today') return;
    let raw: string | null;
    try {
      raw = window.localStorage.getItem('manifesto_daily_reminder_v1');
    } catch {
      return;
    }
    if (!raw || !raw.includes('"enabled":true')) return;

    let timer = 0;
    let cancelled = false;

    Promise.all([
      import('./lib/principleOfTheDay'),
      import('./data/manifestoItems'),
    ])
      .then(([mod, itemsMod]) => {
        if (cancelled) return;
        const tick = () => {
          const prefs = mod.loadDailyReminderPrefs();
          const { due, localDateKey } = mod.isNotificationTriggerDue(prefs);
          if (!due) return;
          const selection = mod.getPrincipleOfTheDay(itemsMod.MANIFESTO_ITEMS);
          if (mod.sendPrincipleNotification(selection)) {
            mod.saveDailyReminderPrefs({
              ...prefs,
              lastNotifiedDate: localDateKey,
            });
          }
        };
        tick();
        timer = window.setInterval(tick, 30_000);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, [route]);

  const handleAccentChange = useCallback((accentName: string) => {
    const result = applyAccentPreset(accentName);
    if (result.ok) {
      setActiveAccentName(accentName.trim().toLowerCase());
    }
    return result;
  }, []);

  const handleRevertKonamiTheme = useCallback(() => {
    applyAccentPreset(activeAccentName);
  }, [activeAccentName]);

  // Persistent Field Index & global overlays
  const [indexOpen, setIndexOpen] = useState(false);
  const [indexOrigin, setIndexOrigin] = useState<OverlayOrigin>({
    x: 0,
    y: 0,
  });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteMode, setPaletteMode] = useState<PaletteMode>('command');
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [konamiUnlocked, setKonamiUnlocked] = useState(false);
  const [konamiBurstId, setKonamiBurstId] = useState(0);
  const konamiBufferRef = useRef<string[]>([]);

  const handleToggleIndex = useCallback((origin: OverlayOrigin) => {
    setIndexOrigin(origin);
    setIndexOpen((prev) => !prev);
  }, []);

  const handleCloseIndex = useCallback(() => {
    setIndexOpen(false);
  }, []);

  useEffect(() => {
    const handleGlobalKeys = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setShortcutsOpen(false);
        setPaletteMode('command');
        setPaletteOpen((prev) => !prev);
        return;
      }

      if (isEditableElement(event.target)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === '/') {
        event.preventDefault();
        setShortcutsOpen(false);
        setPaletteMode('search');
        setPaletteOpen(true);
        return;
      }

      if (event.key === '?') {
        event.preventDefault();
        setPaletteOpen(false);
        setShortcutsOpen((prev) => !prev);
        return;
      }

      const key = event.key.toLowerCase();
      const buf = konamiBufferRef.current;
      buf.push(key);
      if (buf.length > KONAMI_SEQUENCE.length) {
        buf.shift();
      }
      if (
        buf.length === KONAMI_SEQUENCE.length &&
        buf.every((k, idx) => k === KONAMI_SEQUENCE[idx])
      ) {
        konamiBufferRef.current = [];
        applySecretPhosphorTheme();
        setKonamiUnlocked(true);
        setKonamiBurstId((n) => n + 1);
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
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
      ...HEADER_SUB_ROUTES.map((r, idx) => ({
        id: r.id,
        index: String(idx + 5).padStart(2, '0'),
        label: r.label,
        meta: r.description,
      })),
    ],
    [meta.title],
  );

  const [viewMode, setViewMode] = useState<ViewMode>(() => loadViewMode());
  const [skipPreloader, setSkipPreloader] = useState<boolean>(false);
  const [preloaderDone, setPreloaderDone] = useState<boolean>(false);
  const [routeAnnouncement, setRouteAnnouncement] = useState<string>('');
  const pendingScrollTargetRef = useRef<string | null>(null);
  const activeViewTransitionRef = useRef<ViewTransitionHandle | null>(null);
  const { scrollTo, resize } = useLenis();

  // Scroll restoration: Back/Forward (POP) restores position, new pages (PUSH) start at top, Lenis resets properly
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      resize();

      if (navigationType === 'POP' && !pendingScrollTargetRef.current) {
        const savedY = getSavedScrollPositionForPath(pathname);
        window.scrollTo(0, savedY);
        scrollTo(savedY, { offset: 0, immediate: true });
        return;
      }

      if (route !== '/') {
        window.scrollTo(0, 0);
        scrollTo(0, { offset: 0, immediate: true });
        return;
      }

      const pendingTarget = pendingScrollTargetRef.current;
      if (pendingTarget) {
        pendingScrollTargetRef.current = null;
        if (pendingTarget === '#top') {
          scrollTo(0, { offset: 0 });
        } else {
          scrollTo(pendingTarget, {
            offset:
              pendingTarget === '#statements' || pendingTarget === '#transition'
                ? 0
                : -104,
          });
        }
      } else if (!window.location.hash) {
        window.scrollTo(0, 0);
        scrollTo(0, { offset: 0, immediate: true });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [route, pathname, navigationType, viewMode, scrollTo, resize]);

  // Announce new page title via aria-live region & move focus to incoming page's h1
  const handleTransitionSettled = useCallback(
    (settledPath: string) => {
      const { documentTitle, announcement } = getRouteAnnouncement(
        settledPath,
        meta.title,
      );
      if (typeof document !== 'undefined') {
        document.title = documentTitle;
      }
      setRouteAnnouncement(announcement);
      window.requestAnimationFrame(() => {
        focusIncomingPageHeading();
      });
    },
    [meta.title],
  );

  // Also update document.title & aria-live announcement when TransitionStage hasn't loaded yet or on POP
  useEffect(() => {
    if (transitionCount === 0) return;
    const { documentTitle, announcement } = getRouteAnnouncement(
      pathname,
      meta.title,
    );
    if (typeof document !== 'undefined') {
      document.title = documentTitle;
    }
    setRouteAnnouncement(announcement);
  }, [pathname, transitionCount, meta.title]);

  // Navigate with safe interruption + View Transitions API where supported
  const performRouteNavigation = useCallback(
    (targetPath: string) => {
      // Interrupt any in-flight View Transition safely if the user clicks again mid-transition
      if (activeViewTransitionRef.current) {
        try {
          activeViewTransitionRef.current.skipTransition();
        } catch {
          // Ignore
        }
        activeViewTransitionRef.current = null;
      }

      const doc = typeof document !== 'undefined' ? document : null;
      const useShort = shouldUseShortRouteFade(prefersReducedMotion);

      if (doc && typeof doc.startViewTransition === 'function' && !useShort) {
        try {
          const vt = doc.startViewTransition(() => {
            navigate(targetPath);
          }) as unknown as ViewTransitionHandle;
          activeViewTransitionRef.current = vt;
          vt.finished
            .finally(() => {
              if (activeViewTransitionRef.current === vt) {
                activeViewTransitionRef.current = null;
              }
            })
            .catch(() => {});
          return;
        } catch {
          // Fall back to direct navigate + Framer curtain
        }
      }

      navigate(targetPath);
    },
    [navigate, prefersReducedMotion],
  );

  const openRoute = useCallback(
    (
      target:
        | '/'
        | '/terminal'
        | '/bug-museum'
        | '/commit-log'
        | '/delete'
        | '/playground'
        | '/wall'
        | '/admin'
        | '/shelf'
        | '/today'
        | '/focus'
        | '/naming'
        | '/privacy',
    ) => {
      performRouteNavigation(target);
    },
    [performRouteNavigation],
  );

  const openTerminal = useCallback(() => openRoute('/terminal'), [openRoute]);
  const openMuseum = useCallback(() => openRoute('/bug-museum'), [openRoute]);
  const openCommitLog = useCallback(() => openRoute('/commit-log'), [openRoute]);
  const openDelete = useCallback(() => openRoute('/delete'), [openRoute]);
  const openPlayground = useCallback(() => openRoute('/playground'), [openRoute]);
  const openWall = useCallback(() => openRoute('/wall'), [openRoute]);
  const openAdmin = useCallback(() => openRoute('/admin'), [openRoute]);
  const openShelf = useCallback(() => openRoute('/shelf'), [openRoute]);
  const openToday = useCallback(() => openRoute('/today'), [openRoute]);
  const openFocus = useCallback(() => openRoute('/focus'), [openRoute]);
  const openNaming = useCallback(() => openRoute('/naming'), [openRoute]);
  const openPrivacy = useCallback(() => openRoute('/privacy'), [openRoute]);

  const openEntry = useCallback(
    (collection: ContentCollectionName, slug: string) => {
      setSkipPreloader(true);
      setPreloaderDone(true);
      performRouteNavigation(`/notes/${collection}/${slug}`);
    },
    [performRouteNavigation],
  );

  const navigateToTarget = useCallback(
    (target: string) => {
      if (target === '#terminal') return openTerminal();
      if (target === '#bug-museum') return openMuseum();
      if (target === '#commit-log') return openCommitLog();
      if (target === '#delete') return openDelete();
      if (target === '#playground') return openPlayground();
      if (target === '#wall') return openWall();
      if (target === '#admin') return openAdmin();
      if (target === '#shelf') return openShelf();
      if (target === '#today') return openToday();
      if (target === '#focus') return openFocus();
      if (target === '#naming') return openNaming();
      if (target === '#privacy') return openPrivacy();

      if (route !== '/' || viewMode !== 'editorial') {
        pendingScrollTargetRef.current = target;
        setSkipPreloader(true);
        setPreloaderDone(true);
        setViewMode('editorial');
        if (route !== '/') performRouteNavigation('/');
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
    [
      route,
      viewMode,
      scrollTo,
      performRouteNavigation,
      openTerminal,
      openMuseum,
      openCommitLog,
      openDelete,
      openPlayground,
      openWall,
      openAdmin,
      openShelf,
      openToday,
      openFocus,
      openNaming,
      openPrivacy,
    ],
  );

  const handleSelectSection = useCallback(
    (sectionId: string) => navigateToTarget(`#${sectionId}`),
    [navigateToTarget],
  );

  const handleSelectReadingItem = useCallback(
    (itemNumber: number) => navigateToTarget(`#item-${itemNumber}`),
    [navigateToTarget],
  );

  const handleNavigateFromSubRoute = useCallback(
    (target?: string) => {
      if (target === 'terminal') return performRouteNavigation('/terminal');
      if (target === 'bug-museum') return performRouteNavigation('/bug-museum');
      if (target === 'commit-log') return performRouteNavigation('/commit-log');
      if (target === 'delete') return performRouteNavigation('/delete');
      if (target === 'playground') return performRouteNavigation('/playground');
      if (target === 'wall') return performRouteNavigation('/wall');
      if (target === 'admin') return performRouteNavigation('/admin');
      if (target === 'shelf') return performRouteNavigation('/shelf');
      if (target === 'today') return performRouteNavigation('/today');
      if (target === 'focus') return performRouteNavigation('/focus');
      if (target === 'naming') return performRouteNavigation('/naming');
      if (target === 'privacy') return performRouteNavigation('/privacy');
      if (target === 'raw') {
        pendingScrollTargetRef.current = null;
        setViewMode('raw');
        if (route !== '/') performRouteNavigation('/');
        return;
      }

      const hashTarget = !target || target === 'home' ? '#top' : `#${target}`;
      if (route === '/' && viewMode === 'editorial') {
        if (hashTarget === '#top') {
          scrollTo(0, { offset: 0 });
        } else {
          scrollTo(hashTarget, {
            offset:
              hashTarget === '#statements' || hashTarget === '#transition'
                ? 0
                : -104,
          });
        }
        return;
      }

      pendingScrollTargetRef.current = hashTarget;
      setViewMode('editorial');
      performRouteNavigation('/');
    },
    [performRouteNavigation, route, viewMode, scrollTo],
  );

  const handleViewModeChange = useCallback((nextMode: ViewMode) => {
    setViewMode(nextMode);
    saveViewMode(nextMode);
  }, []);

  const handleOpenRawMarkdown = useCallback(() => {
    setSkipPreloader(true);
    setPreloaderDone(true);
    pendingScrollTargetRef.current = null;
    setViewMode('raw');
    saveViewMode('raw');
  }, []);

  const handlePreloaderComplete = useCallback(() => {
    setPreloaderDone(true);
  }, []);

  let pageContent: ReactNode;

  if (route !== '/' && viewMode === 'raw') {
    pageContent = (
      <div className="subpage-shell">
        <RouteErrorBoundary
          routePath={pathname}
          onGoHome={() => handleNavigateFromSubRoute('home')}
        >
          <Suspense fallback={<RouteSkeleton routeKey="raw" />}>
            <LazyRawMarkdownView meta={meta} routePath={pathname} />
          </Suspense>
        </RouteErrorBoundary>
      </div>
    );
  } else if (route === '/terminal') {
    pageContent = (
      <div className="subpage-shell">
        <RouteErrorBoundary
          routePath="/terminal"
          onGoHome={() => handleNavigateFromSubRoute('home')}
        >
          <Suspense fallback={<RouteSkeleton routeKey="terminal" />}>
            <LazyTerminalPage
              meta={meta}
              activeAccentName={activeAccentName}
              onAccentChange={handleAccentChange}
              onNavigateFromTerminal={handleNavigateFromSubRoute}
            />
          </Suspense>
        </RouteErrorBoundary>
      </div>
    );
  } else if (route === '/bug-museum') {
    pageContent = (
      <div className="subpage-shell">
        <RouteErrorBoundary
          routePath="/bug-museum"
          onGoHome={() => handleNavigateFromSubRoute('home')}
        >
          <Suspense fallback={<RouteSkeleton routeKey="bug-museum" />}>
            <LazyBugMuseumPage
              meta={meta}
              onNavigateHome={handleNavigateFromSubRoute}
              onOpenTerminal={openTerminal}
              onOpenNote={(slug) => openEntry('bug-stories', slug)}
            />
          </Suspense>
        </RouteErrorBoundary>
      </div>
    );
  } else if (route === '/commit-log') {
    pageContent = (
      <div className="subpage-shell">
        <RouteErrorBoundary
          routePath="/commit-log"
          onGoHome={() => handleNavigateFromSubRoute('home')}
        >
          <Suspense fallback={<RouteSkeleton routeKey="commit-log" />}>
            <LazyCommitLogPage
              meta={meta}
              onNavigateHome={handleNavigateFromSubRoute}
              onOpenTerminal={openTerminal}
              onOpenMuseum={openMuseum}
            />
          </Suspense>
        </RouteErrorBoundary>
      </div>
    );
  } else if (route === '/delete') {
    pageContent = (
      <div className="subpage-shell">
        <RouteErrorBoundary
          routePath="/delete"
          onGoHome={() => handleNavigateFromSubRoute('home')}
        >
          <Suspense fallback={<RouteSkeleton routeKey="delete" />}>
            <LazyDeletePage
              meta={meta}
              onNavigateHome={handleNavigateFromSubRoute}
              onOpenTerminal={openTerminal}
              onOpenCommitLog={openCommitLog}
            />
          </Suspense>
        </RouteErrorBoundary>
      </div>
    );
  } else if (route === '/playground') {
    pageContent = (
      <div className="subpage-shell">
        <RouteErrorBoundary
          routePath="/playground"
          onGoHome={() => handleNavigateFromSubRoute('home')}
        >
          <Suspense fallback={<RouteSkeleton routeKey="playground" />}>
            <LazyPlaygroundPage
              meta={meta}
              onNavigateHome={handleNavigateFromSubRoute}
              onOpenTerminal={openTerminal}
              onOpenDelete={openDelete}
            />
          </Suspense>
        </RouteErrorBoundary>
      </div>
    );
  } else if (route === '/wall') {
    pageContent = (
      <div className="subpage-shell">
        <RouteErrorBoundary
          routePath="/wall"
          onGoHome={() => handleNavigateFromSubRoute('home')}
        >
          <Suspense fallback={<RouteSkeleton routeKey="wall" />}>
            <LazyWallPage
              meta={meta}
              onNavigateHome={handleNavigateFromSubRoute}
              onOpenTerminal={openTerminal}
              onOpenAdmin={openAdmin}
              onOpenPrivacy={openPrivacy}
            />
          </Suspense>
        </RouteErrorBoundary>
      </div>
    );
  } else if (route === '/admin') {
    pageContent = (
      <div className="subpage-shell">
        <RouteErrorBoundary
          routePath="/admin"
          onGoHome={() => handleNavigateFromSubRoute('home')}
        >
          <Suspense fallback={<RouteSkeleton routeKey="admin" />}>
            <LazyAdminPage
              meta={meta}
              onNavigateHome={handleNavigateFromSubRoute}
              onOpenWall={openWall}
            />
          </Suspense>
        </RouteErrorBoundary>
      </div>
    );
  } else if (route === '/shelf') {
    pageContent = (
      <div className="subpage-shell">
        <RouteErrorBoundary
          routePath="/shelf"
          onGoHome={() => handleNavigateFromSubRoute('home')}
        >
          <Suspense fallback={<RouteSkeleton routeKey="shelf" />}>
            <LazyShelfPage
              meta={meta}
              onNavigateHome={handleNavigateFromSubRoute}
              onOpenTerminal={openTerminal}
              onOpenWall={openWall}
            />
          </Suspense>
        </RouteErrorBoundary>
      </div>
    );
  } else if (route === '/today') {
    pageContent = (
      <div className="subpage-shell">
        <RouteErrorBoundary
          routePath="/today"
          onGoHome={() => handleNavigateFromSubRoute('home')}
        >
          <Suspense fallback={<RouteSkeleton routeKey="today" />}>
            <LazyTodayPage
              meta={meta}
              onNavigateHome={handleNavigateFromSubRoute}
              onOpenTerminal={openTerminal}
              onOpenNote={(slug) => openEntry('principles', slug)}
            />
          </Suspense>
        </RouteErrorBoundary>
      </div>
    );
  } else if (route === '/focus') {
    pageContent = (
      <div className="subpage-shell">
        <RouteErrorBoundary
          routePath="/focus"
          onGoHome={() => handleNavigateFromSubRoute('home')}
        >
          <Suspense fallback={<RouteSkeleton routeKey="focus" />}>
            <LazyFocusPage
              meta={meta}
              onNavigateHome={handleNavigateFromSubRoute}
              onOpenTerminal={openTerminal}
              onOpenToday={openToday}
            />
          </Suspense>
        </RouteErrorBoundary>
      </div>
    );
  } else if (route === '/naming') {
    pageContent = (
      <div className="subpage-shell">
        <RouteErrorBoundary
          routePath="/naming"
          onGoHome={() => handleNavigateFromSubRoute('home')}
        >
          <Suspense fallback={<RouteSkeleton routeKey="naming" />}>
            <LazyNamingPage
              meta={meta}
              onNavigateHome={handleNavigateFromSubRoute}
              onOpenTerminal={openTerminal}
              onOpenDelete={openDelete}
            />
          </Suspense>
        </RouteErrorBoundary>
      </div>
    );
  } else if (route === '/privacy') {
    pageContent = (
      <div className="subpage-shell">
        <RouteErrorBoundary
          routePath="/privacy"
          onGoHome={() => handleNavigateFromSubRoute('home')}
        >
          <Suspense fallback={<RouteSkeleton routeKey="privacy" />}>
            <LazyPrivacyPage
              meta={meta}
              onNavigateHome={handleNavigateFromSubRoute}
              onOpenWall={openWall}
            />
          </Suspense>
        </RouteErrorBoundary>
      </div>
    );
  } else if (route === '/notes' && entryMatch) {
    pageContent = (
      <div className="subpage-shell">
        <RouteErrorBoundary
          routePath={pathname}
          onGoHome={() => handleNavigateFromSubRoute('home')}
        >
          <Suspense fallback={<RouteSkeleton routeKey="notes" />}>
            <LazyEntryDetailPage
              meta={meta}
              collection={entryMatch.collection}
              slug={entryMatch.slug}
              onNavigateHome={handleNavigateFromSubRoute}
              onOpenEntry={openEntry}
            />
          </Suspense>
        </RouteErrorBoundary>
      </div>
    );
  } else if (route === '/404') {
    pageContent = (
      <div className="subpage-shell">
        <RouteErrorBoundary
          routePath={pathname}
          onGoHome={() => handleNavigateFromSubRoute('home')}
        >
          <Suspense fallback={<RouteSkeleton routeKey="404" />}>
            <LazyNotFoundPage
              meta={meta}
              missingPath={pathname}
              onGoHome={() => handleNavigateFromSubRoute('home')}
              onOpenTerminal={openTerminal}
              onOpenWall={openWall}
            />
          </Suspense>
        </RouteErrorBoundary>
      </div>
    );
  } else {
    pageContent = (
      <RouteErrorBoundary
        routePath="/"
        onGoHome={() => handleNavigateFromSubRoute('home')}
      >
        <Suspense fallback={<RouteSkeleton routeKey="home" />}>
          <LazyHomePage
            meta={meta}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            sections={overlaySections}
            onSelectSection={handleSelectSection}
            onSelectReadingItem={handleSelectReadingItem}
            onOpenNote={(slug) => openEntry('principles', slug)}
            onOpenTerminal={openTerminal}
            onOpenMuseum={openMuseum}
            onOpenCommitLog={openCommitLog}
            onOpenToday={openToday}
            onOpenPrivacy={openPrivacy}
            onNavigateRoute={handleNavigateFromSubRoute}
            skipPreloader={skipPreloader}
            onPreloaderComplete={handlePreloaderComplete}
            preloaderDone={preloaderDone}
            hasGlobalHeader={true}
          />
        </Suspense>
      </RouteErrorBoundary>
    );
  }

  const hideGlobalChrome =
    readingPrefs.enabled &&
    ((route === '/' && viewMode === 'editorial') || route === '/notes');

  const isHomeRoute = route === '/';
  const wrappedPageContent = isHomeRoute ? (
    pageContent
  ) : (
    <Suspense fallback={<RouteSkeleton routeKey="home" />}>
      <LazyPageShell
        pathname={pathname}
        meta={meta}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        isIndexOpen={indexOpen}
        onToggleIndex={handleToggleIndex}
        onNavigate={handleNavigateFromSubRoute}
        hideChrome={hideGlobalChrome}
      >
        {pageContent}
      </LazyPageShell>
    </Suspense>
  );

  // Sync Home route <head> SEO & OG metadata when returning to '/'
  useEffect(() => {
    if (route !== '/') return;
    if (typeof document === 'undefined' || !document.head) return;
    const homeTitle = `${meta.title} — A Field Manual for Working Engineers`;
    const homeDesc =
      'A quiet field manual for working software engineers—honest about tight deadlines, shifting stacks, and self-doubt, and stubbornly devoted to making software that holds up.';
    document.title = homeTitle;
    const setMeta = (sel: string, content: string) => {
      const el = document.head.querySelector<HTMLMetaElement>(sel);
      if (el) el.setAttribute('content', content);
    };
    setMeta('meta[name="description"]', homeDesc);
    setMeta('meta[property="og:title"]', homeTitle);
    setMeta('meta[property="og:description"]', homeDesc);
    setMeta('meta[property="og:url"]', 'https://manifestomd.vercel.app/');
    setMeta('meta[name="twitter:title"]', homeTitle);
    setMeta('meta[name="twitter:description"]', homeDesc);
  }, [route, meta.title]);

  return (
    <div className={hideGlobalChrome ? '' : isHomeRoute ? 'has-global-header' : ''}>
      {/* Screen-reader live region announcing new page title after each transition */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="route-announcer"
        className="sr-only"
      >
        {routeAnnouncement}
      </div>

      {hasFinePointer && (
        <Suspense fallback={null}>
          <LazyCustomCursor readSectionSelector="#read" readLabel="read" />
        </Suspense>
      )}

      {/* Initial boot counter preloader (000% -> 100%) on first load */}
      <Suspense fallback={null}>
        <LazyPreloader
          minDurationMs={900}
          maxDurationMs={3000}
          label={`loading ~${pathname === '/' ? `/${meta.filename}` : pathname}`}
          onComplete={handlePreloaderComplete}
        />
      </Suspense>

      {isHomeRoute && (
        <Suspense fallback={null}>
          <LazyReadingProgress
            height={2}
            color="var(--color-accent)"
            smooth={false}
          />
        </Suspense>
      )}

      {/* Persistent Home Header: on sub-routes, <PageShell> provides the compact sticky breadcrumb header */}
      {!hideGlobalChrome && isHomeRoute && (
        <Suspense fallback={null}>
          <LazyHeader
            filename={meta.filename}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            indexLabel="field index"
            isIndexOpen={indexOpen}
            onToggleIndex={handleToggleIndex}
            activeRouteId={pathname}
            onNavigateRoute={handleNavigateFromSubRoute}
            onOpenTerminal={openTerminal}
            onOpenMuseum={openMuseum}
            onOpenCommitLog={openCommitLog}
            onOpenToday={openToday}
          />
        </Suspense>
      )}

      {!hideGlobalChrome && indexOpen && (
        <Suspense fallback={null}>
          <LazyIndexOverlay
            isOpen={indexOpen}
            onClose={handleCloseIndex}
            origin={indexOrigin}
            sections={overlaySections}
            onSelectSection={handleSelectSection}
            onSelectReadingItem={handleSelectReadingItem}
            filename={meta.filename}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            onOpenSearch={() => {
              setPaletteMode('search');
              setPaletteOpen(true);
            }}
          />
        </Suspense>
      )}

      {/* Persistent route wrapper keeps page DOM mounted cleanly while lazy curtain overlay draws above */}
      <div className="relative">
        {TransitionOverlay && (
          <TransitionOverlay
            pathname={pathname}
            transitionCount={transitionCount}
            onTransitionSettled={handleTransitionSettled}
          />
        )}
        <div
          key={pathname}
          data-testid="route-transition-page"
          data-route-path={pathname}
          className={
            transitionCount > 0 && !prefersReducedMotion
              ? 'route-stagger-enter'
              : undefined
          }
        >
          {wrappedPageContent}
        </div>
      </div>

      <Suspense fallback={null}>
        <LazyPwaUpdateToast />
      </Suspense>

      {paletteOpen && (
        <Suspense fallback={null}>
          <LazyCommandPalette
            isOpen={paletteOpen}
            mode={paletteMode}
            onClose={() => setPaletteOpen(false)}
            onNavigateTarget={handleNavigateFromSubRoute}
            onOpenRawMarkdown={handleOpenRawMarkdown}
            onOpenShortcuts={() => setShortcutsOpen(true)}
          />
        </Suspense>
      )}

      {shortcutsOpen && (
        <Suspense fallback={null}>
          <LazyShortcutsModal
            isOpen={shortcutsOpen}
            onClose={() => setShortcutsOpen(false)}
          />
        </Suspense>
      )}

      {konamiBurstId > 0 && (
        <Suspense fallback={null}>
          <LazyKonamiEasterEgg
            burstId={konamiBurstId}
            unlocked={konamiUnlocked}
            onDismiss={() => setKonamiUnlocked(false)}
            onRevertTheme={handleRevertKonamiTheme}
          />
        </Suspense>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SmoothScrollProvider>
        <ManifestoApp />
      </SmoothScrollProvider>
    </BrowserRouter>
  );
}
