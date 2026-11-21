import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type RefObject,
} from 'react';

export type HeaderDensityTier = 'wide' | 'desktop' | 'tablet' | 'mobile';

export interface PriorityNavItem {
  id: string;
  label: string;
  priority: number;
}

export interface UsePriorityNavOptions<T extends PriorityNavItem> {
  /** Candidate routes to rank by priority and fit into available space */
  items: readonly T[];
  /** Outer header shell ref observed by ResizeObserver */
  containerRef: RefObject<HTMLElement | null>;
  /** Left brand + view-mode toggle cluster ref */
  leftClusterRef?: RefObject<HTMLElement | null>;
  /** Right Field Index button cluster ref */
  rightTriggerRef?: RefObject<HTMLElement | null>;
  /** Hidden measurement list ref containing one child per ranked item */
  measureListRef?: RefObject<HTMLElement | null>;
  /** Horizontal gap (px) between inline navigation links */
  itemGapPx?: number;
  /** Safety margin (px) between inline nav and left/right clusters (prevents overlap at 200% zoom) */
  safetyBufferPx?: number;
  /** Maximum inline links shown at >= 1280px ('wide' tier, 4-5 links) */
  maxWideLinks?: number;
  /** Maximum inline links shown at 1024-1279px ('desktop' tier, 2-3 links) */
  maxDesktopLinks?: number;
}

export interface UsePriorityNavResult<T extends PriorityNavItem> {
  /** Ranked items (highest priority first) */
  rankedItems: T[];
  /** Items that currently fit inline inside the header bar */
  visibleItems: T[];
  /** Items that overflowed into the Field Index menu */
  overflowItems: T[];
  /** Number of overflowed items (+N counter on the Field Index button) */
  overflowCount: number;
  /** Current measured width (px) of the header container */
  containerWidth: number;
  /** Current responsive density tier ('wide' | 'desktop' | 'tablet' | 'mobile') */
  tier: HeaderDensityTier;
  /** Trigger an immediate re-measurement */
  remeasure: () => void;
}

export function getHeaderDensityTier(widthPx: number): HeaderDensityTier {
  if (widthPx >= 1280) return 'wide';
  if (widthPx >= 1024) return 'desktop';
  if (widthPx >= 768) return 'tablet';
  return 'mobile';
}

function estimateFallbackItemWidth(item: PriorityNavItem): number {
  // Mono uppercase 11.5px + 0.14em tracking + active/icon padding
  const charPx = 8.4;
  const iconExtra = item.id === 'terminal' ? 20 : 10;
  return Math.ceil(item.label.length * charPx + iconExtra + 12);
}

function readElementWidth(el: HTMLElement | null | undefined): number {
  if (!el) return 0;
  const rect = el.getBoundingClientRect();
  if (rect && rect.width > 0) return rect.width;
  if (el.offsetWidth > 0) return el.offsetWidth;
  if (el.clientWidth > 0) return el.clientWidth;
  return 0;
}

/**
 * Priority+ adaptive navigation hook.
 * Uses ResizeObserver + visualViewport/orientationchange listeners to measure
 * available space in the header and show as many highest-priority links as fit
 * without overlap or truncation, moving the rest into the Field Index (+N).
 */
