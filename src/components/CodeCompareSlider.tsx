import {
  useCallback,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import type { ThemedToken } from 'shiki/core';
import { useShikiTokens } from '../lib/shiki';

export interface CodeCompareSliderProps {
  title: string;
  filename: string;
  beforeCode: string;
  afterCode: string;
  /** Initial split percentage (0 = full after, 100 = full before) */
  initialSplit?: number;
}

function ShikiCodeLayer({
  code,
  tokens,
  padToLines,
}: {
  code: string;
  tokens: ThemedToken[][] | null;
  padToLines: number;
}) {
  const rawLines = code.split('\n');
  const displayCount = Math.max(rawLines.length, padToLines);

  return (
    <pre
      className="m-0 py-5 px-4 sm:px-5 font-mono overflow-x-hidden"
      style={{
        fontSize: 'clamp(0.72rem, 0.35vw + 0.6rem, 0.82rem)',
        lineHeight: 1.65,
      }}
    >
      {Array.from({ length: displayCount }).map((_, lineIdx) => {
        const lineTokens = tokens?.[lineIdx];
        const fallbackText = rawLines[lineIdx];

        return (
          <div key={lineIdx} className="flex gap-3.5 min-h-[1.65em]">
            <span
              aria-hidden="true"
              className="select-none shrink-0 w-5 text-right tabular-nums"
              style={{
                color: '#968f86',
              }}
            >
              {lineIdx < rawLines.length ? lineIdx + 1 : '\u00A0'}
            </span>
            <span className="whitespace-pre">
              {lineTokens ? (
                lineTokens.length > 0 ? (
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
                  ' '
                )
              ) : (
                <span style={{ color: '#b8b1a7' }}>
                  {fallbackText ?? ' '}
                </span>
              )}
            </span>
          </div>
        );
      })}
    </pre>
  );
}

export function CodeCompareSlider({
  title,
  filename,
  beforeCode,
  afterCode,
  initialSplit = 52,
}: CodeCompareSliderProps) {
  const [split, setSplit] = useState<number>(initialSplit);
  const [dragging, setDragging] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const beforeTokens = useShikiTokens(beforeCode);
  const afterTokens = useShikiTokens(afterCode);

  const beforeLineCount = beforeCode.split('\n').length;
  const afterLineCount = afterCode.split('\n').length;
  const removedCount = Math.max(0, beforeLineCount - afterLineCount);
  const maxLines = Math.max(beforeLineCount, afterLineCount);

  const updateSplitFromClientX = useCallback((clientX: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = ((clientX - rect.left) / rect.width) * 100;
    const clamped = Math.min(98, Math.max(2, ratio));
    setSplit(clamped);
  }, []);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    updateSplitFromClientX(event.clientX);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    updateSplitFromClientX(event.clientX);
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
  };

  const handleSliderKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 15 : 5;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setSplit((prev) => Math.max(0, prev - step));
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      setSplit((prev) => Math.min(100, prev + step));
    } else if (event.key === 'Home') {
      event.preventDefault();
      setSplit(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setSplit(100);
    }
  };

  const roundedSplit = Math.round(split);

  return (
    <div
      className="cq-slider border overflow-hidden"
      style={{
        borderColor: 'var(--color-border-strong)',
        backgroundColor: '#191718',
        borderRadius: 'var(--radius-sm)',
      }}
    >
      {/* Top chrome: filename, diff count, and quick-snap presets */}
      <div
        className="px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3 font-mono"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-bg)',
          fontSize: 'var(--text-micro)',
        }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span style={{ color: 'var(--color-text)' }}>{filename}</span>
          <span style={{ color: 'var(--color-accent)' }}>
            {beforeLineCount} → {afterLineCount} lines (−{removedCount})
          </span>
        </div>

        <div
          role="group"
          aria-label={`Comparison presets for ${title}`}
          className="flex items-center gap-2"
        >
          <button
            type="button"
            onClick={() => setSplit(100)}
            className="touch-target px-2.5 py-1 border transition-colors hover:border-[var(--color-accent)] cursor-pointer"
            style={{
              borderRadius: 'var(--radius-xs)',
              borderColor:
                roundedSplit >= 95
                  ? 'var(--color-accent)'
                  : 'var(--color-border)',
              color:
                roundedSplit >= 95
                  ? 'var(--color-accent)'
                  : 'var(--color-text-muted)',
            }}
          >
            before
          </button>
          <button
            type="button"
            onClick={() => setSplit(50)}
            className="touch-target px-2.5 py-1 border transition-colors hover:border-[var(--color-accent)] cursor-pointer"
            style={{
              borderRadius: 'var(--radius-xs)',
              borderColor:
                roundedSplit > 5 && roundedSplit < 95
                  ? 'var(--color-text)'
                  : 'var(--color-border)',
              color:
                roundedSplit > 5 && roundedSplit < 95
                  ? 'var(--color-text)'
                  : 'var(--color-text-muted)',
            }}
          >
            split
          </button>
          <button
            type="button"
            onClick={() => setSplit(0)}
            className="touch-target px-2.5 py-1 border transition-colors hover:border-[#6ec49c] cursor-pointer"
            style={{
              borderRadius: 'var(--radius-xs)',
              borderColor:
                roundedSplit <= 5 ? '#6ec49c' : 'var(--color-border)',
              color:
                roundedSplit <= 5 ? '#6ec49c' : 'var(--color-text-muted)',
            }}
          >
            after
          </button>
        </div>
      </div>

      {/* Draggable before / after comparison stage */}
      <div
        ref={stageRef}
        data-cursor-label="drag"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative grid select-none overflow-x-auto cursor-ew-resize"
        style={{ touchAction: 'pan-y' }}
      >
        {/* Bottom Layer: AFTER (clean refactored code) */}
        <div
          className="col-start-1 row-start-1 relative"
          style={{ backgroundColor: '#171917' }}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-3 right-3 px-2 py-0.5 font-mono uppercase tracking-[var(--tracking-micro)] border"
            style={{
              fontSize: '0.625rem',
              borderRadius: 'var(--radius-xs)',
              borderColor: 'rgba(110, 196, 156, 0.45)',
              color: '#6ec49c',
              backgroundColor: 'rgba(23, 25, 23, 0.92)',
            }}
          >
            after · {afterLineCount} lines
          </span>
          <ShikiCodeLayer
            code={afterCode}
            tokens={afterTokens}
            padToLines={maxLines}
          />
        </div>

        {/* Top Clipped Layer: BEFORE (messy code), revealed from 0% to split% */}
        <div
          className="col-start-1 row-start-1 relative"
          style={{
            backgroundColor: '#191718',
            clipPath: `inset(0 ${(100 - split).toFixed(2)}% 0 0)`,
          }}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-3 left-3 px-2 py-0.5 font-mono uppercase tracking-[var(--tracking-micro)] border"
            style={{
              fontSize: '0.625rem',
              borderRadius: 'var(--radius-xs)',
              borderColor: 'rgba(240, 100, 45, 0.5)',
              color: 'var(--color-accent-night, #f0642d)',
              backgroundColor: 'rgba(25, 23, 24, 0.92)',
            }}
          >
            before · {beforeLineCount} lines
          </span>
          <ShikiCodeLayer
            code={beforeCode}
            tokens={beforeTokens}
            padToLines={maxLines}
          />
        </div>

        {/* Accessible keyboard + large 44x44px touch divider handle */}
        <div
          role="slider"
          tabIndex={0}
          data-testid="delete-slider-handle"
          aria-label={`Before and after code comparison slider for ${title}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={roundedSplit}
          aria-valuetext={`${roundedSplit}% messy before code visible, ${100 - roundedSplit}% clean after code visible`}
          onKeyDown={handleSliderKeyDown}
          onClick={(e) => e.stopPropagation()}
          className="touch-target absolute top-0 bottom-0 -translate-x-1/2 flex items-center justify-center w-11 min-w-[44px] cursor-ew-resize focus:outline-none group"
          style={{
            left: `${split}%`,
            touchAction: 'none',
            zIndex: 5,
          }}
        >
          {/* Vertical hairline */}
          <span
            aria-hidden="true"
            className="block w-[1.5px] h-full"
            style={{ backgroundColor: 'var(--color-accent)' }}
          />
          {/* Tactile 44x44px center touch pill */}
          <span
            aria-hidden="true"
            className="absolute min-w-[44px] min-h-[44px] flex items-center justify-center border font-mono text-xs leading-none group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-[var(--color-accent)]"
            style={{
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-accent)',
              borderColor: 'var(--color-accent)',
              color: 'var(--color-accent-ink)',
            }}
          >
            ‹ ›
          </span>
        </div>
      </div>

      {/* Accessibility hint strip */}
      <div
        className="px-4 py-2 border-t flex items-center justify-between font-mono"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-bg)',
          fontSize: 'var(--text-micro)',
          color: 'var(--color-text-muted)',
        }}
      >
        <span>drag divider or use ←/→ keys to compare</span>
        <span className="tabular-nums">{roundedSplit}% / {100 - roundedSplit}%</span>
      </div>
    </div>
  );
}
