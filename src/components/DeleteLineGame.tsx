import { useMemo, useState } from 'react';
import {
  DELETE_GAME_FILENAME,
  DELETE_GAME_LINES,
  type DeletableCodeLine,
} from '../data/deleteExamples';
import { useShikiTokens } from '../lib/shiki';

export interface DeleteLineGameProps {
  filename?: string;
  lines?: DeletableCodeLine[];
}

export function DeleteLineGame({
  filename = DELETE_GAME_FILENAME,
  lines = DELETE_GAME_LINES,
}: DeleteLineGameProps) {
  const [markedLines, setMarkedLines] = useState<Set<number>>(() => new Set());
  const [checked, setChecked] = useState(false);
  const [cleanPreview, setCleanPreview] = useState(false);

  const combinedCode = useMemo(
    () => lines.map((l) => l.code).join('\n'),
    [lines],
  );
  const tokens = useShikiTokens(combinedCode);

  const totalSafe = useMemo(
    () => lines.filter((l) => l.safeToDelete).length,
    [lines],
  );

  const toggleLine = (lineNumber: number) => {
    if (cleanPreview) return;
    setMarkedLines((prev) => {
      const next = new Set(prev);
      if (next.has(lineNumber)) {
        next.delete(lineNumber);
      } else {
        next.add(lineNumber);
      }
      return next;
    });
    if (checked) {
      setChecked(false);
    }
  };

  const results = useMemo(() => {
    let correctDeletes = 0;
    let brokenEssentials = 0;
    let missedSafe = 0;

    lines.forEach((line) => {
      const isMarked = markedLines.has(line.lineNumber);
      if (isMarked && line.safeToDelete) correctDeletes += 1;
      if (isMarked && !line.safeToDelete) brokenEssentials += 1;
      if (!isMarked && line.safeToDelete) missedSafe += 1;
    });

    return { correctDeletes, brokenEssentials, missedSafe };
  }, [lines, markedLines]);

  const verdictMessage = useMemo(() => {
    if (results.brokenEssentials > 0) {
      return `CI turned red—you deleted ${results.brokenEssentials} load-bearing ${results.brokenEssentials === 1 ? 'line' : 'lines'}, while catching ${results.correctDeletes}/${totalSafe} dead ones.`;
    }
    if (results.correctDeletes === totalSafe) {
      return `Clean sweep: all ${totalSafe} unnecessary lines removed, 0 broken callers, and the test suite is greener than ever.`;
    }
    if (results.correctDeletes === 0) {
      return `Zero lines deleted—safe, sure, but ${totalSafe} dead lines are still paying rent in this file.`;
    }
    return `Good instincts: ${results.correctDeletes}/${totalSafe} dead lines removed with 0 regressions. ${results.missedSafe} more can safely go.`;
  }, [results, totalSafe]);

  const handleReset = () => {
    setMarkedLines(new Set());
    setChecked(false);
    setCleanPreview(false);
  };

  return (
    <div
      className="border overflow-hidden"
      style={{
        borderColor: 'var(--color-border-strong)',
        backgroundColor: '#191718',
        borderRadius: 'var(--radius-sm)',
      }}
    >
      {/* Top interactive bar */}
      <div
        className="px-4 sm:px-5 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 font-mono"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-bg)',
          fontSize: 'var(--text-micro)',
        }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span style={{ color: 'var(--color-text)' }}>{filename}</span>
          <span style={{ color: 'var(--color-text-muted)' }}>
            {cleanPreview
              ? `${lines.length - totalSafe} clean lines remaining`
              : `${markedLines.size} marked · ${totalSafe} safe to cut`}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setCleanPreview(false);
              setChecked(true);
            }}
            className="px-3 py-1 border uppercase tracking-[var(--tracking-micro)] transition-colors cursor-pointer"
            style={{
              borderRadius: 'var(--radius-xs)',
              backgroundColor: 'var(--color-accent)',
              borderColor: 'var(--color-accent)',
              color: 'var(--color-accent-ink)',
            }}
          >
            check diff
          </button>

          {checked && (
            <button
              type="button"
              onClick={() => setCleanPreview((prev) => !prev)}
              aria-pressed={cleanPreview}
              className="px-3 py-1 border uppercase tracking-[var(--tracking-micro)] transition-colors cursor-pointer"
              style={{
                borderRadius: 'var(--radius-xs)',
                borderColor: cleanPreview
                  ? '#6ec49c'
                  : 'var(--color-border-strong)',
                color: cleanPreview ? '#6ec49c' : 'var(--color-text)',
                backgroundColor: cleanPreview
                  ? 'rgba(110, 196, 156, 0.12)'
                  : 'transparent',
              }}
            >
              {cleanPreview ? 'back to review' : 'show cleanest version'}
            </button>
          )}

          {(markedLines.size > 0 || checked) && (
            <button
              type="button"
              onClick={handleReset}
              className="px-2.5 py-1 border uppercase tracking-[var(--tracking-micro)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer"
              style={{
                borderRadius: 'var(--radius-xs)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-muted)',
              }}
            >
              reset
            </button>
          )}
        </div>
      </div>

      {/* Clickable Shiki-highlighted code lines */}
      <div
        className="py-3 font-mono overflow-x-auto"
        style={{
          fontSize: 'clamp(0.75rem, 0.35vw + 0.62rem, 0.85rem)',
          lineHeight: 1.7,
        }}
      >
        {lines.map((line, idx) => {
          const isMarked = markedLines.has(line.lineNumber);
          const lineTokens = tokens?.[idx];

          // In clean preview mode, hide all safe-to-delete lines to show the finished artifact
          if (cleanPreview && line.safeToDelete) {
            return null;
          }

          let rowBorder = 'transparent';
          let rowBg = 'transparent';
          let gutterSymbol = ' ';
          let gutterColor = 'var(--color-text-muted)';
          let statusLabel: string | null = null;
          let statusColor = 'var(--color-text-muted)';

          if (checked) {
            if (isMarked && line.safeToDelete) {
              rowBorder = '#6ec49c';
              rowBg = 'rgba(110, 196, 156, 0.12)';
              gutterSymbol = '✓';
              gutterColor = '#6ec49c';
              statusLabel = 'safe to delete';
              statusColor = '#6ec49c';
            } else if (isMarked && !line.safeToDelete) {
              rowBorder = '#f4726b';
              rowBg = 'rgba(244, 114, 107, 0.14)';
              gutterSymbol = '✗';
              gutterColor = '#f4726b';
              statusLabel = 'needed — broke the build';
              statusColor = '#f4726b';
            } else if (!isMarked && line.safeToDelete) {
              rowBorder = '#e9a83b';
              rowBg = 'rgba(233, 168, 59, 0.09)';
              gutterSymbol = '!';
              gutterColor = '#e9a83b';
              statusLabel = 'safe to delete (missed)';
              statusColor = '#e9a83b';
            }
          } else if (isMarked) {
            rowBorder = 'var(--color-accent)';
            rowBg = 'rgba(240, 100, 45, 0.12)';
            gutterSymbol = '−';
            gutterColor = 'var(--color-accent)';
          }

          const showReason =
            checked && !cleanPreview && (isMarked || line.safeToDelete);

          return (
            <div key={line.lineNumber}>
              <button
                type="button"
                onClick={() => toggleLine(line.lineNumber)}
                disabled={cleanPreview}
                aria-pressed={isMarked}
                className="w-full text-left flex items-baseline gap-3 px-4 py-0.5 border-l-2 transition-colors hover:bg-[rgba(242,238,232,0.04)] disabled:hover:bg-transparent cursor-pointer disabled:cursor-default"
                style={{
                  borderColor: rowBorder,
                  backgroundColor: rowBg,
                }}
              >
                <span
                  aria-hidden="true"
                  className="select-none shrink-0 w-5 text-right tabular-nums"
                  style={{ color: '#968f86' }}
                >
                  {line.lineNumber}
                </span>

                <span
                  aria-hidden="true"
                  className="select-none shrink-0 w-3 text-center font-medium"
                  style={{ color: gutterColor }}
                >
                  {gutterSymbol}
                </span>

                <span
                  className={`whitespace-pre flex-1 ${
                    isMarked && !cleanPreview ? 'line-through opacity-55' : ''
                  }`}
                >
                  {lineTokens ? (
                    lineTokens.map((token, tIdx) => (
                      <span
                        key={tIdx}
                        style={{
                          color: token.color,
                          fontStyle:
                            token.fontStyle === 1 ? 'italic' : undefined,
                        }}
                      >
                        {token.content}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: '#f2eee8' }}>
                      {line.code}
                    </span>
                  )}
                </span>
              </button>

              {showReason && (
                <div
                  className="pl-14 pr-4 py-1.5 border-l-2 font-mono flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 panel-enter"
                  style={{
                    borderColor: rowBorder,
                    backgroundColor: 'var(--color-bg)',
                    fontSize: 'var(--text-micro)',
                  }}
                >
                  {statusLabel && (
                    <span
                      className="uppercase tracking-[var(--tracking-micro)]"
                      style={{ color: statusColor }}
                    >
                      [{statusLabel}]
                    </span>
                  )}
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    {line.reason}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Live score / instruction footer */}
      <div
        aria-live="polite"
        className="px-4 sm:px-5 py-3.5 border-t font-mono"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-bg)',
          fontSize: 'var(--text-micro)',
          color: checked
            ? results.brokenEssentials > 0
              ? '#f4726b'
              : '#6ec49c'
            : 'var(--color-text-muted)',
        }}
      >
        {checked
          ? verdictMessage
          : 'Click any line you think is unnecessary, then press "check diff" to see what survived.'}
      </div>
    </div>
  );
}
