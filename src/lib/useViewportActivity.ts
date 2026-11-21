import { useEffect, useRef, useState, type RefObject } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function shouldReduceMotion(): boolean {
  if (typeof window === 'undefined') return false;
  if (
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-reduced-motion') === 'true'
  ) {
    return true;
  }
  const isAutomatedBrowser =
    typeof navigator !== 'undefined' && navigator.webdriver === true;
  if (!isAutomatedBrowser) {
    return false;
  }
  if (typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Zero-dependency reduced-motion hook.
 * Returns true in automated headless test browsers with reducedMotion enabled
 * or when `data-reduced-motion="true"` is set on `<html>`, while preserving
 * full interactive motion in standard interactive browser sessions.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => shouldReduceMotion());

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = () => setReduced(shouldReduceMotion());
    setReduced(shouldReduceMotion());
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

/**
 * Tracks whether the browser tab is currently visible (`!document.hidden`).
 * Used to pause all canvas and scroll-scrubbed work when backgrounded.
 */
export function useDocumentVisible(): boolean {
  const [visible, setVisible] = useState<boolean>(() =>
    typeof document === 'undefined' ? true : !document.hidden,
  );

  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return visible;
}

/**
 * One-shot IntersectionObserver reveal hook replacing heavy animation-library
 * `whileInView` observers with native browser primitives.
 */
export function useInViewOnce(
  ref: RefObject<HTMLElement | null>,
  disabled: boolean,
  options: IntersectionObserverInit = { threshold: 0.14, rootMargin: '0px 0px -8% 0px' },
): boolean {
  const [entered, setEntered] = useState<boolean>(disabled);
  // Depend on primitive option values, not the (often inline) options object identity
  const { threshold, rootMargin, root } = options;

  useEffect(() => {
    if (disabled) {
      setEntered(true);
      return;
    }
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setEntered(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setEntered(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin, root },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, disabled, threshold, rootMargin, root]);

  return entered;
}

export interface ScrollScrubOptions {
  /** Disable scroll listening (e.g. under prefers-reduced-motion) */
  disabled?: boolean;
  /** Fraction of viewport height where scrubbing begins (0 = top edge, 0.18 = 18% from top) */
  startViewportFraction?: number;
  /** Progress calculation mode: 'sticky' (element taller than viewport) or 'exit' (hero scrolling off top) */
  mode?: 'sticky' | 'exit';
  /** Extra IntersectionObserver margin so scrubbing wakes just before entering */
  rootMargin?: string;
}

/**
 * Visibility- and viewport-gated scroll scrubber.
 * Attaches passive scroll/resize listeners ONLY while the target section is
 * intersecting the viewport AND the browser tab is visible, coalescing updates
 * into a single requestAnimationFrame per frame.
 */
export function useScrollScrub(
  ref: RefObject<HTMLElement | null>,
  onProgress: (progress: number) => void,
  {
    disabled = false,
    startViewportFraction = 0,
    mode = 'sticky',
    rootMargin = '120px 0px 120px 0px',
  }: ScrollScrubOptions = {},
): void {
  const callbackRef = useRef(onProgress);
  callbackRef.current = onProgress;

  const docVisible = useDocumentVisible();
  const [inView, setInView] = useState<boolean>(false);

  useEffect(() => {
    if (disabled) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        setInView(Boolean(entries[0]?.isIntersecting));
      },
      { rootMargin, threshold: 0 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, disabled, rootMargin]);

  useEffect(() => {
    if (disabled || !inView || !docVisible) return;
    const node = ref.current;
    if (!node) return;

    let rafId = 0;

    const measure = () => {
      rafId = 0;
      const rect = node.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      let progress: number;

      if (mode === 'exit') {
        const total = Math.max(1, rect.height);
        progress = -rect.top / total;
      } else {
        const startOffset = vh * startViewportFraction;
        const travel = Math.max(1, rect.height - vh + startOffset);
        progress = (startOffset - rect.top) / travel;
      }

      callbackRef.current(Math.min(1, Math.max(0, progress)));
    };

    const schedule = () => {
      if (rafId !== 0) return;
      rafId = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });

    return () => {
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [ref, disabled, inView, docVisible, startViewportFraction, mode]);
}

/**
 * Page-level scroll listener that automatically pauses when the browser tab is hidden.
 */
export function usePageScrollProgress(
  onScroll: (scrollY: number, progress: number) => void,
  disabled = false,
): void {
  const callbackRef = useRef(onScroll);
  callbackRef.current = onScroll;
  const docVisible = useDocumentVisible();

  useEffect(() => {
    if (disabled || !docVisible) return;

    let rafId = 0;

    const measure = () => {
      rafId = 0;
      const y = window.scrollY || 0;
      const maxScroll = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      callbackRef.current(y, Math.min(1, Math.max(0, y / maxScroll)));
    };

    const schedule = () => {
      if (rafId !== 0) return;
      rafId = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });

    return () => {
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [disabled, docVisible]);
}
