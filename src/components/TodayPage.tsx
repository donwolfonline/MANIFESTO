import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MANIFESTO_ITEMS,
  type ManifestoItem,
} from '../data/manifestoItems';
import type { ManifestoMeta } from '../lib/markdown';
import {
  addDaysToDateKey,
  disableDailyReminder,
  exportPrincipleCardAsPng,
  formatUtcDateKey,
  getPrincipleOfTheDay,
  isNotificationTriggerDue,
  loadDailyReminderPrefs,
  saveDailyReminderPrefs,
  sendPrincipleNotification,
  type DailyReminderPrefs,
} from '../lib/principleOfTheDay';
import { getPreloadHandlers } from '../lib/routePreload';
import { useLowPowerMode } from '../lib/lowPower';
import {
  useDocumentVisible,
  usePrefersReducedMotion,
} from '../lib/useViewportActivity';
import { FilmGrain } from './FilmGrain';
import { HoverLink } from './HoverLink';

export interface TodayPageProps {
  meta: ManifestoMeta;
  items?: ManifestoItem[];
  onNavigateHome: (section?: string) => void;
  onOpenTerminal: () => void;
  onOpenNote?: (slug: string) => void;
  /** Optional initial date key (YYYY-MM-DD) for deterministic testing */
  initialDateKey?: string;
}

function getInitialDateKey(override?: string): string {
  if (override) return formatUtcDateKey(override);
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('date');
    if (fromQuery) return formatUtcDateKey(fromQuery);
  }
  return formatUtcDateKey();
}

