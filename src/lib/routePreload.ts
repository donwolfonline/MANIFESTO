import { lazy } from 'react';

export type PreloadableRouteKey =
  | 'home'
  | 'raw'
  | 'terminal'
  | 'bug-museum'
  | 'commit-log'
  | 'delete'
  | 'playground'
  | 'wall'
  | 'admin'
  | 'shelf'
  | 'today'
  | 'focus'
  | 'naming'
  | 'privacy'
  | 'notes'
  | '404'
  | 'command-palette'
  | 'shortcuts'
  | 'konami';

const loaders = {
  home: () => import('../components/HomePage'),
  raw: () => import('../components/RawMarkdownView'),
  terminal: () => import('../components/TerminalPage'),
  'bug-museum': () => import('../components/BugMuseumPage'),
  'commit-log': () => import('../components/CommitLogPage'),
  delete: () => import('../components/DeletePage'),
  playground: () => import('../components/PlaygroundPage'),
  wall: () => import('../components/WallPage'),
  admin: () => import('../components/AdminPage'),
  shelf: () => import('../components/ShelfPage'),
  today: () => import('../components/TodayPage'),
  focus: () => import('../components/FocusPage'),
  naming: () => import('../components/NamingPage'),
  privacy: () => import('../components/PrivacyPage'),
  notes: () => import('../components/EntryDetailPage'),
  '404': () => import('../components/NotFoundPage'),
  'command-palette': () => import('../components/CommandPalette'),
  shortcuts: () => import('../components/ShortcutsModal'),
  konami: () => import('../components/KonamiEasterEgg'),
} as const;

const preloaded = new Set<PreloadableRouteKey>();

/**
 * Prefetches the JS chunk for a route or overlay on link hover/focus.
 * Safe to invoke repeatedly — each route chunk is fetched at most once.
 */
export function preloadRoute(key: PreloadableRouteKey): void {
  if (preloaded.has(key)) return;
  preloaded.add(key);
  loaders[key]().catch(() => {
    preloaded.delete(key);
  });
}

/**
 * Maps section/route aliases (e.g. "museum", "read", "/wall") to preload keys.
 */
export function preloadTarget(target?: string): void {
  if (!target) {
    preloadRoute('home');
    return;
  }
  const clean = target.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (clean in loaders) {
    preloadRoute(clean as PreloadableRouteKey);
  } else if (clean === 'home' || clean === 'read' || clean === 'top' || clean === 'statements' || clean === 'transition' || clean === 'closing') {
    preloadRoute('home');
  }
}

/**
 * Drop-in event handlers for nav links/buttons to preload the destination
 * route chunk on pointer hover, keyboard focus, or touchstart.
 */
export function getPreloadHandlers(key: PreloadableRouteKey) {
  const trigger = () => preloadRoute(key);
  return {
    onPointerEnter: trigger,
    onFocus: trigger,
    onTouchStart: trigger,
  };
}

export const LazyHomePage = lazy(() =>
  loaders.home().then((mod) => ({ default: mod.HomePage })),
);

export const LazyRawMarkdownView = lazy(() =>
  loaders.raw().then((mod) => ({ default: mod.RawMarkdownView })),
);

export const LazyTerminalPage = lazy(() =>
  loaders.terminal().then((mod) => ({ default: mod.TerminalPage })),
);

export const LazyBugMuseumPage = lazy(() =>
  loaders['bug-museum']().then((mod) => ({ default: mod.BugMuseumPage })),
);

export const LazyCommitLogPage = lazy(() =>
  loaders['commit-log']().then((mod) => ({ default: mod.CommitLogPage })),
);

export const LazyDeletePage = lazy(() =>
  loaders.delete().then((mod) => ({ default: mod.DeletePage })),
);

export const LazyPlaygroundPage = lazy(() =>
  loaders.playground().then((mod) => ({ default: mod.PlaygroundPage })),
);

export const LazyWallPage = lazy(() =>
  loaders.wall().then((mod) => ({ default: mod.WallPage })),
);

export const LazyAdminPage = lazy(() =>
  loaders.admin().then((mod) => ({ default: mod.AdminPage })),
);

export const LazyShelfPage = lazy(() =>
  loaders.shelf().then((mod) => ({ default: mod.ShelfPage })),
);

export const LazyTodayPage = lazy(() =>
  loaders.today().then((mod) => ({ default: mod.TodayPage })),
);

export const LazyFocusPage = lazy(() =>
  loaders.focus().then((mod) => ({ default: mod.FocusPage })),
);

export const LazyNamingPage = lazy(() =>
  loaders.naming().then((mod) => ({ default: mod.NamingPage })),
);

export const LazyPrivacyPage = lazy(() =>
  loaders.privacy().then((mod) => ({ default: mod.PrivacyPage })),
);

export const LazyEntryDetailPage = lazy(() =>
  loaders.notes().then((mod) => ({ default: mod.EntryDetailPage })),
);

export const LazyNotFoundPage = lazy(() =>
  loaders['404']().then((mod) => ({ default: mod.NotFoundPage })),
);

export const LazyCommandPalette = lazy(() =>
  loaders['command-palette']().then((mod) => ({ default: mod.CommandPalette })),
);

export const LazyShortcutsModal = lazy(() =>
  loaders.shortcuts().then((mod) => ({ default: mod.ShortcutsModal })),
);

export const LazyKonamiEasterEgg = lazy(() =>
  loaders.konami().then((mod) => ({ default: mod.KonamiEasterEgg })),
);
