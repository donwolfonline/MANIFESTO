/* eslint-disable react-refresh/only-export-components */
import { useMemo, useState, type ReactNode } from 'react';
import type { ManifestoMeta, ManifestoStats } from '../lib/markdown';
import { buildPageMarkdown } from '../lib/pageMarkdown';
import { usePrefersReducedMotion } from '../lib/useViewportActivity';

export interface RawMarkdownViewProps {
  raw?: string;
  meta: ManifestoMeta;
  stats?: ManifestoStats;
  /** Route pathname of the current page (defaults to '/' or window.location.pathname) */
  routePath?: string;
  /** Optional override for the displayed & downloaded .md filename */
  filename?: string;
}

export interface MarkdownLineEntry {
  lineNumber: number;
  text: string;
  inFrontmatter: boolean;
}

export interface MarkdownBlock {
  index: number;
  delayMs: number;
  durationMs: number;
  totalMs: number;
  lines: MarkdownLineEntry[];
}

const MAX_TOTAL_ANIMATION_MS = 800;
const BLOCK_ANIMATION_DURATION_MS = 220;
const MAX_STAGGER_DELAY_MS =
  MAX_TOTAL_ANIMATION_MS - BLOCK_ANIMATION_DURATION_MS;

/**
 * Groups raw Markdown lines into logical blocks (separated by blank lines or headings)
 * and assigns a top-to-bottom stagger schedule guaranteed to complete within 800ms total
 * (or 0ms under prefers-reduced-motion).
 */
export function buildStaggeredMarkdownBlocks(
  rawText: string,
  reducedMotion: boolean,
): MarkdownBlock[] {
  const rawLines = rawText.replace(/\r\n/g, '\n').split('\n');
  let frontmatterBoundaryCount = 0;

  const entries: MarkdownLineEntry[] = rawLines.map((text, idx) => {
    const isBoundary = text.trim() === '---' && idx < 12;
    if (isBoundary) frontmatterBoundaryCount += 1;
    const inFrontmatter = frontmatterBoundaryCount === 1 || isBoundary;
    return {
      lineNumber: idx + 1,
      text,
      inFrontmatter,
    };
  });

  const groupedLines: MarkdownLineEntry[][] = [];
  let currentGroup: MarkdownLineEntry[] = [];

  for (const entry of entries) {
    const isHeading = /^#{1,6}\s/.test(entry.text);
    const isBlank = entry.text.trim().length === 0;

    if (isHeading && currentGroup.length > 0) {
      groupedLines.push(currentGroup);
      currentGroup = [entry];
      continue;
    }

    currentGroup.push(entry);

    if (isBlank && currentGroup.length >= 2) {
      groupedLines.push(currentGroup);
      currentGroup = [];
    }
  }

  if (currentGroup.length > 0) {
    groupedLines.push(currentGroup);
  }

  const blockCount = groupedLines.length;

  return groupedLines.map((lines, index) => {
    if (reducedMotion) {
      return {
        index,
        delayMs: 0,
        durationMs: 0,
        totalMs: 0,
        lines,
      };
    }

    const stepMs =
      blockCount > 1
        ? Math.min(48, MAX_STAGGER_DELAY_MS / (blockCount - 1))
        : 0;
    const delayMs = Math.round(index * stepMs);
    const durationMs = BLOCK_ANIMATION_DURATION_MS;

    return {
      index,
      delayMs,
      durationMs,
      totalMs: Math.min(MAX_TOTAL_ANIMATION_MS, delayMs + durationMs),
      lines,
    };
  });
}

/**
 * Renders a single plain Markdown line with syntax-style coloring:
 * - "# " headings: leading hashes dim, heading text bright
 * - "> " quotes: leading ">" quote mark in accent color
 * - "- " lists: leading list marker in accent color
 * - frontmatter & fences: muted/accent
 */
