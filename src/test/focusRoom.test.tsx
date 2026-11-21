import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FocusPage } from '../components/FocusPage';
import { MANIFESTO_ITEMS } from '../data/manifestoItems';
import {
  addFocusSessionEntry,
  clearFocusHistory,
  computeWeeklySummary,
  formatCountdown,
  formatFocusHistoryAsJson,
  formatFocusHistoryAsMarkdown,
  loadFocusHistory,
  removeFocusSessionEntry,
} from '../lib/focusRoom';
import type { ManifestoMeta } from '../lib/markdown';

const TEST_META: ManifestoMeta = {
  filename: 'WORKING_COPY.md',
  title: 'WORKING_COPY.md',
  subtitles: ['notes-to-self, mostly.'],
  author: 'Test Author',
  date: 'Nov 2026',
  location: 'Plain Text, UTF-8',
};

describe('/focus room timer, history, weekly summary, and exports', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('formats countdowns accurately as MM:SS', () => {
    expect(formatCountdown(25 * 60)).toBe('25:00');
    expect(formatCountdown(65)).toBe('01:05');
    expect(formatCountdown(0)).toBe('00:00');
  });

  it('stores completed focus entries in localStorage, computes a 7-day summary, and formats exports', () => {
    const today = new Date(2026, 10, 21, 14, 0, 0);
    const yesterday = new Date(2026, 10, 20, 11, 0, 0);

    addFocusSessionEntry({
      note: 'Deleted 300 lines of dead feature-flag plumbing',
      durationMinutes: 25,
      principleNumber: 4,
      now: yesterday,
    });
    const { entry } = addFocusSessionEntry({
      note: 'Wrote unit tests for the focus timer',
      durationMinutes: 50,
      principleNumber: 1,
      now: today,
    });

    const loaded = loadFocusHistory();
    expect(loaded).toHaveLength(2);
    expect(loaded[0].note).toBe('Wrote unit tests for the focus timer');

    const summary = computeWeeklySummary(loaded, today);
    expect(summary.totalSessions).toBe(2);
    expect(summary.totalMinutes).toBe(75);
    expect(summary.activeDays).toBe(2);
    expect(summary.days).toHaveLength(7);

    const md = formatFocusHistoryAsMarkdown(loaded, summary);
    expect(md).toContain('75 focused minutes');
    expect(md).toContain('Wrote unit tests for the focus timer');

    const json = JSON.parse(formatFocusHistoryAsJson(loaded, summary));
    expect(json.weeklySummary.totalMinutes).toBe(75);
    expect(json.entries).toHaveLength(2);

    const afterRemove = removeFocusSessionEntry(entry.id);
    expect(afterRemove).toHaveLength(1);

    expect(clearFocusHistory()).toHaveLength(0);
  });

  it('supports presets, custom durations, Space/R shortcuts, ambient sound off by default, and logging completed work', async () => {
    const user = userEvent.setup();

    render(
      <FocusPage
        meta={TEST_META}
        items={MANIFESTO_ITEMS}
        onNavigateHome={vi.fn()}
        onOpenTerminal={vi.fn()}
      />,
    );

    // 25/5 preset is selected by default -> 25:00 timer
    expect(screen.getByRole('timer')).toHaveTextContent('25:00');

    // Ambient sound is Off by default
    const offSoundBtn = screen.getByRole('button', {
      name: /off\s*complete silence/i,
    });
    expect(offSoundBtn).toHaveAttribute('aria-pressed', 'true');

    // Space starts and pauses the session; R resets
    await user.keyboard(' ');
    expect(
      screen.getByRole('button', { name: /pause \(space\)/i }),
    ).toBeInTheDocument();

    await user.keyboard('r');
    expect(
      screen.getByRole('button', { name: /start session \(space\)/i }),
    ).toBeInTheDocument();

    // Switch to Custom preset and enter 40 minutes
    await user.click(screen.getByRole('button', { name: /^custom$/i }));
    const focusMinInput = screen.getByLabelText(/custom focus minutes/i);
    await user.clear(focusMinInput);
    await user.type(focusMinInput, '40');
    expect(screen.getByRole('timer')).toHaveTextContent('40:00');

    // Complete & log session -> prompts "what did you finish?" and saves to local history
    await user.click(
      screen.getByRole('button', { name: /complete & log/i }),
    );
    const noteInput = screen.getByLabelText(/what did you finish\?/i);
    await user.type(noteInput, 'Shipped the calm /focus room');
    await user.click(screen.getByRole('button', { name: /save to log/i }));

    expect(
      screen.getByText('Shipped the calm /focus room'),
    ).toBeInTheDocument();
    expect(loadFocusHistory()).toHaveLength(1);
  });
});
