import { useEffect, useState } from 'react';
import type { BugCodeSnippet } from '../data/bugExhibits';

export interface InteractiveCodeDiffProps {
  snippet: BugCodeSnippet;
  /** Resets the toggle whenever a different exhibit is opened */
  exhibitId: string;
}

export function InteractiveCodeDiff({
  snippet,
  exhibitId,
}: InteractiveCodeDiffProps) {
  const [isFixed, setIsFixed] = useState(false);

  useEffect(() => {
    setIsFixed(false);
  }, [exhibitId]);

  const beforeStartLine = 1;
  const diffLineNumber = beforeStartLine + snippet.contextBefore.length;
  const afterStartLine = diffLineNumber + 1;

  return (
    <div
      className="border overflow-hidden"
      style={{
        borderColor: 'var(--color-border-strong)',
        backgroundColor: '#191718',
        borderRadius: 'var(--radius-sm)',
      }}
    >
      <div
        className="px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3 font-mono"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-bg)',
          fontSize: 'var(--text-micro)',
        }}
      >
        <div className="flex items-center gap-3">
          <span style={{ color: 'var(--color-text)' }}>{snippet.filename}</span>
          <span
            className="uppercase tracking-[var(--tracking-micro)] px-2 py-0.5 border"
            style={{
              borderRadius: 'var(--radius-xs)',
              borderColor: isFixed ? '#6ec49c' : 'var(--color-accent)',
              color: isFixed ? '#6ec49c' : 'var(--color-accent)',
              backgroundColor: isFixed
                ? 'rgba(110, 196, 156, 0.12)'
                : 'var(--color-accent-soft)',
            }}
          >
            {isFixed ? 'fixed ✓' : 'broken'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsFixed((prev) => !prev)}
          aria-pressed={isFixed}
          className="px-3 py-1 font-mono uppercase tracking-[var(--tracking-micro)] border transition-colors cursor-pointer"
          style={{
            fontSize: 'var(--text-micro)',
            borderRadius: 'var(--radius-xs)',
            backgroundColor: isFixed ? 'transparent' : 'var(--color-accent)',
            borderColor: isFixed
              ? 'var(--color-border-strong)'
              : 'var(--color-accent)',
            color: isFixed ? 'var(--color-text)' : 'var(--color-accent-ink)',
          }}
        >
          {isFixed ? 'show broken' : 'fix it'}
        </button>
      </div>

      <div
        className="overflow-x-auto py-4 font-mono"
        style={{
          fontSize: 'var(--text-meta)',
          lineHeight: 1.7,
        }}
      >
        {snippet.contextBefore.map((line, idx) => (
          <div key={`pre-${idx}`} className="flex px-4 gap-4">
            <span
              aria-hidden="true"
              className="select-none shrink-0 w-6 text-right tabular-nums"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {beforeStartLine + idx}
            </span>
            <span
              aria-hidden="true"
              className="select-none shrink-0 w-3 text-center"
            >
              {' '}
            </span>
            <code
              className="whitespace-pre"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {line}
            </code>
          </div>
        ))}

        <div className="my-1">
          <div
            className="flex px-4 gap-4 border-l-2 transition-[background-color,opacity]"
            style={{
              borderColor: 'var(--color-accent)',
              backgroundColor: isFixed
                ? 'rgba(240, 100, 45, 0.08)'
                : 'rgba(240, 100, 45, 0.16)',
              opacity: isFixed ? 0.62 : 1,
              transitionDuration: '320ms',
            }}
          >
            <span
              aria-hidden="true"
              className="select-none shrink-0 w-6 text-right tabular-nums"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {diffLineNumber}
            </span>
            <span
              aria-hidden="true"
              className="select-none shrink-0 w-3 text-center font-medium"
              style={{ color: 'var(--color-accent)' }}
            >
              {isFixed ? '-' : '!'}
            </span>
            <code
              className={`whitespace-pre ${isFixed ? 'line-through' : ''}`}
              style={{
                color: isFixed
                  ? 'var(--color-text-muted)'
                  : 'var(--color-text)',
              }}
            >
              {snippet.brokenLine}
            </code>
          </div>

          {/* Pure CSS smooth grid-row diff expansion */}
          <div
            className="grid transition-[grid-template-rows,opacity]"
            style={{
              gridTemplateRows: isFixed ? '1fr' : '0fr',
              opacity: isFixed ? 1 : 0,
              transitionDuration: '360ms',
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div className="overflow-hidden">
              <div
                className="flex px-4 gap-4 border-l-2"
                style={{
                  borderColor: '#6ec49c',
                  backgroundColor: 'rgba(110, 196, 156, 0.14)',
                }}
              >
                <span
                  aria-hidden="true"
                  className="select-none shrink-0 w-6 text-right tabular-nums"
                  style={{ color: '#6ec49c' }}
                >
                  {diffLineNumber}
                </span>
                <span
                  aria-hidden="true"
                  className="select-none shrink-0 w-3 text-center font-medium"
                  style={{ color: '#6ec49c' }}
                >
                  +
                </span>
                <code
                  className="whitespace-pre"
                  style={{ color: 'var(--color-text)' }}
                >
                  {snippet.fixedLine}
                </code>
              </div>
            </div>
          </div>
        </div>

        {snippet.contextAfter.map((line, idx) => (
          <div key={`post-${idx}`} className="flex px-4 gap-4">
            <span
              aria-hidden="true"
              className="select-none shrink-0 w-6 text-right tabular-nums"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {afterStartLine + idx}
            </span>
            <span
              aria-hidden="true"
              className="select-none shrink-0 w-3 text-center"
            >
              {' '}
            </span>
            <code
              className="whitespace-pre"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {line}
            </code>
          </div>
        ))}
      </div>

      <div
        aria-live="polite"
        className="px-4 py-3 border-t font-mono"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-bg)',
          fontSize: 'var(--text-micro)',
          color: isFixed ? '#6ec49c' : 'var(--color-text-secondary)',
        }}
      >
        <span aria-hidden="true" className="mr-2">
          {isFixed ? '✓' : '›'}
        </span>
        {isFixed ? snippet.fixedNote : snippet.brokenNote}
      </div>
    </div>
  );
}
