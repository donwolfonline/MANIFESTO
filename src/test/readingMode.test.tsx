import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EntryDetailPage } from '../components/EntryDetailPage';
import { ReadingModeBar } from '../components/ReadingModeBar';
import type { ManifestoMeta } from '../lib/markdown';
import {
  DEFAULT_READING_PREFS,
  estimateTimeRemaining,
  loadReadingPrefs,
  READING_PREFS_STORAGE_KEY,
  resolveReadingTheme,
  saveReadingPrefs,
  THEME_PALETTES,
} from '../lib/readingMode';

const TEST_META: ManifestoMeta = {
  filename: 'WORKING_COPY.md',
  title: 'WORKING_COPY.md',
  subtitles: ['notes-to-self, mostly.'],
  author: 'Test Author',
  date: 'Nov 2026',
  location: 'Plain Text, UTF-8',
};

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const n = Number.parseInt(clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexToRgb(hexA));
  const lumB = relativeLuminance(hexToRgb(hexB));
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Reading Mode, localStorage persistence, system theme, and contrast', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-reading-mode');
    document.documentElement.removeAttribute('data-font-size');
  });

  it('returns sensible defaults when localStorage is empty, malformed, or throws inside try/catch', () => {
    expect(loadReadingPrefs()).toEqual(DEFAULT_READING_PREFS);

    window.localStorage.setItem(READING_PREFS_STORAGE_KEY, '{bad-json');
    expect(loadReadingPrefs()).toEqual(DEFAULT_READING_PREFS);

    window.localStorage.setItem(
      READING_PREFS_STORAGE_KEY,
      JSON.stringify({ enabled: 'yes', theme: 'neon', fontSize: 'huge' }),
    );
    expect(loadReadingPrefs()).toEqual(DEFAULT_READING_PREFS);

    // Simulate blocked storage throwing SecurityError
    const getSpy = vi
      .spyOn(window.localStorage, 'getItem')
      .mockImplementation(() => {
        throw new Error('SecurityError: storage disabled');
      });
    expect(loadReadingPrefs()).toEqual(DEFAULT_READING_PREFS);
    getSpy.mockRestore();
  });

  it('persists theme, reading mode, and font size in localStorage and updates document attributes', () => {
    const saved = saveReadingPrefs({
      enabled: true,
      theme: 'sepia',
      fontSize: 'lg',
    });

    expect(saved).toEqual({
      enabled: true,
      theme: 'sepia',
      fontSize: 'lg',
    });
    expect(loadReadingPrefs()).toEqual(saved);
    expect(document.documentElement.getAttribute('data-theme')).toBe('sepia');
    expect(document.documentElement.getAttribute('data-reading-mode')).toBe(
      'true',
    );
    expect(document.documentElement.getAttribute('data-font-size')).toBe('lg');
  });

  it('resolves system theme using prefers-color-scheme', () => {
    const origMatchMedia = window.matchMedia;
    try {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('light'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));
      expect(resolveReadingTheme('system')).toBe('paper');

      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));
      expect(resolveReadingTheme('system')).toBe('night');
    } finally {
      window.matchMedia = origMatchMedia;
    }
  });

  it('calculates reading progress percentage and estimated time remaining', () => {
    expect(estimateTimeRemaining(1000, 0)).toEqual({
      percent: 0,
      minutesLeft: 5,
      label: '5 min left',
    });
    expect(estimateTimeRemaining(1000, 0.5)).toEqual({
      percent: 50,
      minutesLeft: 3,
      label: '3 min left',
    });
    expect(estimateTimeRemaining(1000, 0.92)).toEqual({
      percent: 92,
      minutesLeft: 1,
      label: '< 1 min left',
    });
    expect(estimateTimeRemaining(1000, 0.99)).toEqual({
      percent: 99,
      minutesLeft: 0,
      label: 'Finished reading',
    });
  });

  it('meets WCAG 2.1 AA contrast (>= 4.5:1) for every text and accent token across Night, Paper, and Sepia themes', () => {
    for (const palette of Object.values(THEME_PALETTES)) {
      for (const surface of [palette.bg, palette.bgElevated, palette.bgDeep]) {
        expect(
          contrastRatio(palette.text, surface),
          `${palette.label} text on ${surface}`,
        ).toBeGreaterThanOrEqual(7);
        expect(
          contrastRatio(palette.textSecondary, surface),
          `${palette.label} textSecondary on ${surface}`,
        ).toBeGreaterThanOrEqual(5.5);
        expect(
          contrastRatio(palette.textMuted, surface),
          `${palette.label} textMuted on ${surface}`,
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastRatio(palette.accent, surface),
          `${palette.label} accent on ${surface}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
      expect(
        contrastRatio(palette.accentInk, palette.accent),
        `${palette.label} accentInk on accent`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('toggles reading mode to hide chrome, switches themes, and adjusts font size on a long note page', async () => {
    const user = userEvent.setup();

    render(
      <EntryDetailPage
        meta={TEST_META}
        collection="principles"
        slug="write-the-pull-request-description-before-hitting-submit"
        onNavigateHome={vi.fn()}
        onOpenEntry={vi.fn()}
      />,
    );

    // Chrome is visible initially (sticky header + TOC + prev/next nav)
    expect(
      screen.getByRole('navigation', { name: /entry table of contents/i }),
    ).toBeInTheDocument();

    // Toggle Reading Mode ON -> hides header, TOC, and prev/next chrome
    const toggle = screen.getByRole('switch', { name: /reading mode/i });
    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(
      screen.queryByRole('navigation', { name: /entry table of contents/i }),
    ).not.toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-reading-mode')).toBe(
      'true',
    );

    // Switch through Paper, Sepia, and Night themes
    await user.click(screen.getByRole('button', { name: /^paper$/i }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('paper');

    await user.click(screen.getByRole('button', { name: /^sepia$/i }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('sepia');

    await user.click(screen.getByRole('button', { name: /^night$/i }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('night');

    // Increase and decrease font size
    await user.click(
      screen.getByRole('button', { name: /increase font size/i }),
    );
    expect(document.documentElement.getAttribute('data-font-size')).toBe('lg');
    expect(screen.getByText('Large')).toBeInTheDocument();
  });

  it('renders ReadingModeBar with time remaining indicator', () => {
    render(<ReadingModeBar totalWords={1200} />);
    expect(
      screen.getByRole('status', {
        name: /reading progress and time remaining/i,
      }),
    ).toHaveTextContent(/6 min left/i);
  });
});
