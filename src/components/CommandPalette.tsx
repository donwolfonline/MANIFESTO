import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { BUG_EXHIBITS } from '../data/bugExhibits';
import { MANIFESTO_COMMITS } from '../data/commitLog';
import { DELETE_COMPARISONS } from '../data/deleteExamples';
import { MANIFESTO_ITEMS } from '../data/manifestoItems';
import { SHELF_DATA } from '../data/shelfData';
import { useLenis } from '../lib/lenis';
import { preloadTarget } from '../lib/routePreload';
import { ROUTE_GROUP_META, ROUTES } from '../lib/routes';

export type PaletteMode = 'command' | 'search';

export interface CommandPaletteProps {
  isOpen: boolean;
  mode: PaletteMode;
  onClose: () => void;
  onNavigateTarget: (target: string) => void;
  onOpenRawMarkdown: () => void;
  onOpenShortcuts: () => void;
}

interface PaletteEntry {
  id: string;
  group: string;
  title: string;
  subtitle: string;
  shortcut?: string;
  icon?: string;
  isRouteLabel?: boolean;
  keywords: string;
  tier: number;
  priority: number;
  action: () => void;
}

export function CommandPalette({
  isOpen,
  mode,
  onClose,
  onNavigateTarget,
  onOpenRawMarkdown,
  onOpenShortcuts,
}: CommandPaletteProps) {
  const { lenis } = useLenis();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Build unified index driven by ROUTES from src/lib/routes.ts
  const allEntries = useMemo<PaletteEntry[]>(() => {
    const routeEntries: PaletteEntry[] = ROUTES.map((route) => ({
      id: `route-${route.id}`,
      group: `${ROUTE_GROUP_META[route.group].label} (${ROUTE_GROUP_META[route.group].title})`,
      title: route.label,
      subtitle: route.description,
      shortcut: route.shortcut,
      icon: route.icon,
      isRouteLabel: true,
      keywords: `${route.label} ${route.path} ${route.group} ${route.description} ${route.keywords}`,
      tier: 1,
      priority: route.priority,
      action: () => onNavigateTarget(route.id),
    }));

    const actions: PaletteEntry[] = [
      {
        id: 'page-read',
        group: 'Actions',
        title: '/#read',
        subtitle: 'Jump to Ten Working Principles section',
        isRouteLabel: true,
        keywords: 'read principles essay manifesto rules',
        tier: 2,
        priority: 9,
        action: () => onNavigateTarget('read'),
      },
      {
        id: 'page-privacy',
        group: 'Actions',
        title: '/privacy',
        subtitle: 'Plain-language privacy & security notes',
        isRouteLabel: true,
        keywords: 'privacy data cookies retention security policy',
        tier: 2,
        priority: 6,
        action: () => onNavigateTarget('privacy'),
      },
      {
        id: 'action-raw',
        group: 'Actions',
        title: 'Inspect Raw Markdown Source',
        subtitle: 'working_copy.md',
        keywords: 'raw markdown source md copy',
        tier: 2,
        priority: 6,
        action: () => onOpenRawMarkdown(),
      },
      {
        id: 'action-shortcuts',
        group: 'Actions',
        title: 'View Keyboard Shortcuts',
        subtitle: 'press ?',
        shortcut: '?',
        keywords: 'shortcuts keys help hotkeys',
        tier: 2,
        priority: 6,
        action: () => onOpenShortcuts(),
      },
    ];

    const principles: PaletteEntry[] = MANIFESTO_ITEMS.map((item) => ({
      id: `principle-${item.number}`,
      group: 'Principles (#read)',
      title: `${String(item.number).padStart(2, '0')}. ${item.title}`,
      subtitle: `/#item-${item.number}`,
      keywords: item.body
        .map((b) =>
          b.type === 'paragraph'
            ? b.text
            : b.type === 'bullets'
              ? b.items.join(' ')
              : b.lines.join(' '),
        )
        .join(' '),
      tier: 3,
      priority: 5,
      action: () => onNavigateTarget(`item-${item.number}`),
    }));

    const bugs: PaletteEntry[] = BUG_EXHIBITS.map((exhibit) => ({
      id: `bug-${exhibit.id}`,
      group: '/bug-museum',
      title: `Exhibit ${exhibit.number}: ${exhibit.title}`,
      subtitle: `/bug-museum · ${exhibit.category}`,
      keywords: `${exhibit.cause} ${exhibit.cost} ${exhibit.lesson} ${exhibit.year}`,
      tier: 4,
      priority: 4,
      action: () => onNavigateTarget('bug-museum'),
    }));

    const commits: PaletteEntry[] = MANIFESTO_COMMITS.map((c) => ({
      id: `commit-${c.id}`,
      group: '/commit-log',
      title: `${c.hash} ${c.prefix}: ${c.subject}`,
      subtitle: `/commit-log · ${c.date}`,
      keywords: `${c.filePath} ${c.hunks.map((h) => h.blame.note).join(' ')}`,
      tier: 5,
      priority: 3,
      action: () => onNavigateTarget('commit-log'),
    }));

    const comparisons: PaletteEntry[] = DELETE_COMPARISONS.map((ex) => ({
      id: `delete-${ex.id}`,
      group: '/delete',
      title: `${ex.number}. ${ex.title}`,
      subtitle: `/delete · ${ex.filename}`,
      keywords: `${ex.lesson} ${ex.filename}`,
      tier: 5,
      priority: 3,
      action: () => onNavigateTarget('delete'),
    }));

    const shelfBooks: PaletteEntry[] = SHELF_DATA.books.map((book) => ({
      id: `shelf-${book.id}`,
      group: '/shelf',
      title: `${book.title} — ${book.author}`,
      subtitle: `/shelf · ${book.category}`,
      keywords: `${book.oneLineReason} ${book.category}`,
      tier: 6,
      priority: 2,
      action: () => onNavigateTarget('shelf'),
    }));

    return [
      ...routeEntries,
      ...actions,
      ...principles,
      ...bugs,
      ...commits,
      ...comparisons,
      ...shelfBooks,
    ];
  }, [onNavigateTarget, onOpenRawMarkdown, onOpenShortcuts]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return allEntries.filter((entry) =>
        mode === 'command' ? entry.tier <= 2 : entry.tier <= 3,
      );
    }

    return allEntries
      .filter((entry) =>
        `${entry.title} ${entry.subtitle} ${entry.group} ${entry.keywords}`
          .toLowerCase()
          .includes(q),
      )
      .sort((a, b) => a.tier - b.tier || b.priority - a.priority)
      .slice(0, 18);
  }, [allEntries, query, mode]);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    setQuery('');
    setSelectedIndex(0);

    lenis?.stop();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
      lenis?.start();
      document.body.style.overflow = prevOverflow;
      previousFocusRef.current?.focus();
    };
  }, [isOpen, mode, lenis]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const el = itemRefs.current.get(selectedIndex);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleRunEntry = (entry: PaletteEntry | undefined) => {
    if (!entry) return;
    onClose();
    window.requestAnimationFrame(() => entry.action());
  };

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (results.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % results.length);
      }
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (results.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
      }
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      handleRunEntry(results[selectedIndex]);
    }
  };

  const activeDescendantId = results[selectedIndex]
    ? `palette-opt-${results[selectedIndex].id}`
    : undefined;

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 flex items-start justify-center pt-[12dvh] px-4 backdrop-enter"
      style={{
        zIndex: 'var(--z-overlay)',
        backgroundColor: 'rgba(14, 12, 13, 0.78)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'search' ? 'Site-wide search' : 'Command palette'}
        data-lenis-prevent
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl border overflow-hidden shadow-2xl panel-enter"
        style={{
          borderColor: 'var(--color-border-strong)',
          backgroundColor: 'var(--color-bg-deep)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        {/* Search / Command Input Row */}
        <div
          className="px-4 sm:px-5 py-3.5 border-b flex items-center gap-3 font-mono"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-bg)',
          }}
        >
          <span
            aria-hidden="true"
            className="shrink-0"
            style={{
              color: 'var(--color-accent)',
              fontSize: 'var(--text-meta)',
            }}
          >
            {mode === 'search' ? '/' : '⌘K'}
          </span>

          <label htmlFor="site-command-input" className="sr-only">
            {mode === 'search'
              ? 'Search across pages, principles, bugs, and commits'
              : 'Jump to a page or run a command'}
          </label>

          <input
            ref={inputRef}
            id="site-command-input"
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-listbox"
            aria-activedescendant={activeDescendantId}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={
              mode === 'search'
                ? 'Search principles, bug exhibits, commits, pages…'
                : 'Jump to any route (/today, /naming, /terminal…) or search…'
            }
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-transparent text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
            style={{ fontSize: 'var(--text-meta)' }}
          />

          <kbd
            className="shrink-0 px-2 py-0.5 border font-mono uppercase"
            style={{
              fontSize: '0.625rem',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-muted)',
              borderRadius: 'var(--radius-xs)',
            }}
          >
            esc
          </kbd>
        </div>

        {/* Results Listbox */}
        <div
          id="command-palette-listbox"
          role="listbox"
          aria-label="Matching pages and content"
          className="max-h-[55dvh] overflow-y-auto py-2"
        >
          {results.length === 0 ? (
            <p
              className="m-0 px-5 py-8 text-center font-mono"
              style={{
                fontSize: 'var(--text-meta)',
                color: 'var(--color-text-muted)',
              }}
            >
              No matches for &ldquo;{query}&rdquo;. Try &ldquo;/terminal&rdquo;,
              &ldquo;/naming&rdquo;, or &ldquo;/delete&rdquo;.
            </p>
          ) : (
            results.map((entry, idx) => {
              const active = idx === selectedIndex;
              const prevGroup = idx > 0 ? results[idx - 1].group : null;
              const showGroupLabel = entry.group !== prevGroup;

              return (
                <div key={entry.id}>
                  {showGroupLabel && (
                    <div
                      className="px-5 pt-3 pb-1 font-mono uppercase tracking-[var(--tracking-micro)]"
                      style={{
                        fontSize: '0.625rem',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {entry.group}
                    </div>
                  )}

                  <button
                    ref={(node) => {
                      if (node) itemRefs.current.set(idx, node);
                      else itemRefs.current.delete(idx);
                    }}
                    id={`palette-opt-${entry.id}`}
                    role="option"
                    aria-selected={active}
                    type="button"
                    onMouseEnter={() => {
                      setSelectedIndex(idx);
                      preloadTarget(entry.title.replace(/^\//, ''));
                    }}
                    onClick={() => handleRunEntry(entry)}
                    className="w-full px-5 py-2.5 flex items-center justify-between gap-4 text-left border-l-2 transition-colors cursor-pointer"
                    style={{
                      borderColor: active
                        ? 'var(--color-accent)'
                        : 'transparent',
                      backgroundColor: active
                        ? 'var(--color-bg-elevated)'
                        : 'transparent',
                    }}
                  >
                    <span className="inline-flex items-center gap-2.5 min-w-0">
                      {entry.icon && (
                        <span
                          aria-hidden="true"
                          className="inline-flex items-center shrink-0"
                          style={{
                            color: active
                              ? 'var(--color-accent)'
                              : 'var(--color-text-muted)',
                          }}
                          dangerouslySetInnerHTML={{ __html: entry.icon }}
                        />
                      )}
                      <span
                        className={`font-mono truncate ${
                          entry.isRouteLabel
                            ? 'uppercase tracking-[var(--tracking-micro)]'
                            : ''
                        }`}
                        style={{
                          fontSize: entry.isRouteLabel
                            ? 'var(--text-micro)'
                            : 'var(--text-meta)',
                          color: active
                            ? 'var(--color-text)'
                            : 'var(--color-text-secondary)',
                        }}
                      >
                        {entry.title}
                      </span>
                    </span>

                    <span className="inline-flex items-center gap-2.5 shrink-0 font-mono">
                      <span
                        className="hidden sm:inline-block truncate max-w-[24rem]"
                        style={{
                          fontSize: 'var(--text-micro)',
                          color: active
                            ? 'var(--color-accent)'
                            : 'var(--color-text-muted)',
                        }}
                      >
                        {entry.subtitle}
                      </span>
                      {entry.shortcut && (
                        <kbd
                          className="px-1.5 py-0.5 border uppercase"
                          style={{
                            fontSize: '0.625rem',
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text-muted)',
                            borderRadius: 'var(--radius-xs)',
                          }}
                        >
                          {entry.shortcut}
                        </kbd>
                      )}
                    </span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer key hints */}
        <div
          className="px-5 py-2.5 border-t flex flex-wrap items-center justify-between gap-3 font-mono"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-bg)',
            fontSize: 'var(--text-micro)',
            color: 'var(--color-text-muted)',
          }}
        >
          <span>↑/↓ navigate · ↵ open · esc close</span>
          <span>press ? for all shortcuts</span>
        </div>
      </div>
    </div>
  );
}
