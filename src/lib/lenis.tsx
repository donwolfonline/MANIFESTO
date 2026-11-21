import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { usePrefersReducedMotion } from './useViewportActivity';

interface ScrollToOptions {
  offset?: number;
  immediate?: boolean;
  duration?: number;
  force?: boolean;
}

export interface ScrollController {
  stop: () => void;
  start: () => void;
  resize: () => void;
}

interface SmoothScrollContextValue {
  lenis: ScrollController | null;
  isReducedMotion: boolean;
  scrollTo: (
    target: string | number | HTMLElement,
    options?: ScrollToOptions,
  ) => void;
  resize: () => void;
}

const NOOP_CONTROLLER: ScrollController = {
  stop: () => {},
  start: () => {},
  resize: () => {},
};

const SmoothScrollContext = createContext<SmoothScrollContextValue>({
  lenis: NOOP_CONTROLLER,
  isReducedMotion: false,
  scrollTo: () => {},
  resize: () => {},
});

/**
 * Native smooth-scroll provider.
 * Replaces the always-on 60fps Lenis requestAnimationFrame loop with native
 * browser scrolling so idle tabs and mobile touch scrolling incur zero JS overhead.
 */
export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const isReducedMotion = usePrefersReducedMotion();

  const scrollTo = useCallback(
    (target: string | number | HTMLElement, options?: ScrollToOptions) => {
      const offset = options?.offset ?? -96;
      const behavior: ScrollBehavior =
        isReducedMotion || options?.immediate ? 'auto' : 'smooth';

      if (typeof target === 'number') {
        window.scrollTo({ top: Math.max(0, target + offset), behavior });
        return;
      }

      const el =
        typeof target === 'string'
          ? document.querySelector<HTMLElement>(target)
          : target;

      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY + offset;
        window.scrollTo({ top: Math.max(0, top), behavior });
      }
    },
    [isReducedMotion],
  );

  const resize = useCallback(() => {}, []);

  const value = useMemo(
    () => ({
      lenis: NOOP_CONTROLLER,
      isReducedMotion,
      scrollTo,
      resize,
    }),
    [isReducedMotion, scrollTo, resize],
  );

  return (
    <SmoothScrollContext.Provider value={value}>
      {children}
    </SmoothScrollContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook is colocated with its provider
export function useLenis(): SmoothScrollContextValue {
  return useContext(SmoothScrollContext);
}
