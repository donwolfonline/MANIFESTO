export type FocusMode = 'focus' | 'break';

export type AmbientSoundPreset = 'off' | 'rain' | 'keyboard' | 'room';

export interface FocusTimerPreset {
  id: '25-5' | '50-10' | 'custom';
  label: string;
  focusMinutes: number;
  breakMinutes: number;
}

export interface FocusSessionEntry {
  id: string;
  /** Single-line answer to "what did you finish?" */
  note: string;
  /** Completed focus duration in minutes */
  durationMinutes: number;
  /** ISO 8601 completion timestamp */
  completedAt: string;
  /** Local calendar date key in YYYY-MM-DD format */
  dateKey: string;
  /** Principle number shown when the session completed */
  principleNumber: number;
}

export interface WeeklyDayBucket {
  dateKey: string;
  shortLabel: string; // e.g. "Mon"
  sessions: number;
  minutes: number;
}

export interface WeeklyFocusSummary {
  totalSessions: number;
  totalMinutes: number;
  activeDays: number;
  days: WeeklyDayBucket[];
}

export const FOCUS_HISTORY_STORAGE_KEY = 'manifesto_focus_history_v1';
export const MAX_STORED_SESSIONS = 200;

export const FOCUS_PRESETS: FocusTimerPreset[] = [
  {
    id: '25-5',
    label: '25 / 5',
    focusMinutes: 25,
    breakMinutes: 5,
  },
  {
    id: '50-10',
    label: '50 / 10',
    focusMinutes: 50,
    breakMinutes: 10,
  },
  {
    id: 'custom',
    label: 'Custom',
    focusMinutes: 35,
    breakMinutes: 7,
  },
];

export const AMBIENT_SOUND_OPTIONS: {
  id: AmbientSoundPreset;
  label: string;
  description: string;
}[] = [
  { id: 'off', label: 'Off', description: 'Complete silence (default)' },
  { id: 'rain', label: 'Rain', description: 'Soft steady rain on glass' },
  {
    id: 'keyboard',
    label: 'Keyboard clicks',
    description: 'Distant mechanical keyswitches',
  },
  {
    id: 'room',
    label: 'Quiet room',
    description: 'Warm low-frequency library air',
  },
];

export function clampMinutes(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatLocalDayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function loadFocusHistory(): FocusSessionEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(FOCUS_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is FocusSessionEntry =>
          Boolean(item) &&
          typeof item.id === 'string' &&
          typeof item.note === 'string' &&
          typeof item.durationMinutes === 'number' &&
          typeof item.completedAt === 'string' &&
          typeof item.dateKey === 'string',
      )
      .slice(0, MAX_STORED_SESSIONS);
  } catch {
    return [];
  }
}

export function saveFocusHistory(
  entries: FocusSessionEntry[],
): FocusSessionEntry[] {
  const trimmed = entries.slice(0, MAX_STORED_SESSIONS);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(
        FOCUS_HISTORY_STORAGE_KEY,
        JSON.stringify(trimmed),
      );
    } catch {
      // Ignore quota errors
    }
  }
  return trimmed;
}