export function usePriorityNav<T extends PriorityNavItem>({
  items,
  containerRef,
  leftClusterRef,
  rightTriggerRef,
  measureListRef,
  itemGapPx = 22,
  safetyBufferPx = 44,
  maxWideLinks = 5,
  maxDesktopLinks = 3,
}: UsePriorityNavOptions<T>): UsePriorityNavResult<T> {
  // Rank items by priority descending (stable tie-breaker preserves input order)
  const rankedItems = useMemo<T[]>(() => {
    return items
      .map((item, idx) => ({ item, idx }))
      .sort((a, b) => b.item.priority - a.item.priority || a.idx - b.idx)
      .map((entry) => entry.item);
  }, [items]);

  const computeMeasurement = useCallback(() => {
    const measuredContainer = readElementWidth(containerRef.current);
    const fallbackViewport =
      typeof window !== 'undefined' && window.innerWidth > 0
        ? window.innerWidth
        : 1280;
    const visualVpWidth =
      typeof window !== 'undefined' &&
      window.visualViewport &&
      window.visualViewport.width > 0
        ? window.visualViewport.width
        : fallbackViewport;

    // Effective viewport width for tier classification
    const viewportWidth = Math.min(fallbackViewport, visualVpWidth);
    const rawWidth =
      measuredContainer > 0
        ? Math.min(measuredContainer, visualVpWidth)
        : viewportWidth;

    // Classify tier using the measured container width (or viewport width if container has identical full-bleed width)
    const tierWidth =
      measuredContainer > 0 ? measuredContainer : viewportWidth;
    const tier = getHeaderDensityTier(tierWidth);

    // Tablet (768-1023px) and Mobile (<768px) move all links into Field Index
    if (tier === 'tablet' || tier === 'mobile') {
      return {
        containerWidth: Math.round(rawWidth),
        tier,
        visibleCount: 0,
      };
    }

    const tierMaxLinks = tier === 'wide' ? maxWideLinks : maxDesktopLinks;

    const measuredLeft = readElementWidth(leftClusterRef?.current);
    const measuredRight = readElementWidth(rightTriggerRef?.current);

    const leftWidth =
      measuredLeft > 0 ? measuredLeft : tier === 'wide' ? 355 : 275;
    const rightWidth =
      measuredRight > 0 ? measuredRight : tier === 'wide' ? 185 : 175;

    const availableForLinks = Math.max(
      0,
      rawWidth - leftWidth - rightWidth - safetyBufferPx,
    );

    const measureChildren = measureListRef?.current
      ? Array.from(measureListRef.current.children)
      : [];

    let usedWidth = 0;
    let visibleCount = 0;

    for (let i = 0; i < rankedItems.length; i++) {
      if (visibleCount >= tierMaxLinks) break;
      const item = rankedItems[i];
      const childEl = measureChildren[i] as HTMLElement | undefined;
      const measuredItemW = readElementWidth(childEl);
      const itemW =
        measuredItemW > 0 ? measuredItemW : estimateFallbackItemWidth(item);
      const gap = visibleCount > 0 ? itemGapPx : 0;

      if (usedWidth + gap + itemW <= availableForLinks) {
        usedWidth += gap + itemW;
        visibleCount += 1;
      } else {
        break;
      }
    }

    return {
      containerWidth: Math.round(rawWidth),
      tier,
      visibleCount,
    };
  }, [
    containerRef,
    leftClusterRef,
    rightTriggerRef,
    measureListRef,
    rankedItems,
    itemGapPx,
    safetyBufferPx,
    maxWideLinks,
    maxDesktopLinks,
  ]);

  const [state, setState] = useState<{
    containerWidth: number;
    tier: HeaderDensityTier;
    visibleCount: number;
  }>(() => computeMeasurement());

  const remeasure = useCallback(() => {
    const next = computeMeasurement();
    setState((prev) => {
      if (
        prev.containerWidth === next.containerWidth &&
        prev.tier === next.tier &&
        prev.visibleCount === next.visibleCount
      ) {
        return prev;
      }
      return next;
    });
  }, [computeMeasurement]);

  useLayoutEffect(() => {
    remeasure();
  }, [remeasure]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let rafId = 0;
    const scheduleMeasure = () => {
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        remeasure();
      });
    };

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        remeasure();
      });
      if (containerRef.current) ro.observe(containerRef.current);
      if (leftClusterRef?.current) ro.observe(leftClusterRef.current);
      if (rightTriggerRef?.current) ro.observe(rightTriggerRef.current);
    }

    window.addEventListener('resize', remeasure, { passive: true });
    window.addEventListener('orientationchange', remeasure, { passive: true });
    window.visualViewport?.addEventListener('resize', scheduleMeasure);
    window.visualViewport?.addEventListener('scroll', scheduleMeasure);

    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(remeasure).catch(() => {});
    }

    return () => {
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
      ro?.disconnect();
      window.removeEventListener('resize', remeasure);
      window.removeEventListener('orientationchange', remeasure);
      window.visualViewport?.removeEventListener('resize', scheduleMeasure);
      window.visualViewport?.removeEventListener('scroll', scheduleMeasure);
    };
  }, [containerRef, leftClusterRef, rightTriggerRef, remeasure]);

  const visibleItems = useMemo(
    () => rankedItems.slice(0, state.visibleCount),
    [rankedItems, state.visibleCount],
  );
  const overflowItems = useMemo(
    () => rankedItems.slice(state.visibleCount),
    [rankedItems, state.visibleCount],
  );

  return {
    rankedItems,
    visibleItems,
    overflowItems,
    overflowCount: overflowItems.length,
    containerWidth: state.containerWidth,
    tier: state.tier,
    remeasure,
  };
}
