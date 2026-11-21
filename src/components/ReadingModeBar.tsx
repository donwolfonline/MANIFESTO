import { useState } from 'react';
import {
  estimateTimeRemaining,
  READING_FONT_SIZE_LABELS,
  READING_FONT_SIZE_ORDER,
  READING_THEME_OPTIONS,
  useReadingMode,
} from '../lib/readingMode';
import { usePageScrollProgress } from '../lib/useViewportActivity';

export interface ReadingModeBarProps {
  /** Total word count of the page for estimated reading time remaining */
  totalWords: number;
  /** Optional label for the page being read */
  contextLabel?: string;
}

export function ReadingModeBar({
  totalWords,
  contextLabel = 'Reading controls',
}: ReadingModeBarProps) {
  const {
    prefs,
    resolvedTheme,
    toggleReadingMode,
    setTheme,
    adjustFontSize,
  } = useReadingMode();

  const [scrollProgress, setScrollProgress] = useState<number>(0);

  usePageScrollProgress((_y, progress) => {
    // Quantize to 1% steps to avoid unnecessary re-renders during scroll
    const quantized = Math.round(progress * 100) / 100;
    setScrollProgress((prev) => (prev === quantized ? prev : quantized));
  });

  const timeStats = estimateTimeRemaining(totalWords, scrollProgress);
  const canDecreaseFont = prefs.fontSize !== READING_FONT_SIZE_ORDER[0];
  const canIncreaseFont =
    prefs.fontSize !==
    READING_FONT_SIZE_ORDER[READING_FONT_SIZE_ORDER.length - 1];

  return (
    <aside
      aria-label={contextLabel}
      className="editorial-shell pt-4 pb-3"
      style={{
        maxWidth: prefs.enabled ? '66ch' : 'var(--container-max)',
      }}
    >
      <div
        className="border p-3.5 sm:px-5 sm:py-3 flex flex-col gap-3 font-mono"
        style={{
          borderColor: prefs.enabled
            ? 'var(--color-accent)'
            : 'var(--color-border-strong)',
          backgroundColor: 'var(--color-bg-elevated)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Reading Mode Toggle Switch */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={prefs.enabled}
              onClick={toggleReadingMode}
              className="px-3.5 py-1.5 border uppercase tracking-[var(--tracking-micro)] cursor-pointer"
              style={{
                fontSize: 'var(--text-micro)',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: prefs.enabled
                  ? 'var(--color-accent)'
                  : 'transparent',
                borderColor: prefs.enabled
                  ? 'var(--color-accent)'
                  : 'var(--color-border-strong)',
                color: prefs.enabled
                  ? 'var(--color-accent-ink)'
                  : 'var(--color-text)',
              }}
            >
              {prefs.enabled ? 'reading mode: on' : 'reading mode'}
            </button>

            {/* Progress Percentage & Estimated Time Remaining */}
            <div
              role="status"
              aria-live="off"
              aria-label="Reading progress and time remaining"
              className="flex items-center gap-2 tabular-nums uppercase tracking-[var(--tracking-micro)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <span style={{ color: 'var(--color-accent)' }}>
                {timeStats.percent}%
              </span>
              <span aria-hidden="true">·</span>
              <span>{timeStats.label}</span>
            </div>
          </div>

          {/* Theme Selector (System / Night / Paper / Sepia) & Font-Size Control */}
          <div className="flex flex-wrap items-center gap-3">
            <div
              role="group"
              aria-label="Reading color theme"
              className="inline-flex items-center p-0.5 border"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg)',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              {READING_THEME_OPTIONS.map((option) => {
                const active = prefs.theme === option.id;
                const title =
                  option.id === 'system'
                    ? `System theme (currently ${resolvedTheme})`
                    : `${option.label} theme`;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setTheme(option.id)}
                    aria-pressed={active}
                    title={title}
                    className="px-2.5 py-1 uppercase tracking-[var(--tracking-micro)] cursor-pointer"
                    style={{
                      fontSize: 'var(--text-micro)',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: active
                        ? 'var(--color-text)'
                        : 'transparent',
                      color: active
                        ? 'var(--color-bg)'
                        : 'var(--color-text-muted)',
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div
              role="group"
              aria-label="Reading font size"
              className="inline-flex items-center gap-1 p-0.5 border"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg)',
                borderRadius: 'var(--radius-xs)',
                fontSize: 'var(--text-micro)',
              }}
            >
              <button
                type="button"
                onClick={() => adjustFontSize(-1)}
                disabled={!canDecreaseFont}
                title="Decrease font size"
                className="px-2 py-1 uppercase cursor-pointer disabled:opacity-40 disabled:cursor-default"
                style={{ color: 'var(--color-text)' }}
              >
                <span aria-hidden="true">A−</span>
                <span className="sr-only">Decrease font size</span>
              </button>
              <span
                className="px-1.5 uppercase tracking-[var(--tracking-micro)]"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {READING_FONT_SIZE_LABELS[prefs.fontSize]}
              </span>
              <button
                type="button"
                onClick={() => adjustFontSize(1)}
                disabled={!canIncreaseFont}
                title="Increase font size"
                className="px-2 py-1 uppercase cursor-pointer disabled:opacity-40 disabled:cursor-default"
                style={{ color: 'var(--color-text)' }}
              >
                <span aria-hidden="true">A+</span>
                <span className="sr-only">Increase font size</span>
              </button>
            </div>
          </div>
        </div>

        {/* Inline Reading Progress Track */}
        <div
          className="h-1 w-full overflow-hidden"
          style={{
            backgroundColor: 'var(--color-border)',
            borderRadius: 'var(--radius-xs)',
          }}
          aria-hidden="true"
        >
          <div
            data-testid="reading-mode-progress-bar"
            className="h-full transition-[width]"
            style={{
              width: `${timeStats.percent}%`,
              backgroundColor: 'var(--color-accent)',
            }}
          />
        </div>
      </div>
    </aside>
  );
}
