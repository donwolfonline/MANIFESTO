import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { ContentCollectionName } from './contentSchema';

export type AppRoute =
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
  | '/privacy'
  | '/notes'
  | '/404';

export type NavigationType = 'PUSH' | 'POP' | 'REPLACE';

export interface EntryRouteMatch {
  collection: ContentCollectionName;
  slug: string;
}

const KNOWN_STATIC_ROUTES = new Set<AppRoute>([
  '/',
  '/terminal',
  '/bug-museum',
  '/commit-log',
  '/delete',
  '/playground',
  '/wall',
  '/admin',
  '/shelf',
  '/today',
  '/focus',
  '/naming',
  '/privacy',
]);

const VALID_COLLECTIONS = new Set<ContentCollectionName>([
  'principles',
  'bug-stories',
  'shelf-items',
  'commits',
]);

export function parseEntryPath(pathname: string): EntryRouteMatch | null {
  const clean = pathname.replace(/\/+$/, '');
  const match = clean.match(/^\/notes\/([a-z-]+)\/([a-z0-9-]+)$/);
  if (!match) return null;
  const collection = match[1] as ContentCollectionName;
  if (!VALID_COLLECTIONS.has(collection)) return null;
  return { collection, slug: match[2] };
}

export function normalizePath(pathname: string): AppRoute {
  const clean = (pathname.replace(/\/+$/, '') || '/') as AppRoute;
  if (KNOWN_STATIC_ROUTES.has(clean)) return clean;
  if (parseEntryPath(clean)) return '/notes';
  return '/404';
}

/**
 * In-memory scroll restoration table keyed by pathname + history key.
 * Saves scrollY before PUSH navigations and restores saved scrollY on POP (Back/Forward).
 */
const savedScrollPositions = new Map<string, number>();

export function saveScrollPositionForPath(
  pathname: string,
  scrollY?: number,
): void {
  if (typeof window === 'undefined') return;
  const y = typeof scrollY === 'number' ? scrollY : window.scrollY || 0;
  savedScrollPositions.set(pathname || '/', Math.max(0, Math.round(y)));
}

export function getSavedScrollPositionForPath(pathname: string): number {
  return savedScrollPositions.get(pathname || '/') ?? 0;
}

export interface RouterContextValue {
  route: AppRoute;
  pathname: string;
  navigationType: NavigationType;
  transitionCount: number;
  entryMatch: EntryRouteMatch | null;
  navigate: (to: string, options?: { replace?: boolean }) => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

/**
 * React Router-compatible BrowserRouter provider with scroll-position recording,
 * POP/PUSH navigationType tracking, and automatic manual scrollRestoration control.
 */
export function BrowserRouter({ children }: { children: ReactNode }) {
  const [pathname, setPathname] = useState<string>(() => {
    if (typeof window === 'undefined') return '/';
    return window.location.pathname || '/';
  });
  const [navigationType, setNavigationType] =
    useState<NavigationType>('POP');
  const [transitionCount, setTransitionCount] = useState<number>(0);
  const currentPathRef = useRef<string>(pathname);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const handleScroll = () => {
      saveScrollPositionForPath(currentPathRef.current, window.scrollY || 0);
    };

    const handlePopState = () => {
      const nextPath = window.location.pathname || '/';
      currentPathRef.current = nextPath;
      setNavigationType('POP');
      setPathname(nextPath);
      setTransitionCount((n) => n + 1);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const navigate = useCallback(
    (to: string, options?: { replace?: boolean }) => {
      if (typeof window !== 'undefined') {
        saveScrollPositionForPath(currentPathRef.current, window.scrollY || 0);
        if (window.location.pathname !== to) {
          if (options?.replace) {
            window.history.replaceState(
              { key: to, timestamp: Date.now() },
              '',
              to,
            );
          } else {
            window.history.pushState(
              { key: to, timestamp: Date.now() },
              '',
              to,
            );
          }
        }
      }
      const didChange = currentPathRef.current !== to;
      currentPathRef.current = to;
      setNavigationType(options?.replace ? 'REPLACE' : 'PUSH');
      setPathname(to);
      if (didChange) {
        setTransitionCount((n) => n + 1);
      }
    },
    [],
  );

  const route = normalizePath(pathname);
  const entryMatch = route === '/notes' ? parseEntryPath(pathname) : null;

  const value = useMemo<RouterContextValue>(
    () => ({
      route,
      pathname,
      navigationType,
      transitionCount,
      entryMatch,
      navigate,
    }),
    [route, pathname, navigationType, transitionCount, entryMatch, navigate],
  );

  return createElement(RouterContext.Provider, { value }, children);
}

export function useLocation(): { pathname: string; route: AppRoute } {
  const ctx = useContext(RouterContext);
  if (ctx) {
    return { pathname: ctx.pathname, route: ctx.route };
  }
  const pathname =
    typeof window !== 'undefined' ? window.location.pathname || '/' : '/';
  return { pathname, route: normalizePath(pathname) };
}

export function useNavigate() {
  const ctx = useContext(RouterContext);
  const fallbackNavigate = useCallback((to: string) => {
    if (typeof window !== 'undefined' && window.location.pathname !== to) {
      window.history.pushState({}, '', to);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, []);
  return ctx ? ctx.navigate : fallbackNavigate;
}

export function useNavigationType(): NavigationType {
  const ctx = useContext(RouterContext);
  return ctx ? ctx.navigationType : 'POP';
}

export function useAppRoute(): RouterContextValue {
  const ctx = useContext(RouterContext);

  const [fallbackPathname, setFallbackPathname] = useState<string>(() => {
    if (typeof window === 'undefined') return '/';
    return window.location.pathname || '/';
  });
  const [fallbackNavType, setFallbackNavType] =
    useState<NavigationType>('POP');
  const [fallbackCount, setFallbackCount] = useState<number>(0);

  useEffect(() => {
    if (ctx) return;
    const handlePopState = () => {
      setFallbackNavType('POP');
      setFallbackPathname(window.location.pathname || '/');
      setFallbackCount((n) => n + 1);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [ctx]);

  const fallbackNavigate = useCallback(
    (to: string, options?: { replace?: boolean }) => {
      if (typeof window !== 'undefined') {
        saveScrollPositionForPath(
          window.location.pathname || '/',
          window.scrollY || 0,
        );
        if (window.location.pathname !== to) {
          if (options?.replace) {
            window.history.replaceState({}, '', to);
          } else {
            window.history.pushState({}, '', to);
          }
        }
      }
      setFallbackNavType(options?.replace ? 'REPLACE' : 'PUSH');
      setFallbackPathname(to);
      setFallbackCount((n) => n + 1);
    },
    [],
  );

  if (ctx) return ctx;

  const route = normalizePath(fallbackPathname);
  const entryMatch =
    route === '/notes' ? parseEntryPath(fallbackPathname) : null;

  return {
    route,
    pathname: fallbackPathname,
    navigationType: fallbackNavType,
    transitionCount: fallbackCount,
    entryMatch,
    navigate: fallbackNavigate,
  };
}
