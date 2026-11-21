/* eslint-disable react-refresh/only-export-components */
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useLenis } from '../lib/lenis';
import { getPreloadHandlers } from '../lib/routePreload';
import { PRIORITY_HEADER_ROUTES, type RouteConfig } from '../lib/routes';
import { usePriorityNav } from '../lib/usePriorityNav';
import {
  usePageScrollProgress,
  usePrefersReducedMotion,
} from '../lib/useViewportActivity';
import type { OverlayOrigin } from './IndexOverlay';

export type ViewMode = 'editorial' | 'raw';

export interface HeaderProps {
  filename: string;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  /** Custom trigger label for the full-screen Field Index menu */
  indexLabel?: string;
  /** Whether the full-screen index overlay is currently open */
  isIndexOpen: boolean;
  /** Called with the button center coordinates so the overlay wipes from the button */
  onToggleIndex: (origin: OverlayOrigin) => void;
  /** Optional active route id or pathname for the gliding active-route indicator */
  activeRouteId?: string;
  /** Unified route navigation handler */
  onNavigateRoute?: (target: string) => void;
  onOpenTerminal?: () => void;
  onOpenMuseum?: () => void;
  onOpenCommitLog?: () => void;
  onOpenToday?: () => void;
}

export const MAGNETIC_RADIUS_PX = 60;
export const MAGNETIC_MAX_PULL_PX = 8;

/**
 * Computes magnetic pull of up to 8px when the pointer is within 60px of a button's center.
 */
export function computeMagneticPull(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  radiusPx = MAGNETIC_RADIUS_PX,
  maxPullPx = MAGNETIC_MAX_PULL_PX,
): { x: number; y: number; active: boolean } {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = clientX - centerX;
  const dy = clientY - centerY;
  const distance = Math.hypot(dx, dy);

  if (distance <= 0 || distance > radiusPx) {
    return { x: 0, y: 0, active: false };
  }

  const ratio = distance / radiusPx;
  const pullX = (dx / distance) * (ratio * maxPullPx);
  const pullY = (dy / distance) * (ratio * maxPullPx);

  return {
    x: Number(
      Math.max(-maxPullPx, Math.min(maxPullPx, pullX)).toFixed(2),
    ),
    y: Number(
      Math.max(-maxPullPx, Math.min(maxPullPx, pullY)).toFixed(2),
    ),
    active: true,
  };
}

const layoutIdRectStore = new Map<string, DOMRect>();

/**
 * Shared-layout (`layoutId`) active-route indicator: a small orange square
 * before the link label that measures its previous bounding box and glides
 * smoothly between links with a 250ms spring curve.
 */
