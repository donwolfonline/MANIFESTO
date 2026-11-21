import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  MotionConfig,
} from 'framer-motion';
import {
  COMMIT_PREFIXES,
  MANIFESTO_COMMITS,
  type CommitPrefix,
  type ManifestoCommit,
} from '../data/commitLog';
import type { ManifestoMeta } from '../lib/markdown';
import { EASE_OUT_EXPO } from '../lib/motion';
import { getPreloadHandlers } from '../lib/routePreload';
import {
  usePrefersReducedMotion,
  useScrollScrub,
} from '../lib/useViewportActivity';
import { FilmGrain } from './FilmGrain';
import { HoverLink } from './HoverLink';

export interface CommitLogPageProps {
  meta: ManifestoMeta;
  commits?: ManifestoCommit[];
  onNavigateHome: (section?: string) => void;
  onOpenTerminal: () => void;
  onOpenMuseum: () => void;
}

const PREFIX_COLORS: Record<CommitPrefix, string> = {
  feat: 'var(--color-status-ok)',
  fix: 'var(--color-accent)',
  refactor: 'var(--color-status-info)',
  docs: 'var(--color-status-warn)',
  chore: 'var(--color-text-muted)',
};

function matchesSearch(commit: ManifestoCommit, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    commit.hash,
    commit.prefix,
    `${commit.prefix}: ${commit.subject}`,
    commit.author,
    commit.date,
    commit.filePath,
    ...commit.hunks.flatMap((h) => [
      ...h.removed,
      ...h.added,
      h.blame.author,
      h.blame.note,
    ]),
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(q);
}

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  if (
    typeof window.matchMedia === 'function' &&
    (window.matchMedia('(max-width: 767px)').matches ||
      window.matchMedia('(pointer: coarse)').matches)
  ) {
    return true;
  }
  return window.innerWidth > 0 && window.innerWidth < 768;
}

