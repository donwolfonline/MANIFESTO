import { getRouteByPath, ROUTES } from './routes';

export interface NavigatorWithDeviceHints extends Navigator {
  deviceMemory?: number;
  connection?: {
    saveData?: boolean;
    effectiveType?: string;
  };
}

/**
 * Returns true when route transitions should be shortened to a plain 150ms fade:
 * - Under `prefers-reduced-motion`
 * - On low-memory devices (`navigator.deviceMemory <= 2`)
 * - When Data Saver (`navigator.connection.saveData === true`) or 2G is active
 */
export function shouldUseShortRouteFade(prefersReducedMotion: boolean): boolean {
  if (prefersReducedMotion) return true;
  if (typeof navigator === 'undefined') return false;

  const nav = navigator as NavigatorWithDeviceHints;
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2) {
    return true;
  }
  if (nav.connection?.saveData === true) {
    return true;
  }
  if (
    nav.connection?.effectiveType === 'slow-2g' ||
    nav.connection?.effectiveType === '2g'
  ) {
    return true;
  }
  return false;
}

/**
 * Formats the incoming route's lowercase path-style label for the center mono
 * typing prompt inside the transition curtain (e.g. "/bug-museum", "/home").
 */
export function getRouteTransitionLabel(pathname: string): string {
  const clean = (pathname.replace(/\/+$/, '') || '/').toLowerCase();
  const matched = getRouteByPath(clean);
  if (matched) return matched.label;
  if (clean === '/') return '/home';
  return clean.startsWith('/') ? clean : `/${clean}`;
}

/**
 * Builds the human-readable title announcement for screen readers (`aria-live="polite"`)
 * and `document.title` after each route transition completes.
 */
export function getRouteAnnouncement(
  pathname: string,
  siteTitle = 'WORKING_COPY.md',
): { documentTitle: string; announcement: string } {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const matched =
    ROUTES.find((r) => r.path === clean) ??
    (clean === '/' ? ROUTES[0] : undefined);

  if (matched) {
    const docTitle =
      matched.path === '/'
        ? `${siteTitle} — A Field Manual for Working Engineers`
        : `${matched.label} · ${siteTitle}`;
    return {
      documentTitle: docTitle,
      announcement: `Navigated to ${matched.label} — ${matched.description}`,
    };
  }

  if (clean === '/privacy') {
    return {
      documentTitle: `/privacy · ${siteTitle}`,
      announcement: 'Navigated to /privacy — Plain-language privacy notes',
    };
  }

  if (clean.startsWith('/notes/')) {
    const slug = clean.split('/').pop() ?? 'note';
    return {
      documentTitle: `${slug} · ${siteTitle}`,
      announcement: `Navigated to note ${slug.replace(/-/g, ' ')}`,
    };
  }

  return {
    documentTitle: `${clean} · ${siteTitle}`,
    announcement: `Navigated to ${clean}`,
  };
}

/**
 * Moves keyboard focus to the new page's primary `<h1>` after a route transition
 * without causing a scroll jump or visible focus ring flash.
 */
export function focusIncomingPageHeading(): HTMLElement | null {
  if (typeof document === 'undefined') return null;

  const h1 =
    document.querySelector<HTMLElement>('main h1:not(.sr-only)') ??
    document.querySelector<HTMLElement>('main h1') ??
    document.querySelector<HTMLElement>('h1');

  if (!h1) return null;

  if (!h1.hasAttribute('tabindex')) {
    h1.setAttribute('tabindex', '-1');
    h1.style.outline = 'none';
  }

  try {
    h1.focus({ preventScroll: true });
  } catch {
    h1.focus();
  }
  return h1;
}