function ActiveRouteSquare({
  layoutId,
  reducedMotion,
}: {
  layoutId: string;
  reducedMotion: boolean;
}) {
  const squareRef = useRef<HTMLSpanElement | null>(null);

  useLayoutEffect(() => {
    const node = squareRef.current;
    if (!node) return;

    const nextRect = node.getBoundingClientRect();
    const prevRect = layoutIdRectStore.get(layoutId);
    layoutIdRectStore.set(layoutId, nextRect);

    if (
      !reducedMotion &&
      prevRect &&
      (Math.abs(prevRect.left - nextRect.left) > 1 ||
        Math.abs(prevRect.top - nextRect.top) > 1) &&
      typeof node.animate === 'function'
    ) {
      const dx = prevRect.left - nextRect.left;
      const dy = prevRect.top - nextRect.top;
      node.animate(
        [
          { transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.92)` },
          { transform: 'translate3d(0, 0, 0) scale(1)' },
        ],
        {
          duration: 250,
          easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        },
      );
    }
  });

  return (
    <span
      ref={squareRef}
      aria-hidden="true"
      data-layout-id={layoutId}
      data-testid="header-active-route-indicator"
      className="inline-block shrink-0"
      style={{
        width: '5px',
        height: '5px',
        borderRadius: '1px',
        backgroundColor: 'var(--color-accent)',
      }}
    />
  );
}

export function Header({
  filename,
  viewMode,
  onViewModeChange,
  indexLabel = 'field index',
  isIndexOpen,
  onToggleIndex,
  activeRouteId,
  onNavigateRoute,
  onOpenTerminal,
  onOpenMuseum,
  onOpenCommitLog,
  onOpenToday,
}: HeaderProps) {
  const { scrollTo } = useLenis();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [scrolled, setScrolled] = useState(viewMode === 'raw');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const leftClusterRef = useRef<HTMLDivElement | null>(null);
  const rightTriggerRef = useRef<HTMLButtonElement | null>(null);
  const measureListRef = useRef<HTMLDivElement | null>(null);

  const {
    visibleItems,
    overflowCount,
    tier,
  } = usePriorityNav<RouteConfig>({
    items: PRIORITY_HEADER_ROUTES,
    containerRef,
    leftClusterRef,
    rightTriggerRef,
    measureListRef,
  });

  // Track entering and leaving links across resize events for staggered 200ms animations
  const prevVisibleRef = useRef<RouteConfig[]>(visibleItems);
  const hasMountedRef = useRef(false);
  const [enteringIds, setEnteringIds] = useState<Set<string>>(() => new Set());
  const [exitingItems, setExitingItems] = useState<RouteConfig[]>([]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      prevVisibleRef.current = visibleItems;
      return;
    }

    const prev = prevVisibleRef.current;
    const prevIds = new Set(prev.map((r) => r.id));
    const nextIds = new Set(visibleItems.map((r) => r.id));

    const newlyEntered = visibleItems
      .filter((r) => !prevIds.has(r.id))
      .map((r) => r.id);
    const newlyExited = prev.filter((r) => !nextIds.has(r.id));

    prevVisibleRef.current = visibleItems;

    if (prefersReducedMotion) {
      setEnteringIds(new Set());
      setExitingItems([]);
      return;
    }

    if (newlyEntered.length > 0) {
      setEnteringIds(new Set(newlyEntered));
    }
    if (newlyExited.length > 0) {
      setExitingItems(newlyExited);
    }

    if (newlyEntered.length > 0 || newlyExited.length > 0) {
      const timer = window.setTimeout(() => {
        setEnteringIds(new Set());
        setExitingItems([]);
      }, 280);
      return () => window.clearTimeout(timer);
    }
  }, [visibleItems, prefersReducedMotion]);

  // Active inline route indicator (`layoutId="header-active-route"`)
  const [activeInlineId, setActiveInlineId] = useState<string>(() => {
    if (
      activeRouteId &&
      PRIORITY_HEADER_ROUTES.some(
        (r) => r.id === activeRouteId || r.path === activeRouteId,
      )
    ) {
      const match = PRIORITY_HEADER_ROUTES.find(
        (r) => r.id === activeRouteId || r.path === activeRouteId,
      );
      if (match) return match.id;
    }
    if (typeof window !== 'undefined') {
      const match = PRIORITY_HEADER_ROUTES.find(
        (r) => r.path === window.location.pathname,
      );
      if (match) return match.id;
    }
    return PRIORITY_HEADER_ROUTES[0]?.id ?? 'today';
  });

  useEffect(() => {
    if (!activeRouteId) return;
    const match = PRIORITY_HEADER_ROUTES.find(
      (r) => r.id === activeRouteId || r.path === activeRouteId,
    );
    if (match) {
      setActiveInlineId(match.id);
    }
  }, [activeRouteId]);

  // Keep activeInlineId within visibleItems when resizing hides the previously active item
  useEffect(() => {
    if (visibleItems.length === 0) return;
    if (!visibleItems.some((item) => item.id === activeInlineId)) {
      setActiveInlineId(visibleItems[0].id);
    }
  }, [visibleItems, activeInlineId]);

  useEffect(() => {
    if (viewMode === 'raw') setScrolled(true);
  }, [viewMode]);

  usePageScrollProgress((latestY) => {
    const next = viewMode === 'raw' || latestY > 24;
    setScrolled((prev) => (prev === next ? prev : next));
  });

  // Magnetic effect on Header buttons and Field Index button (pull of up to 8px within 60px)
  useEffect(() => {
    if (prefersReducedMotion || typeof window === 'undefined') return;
    if (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches
    ) {
      return;
    }

    const getMagneticButtons = (): HTMLElement[] => {
      const root = containerRef.current;
      if (!root) return [];
      return Array.from(
        root.querySelectorAll<HTMLElement>('[data-magnetic="true"]'),
      );
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const buttons = getMagneticButtons();
      for (const btn of buttons) {
        const rect = btn.getBoundingClientRect();
        const { x, y, active } = computeMagneticPull(
          event.clientX,
          event.clientY,
          rect,
        );
        btn.style.transform = active
          ? `translate3d(${x}px, ${y}px, 0)`
          : 'translate3d(0px, 0px, 0)';
        btn.setAttribute('data-magnetic-x', String(x));
        btn.setAttribute('data-magnetic-y', String(y));
      }
    };

    const resetMagneticButtons = () => {
      for (const btn of getMagneticButtons()) {
        btn.style.transform = 'translate3d(0px, 0px, 0)';
        btn.setAttribute('data-magnetic-x', '0');
        btn.setAttribute('data-magnetic-y', '0');
      }
    };

    window.addEventListener('pointermove', handlePointerMove, {
      passive: true,
    });
    document.addEventListener('mouseleave', resetMagneticButtons);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('mouseleave', resetMagneticButtons);
    };
  }, [prefersReducedMotion]);

  const handleIndexClick = () => {
    const rect = rightTriggerRef.current?.getBoundingClientRect();
    const origin: OverlayOrigin = rect
      ? {
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2),
        }
      : { x: window.innerWidth - 48, y: 34 };

    onToggleIndex(origin);
  };

  const triggerNav = (target: string) => {
    setActiveInlineId(target);
    if (onNavigateRoute) {
      onNavigateRoute(target);
      return;
    }
    if (target === 'today' && onOpenToday) return onOpenToday();
    if (target === 'commit-log' && onOpenCommitLog) return onOpenCommitLog();
    if (target === 'bug-museum' && onOpenMuseum) return onOpenMuseum();
    if (target === 'terminal' && onOpenTerminal) return onOpenTerminal();
  };

  const isMobileTier = tier === 'mobile';
  const isTabletTier = tier === 'tablet';
  const isDesktopCompactTier = tier === 'desktop';
  const isIconOnlyToggle = isMobileTier || isTabletTier;
  const displayPathLabel = isMobileTier ? '~/WC.MD' : `~/${filename}`;

  return (
    <header
      data-tier={tier}
      className="header-cq-root fixed top-0 right-0 left-0"
      style={{
        height: 'calc(var(--header-h, 4.25rem) + env(safe-area-inset-top, 0px))',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
        zIndex: 'var(--z-header)',
        backgroundColor: scrolled
          ? 'var(--color-header-scroll-bg)'
          : 'transparent',
        backdropFilter: scrolled ? 'blur(14px) saturate(140%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(14px) saturate(140%)' : 'none',
        borderBottom: scrolled
          ? '1px solid var(--color-border)'
          : '1px solid transparent',
        transition:
          'background-color 240ms var(--ease-editorial), border-color 240ms var(--ease-editorial), backdrop-filter 240ms var(--ease-editorial)',
      }}
    >
      {/* Hidden off-screen sizer row so ResizeObserver measures exact link widths at any zoom level */}
      <div
        ref={measureListRef}
        aria-hidden="true"
        className="fixed -top-96 left-0 opacity-0 pointer-events-none flex items-center gap-5 whitespace-nowrap select-none"
      >
        {PRIORITY_HEADER_ROUTES.map((route) => (
          <span
            key={route.id}
            className="header-mono-item inline-flex items-center gap-1.5 px-1 py-1"
          >
            <span className="inline-block w-[5px] h-[5px]" />
            {route.id === 'terminal' && (
              <span className="inline-block w-[13px] h-[13px]" />
            )}
            <span>{route.label}</span>
          </span>
        ))}
      </div>

      <div
        ref={containerRef}
        className="header-cq-shell editorial-shell h-full flex items-center justify-between gap-3 sm:gap-4 whitespace-nowrap"
      >
        {/* LEFT CLUSTER: pulsing orange status dot + path label + adaptive view-mode toggle */}
        <div
          ref={leftClusterRef}
          className="flex items-center gap-2.5 sm:gap-4 min-w-0 shrink-0"
        >
          <button
            type="button"
            data-magnetic="true"
            onClick={() => scrollTo(0, { offset: 0 })}
            className="header-touch-target group inline-flex items-center gap-2 text-left cursor-pointer min-w-0 shrink-0"
            aria-label={`${displayPathLabel} — scroll to top of manifesto`}
          >
            <span
              aria-hidden="true"
              className="header-status-dot inline-block shrink-0 h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: 'var(--color-accent)' }}
            />
            <span
              data-testid="header-brand-path"
              className="header-mono-item link-draw"
            >
              {displayPathLabel}
            </span>
          </button>

          {/* Adaptive View-Mode Toggle:
              - >=1280px ('wide'): full segmented "EDITORIAL | RAW .MD" with 250ms spring sliding pill
              - 1024-1279px ('desktop'): compact segmented "ED | .MD" with 250ms spring sliding pill
              - <1024px ('tablet' & 'mobile'): 44x44px icon-only toggle button */}
          {isIconOnlyToggle ? (
            <button
              type="button"
              data-magnetic="true"
              data-testid="view-mode-icon-toggle"
              {...getPreloadHandlers('raw')}
              onClick={() =>
                onViewModeChange(viewMode === 'editorial' ? 'raw' : 'editorial')
              }
              aria-pressed={viewMode === 'raw'}
              title={
                viewMode === 'editorial'
                  ? 'Switch to Raw .md view'
                  : 'Switch to Editorial view'
              }
              className="header-touch-target inline-flex items-center justify-center w-11 h-11 border font-mono cursor-pointer shrink-0"
              style={{
                borderColor: 'var(--color-border-strong)',
                borderRadius: 'var(--radius-xs)',
                backgroundColor:
                  viewMode === 'raw'
                    ? 'var(--color-text)'
                    : 'var(--color-bg-subtle)',
                color:
                  viewMode === 'raw'
                    ? 'var(--color-bg)'
                    : 'var(--color-header-link-hover)',
              }}
            >
              {viewMode === 'editorial' ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  width="15"
                  height="15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 4.5L2 8L5 11.5" />
                  <path d="M11 4.5L14 8L11 11.5" />
                  <path d="M9.2 3.5L6.8 12.5" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  width="15"
                  height="15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2.5 3.5H13.5V12.5H2.5V3.5Z" />
                  <path d="M5 6.5H11" />
                  <path d="M5 9.5H9" />
                </svg>
              )}
              <span className="sr-only">
                {viewMode === 'editorial'
                  ? 'Switch to Raw .md view'
                  : 'Switch to Editorial view'}
              </span>
            </button>
          ) : (
            <div
              role="group"
              aria-label="Document view mode"
              data-testid="view-mode-segmented-toggle"
              className="grid grid-cols-2 relative items-center p-0.5 border select-none shrink-0"
              style={{
                borderColor: 'var(--color-border)',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: 'var(--color-bg-subtle)',
              }}
            >
              <span
                aria-hidden="true"
                data-testid="view-mode-sliding-pill"
                className="pointer-events-none absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-2px)]"
                style={{
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: 'var(--color-text)',
                  transform:
                    viewMode === 'editorial'
                      ? 'translate3d(0%, 0, 0)'
                      : 'translate3d(100%, 0, 0)',
                  transition: prefersReducedMotion
                    ? undefined
                    : 'transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              />

              <button
                type="button"
                data-magnetic="true"
                onClick={() => onViewModeChange('editorial')}
                aria-pressed={viewMode === 'editorial'}
                className="header-touch-target relative z-10 px-2.5 py-1 font-mono uppercase text-center cursor-pointer"
                style={{
                  fontSize: '0.6875rem',
                  letterSpacing: '0.14em',
                  color:
                    viewMode === 'editorial'
                      ? 'var(--color-bg)'
                      : 'var(--color-header-link)',
                }}
              >
                {isDesktopCompactTier ? (
                  <>
                    <span aria-hidden="true">ed</span>
                    <span className="sr-only">Editorial</span>
                  </>
                ) : (
                  'editorial'
                )}
              </button>

              <button
                type="button"
                data-magnetic="true"
                onClick={() => onViewModeChange('raw')}
                {...getPreloadHandlers('raw')}
                aria-pressed={viewMode === 'raw'}
                className="header-touch-target relative z-10 px-2.5 py-1 font-mono uppercase text-center cursor-pointer"
                style={{
                  fontSize: '0.6875rem',
                  letterSpacing: '0.14em',
                  color:
                    viewMode === 'raw'
                      ? 'var(--color-bg)'
                      : 'var(--color-header-link)',
                }}
              >
                {isDesktopCompactTier ? (
                  <>
                    <span aria-hidden="true">.md</span>
                    <span className="sr-only">Raw .md</span>
                  </>
                ) : (
                  'raw .md'
                )}
              </button>
            </div>
          )}
        </div>

        {/* CENTER / RIGHT: Priority+ inline links + Field Index trigger with live +N overflow counter */}
        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
          <div className="relative flex items-center">
            <nav
              aria-label="Primary interactive pages"
              data-testid="priority-nav"
              className="flex items-center gap-5"
            >
              {visibleItems.map((route, idx) => {
                const isActive = activeInlineId === route.id;
                const isTerminal = route.id === 'terminal';
                const isEntering = enteringIds.has(route.id);

                return (
                  <a
                    key={route.id}
                    href={route.path}
                    data-active={isActive ? 'true' : 'false'}
                    data-priority={route.priority}
                    title={`${route.description} (${route.shortcut})`}
                    {...getPreloadHandlers(route.id)}
                    onPointerEnter={() => {
                      getPreloadHandlers(route.id).onPointerEnter();
                      setActiveInlineId(route.id);
                    }}
                    onFocus={() => {
                      getPreloadHandlers(route.id).onFocus();
                      setActiveInlineId(route.id);
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      triggerNav(route.id);
                    }}
                    className={`header-touch-target header-mono-item link-draw inline-flex items-center gap-1.5 py-1 ${
                      isEntering ? 'priority-nav-link-enter' : ''
                    }`}
                    style={
                      isEntering
                        ? { animationDelay: `${idx * 30}ms` }
                        : undefined
                    }
                  >
                    {isActive && (
                      <ActiveRouteSquare
                        layoutId="header-active-route"
                        reducedMotion={prefersReducedMotion}
                      />
                    )}
                    {isTerminal && (
                      <span
                        aria-hidden="true"
                        className="inline-flex items-center shrink-0"
                        dangerouslySetInnerHTML={{ __html: route.icon }}
                      />
                    )}
                    <span>{route.label}</span>
                  </a>
                );
              })}
            </nav>

            {/* Ghost exiting links (200ms staggered slide-out on resize, hidden from assistive tech) */}
            {exitingItems.length > 0 && (
              <div
                aria-hidden="true"
                role="presentation"
                className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-4"
              >
                {exitingItems.map((route, idx) => (
                  <span
                    key={`exit-${route.id}`}
                    className="header-mono-item priority-nav-link-exit inline-flex items-center gap-1.5 py-1"
                    style={{ animationDelay: `${idx * 25}ms` }}
                  >
                    <span>{route.label}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* FAR RIGHT: FIELD INDEX +N [+] (or 44x44px [+] button on mobile <768px) */}
          <button
            ref={rightTriggerRef}
            type="button"
            data-magnetic="true"
            data-cursor-label="open"
            onClick={handleIndexClick}
            aria-expanded={isIndexOpen}
            aria-haspopup="dialog"
            data-testid="field-index-trigger"
            className={`header-touch-target group header-mono-item inline-flex items-center justify-center gap-2 cursor-pointer shrink-0 ${
              isMobileTier ? 'w-11 h-11 border' : 'py-1'
            }`}
            style={
              isMobileTier
                ? {
                    borderColor: 'var(--color-border-strong)',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'var(--color-bg-subtle)',
                  }
                : undefined
            }
          >
            {isMobileTier ? (
              <span className="sr-only">{indexLabel}</span>
            ) : (
              <span className="link-draw">{indexLabel}</span>
            )}

            {overflowCount > 0 && (
              <span
                data-testid="field-index-overflow-count"
                title={`${overflowCount} more ${
                  overflowCount === 1 ? 'route' : 'routes'
                } in Field Index`}
                className="px-1.5 py-0.5 border font-mono tabular-nums leading-none"
                style={{
                  fontSize: '0.625rem',
                  borderColor: 'var(--color-border-strong)',
                  backgroundColor: 'var(--color-bg-elevated)',
                  color: 'var(--color-accent)',
                  borderRadius: 'var(--radius-xs)',
                }}
              >
                +{overflowCount}
              </span>
            )}

            <span
              aria-hidden="true"
              className="inline-flex items-center font-mono"
              style={{ color: 'var(--color-accent)' }}
            >
              <span className="inline-block transition-transform duration-200 ease-out group-hover:-translate-x-[2.5px] group-focus-visible:-translate-x-[2.5px]">
                [
              </span>
              <span
                data-testid="field-index-plus-glyph"
                className={`inline-block transition-transform duration-300 ease-out ${
                  isIndexOpen
                    ? 'rotate-90'
                    : 'group-hover:rotate-90 group-focus-visible:rotate-90'
                }`}
                style={{ transformOrigin: '50% 50%' }}
              >
                {isIndexOpen ? 'x' : '+'}
              </span>
              <span className="inline-block transition-transform duration-200 ease-out group-hover:translate-x-[2.5px] group-focus-visible:translate-x-[2.5px]">
                ]
              </span>
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
