import { useCallback, useEffect, useRef, useState } from 'react';

export type SwCacheStrategy = 'cache-first' | 'network-first' | 'bypass';

export interface SwRequestDescriptor {
  url: string;
  method?: string;
  destination?: string;
  mode?: string;
  accept?: string;
  origin?: string;
}

const STATIC_DESTINATIONS = new Set(['style', 'script', 'font', 'image']);
const STATIC_PATH_PREFIXES = ['/assets/', '/fonts/', '/icons/'];
const STATIC_EXACT_PATHS = new Set([
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/og-image.png',
  '/offline.js',
]);
const STATIC_EXTENSIONS_RE =
  /\.(?:js|mjs|css|woff2?|ttf|otf|png|jpe?g|webp|gif|svg|ico)$/i;

/**
 * Pure classifier matching `public/sw.js` request routing:
 * - `'cache-first'` for static assets (`/assets/*`, `/fonts/*`, `/icons/*`, images, scripts, styles)
 * - `'network-first'` for HTML document navigations, `/api/*` content, markdown/JSON content, and `/manifest.webmanifest`
 * - `'bypass'` for non-GET requests, cross-origin URLs, or `/sw.js` itself
 */
export function classifySwFetchStrategy({
  url,
  method = 'GET',
  destination = '',
  mode = 'cors',
  origin = 'https://workingcopy.yourdomain.com',
}: SwRequestDescriptor): SwCacheStrategy {
  if (method.toUpperCase() !== 'GET') return 'bypass';

  let parsed: URL;
  try {
    parsed = new URL(url, origin);
  } catch {
    return 'bypass';
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return 'bypass';
  }
  if (parsed.origin !== origin) return 'bypass';
  if (parsed.pathname === '/sw.js') return 'bypass';

  if (STATIC_EXACT_PATHS.has(parsed.pathname)) return 'cache-first';
  if (
    STATIC_PATH_PREFIXES.some((prefix) => parsed.pathname.startsWith(prefix))
  ) {
    return 'cache-first';
  }
  if (STATIC_DESTINATIONS.has(destination)) return 'cache-first';
  if (
    mode !== 'navigate' &&
    !parsed.pathname.startsWith('/api/') &&
    STATIC_EXTENSIONS_RE.test(parsed.pathname)
  ) {
    return 'cache-first';
  }

  return 'network-first';
}

export const PWA_UPDATE_AVAILABLE_EVENT = 'pwa:update-available';

export interface PwaUpdateEventDetail {
  versionLabel?: string;
  waitingWorker?: Pick<ServiceWorker, 'postMessage'> | null;
}

/**
 * Dispatches a synthetic or real Service Worker update notification so the
 * "Update available" toast can be triggered from tests, the terminal, or SW events.
 */
export function notifyPwaUpdateAvailable(
  detail: PwaUpdateEventDetail = {},
): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<PwaUpdateEventDetail>(PWA_UPDATE_AVAILABLE_EVENT, {
      detail,
    }),
  );
}

export interface UsePwaUpdaterResult {
  updateAvailable: boolean;
  versionLabel: string;
  applyUpdate: () => void;
  dismissUpdate: () => void;
}

export function usePwaUpdater(): UsePwaUpdaterResult {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [versionLabel, setVersionLabel] = useState('new working copy build');
  const waitingWorkerRef = useRef<Pick<ServiceWorker, 'postMessage'> | null>(
    null,
  );
  const reloadingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleCustomUpdate = (event: Event) => {
      const custom = event as CustomEvent<PwaUpdateEventDetail>;
      if (custom.detail?.waitingWorker !== undefined) {
        waitingWorkerRef.current = custom.detail.waitingWorker;
      }
      if (custom.detail?.versionLabel) {
        setVersionLabel(custom.detail.versionLabel);
      }
      setUpdateAvailable(true);
    };

    window.addEventListener(PWA_UPDATE_AVAILABLE_EVENT, handleCustomUpdate);

    if (!('serviceWorker' in navigator)) {
      return () => {
        window.removeEventListener(
          PWA_UPDATE_AVAILABLE_EVENT,
          handleCustomUpdate,
        );
      };
    }

    let cancelled = false;

    const observeRegistration = (reg: ServiceWorkerRegistration) => {
      if (cancelled) return;

      if (reg.waiting) {
        waitingWorkerRef.current = reg.waiting;
        setUpdateAvailable(true);
      }

      reg.addEventListener('updatefound', () => {
        const installing = reg.installing;
        if (!installing) return;

        installing.addEventListener('statechange', () => {
          if (
            installing.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            waitingWorkerRef.current = reg.waiting ?? installing;
            setUpdateAvailable(true);
          }
        });
      });
    };

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        observeRegistration(reg);
      })
      .catch(() => {
        // Ignore SW registration failure in unsupported/restricted environments
      });

    let hadController = Boolean(navigator.serviceWorker.controller);

    const handleControllerChange = () => {
      // Do not reload during initial first-visit installation (`clients.claim()`
      // fires `controllerchange` when transitioning from null -> first worker).
      if (!hadController) {
        hadController = true;
        return;
      }
      if (reloadingRef.current) return;
      reloadingRef.current = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      handleControllerChange,
    );

    return () => {
      cancelled = true;
      window.removeEventListener(
        PWA_UPDATE_AVAILABLE_EVENT,
        handleCustomUpdate,
      );
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        handleControllerChange,
      );
    };
  }, []);

  const applyUpdate = useCallback(() => {
    const worker = waitingWorkerRef.current;
    setUpdateAvailable(false);
    if (worker && typeof worker.postMessage === 'function') {
      worker.postMessage({ type: 'SKIP_WAITING' });
      return;
    }
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }, []);

  const dismissUpdate = useCallback(() => {
    setUpdateAvailable(false);
  }, []);

  return {
    updateAvailable,
    versionLabel,
    applyUpdate,
    dismissUpdate,
  };
}
