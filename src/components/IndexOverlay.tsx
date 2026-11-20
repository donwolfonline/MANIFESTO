import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useLenis } from '../lib/lenis';
import { EASE_OUT_EXPO } from '../lib/motion';

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
  /** Viewport coordinates (px) of the trigger button for the clip-path circle wipe */
  origin: OverlayOrigin;
  /** Primary page sections displayed in giant display type */
  sections: OverlaySectionItem[];
  /** Callback when a primary section is selected */
  onSelectSection: (sectionId: string) => void;
  /** Optional quick links for the 10 reading items */
  readingItems?: { number: number; title: string }[];
  onSelectReadingItem?: (itemNumber: number) => void;
  /** Header title displayed inside the overlay */
  filename?: string;
  /** Optional mobile view-mode switch inside the overlay */
  viewMode?: 'editorial' | 'raw';
  onViewModeChange?: (mode: 'editorial' | 'raw') => void;
}

export function IndexOverlay({
  isOpen,
  onClose,
  origin,
  sections,
  onSelectSection,
  readingItems = [],
  onSelectReadingItem,
  filename = 'manifesto.md',
  viewMode,
  onViewModeChange,
}: IndexOverlayProps) {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const { lenis } = useLenis();
  const [maxRadius, setMaxRadius] = useState<number>(1800);

  // Compute exact corner-to-origin diagonal radius so the circle wipe covers 100% of any screen
  useEffect(() => {
    if (!isOpen) return;
    const dx = Math.max(origin.x, window.innerWidth - origin.x);
    const dy = Math.max(origin.y, window.innerHeight - origin.y);
    setMaxRadius(Math.ceil(Math.hypot(dx, dy)) + 32);
  }, [isOpen, origin.x, origin.y]);

  // Pause Lenis scroll and listen for Escape while overlay is open
  useEffect(() => {
    if (!isOpen) return;

    lenis?.stop();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      lenis?.start();
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, lenis, onClose]);

  const closedClip = `circle(0px at ${origin.x}px ${origin.y}px)`;
  const openClip = `circle(${maxRadius}px at ${origin.x}px ${origin.y}px)`;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Manifesto section index"
          className="fixed inset-0 flex flex-col overflow-y-auto"
          style={{
            zIndex: 'var(--z-overlay)',
            backgroundColor: '#191718',
            color: 'var(--color-text)',
          }}
          initial={
            prefersReducedMotion
              ? { opacity: 0 }
              : { clipPath: closedClip }
          }
          animate={
            prefersReducedMotion
              ? { opacity: 1 }
              : { clipPath: openClip }
          }
          exit={
            prefersReducedMotion
              ? { opacity: 0 }
              : { clipPath: closedClip }
          }
          transition={{
            duration: prefersReducedMotion ? 0.12 : 0.72,
            ease: EASE_OUT_EXPO,
          }}
        >
          {/* Top overlay bar matching header geometry */}
          <div
            className="shrink-0 border-b"
            style={{
              height: 'var(--header-height)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="editorial-shell h-full flex items-center justify-between gap-4">
              <span
                className="font-mono uppercase tracking-[var(--tracking-mono)] flex items-center gap-2.5"
                style={{
                  fontSize: 'var(--text-meta)',
                  color: 'var(--color-text-muted)',
                }}
              >
                <span
                  aria-hidden="true"
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                />
                <span>~/{filename} — index</span>
              </span>

              <button
                type="button"
                onClick={onClose}
                className="link-draw font-mono uppercase tracking-[var(--tracking-micro)] py-1 cursor-pointer"
                style={{
                  fontSize: 'var(--text-micro)',
                  color: 'var(--color-text)',
                }}
                autoFocus
              >
                close [esc]
              </button>
            </div>
          </div>

          {/* Overlay body: primary sections + quick 1–10 jump list */}
          <div className="editorial-shell my-auto py-12 sm:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-start">
              {/* Primary sections */}
              <nav
                aria-label="Primary sections"
                className="lg:col-span-7"
              >
                <p
                  className="m-0 mb-6 font-mono uppercase tracking-[var(--tracking-micro)]"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Sections
                </p>

                <ol className="list-none p-0 m-0 divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {sections.map((section, idx) => (
                    <motion.li
                      key={section.id}
                      initial={
                        prefersReducedMotion
                          ? false
                          : { opacity: 0, y: 20 }
                      }
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: prefersReducedMotion ? 0 : 0.55,
                        delay: prefersReducedMotion ? 0 : 0.14 + idx * 0.055,
                        ease: EASE_OUT_EXPO,
                      }}
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          window.requestAnimationFrame(() =>
                            onSelectSection(section.id),
                          );
                        }}
                        className="group w-full py-4 sm:py-5 flex items-baseline justify-between gap-4 text-left cursor-pointer"
                      >
                        <span className="flex items-baseline gap-4 sm:gap-6">
                          <span
                            className="font-mono tabular-nums tracking-[var(--tracking-micro)]"
                            style={{
                              fontSize: 'var(--text-micro)',
                              color: 'var(--color-accent)',
                            }}
                          >
                            {section.index}
                          </span>
                          <span
                            className="link-draw font-display font-normal transition-colors group-hover:italic"
                            style={{
                              fontSize: 'clamp(1.85rem, 4.2vw, 3.6rem)',
                              lineHeight: 1.05,
                              letterSpacing: 'var(--tracking-section)',
                              color: 'var(--color-text)',
                            }}
                          >
                            {section.label}
                          </span>
                        </span>

                        {section.meta && (
                          <span
                            className="hidden sm:inline-block shrink-0 font-mono uppercase tracking-[var(--tracking-micro)]"
                            style={{
                              fontSize: 'var(--text-micro)',
                              color: 'var(--color-text-muted)',
                            }}
                          >
                            {section.meta}
                          </span>
                        )}
                      </button>
                    </motion.li>
                  ))}
                </ol>
              </nav>

              {/* Secondary list: quick jump to items 01–10 */}
              {readingItems.length > 0 && onSelectReadingItem && (
                <motion.aside
                  initial={
                    prefersReducedMotion ? false : { opacity: 0, y: 16 }
                  }
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: prefersReducedMotion ? 0 : 0.55,
                    delay: prefersReducedMotion ? 0 : 0.34,
                    ease: EASE_OUT_EXPO,
                  }}
                  className="lg:col-span-5 lg:pl-8 lg:border-l"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <p
                    className="m-0 mb-6 font-mono uppercase tracking-[var(--tracking-micro)]"
                    style={{
                      fontSize: 'var(--text-micro)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    In #read ({readingItems.length} Notes)
                  </p>

                  <ol className="list-none p-0 m-0 space-y-3">
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
                          className="group flex items-baseline gap-3 text-left font-mono cursor-pointer"
                          style={{
                            fontSize: 'var(--text-micro)',
                            color: 'var(--color-text-secondary)',
                          }}
                        >
                          <span
                            className="tabular-nums shrink-0"
                            style={{ color: 'var(--color-text-muted)' }}
                          >
                            {String(item.number).padStart(2, '0')}
                          </span>
                          <span className="link-draw group-hover:text-[var(--color-text)] transition-colors">
                            {item.title}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </motion.aside>
              )}
            </div>

            {/* Mobile view-mode toggle inside overlay */}
            {viewMode && onViewModeChange && (
              <div
                className="sm:hidden mt-10 pt-6 border-t flex items-center justify-between gap-4"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <span
                  className="font-mono uppercase tracking-[var(--tracking-micro)]"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  View Mode
                </span>
                <div
                  role="group"
                  aria-label="Document view mode (mobile)"
                  className="inline-flex items-center p-0.5 border"
                  style={{
                    borderColor: 'var(--color-border)',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'var(--color-bg-subtle)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onViewModeChange('editorial');
                      onClose();
                    }}
                    aria-pressed={viewMode === 'editorial'}
                    className="px-2.5 py-1 font-mono uppercase tracking-[var(--tracking-micro)] cursor-pointer"
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
                    onClick={() => {
                      onViewModeChange('raw');
                      onClose();
                    }}
                    aria-pressed={viewMode === 'raw'}
                    className="px-2.5 py-1 font-mono uppercase tracking-[var(--tracking-micro)] cursor-pointer"
                    style={{
                      fontSize: 'var(--text-micro)',
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
                    Raw .md
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