export function addFocusSessionEntry(params: {
  note: string;
  durationMinutes: number;
  principleNumber: number;
  now?: Date;
}): { entry: FocusSessionEntry; history: FocusSessionEntry[] } {
  const now = params.now ?? new Date();
  const cleanNote =
    params.note.replace(/\s+/g, ' ').trim().slice(0, 160) ||
    'Quiet focused block (no note added)';
  const entry: FocusSessionEntry = {
    id: `focus-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
    note: cleanNote,
    durationMinutes: Math.max(1, Math.round(params.durationMinutes)),
    completedAt: now.toISOString(),
    dateKey: formatLocalDayKey(now),
    principleNumber: params.principleNumber,
  };

  const current = loadFocusHistory();
  const history = saveFocusHistory([entry, ...current]);
  return { entry, history };
}

export function removeFocusSessionEntry(id: string): FocusSessionEntry[] {
  const current = loadFocusHistory();
  return saveFocusHistory(current.filter((e) => e.id !== id));
}

export function clearFocusHistory(): FocusSessionEntry[] {
  return saveFocusHistory([]);
}

/**
 * Computes a 7-day rolling summary ending on `now` in the visitor's local calendar.
 */
export function computeWeeklySummary(
  entries: FocusSessionEntry[],
  now: Date = new Date(),
): WeeklyFocusSummary {
  const buckets: WeeklyDayBucket[] = [];
  const bucketMap = new Map<string, WeeklyDayBucket>();

  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - offset,
    );
    const dateKey = formatLocalDayKey(d);
    const shortLabel = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
    }).format(d);
    const bucket: WeeklyDayBucket = {
      dateKey,
      shortLabel,
      sessions: 0,
      minutes: 0,
    };
    buckets.push(bucket);
    bucketMap.set(dateKey, bucket);
  }

  for (const entry of entries) {
    const bucket = bucketMap.get(entry.dateKey);
    if (bucket) {
      bucket.sessions += 1;
      bucket.minutes += Math.max(0, entry.durationMinutes);
    }
  }

  let totalSessions = 0;
  let totalMinutes = 0;
  let activeDays = 0;

  for (const b of buckets) {
    totalSessions += b.sessions;
    totalMinutes += b.minutes;
    if (b.sessions > 0) activeDays += 1;
  }

  return {
    totalSessions,
    totalMinutes,
    activeDays,
    days: buckets,
  };
}

export function formatFocusHistoryAsMarkdown(
  entries: FocusSessionEntry[],
  summary: WeeklyFocusSummary,
): string {
  const lines: string[] = [
    '# WORKING_COPY.md — Focus Session Log',
    '',
    `- **Last 7 days**: ${summary.totalSessions} session(s) · ${summary.totalMinutes} focused minutes · ${summary.activeDays}/7 active days`,
    `- **Total stored sessions**: ${entries.length}`,
    '',
    '## Weekly Breakdown',
    '',
    '| Date | Day | Sessions | Minutes |',
    '| --- | --- | --- | --- |',
    ...summary.days.map(
      (d) => `| ${d.dateKey} | ${d.shortLabel} | ${d.sessions} | ${d.minutes}m |`,
    ),
    '',
    '## Completed Sessions ("What did you finish?")',
    '',
  ];

  if (entries.length === 0) {
    lines.push('_No sessions recorded yet._');
  } else {
    for (const entry of entries) {
      const pNum = String(entry.principleNumber).padStart(2, '0');
      lines.push(
        `- **${entry.dateKey}** (${entry.durationMinutes}m · Principle #${pNum}): ${entry.note}`,
      );
    }
  }

  return lines.join('\n') + '\n';
}

export function formatFocusHistoryAsJson(
  entries: FocusSessionEntry[],
  summary: WeeklyFocusSummary,
): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      weeklySummary: summary,
      entries,
    },
    null,
    2,
  );
}

