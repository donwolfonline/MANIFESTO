import content from 'virtual:content';
import type {
  ContentCollectionName,
  ContentNavLink,
  ContentTocItem,
} from '../lib/contentSchema';
import { useLenis } from '../lib/lenis';
import type { ManifestoMeta } from '../lib/markdown';
import { useReadingMode } from '../lib/readingMode';
import { FilmGrain } from './FilmGrain';
import { HoverLink } from './HoverLink';
import { ManifestoRenderer } from './ManifestoRenderer';
import { ReadingModeBar } from './ReadingModeBar';
import { ReadingProgress } from './ReadingProgress';

export interface EntryDetailPageProps {
  meta: ManifestoMeta;
  collection: ContentCollectionName;
  slug: string;
  onNavigateHome: (section?: string) => void;
  onOpenEntry: (collection: ContentCollectionName, slug: string) => void;
}

interface ResolvedEntry {
  collection: ContentCollectionName;
  collectionLabel: string;
  parentRoute: string;
  parentLabel: string;
  eyebrow: string;
  title: string;
  date: string;
  tags: string[];
  summary: string;
  draft: boolean;
  body: string;
  wordCount: number;
  readingTimeMinutes: number;
  toc: ContentTocItem[];
  prev: ContentNavLink | null;
  next: ContentNavLink | null;
  sourceFile: string;
}

function resolveEntry(
  collection: ContentCollectionName,
  slug: string,
): ResolvedEntry | null {
  if (collection === 'principles') {
    const found = content.principles.find((p) => p.slug === slug);
    if (!found) return null;
    return {
      collection,
      collectionLabel: 'Principles',
      parentRoute: 'read',
      parentLabel: '← all principles',
      eyebrow: `Principle ${String(found.number).padStart(2, '0')}`,
      title: found.title,
      date: found.date,
      tags: found.tags,
      summary: found.summary,
      draft: found.draft,
      body: found.body,
      wordCount: found.wordCount,
      readingTimeMinutes: found.readingTimeMinutes,
      toc: found.toc,
      prev: found.prev,
      next: found.next,
      sourceFile: found.sourceFile,
    };
  }

  if (collection === 'bug-stories') {
    const found = content.bugStories.find((b) => b.slug === slug);
    if (!found) return null;
    return {
      collection,
      collectionLabel: 'Bug Museum',
      parentRoute: 'bug-museum',
      parentLabel: '← bug museum',
      eyebrow: `Exhibit ${found.exhibitNumber} · ${found.year}`,
      title: found.title,
      date: found.date,
      tags: found.tags,
      summary: found.summary,
      draft: found.draft,
      body: found.body,
      wordCount: found.wordCount,
      readingTimeMinutes: found.readingTimeMinutes,
      toc: found.toc,
      prev: found.prev,
      next: found.next,
      sourceFile: found.sourceFile,
    };
  }

  if (collection === 'shelf-items') {
    const foundBook = content.shelfBooks.find((b) => b.slug === slug);
    if (foundBook) {
      return {
        collection,
        collectionLabel: 'Shelf',
        parentRoute: 'shelf',
        parentLabel: '← bookshelf',
        eyebrow: `${foundBook.category} · ${foundBook.author}`,
        title: foundBook.title,
        date: foundBook.date,
        tags: foundBook.tags,
        summary: foundBook.summary,
        draft: foundBook.draft,
        body: foundBook.body,
        wordCount: foundBook.wordCount,
        readingTimeMinutes: foundBook.readingTimeMinutes,
        toc: foundBook.toc,
        prev: foundBook.prev,
        next: foundBook.next,
        sourceFile: foundBook.sourceFile,
      };
    }
    const foundTool = content.shelfTools.find((t) => t.slug === slug);
    if (!foundTool) return null;
    return {
      collection,
      collectionLabel: 'Shelf',
      parentRoute: 'shelf',
      parentLabel: '← bookshelf',
      eyebrow: `Tool · ${foundTool.kind}`,
      title: foundTool.title,
      date: foundTool.date,
      tags: foundTool.tags,
      summary: foundTool.summary,
      draft: foundTool.draft,
      body: foundTool.body,
      wordCount: foundTool.wordCount,
      readingTimeMinutes: foundTool.readingTimeMinutes,
      toc: foundTool.toc,
      prev: foundTool.prev,
      next: foundTool.next,
      sourceFile: foundTool.sourceFile,
    };
  }

  const foundCommit = content.commits.find((c) => c.slug === slug);
  if (!foundCommit) return null;
  return {
    collection: 'commits',
    collectionLabel: 'Commit Log',
    parentRoute: 'commit-log',
    parentLabel: '← commit log',
    eyebrow: `${foundCommit.hash} · ${foundCommit.prefix}:`,
    title: foundCommit.title,
    date: foundCommit.date,
    tags: foundCommit.tags,
    summary: foundCommit.summary,
    draft: foundCommit.draft,
    body: foundCommit.body,
    wordCount: foundCommit.wordCount,
    readingTimeMinutes: foundCommit.readingTimeMinutes,
    toc: foundCommit.toc,
    prev: foundCommit.prev,
    next: foundCommit.next,
    sourceFile: foundCommit.sourceFile,
  };
}

