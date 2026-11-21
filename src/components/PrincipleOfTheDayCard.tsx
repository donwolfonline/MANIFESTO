import { useMemo } from 'react';
import type { ManifestoItem } from '../data/manifestoItems';
import { getPrincipleOfTheDay } from '../lib/principleOfTheDay';
import { getPreloadHandlers } from '../lib/routePreload';

export interface PrincipleOfTheDayCardProps {
  items: ManifestoItem[];
  onOpenToday?: () => void;
  onSelectReadingItem?: (itemNumber: number) => void;
}

export function PrincipleOfTheDayCard({
  items,
  onOpenToday,
  onSelectReadingItem,
}: PrincipleOfTheDayCardProps) {
  const selection = useMemo(() => getPrincipleOfTheDay(items), [items]);
  const { item, dateKey, hashHex } = selection;
  const numStr = String(item.number).padStart(2, '0');

  return (
    <aside
      aria-label="Principle of the day"
      className="editorial-shell py-8 sm:py-10"
    >
      <div
        className="border p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5"
        style={{
          borderColor: 'var(--color-border-strong)',
          backgroundColor: 'var(--color-bg-elevated)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <div className="space-y-2 min-w-0">
          <div
            className="flex flex-wrap items-center gap-2.5 font-mono uppercase tracking-[var(--tracking-micro)]"
            style={{
              fontSize: 'var(--text-micro)',
              color: 'var(--color-text-muted)',
            }}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: 'var(--color-accent)' }}
              aria-hidden="true"
            />
            <span style={{ color: 'var(--color-accent)' }}>
              Principle of the day
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{dateKey}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">#{numStr}</span>
            <span className="hidden sm:inline" aria-hidden="true">
              ·
            </span>
            <span className="hidden sm:inline tabular-nums">
              0x{hashHex}
            </span>
          </div>

          <h2
            className="m-0 font-display font-normal"
            style={{
              fontSize: 'clamp(1.45rem, 2.5vw, 2.1rem)',
              lineHeight: 1.08,
              color: 'var(--color-text)',
            }}
          >
            <span
              className="font-mono mr-2"
              style={{
                fontSize: '0.68em',
                color: 'var(--color-accent)',
              }}
            >
              {numStr}.
            </span>
            {item.title}
          </h2>

          <p
            className="m-0 font-body"
            style={{
              maxWidth: '60ch',
              fontSize: 'var(--text-meta)',
              lineHeight: 1.6,
              color: 'var(--color-text-secondary)',
            }}
          >
            {item.summary}
          </p>
        </div>

        <div className="shrink-0 flex flex-wrap items-center gap-3 font-mono">
          {onSelectReadingItem && (
            <button
              type="button"
              onClick={() => onSelectReadingItem(item.number)}
              className="px-3 py-2 border uppercase tracking-[var(--tracking-micro)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer"
              style={{
                fontSize: 'var(--text-micro)',
                borderColor: 'var(--color-border-strong)',
                color: 'var(--color-text-secondary)',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              read #{numStr} ↓
            </button>
          )}

          <a
            href="/today"
            {...getPreloadHandlers('today')}
            onClick={(e) => {
              if (onOpenToday) {
                e.preventDefault();
                onOpenToday();
              }
            }}
            className="px-3.5 py-2 border uppercase tracking-[var(--tracking-micro)] transition-colors cursor-pointer no-underline"
            style={{
              fontSize: 'var(--text-micro)',
              backgroundColor: 'var(--color-accent)',
              borderColor: 'var(--color-accent)',
              color: 'var(--color-accent-ink)',
              borderRadius: 'var(--radius-xs)',
            }}
          >
            open /today →
          </a>
        </div>
      </div>
    </aside>
  );
}
