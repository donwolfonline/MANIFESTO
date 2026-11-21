import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
} from 'react';
import { useLenis } from '../lib/lenis';
import {
  READING_THEME_OPTIONS,
  useReadingMode,
  type ReadingThemePreference,
} from '../lib/readingMode';
import { preloadRoute, preloadTarget } from '../lib/routePreload';
import {
  getRoutesByGroup,
  ROUTE_GROUP_META,
  ROUTE_GROUPS,
  type RouteConfig,
} from '../lib/routes';
import { usePrefersReducedMotion } from '../lib/useViewportActivity';
import { FilmGrain } from './FilmGrain';

export interface OverlaySectionItem {
  id: string;
  index: string;
  label: string;
  meta?: string;
}

export interface OverlayOrigin {
  x: number;
  y: number;
}

export interface IndexOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  /** Viewport coordinates (px) of the trigger button center */
  origin: OverlayOrigin;
  /** Primary page sections */
  sections: OverlaySectionItem[];
  /** Callback when a primary section or route is selected */
  onSelectSection: (sectionId: string) => void;
  /** Optional quick links for the reading items */
  readingItems?: { number: number; title: string }[];
  onSelectReadingItem?: (itemNumber: number) => void;
  /** Header title displayed inside the overlay */
  filename?: string;
  /** Document view-mode switch inside the bottom bar */
  viewMode?: 'editorial' | 'raw';
  onViewModeChange?: (mode: 'editorial' | 'raw') => void;
  /** Optional callback to open site-wide "/" search */
  onOpenSearch?: () => void;
}

function formatClockTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

/**
 * Bespoke architectural SVG thumbnail / illustration for the desktop live preview panel.
 */
