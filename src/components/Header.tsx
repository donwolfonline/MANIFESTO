import { useEffect, useRef, useState } from 'react';
import { useScroll } from 'framer-motion';
import { useLenis } from '../lib/lenis';
import type { OverlayOrigin } from './IndexOverlay';

export type ViewMode = 'editorial' | 'raw';

export interface HeaderProps {
  filename: string;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  /** Custom "watch index"-style trigger label for the full-screen menu */
  indexLabel?: string;
  /** Whether the full-screen index overlay is currently open */
  isIndexOpen: boolean;
  /** Called with the button center coordinates so the overlay wipes from the button */
  onToggleIndex: (origin: OverlayOrigin) => void;
}

export function Header({
  filename,
  viewMode,
  onViewModeChange,
  indexLabel = 'field index',
  isIndexOpen,
  onToggleIndex,
}: HeaderProps) {
  const { scrollTo } = useLenis();
  const { scrollY, scrollYProgress } = useScroll();
  const [percent, setPercent] = useState(0);
  const [scrolled, setScrolled] = useState(viewMode === 'raw');
  const indexButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const syncState = (latestY: number) => {
      setScrolled(viewMode === 'raw' || latestY > 24);
    };

    syncState(scrollY.get());
    const unsubY = scrollY.on('change', syncState);
    const unsubProgress = scrollYProgress.on('change', (latest) => {
      setPercent(Math.round(latest * 100));
    });

    return () => {
      unsubY();
      unsubProgress();
    };
  }, [scrollY, scrollYProgress, viewMode]);

  const handleIndexClick = () => {
    const rect = indexButtonRef.current?.getBoundingClientRect();
    const origin: OverlayOrigin = rect
      ? {
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2),
        }
      : { x: window.innerWidth - 48, y: 34 };

    onToggleIndex(origin);
  };

  return (
    <header
      className="fixed top-0 right-0 left-0 transition-[background-color,border-color,backdrop-filter]"
      style={{
        height: 'var(--header-height)',
        zIndex: 'var(--z-header)',
        backgroundColor: scrolled ? 'var(--color-bg-glass)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled
          ? '1px solid var(--color-border)'
          : '1px solid transparent',
        transitionDuration: 'var(--duration-base)',
        transitionTimingFunction: 'var(--ease-editorial)',
      }}
    >
      <div className="editorial-shell h-full flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => scrollTo(0, { offset: 0 })}
          className="group inline-flex items-center gap-2.5 text-left cursor-pointer"
          aria-label="Scroll to top of manifesto"
        >
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: 'var(--color-accent)' }}
          />
          <span
            className="link-draw font-mono uppercase tracking-[var(--tracking-mono)]"
            style={{
              fontSize: 'var(--text-meta)',
              color: 'var(--color-text)',
            }}
          >
            ~/{filename}
          </span>
        </button>

        <div className="flex items-center gap-4 sm:gap-6">
          <span
            aria-live="off"
            className="hidden md:inline-block font-mono tabular-nums tracking-[var(--tracking-mono)]"
            style={{
              fontSize: 'var(--text-micro)',
              color: 'var(--color-text-muted)',
            }}
          >
            {String(percent).padStart(2, '0')}%
          </span>

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
              className="px-2.5 py-1 font-mono uppercase tracking-[var(--tracking-micro)] transition-colors cursor-pointer"
              style={{
                fontSize: 'var(--text-micro)',
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
              Editorial
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('raw')}
              aria-pressed={viewMode === 'raw'}
              className="px-2.5 py-1 font-mono uppercase tracking-[var(--tracking-micro)] transition-colors cursor-pointer"
              style={{
                fontSize: 'var(--text-micro)',
                borderRadius: 'var(--radius-xs)',
                backgroundColor:
                  viewMode === 'raw' ? 'var(--color-text)' : 'transparent',
                color:
                  viewMode === 'raw'
                    ? 'var(--color-bg)'
                    : 'var(--color-text-muted)',
              }}
            >
              Raw .md
            </button>
          </div>

          {/* "watch index"-style trigger button opening the circle-wipe overlay */}
          <button
            ref={indexButtonRef}
            type="button"
            onClick={handleIndexClick}
            aria-expanded={isIndexOpen}
            aria-haspopup="dialog"
            className="group inline-flex items-center gap-2 font-mono uppercase tracking-[var(--tracking-micro)] py-1 cursor-pointer"
            style={{
              fontSize: 'var(--text-micro)',
              color: 'var(--color-text)',
            }}
          >
            <span className="link-draw">{indexLabel}</span>
            <span
              aria-hidden="true"
              className="font-mono"
              style={{ color: 'var(--color-accent)' }}
            >
              {isIndexOpen ? '[×]' : '[+]'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