export function TodayPage({
  meta,
  items = MANIFESTO_ITEMS,
  onNavigateHome,
  onOpenTerminal,
  onOpenNote,
  initialDateKey,
}: TodayPageProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const lowPower = useLowPowerMode();
  const tabVisible = useDocumentVisible();

  const todayKey = useMemo(
    () => (initialDateKey ? formatUtcDateKey(initialDateKey) : formatUtcDateKey()),
    [initialDateKey],
  );
  const [activeDateKey, setActiveDateKey] = useState<string>(() =>
    getInitialDateKey(initialDateKey),
  );

  const selection = useMemo(
    () => getPrincipleOfTheDay(items, activeDateKey, todayKey),
    [items, activeDateKey, todayKey],
  );

  const yesterdayPreview = useMemo(
    () => getPrincipleOfTheDay(items, addDaysToDateKey(activeDateKey, -1), todayKey),
    [items, activeDateKey, todayKey],
  );
  const tomorrowPreview = useMemo(
    () => getPrincipleOfTheDay(items, addDaysToDateKey(activeDateKey, 1), todayKey),
    [items, activeDateKey, todayKey],
  );

  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Browser-only notification state (persisted strictly in localStorage)
  const [reminderPrefs, setReminderPrefs] = useState<DailyReminderPrefs>(() =>
    loadDailyReminderPrefs(),
  );
  const [permissionState, setPermissionState] = useState<
    NotificationPermission | 'unsupported'
  >(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return window.Notification.permission;
  });
  const [reminderStatus, setReminderStatus] = useState<string | null>(null);

  const stepDay = useCallback((delta: number) => {
    setActiveDateKey((prev) => addDaysToDateKey(prev, delta));
    setExportStatus(null);
  }, []);

  const jumpToToday = useCallback(() => {
    setActiveDateKey(todayKey);
    setExportStatus(null);
  }, [todayKey]);

  // Keyboard navigation: ArrowLeft -> Yesterday, ArrowRight -> Tomorrow
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        stepDay(-1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        stepDay(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stepDay]);

  // Check every 30s whether the visitor's scheduled notification time has arrived
  useEffect(() => {
    if (!reminderPrefs.enabled) return;

    const checkAndNotify = () => {
      const { due, localDateKey } = isNotificationTriggerDue(reminderPrefs);
      if (!due) return;
      const todaySelection = getPrincipleOfTheDay(items, new Date());
      const sent = sendPrincipleNotification(todaySelection);
      if (sent) {
        const updated = saveDailyReminderPrefs({
          ...reminderPrefs,
          lastNotifiedDate: localDateKey,
        });
        setReminderPrefs(updated);
      }
    };

    checkAndNotify();
    const timer = window.setInterval(checkAndNotify, 30_000);
    return () => window.clearInterval(timer);
  }, [reminderPrefs, items]);

  const handleSaveAsImage = async () => {
    setExporting(true);
    setExportStatus(null);
    try {
      const filename = await exportPrincipleCardAsPng(selection, meta.filename);
      setExportStatus(`Saved 1080×1080 PNG (${filename}) ✓`);
    } catch {
      setExportStatus('Could not export PNG in this browser.');
    } finally {
      setExporting(false);
    }
  };

  const handleTimeChange = (nextTime: string) => {
    const updated = saveDailyReminderPrefs({
      ...reminderPrefs,
      time: nextTime,
      // Reset lastNotifiedDate if the visitor picks a new time so today's new slot can fire
      lastNotifiedDate: null,
    });
    setReminderPrefs(updated);
    setReminderStatus(
      updated.enabled
        ? `Reminder time updated to ${updated.time} (saved in this browser).`
        : `Preferred time set to ${updated.time}.`,
    );
  };

  const handleEnableReminder = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermissionState('unsupported');
      setReminderStatus(
        'This browser does not support the Web Notifications API.',
      );
      return;
    }

    let currentPerm = window.Notification.permission;
    if (currentPerm === 'default') {
      try {
        currentPerm = await window.Notification.requestPermission();
      } catch {
        currentPerm = 'denied';
      }
    }
    setPermissionState(currentPerm);

    if (currentPerm === 'denied') {
      const off = disableDailyReminder();
      setReminderPrefs(off);
      setReminderStatus(
        'Browser notification permission is blocked. Enable notifications for this site in your browser settings if you want a daily reminder.',
      );
      return;
    }

    const updated = saveDailyReminderPrefs({
      ...reminderPrefs,
      enabled: true,
    });
    setReminderPrefs(updated);
    setReminderStatus(
      `Daily reminder active for ${updated.time} (stored only in this browser).`,
    );
  };

  const handleTurnOffReminder = () => {
    const updated = disableDailyReminder();
    setReminderPrefs(updated);
    setReminderStatus('Daily browser notifications turned off.');
  };

  const handleToggleSwitch = () => {
    if (reminderPrefs.enabled) {
      handleTurnOffReminder();
    } else {
      void handleEnableReminder();
    }
  };

  const handleSendTestNotification = () => {
    const sent = sendPrincipleNotification(selection);
    if (sent) {
      setReminderStatus('Sent a preview notification to your browser.');
    } else {
      setReminderStatus(
        'Grant browser notification permission first to preview notifications.',
      );
    }
  };

  const { item, dateKey, displayDate, relativeLabel, isToday, hashHex } =
    selection;
  const numStr = String(item.number).padStart(2, '0');
  const animateAmbient = !prefersReducedMotion && tabVisible && !lowPower;

  return (
    <div
      className="relative min-h-dvh flex flex-col overflow-hidden"
      style={{
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)',
      }}
    >
      <FilmGrain />

      {/* Subtle animated ambient background (respects prefers-reduced-motion & tab visibility) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
        style={{ zIndex: 0 }}
      >
        <div
          className="absolute -top-32 -right-24 w-[42rem] h-[42rem] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(240, 100, 45, 0.22) 0%, rgba(240, 100, 45, 0.07) 48%, transparent 74%)',
            transform: animateAmbient
              ? 'translate3d(0, 0, 0) scale(1.04)'
              : 'none',
            animation: animateAmbient
              ? 'today-ambient-drift 12s ease-in-out infinite alternate'
              : 'none',
          }}
        />
        <svg
          viewBox="0 0 800 800"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[56rem] h-[56rem] opacity-[0.18]"
          style={{
            color: 'var(--color-accent)',
            animation: animateAmbient
              ? 'today-rings-spin 55s linear infinite'
              : 'none',
          }}
        >
          <circle
            cx="400"
            cy="400"
            r="170"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="4 8"
          />
          <circle
            cx="400"
            cy="400"
            r="270"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
          <circle
            cx="400"
            cy="400"
            r="365"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="2 12"
          />
        </svg>
      </div>

      {/* Sticky Header */}
      <header
        className="sticky top-0 shrink-0 border-b"
        style={{
          height: 'var(--header-height)',
          zIndex: 'var(--z-header)',
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-bg-glass)',
        }}
      >
        <div className="editorial-shell h-full flex items-center justify-between gap-4 font-mono">
          <HoverLink
            href="/"
            {...getPreloadHandlers('home')}
            onClick={(e) => {
              e.preventDefault();
              onNavigateHome();
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
              style={{ backgroundColor: 'var(--color-accent)' }}
            />
            <span>~/{meta.filename}</span>
          </HoverLink>

          <div className="flex items-center gap-4 sm:gap-6">
            <HoverLink
              href="/naming"
              {...getPreloadHandlers('naming')}
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome('naming');
              }}
              className="inline-flex uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              /naming
            </HoverLink>

            <HoverLink
              href="/focus"
              {...getPreloadHandlers('focus')}
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome('focus');
              }}
              className="hidden md:inline-flex uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              /focus
            </HoverLink>

            <HoverLink
              href="/commit-log"
              {...getPreloadHandlers('commit-log')}
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome('commit-log');
              }}
              className="hidden sm:inline-flex uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              /commit-log
            </HoverLink>

            <HoverLink
              href="/bug-museum"
              {...getPreloadHandlers('bug-museum')}
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome('bug-museum');
              }}
              className="hidden sm:inline-flex uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              /bug-museum
            </HoverLink>

            <HoverLink
              href="/terminal"
              {...getPreloadHandlers('terminal')}
              onClick={(e) => {
                e.preventDefault();
                onOpenTerminal();
              }}
              className="hidden sm:inline-flex items-center gap-1.5 uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <span aria-hidden="true" style={{ color: 'var(--color-accent)' }}>
                &gt;_
              </span>
              <span>/terminal</span>
            </HoverLink>

            <HoverLink
              href="/#read"
              restingRule
              {...getPreloadHandlers('home')}
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome('read');
              }}
              className="uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              ← back to editorial
            </HoverLink>
          </div>
        </div>
      </header>

      <main
        aria-label="Principle of the day"
        className="relative z-10 flex-1 editorial-shell py-10 sm:py-16"
      >
        <div className="max-w-4xl mx-auto space-y-10">
          {/* Page Header & Yesterday / Tomorrow Navigator */}
          <div
            className="pb-6 border-b flex flex-col sm:flex-row sm:items-end justify-between gap-5"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="space-y-2">
              <p
                className="m-0 font-mono uppercase tracking-[var(--tracking-micro)]"
                style={{
                  fontSize: 'var(--text-micro)',
                  color: 'var(--color-accent)',
                }}
              >
                /today · Principle of the Day
              </p>
              <div className="flex flex-wrap items-baseline gap-3">
                <span
                  className="font-display italic"
                  style={{
                    fontSize: 'clamp(1.6rem, 3vw, 2.25rem)',
                    color: 'var(--color-text)',
                  }}
                >
                  {displayDate}
                </span>
                <span
                  className="px-2 py-0.5 border font-mono uppercase tracking-[var(--tracking-micro)]"
                  style={{
                    fontSize: 'var(--text-micro)',
                    borderColor: isToday
                      ? 'var(--color-accent)'
                      : 'var(--color-border-strong)',
                    color: isToday
                      ? 'var(--color-accent)'
                      : 'var(--color-text-secondary)',
                    borderRadius: 'var(--radius-xs)',
                  }}
                >
                  {relativeLabel}
                </span>
              </div>
            </div>

            {/* Yesterday / Today / Tomorrow Navigator */}
            <nav
              aria-label="Calendar day navigation"
              className="flex flex-wrap items-center gap-2 font-mono"
            >
              <button
                type="button"
                onClick={() => stepDay(-1)}
                title={`Yesterday (${yesterdayPreview.dateKey}: #${String(yesterdayPreview.item.number).padStart(2, '0')})`}
                className="px-3.5 py-2 border uppercase tracking-[var(--tracking-micro)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer"
                style={{
                  fontSize: 'var(--text-micro)',
                  borderColor: 'var(--color-border-strong)',
                  backgroundColor: 'var(--color-bg-elevated)',
                  color: 'var(--color-text)',
                  borderRadius: 'var(--radius-xs)',
                }}
              >
                ← yesterday
              </button>

              <button
                type="button"
                onClick={jumpToToday}
                disabled={isToday}
                aria-current={isToday ? 'date' : undefined}
                className="px-3 py-2 border uppercase tracking-[var(--tracking-micro)] transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-default"
                style={{
                  fontSize: 'var(--text-micro)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                  borderRadius: 'var(--radius-xs)',
                }}
              >
                today
              </button>

              <button
                type="button"
                onClick={() => stepDay(1)}
                title={`Tomorrow (${tomorrowPreview.dateKey}: #${String(tomorrowPreview.item.number).padStart(2, '0')})`}
                className="px-3.5 py-2 border uppercase tracking-[var(--tracking-micro)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer"
                style={{
                  fontSize: 'var(--text-micro)',
                  borderColor: 'var(--color-border-strong)',
                  backgroundColor: 'var(--color-bg-elevated)',
                  color: 'var(--color-text)',
                  borderRadius: 'var(--radius-xs)',
                }}
              >
                tomorrow →
              </button>
            </nav>
          </div>

          {/* Big Typography Hero Card (re-animates smoothly when switching Yesterday / Today / Tomorrow) */}
          <article
            key={dateKey}
            aria-label={`Principle #${numStr} for ${dateKey}`}
            className="relative border p-7 sm:p-12 space-y-8 panel-enter"
            style={{
              borderColor: 'var(--color-border-strong)',
              backgroundColor: 'var(--color-bg-elevated)',
              borderRadius: 'var(--radius-sm)',
              borderTop: '4px solid var(--color-accent)',
            }}
          >
            {/* Card Metadata Row */}
            <div
              className="flex flex-wrap items-center justify-between gap-4 font-mono uppercase tracking-[var(--tracking-micro)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-muted)',
              }}
            >
              <span>
                date {dateKey} · deterministic hash 0x{hashHex}
              </span>
              <span>
                principle {numStr} of {String(items.length).padStart(2, '0')} ·{' '}
                {item.readingTimeMinutes} min read
              </span>
            </div>

            {/* Giant Outlined Number + Display Serif Heading */}
            <div className="space-y-4">
              <div
                aria-hidden="true"
                className="font-display font-normal tabular-nums leading-none select-none outlined-number"
                style={{ fontSize: 'clamp(4.25rem, 11vw, 7.5rem)' }}
              >
                {numStr}
              </div>

              <h1
                className="m-0 font-display font-normal"
                style={{
                  fontSize: 'clamp(2.25rem, 5.2vw, 4.4rem)',
                  lineHeight: 0.98,
                  letterSpacing: 'var(--tracking-display)',
                  color: 'var(--color-text)',
                }}
              >
                {item.title}
              </h1>
            </div>

            {/* Lead Summary Quote */}
            <blockquote
              className="m-0 pl-5 border-l-2 font-body italic"
              style={{
                borderColor: 'var(--color-accent)',
                fontSize: 'var(--text-lead)',
                lineHeight: 'var(--leading-lead)',
                color: 'var(--color-text)',
                maxWidth: '56ch',
              }}
            >
              {item.summary}
            </blockquote>

            {/* Full Principle Body Blocks */}
            <div
              className="pt-4 border-t space-y-5"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {item.body.map((block, idx) => {
                if (block.type === 'paragraph') {
                  return (
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
                      {block.text.replace(/\*([^*]+)\*/g, '$1')}
                    </p>
                  );
                }
                if (block.type === 'bullets') {
                  return (
                    <ul
                      key={idx}
                      className="m-0 p-0 list-none space-y-2.5 font-body"
                      style={{
                        maxWidth: 'var(--measure)',
                        fontSize: 'var(--text-body)',
                        lineHeight: 'var(--leading-body)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {block.items.map((bullet, bIdx) => (
                        <li key={bIdx} className="flex items-baseline gap-3">
                          <span
                            aria-hidden="true"
                            className="font-mono"
                            style={{ color: 'var(--color-accent)' }}
                          >
                            –
                          </span>
                          <span>{bullet.replace(/\*([^*]+)\*/g, '$1')}</span>
                        </li>
                      ))}
                    </ul>
                  );
                }
                return (
                  <div
                    key={idx}
                    className="pl-4 border-l space-y-1 font-body"
                    style={{
                      borderColor: 'var(--color-border)',
                      fontSize: 'var(--text-body)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {block.lines.map((line, lIdx) => (
                      <p key={lIdx} className="m-0">
                        {line.replace(/\*([^*]+)\*/g, '$1')}
                      </p>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Card Footer Actions: Save as 1080×1080 PNG & Read Full Note */}
            <div
              className="pt-6 border-t flex flex-wrap items-center justify-between gap-4 font-mono"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveAsImage}
                  disabled={exporting}
                  className="px-4 py-2.5 border uppercase tracking-[var(--tracking-micro)] transition-colors cursor-pointer disabled:opacity-60"
                  style={{
                    fontSize: 'var(--text-micro)',
                    backgroundColor: 'var(--color-accent)',
                    borderColor: 'var(--color-accent)',
                    color: 'var(--color-accent-ink)',
                    borderRadius: 'var(--radius-xs)',
                  }}
                >
                  {exporting
                    ? 'rendering 1080×1080 png…'
                    : 'save as image (1080×1080 png)'}
                </button>

                {onOpenNote && (
                  <a
                    href={`/notes/principles/${item.slug}`}
                    {...getPreloadHandlers('notes')}
                    onClick={(e) => {
                      e.preventDefault();
                      onOpenNote(item.slug);
                    }}
                    className="px-3.5 py-2.5 border uppercase tracking-[var(--tracking-micro)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] no-underline"
                    style={{
                      fontSize: 'var(--text-micro)',
                      borderColor: 'var(--color-border-strong)',
                      color: 'var(--color-text)',
                      borderRadius: 'var(--radius-xs)',
                    }}
                  >
                    open full note →
                  </a>
                )}
              </div>

              {exportStatus && (
                <span
                  role="status"
                  aria-live="polite"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: 'var(--color-status-ok)',
                  }}
                >
                  {exportStatus}
                </span>
              )}
            </div>
          </article>

          {/* Optional Browser-Only Daily Notification Section */}
          <section
            aria-label="Daily browser notification reminder"
            className="border p-6 sm:p-8 space-y-5"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-bg-elevated)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <h2
                  className="m-0 font-mono uppercase tracking-[var(--tracking-mono)] font-normal"
                  style={{
                    fontSize: 'var(--text-heading-mono)',
                    color: 'var(--color-text)',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    ●{' '}
                  </span>
                  Optional daily browser reminder
                </h2>
                <p
                  className="m-0 font-body"
                  style={{
                    maxWidth: '58ch',
                    fontSize: 'var(--text-meta)',
                    lineHeight: 1.6,
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Pick a quiet time to receive today’s principle as a browser
                  notification. Your schedule is stored only in{' '}
                  <code className="font-mono text-[0.9em]">localStorage</code> on
                  this device—never sent to a server.
                </p>
              </div>

              {/* Primary On/Off Switch */}
              <div className="flex items-center gap-3 font-mono shrink-0">
                <button
                  type="button"
                  role="switch"
                  aria-checked={reminderPrefs.enabled}
                  aria-label="Daily browser notification"
                  onClick={handleToggleSwitch}
                  className="px-4 py-2 border uppercase tracking-[var(--tracking-micro)] transition-colors cursor-pointer"
                  style={{
                    fontSize: 'var(--text-micro)',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: reminderPrefs.enabled
                      ? 'var(--color-accent)'
                      : 'transparent',
                    borderColor: reminderPrefs.enabled
                      ? 'var(--color-accent)'
                      : 'var(--color-border-strong)',
                    color: reminderPrefs.enabled
                      ? 'var(--color-accent-ink)'
                      : 'var(--color-text)',
                  }}
                >
                  {reminderPrefs.enabled ? 'notifications: on' : 'notifications: off'}
                </button>
              </div>
            </div>

            <div
              className="pt-4 border-t flex flex-wrap items-center justify-between gap-4 font-mono"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="flex flex-wrap items-center gap-3">
                <label
                  htmlFor="daily-reminder-time"
                  className="uppercase tracking-[var(--tracking-micro)]"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Reminder time (local)
                </label>
                <input
                  id="daily-reminder-time"
                  type="time"
                  value={reminderPrefs.time}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="px-3 py-1.5 border font-mono bg-transparent"
                  style={{
                    fontSize: 'var(--text-micro)',
                    borderColor: 'var(--color-border-strong)',
                    color: 'var(--color-text)',
                    borderRadius: 'var(--radius-xs)',
                  }}
                />

                {reminderPrefs.enabled && permissionState === 'granted' && (
                  <button
                    type="button"
                    onClick={handleSendTestNotification}
                    className="px-3 py-1.5 border uppercase tracking-[var(--tracking-micro)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer"
                    style={{
                      fontSize: 'var(--text-micro)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-secondary)',
                      borderRadius: 'var(--radius-xs)',
                    }}
                  >
                    send test notification
                  </button>
                )}
              </div>

              {/* Explicit One-Click Off Switch whenever active */}
              {reminderPrefs.enabled && (
                <button
                  type="button"
                  onClick={handleTurnOffReminder}
                  className="px-3.5 py-1.5 border uppercase tracking-[var(--tracking-micro)] transition-colors cursor-pointer"
                  style={{
                    fontSize: 'var(--text-micro)',
                    borderColor: 'var(--color-status-error)',
                    color: 'var(--color-status-error)',
                    borderRadius: 'var(--radius-xs)',
                  }}
                >
                  turn off notifications
                </button>
              )}
            </div>

            {reminderStatus && (
              <p
                role="status"
                aria-live="polite"
                className="m-0 font-mono"
                style={{
                  fontSize: 'var(--text-micro)',
                  color: reminderPrefs.enabled
                    ? 'var(--color-status-ok)'
                    : 'var(--color-text-muted)',
                }}
              >
                {reminderStatus}
              </p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