function RoutePreviewIllustration({ route }: { route: RouteConfig }) {
  switch (route.id) {
    case 'home':
      return (
        <svg
          viewBox="0 0 360 220"
          className="w-full h-auto"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="16"
            y="16"
            width="328"
            height="188"
            rx="3"
            fill="#191718"
            stroke="rgba(242,238,232,0.18)"
          />
          <rect x="16" y="16" width="84" height="2" fill="#f0642d" />
          <circle cx="36" cy="40" r="3" fill="#f0642d" />
          <rect
            x="48"
            y="37"
            width="110"
            height="6"
            rx="1"
            fill="rgba(242,238,232,0.5)"
          />
          <text
            x="34"
            y="104"
            fill="#f2eee8"
            fontFamily="Georgia, serif"
            fontSize="36"
          >
            WORKING_COPY.md
          </text>
          <rect
            x="34"
            y="126"
            width="230"
            height="6"
            rx="1"
            fill="rgba(242,238,232,0.28)"
          />
          <rect
            x="34"
            y="142"
            width="190"
            height="6"
            rx="1"
            fill="rgba(242,238,232,0.2)"
          />
          <rect
            x="34"
            y="168"
            width="78"
            height="18"
            rx="2"
            fill="#f0642d"
          />
        </svg>
      );
    case 'commit-log':
      return (
        <svg
          viewBox="0 0 360 220"
          className="w-full h-auto"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="16"
            y="16"
            width="328"
            height="188"
            rx="3"
            fill="#191718"
            stroke="rgba(242,238,232,0.18)"
          />
          <line
            x1="46"
            y1="36"
            x2="46"
            y2="184"
            stroke="#f0642d"
            strokeWidth="2"
          />
          <circle cx="46" cy="54" r="5" fill="#f0642d" />
          <circle
            cx="46"
            cy="110"
            r="4.5"
            fill="#191718"
            stroke="#f2eee8"
            strokeWidth="1.5"
          />
          <circle
            cx="46"
            cy="166"
            r="4.5"
            fill="#191718"
            stroke="#f2eee8"
            strokeWidth="1.5"
          />
          <rect
            x="68"
            y="38"
            width="254"
            height="42"
            rx="2"
            fill="rgba(110,196,156,0.12)"
            stroke="rgba(110,196,156,0.4)"
          />
          <rect
            x="68"
            y="92"
            width="254"
            height="36"
            rx="2"
            fill="rgba(244,114,107,0.1)"
            stroke="rgba(244,114,107,0.35)"
          />
          <rect
            x="68"
            y="146"
            width="254"
            height="36"
            rx="2"
            fill="rgba(242,238,232,0.04)"
            stroke="rgba(242,238,232,0.14)"
          />
        </svg>
      );
    case 'bug-museum':
      return (
        <svg
          viewBox="0 0 360 220"
          className="w-full h-auto"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="16"
            y="16"
            width="328"
            height="188"
            rx="3"
            fill="#191718"
            stroke="rgba(242,238,232,0.18)"
          />
          <rect
            x="32"
            y="40"
            width="92"
            height="140"
            rx="2"
            fill="#282527"
            stroke="#f0642d"
          />
          <rect
            x="134"
            y="40"
            width="92"
            height="140"
            rx="2"
            fill="#282527"
            stroke="rgba(242,238,232,0.18)"
          />
          <rect
            x="236"
            y="40"
            width="92"
            height="140"
            rx="2"
            fill="#282527"
            stroke="rgba(242,238,232,0.18)"
          />
          <text
            x="44"
            y="72"
            fill="#f0642d"
            fontFamily="monospace"
            fontSize="11"
          >
            EXHIBIT 01
          </text>
          <text
            x="146"
            y="72"
            fill="#968f86"
            fontFamily="monospace"
            fontSize="11"
          >
            EXHIBIT 02
          </text>
          <text
            x="248"
            y="72"
            fill="#968f86"
            fontFamily="monospace"
            fontSize="11"
          >
            EXHIBIT 03
          </text>
        </svg>
      );
    case 'naming':
      return (
        <svg
          viewBox="0 0 360 220"
          className="w-full h-auto"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="16"
            y="16"
            width="328"
            height="188"
            rx="3"
            fill="#191718"
            stroke="rgba(242,238,232,0.18)"
          />
          <text
            x="34"
            y="56"
            fill="#f4726b"
            fontFamily="monospace"
            fontSize="13"
          >
            - const d = 86400000;
          </text>
          <text
            x="34"
            y="82"
            fill="#6ec49c"
            fontFamily="monospace"
            fontSize="13"
          >
            + const SESSION_TTL_MS = 86_400_000;
          </text>
          <rect
            x="34"
            y="112"
            width="292"
            height="10"
            rx="2"
            fill="rgba(242,238,232,0.1)"
          />
          <rect
            x="34"
            y="112"
            width="274"
            height="10"
            rx="2"
            fill="#6ec49c"
          />
          <text
            x="34"
            y="148"
            fill="#f2eee8"
            fontFamily="monospace"
            fontSize="11"
          >
            2AM READABILITY METER · 96% APPROVED
          </text>
        </svg>
      );
    case 'playground':
      return (
        <svg
          viewBox="0 0 360 220"
          className="w-full h-auto"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="16"
            y="16"
            width="328"
            height="188"
            rx="3"
            fill="#191718"
            stroke="rgba(242,238,232,0.18)"
          />
          <path
            d="M28 150 C 95 60, 175 190, 332 70"
            stroke="#f0642d"
            strokeWidth="2"
          />
          <path
            d="M28 120 C 110 40, 190 170, 332 100"
            stroke="rgba(242,238,232,0.45)"
            strokeWidth="1.5"
          />
          <path
            d="M28 90 C 125 30, 210 150, 332 130"
            stroke="rgba(110,196,156,0.5)"
            strokeWidth="1.25"
          />
          <circle cx="180" cy="110" r="36" stroke="#f0642d" strokeDasharray="3 5" />
        </svg>
      );
    case 'delete':
      return (
        <svg
          viewBox="0 0 360 220"
          className="w-full h-auto"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="16"
            y="16"
            width="328"
            height="188"
            rx="3"
            fill="#191718"
            stroke="rgba(242,238,232,0.18)"
          />
          <text
            x="36"
            y="112"
            fill="#f2eee8"
            fontFamily="Georgia, serif"
            fontSize="44"
          >
            4,000 → 400
          </text>
          <line
            x1="36"
            y1="142"
            x2="324"
            y2="142"
            stroke="#f0642d"
            strokeWidth="3"
          />
          <text
            x="36"
            y="170"
            fill="#6ec49c"
            fontFamily="monospace"
            fontSize="12"
          >
            -3,600 LINES REMOVED · 0 REGRESSIONS
          </text>
        </svg>
      );
    case 'today':
      return (
        <svg
          viewBox="0 0 360 220"
          className="w-full h-auto"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="16"
            y="16"
            width="328"
            height="188"
            rx="3"
            fill="#191718"
            stroke="rgba(242,238,232,0.18)"
          />
          <circle
            cx="270"
            cy="110"
            r="62"
            stroke="rgba(240,100,45,0.35)"
            strokeDasharray="3 6"
          />
          <circle
            cx="270"
            cy="110"
            r="40"
            stroke="rgba(240,100,45,0.55)"
          />
          <text
            x="36"
            y="95"
            fill="rgba(242,238,232,0.22)"
            fontFamily="Georgia, serif"
            fontSize="58"
          >
            01
          </text>
          <text
            x="36"
            y="138"
            fill="#f2eee8"
            fontFamily="Georgia, serif"
            fontSize="22"
          >
            Principle of the Day
          </text>
          <text
            x="36"
            y="166"
            fill="#f0642d"
            fontFamily="monospace"
            fontSize="11"
          >
            1080×1080 PNG SHARE CARD
          </text>
        </svg>
      );
    case 'focus':
      return (
        <svg
          viewBox="0 0 360 220"
          className="w-full h-auto"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="16"
            y="16"
            width="328"
            height="188"
            rx="3"
            fill="#191718"
            stroke="rgba(242,238,232,0.18)"
          />
          <circle
            cx="180"
            cy="110"
            r="58"
            stroke="rgba(242,238,232,0.14)"
            strokeWidth="4"
          />
          <circle
            cx="180"
            cy="110"
            r="58"
            stroke="#f0642d"
            strokeWidth="4"
            strokeDasharray="260 365"
          />
          <text
            x="180"
            y="117"
            textAnchor="middle"
            fill="#f2eee8"
            fontFamily="monospace"
            fontSize="22"
          >
            25:00
          </text>
        </svg>
      );
    case 'terminal':
      return (
        <svg
          viewBox="0 0 360 220"
          className="w-full h-auto"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="16"
            y="16"
            width="328"
            height="188"
            rx="3"
            fill="#191718"
            stroke="rgba(242,238,232,0.18)"
          />
          <circle cx="34" cy="34" r="3.5" fill="#f4726b" />
          <circle cx="46" cy="34" r="3.5" fill="#e9a83b" />
          <circle cx="58" cy="34" r="3.5" fill="#6ec49c" />
          <text
            x="34"
            y="78"
            fill="#f0642d"
            fontFamily="monospace"
            fontSize="13"
          >
            guest@working-copy:~$ manifesto
          </text>
          <text
            x="34"
            y="106"
            fill="#f2eee8"
            fontFamily="monospace"
            fontSize="12"
          >
            ### 01. Write the PR description first
          </text>
          <text
            x="34"
            y="132"
            fill="#b8b1a7"
            fontFamily="monospace"
            fontSize="12"
          >
            ### 02. Name things for 2am
          </text>
          <rect x="34" y="152" width="9" height="16" fill="#f0642d" />
        </svg>
      );
    default:
      return (
        <svg
          viewBox="0 0 360 220"
          className="w-full h-auto"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="16"
            y="16"
            width="328"
            height="188"
            rx="3"
            fill="#191718"
            stroke="rgba(242,238,232,0.18)"
          />
          <rect
            x="34"
            y="38"
            width="138"
            height="64"
            rx="2"
            fill="#282527"
            stroke="#f0642d"
          />
          <rect
            x="188"
            y="38"
            width="138"
            height="64"
            rx="2"
            fill="#282527"
            stroke="rgba(242,238,232,0.16)"
          />
          <rect
            x="34"
            y="116"
            width="292"
            height="62"
            rx="2"
            fill="#282527"
            stroke="rgba(242,238,232,0.16)"
          />
        </svg>
      );
  }
}

