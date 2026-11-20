import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { ManifestoMeta, ManifestoStats } from '../lib/markdown';
import { EASE_EDITORIAL, MOTION_DURATION } from '../lib/motion';

interface RawMarkdownViewProps {
  raw: string;
  meta: ManifestoMeta;
  stats: ManifestoStats;
}

function getLineColor(line: string, inFrontmatter: boolean): string {
  if (line.trim() === '---') return 'var(--color-accent)';
  if (inFrontmatter) return 'var(--color-text-muted)';
  if (/^#{1,3}\s/.test(line)) return 'var(--color-text)';
  if (/^>\s/.test(line)) return 'var(--color-accent)';
  return 'var(--color-text-secondary)';
}

export function RawMarkdownView({ raw, meta, stats }: RawMarkdownViewProps) {
  const prefersReducedMotion = useReducedMotion();
  const [copied, setCopied] = useState(false);

  const lines = raw.split('\n');
  let frontmatterBoundaryCount = 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <motion.section
      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: MOTION_DURATION.base, ease: EASE_EDITORIAL }}
      className="editorial-shell pt-28 sm:pt-36 pb-12"
      aria-label="Raw Markdown source"
    >
      <div
        className="max-w-[78ch] mx-auto border"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-bg-elevated)',
          borderRadius: 'var(--radius-xs)',
        }}
      >
        {/* File bar */}
        <div
          className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 border-b font-mono uppercase tracking-[var(--tracking-micro)]"
          style={{
            fontSize: 'var(--text-micro)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-muted)',
          }}
        >
          <div className="flex items-center gap-4">
            <span style={{ color: 'var(--color-text)' }}>
              src/content/{meta.filename}
            </span>
            <span>{stats.lineCount} Lines</span>
            <span className="hidden sm:inline">{stats.charCount} Bytes</span>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="font-mono uppercase tracking-[var(--tracking-micro)] transition-colors cursor-pointer"
            style={{
              fontSize: 'var(--text-micro)',
              color: copied ? 'var(--color-accent)' : 'var(--color-text)',
            }}
          >
            {copied ? 'Copied ✓' : 'Copy .md'}
          </button>
        </div>

        {/* Source lines */}
        <div className="overflow-x-auto py-6 px-4 sm:px-6">
          <pre
            className="m-0 font-mono leading-[1.75]"
            style={{ fontSize: 'var(--text-meta)' }}
          >
            {lines.map((line, idx) => {
              const isBoundary = line.trim() === '---' && idx < 12;
              if (isBoundary) frontmatterBoundaryCount += 1;
              const inFrontmatter =
                frontmatterBoundaryCount === 1 || isBoundary;
              const color = getLineColor(line, inFrontmatter);

              return (
                <div key={idx} className="flex gap-5">
                  <span
                    aria-hidden="true"
                    className="select-none shrink-0 w-7 text-right tabular-nums"
                    style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}
                  >
                    {idx + 1}
                  </span>
                  <span
                    className="whitespace-pre-wrap break-words"
                    style={{ color }}
                  >
                    {line.length > 0 ? line : ' '}
                  </span>
                </div>
              );
            })}
          </pre>
        </div>
      </div>
    </motion.section>
  );
}
