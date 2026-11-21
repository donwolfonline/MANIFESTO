import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrincipleOfTheDayCard } from '../components/PrincipleOfTheDayCard';
import { TodayPage } from '../components/TodayPage';
import { MANIFESTO_ITEMS } from '../data/manifestoItems';
import type { ManifestoMeta } from '../lib/markdown';
import {
  addDaysToDateKey,
  DAILY_REMINDER_STORAGE_KEY,
  disableDailyReminder,
  formatUtcDateKey,
  getPrincipleOfTheDay,
  hashDateKey,
  isNotificationTriggerDue,
  loadDailyReminderPrefs,
  renderPrincipleCardToCanvas,
  saveDailyReminderPrefs,
} from '../lib/principleOfTheDay';

const TEST_META: ManifestoMeta = {
  filename: 'WORKING_COPY.md',
  title: 'WORKING_COPY.md',
  subtitles: ['notes-to-self, mostly.'],
  author: 'Test Author',
  date: 'Nov 2026',
  location: 'Plain Text, UTF-8',
};

describe('Principle of the Day deterministic selection & features', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('deterministically hashes a calendar day and picks the exact same principle for all callers', () => {
    const first = getPrincipleOfTheDay(
      MANIFESTO_ITEMS,
      '2026-11-21',
      '2026-11-21',
    );
    const second = getPrincipleOfTheDay(
      MANIFESTO_ITEMS,
      new Date('2026-11-21T23:59:59Z'),
      '2026-11-21',
    );

    expect(first.dateKey).toBe('2026-11-21');
    expect(first.hash).toBe(hashDateKey('2026-11-21'));
    expect(first.hash).toBe(second.hash);
    expect(first.item.number).toBe(second.item.number);
    expect(first.isToday).toBe(true);
    expect(first.relativeLabel).toBe('Today');
  });

  it('guarantees yesterday, today, and tomorrow never collide on the same principle', () => {
    let cur = '2026-01-01';
    for (let i = 0; i < 90; i++) {
      const next = addDaysToDateKey(cur, 1);
      const a = getPrincipleOfTheDay(MANIFESTO_ITEMS, cur, cur);
      const b = getPrincipleOfTheDay(MANIFESTO_ITEMS, next, cur);
      expect(a.item.number).not.toBe(b.item.number);
      cur = next;
    }
  });

  it('steps across month and year boundaries with addDaysToDateKey', () => {
    expect(addDaysToDateKey('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDaysToDateKey('2026-12-31', 1)).toBe('2027-01-01');
    expect(formatUtcDateKey(new Date(Date.UTC(2026, 10, 21)))).toBe(
      '2026-11-21',
    );
  });

  it('renders a 1080x1080 canvas card for PNG export', () => {
    const selection = getPrincipleOfTheDay(
      MANIFESTO_ITEMS,
      '2026-11-21',
      '2026-11-21',
    );
    const canvas = renderPrincipleCardToCanvas(selection, 'WORKING_COPY.md');

    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(1080);
  });

  it('persists daily reminder preferences strictly in localStorage and supports a clear off switch', () => {
    expect(loadDailyReminderPrefs()).toEqual({
      enabled: false,
      time: '09:00',
      lastNotifiedDate: null,
    });

    const saved = saveDailyReminderPrefs({
      enabled: true,
      time: '08:30',
      lastNotifiedDate: null,
    });
    expect(saved.enabled).toBe(true);
    expect(saved.time).toBe('08:30');
    expect(window.localStorage.getItem(DAILY_REMINDER_STORAGE_KEY)).toContain(
      '08:30',
    );

    // Check due calculation before and after 08:30 local time
    const beforeTime = new Date(2026, 10, 21, 8, 15, 0);
    const atTime = new Date(2026, 10, 21, 8, 30, 0);
    expect(isNotificationTriggerDue(saved, beforeTime).due).toBe(false);
    expect(isNotificationTriggerDue(saved, atTime).due).toBe(true);

    // Once notified today, does not double-fire on the same calendar day
    const afterNotified = saveDailyReminderPrefs({
      ...saved,
      lastNotifiedDate: '2026-11-21',
    });
    expect(isNotificationTriggerDue(afterNotified, atTime).due).toBe(false);

    // Clear off switch disables notifications immediately while preserving preferred time
    const disabled = disableDailyReminder();
    expect(disabled.enabled).toBe(false);
    expect(disabled.time).toBe('08:30');
    expect(loadDailyReminderPrefs().enabled).toBe(false);
  });

  it('renders the home page PrincipleOfTheDayCard with today’s principle and /today link', () => {
    const onOpenToday = vi.fn();
    const onSelectReadingItem = vi.fn();

    render(
      <PrincipleOfTheDayCard
        items={MANIFESTO_ITEMS}
        onOpenToday={onOpenToday}
        onSelectReadingItem={onSelectReadingItem}
      />,
    );

    expect(
      screen.getByRole('complementary', { name: /principle of the day/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /open \/today/i }),
    ).toHaveAttribute('href', '/today');
  });

  it('navigates yesterday / tomorrow on /today and toggles browser notifications on and off', async () => {
    const user = userEvent.setup();
    const requestPermission = vi.fn().mockResolvedValue('granted');
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: Object.assign(vi.fn(), {
        permission: 'default',
        requestPermission,
      }),
    });

    render(
      <TodayPage
        meta={TEST_META}
        items={MANIFESTO_ITEMS}
        onNavigateHome={vi.fn()}
        onOpenTerminal={vi.fn()}
        initialDateKey="2026-11-21"
      />,
    );

    const todayExpected = getPrincipleOfTheDay(
      MANIFESTO_ITEMS,
      '2026-11-21',
      '2026-11-21',
    );
    const yesterdayExpected = getPrincipleOfTheDay(
      MANIFESTO_ITEMS,
      '2026-11-20',
      '2026-11-21',
    );
    const tomorrowExpected = getPrincipleOfTheDay(
      MANIFESTO_ITEMS,
      '2026-11-22',
      '2026-11-21',
    );

    expect(
      screen.getByRole('heading', { level: 1 }),
    ).toHaveTextContent(todayExpected.item.title);

    // Navigate to Yesterday
    await user.click(screen.getByRole('button', { name: /← yesterday/i }));
    expect(
      screen.getByRole('heading', { level: 1 }),
    ).toHaveTextContent(yesterdayExpected.item.title);
    expect(screen.getByText('Yesterday')).toBeInTheDocument();

    // Navigate back to Today, then Tomorrow
    await user.click(screen.getByRole('button', { name: /^today$/i }));
    expect(
      screen.getByRole('heading', { level: 1 }),
    ).toHaveTextContent(todayExpected.item.title);

    await user.click(screen.getByRole('button', { name: /tomorrow →/i }));
    expect(
      screen.getByRole('heading', { level: 1 }),
    ).toHaveTextContent(tomorrowExpected.item.title);
    expect(screen.getByText('Tomorrow')).toBeInTheDocument();

    // Enable daily notification via switch
    const toggle = screen.getByRole('switch', {
      name: /daily browser notification/i,
    });
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    await user.click(toggle);
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(loadDailyReminderPrefs().enabled).toBe(true);

    // Turn off via explicit "turn off notifications" button
    const turnOffBtn = screen.getByRole('button', {
      name: /turn off notifications/i,
    });
    await user.click(turnOffBtn);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(loadDailyReminderPrefs().enabled).toBe(false);
  });
});
