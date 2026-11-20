import { useEffect, useState } from 'react';
import { useLenis } from '../lib/lenis';
import type { TocEntry } from '../lib/markdown';

interface TableOfContentsProps {
  entries: TocEntry[];
}

export function TableOfContents({ entries }: TableOfContentsProps) {
  const { scrollTo } = useLenis();
  const [activeId, setActiveId] = useState<string>(entries[0]?.id ?? '');

  useEffect(() => {
    if (entries.length === 0) return;

    const elements = entries
      .map((entry) => document.getElementById(entry.id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (observerEntries) => {
        const visible = observerEntries
          .filter((item) => item.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          );

        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: '-18% 0px -64% 0px',
        threshold: 0,
      },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <>
      {/* Mobile / tablet compact horizontal index */}
      <nav
        aria-label="Manifesto chapters"
        className="lg:hidden mb-12 pb-6 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <p
          className="mb-3 font-mono uppercase tracking-[var(--tracking-micro)]"
          style={{
            fontSize: 'var(--text-micro)',
            color: 'var(--color-text-muted)',
          }}
        >
          Index
        </p>
        <ol className="flex flex-wrap gap-x-5 gap-y-2 list-none p-0 m-0">
          {entries.map((entry) => {
            const isActive = activeId === entry.id;
            return (
              <li key={entry.id}>
                <a
                  href={`#${entry.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollTo(`#${entry.id}`, { offset: -104 });
                  }}
                  className="inline-flex items-baseline gap-1.5 font-mono transition-colors"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: isActive
                      ? 'var(--color-text)'
                      : 'var(--color-text-muted)',
                  }}
                >
                  {entry.index && (
                    <span
                      style={{
                        color: isActive
                          ? 'var(--color-accent)'
                          : 'var(--color-text-muted)',
                      }}
                    >
                      {entry.index}
                    </span>
                  )}
                  <span>{entry.label}</span>
                </a>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Desktop sticky marginalia index */}
      <aside className="hidden lg:block">
        <nav
          aria-label="Manifesto chapters"
          className="sticky top-28 pr-6"
          style={{ zIndex: 'var(--z-sticky)' }}
        >
          <p
            className="mb-5 font-mono uppercase tracking-[var(--tracking-micro)]"
            style={{
              fontSize: 'var(--text-micro)',
              color: 'var(--color-text-muted)',
            }}
          >
            Index
          </p>

          <ol
            className="space-y-3.5 list-none p-0 m-0 border-l pl-4"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {entries.map((entry) => {
              const isActive = activeId === entry.id;
              return (
                <li key={entry.id} className="relative">
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute -left-[17px] top-[0.42rem] h-2.5 w-[2px]"
                      style={{ backgroundColor: 'var(--color-accent)' }}
                    />
                  )}
                  <a
                    href={`#${entry.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollTo(`#${entry.id}`, { offset: -112 });
                    }}
                    className="group flex items-baseline gap-2.5 font-mono leading-snug transition-colors"
                    style={{
                      fontSize: 'var(--text-micro)',
                      color: isActive
                        ? 'var(--color-text)'
                        : 'var(--color-text-muted)',
                    }}
                  >
                    {entry.index && (
                      <span
                        className="shrink-0 tabular-nums transition-colors"
                        style={{
                          color: isActive
                            ? 'var(--color-accent)'
                            : 'var(--color-text-muted)',
                        }}
                      >
                        {entry.index}
                      </span>
                    )}
                    <span className="group-hover:text-[var(--color-text)] transition-colors">
                      {entry.label}
                    </span>
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>
      </aside>
    </>
  );
}