export function downloadFocusExport(
  entries: FocusSessionEntry[],
  summary: WeeklyFocusSummary,
  format: 'md' | 'json',
): string {
  const dateStamp = formatLocalDayKey();
  const filename = `working-copy-focus-log-${dateStamp}.${format}`;
  const content =
    format === 'md'
      ? formatFocusHistoryAsMarkdown(entries, summary)
      : formatFocusHistoryAsJson(entries, summary);
  const mime =
    format === 'md'
      ? 'text/markdown;charset=utf-8'
      : 'application/json;charset=utf-8';

  if (typeof window !== 'undefined' && typeof Blob !== 'undefined') {
    const blob = new Blob([content], { type: mime });
    if (typeof URL.createObjectURL === 'function') {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  return filename;
}

/* ============================================================================
   Web Audio API Ambient Sound Synthesizer (Rain, Keyboard Clicks, Quiet Room)
   Instantiates AudioContext lazily ONLY when the visitor selects a sound.
   ============================================================================ */

export class FocusAmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: AudioNode[] = [];
  private activeSources: AudioScheduledSourceNode[] = [];
  private clickTimer: number | null = null;
  private currentPreset: AmbientSoundPreset = 'off';
  private volume = 0.45;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private stopActiveGraph(): void {
    if (this.clickTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.clickTimer);
      this.clickTimer = null;
    }
    for (const src of this.activeSources) {
      try {
        src.stop();
      } catch {
        // Already stopped
      }
      try {
        src.disconnect();
      } catch {
        // Ignore
      }
    }
    for (const node of this.activeNodes) {
      try {
        node.disconnect();
      } catch {
        // Ignore
      }
    }
    this.activeSources = [];
    this.activeNodes = [];
  }

  private createNoiseBuffer(
    ctx: AudioContext,
    seconds: number,
    color: 'pink' | 'brown',
  ): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (color === 'brown') {
      let lastOut = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 2.8;
      }
    } else {
      // Paul Kellet pink noise filter
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      let b3 = 0;
      let b4 = 0;
      let b5 = 0;
      let b6 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
        b6 = white * 0.115926;
      }
    }
    return buffer;
  }

  private startRain(ctx: AudioContext, destination: AudioNode): void {
    const src = ctx.createBufferSource();
    src.buffer = this.createNoiseBuffer(ctx, 4, 'pink');
    src.loop = true;

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 210;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 1250;

    const gain = ctx.createGain();
    gain.gain.value = 0.45;

    src.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(destination);

    src.start();
    this.activeSources.push(src);
    this.activeNodes.push(highpass, lowpass, gain);
  }

  private startQuietRoom(ctx: AudioContext, destination: AudioNode): void {
    const src = ctx.createBufferSource();
    src.buffer = this.createNoiseBuffer(ctx, 4, 'brown');
    src.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 220;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.28;

    // Subtle warm 110 Hz (A2) room air resonance
    const drone = ctx.createOscillator();
    drone.type = 'sine';
    drone.frequency.value = 110;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.018;

    src.connect(lowpass);
    lowpass.connect(noiseGain);
    noiseGain.connect(destination);

    drone.connect(droneGain);
    droneGain.connect(destination);

    src.start();
    drone.start();
    this.activeSources.push(src, drone);
    this.activeNodes.push(lowpass, noiseGain, droneGain);
  }

  private scheduleNextKeyClick(): void {
    if (this.currentPreset !== 'keyboard' || typeof window === 'undefined') {
      return;
    }

    const isPause = Math.random() < 0.14;
    const delayMs = isPause
      ? 650 + Math.random() * 900
      : 110 + Math.random() * 260;

    this.clickTimer = window.setTimeout(() => {
      this.triggerSingleKeyClick();
      this.scheduleNextKeyClick();
    }, delayMs);
  }

  private triggerSingleKeyClick(): void {
    const ctx = this.ctx;
    const master = this.masterGain;
    if (!ctx || !master || this.currentPreset !== 'keyboard') return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    filter.type = 'bandpass';
    filter.frequency.value = 680 + Math.random() * 320;
    filter.Q.value = 1.5;

    osc.type = 'triangle';
    const startFreq = 160 + Math.random() * 75;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(58, now + 0.024);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  public setPreset(preset: AmbientSoundPreset): void {
    this.stopActiveGraph();
    this.currentPreset = preset;
    if (preset === 'off') return;

    const ctx = this.ensureContext();
    const master = this.masterGain;
    if (!ctx || !master) return;

    if (preset === 'rain') {
      this.startRain(ctx, master);
    } else if (preset === 'room') {
      this.startQuietRoom(ctx, master);
    } else if (preset === 'keyboard') {
      this.startQuietRoom(ctx, master);
      this.triggerSingleKeyClick();
      this.scheduleNextKeyClick();
    }
  }

  public setVolume(nextVolume: number): void {
    this.volume = Math.min(1, Math.max(0, nextVolume));
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        this.volume,
        this.ctx.currentTime,
        0.04,
      );
    }
  }

  public playCompletionChime(): void {
    if (this.currentPreset === 'off') return;
    const ctx = this.ensureContext();
    const master = this.masterGain;
    if (!ctx || !master) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(528, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.45);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);

    osc.connect(gain);
    gain.connect(master);

    osc.start(now);
    osc.stop(now + 1.15);
  }

  public stop(): void {
    this.stopActiveGraph();
    this.currentPreset = 'off';
  }
}
