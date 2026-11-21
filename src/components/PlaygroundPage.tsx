import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getPreloadHandlers } from '../lib/routePreload';
import { usePrefersReducedMotion } from '../lib/useViewportActivity';
import type { ManifestoMeta } from '../lib/markdown';
import {
  compileSketchCode,
  createRandomSettings,
  decodeSettingsFromHash,
  DEFAULT_PLAYGROUND_CODE,
  DEFAULT_PLAYGROUND_SETTINGS,
  DESKTOP_MAX_COUNT,
  encodeSettingsToHash,
  MOBILE_MAX_COUNT,
  PLAYGROUND_PALETTE_LIST,
  PLAYGROUND_SHAPES,
  type CompiledDrawFn,
  type PlaygroundSettings,
} from '../lib/playgroundEngine';
import { FilmGrain } from './FilmGrain';
import { HoverLink } from './HoverLink';
import {
  PlaygroundCanvas,
  type PlaygroundCanvasHandle,
} from './PlaygroundCanvas';

export interface PlaygroundPageProps {
  meta: ManifestoMeta;
  onNavigateHome: (section?: string) => void;
  onOpenTerminal: () => void;
  onOpenDelete: () => void;
}

const MOBILE_QUERY = '(max-width: 767px)';

export function PlaygroundPage({
  meta,
  onNavigateHome,
  onOpenTerminal,
  onOpenDelete,
}: PlaygroundPageProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(MOBILE_QUERY).matches;
  });

  const [settings, setSettings] = useState<PlaygroundSettings>(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const fromHash = decodeSettingsFromHash(window.location.hash);
      if (fromHash) return fromHash;
    }
    return DEFAULT_PLAYGROUND_SETTINGS;
  });

  // Respect prefers-reduced-motion by starting paused on a crisp still frame
  const [playing, setPlaying] = useState<boolean>(() => !prefersReducedMotion);
  const [code, setCode] = useState<string>(DEFAULT_PLAYGROUND_CODE);
  const [compiledFn, setCompiledFn] = useState<CompiledDrawFn | null>(() => {
    return compileSketchCode(DEFAULT_PLAYGROUND_CODE).fn;
  });
  const [compileError, setCompileError] = useState<string | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const sheetTouchStartYRef = useRef<number | null>(null);

  const canvasHandleRef = useRef<PlaygroundCanvasHandle | null>(null);

  // Sync mobile media query dynamically to enforce mobile particle cap
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const handleChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  // Re-compile user-edited code safely after a short 320ms debounce
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const result = compileSketchCode(code);
      if (result.error) {
        setCompileError(result.error);
      } else {
        setCompileError(null);
        setRuntimeError(null);
        setCompiledFn(() => result.fn);
      }
    }, 320);

    return () => window.clearTimeout(timer);
  }, [code]);

  const maxCount = isMobile ? MOBILE_MAX_COUNT : DESKTOP_MAX_COUNT;
  const effectiveCount = Math.min(settings.count, maxCount);
  const activeError = compileError ?? runtimeError;
  const codeIsModified = code !== DEFAULT_PLAYGROUND_CODE;

  const updateSetting = useCallback(
    <K extends keyof PlaygroundSettings>(
      key: K,
      value: PlaygroundSettings[K],
    ) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleRandomize = () => {
    setSettings(createRandomSettings(maxCount));
  };

  const handleSavePng = () => {
    canvasHandleRef.current?.exportPng(
      `working-copy-playground-${settings.seed}.png`,
    );
  };

  const handleCopyShareLink = async () => {
    const hashToken = encodeSettingsToHash({
      ...settings,
      count: effectiveCount,
    });
    const nextUrl = `${window.location.origin}/playground#${hashToken}`;
    window.history.replaceState({}, '', `/playground#${hashToken}`);

    try {
      await navigator.clipboard.writeText(nextUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      setCopiedLink(false);
    }
  };

  const liveParamBanner = useMemo(
    () =>
      `shape="${settings.shape}" · count=${effectiveCount} · noise=${settings.noiseScale.toFixed(4)} · speed=${settings.speed.toFixed(2)} · symmetry=${settings.symmetry ? 'on' : 'off'}`,
    [
      settings.shape,
      effectiveCount,
      settings.noiseScale,
      settings.speed,
      settings.symmetry,
    ],
  );

  return (
    <div
      className="relative min-h-dvh flex flex-col"
      style={{
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)',
      }}
    >
      <FilmGrain />

      {/* Minimal top header */}
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
            <HoverLink
              href="/delete"
              {...getPreloadHandlers('delete')}
              onClick={(e) => {
                e.preventDefault();
                onOpenDelete();
              }}
              className="hidden md:inline-flex uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              /delete
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
        aria-label="Generative art playground"
        className="flex-1 editorial-shell py-8 sm:py-12"
      >
        {/* Title & caption strip */}
        <div
          data-legacy-title-block="true"
          className="pb-7 mb-8 border-b flex flex-col md:flex-row md:items-end md:justify-between gap-4"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div>
            <p
              className="m-0 mb-2 font-mono uppercase tracking-[var(--tracking-micro)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-accent)',
              }}
            >
              /playground · Canvas 2D Sketchbook
            </p>
            <h1
              className="m-0 font-display font-normal"
              style={{
                fontSize: 'clamp(2.35rem, 5.4vw, 4.5rem)',
                lineHeight: 0.94,
                letterSpacing: 'var(--tracking-display)',
                color: 'var(--color-text)',
              }}
            >
              Generative <span className="italic">Playground</span>
              <span style={{ color: 'var(--color-accent)' }}>.</span>
            </h1>
          </div>

          <p
            className="m-0 font-display italic"
            style={{
              fontSize: 'clamp(1.25rem, 2vw, 1.65rem)',
              lineHeight: 1.2,
              color: 'var(--color-text-secondary)',
            }}
          >
            play with purpose, and play for play
          </p>
        </div>

        {/* Main 2-column studio: Canvas + Code (left) & Controls (desktop sidebar / mobile bottom sheet) */}
        <div className="cq-playground grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start pb-20 lg:pb-0">
          {/* Left Column: Canvas, Action Bar, Editable Live Code */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6 min-w-0">
            <PlaygroundCanvas
              ref={canvasHandleRef}
              settings={settings}
              drawFn={compiledFn}
              playing={playing}
              isMobile={isMobile}
              onRuntimeError={setRuntimeError}
            />

            {/* Action buttons bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 font-mono">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleRandomize}
                  className="px-3.5 py-2 border uppercase tracking-[var(--tracking-micro)] transition-colors cursor-pointer"
                  style={{
                    fontSize: 'var(--text-micro)',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'var(--color-accent)',
                    borderColor: 'var(--color-accent)',
                    color: 'var(--color-accent-ink)',
                  }}
                >
                  randomize
                </button>

                <button
                  type="button"
                  onClick={handleSavePng}
                  className="px-3.5 py-2 border uppercase tracking-[var(--tracking-micro)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer"
                  style={{
                    fontSize: 'var(--text-micro)',
                    borderRadius: 'var(--radius-xs)',
                    borderColor: 'var(--color-border-strong)',
                    color: 'var(--color-text)',
                  }}
                >
                  save png
                </button>

                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="px-3.5 py-2 border uppercase tracking-[var(--tracking-micro)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer"
                  style={{
                    fontSize: 'var(--text-micro)',
                    borderRadius: 'var(--radius-xs)',
                    borderColor: copiedLink
                      ? '#6ec49c'
                      : 'var(--color-border-strong)',
                    color: copiedLink ? '#6ec49c' : 'var(--color-text)',
                  }}
                >
                  {copiedLink ? 'link copied ✓' : 'copy link'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setPlaying((prev) => !prev)}
                aria-pressed={playing}
                className="px-3 py-2 border uppercase tracking-[var(--tracking-micro)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer"
                style={{
                  fontSize: 'var(--text-micro)',
                  borderRadius: 'var(--radius-xs)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {playing ? 'pause' : 'play'}
              </button>
            </div>

            {/* Editable Live Code Panel */}
            <div
              className="border overflow-hidden"
              style={{
                borderColor: activeError
                  ? 'var(--color-status-error)'
                  : 'var(--color-border-strong)',
                backgroundColor: 'var(--color-bg-deep)',
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
                <div className="flex flex-wrap items-center gap-3">
                  <span style={{ color: 'var(--color-text)' }}>
                    drawFrame(ctx, state)
                  </span>
                  <span
                    className="hidden sm:inline"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    · {liveParamBanner}
                  </span>
                </div>

                {codeIsModified && (
                  <button
                    type="button"
                    onClick={() => setCode(DEFAULT_PLAYGROUND_CODE)}
                    className="uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)] cursor-pointer"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    reset code
                  </button>
                )}
              </div>

              <label htmlFor="playground-code-editor" className="sr-only">
                Live canvas drawing code editor
              </label>
              <textarea
                id="playground-code-editor"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                rows={16}
                data-lenis-prevent
                className="block w-full resize-y bg-transparent p-4 font-mono text-[var(--color-text)] focus:outline-none"
                style={{
                  fontSize: 'clamp(0.74rem, 0.3vw + 0.62rem, 0.82rem)',
                  lineHeight: 1.65,
                  tabSize: 2,
                }}
              />

              {/* Inline error / healthy status strip */}
              <div
                role={activeError ? 'alert' : 'status'}
                aria-live="polite"
                className="px-4 py-2.5 border-t font-mono"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: activeError
                    ? 'rgba(244, 114, 107, 0.12)'
                    : 'var(--color-bg)',
                  fontSize: 'var(--text-micro)',
                  color: activeError ? '#f4726b' : 'var(--color-text-muted)',
                }}
              >
                {activeError
                  ? `✗ ${activeError} (previous frame held until fixed)`
                  : '✓ live · edits re-run automatically after 320ms'}
              </div>
            </div>
          </div>

          {/* Right Column on lg+ / Bottom Sheet Drawer on Mobile */}
          <aside
            aria-label="Generative art controls"
            data-testid="playground-controls-sheet"
            data-sheet-open={mobileSheetOpen ? 'true' : 'false'}
            className="fixed inset-x-0 bottom-0 z-30 border-t lg:static lg:z-auto lg:col-span-5 xl:col-span-4 lg:border lg:sticky lg:top-24"
            style={{
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              borderColor: 'var(--color-border-strong)',
              backgroundColor: 'var(--color-bg-elevated)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {/* Mobile bottom sheet toggle handle (hidden on lg+) */}
            <button
              type="button"
              data-testid="playground-sheet-toggle"
              aria-expanded={mobileSheetOpen}
              onClick={() => setMobileSheetOpen((prev) => !prev)}
              onTouchStart={(e) => {
                sheetTouchStartYRef.current = e.touches[0]?.clientY ?? null;
              }}
              onTouchEnd={(e) => {
                if (sheetTouchStartYRef.current === null) return;
                const endY =
                  e.changedTouches[0]?.clientY ?? sheetTouchStartYRef.current;
                const delta = endY - sheetTouchStartYRef.current;
                sheetTouchStartYRef.current = null;
                if (delta > 36) setMobileSheetOpen(false);
                else if (delta < -36) setMobileSheetOpen(true);
              }}
              className="touch-target lg:hidden w-full min-h-[48px] px-4 py-3 flex items-center justify-between gap-3 font-mono uppercase tracking-[var(--tracking-micro)] cursor-pointer border-b"
              style={{
                fontSize: 'var(--text-micro)',
                borderColor: mobileSheetOpen
                  ? 'var(--color-border)'
                  : 'transparent',
                color: 'var(--color-text)',
              }}
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                />
                <span>
                  Controls · {settings.shape} · {effectiveCount} pcs
                </span>
              </span>
              <span style={{ color: 'var(--color-accent)' }}>
                {mobileSheetOpen ? 'close ↓' : 'open ↑'}
              </span>
            </button>

            <div
              data-testid="playground-controls-body"
              className={`${
                mobileSheetOpen ? 'block max-h-[62dvh] overflow-y-auto' : 'hidden lg:block'
              } p-5 sm:p-6 space-y-7`}
            >
            {/* Shape selector */}
            <div>
              <p
                className="m-0 mb-3 font-mono uppercase tracking-[var(--tracking-micro)]"
                style={{
                  fontSize: 'var(--text-micro)',
                  color: 'var(--color-text-muted)',
                }}
              >
                Shape
              </p>
              <div
                role="group"
                aria-label="Primitive shape"
                className="grid grid-cols-4 gap-2 font-mono"
              >
                {PLAYGROUND_SHAPES.map((shape) => {
                  const active = settings.shape === shape;
                  return (
                    <button
                      key={shape}
                      type="button"
                      onClick={() => updateSetting('shape', shape)}
                      aria-pressed={active}
                      className="py-2 border uppercase tracking-[var(--tracking-micro)] transition-colors cursor-pointer"
                      style={{
                        fontSize: 'var(--text-micro)',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: active
                          ? 'var(--color-accent)'
                          : 'transparent',
                        borderColor: active
                          ? 'var(--color-accent)'
                          : 'var(--color-border)',
                        color: active
                          ? 'var(--color-accent-ink)'
                          : 'var(--color-text-secondary)',
                      }}
                    >
                      {shape}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Count slider (capped on mobile) */}
            <div>
              <div className="flex items-baseline justify-between mb-2 font-mono">
                <label
                  htmlFor="control-count"
                  className="uppercase tracking-[var(--tracking-micro)]"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Count {isMobile ? `(max ${MOBILE_MAX_COUNT})` : ''}
                </label>
                <span
                  className="tabular-nums"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: 'var(--color-text)',
                  }}
                >
                  {effectiveCount}
                </span>
              </div>
              <input
                id="control-count"
                type="range"
                min={16}
                max={maxCount}
                step={2}
                value={effectiveCount}
                onChange={(e) => updateSetting('count', Number(e.target.value))}
                className="w-full cursor-pointer"
                style={{ accentColor: 'var(--color-accent)' }}
              />
            </div>

            {/* Noise scale slider */}
            <div>
              <div className="flex items-baseline justify-between mb-2 font-mono">
                <label
                  htmlFor="control-noise"
                  className="uppercase tracking-[var(--tracking-micro)]"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Noise Scale
                </label>
                <span
                  className="tabular-nums"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: 'var(--color-text)',
                  }}
                >
                  {settings.noiseScale.toFixed(4)}
                </span>
              </div>
              <input
                id="control-noise"
                type="range"
                min={0.002}
                max={0.025}
                step={0.0005}
                value={settings.noiseScale}
                onChange={(e) =>
                  updateSetting('noiseScale', Number(e.target.value))
                }
                className="w-full cursor-pointer"
                style={{ accentColor: 'var(--color-accent)' }}
              />
            </div>

            {/* Speed slider */}
            <div>
              <div className="flex items-baseline justify-between mb-2 font-mono">
                <label
                  htmlFor="control-speed"
                  className="uppercase tracking-[var(--tracking-micro)]"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Speed
                </label>
                <span
                  className="tabular-nums"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: 'var(--color-text)',
                  }}
                >
                  {settings.speed.toFixed(2)}×
                </span>
              </div>
              <input
                id="control-speed"
                type="range"
                min={0.1}
                max={2.5}
                step={0.05}
                value={settings.speed}
                onChange={(e) => updateSetting('speed', Number(e.target.value))}
                className="w-full cursor-pointer"
                style={{ accentColor: 'var(--color-accent)' }}
              />
            </div>

            {/* 4 Site-matched Palette presets */}
            <div>
              <p
                className="m-0 mb-3 font-mono uppercase tracking-[var(--tracking-micro)]"
                style={{
                  fontSize: 'var(--text-micro)',
                  color: 'var(--color-text-muted)',
                }}
              >
                Palette
              </p>
              <div
                role="group"
                aria-label="Color palette presets"
                className="grid grid-cols-2 gap-2.5"
              >
                {PLAYGROUND_PALETTE_LIST.map((preset) => {
                  const active = settings.palette === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => updateSetting('palette', preset.id)}
                      aria-pressed={active}
                      className="p-2.5 border text-left transition-colors cursor-pointer"
                      style={{
                        borderRadius: 'var(--radius-xs)',
                        borderColor: active
                          ? 'var(--color-accent)'
                          : 'var(--color-border)',
                        backgroundColor: active
                          ? 'var(--color-bg-deep)'
                          : 'transparent',
                      }}
                    >
                      <span
                        className="block mb-2 font-mono uppercase tracking-[var(--tracking-micro)]"
                        style={{
                          fontSize: 'var(--text-micro)',
                          color: active
                            ? 'var(--color-text)'
                            : 'var(--color-text-secondary)',
                        }}
                      >
                        {preset.label}
                      </span>
                      <span className="flex items-center gap-1.5" aria-hidden="true">
                        {preset.colors.map((hex) => (
                          <span
                            key={hex}
                            className="h-2.5 flex-1 rounded-[1px]"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Symmetry toggle */}
            <div
              className="pt-5 border-t flex items-center justify-between gap-4 font-mono"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div>
                <p
                  className="m-0 uppercase tracking-[var(--tracking-micro)]"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: 'var(--color-text)',
                  }}
                >
                  Symmetry
                </p>
                <p
                  className="m-0 mt-0.5"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  4-way mirror reflection
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={settings.symmetry}
                onClick={() => updateSetting('symmetry', !settings.symmetry)}
                className="px-3.5 py-1.5 border uppercase tracking-[var(--tracking-micro)] transition-colors cursor-pointer"
                style={{
                  fontSize: 'var(--text-micro)',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: settings.symmetry
                    ? 'var(--color-accent)'
                    : 'transparent',
                  borderColor: settings.symmetry
                    ? 'var(--color-accent)'
                    : 'var(--color-border-strong)',
                  color: settings.symmetry
                    ? 'var(--color-accent-ink)'
                    : 'var(--color-text-secondary)',
                }}
              >
                {settings.symmetry ? 'on' : 'off'}
              </button>
            </div>

            {/* Seed metadata footer */}
            <div
              className="pt-4 border-t flex items-center justify-between font-mono"
              style={{
                borderColor: 'var(--color-border)',
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-muted)',
              }}
            >
              <span>seed #{settings.seed}</span>
              <span>pauses off-screen</span>
            </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