export function EntryDetailPage({
  meta,
  collection,
  slug,
  onNavigateHome,
  onOpenEntry,
}: EntryDetailPageProps) {
  const { scrollTo } = useLenis();
  const { prefs: readingPrefs, resolvedTheme } = useReadingMode();
  const isReadingMode = readingPrefs.enabled;
  const entry = resolveEntry(collection, slug);

  if (!entry) {
    return (
      <div
        className="min-h-dvh flex flex-col items-center justify-center p-6 font-mono text-center gap-4"
        style={{
          backgroundColor: 'var(--color-bg)',
          color: 'var(--color-text)',
        }}
      >
        <p className="m-0" style={{ color: 'var(--color-status-error)' }}>
          error: entry &ldquo;{collection}/{slug}&rdquo; not found
        </p>
        <button
          type="button"
          onClick={() => onNavigateHome('read')}
          className="px-4 py-2 border uppercase tracking-[var(--tracking-micro)] cursor-pointer"
          style={{
            fontSize: 'var(--text-micro)',
            borderColor: 'var(--color-accent)',
            color: 'var(--color-accent)',
          }}
        >
          ← return home
        </button>
      </div>
    );
  }

  // Show automatic Table of Contents when an entry has 2 or more headings and reading mode is off
  const showToc = entry.toc.length >= 2 && !isReadingMode;

  return (
    <div
      key={resolvedTheme}
      className="relative min-h-dvh flex flex-col"
      style={{
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)',
      }}
    >
      <FilmGrain />
      <ReadingProgress height={2} color="var(--color-accent)" smooth={false} />

      {/* Minimal top header (hidden when distraction-free Reading Mode is active) */}
      {!isReadingMode && (
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

            <HoverLink
              href={`/${entry.parentRoute === 'read' ? '#read' : entry.parentRoute}`}
              restingRule
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome(entry.parentRoute);
              }}
              className="uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {entry.parentLabel}
            </HoverLink>
          </div>
        </header>
      )}

      <ReadingModeBar
        totalWords={entry.wordCount}
        contextLabel="Note reading mode and theme controls"
      />

      <main
        aria-label={entry.title}
        className="flex-1 editorial-shell py-10 sm:py-16"
      >
        {/* Entry Header */}
        <header
          className={`${isReadingMode ? 'max-w-[62ch]' : 'max-w-[68rem]'} mx-auto pb-10 mb-12 border-b space-y-5`}
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono uppercase tracking-[var(--tracking-micro)]"
            style={{
              fontSize: 'var(--text-micro)',
              color: 'var(--color-text-muted)',
            }}
          >
            <span style={{ color: 'var(--color-accent)' }}>
              {entry.eyebrow}
            </span>
            {entry.draft && (
              <span
                className="px-2 py-0.5 border"
                style={{
                  borderColor: 'var(--color-status-warn)',
                  color: 'var(--color-status-warn)',
                  backgroundColor: 'rgba(233, 168, 59, 0.12)',
                  borderRadius: 'var(--radius-xs)',
                }}
              >
                draft · dev only
              </span>
            )}
            <span aria-hidden="true">·</span>
            <span>{entry.date}</span>
            <span aria-hidden="true">·</span>
            <span>{entry.readingTimeMinutes} min read</span>
            <span className="hidden sm:inline" aria-hidden="true">
              ·
            </span>
            <span className="hidden sm:inline">{entry.wordCount} words</span>
          </div>

          <h1
            className="m-0 font-display font-normal max-w-[20ch]"
            style={{
              fontSize: 'clamp(2.25rem, 5.5vw, 4.5rem)',
              lineHeight: 0.98,
              letterSpacing: 'var(--tracking-section)',
              color: 'var(--color-text)',
            }}
          >
            {entry.title}
          </h1>

          <p
            className="m-0 font-body"
            style={{
              maxWidth: '58ch',
              fontSize: 'var(--text-lead)',
              lineHeight: 'var(--leading-lead)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {entry.summary}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div className="flex flex-wrap items-center gap-2 font-mono">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 border"
                  style={{
                    fontSize: 'var(--text-micro)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-muted)',
                    borderRadius: 'var(--radius-xs)',
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>

            <span
              className="font-mono"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-muted)',
              }}
            >
              {entry.sourceFile}
            </span>
          </div>
        </header>

        {/* Body + Automatic Sticky Table of Contents for Long Entries */}
        <div
          className={
            isReadingMode
              ? 'max-w-[62ch] mx-auto'
              : 'max-w-[68rem] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12'
          }
        >
          {showToc && (
            <aside className="lg:col-span-4">
              <nav
                aria-label="Entry table of contents"
                className="lg:sticky lg:top-28 border-l pl-4 space-y-3"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <p
                  className="m-0 font-mono uppercase tracking-[var(--tracking-micro)]"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: 'var(--color-accent)',
                  }}
                >
                  On this page
                </p>
                <ol className="list-none p-0 m-0 space-y-2.5 font-mono">
                  {entry.toc.map((heading) => (
                    <li
                      key={heading.id}
                      style={{
                        paddingLeft: heading.depth === 3 ? '0.85rem' : 0,
                      }}
                    >
                      <a
                        href={`#${heading.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          scrollTo(`#${heading.id}`, { offset: -108 });
                        }}
                        className="link-draw block transition-colors hover:text-[var(--color-text)]"
                        style={{
                          fontSize: 'var(--text-micro)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        {heading.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>
          )}

          <div
            className={
              isReadingMode
                ? 'w-full min-w-0'
                : showToc
                  ? 'lg:col-span-8 min-w-0'
                  : 'lg:col-span-9 min-w-0'
            }
          >
            <ManifestoRenderer markdown={entry.body} />
          </div>
        </div>

        {/* Previous / Next Entry Navigation (hidden in distraction-free Reading Mode) */}
        {!isReadingMode && (entry.prev || entry.next) && (
          <nav
            aria-label="Previous and next entries"
            className="max-w-[68rem] mx-auto mt-20 pt-10 border-t grid grid-cols-1 sm:grid-cols-2 gap-4"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {entry.prev ? (
              <button
                type="button"
                onClick={() =>
                  onOpenEntry(entry.prev!.collection, entry.prev!.slug)
                }
                className="group text-left p-5 border transition-colors hover:border-[var(--color-accent)] cursor-pointer"
                style={{
                  borderColor: 'var(--color-border-strong)',
                  backgroundColor: 'var(--color-bg-elevated)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <span
                  className="block mb-2 font-mono uppercase tracking-[var(--tracking-micro)]"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  ← previous
                </span>
                <span
                  className="block font-display group-hover:text-[var(--color-accent)] transition-colors"
                  style={{
                    fontSize: 'clamp(1.25rem, 2vw, 1.6rem)',
                    lineHeight: 1.15,
                    color: 'var(--color-text)',
                  }}
                >
                  {entry.prev.title}
                </span>
              </button>
            ) : (
              <div />
            )}

            {entry.next && (
              <button
                type="button"
                onClick={() =>
                  onOpenEntry(entry.next!.collection, entry.next!.slug)
                }
                className="group text-left sm:text-right p-5 border transition-colors hover:border-[var(--color-accent)] cursor-pointer"
                style={{
                  borderColor: 'var(--color-border-strong)',
                  backgroundColor: 'var(--color-bg-elevated)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <span
                  className="block mb-2 font-mono uppercase tracking-[var(--tracking-micro)]"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  next →
                </span>
                <span
                  className="block font-display group-hover:text-[var(--color-accent)] transition-colors"
                  style={{
                    fontSize: 'clamp(1.25rem, 2vw, 1.6rem)',
                    lineHeight: 1.15,
                    color: 'var(--color-text)',
                  }}
                >
                  {entry.next.title}
                </span>
              </button>
            )}
          </nav>
        )}
      </main>
    </div>
  );
}
