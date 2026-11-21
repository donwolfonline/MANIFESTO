import type { ManifestoItem } from '../data/manifestoItems';

export interface PrincipleOfTheDaySelection {
  /** Canonical UTC calendar day key in YYYY-MM-DD format */
  dateKey: string;
  /** Human-readable date label, e.g. "Saturday, Nov 21, 2026" */
  displayDate: string;
  /** Relative label compared to today ("Today", "Yesterday", "Tomorrow", etc.) */
  relativeLabel: string;
  /** Whether dateKey matches today's canonical dateKey */
  isToday: boolean;
  /** Unsigned 32-bit deterministic hash of the calendar date */
  hash: number;
  /** Short 7-character hex digest of the date hash */
  hashHex: string;
  /** Selected 0-based index into items */
  index: number;
  /** Selected principle for this calendar day */
  item: ManifestoItem;
}

export interface DailyReminderPrefs {
  enabled: boolean;
  /** 24-hour "HH:MM" local time chosen by the visitor */
  time: string;
  /** Local "YYYY-MM-DD" date key of the most recent fired notification */
  lastNotifiedDate: string | null;
}

export const DAILY_REMINDER_STORAGE_KEY = 'manifesto_daily_reminder_v1';
export const DEFAULT_REMINDER_TIME = '09:00';

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Formats a Date (or validates an existing YYYY-MM-DD string) into a canonical
 * UTC calendar date key ("YYYY-MM-DD") so every visitor worldwide sees the
 * exact same Principle of the Day on a given calendar date.
 */