function renderSyntaxColoredLine(
  line: string,
  inFrontmatter: boolean,
): ReactNode {
  if (line.length === 0) {
    return ' ';
  }

  if (line.trim() === '---') {
    return (
      <span
        data-syntax="fence"
        style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}
      >
        {line}
      </span>
    );
  }

  if (inFrontmatter) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const keyPart = line.slice(0, colonIdx + 1);
      const valuePart = line.slice(colonIdx + 1);
      return (
        <>
          <span
            data-syntax="frontmatter-key"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {keyPart}
          </span>
          <span
            data-syntax="frontmatter-value"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {valuePart}
          </span>
        </>
      );
    }
    return (
      <span style={{ color: 'var(--color-text-muted)' }}>{line}</span>
    );
  }

  // "# " / "## " / "### " headings: dim hashes + high-contrast heading text
  const headingMatch = line.match(/^(#{1,6})(\s+)(.*)$/);
  if (headingMatch) {
    const [, hashes, space, titleText] = headingMatch;
    return (
      <>
        <span
          data-syntax="heading-hash"
          style={{ color: 'var(--color-text-muted)', opacity: 0.55 }}
        >
          {hashes}
        </span>
        <span>{space}</span>
        <span
          data-syntax="heading-text"
          className="font-semibold"
          style={{ color: 'var(--color-text)' }}
        >
          {titleText}
        </span>
      </>
    );
  }

  // "> " blockquotes: accent quote mark + secondary quote body
  const quoteMatch = line.match(/^(\s*>+)(\s*)(.*)$/);
  if (quoteMatch) {
    const [, quoteMark, space, quoteBody] = quoteMatch;
    return (
      <>
        <span
          data-syntax="quote-mark"
          className="font-semibold"
          style={{ color: 'var(--color-accent)' }}
        >
          {quoteMark}
        </span>
        <span>{space}</span>
        <span
          data-syntax="quote-text"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {quoteBody}
        </span>
      </>
    );
  }

  // "- " or "1. " list items: accent marker + list text
  const listMatch = line.match(/^(\s*(?:[-*+]|\d+\.))(\s+)(.*)$/);
  if (listMatch) {
    const [, marker, space, listBody] = listMatch;
    return (
      <>
        <span
          data-syntax="list-marker"
          style={{ color: 'var(--color-accent)' }}
        >
          {marker}
        </span>
        <span>{space}</span>
        <span
          data-syntax="list-text"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {listBody}
        </span>
      </>
    );
  }

  return (
    <span
      data-syntax="body"
      style={{ color: 'var(--color-text-secondary)' }}
    >
      {line}
    </span>
  );
}

export function RawMarkdownView({
  raw: rawProp,
  meta,
  stats: statsProp,
  routePath,
  filename: filenameProp,
}: RawMarkdownViewProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const activePath =
    routePath ??
    (typeof window !== 'undefined' ? window.location.pathname : '/');

  const { resolvedRaw, resolvedFilename, resolvedStats } = useMemo(() => {
    const built = buildPageMarkdown(activePath, meta, rawProp);
    return {
      resolvedRaw: built.raw,
      resolvedFilename: filenameProp || built.filename,
      resolvedStats: statsProp && rawProp ? statsProp : built.stats,
    };
  }, [activePath, meta, rawProp, statsProp, filenameProp]);

  const blocks = useMemo(
    () => buildStaggeredMarkdownBlocks(resolvedRaw, prefersReducedMotion),
    [resolvedRaw, prefersReducedMotion],
  );

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(resolvedRaw);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = resolvedRaw;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([resolvedRaw], {
        type: 'text/markdown;charset=utf-8',
      });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = resolvedFilename.endsWith('.md')
        ? resolvedFilename
        : `${resolvedFilename}.md`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
      setDownloaded(true);
      window.setTimeout(() => setDownloaded(false), 1800);
    } catch {
      setDownloaded(false);
    }
  };

  return (
    <section
      data-testid="raw-markdown-view"
      data-route-path={activePath}
      data-max-total-ms={prefersReducedMotion ? '0' : String(MAX_TOTAL_ANIMATION_MS)}
      data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}
      className="editorial-shell pt-24 sm:pt-32 pb-12 relative"
      aria-label="Raw Markdown source"
    >
      {/* Outgoing editorial dissolve ghost layer: editorial elements fade and compress while raw blocks type in */}
      {!prefersReducedMotion && (
        <div
          aria-hidden="true"
          data-testid="editorial-dissolve-ghost"
          className="editorial-dissolve-out pointer-events-none select-none mb-2"
        />
      )}

      <div
        className="max-w-[82ch] mx-auto border"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-bg-elevated)',
          borderRadius: 'var(--radius-xs)',
        }}
      >
        {/* File header bar with stats, Copy markdown, and Download .md actions */}
        <div
          className="flex flex-wrap items-center justify-between gap-4 px-4 sm:px-5 py-3.5 border-b font-mono uppercase tracking-[var(--tracking-micro)]"
          style={{
            fontSize: 'var(--text-micro)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-muted)',
          }}
        >
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <span
              data-testid="raw-markdown-filename"
              style={{ color: 'var(--color-text)' }}
            >
              src/content/{resolvedFilename}
            </span>
            <span>{resolvedStats.lineCount} Lines</span>
            <span className="hidden sm:inline">
              {resolvedStats.charCount} Bytes
            </span>
            <a
              href="#raw"
              data-testid="raw-deeplink-anchor"
              title="Optional page-level #raw deep link"
              className="hidden md:inline transition-colors hover:text-[var(--color-accent)]"
              style={{ color: 'var(--color-text-muted)' }}
            >
              #raw
            </a>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              data-testid="raw-copy-markdown"
              onClick={handleCopy}
              className="px-2.5 py-1 border font-mono uppercase tracking-[var(--tracking-micro)] transition-colors cursor-pointer"
              style={{
                fontSize: 'var(--text-micro)',
                borderColor: copied
                  ? 'var(--color-accent)'
                  : 'var(--color-border-strong)',
                color: copied ? 'var(--color-accent)' : 'var(--color-text)',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              {copied ? 'Copied ✓' : 'Copy markdown'}
            </button>

            <button
              type="button"
              data-testid="raw-download-markdown"
              onClick={handleDownload}
              className="px-2.5 py-1 border font-mono uppercase tracking-[var(--tracking-micro)] transition-colors cursor-pointer"
              style={{
                fontSize: 'var(--text-micro)',
                borderColor: downloaded
                  ? 'var(--color-accent)'
                  : 'var(--color-border-strong)',
                color: downloaded
                  ? 'var(--color-accent)'
                  : 'var(--color-text-secondary)',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              {downloaded ? 'Downloaded ✓' : 'Download .md'}
            </button>
          </div>
        </div>

        {/* Staggered Markdown blocks with line numbers in the gutter */}
        <div className="overflow-x-auto py-6 px-4 sm:px-6">
          <pre
            data-testid="raw-markdown-pre"
            className="m-0 font-mono leading-[1.75]"
            style={{ fontSize: 'var(--text-meta)' }}
          >
            {blocks.map((block) => (
              <div
                key={block.index}
                data-testid="raw-markdown-block"
                data-block-index={block.index}
                data-block-delay-ms={block.delayMs}
                data-block-total-ms={block.totalMs}
                className={prefersReducedMotion ? '' : 'raw-block-type-in'}
                style={
                  prefersReducedMotion
                    ? undefined
                    : {
                        animationDelay: `${block.delayMs}ms`,
                        animationDuration: `${block.durationMs}ms`,
                      }
                }
              >
                {block.lines.map((entry) => (
                  <div
                    key={entry.lineNumber}
                    data-testid="raw-markdown-line"
                    className="flex gap-4 sm:gap-5"
                  >
                    <span
                      aria-hidden="true"
                      data-testid="raw-line-number"
                      className="select-none shrink-0 w-8 text-right tabular-nums"
                      style={{
                        color: 'var(--color-text-muted)',
                        opacity: 0.5,
                      }}
                    >
                      {entry.lineNumber}
                    </span>
                    <span className="whitespace-pre-wrap break-words min-w-0 flex-1">
                      {renderSyntaxColoredLine(
                        entry.text,
                        entry.inFrontmatter,
                      )}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </pre>
        </div>
      </div>
    </section>
  );
}