export function IndexOverlay({
  isOpen,
  onClose,
  origin,
  onSelectSection,
  readingItems = [],
  onSelectReadingItem,
  filename = 'working_copy.md',
  viewMode = 'editorial',
  onViewModeChange,
  onOpenSearch,
}: IndexOverlayProps) {
  const { lenis } = useLenis();
  const prefersReducedMotion = usePrefersReducedMotion();
  const { prefs: readingPrefs, setTheme } = useReadingMode();

  // Flatten routes in display order: READ -> PLAY -> TOOLS (01..11)
  const orderedRoutes = useMemo<RouteConfig[]>(() => {
    return ROUTE_GROUPS.flatMap((group) => getRoutesByGroup(group));
  }, []);

  const [wipedIn, setWipedIn] = useState(false);
  const [hoveredRouteId, setHoveredRouteId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [clockText, setClockText] = useState<string>(() =>
    formatClockTime(new Date()),
  );
  const [isCoarsePointer, setIsCoarsePointer] = useState<boolean>(false);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const initialPathRef = useRef<string>(
    typeof window !== 'undefined' ? window.location.pathname : '/',
  );
  const touchStartYRef = useRef<number | null>(null);

  // Detect coarse pointer (touch devices) so the desktop preview panel is omitted on touch
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    setIsCoarsePointer(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  // Trigger circular clip-path wipe from button center (700ms, cubic-bezier(0.77, 0, 0.18, 1))
  useEffect(() => {
    if (!isOpen) {
      setWipedIn(false);
      setHoveredRouteId(null);
      return;
    }
    if (prefersReducedMotion) {
      setWipedIn(true);
      return;
    }
    const raf = window.requestAnimationFrame(() => {
      setWipedIn(true);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [isOpen, prefersReducedMotion]);

  // Live current time clock in the bottom bar
  useEffect(() => {
    if (!isOpen) return;
    setClockText(formatClockTime(new Date()));
    const interval = window.setInterval(() => {
      setClockText(formatClockTime(new Date()));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isOpen]);

  // Close automatically on browser popstate / route change
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    initialPathRef.current = window.location.pathname;

    const handlePopState = () => {
      if (window.location.pathname !== initialPathRef.current) {
        onClose();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isOpen, onClose]);

  const handleSelectRoute = useCallback(
    (route: RouteConfig) => {
      onClose();
      window.requestAnimationFrame(() => {
        onSelectSection(route.id === 'home' ? 'top' : route.id);
      });
    },
    [onClose, onSelectSection],
  );

  // Lock body scroll without layout jump + focus trap + keyboard navigation (Esc, Up/Down, Enter, 1-9, /)
  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    lenis?.stop();
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      typeof window !== 'undefined'
        ? Math.max(
            0,
            window.innerWidth - document.documentElement.clientWidth,
          )
        : 0;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const focusRaf = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      // Focus trap for Tab / Shift+Tab inside the modal dialog
      if (event.key === 'Tab') {
        const container = dialogRef.current;
        if (!container) return;
        const focusable = Array.from(
          container.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((prev) => {
          const next = (prev + 1) % orderedRoutes.length;
          preloadTarget(orderedRoutes[next].id);
          return next;
        });
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((prev) => {
          const next =
            (prev - 1 + orderedRoutes.length) % orderedRoutes.length;
          preloadTarget(orderedRoutes[next].id);
          return next;
        });
        return;
      }

      if (event.key === 'Enter') {
        const activeEl = document.activeElement as HTMLElement | null;
        // If focus is on the dialog container or close button is not explicitly pressed via Enter,
        // or if the user used arrow keys to highlight a route, navigate to the active route:
        if (
          !activeEl ||
          activeEl === dialogRef.current ||
          activeEl.getAttribute('data-route-item') === 'true'
        ) {
          event.preventDefault();
          const targetRoute = orderedRoutes[activeIndex] ?? orderedRoutes[0];
          if (targetRoute) handleSelectRoute(targetRoute);
        }
        return;
      }

      // Number keys 1–9 jump directly to routes 01–09
      if (/^[1-9]$/.test(event.key)) {
        const idx = Number(event.key) - 1;
        const targetRoute = orderedRoutes[idx];
        if (targetRoute) {
          event.preventDefault();
          setActiveIndex(idx);
          handleSelectRoute(targetRoute);
        }
        return;
      }

      // "/" opens site search
      if (event.key === '/') {
        event.preventDefault();
        onClose();
        if (onOpenSearch) {
          onOpenSearch();
        } else if (typeof window !== 'undefined') {
          window.requestAnimationFrame(() => {
            window.dispatchEvent(
              new KeyboardEvent('keydown', { key: '/', bubbles: true }),
            );
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusRaf);
      lenis?.start();
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      window.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [
    isOpen,
    lenis,
    onClose,
    orderedRoutes,
    activeIndex,
    handleSelectRoute,
    onOpenSearch,
  ]);

  if (!isOpen) return null;

  const previewRoute =
    orderedRoutes.find((r) => r.id === hoveredRouteId) ??
    orderedRoutes[activeIndex] ??
    orderedRoutes[0];
  const previewNumberStr = String(
    orderedRoutes.indexOf(previewRoute) + 1,
  ).padStart(2, '0');

  const originX = origin.x || (typeof window !== 'undefined' ? window.innerWidth - 48 : 1200);
  const originY = origin.y || 34;

  const clipPathStyle = prefersReducedMotion
    ? undefined
    : wipedIn
      ? `circle(150vmax at ${originX}px ${originY}px)`
      : `circle(0px at ${originX}px ${originY}px)`;

  const handleBackdropClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (event.currentTarget.scrollTop <= 4) {
      touchStartYRef.current = event.touches[0]?.clientY ?? null;
    } else {
      touchStartYRef.current = null;
    }
  };

  const handleTouchEnd = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (touchStartYRef.current === null) return;
    const endY = event.changedTouches[0]?.clientY ?? touchStartYRef.current;
    const deltaY = endY - touchStartYRef.current;
    touchStartYRef.current = null;
    if (deltaY > 64) {
      onClose();
    }
  };

  const cycleTheme = (nextTheme: ReadingThemePreference) => {
    setTheme(nextTheme);
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Manifesto section index"
      data-testid="field-index-overlay"
      onClick={handleBackdropClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`fixed inset-0 flex flex-col overflow-y-auto ${
        prefersReducedMotion ? 'backdrop-enter' : ''
      }`}
      style={{
        zIndex: 'var(--z-overlay)',
        backgroundColor: '#201e1f',
        color: '#f2eee8',
        clipPath: clipPathStyle,
        transition: prefersReducedMotion
          ? undefined
          : 'clip-path 700ms cubic-bezier(0.77, 0, 0.18, 1)',
      }}
    >
      <FilmGrain />

      {/* Mobile swipe-down indicator pill */}
      <div
        aria-hidden="true"
        className="sm:hidden pt-2.5 flex justify-center shrink-0"
      >
        <span
          className="block w-10 h-1 rounded-full"
          style={{ backgroundColor: 'rgba(242, 238, 232, 0.22)' }}
        />
      </div>

      {/* Top overlay bar matching header geometry */}
      <div
        className="shrink-0 border-b"
        style={{
          height: 'var(--header-h, 4.25rem)',
          borderColor: 'rgba(242, 238, 232, 0.12)',
        }}
      >
        <div className="editorial-shell h-full flex items-center justify-between gap-4">
          <span
            className="font-mono uppercase tracking-[var(--tracking-mono)] flex items-center gap-2.5"
            style={{
              fontSize: 'var(--text-meta)',
              color: '#968f86',
            }}
          >
            <span
              aria-hidden="true"
              className="header-status-dot inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: '#f0642d' }}
            />
            <span>~/{filename} — field index</span>
          </span>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="group inline-flex items-center gap-2 font-mono uppercase tracking-[var(--tracking-micro)] py-1 cursor-pointer"
            style={{
              fontSize: 'var(--text-micro)',
              color: '#f2eee8',
            }}
          >
            <span className="link-draw">close [esc]</span>
            <span
              aria-hidden="true"
              data-testid="overlay-close-x-glyph"
              style={{ color: '#f0642d' }}
            >
              [x]
            </span>
          </button>
        </div>
      </div>

      {/* Main Content: Large 2-column grid on desktop, single scrollable column on mobile */}
      <div
        onClick={handleBackdropClick}
        className="editorial-shell flex-1 py-8 sm:py-12"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* LEFT COLUMN: Routes grouped by READ / PLAY / TOOLS in huge serif type */}
          <nav
            aria-label="Field index routes by group"
            className="lg:col-span-7 space-y-10"
          >
            {ROUTE_GROUPS.map((groupKey) => {
              const groupRoutes = getRoutesByGroup(groupKey);
              const groupMeta = ROUTE_GROUP_META[groupKey];

              return (
                <section
                  key={groupKey}
                  aria-label={`${groupMeta.label.toUpperCase()} group`}
                  className="space-y-3"
                >
                  <div
                    className="pb-2 border-b flex items-center justify-between font-mono uppercase tracking-[var(--tracking-micro)]"
                    style={{
                      borderColor: 'rgba(242, 238, 232, 0.12)',
                      fontSize: 'var(--text-micro)',
                    }}
                  >
                    <span style={{ color: '#f0642d' }}>
                      {groupMeta.label.toUpperCase()}
                    </span>
                    <span style={{ color: '#968f86' }}>{groupMeta.title}</span>
                  </div>

                  <ol className="list-none p-0 m-0 divide-y divide-[rgba(242,238,232,0.08)]">
                    {groupRoutes.map((route) => {
                      const globalIdx = orderedRoutes.findIndex(
                        (r) => r.id === route.id,
                      );
                      const numStr = String(globalIdx + 1).padStart(2, '0');
                      const isHovered = hoveredRouteId === route.id;
                      const isOtherHovered =
                        hoveredRouteId !== null && hoveredRouteId !== route.id;

                      return (
                        <li
                          key={route.id}
                          className={
                            prefersReducedMotion
                              ? ''
                              : 'field-index-stagger-item'
                          }
                          style={
                            prefersReducedMotion
                              ? undefined
                              : { animationDelay: `${globalIdx * 60}ms` }
                          }
                        >
                          <button
                            type="button"
                            data-route-item="true"
                            data-route-id={route.id}
                            data-hovered={isHovered ? 'true' : 'false'}
                            data-dimmed={isOtherHovered ? 'true' : 'false'}
                            onMouseEnter={() => {
                              setHoveredRouteId(route.id);
                              setActiveIndex(globalIdx);
                              preloadTarget(route.id);
                            }}
                            onMouseLeave={() => {
                              setHoveredRouteId(null);
                            }}
                            onFocus={() => {
                              setActiveIndex(globalIdx);
                              preloadTarget(route.id);
                            }}
                            onClick={() => handleSelectRoute(route)}
                            className="w-full py-3.5 sm:py-4 flex items-center justify-between gap-4 text-left cursor-pointer"
                            style={{
                              opacity: isOtherHovered ? 0.35 : 1,
                              transform: isHovered
                                ? 'translate3d(12px, 0, 0)'
                                : 'translate3d(0, 0, 0)',
                              transition:
                                'transform 240ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease',
                            }}
                          >
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-baseline gap-3.5 sm:gap-5">
                                <span
                                  className="font-mono tabular-nums shrink-0"
                                  style={{
                                    fontSize: 'var(--text-micro)',
                                    letterSpacing: '0.14em',
                                    color: '#f0642d',
                                  }}
                                >
                                  {numStr}
                                </span>

                                <span
                                  className="font-display font-normal uppercase inline-flex items-center gap-2.5"
                                  style={{
                                    fontSize: 'clamp(1.85rem, 3.8vw, 3.25rem)',
                                    lineHeight: 1.02,
                                    letterSpacing: 'var(--tracking-section)',
                                    color: '#f2eee8',
                                  }}
                                >
                                  {route.id === 'terminal' && (
                                    <span
                                      aria-hidden="true"
                                      className="inline-flex items-center shrink-0"
                                      dangerouslySetInnerHTML={{
                                        __html: route.icon,
                                      }}
                                    />
                                  )}
                                  <span>{route.label}</span>
                                </span>
                              </div>

                              <p
                                className="m-0 pl-8 sm:pl-10 font-body"
                                style={{
                                  fontSize: 'var(--text-meta)',
                                  color: '#b8b1a7',
                                }}
                              >
                                {route.description}
                              </p>
                            </div>

                            {/* Orange arrow that draws in on hover */}
                            <span
                              aria-hidden="true"
                              data-testid={`route-arrow-${route.id}`}
                              className="shrink-0 inline-flex items-center font-mono"
                              style={{
                                color: '#f0642d',
                                opacity: isHovered ? 1 : 0,
                                transform: isHovered
                                  ? 'translate3d(0, 0, 0)'
                                  : 'translate3d(-10px, 0, 0)',
                                transition:
                                  'opacity 220ms ease, transform 240ms cubic-bezier(0.22, 1, 0.36, 1)',
                              }}
                            >
                              <svg
                                width="22"
                                height="22"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.75"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M4 12H20" />
                                <path d="M14 6L20 12L14 18" />
                              </svg>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              );
            })}

            {/* Optional quick 01–10 principles jump strip */}
            {readingItems.length > 0 && onSelectReadingItem && (
              <section
                aria-label="Ten working principles quick jump"
                className="pt-4 border-t space-y-3"
                style={{ borderColor: 'rgba(242, 238, 232, 0.12)' }}
              >
                <p
                  className="m-0 font-mono uppercase tracking-[var(--tracking-micro)]"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: '#968f86',
                  }}
                >
                  In #read ({readingItems.length} Working Notes)
                </p>

                <ol className="list-none p-0 m-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {readingItems.map((item) => (
                    <li key={item.number}>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          window.requestAnimationFrame(() =>
                            onSelectReadingItem(item.number),
                          );
                        }}
                        className="group flex items-baseline gap-2.5 text-left font-mono cursor-pointer py-1"
                        style={{
                          fontSize: 'var(--text-micro)',
                          color: '#b8b1a7',
                        }}
                      >
                        <span
                          className="tabular-nums shrink-0"
                          style={{ color: '#f0642d' }}
                        >
                          {String(item.number).padStart(2, '0')}
                        </span>
                        <span className="link-draw truncate">{item.title}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </nav>

          {/* RIGHT COLUMN (Desktop Only, omitted on touch devices): Live crossfading preview panel */}
          {!isCoarsePointer && (
            <aside
              aria-label="Route live preview"
              data-testid="field-index-live-preview"
              className="field-index-preview-col hidden lg:block lg:col-span-5 lg:sticky lg:top-8"
            >
              <div
                key={previewRoute.id}
                data-preview-route={previewRoute.id}
                className="border p-6 space-y-5 panel-enter"
                style={{
                  borderColor: 'rgba(242, 238, 232, 0.2)',
                  backgroundColor: '#282527',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div
                  className="flex items-center justify-between gap-3 font-mono uppercase tracking-[var(--tracking-micro)]"
                  style={{ fontSize: 'var(--text-micro)' }}
                >
                  <span style={{ color: '#f0642d' }}>
                    {previewNumberStr} · {previewRoute.group.toUpperCase()}
                  </span>
                  <span style={{ color: '#968f86' }}>
                    shortcut [{previewRoute.shortcut}]
                  </span>
                </div>

                {/* Crossfading illustration */}
                <div className="overflow-hidden rounded-[2px]">
                  <RoutePreviewIllustration route={previewRoute} />
                </div>

                <div className="space-y-2">
                  <div
                    className="font-display uppercase"
                    style={{
                      fontSize: 'clamp(1.6rem, 2.4vw, 2.2rem)',
                      lineHeight: 1.05,
                      color: '#f2eee8',
                    }}
                  >
                    {previewRoute.label}
                  </div>
                  <p
                    className="m-0 font-body"
                    style={{
                      fontSize: 'var(--text-meta)',
                      lineHeight: 1.6,
                      color: '#b8b1a7',
                    }}
                  >
                    {previewRoute.description}
                  </p>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* BOTTOM BAR: keyboard hints, EDITORIAL/RAW toggle, current time, and theme toggle */}
      <footer
        aria-label="Field index controls and keyboard hints"
        className="shrink-0 border-t"
        style={{
          borderColor: 'rgba(242, 238, 232, 0.14)',
          backgroundColor: '#191718',
        }}
      >
        <div className="editorial-shell py-3.5 flex flex-wrap items-center justify-between gap-4 font-mono">
          {/* Keyboard hints */}
          <span
            data-testid="field-index-key-hints"
            className="uppercase tracking-[var(--tracking-micro)]"
            style={{
              fontSize: 'var(--text-micro)',
              color: '#b8b1a7',
            }}
          >
            esc close, up/down move, enter go, / search · 1-9 jump
          </span>

          <div className="flex flex-wrap items-center gap-4">
            {/* EDITORIAL / RAW toggle */}
            {onViewModeChange && (
              <div
                role="group"
                aria-label="Overlay document view mode"
                className="inline-flex items-center p-0.5 border"
                style={{
                  borderColor: 'rgba(242, 238, 232, 0.2)',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: '#201e1f',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    onViewModeChange('editorial');
                    onClose();
                  }}
                  aria-pressed={viewMode === 'editorial'}
                  className="px-2.5 py-1 uppercase tracking-[var(--tracking-micro)] cursor-pointer"
                  style={{
                    fontSize: 'var(--text-micro)',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor:
                      viewMode === 'editorial' ? '#f2eee8' : 'transparent',
                    color: viewMode === 'editorial' ? '#201e1f' : '#b8b1a7',
                  }}
                >
                  editorial
                </button>
                <button
                  type="button"
                  onPointerEnter={() => preloadRoute('raw')}
                  onClick={() => {
                    onViewModeChange('raw');
                    onClose();
                  }}
                  aria-pressed={viewMode === 'raw'}
                  className="px-2.5 py-1 uppercase tracking-[var(--tracking-micro)] cursor-pointer"
                  style={{
                    fontSize: 'var(--text-micro)',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor:
                      viewMode === 'raw' ? '#f2eee8' : 'transparent',
                    color: viewMode === 'raw' ? '#201e1f' : '#b8b1a7',
                  }}
                >
                  raw .md
                </button>
              </div>
            )}

            {/* Theme toggle (Night / Paper / Sepia) */}
            <div
              role="group"
              aria-label="Overlay color theme"
              className="inline-flex items-center p-0.5 border"
              style={{
                borderColor: 'rgba(242, 238, 232, 0.2)',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: '#201e1f',
              }}
            >
              {READING_THEME_OPTIONS.filter((opt) => opt.id !== 'system').map(
                (opt) => {
                  const active = readingPrefs.theme === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => cycleTheme(opt.id)}
                      aria-pressed={active}
                      className="px-2 py-1 uppercase tracking-[var(--tracking-micro)] cursor-pointer"
                      style={{
                        fontSize: 'var(--text-micro)',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: active ? '#f0642d' : 'transparent',
                        color: active ? '#201e1f' : '#b8b1a7',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                },
              )}
            </div>

            {/* Live current time */}
            <time
              data-testid="field-index-clock"
              className="tabular-nums uppercase tracking-[var(--tracking-micro)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: '#f2eee8',
              }}
            >
              {clockText}
            </time>
          </div>
        </div>
      </footer>
    </div>
  );
}