export function formatUtcDateKey(input: Date | string = new Date()): string {
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (DATE_KEY_RE.test(trimmed)) {
      return trimmed;
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return formatUtcDateKey(parsed);
    }
    return formatUtcDateKey(new Date());
  }

  const year = input.getUTCFullYear();
  const month = String(input.getUTCMonth() + 1).padStart(2, '0');
  const day = String(input.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a Date into the visitor's local calendar date key ("YYYY-MM-DD"),
 * used strictly for local-time browser notification scheduling.
 */
export function formatLocalDateKey(input: Date = new Date()): string {
  const year = input.getFullYear();
  const month = String(input.getMonth() + 1).padStart(2, '0');
  const day = String(input.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKeyToUtcMs(dateKey: string): number {
  const match = DATE_KEY_RE.exec(dateKey.trim());
  if (!match) {
    const now = new Date();
    return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  return Date.UTC(year, month, day);
}

/**
 * Pure calendar day arithmetic on YYYY-MM-DD keys (e.g. -1 for yesterday, +1 for tomorrow).
 */
export function addDaysToDateKey(dateKey: string, deltaDays: number): string {
  const utcMs = parseDateKeyToUtcMs(dateKey);
  const shifted = new Date(utcMs + Math.round(deltaDays) * 86_400_000);
  return formatUtcDateKey(shifted);
}

export function formatHumanDate(dateKey: string): string {
  const utcMs = parseDateKeyToUtcMs(dateKey);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(utcMs));
}

export function getRelativeDayLabel(
  dateKey: string,
  todayKey: string = formatUtcDateKey(),
): string {
  const targetDays = Math.round(parseDateKeyToUtcMs(dateKey) / 86_400_000);
  const todayDays = Math.round(parseDateKeyToUtcMs(todayKey) / 86_400_000);
  const diff = targetDays - todayDays;

  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  if (diff < -1) return `${Math.abs(diff)} days ago`;
  return `In ${diff} days`;
}

/**
 * Deterministic 32-bit FNV-1a + MurmurHash3 avalanche mixer over a calendar date key.
 * Produces an unsigned 32-bit integer with uniform distribution and zero backend state.
 */
export function hashDateKey(dateKey: string): number {
  const input = `working-copy-potd:${dateKey.trim()}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // MurmurHash3 32-bit finalizer for full bit avalanche on adjacent date strings
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

function buildCyclePermutation(cycle: number, count: number): number[] {
  const arr = Array.from({ length: count }, (_, i) => i);
  let state = hashDateKey(`cycle:${cycle}`) || 1;
  for (let i = count - 1; i > 0; i--) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    const j = (state >>> 0) % (i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Deterministically picks one principle per calendar day using a date-based hash.
 * Uses a date-hash-seeded cycle permutation so every principle appears uniformly
 * and consecutive days ("yesterday / today / tomorrow") never repeat the same principle.
 */
export function getPrincipleOfTheDay(
  items: ManifestoItem[],
  dateOrKey: Date | string = new Date(),
  todayKey: string = formatUtcDateKey(),
): PrincipleOfTheDaySelection {
  if (items.length === 0) {
    throw new Error('getPrincipleOfTheDay requires at least one ManifestoItem.');
  }

  const dateKey = formatUtcDateKey(dateOrKey);
  const hash = hashDateKey(dateKey);
  const hashHex = hash.toString(16).padStart(8, '0').slice(0, 7);

  const count = items.length;
  let index = 0;

  if (count === 2) {
    const days = Math.floor(parseDateKeyToUtcMs(dateKey) / 86_400_000);
    index = ((days % 2) + 2) % 2;
  } else if (count > 2) {
    const days = Math.floor(parseDateKeyToUtcMs(dateKey) / 86_400_000);
    const cycle = Math.floor(days / count);
    const pos = ((days % count) + count) % count;
    const perm = buildCyclePermutation(cycle, count);
    const prevPerm = buildCyclePermutation(cycle - 1, count);
    // Swapping 0 and 1 never alters index count - 1 (since count >= 3),
    // guaranteeing cycle boundaries never repeat across any two adjacent days.
    if (perm[0] === prevPerm[count - 1]) {
      const tmp = perm[0];
      perm[0] = perm[1];
      perm[1] = tmp;
    }
    index = perm[pos];
  }

  return {
    dateKey,
    displayDate: formatHumanDate(dateKey),
    relativeLabel: getRelativeDayLabel(dateKey, todayKey),
    isToday: dateKey === todayKey,
    hash,
    hashHex,
    index,
    item: items[index],
  };
}

function stripInlineFormatting(text: string): string {
  return text.replace(/\*([^*]+)\*/g, '$1').replace(/`([^`]+)`/g, '$1');
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      if (lines.length >= maxLines) {
        const last = lines[lines.length - 1];
        lines[lines.length - 1] = `${last.replace(/[.,;:\s]+$/, '')}…`;
        return lines;
      }
      current = word;
    }
  }

  if (current) {
    if (lines.length < maxLines) {
      lines.push(current);
    } else if (lines.length > 0) {
      lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[.,;:\s]+$/, '')}…`;
    }
  }

  return lines;
}

/**
 * Renders the Principle of the Day card onto a 1080×1080 square Canvas 2D surface
 * styled to match the manifesto's editorial dark palette and typography.
 */
export function renderPrincipleCardToCanvas(
  selection: PrincipleOfTheDaySelection,
  metaFilename = 'WORKING_COPY.md',
  targetCanvas?: HTMLCanvasElement,
): HTMLCanvasElement {
  const SIZE = 1080;
  const canvas = targetCanvas ?? document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const { item, dateKey, displayDate, hashHex } = selection;
  const numStr = String(item.number).padStart(2, '0');

  // 1. Warm near-black outer background (#201e1f)
  ctx.fillStyle = '#201e1f';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // 2. Subtle concentric studio rings in background
  ctx.save();
  ctx.strokeStyle = 'rgba(242, 238, 232, 0.045)';
  ctx.lineWidth = 1.5;
  for (const radius of [260, 420, 580]) {
    ctx.beginPath();
    ctx.arc(SIZE - 140, 210, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // 3. Elevated inner editorial card frame (#282527)
  const pad = 64;
  const cardX = pad;
  const cardY = pad;
  const cardW = SIZE - pad * 2;
  const cardH = SIZE - pad * 2;

  ctx.fillStyle = '#282527';
  ctx.fillRect(cardX, cardY, cardW, cardH);

  ctx.strokeStyle = 'rgba(242, 238, 232, 0.22)';
  ctx.lineWidth = 2;
  ctx.strokeRect(cardX, cardY, cardW, cardH);

  // 4. Top vermilion accent rule
  ctx.fillStyle = '#f0642d';
  ctx.fillRect(cardX, cardY, cardW, 6);

  const innerX = cardX + 68;
  const innerRight = cardX + cardW - 68;
  const contentWidth = innerRight - innerX;

  // 5. Top metadata row
  ctx.font = '500 21px "JetBrains Mono", monospace';
  ctx.fillStyle = '#f0642d';
  ctx.textBaseline = 'top';
  ctx.fillText('PRINCIPLE OF THE DAY', innerX, cardY + 56);

  const dateBadge = `${dateKey} · 0x${hashHex}`;
  const badgeW = ctx.measureText(dateBadge).width;
  ctx.fillStyle = '#968f86';
  ctx.fillText(dateBadge, innerRight - badgeW, cardY + 56);

  // Divider hairline
  ctx.fillStyle = 'rgba(242, 238, 232, 0.12)';
  ctx.fillRect(innerX, cardY + 102, contentWidth, 1);

  // 6. Outlined giant numeral watermark (#01..#10)
  ctx.save();
  ctx.font = '400 180px "Instrument Serif", Georgia, serif';
  ctx.strokeStyle = 'rgba(240, 100, 45, 0.28)';
  ctx.lineWidth = 2.5;
  ctx.strokeText(numStr, innerX, cardY + 124);
  ctx.restore();

  // 7. Principle Title in Instrument Serif
  ctx.font = '400 64px "Instrument Serif", Georgia, serif';
  ctx.fillStyle = '#f2eee8';
  const titleLines = wrapCanvasText(
    ctx,
    `${numStr}. ${item.title}`,
    contentWidth,
    4,
  );
  let cursorY = cardY + 320;
  for (const line of titleLines) {
    ctx.fillText(line, innerX, cursorY);
    cursorY += 74;
  }

  // 8. Summary lead quote in italic serif
  cursorY += 18;
  ctx.fillStyle = '#f0642d';
  ctx.fillRect(innerX, cursorY + 6, 4, 48);

  ctx.font = 'italic 400 31px "Newsreader", Georgia, serif';
  ctx.fillStyle = '#f2eee8';
  const summaryLines = wrapCanvasText(
    ctx,
    stripInlineFormatting(item.summary),
    contentWidth - 28,
    3,
  );
  for (const line of summaryLines) {
    ctx.fillText(line, innerX + 24, cursorY);
    cursorY += 44;
  }

  // 9. First body paragraph excerpt
  const firstParagraph = item.body.find((b) => b.type === 'paragraph');
  if (firstParagraph && firstParagraph.type === 'paragraph' && cursorY < cardY + cardH - 210) {
    cursorY += 22;
    ctx.font = '400 26px "Newsreader", Georgia, serif';
    ctx.fillStyle = '#b8b1a7';
    const maxBodyLines = Math.max(
      1,
      Math.min(4, Math.floor((cardY + cardH - 155 - cursorY) / 38)),
    );
    const bodyLines = wrapCanvasText(
      ctx,
      stripInlineFormatting(firstParagraph.text),
      contentWidth,
      maxBodyLines,
    );
    for (const line of bodyLines) {
      ctx.fillText(line, innerX, cursorY);
      cursorY += 38;
    }
  }

  // 10. Bottom colophon bar
  const footerY = cardY + cardH - 96;
  ctx.fillStyle = 'rgba(242, 238, 232, 0.12)';
  ctx.fillRect(innerX, footerY, contentWidth, 1);

  ctx.font = '400 20px "JetBrains Mono", monospace';
  ctx.fillStyle = '#f2eee8';
  ctx.fillText(`~/${metaFilename}`, innerX, footerY + 32);

  const rightFooter = `${displayDate} · /today`;
  const rightW = ctx.measureText(rightFooter).width;
  ctx.fillStyle = '#968f86';
  ctx.fillText(rightFooter, innerRight - rightW, footerY + 32);

  return canvas;
}

/**
 * Renders the 1080×1080 PNG card and triggers a browser file download.
 * Returns the generated filename.
 */
export async function exportPrincipleCardAsPng(
  selection: PrincipleOfTheDaySelection,
  metaFilename = 'WORKING_COPY.md',
): Promise<string> {
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready;
    } catch {
      // Proceed with fallback system serif/mono if font promise rejects
    }
  }

  const canvas = renderPrincipleCardToCanvas(selection, metaFilename);
  const filename = `working-copy-principle-${selection.dateKey}.png`;

  const triggerDownload = (href: string, revokeAfter = false) => {
    const link = document.createElement('a');
    link.download = filename;
    link.href = href;
    document.body.appendChild(link);
    link.click();
    link.remove();
    if (revokeAfter) {
      window.setTimeout(() => URL.revokeObjectURL(href), 1000);
    }
  };

  if (typeof canvas.toBlob === 'function') {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png'),
    );
    if (blob && typeof URL.createObjectURL === 'function') {
      const objectUrl = URL.createObjectURL(blob);
      triggerDownload(objectUrl, true);
      return filename;
    }
  }

  const dataUrl = canvas.toDataURL('image/png');
  triggerDownload(dataUrl, false);
  return filename;
}

/* ============================================================================
   Browser-Only Daily Notification Reminder (stored strictly in localStorage)
   ============================================================================ */

export function isValidReminderTime(time: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time.trim());
}

export function loadDailyReminderPrefs(): DailyReminderPrefs {
  if (typeof window === 'undefined') {
    return {
      enabled: false,
      time: DEFAULT_REMINDER_TIME,
      lastNotifiedDate: null,
    };
  }

  try {
    const raw = window.localStorage.getItem(DAILY_REMINDER_STORAGE_KEY);
    if (!raw) {
      return {
        enabled: false,
        time: DEFAULT_REMINDER_TIME,
        lastNotifiedDate: null,
      };
    }
    const parsed = JSON.parse(raw) as Partial<DailyReminderPrefs>;
    const time =
      typeof parsed.time === 'string' && isValidReminderTime(parsed.time)
        ? parsed.time.trim()
        : DEFAULT_REMINDER_TIME;
    const lastNotifiedDate =
      typeof parsed.lastNotifiedDate === 'string' &&
      DATE_KEY_RE.test(parsed.lastNotifiedDate)
        ? parsed.lastNotifiedDate
        : null;
    return {
      enabled: Boolean(parsed.enabled),
      time,
      lastNotifiedDate,
    };
  } catch {
    return {
      enabled: false,
      time: DEFAULT_REMINDER_TIME,
      lastNotifiedDate: null,
    };
  }
}

export function saveDailyReminderPrefs(
  prefs: DailyReminderPrefs,
): DailyReminderPrefs {
  const clean: DailyReminderPrefs = {
    enabled: Boolean(prefs.enabled),
    time: isValidReminderTime(prefs.time)
      ? prefs.time.trim()
      : DEFAULT_REMINDER_TIME,
    lastNotifiedDate:
      prefs.lastNotifiedDate && DATE_KEY_RE.test(prefs.lastNotifiedDate)
        ? prefs.lastNotifiedDate
        : null,
  };

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(
        DAILY_REMINDER_STORAGE_KEY,
        JSON.stringify(clean),
      );
    } catch {
      // Ignore storage quota errors
    }
  }
  return clean;
}

/**
 * Explicit off-switch helper: disables daily browser notifications immediately
 * in localStorage while preserving the visitor's preferred time if they re-enable later.
 */
export function disableDailyReminder(): DailyReminderPrefs {
  const current = loadDailyReminderPrefs();
  return saveDailyReminderPrefs({
    ...current,
    enabled: false,
  });
}

/**
 * Checks whether a daily notification should fire at `now` in the visitor's local timezone.
 * Fires at most once per calendar day when local HH:MM >= prefs.time.
 */
export function isNotificationTriggerDue(
  prefs: DailyReminderPrefs,
  now: Date = new Date(),
): { due: boolean; localDateKey: string } {
  const localDateKey = formatLocalDateKey(now);
  if (!prefs.enabled || !isValidReminderTime(prefs.time)) {
    return { due: false, localDateKey };
  }
  if (prefs.lastNotifiedDate === localDateKey) {
    return { due: false, localDateKey };
  }

  const [targetHour, targetMinute] = prefs.time.split(':').map(Number);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const targetMinutes = targetHour * 60 + targetMinute;

  return {
    due: nowMinutes >= targetMinutes,
    localDateKey,
  };
}

export function sendPrincipleNotification(
  selection: PrincipleOfTheDaySelection,
): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (window.Notification.permission !== 'granted') {
    return false;
  }

  try {
    const num = String(selection.item.number).padStart(2, '0');
    new window.Notification(
      `Principle #${num}: ${selection.item.title}`,
      {
        body: selection.item.summary,
        tag: `working-copy-potd-${selection.dateKey}`,
      },
    );
    return true;
  } catch {
    return false;
  }
}
