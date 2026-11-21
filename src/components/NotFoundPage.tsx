import { useState } from 'react';
import { MANIFESTO_ITEMS, type ManifestoItem } from '../data/manifestoItems';
import type { ManifestoMeta } from '../lib/markdown';
import { FilmGrain } from './FilmGrain';
import { HoverLink } from './HoverLink';

export interface NotFoundPageProps {
  meta: ManifestoMeta;
  missingPath: string;
  items?: ManifestoItem[];
  onGoHome: () => void;
  onOpenTerminal: () => void;
  onOpenWall: () => void;
}

function stripInline(text: string): string {
  return text.replace(/\*([^*]+)\*/g, '$1');
}

function getPreviewBody(item: ManifestoItem): string[] {
  const out: string[] = [];
  item.body.forEach((block) => {
    if (block.type === 'paragraph') out.push(stripInline(block.text));
    if (block.type === 'lines') out.push(...block.lines.map(stripInline));
    if (block.type === 'bullets')
      out.push(...block.items.map((x) => `– ${stripInline(x)}`));
  });
  return out;
}

export function NotFoundPage({
  meta,
  missingPath,
  items = MANIFESTO_ITEMS,
  onGoHome,
  onOpenTerminal,
  onOpenWall,
}: NotFoundPageProps) {
  const [pickIndex, setPickIndex] = useState<number>(() =>
    Math.floor(Math.random() * items.length),
  );

  const principle = items[pickIndex] ?? items[0];

  const handleNextRandom = () => {
    if (items.length <= 1) return;
    setPickIndex((prev) => {
      let next = Math.floor(Math.random() * items.length);
      if (next === prev) next = (prev + 1) % items.length;
      return next;
    });
  };

  return (
    <div
      className="relative min-h-dvh flex flex-col"
      style={{
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)',
      }}
    >
      <FilmGrain />

      {/* Minimal top header */}
      <header
        className="shrink-0 border-b"
        style={{
          height: 'var(--header-height)',
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-bg)',
        }}
      >
        <div className="editorial-shell h-full flex items-center justify-between gap-4 font-mono">
          <HoverLink
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onGoHome();
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
              style={{ backgroundColor: 'var(--color-status-error)' }}
            />
            <span>~/{meta.filename}</span>
          </HoverLink>

          <span
            className="uppercase tracking-[var(--tracking-micro)]"
            style={{
              fontSize: 'var(--text-micro)',
              color: 'var(--color-status-error)',
            }}
          >
            exit code 404
          </span>
        </div>
      </header>

      <main
        aria-label="404 Build Failure"
        className="flex-1 editorial-shell py-12 sm:py-20 flex flex-col justify-center"
      >
        <div className="max-w-[54rem] mx-auto w-full space-y-8">
          {/* Failing Build Log Panel */}
          <div
            className="border overflow-hidden"
            style={{
              borderColor: 'var(--color-status-error)',
              backgroundColor: 'var(--color-bg-deep)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div
              className="px-4 sm:px-6 py-3 border-b flex flex-wrap items-center justify-between gap-3 font-mono uppercase tracking-[var(--tracking-micro)]"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'rgba(244, 114, 107, 0.1)',
                fontSize: 'var(--text-micro)',
              }}
            >
              <span style={{ color: 'var(--color-status-error)' }}>
                ✗ build failed · route resolution
              </span>
              <span style={{ color: 'var(--color-text-muted)' }}>
                vite / tsc
              </span>
            </div>

            <div
              className="p-5 sm:p-7 font-mono space-y-3"
              style={{
                fontSize: 'var(--text-meta)',
                lineHeight: 1.7,
              }}
            >
              <p className="m-0" style={{ color: 'var(--color-text-muted)' }}>
                $ resolve-route {missingPath}
              </p>

              <h1
                className="m-0 font-mono font-medium"
                style={{
                  fontSize: 'clamp(1.1rem, 2.2vw, 1.55rem)',
                  color: 'var(--color-status-error)',
                }}
              >
                error: principle not found
              </h1>

              <div
                className="pl-4 border-l space-y-1"
                style={{
                  borderColor: 'var(--color-border-strong)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <p className="m-0">
                  at router.ts:404 — no matching entry for{' '}
                  <code style={{ color: 'var(--color-text)' }}>
                    &ldquo;{missingPath}&rdquo;
                  </code>
                </p>
                <p className="m-0" style={{ color: 'var(--color-text-muted)' }}>
                  hint: maybe this branch was deleted in a cleaner refactor, or
                  you typed a URL from memory at 2am.
                </p>
              </div>
            </div>

            {/* Action bar */}
            <div
              className="px-5 sm:px-7 py-4 border-t flex flex-wrap items-center gap-3 font-mono"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg)',
                fontSize: 'var(--text-micro)',
              }}
            >
              <button
                type="button"
                onClick={onGoHome}
                className="px-4 py-2 border uppercase tracking-[var(--tracking-micro)] cursor-pointer"
                style={{
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: 'var(--color-accent)',
                  borderColor: 'var(--color-accent)',
                  color: 'var(--color-accent-ink)',
                }}
              >
                ← go home
              </button>

              <button
                type="button"
                onClick={onOpenTerminal}
                className="px-3.5 py-2 border uppercase tracking-[var(--tracking-micro)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer"
                style={{
                  borderRadius: 'var(--radius-xs)',
                  borderColor: 'var(--color-border-strong)',
                  color: 'var(--color-text)',
                }}
              >
                open /terminal
              </button>

              <button
                type="button"
                onClick={onOpenWall}
                className="px-3.5 py-2 border uppercase tracking-[var(--tracking-micro)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer"
                style={{
                  borderRadius: 'var(--radius-xs)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                visit /wall
              </button>
            </div>
          </div>

          {/* Random Principle consolation placard */}
          {principle && (
            <section
              aria-label="Random principle"
              className="border p-6 sm:p-8 space-y-5"
              style={{
                borderColor: 'var(--color-border-strong)',
                backgroundColor: 'var(--color-bg-elevated)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div
                className="flex flex-wrap items-center justify-between gap-3 font-mono uppercase tracking-[var(--tracking-micro)]"
                style={{ fontSize: 'var(--text-micro)' }}
              >
                <span style={{ color: 'var(--color-accent)' }}>
                  while you are here · principle{' '}
                  {String(principle.number).padStart(2, '0')}
                </span>
                <button
                  type="button"
                  onClick={handleNextRandom}
                  className="link-draw cursor-pointer"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  another principle ↻
                </button>
              </div>

              <h2
                className="m-0 font-mono font-normal"
                style={{
                  fontSize: 'clamp(1rem, 1.5vw, 1.3rem)',
                  color: 'var(--color-text)',
                }}
              >
                <span
                  aria-hidden="true"
                  className="mr-2"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  ###
                </span>
                {principle.number}. {principle.title}
              </h2>

              <div className="space-y-3">
                {getPreviewBody(principle).map((line, idx) => (
                  <p
                    key={idx}
                    className="m-0 font-body"
                    style={{
                      maxWidth: 'var(--measure)',
                      fontSize: 'var(--text-body)',
                      lineHeight: 'var(--leading-body)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {line}
                  </p>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
