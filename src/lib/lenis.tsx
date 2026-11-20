import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import Lenis from 'lenis';

interface ScrollToOptions {
  offset?: number;
  immediate?: boolean;
  duration?: number;
  force?: boolean;
}

interface SmoothScrollContextValue {
  lenis: Lenis | null;
  isReducedMotion: boolean;
  scrollTo: (target: string | number | HTMLElement, options?: ScrollToOptions) => void;
  resize: () => void;
}

const SmoothScrollContext = createContext<SmoothScrollContextValue>({
  lenis: null,
  isReducedMotion: false,
  scrollTo: () => {},
  resize: () => {},
});

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(REDUCED_MOTION_QUERY).matches;
  });

  // Subscribe to OS-level prefers-reduced-motion changes dynamically
  useEffect(() => {
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setIsReducedMotion(event.matches);
    };

    setIsReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Instantiate Lenis only when reduced motion is NOT active
  useEffect(() => {
    if (isReducedMotion) {
      setLenis(null);
      return;
    }

    const instance = new Lenis({
      lerp: 0.16,
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 1.15,
      touchMultiplier: 1.1,
    });

    setLenis(instance);

    let rafId = 0;
    const raf = (time: number) => {
      instance.raf(time);
      rafId = window.requestAnimationFrame(raf);
    };
    rafId = window.requestAnimationFrame(raf);

    return () => {
      window.cancelAnimationFrame(rafId);
      instance.destroy();
      setLenis(null);
    };
  }, [isReducedMotion]);

  const scrollTo = useCallback(
    (target: string | number | HTMLElement, options?: ScrollToOptions) => {
      const offset = options?.offset ?? -96;

      if (lenis && !isReducedMotion) {
        lenis.start();
        lenis.scrollTo(target, {
          offset,
          immediate: options?.immediate ?? false,
          duration: options?.duration,
          force: options?.force ?? true,
        });
        return;
      }

      // Native instant fallback when prefers-reduced-motion is enabled
      if (typeof target === 'number') {
        window.scrollTo({ top: target, behavior: 'auto' });
        return;
      }

      const el =
        typeof target === 'string'
          ? document.querySelector<HTMLElement>(target)
          : target;

      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY + offset;
        window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
      }
    },
    [lenis, isReducedMotion],
  );

  const resize = useCallback(() => {
    lenis?.resize();
  }, [lenis]);

  const value = useMemo(
    () => ({ lenis, isReducedMotion, scrollTo, resize }),
    [lenis, isReducedMotion, scrollTo, resize],
  );

  return (
    <SmoothScrollContext.Provider value={value}>
      {children}
    </SmoothScrollContext.Provider>
  );
}

export function useLenis(): SmoothScrollContextValue {
  return useContext(SmoothScrollContext);
}
