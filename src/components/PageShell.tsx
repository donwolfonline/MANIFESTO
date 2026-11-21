import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLenis } from '../lib/lenis';
import type { ManifestoMeta } from '../lib/markdown';
import {
  applyPageSeoMeta,
  getPageShellInfo,
} from '../lib/pageShellMeta';
import { getPreloadHandlers } from '../lib/routePreload';
import { usePrefersReducedMotion } from '../lib/useViewportActivity';
import type { ViewMode } from './Header';
import type { OverlayOrigin } from './IndexOverlay';

export interface PageShellProps {
  /** Active pathname (e.g. "/bug-museum", "/naming", "/notes/principles/...") */
  pathname: string;
  meta: ManifestoMeta;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  isIndexOpen?: boolean;
  onToggleIndex?: (origin: OverlayOrigin) => void;
  onNavigate?: (target: string) => void;
  /** Optional overrides for custom intro badges, titles, descriptions, or status lines */
  indexLabel?: string;
  title?: string;
  description?: string;
  statusLine?: string;
  /** Hide sticky header + bottom prev/next links (e.g. distraction-free Reading Mode on /notes) */
  hideChrome?: boolean;
  /** Override intro block visibility (default: true) */
  showIntro?: boolean;
  children: ReactNode;
}

export function PageShell({
  pathname,
  meta,
  viewMode = 'editorial',
  onViewModeChange,
  isIndexOpen = false,
  onToggleIndex,
  onNavigate,
  indexLabel,
  title,
  description,
  statusLine,
  hideChrome = false,
  showIntro = true,
  children,
}: PageShellProps) {
  const { scrollTo } = useLenis();
  const prefersReducedMotion = usePrefersReducedMotion();
  const indexButtonRef = useRef<HTMLButtonElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const lastScrollYRef = useRef<number>(
    typeof window !== 'undefined' ? window.scrollY || 0 : 0,
  );

  const [headerHidden, setHeaderHidden] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<'prev' | 'next' | null>(null);

  const { breadcrumbs, info } = useMemo(
    () => getPageShellInfo(pathname, meta.filename, meta.title),
    [pathname, meta.filename, meta.title],
  );

  const resolvedIndex = indexLabel ?? info.monoIndex;
  const resolvedTitle = title ?? info.title;
  const resolvedDescription = description ?? info.description;
  const resolvedStatus = statusLine ?? info.statusLine;

  // Apply per-page document.title, meta description, canonical, and Open Graph tags
  useEffect(() => {
    applyPageSeoMeta({
      title: info.seoTitle,
      description: info.seoDescription,
      url: info.ogUrl,
    });
  }, [info.seoTitle, info.seoDescription, info.ogUrl]);

  // Reset header visibility when pathname changes
  useEffect(() => {
    setHeaderHidden(false);
    lastScrollYRef.current =
      typeof window !== 'undefined' ? window.scrollY || 0 : 0;
  }, [pathname]);

  // Hide-on-scroll-down / show-on-scroll-up sticky header + 2px top orange progress bar
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      const currentY = Math.max(0, window.scrollY || 0);
      const maxScroll = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const pct = Math.min(100, Math.max(0, (currentY / maxScroll) * 100));

      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleX(${(pct / 100).toFixed(4)})`;
        progressBarRef.current.setAttribute(
          'aria-valuenow',
          String(Math.round(pct)),
        );
        progressBarRef.current.setAttribute(
          'data-progress-pct',
          pct.toFixed(1),
        );
      }

      const prevY = lastScrollYRef.current;
      const delta = currentY - prevY;

      if (currentY <= 48) {
        setHeaderHidden(false);
      } else if (delta > 6) {
        setHeaderHidden(true);
      } else if (delta < -4) {
        setHeaderHidden(false);
      }

      lastScrollYRef.current = currentY;
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [pathname]);

  const handleOpenIndex = () => {
    if (!onToggleIndex) return;
    const rect = indexButtonRef.current?.getBoundingClientRect();
    const origin: OverlayOrigin = rect
      ? {
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2),
        }
      : { x: typeof window !== 'undefined' ? window.innerWidth - 48 : 1200, y: 26 };
    onToggleIndex(origin);
  };

  const navigateTarget = (target: string) => {
    if (onNavigate) {
      onNavigate(target);
      return;
    }
    if (target === 'home') {
      window.location.href = '/';
    } else {
      window.location.href = target.startsWith('/') ? target : `/${target}`;
    }
  };

  return (
    <div
      data-testid="page-shell"
      data-route-id={info.routeId}
      className="pageshell-root relative min-h-dvh flex flex-col"
      style={{
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)',
      }}
    >
      {/* 2px orange scroll progress bar pinned at the very top of the viewport */}
      <div
        role="progressbar"
        aria-label="Page reading progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
        data-testid="pageshell-progress-bar"
        ref={progressBarRef}
        className="fixed top-0 left-0 right-0 pointer-events-none origin-left"
        style={{
          height: '2px',
          zIndex: 'calc(var(--z-header) + 5)',
          backgroundColor: 'var(--color-accent)',
          transform: 'scaleX(0)',
        }}
      />

      {/* Compact Sticky Header with Clickable Breadcrumb + Hide-on-Scroll-Down / Show-on-Scroll-Up */}
      {!hideChrome && (
        <header
          data-testid="pageshell-header"
          data-header-hidden={headerHidden ? 'true' : 'false'}
          className="sticky top-0 shrink-0 border-b"
          style={{
            height: 'calc(3.25rem + env(safe-area-inset-top, 0px))',
            paddingTop: 'env(safe-area-inset-top, 0px)',
            zIndex: 'var(--z-header)',
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-header-scroll-bg)',
            backdropFilter: 'blur(12px) saturate(140%)',
            WebkitBackdropFilter: 'blur(12px) saturate(140%)',
            transform: headerHidden
              ? 'translate3d(0, -100%, 0)'
              : 'translate3d(0, 0, 0)',
            transition: prefersReducedMotion
              ? undefined
              : 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <div className="editorial-shell h-full flex items-center justify-between gap-3 sm:gap-4 font-mono">
            {/* Clickable Breadcrumb Trail: "~/working_copy.md / bug-museum" */}
            <nav
              aria-label="Breadcrumb"
              data-testid="pageshell-breadcrumb"
              className="flex items-center gap-2 min-w-0 overflow-x-auto whitespace-nowrap"
              style={{ fontSize: 'var(--text-micro)' }}
            >
              <span
                aria-hidden="true"
                className="header-status-dot inline-block h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: 'var(--color-accent)' }}
              />

              {breadcrumbs.map((crumb, idx) => (
                <Fragment key={`${crumb.href}-${idx}`}>
                  {idx > 0 && (
                    <span
                      aria-hidden="true"
                      className="select-none"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      /
                    </span>
                  )}

                  <a
                    href={crumb.href}
                    data-testid={`breadcrumb-part-${idx}`}
                    data-breadcrumb-accent={crumb.isLast ? 'true' : 'false'}
                    {...getPreloadHandlers(crumb.preloadKey)}
                    onClick={(e) => {
                      e.preventDefault();
                      if (crumb.isLast) {
                        scrollTo(0, { offset: 0 });
                      } else {
                        navigateTarget(crumb.target);
                      }
                    }}
                    className="link-draw lowercase tracking-[var(--tracking-mono)] transition-colors hover:text-[var(--color-text)]"
                    style={{
                      color: crumb.isLast
                        ? 'var(--color-accent)'
                        : 'var(--color-text-secondary)',
                    }}
                  >
                    {crumb.label}
                  </a>
                </Fragment>
              ))}
            </nav>

            {/* Right compact controls: ED | .MD view toggle + FIELD INDEX [+] */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              {onViewModeChange && (
                <div
                  role="group"
                  aria-label="Document view mode"
                  className="hidden sm:inline-flex items-center p-0.5 border"
                  style={{
                    borderColor: 'var(--color-border)',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'var(--color-bg-subtle)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onViewModeChange('editorial')}
                    aria-pressed={viewMode === 'editorial'}
                    className="px-2 py-0.5 font-mono uppercase cursor-pointer"
                    style={{
                      fontSize: '0.625rem',
                      letterSpacing: '0.12em',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor:
                        viewMode === 'editorial'
                          ? 'var(--color-text)'
                          : 'transparent',
                      color:
                        viewMode === 'editorial'
                          ? 'var(--color-bg)'
                          : 'var(--color-text-muted)',
                    }}
                  >
                    ed
                  </button>
                  <button
                    type="button"
                    {...getPreloadHandlers('raw')}
                    onClick={() => onViewModeChange('raw')}
                    aria-pressed={viewMode === 'raw'}
                    className="px-2 py-0.5 font-mono uppercase cursor-pointer"
                    style={{
                      fontSize: '0.625rem',
                      letterSpacing: '0.12em',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor:
                        viewMode === 'raw'
                          ? 'var(--color-text)'
                          : 'transparent',
                      color:
                        viewMode === 'raw'
                          ? 'var(--color-bg)'
                          : 'var(--color-text-muted)',
                    }}
                  >
                    .md
                  </button>
                </div>
              )}

              {onToggleIndex && (
                <button
                  ref={indexButtonRef}
                  type="button"
                  data-testid="pageshell-index-trigger"
                  onClick={handleOpenIndex}
                  aria-expanded={isIndexOpen}
                  aria-haspopup="dialog"
                  className="header-touch-target group header-mono-item inline-flex items-center gap-1.5 py-1 cursor-pointer"
                >
                  <span className="hidden sm:inline link-draw">
                    field index
                  </span>
                  <span
                    aria-hidden="true"
                    className="inline-flex items-center font-mono"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    <span>[</span>
                    <span>{isIndexOpen ? 'x' : '+'}</span>
                    <span>]</span>
                  </span>
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Unified Page Intro Block: tiny mono index ("02 / play"), large serif title, 1-line desc, status line */}
      {showIntro && !hideChrome && (
        <section
          aria-label="Page introduction"
          data-testid="pageshell-intro"
          className="editorial-shell pt-8 pb-6 sm:pt-12 sm:pb-8 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-3">
              <p
                data-testid="pageshell-index"
                className="m-0 font-mono uppercase tracking-[var(--tracking-micro)] flex items-center gap-2.5"
                style={{
                  fontSize: 'var(--text-micro)',
                  color: 'var(--color-accent)',
                }}
              >
                <span>{resolvedIndex}</span>
                <span
                  aria-hidden="true"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  ·
                </span>
                <span style={{ color: 'var(--color-text-muted)' }}>
                  #{info.indexNumber}
                </span>
              </p>

              <h1
                data-testid="pageshell-title"
                className="m-0 font-display font-normal"
                style={{
                  fontSize: 'clamp(2.5rem, 6vw, 4.85rem)',
                  lineHeight: 0.94,
                  letterSpacing: 'var(--tracking-display)',
                  color: 'var(--color-text)',
                  viewTransitionName: 'route-heading',
                }}
              >
                {resolvedTitle}
                <span style={{ color: 'var(--color-accent)' }}>.</span>
              </h1>

              <p
                data-testid="pageshell-description"
                className="m-0 font-body"
                style={{
                  maxWidth: '58ch',
                  fontSize: 'var(--text-body)',
                  lineHeight: 1.55,
                  color: 'var(--color-text-secondary)',
                }}
              >
                {resolvedDescription}
              </p>
            </div>

            <p
              data-testid="pageshell-status"
              className="m-0 font-mono lowercase tracking-[var(--tracking-micro)] shrink-0 px-3 py-1.5 border self-start md:self-end"
              style={{
                fontSize: 'var(--text-micro)',
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg-elevated)',
                borderRadius: 'var(--radius-xs)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {resolvedStatus}
            </p>
          </div>
        </section>
      )}

      {/* Wrapped Page Body */}
      <div className="pageshell-body flex-1 flex flex-col">{children}</div>

      {/* Bottom Prev / Next Field-Index Links with Live Hover Preview */}
      {!hideChrome && (info.prevRoute || info.nextRoute) && (
        <nav
          aria-label="Field index adjacent pages"
          data-testid="pageshell-prev-next"
          className="border-t mt-auto"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-bg-elevated)',
          }}
        >
          <div className="editorial-shell py-8 sm:py-10 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            {/* Previous Route */}
            {info.prevRoute ? (
              <a
                href={info.prevRoute.path}
                data-testid="pageshell-prev-link"
                {...getPreloadHandlers(info.prevRoute.id)}
                onMouseEnter={() => {
                  getPreloadHandlers(info.prevRoute!.id).onPointerEnter();
                  setHoveredNav('prev');
                }}
                onMouseLeave={() => setHoveredNav(null)}
                onFocus={() => {
                  getPreloadHandlers(info.prevRoute!.id).onFocus();
                  setHoveredNav('prev');
                }}
                onBlur={() => setHoveredNav(null)}
                onClick={(e) => {
                  e.preventDefault();
                  navigateTarget(info.prevRoute!.id);
                }}
                className="group relative p-5 border flex flex-col justify-between gap-4 transition-colors hover:border-[var(--color-accent)] focus-visible:border-[var(--color-accent)]"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-bg)',
                  borderRadius: 'var(--radius-xs)',
                }}
              >
                <div className="flex items-center justify-between gap-3 font-mono uppercase tracking-[var(--tracking-micro)]">
                  <span
                    style={{
                      fontSize: 'var(--text-micro)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    ← prev · {info.prevRoute.group}
                  </span>
                  <span
                    style={{
                      fontSize: 'var(--text-micro)',
                      color: 'var(--color-accent)',
                    }}
                  >
                    {info.prevRoute.shortcut}
                  </span>
                </div>

                <div className="flex items-baseline gap-3">
                  <span
                    aria-hidden="true"
                    className="inline-flex items-center shrink-0"
                    style={{ color: 'var(--color-accent)' }}
                    dangerouslySetInnerHTML={{
                      __html: info.prevRoute.icon,
                    }}
                  />
                  <span
                    className="link-draw font-display uppercase"
                    style={{
                      fontSize: 'clamp(1.5rem, 2.8vw, 2.25rem)',
                      lineHeight: 1.05,
                      color: 'var(--color-text)',
                    }}
                  >
                    {info.prevRoute.label}
                  </span>
                </div>

                {/* Hover / Focus Preview Panel */}
                <div
                  data-testid="pageshell-prev-preview"
                  data-preview-visible={hoveredNav === 'prev' ? 'true' : 'false'}
                  className="pt-3 border-t transition-all duration-200"
                  style={{
                    borderColor: 'var(--color-border)',
                    opacity: hoveredNav === 'prev' ? 1 : 0.72,
                    transform:
                      hoveredNav === 'prev'
                        ? 'translate3d(0, 0, 0)'
                        : 'translate3d(0, 2px, 0)',
                  }}
                >
                  <p
                    className="m-0 font-body"
                    style={{
                      fontSize: 'var(--text-meta)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {info.prevRoute.description}
                  </p>
                </div>
              </a>
            ) : (
              <div />
            )}

            {/* Next Route */}
            {info.nextRoute && (
              <a
                href={info.nextRoute.path}
                data-testid="pageshell-next-link"
                {...getPreloadHandlers(info.nextRoute.id)}
                onMouseEnter={() => {
                  getPreloadHandlers(info.nextRoute!.id).onPointerEnter();
                  setHoveredNav('next');
                }}
                onMouseLeave={() => setHoveredNav(null)}
                onFocus={() => {
                  getPreloadHandlers(info.nextRoute!.id).onFocus();
                  setHoveredNav('next');
                }}
                onBlur={() => setHoveredNav(null)}
                onClick={(e) => {
                  e.preventDefault();
                  navigateTarget(info.nextRoute!.id);
                }}
                className="group relative p-5 border flex flex-col justify-between gap-4 text-right transition-colors hover:border-[var(--color-accent)] focus-visible:border-[var(--color-accent)]"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-bg)',
                  borderRadius: 'var(--radius-xs)',
                }}
              >
                <div className="flex items-center justify-between gap-3 font-mono uppercase tracking-[var(--tracking-micro)]">
                  <span
                    style={{
                      fontSize: 'var(--text-micro)',
                      color: 'var(--color-accent)',
                    }}
                  >
                    {info.nextRoute.shortcut}
                  </span>
                  <span
                    style={{
                      fontSize: 'var(--text-micro)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {info.nextRoute.group} · next →
                  </span>
                </div>

                <div className="flex items-baseline justify-end gap-3">
                  <span
                    className="link-draw font-display uppercase"
                    style={{
                      fontSize: 'clamp(1.5rem, 2.8vw, 2.25rem)',
                      lineHeight: 1.05,
                      color: 'var(--color-text)',
                    }}
                  >
                    {info.nextRoute.label}
                  </span>
                  <span
                    aria-hidden="true"
                    className="inline-flex items-center shrink-0"
                    style={{ color: 'var(--color-accent)' }}
                    dangerouslySetInnerHTML={{
                      __html: info.nextRoute.icon,
                    }}
                  />
                </div>

                {/* Hover / Focus Preview Panel */}
                <div
                  data-testid="pageshell-next-preview"
                  data-preview-visible={hoveredNav === 'next' ? 'true' : 'false'}
                  className="pt-3 border-t transition-all duration-200"
                  style={{
                    borderColor: 'var(--color-border)',
                    opacity: hoveredNav === 'next' ? 1 : 0.72,
                    transform:
                      hoveredNav === 'next'
                        ? 'translate3d(0, 0, 0)'
                        : 'translate3d(0, 2px, 0)',
                  }}
                >
                  <p
                    className="m-0 font-body"
                    style={{
                      fontSize: 'var(--text-meta)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {info.nextRoute.description}
                  </p>
                </div>
              </a>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
