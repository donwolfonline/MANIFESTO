import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import {
  MANIFESTO_ITEMS,
  type ManifestoItem,
} from '../data/manifestoItems';
import {
  addFocusSessionEntry,
  AMBIENT_SOUND_OPTIONS,
  clampMinutes,
  clearFocusHistory,
  computeWeeklySummary,
  downloadFocusExport,
  FOCUS_PRESETS,
  FocusAmbientSoundEngine,
  formatCountdown,
  loadFocusHistory,
  removeFocusSessionEntry,
  type AmbientSoundPreset,
  type FocusMode,
  type FocusSessionEntry,
  type FocusTimerPreset,
} from '../lib/focusRoom';
import type { ManifestoMeta } from '../lib/markdown';
import { getPreloadHandlers } from '../lib/routePreload';
import { usePrefersReducedMotion } from '../lib/useViewportActivity';
import { FilmGrain } from './FilmGrain';
import { HoverLink } from './HoverLink';

export interface FocusPageProps {
  meta: ManifestoMeta;
  items?: ManifestoItem[];
  onNavigateHome: (section?: string) => void;
  onOpenTerminal: () => void;
  onOpenToday?: () => void;
}

const PRINCIPLE_ROTATE_INTERVAL_MS = 45_000;
const RING_RADIUS = 136;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function FocusPage({
  meta,
  items = MANIFESTO_ITEMS,
  onNavigateHome,
  onOpenTerminal,
  onOpenToday,
}: FocusPageProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  // Timer configuration & state
  const [presetId, setPresetId] = useState<FocusTimerPreset['id']>('25-5');
  const [customFocusMin, setCustomFocusMin] = useState<number>(35);
  const [customBreakMin, setCustomBreakMin] = useState<number>(7);
  const [mode, setMode] = useState<FocusMode>('focus');

  const activeFocusMinutes = useMemo(() => {
    if (presetId === 'custom') return customFocusMin;
    return (
      FOCUS_PRESETS.find((p) => p.id === presetId)?.focusMinutes ?? 25
    );
  }, [presetId, customFocusMin]);

  const activeBreakMinutes = useMemo(() => {
    if (presetId === 'custom') return customBreakMin;
    return (
      FOCUS_PRESETS.find((p) => p.id === presetId)?.breakMinutes ?? 5
    );
  }, [presetId, customBreakMin]);

  const totalSeconds =
    (mode === 'focus' ? activeFocusMinutes : activeBreakMinutes) * 60;

  const [remainingSeconds, setRemainingSeconds] =
    useState<number>(totalSeconds);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // One principle shown at a time during a session, fading slowly
  const [principleIdx, setPrincipleIdx] = useState<number>(0);
  const [principleFading, setPrincipleFading] = useState<boolean>(false);

  // Ambient sound state (off by default)
  const soundEngineRef = useRef<FocusAmbientSoundEngine | null>(null);
  const [soundPreset, setSoundPreset] = useState<AmbientSoundPreset>('off');
  const [volumePct, setVolumePct] = useState<number>(45);

  // End-of-session "what did you finish?" prompt & local history
  const [awaitingNote, setAwaitingNote] = useState<boolean>(false);
  const [completedMinutes, setCompletedMinutes] = useState<number>(25);
  const [finishedNote, setFinishedNote] = useState<string>('');
  const [history, setHistory] = useState<FocusSessionEntry[]>(() =>
    loadFocusHistory(),
  );
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const noteInputRef = useRef<HTMLInputElement | null>(null);

  const weeklySummary = useMemo(
    () => computeWeeklySummary(history),
    [history],
  );
  const maxDailyMinutes = useMemo(
    () => Math.max(25, ...weeklySummary.days.map((d) => d.minutes)),
    [weeklySummary],
  );

  // Sync remainingSeconds when preset/mode/custom duration changes while stopped
  useEffect(() => {
    if (!isRunning) {
      setRemainingSeconds(totalSeconds);
    }
  }, [totalSeconds, isRunning]);

  // Cleanup Web Audio engine on unmount
  useEffect(() => {
    return () => {
      soundEngineRef.current?.stop();
    };
  }, []);

  const handleCompleteFocusBlock = useCallback(
    (minutesCompleted: number) => {
      setIsRunning(false);
      setCompletedMinutes(Math.max(1, minutesCompleted));
      setAwaitingNote(true);
      soundEngineRef.current?.playCompletionChime();
      window.setTimeout(() => {
        noteInputRef.current?.focus();
      }, 60);
    },
    [],
  );

  // 1-second countdown interval while running
  useEffect(() => {
    if (!isRunning) return;

    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          if (mode === 'focus') {
            handleCompleteFocusBlock(activeFocusMinutes);
          } else {
            setIsRunning(false);
            setMode('focus');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRunning, mode, activeFocusMinutes, handleCompleteFocusBlock]);

  const advancePrinciple = useCallback(
    (delta: number) => {
      if (items.length <= 1) return;
      if (prefersReducedMotion) {
        setPrincipleIdx((prev) => (prev + delta + items.length) % items.length);
        return;
      }
      setPrincipleFading(true);
      window.setTimeout(() => {
        setPrincipleIdx((prev) => (prev + delta + items.length) % items.length);
        setPrincipleFading(false);
      }, 420);
    },
    [items.length, prefersReducedMotion],
  );

  // Slowly cycle principles while a focus session is running
  useEffect(() => {
    if (!isRunning || items.length <= 1) return;
    const timer = window.setInterval(() => {
      advancePrinciple(1);
    }, PRINCIPLE_ROTATE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [isRunning, items.length, advancePrinciple]);

  const handleToggleRun = useCallback(() => {
    setAwaitingNote(false);
    setIsRunning((prev) => !prev);
  }, []);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setAwaitingNote(false);
    setRemainingSeconds(totalSeconds);
  }, [totalSeconds]);

  // Global keyboard shortcuts: Space to start/pause, R to reset
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'BUTTON' ||
          target.tagName === 'A' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault();
        handleToggleRun();
      } else if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        handleReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleRun, handleReset]);

  const handleSelectPreset = (nextPresetId: FocusTimerPreset['id']) => {
    setIsRunning(false);
    setAwaitingNote(false);
    setPresetId(nextPresetId);
  };

  const handleSelectMode = (nextMode: FocusMode) => {
    setIsRunning(false);
    setAwaitingNote(false);
    setMode(nextMode);
  };

  const handleSoundPresetChange = (next: AmbientSoundPreset) => {
    setSoundPreset(next);
    if (!soundEngineRef.current) {
      soundEngineRef.current = new FocusAmbientSoundEngine();
    }
    soundEngineRef.current.setVolume(volumePct / 100);
    soundEngineRef.current.setPreset(next);
  };

  const handleVolumeChange = (nextPct: number) => {
    const clamped = Math.min(100, Math.max(0, nextPct));
    setVolumePct(clamped);
    soundEngineRef.current?.setVolume(clamped / 100);
  };

  const handleFinishSessionNow = () => {
    const elapsedMinutes = Math.max(
      1,
      Math.round((totalSeconds - remainingSeconds) / 60) || activeFocusMinutes,
    );
    handleCompleteFocusBlock(elapsedMinutes);
  };

  const handleSaveFinishedNote = (event: FormEvent) => {
    event.preventDefault();
    const activeItem = items[principleIdx] ?? items[0];
    const { history: updated } = addFocusSessionEntry({
      note: finishedNote,
      durationMinutes: completedMinutes,
      principleNumber: activeItem?.number ?? 1,
    });
    setHistory(updated);
    setFinishedNote('');
    setAwaitingNote(false);
    setRemainingSeconds(totalSeconds);
  };

  const handleDeleteEntry = (id: string) => {
    setHistory(removeFocusSessionEntry(id));
  };

  const handleClearHistory = () => {
    setHistory(clearFocusHistory());
  };

  const handleExport = (format: 'md' | 'json') => {
    const filename = downloadFocusExport(history, weeklySummary, format);
    setExportMessage(`Exported ${filename} ✓`);
    window.setTimeout(() => setExportMessage(null), 2600);
  };

  const progress =
    totalSeconds > 0
      ? Math.min(1, Math.max(0, 1 - remainingSeconds / totalSeconds))
      : 0;
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);
  const currentPrinciple = items[principleIdx] ?? items[0];
  const principleNumStr = String(currentPrinciple?.number ?? 1).padStart(
    2,
    '0',
  );

  // Softly dim surrounding UI chrome while a focus session is actively running
  const dimChromeStyle = {
    opacity: isRunning ? 0.34 : 1,
    transition: prefersReducedMotion
      ? undefined
      : 'opacity 900ms cubic-bezier(0.22, 1, 0.36, 1)',
  };

  return (
    <div
      className="relative min-h-dvh flex flex-col"
      style={{
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)',
      }}
    >
      <FilmGrain />

      {/* Minimal sticky header (softly dims during active focus session) */}
      <header
        className="sticky top-0 shrink-0 border-b hover:opacity-100 focus-within:opacity-100"
        style={{
          height: 'var(--header-height)',
          zIndex: 'var(--z-header)',
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-bg-glass)',
          ...dimChromeStyle,
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

          <div className="flex items-center gap-5 sm:gap-7">
            {onOpenToday && (
              <HoverLink
                href="/today"
                {...getPreloadHandlers('today')}
                onClick={(e) => {
                  e.preventDefault();
                  onOpenToday();
                }}
                className="hidden sm:inline-flex uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
                style={{
                  fontSize: 'var(--text-micro)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                /today
              </HoverLink>
            )}

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
        aria-label="Focus session work room"
        className="flex-1 editorial-shell py-8 sm:py-14"
      >
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Top bar: Title & Preset / Mode Selector (dims gently while timer runs) */}
          <div
            className="pb-6 border-b flex flex-col md:flex-row md:items-end justify-between gap-5 hover:opacity-100 focus-within:opacity-100"
            style={{
              borderColor: 'var(--color-border)',
              ...dimChromeStyle,
            }}
          >
            <div data-legacy-title-block="true">
              <p
                className="m-0 mb-1.5 font-mono uppercase tracking-[var(--tracking-micro)]"
                style={{
                  fontSize: 'var(--text-micro)',
                  color: 'var(--color-accent)',
                }}
              >
                /focus · Calm Work Session Room
              </p>
              <h1
                className="m-0 font-display font-normal"
                style={{
                  fontSize: 'clamp(2.25rem, 5vw, 4rem)',
                  lineHeight: 0.96,
                  letterSpacing: 'var(--tracking-display)',
                  color: 'var(--color-text)',
                }}
              >
                Quiet <span className="italic">Focus</span> Room
                <span style={{ color: 'var(--color-accent)' }}>.</span>
              </h1>
            </div>

            {/* Preset & Mode pills */}
            <div className="flex flex-wrap items-center gap-2 font-mono">
              <div
                role="group"
                aria-label="Timer duration presets"
                className="inline-flex items-center p-0.5 border"
                style={{
                  borderColor: 'var(--color-border-strong)',
                  backgroundColor: 'var(--color-bg-elevated)',
                  borderRadius: 'var(--radius-xs)',
                }}
              >
                {FOCUS_PRESETS.map((preset) => {
                  const active = preset.id === presetId;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset.id)}
                      aria-pressed={active}
                      className="px-3 py-1.5 uppercase tracking-[var(--tracking-micro)] transition-colors cursor-pointer"
                      style={{
                        fontSize: 'var(--text-micro)',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: active
                          ? 'var(--color-accent)'
                          : 'transparent',
                        color: active
                          ? 'var(--color-accent-ink)'
                          : 'var(--color-text-secondary)',
                      }}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              <div
                role="group"
                aria-label="Session phase"
                className="inline-flex items-center p-0.5 border"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-bg-elevated)',
                  borderRadius: 'var(--radius-xs)',
                }}
              >
                {(['focus', 'break'] as FocusMode[]).map((phase) => {
                  const active = mode === phase;
                  return (
                    <button
                      key={phase}
                      type="button"
                      onClick={() => handleSelectMode(phase)}
                      aria-pressed={active}
                      className="px-3 py-1.5 uppercase tracking-[var(--tracking-micro)] transition-colors cursor-pointer"
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
                      {phase === 'focus'
                        ? `focus (${activeFocusMinutes}m)`
                        : `break (${activeBreakMinutes}m)`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Custom duration inputs when Custom preset is active */}
          {presetId === 'custom' && (
            <div
              className="border p-4 flex flex-wrap items-center justify-between gap-4 font-mono hover:opacity-100 focus-within:opacity-100"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg-elevated)',
                borderRadius: 'var(--radius-xs)',
                fontSize: 'var(--text-micro)',
                ...dimChromeStyle,
              }}
            >
              <span
                className="uppercase tracking-[var(--tracking-micro)]"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Custom block durations
              </span>
              <div className="flex flex-wrap items-center gap-4">
                <label className="inline-flex items-center gap-2">
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    Focus (min)
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    aria-label="Custom focus minutes"
                    value={customFocusMin}
                    onChange={(e) =>
                      setCustomFocusMin(
                        clampMinutes(Number(e.target.value), 1, 180),
                      )
                    }
                    className="w-18 px-2 py-1 border bg-transparent text-center"
                    style={{
                      borderColor: 'var(--color-border-strong)',
                      color: 'var(--color-text)',
                      borderRadius: 'var(--radius-xs)',
                    }}
                  />
                </label>

                <label className="inline-flex items-center gap-2">
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    Break (min)
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    aria-label="Custom break minutes"
                    value={customBreakMin}
                    onChange={(e) =>
                      setCustomBreakMin(
                        clampMinutes(Number(e.target.value), 1, 60),
                      )
                    }
                    className="w-18 px-2 py-1 border bg-transparent text-center"
                    style={{
                      borderColor: 'var(--color-border-strong)',
                      color: 'var(--color-text)',
                      borderRadius: 'var(--radius-xs)',
                    }}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Central Timer Stage + Circular Progress Ring + Rotating Principle */}
          <section
            aria-label="Active focus timer"
            className="border p-7 sm:p-12 flex flex-col items-center text-center space-y-8"
            style={{
              borderColor: isRunning
                ? 'var(--color-accent)'
                : 'var(--color-border-strong)',
              backgroundColor: 'var(--color-bg-elevated)',
              borderRadius: 'var(--radius-sm)',
              transition: 'border-color 600ms ease',
            }}
          >
            {/* Circular SVG Progress Ring + Large Countdown */}
            <div className="relative flex items-center justify-center w-[19rem] h-[19rem] sm:w-[21rem] sm:h-[21rem]">
              <svg
                viewBox="0 0 320 320"
                className="w-full h-full -rotate-90"
                aria-hidden="true"
              >
                <circle
                  cx="160"
                  cy="160"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="rgba(242, 238, 232, 0.1)"
                  strokeWidth="4"
                />
                <circle
                  cx="160"
                  cy="160"
                  r={RING_RADIUS}
                  fill="none"
                  stroke={
                    mode === 'focus' ? 'var(--color-accent)' : 'var(--color-status-ok)'
                  }
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={strokeDashoffset}
                  style={{
                    transition: prefersReducedMotion
                      ? undefined
                      : 'stroke-dashoffset 500ms linear',
                  }}
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
                <span
                  className="font-mono uppercase tracking-[var(--tracking-micro)] mb-2"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color:
                      mode === 'focus'
                        ? 'var(--color-accent)'
                        : 'var(--color-status-ok)',
                  }}
                >
                  {mode === 'focus'
                    ? isRunning
                      ? '● focus in progress'
                      : 'focus block'
                    : isRunning
                      ? '● break in progress'
                      : 'quiet break'}
                </span>

                <div
                  role="timer"
                  aria-live="off"
                  aria-label="Remaining session time"
                  className="font-mono tabular-nums leading-none select-all"
                  style={{
                    fontSize: 'clamp(3.1rem, 7vw, 4.35rem)',
                    letterSpacing: '-0.03em',
                    color: 'var(--color-text)',
                  }}
                >
                  {formatCountdown(remainingSeconds)}
                </div>

                <span
                  className="mt-3 font-mono uppercase tracking-[var(--tracking-micro)]"
                  style={{
                    fontSize: '0.65rem',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  space: {isRunning ? 'pause' : 'start'} · r: reset
                </span>
              </div>
            </div>

            {/* Timer Action Controls */}
            <div className="flex flex-wrap items-center justify-center gap-3 font-mono">
              <button
                type="button"
                onClick={handleToggleRun}
                className="px-6 py-2.5 border uppercase tracking-[var(--tracking-micro)] transition-colors cursor-pointer"
                style={{
                  fontSize: 'var(--text-micro)',
                  backgroundColor: 'var(--color-accent)',
                  borderColor: 'var(--color-accent)',
                  color: 'var(--color-accent-ink)',
                  borderRadius: 'var(--radius-xs)',
                }}
              >
                {isRunning ? 'pause (space)' : 'start session (space)'}
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2.5 border uppercase tracking-[var(--tracking-micro)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer"
                style={{
                  fontSize: 'var(--text-micro)',
                  borderColor: 'var(--color-border-strong)',
                  color: 'var(--color-text)',
                  borderRadius: 'var(--radius-xs)',
                }}
              >
                reset (r)
              </button>

              {mode === 'focus' && (
                <button
                  type="button"
                  onClick={handleFinishSessionNow}
                  className="px-4 py-2.5 border uppercase tracking-[var(--tracking-micro)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer"
                  style={{
                    fontSize: 'var(--text-micro)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)',
                    borderRadius: 'var(--radius-xs)',
                  }}
                >
                  complete &amp; log →
                </button>
              )}
            </div>

            {/* End-of-session "What did you finish?" single-line prompt */}
            {awaitingNote && (
              <form
                onSubmit={handleSaveFinishedNote}
                aria-label="Session completion log"
                className="w-full max-w-2xl border p-5 sm:p-6 text-left space-y-4 panel-enter"
                style={{
                  borderColor: 'var(--color-accent)',
                  backgroundColor: 'var(--color-bg)',
                  borderRadius: 'var(--radius-xs)',
                }}
              >
                <div className="flex items-baseline justify-between gap-3 font-mono">
                  <label
                    htmlFor="focus-finished-note"
                    className="uppercase tracking-[var(--tracking-micro)]"
                    style={{
                      fontSize: 'var(--text-micro)',
                      color: 'var(--color-accent)',
                    }}
                  >
                    Session complete ({completedMinutes}m) — what did you finish?
                  </label>
                  <button
                    type="button"
                    onClick={() => setAwaitingNote(false)}
                    className="uppercase tracking-[var(--tracking-micro)] cursor-pointer"
                    style={{
                      fontSize: 'var(--text-micro)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    dismiss
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    ref={noteInputRef}
                    id="focus-finished-note"
                    type="text"
                    maxLength={160}
                    value={finishedNote}
                    onChange={(e) => setFinishedNote(e.target.value)}
                    placeholder="e.g. Trimmed the retry handler and wrote two unit tests"
                    className="flex-1 px-3.5 py-2.5 border font-mono bg-transparent focus:outline-none"
                    style={{
                      fontSize: 'var(--text-meta)',
                      borderColor: 'var(--color-border-strong)',
                      color: 'var(--color-text)',
                      borderRadius: 'var(--radius-xs)',
                    }}
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 border font-mono uppercase tracking-[var(--tracking-micro)] cursor-pointer shrink-0"
                    style={{
                      fontSize: 'var(--text-micro)',
                      backgroundColor: 'var(--color-accent)',
                      borderColor: 'var(--color-accent)',
                      color: 'var(--color-accent-ink)',
                      borderRadius: 'var(--radius-xs)',
                    }}
                  >
                    save to log
                  </button>
                </div>
              </form>
            )}

            {/* Single Rotating Principle Companion (fades slowly during session) */}
            {currentPrinciple && (
              <div
                aria-live="polite"
                className="w-full max-w-2xl pt-7 border-t space-y-3"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div
                  className="flex items-center justify-between gap-4 font-mono uppercase tracking-[var(--tracking-micro)]"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => advancePrinciple(-1)}
                    title="Previous principle"
                    className="transition-colors hover:text-[var(--color-accent)] cursor-pointer"
                  >
                    ← previous
                  </button>
                  <span>
                    companion principle #{principleNumStr} of{' '}
                    {String(items.length).padStart(2, '0')}
                  </span>
                  <button
                    type="button"
                    onClick={() => advancePrinciple(1)}
                    title="Next principle"
                    className="transition-colors hover:text-[var(--color-accent)] cursor-pointer"
                  >
                    next →
                  </button>
                </div>

                <div
                  style={{
                    opacity: principleFading ? 0 : 1,
                    transition: prefersReducedMotion
                      ? undefined
                      : 'opacity 420ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                >
                  <h2
                    className="m-0 font-display font-normal"
                    style={{
                      fontSize: 'clamp(1.5rem, 2.8vw, 2.2rem)',
                      lineHeight: 1.08,
                      color: 'var(--color-text)',
                    }}
                  >
                    {currentPrinciple.title}
                  </h2>
                  <p
                    className="m-0 mt-2 font-body italic mx-auto"
                    style={{
                      maxWidth: '54ch',
                      fontSize: 'var(--text-body)',
                      lineHeight: 1.6,
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {currentPrinciple.summary}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Optional Web Audio Ambient Sound Bar (off by default, with volume slider) */}
          <section
            aria-label="Ambient sound controls"
            className="border p-6 space-y-4 hover:opacity-100 focus-within:opacity-100"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-bg-elevated)',
              borderRadius: 'var(--radius-sm)',
              ...dimChromeStyle,
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
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
                    ♪{' '}
                  </span>
                  Web Audio ambient sound
                </h2>
                <p
                  className="m-0 mt-1 font-body"
                  style={{
                    fontSize: 'var(--text-meta)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Synthesized live in your browser with the Web Audio API—off by
                  default, zero audio downloads.
                </p>
              </div>

              {/* Volume slider */}
              <div className="flex items-center gap-3 font-mono shrink-0">
                <label
                  htmlFor="ambient-volume-slider"
                  className="uppercase tracking-[var(--tracking-micro)]"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Volume
                </label>
                <input
                  id="ambient-volume-slider"
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={volumePct}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  aria-label="Ambient sound volume"
                  className="w-28 cursor-pointer"
                  style={{ accentColor: 'var(--color-accent)' }}
                />
                <span
                  className="w-9 text-right tabular-nums"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: 'var(--color-text)',
                  }}
                >
                  {volumePct}%
                </span>
              </div>
            </div>

            <div
              role="group"
              aria-label="Ambient sound preset"
              className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono"
            >
              {AMBIENT_SOUND_OPTIONS.map((option) => {
                const active = soundPreset === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSoundPresetChange(option.id)}
                    aria-pressed={active}
                    className="p-3 border text-left transition-colors cursor-pointer"
                    style={{
                      borderRadius: 'var(--radius-xs)',
                      borderColor: active
                        ? 'var(--color-accent)'
                        : 'var(--color-border-strong)',
                      backgroundColor: active
                        ? 'var(--color-bg)'
                        : 'transparent',
                    }}
                  >
                    <span
                      className="block uppercase tracking-[var(--tracking-micro)]"
                      style={{
                        fontSize: 'var(--text-micro)',
                        color: active
                          ? 'var(--color-accent)'
                          : 'var(--color-text)',
                      }}
                    >
                      {option.label}
                    </span>{' '}
                    <span
                      className="block mt-1 font-body"
                      style={{
                        fontSize: 'var(--text-micro)',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Weekly Summary & Local Session History + Export */}
          <section
            aria-label="Weekly focus summary and session history"
            className="border p-6 sm:p-8 space-y-7 hover:opacity-100 focus-within:opacity-100"
            style={{
              borderColor: 'var(--color-border-strong)',
              backgroundColor: 'var(--color-bg-elevated)',
              borderRadius: 'var(--radius-sm)',
              ...dimChromeStyle,
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h2
                  className="m-0 font-mono uppercase tracking-[var(--tracking-mono)] font-normal"
                  style={{
                    fontSize: 'var(--text-heading-mono)',
                    color: 'var(--color-text)',
                  }}
                >
                  Weekly summary &amp; local log
                </h2>
                <p
                  className="m-0 mt-1 font-mono"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Last 7 days: {weeklySummary.totalSessions} session(s) ·{' '}
                  {weeklySummary.totalMinutes} focused min ·{' '}
                  {weeklySummary.activeDays}/7 active days
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 font-mono">
                <button
                  type="button"
                  onClick={() => handleExport('md')}
                  className="px-3 py-1.5 border uppercase tracking-[var(--tracking-micro)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer"
                  style={{
                    fontSize: 'var(--text-micro)',
                    borderColor: 'var(--color-border-strong)',
                    color: 'var(--color-text)',
                    borderRadius: 'var(--radius-xs)',
                  }}
                >
                  export .md ↓
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('json')}
                  className="px-3 py-1.5 border uppercase tracking-[var(--tracking-micro)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer"
                  style={{
                    fontSize: 'var(--text-micro)',
                    borderColor: 'var(--color-border-strong)',
                    color: 'var(--color-text)',
                    borderRadius: 'var(--radius-xs)',
                  }}
                >
                  export .json ↓
                </button>
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="px-3 py-1.5 border uppercase tracking-[var(--tracking-micro)] transition-colors cursor-pointer"
                    style={{
                      fontSize: 'var(--text-micro)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-muted)',
                      borderRadius: 'var(--radius-xs)',
                    }}
                  >
                    clear
                  </button>
                )}
              </div>
            </div>

            {exportMessage && (
              <p
                role="status"
                aria-live="polite"
                className="m-0 font-mono"
                style={{ fontSize: 'var(--text-micro)', color: 'var(--color-status-ok)' }}
              >
                {exportMessage}
              </p>
            )}

            {/* 7-Day Activity Bar Grid */}
            <div
              role="region"
              aria-label="7-day focus activity"
              className="grid grid-cols-7 gap-2 sm:gap-3 font-mono"
            >
              {weeklySummary.days.map((day) => {
                const heightPct =
                  day.minutes > 0
                    ? Math.max(14, Math.round((day.minutes / maxDailyMinutes) * 100))
                    : 6;
                return (
                  <div
                    key={day.dateKey}
                    className="p-2.5 border flex flex-col items-center text-center space-y-2"
                    style={{
                      borderColor:
                        day.sessions > 0
                          ? 'var(--color-border-strong)'
                          : 'var(--color-border)',
                      backgroundColor: 'var(--color-bg)',
                      borderRadius: 'var(--radius-xs)',
                    }}
                  >
                    <span
                      className="uppercase"
                      style={{
                        fontSize: '0.65rem',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {day.shortLabel}
                    </span>

                    <div className="w-full h-14 flex items-end justify-center">
                      <div
                        className="w-4 rounded-t-[1px]"
                        style={{
                          height: `${heightPct}%`,
                          backgroundColor:
                            day.minutes > 0
                              ? 'var(--color-accent)'
                              : 'var(--color-border)',
                        }}
                      />
                    </div>

                    <span
                      className="tabular-nums"
                      style={{
                        fontSize: '0.68rem',
                        color:
                          day.minutes > 0
                            ? 'var(--color-text)'
                            : 'var(--color-text-muted)',
                      }}
                    >
                      {day.minutes}m
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Completed Session Log Entries */}
            <div className="space-y-2.5">
              <h3
                className="m-0 font-mono uppercase tracking-[var(--tracking-micro)] font-normal"
                style={{
                  fontSize: 'var(--text-micro)',
                  color: 'var(--color-text-muted)',
                }}
              >
                Completed sessions ({history.length})
              </h3>

              {history.length === 0 ? (
                <p
                  className="m-0 py-6 text-center border font-mono"
                  style={{
                    borderColor: 'var(--color-border)',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: 'var(--text-micro)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  No focus sessions logged yet. Start the timer or click
                  &ldquo;complete &amp; log&rdquo; when you finish a piece of
                  work.
                </p>
              ) : (
                <ul className="m-0 p-0 list-none space-y-2">
                  {history.slice(0, 20).map((entry) => (
                    <li
                      key={entry.id}
                      className="p-3.5 border flex items-baseline justify-between gap-4"
                      style={{
                        borderColor: 'var(--color-border)',
                        backgroundColor: 'var(--color-bg)',
                        borderRadius: 'var(--radius-xs)',
                      }}
                    >
                      <div className="min-w-0 space-y-1">
                        <p
                          className="m-0 font-body"
                          style={{
                            fontSize: 'var(--text-meta)',
                            color: 'var(--color-text)',
                          }}
                        >
                          {entry.note}
                        </p>
                        <p
                          className="m-0 font-mono"
                          style={{
                            fontSize: 'var(--text-micro)',
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          {entry.dateKey} · {entry.durationMinutes}m · principle
                          #{String(entry.principleNumber).padStart(2, '0')}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteEntry(entry.id)}
                        aria-label={`Remove session note: ${entry.note}`}
                        className="shrink-0 font-mono uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)] cursor-pointer"
                        style={{
                          fontSize: 'var(--text-micro)',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