export function CommitLogPage({
  meta,
  commits = MANIFESTO_COMMITS,
  onNavigateHome,
  onOpenTerminal,
  onOpenMuseum,
}: CommitLogPageProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  const [query, setQuery] = useState('');
  const [prefixFilter, setPrefixFilter] = useState<'all' | CommitPrefix>('all');
  const [blameEnabled, setBlameEnabled] = useState(false);
  // Collapse commit diffs by default on mobile/touch viewports for fast scanning
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
    isMobileViewport() ? new Set() : new Set([commits[0]?.id ?? '']),
  );
  const [activeCommitId, setActiveCommitId] = useState<string>(
    commits[0]?.id ?? '',
  );

  const timelineRef = useRef<HTMLDivElement | null>(null);
  const railFillRef = useRef<HTMLDivElement | null>(null);
  const commitNodeRefs = useRef<Map<string, HTMLElement>>(new Map());

  const filteredCommits = useMemo(() => {
    return commits.filter((commit) => {
      if (prefixFilter !== 'all' && commit.prefix !== prefixFilter) {
        return false;
      }
      return matchesSearch(commit, query);
    });
  }, [commits, prefixFilter, query]);

  // Scrubbed progress line down the left branch rail — pauses when off-screen or tab hidden
  useScrollScrub(
    timelineRef,
    (progress) => {
      if (railFillRef.current) {
        railFillRef.current.style.transform = `scaleY(${progress.toFixed(4)})`;
      }
    },
    { disabled: prefersReducedMotion, startViewportFraction: 0.35 },
  );

  // Track highlighted commit along the branch line asynchronously via IntersectionObserver
  useEffect(() => {
    if (filteredCommits.length === 0) return;

    // Ensure activeCommitId remains inside the filtered set
    if (!filteredCommits.some((c) => c.id === activeCommitId)) {
      setActiveCommitId(filteredCommits[0].id);
    }

    const visibleRatios = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = (entry.target as HTMLElement).dataset.commitId;
          if (!id) return;
          if (entry.isIntersecting) {
            visibleRatios.set(id, entry.intersectionRatio);
          } else {
            visibleRatios.delete(id);
          }
        });

        if (visibleRatios.size === 0) return;

        let bestId: string | null = null;
        let bestRatio = -1;
        visibleRatios.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        });

        if (bestId !== null) {
          const nextId = bestId;
          setActiveCommitId((prev) => (prev === nextId ? prev : nextId));
        }
      },
      {
        rootMargin: '-22% 0px -55% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    filteredCommits.forEach((commit) => {
      const el = commitNodeRefs.current.get(commit.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [filteredCommits, activeCommitId]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const allExpanded =
    filteredCommits.length > 0 &&
    filteredCommits.every((c) => expandedIds.has(c.id));

  const handleToggleAll = () => {
    if (allExpanded) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(filteredCommits.map((c) => c.id)));
    }
  };

  return (
    <MotionConfig reducedMotion={prefersReducedMotion ? 'always' : 'never'}>
      <div
        className="relative min-h-dvh flex flex-col"
      style={{
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)',
      }}
    >
      <FilmGrain />

      {/* Minimal top bar */}
      <header
        className="sticky top-0 shrink-0 border-b"
        style={{
          height: 'var(--header-height)',
          zIndex: 'var(--z-header)',
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-bg-glass)',
        }}
      >
        <div className="editorial-shell h-full flex items-center justify-between gap-4 font-mono">
          <HoverLink
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigateHome();
            }}
            className="inline-flex items-center gap-2.5 uppercase tracking-[var(--tracking-mono)]"
            style={{
              fontSize: 'var(--text-meta)',
              color: 'var(--color-text)',
            }}
          >
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: 'var(--color-accent)' }}
            />
            <span>~/{meta.filename}</span>
          </HoverLink>

          <div className="flex items-center gap-4 sm:gap-6">
            <HoverLink
              href="/today"
              {...getPreloadHandlers('today')}
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome('today');
              }}
              className="hidden md:inline-flex uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              /today
            </HoverLink>

            <HoverLink
              href="/naming"
              {...getPreloadHandlers('naming')}
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome('naming');
              }}
              className="inline-flex uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              /naming
            </HoverLink>

            <HoverLink
              href="/focus"
              {...getPreloadHandlers('focus')}
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome('focus');
              }}
              className="hidden lg:inline-flex uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              /focus
            </HoverLink>

            <HoverLink
              href="/bug-museum"
              {...getPreloadHandlers('bug-museum')}
              onClick={(e) => {
                e.preventDefault();
                onOpenMuseum();
              }}
              className="hidden md:inline-flex uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              /bug-museum
            </HoverLink>

            <HoverLink
              href="/terminal"
              {...getPreloadHandlers('terminal')}
              onClick={(e) => {
                e.preventDefault();
                onOpenTerminal();
              }}
              className="hidden sm:inline-flex items-center gap-1.5 uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <span aria-hidden="true" style={{ color: 'var(--color-accent)' }}>
                &gt;_
              </span>
              <span>/terminal</span>
            </HoverLink>

            <HoverLink
              href="/#read"
              restingRule
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome('read');
              }}
              className="uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              ← back to editorial
            </HoverLink>
          </div>
        </div>
      </header>

      <main
        aria-label="Manifesto git commit log"
        className="flex-1 editorial-shell py-10 sm:py-16"
      >
        <div className="max-w-[66rem] mx-auto">
          {/* Page Header */}
          <div
            data-legacy-title-block="true"
            className="pb-8 border-b"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <p
              className="m-0 mb-3 font-mono uppercase tracking-[var(--tracking-micro)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-accent)',
              }}
            >
              /commit-log · git log --graph --stat main
            </p>
            <h1
              className="m-0 font-display font-normal"
              style={{
                fontSize: 'clamp(2.5rem, 6.2vw, 5rem)',
                lineHeight: 0.94,
                letterSpacing: 'var(--tracking-display)',
                color: 'var(--color-text)',
              }}
            >
              Commit <span className="italic">History</span>
              <span style={{ color: 'var(--color-accent)' }}>.</span>
            </h1>
            <p
              className="mt-4 mb-0 font-body"
              style={{
                maxWidth: '54ch',
                fontSize: 'var(--text-body)',
                lineHeight: 1.6,
                color: 'var(--color-text-secondary)',
              }}
            >
              Ten working principles tracked as diffs—green lines for the habit kept, red lines for the habit retired. Click any commit to inspect the diff.
            </p>
          </div>

          {/* Search box (--grep) + prefix filters + git blame toggle */}
          <div
            className="py-6 border-b space-y-4"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div
                className="flex-1 flex items-center gap-2.5 px-3.5 py-2 border font-mono"
                style={{
                  borderColor: 'var(--color-border-strong)',
                  backgroundColor: 'var(--color-bg-deep)',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: 'var(--text-meta)',
                }}
              >
                <span
                  aria-hidden="true"
                  className="shrink-0 select-none"
                  style={{ color: 'var(--color-accent)' }}
                >
                  --grep=
                </span>
                <label htmlFor="commit-search" className="sr-only">
                  Filter commits by keyword
                </label>
                <input
                  id="commit-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder='filter commits (e.g. "2am", "400", "review", "fix")'
                  className="w-full bg-transparent text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Clear search query"
                    className="shrink-0 px-1.5 font-mono transition-colors hover:text-[var(--color-accent)] cursor-pointer"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2.5 shrink-0 font-mono">
                <button
                  type="button"
                  onClick={() => setBlameEnabled((prev) => !prev)}
                  aria-pressed={blameEnabled}
                  className="px-3.5 py-2 border uppercase tracking-[var(--tracking-micro)] transition-colors cursor-pointer"
                  style={{
                    fontSize: 'var(--text-micro)',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: blameEnabled
                      ? 'var(--color-accent)'
                      : 'transparent',
                    borderColor: blameEnabled
                      ? 'var(--color-accent)'
                      : 'var(--color-border-strong)',
                    color: blameEnabled
                      ? 'var(--color-accent-ink)'
                      : 'var(--color-text)',
                  }}
                >
                  git blame: {blameEnabled ? 'on' : 'off'}
                </button>

                <button
                  type="button"
                  onClick={handleToggleAll}
                  className="px-3 py-2 border uppercase tracking-[var(--tracking-micro)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer"
                  style={{
                    fontSize: 'var(--text-micro)',
                    borderRadius: 'var(--radius-xs)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {allExpanded ? 'collapse all' : 'expand all'}
                </button>
              </div>
            </div>

            {/* Commit type filter strip + live match counter */}
            <div className="flex flex-wrap items-center justify-between gap-3 font-mono">
              <div
                role="group"
                aria-label="Filter by commit type"
                className="flex flex-wrap items-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => setPrefixFilter('all')}
                  aria-pressed={prefixFilter === 'all'}
                  className="px-2.5 py-1 border transition-colors cursor-pointer"
                  style={{
                    fontSize: 'var(--text-micro)',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor:
                      prefixFilter === 'all'
                        ? 'var(--color-text)'
                        : 'transparent',
                    borderColor:
                      prefixFilter === 'all'
                        ? 'var(--color-text)'
                        : 'var(--color-border)',
                    color:
                      prefixFilter === 'all'
                        ? 'var(--color-bg)'
                        : 'var(--color-text-secondary)',
                  }}
                >
                  all
                </button>

                {COMMIT_PREFIXES.map((prefix) => {
                  const active = prefixFilter === prefix;
                  return (
                    <button
                      key={prefix}
                      type="button"
                      onClick={() => setPrefixFilter(prefix)}
                      aria-pressed={active}
                      className="px-2.5 py-1 border transition-colors cursor-pointer"
                      style={{
                        fontSize: 'var(--text-micro)',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: active
                          ? 'var(--color-bg-elevated)'
                          : 'transparent',
                        borderColor: active
                          ? PREFIX_COLORS[prefix]
                          : 'var(--color-border)',
                        color: active
                          ? PREFIX_COLORS[prefix]
                          : 'var(--color-text-secondary)',
                      }}
                    >
                      {prefix}:
                    </button>
                  );
                })}
              </div>

              <span
                aria-live="polite"
                className="uppercase tracking-[var(--tracking-micro)] tabular-nums"
                style={{
                  fontSize: 'var(--text-micro)',
                  color: 'var(--color-text-muted)',
                }}
              >
                {filteredCommits.length} / {commits.length} commits
              </span>
            </div>
          </div>

          {/* Vertical Git Branch Timeline */}
          {filteredCommits.length === 0 ? (
            <div
              className="my-12 p-8 border font-mono text-center space-y-4"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg-elevated)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <p
                className="m-0"
                style={{
                  fontSize: 'var(--text-meta)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                fatal: grep &ldquo;{query}&rdquo; matched 0 commits on branch{' '}
                <span style={{ color: 'var(--color-accent)' }}>main</span>.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setPrefixFilter('all');
                }}
                className="px-3.5 py-1.5 border uppercase tracking-[var(--tracking-micro)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer"
                style={{
                  fontSize: 'var(--text-micro)',
                  borderColor: 'var(--color-border-strong)',
                  color: 'var(--color-text)',
                  borderRadius: 'var(--radius-xs)',
                }}
              >
                reset filter
              </button>
            </div>
          ) : (
            <div ref={timelineRef} className="relative mt-10 pl-8 sm:pl-12">
              {/* Left continuous branch rail */}
              <div
                aria-hidden="true"
                className="absolute left-[11px] sm:left-[15px] top-4 bottom-4 w-px"
                style={{ backgroundColor: 'var(--color-border-strong)' }}
              >
                {!prefersReducedMotion && (
                  <div
                    ref={railFillRef}
                    className="w-full h-full origin-top"
                    style={{
                      backgroundColor: 'var(--color-accent)',
                      transform: 'scaleY(0)',
                    }}
                  />
                )}
              </div>

              <LayoutGroup>
                <ol className="list-none p-0 m-0 space-y-5">
                  {filteredCommits.map((commit) => {
                    const isExpanded = expandedIds.has(commit.id);
                    const isActive = activeCommitId === commit.id;
                    const addedCount = commit.hunks.reduce(
                      (acc, h) => acc + h.added.length,
                      0,
                    );
                    const removedCount = commit.hunks.reduce(
                      (acc, h) => acc + h.removed.length,
                      0,
                    );

                    return (
                      <motion.li
                        key={commit.id}
                        ref={(node) => {
                          if (node) {
                            commitNodeRefs.current.set(commit.id, node);
                          } else {
                            commitNodeRefs.current.delete(commit.id);
                          }
                        }}
                        data-commit-id={commit.id}
                        layout={prefersReducedMotion ? false : 'position'}
                        transition={{
                          layout: { duration: 0.36, ease: EASE_OUT_EXPO },
                        }}
                        className="relative"
                      >
                        {/* Branch node dot synced with scroll-highlighted commit */}
                        <span
                          aria-hidden="true"
                          className="absolute -left-8 sm:-left-12 top-6 flex items-center justify-center w-6 sm:w-8"
                        >
                          <motion.span
                            className="block rounded-full border-2"
                            animate={{
                              scale: isActive ? 1.25 : 1,
                              backgroundColor: isActive
                                ? 'var(--color-accent)'
                                : 'var(--color-bg)',
                              borderColor: isActive
                                ? 'var(--color-accent)'
                                : 'var(--color-border-strong)',
                            }}
                            transition={{
                              duration: prefersReducedMotion ? 0 : 0.24,
                              ease: EASE_OUT_EXPO,
                            }}
                            style={{
                              width: '11px',
                              height: '11px',
                              boxShadow: isActive
                                ? '0 0 0 4px var(--color-accent-soft)'
                                : 'none',
                            }}
                          />
                        </span>

                        {/* Commit card */}
                        <div
                          className="border overflow-hidden transition-colors"
                          style={{
                            borderColor: isActive
                              ? 'var(--color-accent)'
                              : 'var(--color-border-strong)',
                            backgroundColor: 'var(--color-bg-elevated)',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          {/* Commit summary header button */}
                          <button
                            type="button"
                            onClick={() => toggleExpand(commit.id)}
                            aria-expanded={isExpanded}
                            aria-controls={`diff-${commit.id}`}
                            className="w-full text-left px-4 sm:px-6 py-4 sm:py-5 flex flex-col gap-3 cursor-pointer"
                          >
                            {/* Top metadata row: hash, branch tag, author, date, +/- stats */}
                            <div
                              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 font-mono"
                              style={{ fontSize: 'var(--text-micro)' }}
                            >
                              <div className="flex flex-wrap items-center gap-2.5">
                                <span
                                  className="tabular-nums px-1.5 py-0.5 border"
                                  style={{
                                    borderRadius: 'var(--radius-xs)',
                                    borderColor: isActive
                                      ? 'var(--color-accent)'
                                      : 'var(--color-border)',
                                    color: isActive
                                      ? 'var(--color-accent)'
                                      : 'var(--color-text)',
                                    backgroundColor: 'var(--color-bg-deep)',
                                  }}
                                >
                                  {commit.hash}
                                </span>

                                {commit.refTag && (
                                  <span
                                    className="px-2 py-0.5 border"
                                    style={{
                                      borderRadius: 'var(--radius-xs)',
                                      borderColor: 'var(--color-accent)',
                                      color: 'var(--color-accent)',
                                      backgroundColor: 'var(--color-bg-deep)',
                                    }}
                                  >
                                    {commit.refTag}
                                  </span>
                                )}

                                <span style={{ color: 'var(--color-text-muted)' }}>
                                  {commit.author}
                                </span>
                                <span
                                  aria-hidden="true"
                                  style={{ color: 'var(--color-text-muted)' }}
                                >
                                  ·
                                </span>
                                <span style={{ color: 'var(--color-text-muted)' }}>
                                  {commit.date}{' '}
                                  <span className="hidden sm:inline">
                                    ({commit.relativeDate})
                                  </span>
                                </span>
                              </div>

                              <div className="flex items-center gap-3 tabular-nums">
                                <span style={{ color: 'var(--color-status-ok)' }}>
                                  +{addedCount}
                                </span>
                                <span style={{ color: 'var(--color-status-error)' }}>
                                  -{removedCount}
                                </span>
                                <span
                                  aria-hidden="true"
                                  style={{ color: 'var(--color-text-muted)' }}
                                >
                                  {isExpanded ? '−' : '+'}
                                </span>
                              </div>
                            </div>

                            {/* Commit message line */}
                            <div className="flex items-baseline justify-between gap-4">
                              <h2
                                className="m-0 font-mono font-normal"
                                style={{
                                  fontSize:
                                    'clamp(0.95rem, 1.25vw + 0.5rem, 1.2rem)',
                                  lineHeight: 1.4,
                                  color: 'var(--color-text)',
                                }}
                              >
                                <span
                                  style={{ color: PREFIX_COLORS[commit.prefix] }}
                                >
                                  {commit.prefix}:
                                </span>{' '}
                                <span>{commit.subject}</span>
                              </h2>

                              <span
                                className="hidden sm:inline-block shrink-0 font-mono tabular-nums uppercase tracking-[var(--tracking-micro)]"
                                style={{
                                  fontSize: 'var(--text-micro)',
                                  color: 'var(--color-text-muted)',
                                }}
                              >
                                #{String(commit.principleNumber).padStart(2, '0')}
                              </span>
                            </div>
                          </button>

                          {/* Expandable Diff View */}
                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                id={`diff-${commit.id}`}
                                key="commit-diff"
                                initial={
                                  prefersReducedMotion
                                    ? { opacity: 1 }
                                    : { opacity: 0, height: 0 }
                                }
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={
                                  prefersReducedMotion
                                    ? { opacity: 0 }
                                    : { opacity: 0, height: 0 }
                                }
                                transition={{
                                  duration: prefersReducedMotion ? 0 : 0.38,
                                  ease: EASE_OUT_EXPO,
                                }}
                                className="overflow-hidden border-t"
                                style={{
                                  borderColor: 'var(--color-border)',
                                  backgroundColor: 'var(--color-bg-deep)',
                                }}
                              >
                                {/* Diff file banner */}
                                <div
                                  className="px-4 sm:px-6 py-2.5 border-b font-mono flex flex-wrap items-center justify-between gap-2"
                                  style={{
                                    borderColor: 'var(--color-border)',
                                    fontSize: 'var(--text-micro)',
                                    color: 'var(--color-text-muted)',
                                  }}
                                >
                                  <span>
                                    diff --git a/{commit.filePath} b/
                                    {commit.filePath}
                                  </span>
                                  <span>
                                    @@ -1,{removedCount} +1,{addedCount} @@
                                  </span>
                                </div>

                                {/* Hunks: red removed bad habits + green added principle + optional git blame */}
                                <div className="py-4 space-y-4">
                                  {commit.hunks.map((hunk, hunkIdx) => (
                                    <div key={hunkIdx} className="space-y-1">
                                      {/* Red removed bad-habit lines */}
                                      {hunk.removed.map((line, rIdx) => (
                                        <div
                                          key={`rem-${rIdx}`}
                                          className="flex items-baseline gap-3 px-4 sm:px-6 py-1.5 border-l-2"
                                          style={{
                                            borderColor: 'var(--color-status-error)',
                                            backgroundColor:
                                              'rgba(244, 114, 107, 0.1)',
                                          }}
                                        >
                                          <span
                                            aria-hidden="true"
                                            className="shrink-0 font-mono select-none"
                                            style={{
                                              color: 'var(--color-status-error)',
                                              fontSize: 'var(--text-meta)',
                                            }}
                                          >
                                            −
                                          </span>
                                          <p
                                            className="m-0 font-mono line-through"
                                            style={{
                                              fontSize: 'var(--text-meta)',
                                              lineHeight: 1.6,
                                              color: 'var(--color-status-error)',
                                            }}
                                          >
                                            {line}
                                          </p>
                                        </div>
                                      ))}

                                      {/* Green added principle lines */}
                                      {hunk.added.map((line, aIdx) => (
                                        <div
                                          key={`add-${aIdx}`}
                                          className="flex items-baseline gap-3 px-4 sm:px-6 py-2 border-l-2"
                                          style={{
                                            borderColor: 'var(--color-status-ok)',
                                            backgroundColor:
                                              'rgba(110, 196, 156, 0.1)',
                                          }}
                                        >
                                          <span
                                            aria-hidden="true"
                                            className="shrink-0 font-mono select-none"
                                            style={{
                                              color: 'var(--color-status-ok)',
                                              fontSize: 'var(--text-meta)',
                                            }}
                                          >
                                            +
                                          </span>
                                          <p
                                            className="m-0 font-body"
                                            style={{
                                              maxWidth: 'var(--measure)',
                                              fontSize: 'var(--text-body)',
                                              lineHeight: 1.68,
                                              color: 'var(--color-text)',
                                            }}
                                          >
                                            {line}
                                          </p>
                                        </div>
                                      ))}

                                      {/* Animated `git blame` annotation per paragraph */}
                                      <AnimatePresence initial={false}>
                                        {blameEnabled && (
                                          <motion.div
                                            key="blame-note"
                                            initial={
                                              prefersReducedMotion
                                                ? { opacity: 1 }
                                                : { opacity: 0, height: 0, y: -4 }
                                            }
                                            animate={{
                                              opacity: 1,
                                              height: 'auto',
                                              y: 0,
                                            }}
                                            exit={
                                              prefersReducedMotion
                                                ? { opacity: 0 }
                                                : { opacity: 0, height: 0, y: -4 }
                                            }
                                            transition={{
                                              duration: prefersReducedMotion
                                                ? 0
                                                : 0.28,
                                              ease: EASE_OUT_EXPO,
                                            }}
                                            className="overflow-hidden"
                                          >
                                            <div
                                              className="mx-4 sm:mx-6 mt-1.5 px-3 py-2 border-l-2 font-mono flex flex-wrap items-baseline gap-x-2.5 gap-y-1"
                                              style={{
                                                borderColor:
                                                  'var(--color-accent)',
                                                backgroundColor:
                                                  'var(--color-bg)',
                                                fontSize: 'var(--text-micro)',
                                              }}
                                            >
                                              <span
                                                className="tabular-nums"
                                                style={{
                                                  color: 'var(--color-accent)',
                                                }}
                                              >
                                                {hunk.blame.hash}
                                              </span>
                                              <span
                                                style={{
                                                  color:
                                                    'var(--color-text-muted)',
                                                }}
                                              >
                                                ({hunk.blame.author} ·{' '}
                                                {hunk.blame.when})
                                              </span>
                                              <span
                                                style={{
                                                  color:
                                                    'var(--color-text-secondary)',
                                                }}
                                              >
                                                // {hunk.blame.note}
                                              </span>
                                            </div>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.li>
                    );
                  })}
                </ol>
              </LayoutGroup>
            </div>
          )}
        </div>
      </main>
      </div>
    </MotionConfig>
  );
}
