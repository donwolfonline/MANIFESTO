import { motion, useReducedMotion } from 'framer-motion';
import { useLenis } from '../lib/lenis';
import type { ManifestoMeta, ManifestoStats } from '../lib/markdown';
import { EASE_OUT_EXPO } from '../lib/motion';

interface FooterProps {
  meta: ManifestoMeta;
  stats: ManifestoStats;
}

export function Footer({ meta, stats }: FooterProps) {
  const { scrollTo, isReducedMotion } = useLenis();
  const prefersReducedMotion = Boolean(useReducedMotion());

  // Split title cleanly on trailing extension (e.g. "MANIFESTO" + "." + "md")
  const extIndex = meta.title.lastIndexOf('.');
  const hasExtension = extIndex > 0 && extIndex < meta.title.length - 1;
  const wordmarkStem = hasExtension ? meta.title.slice(0, extIndex) : meta.title;
  const wordmarkExt = hasExtension ? meta.title.slice(extIndex + 1) : '';

  return (
    <footer
      className="mt-16 sm:mt-24 border-t overflow-hidden"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      {/* Compact colophon metadata strip */}
      <div className="editorial-shell pt-10 pb-8 sm:pt-12 sm:pb-10">
        <div
          className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 font-mono uppercase tracking-[var(--tracking-micro)]"
          style={{
            fontSize: 'var(--text-micro)',
            color: 'var(--color-text-muted)',
          }}
        >
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span>File: {meta.filename}</span>
            <span>Words: {stats.wordCount}</span>
            <span>Lines: {stats.lineCount}</span>
            <span className="hidden sm:inline">
              Motion: {isReducedMotion ? 'Reduced' : 'Lenis Smooth'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => scrollTo(0, { offset: 0 })}
            className="link-draw link-draw--resting inline-flex items-center gap-2 transition-colors hover:text-[var(--color-accent)] cursor-pointer"
            style={{
              fontSize: 'var(--text-micro)',
              color: 'var(--color-text)',
            }}
          >
            Back to top <span aria-hidden="true">↑</span>
          </button>
        </div>
      </div>

      {/* Oversized footer wordmark that slides up on reveal */}
      <div className="editorial-shell pt-4 pb-6 sm:pt-8 sm:pb-10">
        <div className="overflow-hidden pt-[0.06em]">
          <motion.p
            aria-hidden="true"
            className="m-0 font-display font-normal text-center select-none whitespace-nowrap"
            style={{
              fontSize: 'clamp(2.65rem, 13.5vw, 13rem)',
              lineHeight: 0.84,
              letterSpacing: '-0.035em',
              color: 'var(--color-text)',
            }}
            initial={
              prefersReducedMotion ? false : { y: '105%', opacity: 0 }
            }
            whileInView={{ y: '0%', opacity: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{
              duration: prefersReducedMotion ? 0 : 1.0,
              ease: EASE_OUT_EXPO,
            }}
          >
            <span>{wordmarkStem}</span>
            {hasExtension && (
              <>
                <span style={{ color: 'var(--color-accent)' }}>.</span>
                <span
                  className="italic"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {wordmarkExt}
                </span>
              </>
            )}
          </motion.p>
        </div>
      </div>
    </footer>
  );
}
