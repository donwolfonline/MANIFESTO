import { useMemo, useState, type FormEvent } from 'react';
import {
  buildCodeReviewVerdict,
  evaluateCustomIdentifier,
  evaluatePresetOption,
  formatShareableVerdict,
  getReadabilityLabel,
  NAMING_ROUNDS,
  previewRenamedCode,
  type NamingOption,
  type RoundEvaluation,
} from '../data/namingGame';
import type { ManifestoMeta } from '../lib/markdown';
import { getPreloadHandlers } from '../lib/routePreload';
import { usePrefersReducedMotion } from '../lib/useViewportActivity';
import { FilmGrain } from './FilmGrain';
import { HoverLink } from './HoverLink';

export interface NamingPageProps {
  meta: ManifestoMeta;
  onNavigateHome: (section?: string) => void;
  onOpenTerminal: () => void;
  onOpenDelete?: () => void;
}

export function NamingPage({
  meta,
  onNavigateHome,
  onOpenTerminal,
  onOpenDelete,
}: NamingPageProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  const [roundIdx, setRoundIdx] = useState<number>(0);
  const [evaluations, setEvaluations] = useState<RoundEvaluation[]>([]);
  const [customInput, setCustomInput] = useState<string>('');
  const [customError, setCustomError] = useState<string | null>(null);
  const [finished, setFinished] = useState<boolean>(false);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);

  const currentRound = NAMING_ROUNDS[roundIdx] ?? NAMING_ROUNDS[0];
  const currentEvaluation = evaluations[roundIdx] ?? null;

  const runningScore = useMemo(
    () => evaluations.filter((e) => e.earnedPoint).length,
    [evaluations],
  );

  // Readability meter value: starts at baselineReadability, animates to chosen readability on answer
  const meterScore = currentEvaluation
    ? currentEvaluation.readability
    : currentRound.baselineReadability;
  const meterMeta = getReadabilityLabel(meterScore);

  const displayedCode = useMemo(() => {
    if (!currentEvaluation) return currentRound.code;
    return previewRenamedCode(currentRound, currentEvaluation.chosenName);
  }, [currentRound, currentEvaluation]);

  const recordEvaluation = (evaluation: RoundEvaluation) => {
    setEvaluations((prev) => {
      const next = [...prev];
      next[roundIdx] = evaluation;
      return next;
    });
  };

  const handlePickPreset = (optionId: NamingOption['id']) => {
    if (currentEvaluation) return;
    setCustomError(null);
    const evaluation = evaluatePresetOption(currentRound, optionId);
    recordEvaluation(evaluation);
  };

  const handleSubmitCustom = (event: FormEvent) => {
    event.preventDefault();
    if (currentEvaluation) return;
    setCustomError(null);

    const res = evaluateCustomIdentifier(currentRound, customInput);
    if (!res.ok || !res.evaluation) {
      setCustomError(res.error ?? 'Please enter a valid identifier.');
      return;
    }
    recordEvaluation(res.evaluation);
  };

  const handleNextRound = () => {
    setCustomInput('');
    setCustomError(null);
    if (roundIdx + 1 >= NAMING_ROUNDS.length) {
      setFinished(true);
    } else {
      setRoundIdx((prev) => prev + 1);
    }
  };

  const handleRestart = () => {
    setRoundIdx(0);
    setEvaluations([]);
    setCustomInput('');
    setCustomError(null);
    setFinished(false);
    setCopiedShare(false);
  };

  const verdict = useMemo(
    () => buildCodeReviewVerdict(evaluations, NAMING_ROUNDS.length),
    [evaluations],
  );

  const handleShareVerdict = async () => {
    const shareText = formatShareableVerdict(verdict, evaluations);
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedShare(true);
      window.setTimeout(() => setCopiedShare(false), 2400);
    } catch {
      setCopiedShare(false);
    }
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

      {/* Minimal sticky header */}
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

          <div className="flex items-center gap-5 sm:gap-7">
            {onOpenDelete && (
              <HoverLink
                href="/delete"
                {...getPreloadHandlers('delete')}
                onClick={(e) => {
                  e.preventDefault();
                  onOpenDelete();
                }}
                className="hidden sm:inline-flex uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
                style={{
                  fontSize: 'var(--text-micro)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                /delete
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
        aria-label="Naming things game"
        className="flex-1 editorial-shell py-8 sm:py-14"
      >
        <div className="max-w-4xl mx-auto space-y-10">
          {/* Page Title & Score Strip */}
          <div
            className="pb-6 border-b flex flex-col sm:flex-row sm:items-end justify-between gap-4"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div data-legacy-title-block="true">
              <p
                className="m-0 mb-1.5 font-mono uppercase tracking-[var(--tracking-micro)]"
                style={{
                  fontSize: 'var(--text-micro)',
                  color: 'var(--color-accent)',
                }}
              >
                /naming · Principle #02 Field Drill
              </p>
              <h1
                className="m-0 font-display font-normal"
                style={{
                  fontSize: 'clamp(2.25rem, 5.2vw, 4.25rem)',
                  lineHeight: 0.96,
                  letterSpacing: 'var(--tracking-display)',
                  color: 'var(--color-text)',
                }}
              >
                Name Things for <span className="italic">2am</span>
                <span style={{ color: 'var(--color-accent)' }}>.</span>
              </h1>
            </div>

            <div
              className="font-mono uppercase tracking-[var(--tracking-micro)] flex items-center gap-4"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <span>
                round {String(roundIdx + 1).padStart(2, '0')} /{' '}
                {String(NAMING_ROUNDS.length).padStart(2, '0')}
              </span>
              <span aria-hidden="true" style={{ color: 'var(--color-accent)' }}>
                ·
              </span>
              <span className="tabular-nums">
                score: {runningScore} / {evaluations.length}
              </span>
            </div>
          </div>

          {/* 10-Round Progress Bar */}
          <div
            role="region"
            aria-label="Round progress"
            className="grid grid-cols-10 gap-1.5"
          >
            {NAMING_ROUNDS.map((round, idx) => {
              const ev = evaluations[idx];
              const isCurrent = !finished && idx === roundIdx;
              const bg = ev
                ? ev.earnedPoint
                  ? 'var(--color-status-ok)'
                  : 'var(--color-status-error)'
                : isCurrent
                  ? 'var(--color-accent)'
                  : 'var(--color-border)';
              return (
                <div
                  key={round.id}
                  className="h-1.5 rounded-[1px] transition-colors"
                  style={{ backgroundColor: bg }}
                  title={`Round ${round.number}: ${round.title}`}
                />
              );
            })}
          </div>

          {!finished ? (
            /* Active Round Card */
            <section
              aria-label={`Round ${currentRound.number}: ${currentRound.title}`}
              className="border p-6 sm:p-9 space-y-8"
              style={{
                borderColor: 'var(--color-border-strong)',
                backgroundColor: 'var(--color-bg-elevated)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {/* Round Header */}
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div className="space-y-1">
                  <span
                    className="font-mono uppercase tracking-[var(--tracking-micro)]"
                    style={{
                      fontSize: 'var(--text-micro)',
                      color: 'var(--color-accent)',
                    }}
                  >
                    Round {String(currentRound.number).padStart(2, '0')} ·{' '}
                    {currentRound.kind}
                  </span>
                  <h2
                    className="m-0 font-display font-normal"
                    style={{
                      fontSize: 'clamp(1.6rem, 3.2vw, 2.35rem)',
                      lineHeight: 1.05,
                      color: 'var(--color-text)',
                    }}
                  >
                    {currentRound.title}
                  </h2>
                </div>

                <div
                  className="px-3 py-1 border font-mono"
                  style={{
                    fontSize: 'var(--text-micro)',
                    borderColor: 'var(--color-border-strong)',
                    backgroundColor: 'var(--color-bg-deep)',
                    borderRadius: 'var(--radius-xs)',
                  }}
                >
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    suspect identifier:{' '}
                  </span>
                  <code style={{ color: 'var(--color-status-error)' }}>{currentRound.badName}</code>
                </div>
              </div>

              {/* Code Snippet Box */}
              <div
                className="border overflow-hidden font-mono"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-bg-deep)',
                  borderRadius: 'var(--radius-xs)',
                }}
              >
                <div
                  className="px-4 py-2 border-b flex items-center justify-between gap-3"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-bg)',
                    fontSize: 'var(--text-micro)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <span>{currentRound.filename}</span>
                  <span>
                    {currentEvaluation
                      ? `renamed: ${currentRound.badName} → ${currentEvaluation.chosenName}`
                      : `replace "${currentRound.badName}"`}
                  </span>
                </div>
                <pre
                  tabIndex={0}
                  role="region"
                  aria-label={`Code snippet from ${currentRound.filename}`}
                  className="m-0 p-4 sm:p-5 overflow-x-auto"
                  style={{
                    fontSize: 'clamp(0.76rem, 0.35vw + 0.65rem, 0.86rem)',
                    lineHeight: 1.65,
                    color: 'var(--color-text)',
                  }}
                >
                  <code>{displayedCode}</code>
                </pre>
              </div>

              {/* Animated 2am Readability Meter */}
              <div
                aria-label="2am readability meter"
                className="p-4 border space-y-2.5 font-mono"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-bg)',
                  borderRadius: 'var(--radius-xs)',
                }}
              >
                <div
                  className="flex flex-wrap items-center justify-between gap-2"
                  style={{ fontSize: 'var(--text-micro)' }}
                >
                  <span
                    className="uppercase tracking-[var(--tracking-micro)]"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    2am readability meter
                  </span>
                  <span
                    className="tabular-nums"
                    style={{ color: meterMeta.color }}
                  >
                    {meterScore}% · {meterMeta.label}
                  </span>
                </div>

                <div
                  className="h-2.5 w-full overflow-hidden"
                  style={{
                    backgroundColor: 'rgba(242, 238, 232, 0.08)',
                    borderRadius: 'var(--radius-xs)',
                  }}
                >
                  <div
                    data-testid="readability-meter-bar"
                    className="h-full"
                    style={{
                      width: `${meterScore}%`,
                      backgroundColor: meterMeta.color,
                      transition: prefersReducedMotion
                        ? undefined
                        : 'width 650ms cubic-bezier(0.22, 1, 0.36, 1), background-color 450ms ease',
                    }}
                  />
                </div>
              </div>

              {/* 4 Preset Identifier Options */}
              <div className="space-y-3">
                <p
                  className="m-0 font-mono uppercase tracking-[var(--tracking-micro)]"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Pick the clearest name (or type your own below)
                </p>

                <div
                  role="group"
                  aria-label="Identifier choices"
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  {currentRound.options.map((option) => {
                    const isSelected =
                      currentEvaluation?.selectedOptionId === option.id;
                    const showVerdict = Boolean(currentEvaluation);

                    let borderColor = 'var(--color-border-strong)';
                    if (showVerdict) {
                      if (option.isBest) borderColor = 'var(--color-status-ok)';
                      else if (isSelected) borderColor = 'var(--color-status-error)';
                    }

                    return (
                      <button
                        key={option.id}
                        type="button"
                        disabled={showVerdict}
                        onClick={() => handlePickPreset(option.id)}
                        className="p-4 border text-left transition-colors cursor-pointer disabled:cursor-default space-y-2"
                        style={{
                          borderColor,
                          backgroundColor: isSelected
                            ? 'var(--color-bg)'
                            : 'var(--color-bg-deep)',
                          borderRadius: 'var(--radius-xs)',
                        }}
                      >
                        <div className="flex items-center justify-between gap-2 font-mono">
                          <span
                            style={{
                              fontSize: 'var(--text-meta)',
                              color:
                                showVerdict && option.isBest
                                  ? 'var(--color-status-ok)'
                                  : 'var(--color-text)',
                            }}
                          >
                            <code>{option.name}</code>
                          </span>
                          <span
                            className="uppercase"
                            style={{
                              fontSize: 'var(--text-micro)',
                              color:
                                showVerdict && option.isBest
                                  ? 'var(--color-status-ok)'
                                  : 'var(--color-text-muted)',
                            }}
                          >
                            {showVerdict
                              ? option.isBest
                                ? '✓ best · ' + option.readability + '%'
                                : option.readability + '%'
                              : `option ${option.id.toUpperCase()}`}
                          </span>
                        </div>

                        {/* One-sentence reasoning revealed for every option after answering */}
                        {showVerdict && (
                          <p
                            className="m-0 pt-2 border-t font-body"
                            style={{
                              borderColor: 'var(--color-border)',
                              fontSize: 'var(--text-meta)',
                              lineHeight: 1.55,
                              color: 'var(--color-text-secondary)',
                            }}
                          >
                            {option.reasoning}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Identifier Input Form */}
              {!currentEvaluation && (
                <form
                  onSubmit={handleSubmitCustom}
                  className="pt-4 border-t space-y-2.5 font-mono"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <label
                    htmlFor="custom-identifier-input"
                    className="block uppercase tracking-[var(--tracking-micro)]"
                    style={{
                      fontSize: 'var(--text-micro)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    Or type your own identifier
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      id="custom-identifier-input"
                      type="text"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder={`Rename "${currentRound.badName}" to…`}
                      spellCheck={false}
                      autoComplete="off"
                      className="flex-1 px-3.5 py-2 border font-mono bg-transparent focus:outline-none"
                      style={{
                        fontSize: 'var(--text-meta)',
                        borderColor: 'var(--color-border-strong)',
                        color: 'var(--color-text)',
                        borderRadius: 'var(--radius-xs)',
                      }}
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 border uppercase tracking-[var(--tracking-micro)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer shrink-0"
                      style={{
                        fontSize: 'var(--text-micro)',
                        borderColor: 'var(--color-border-strong)',
                        color: 'var(--color-text)',
                        borderRadius: 'var(--radius-xs)',
                      }}
                    >
                      submit custom name
                    </button>
                  </div>
                  {customError && (
                    <p
                      role="alert"
                      className="m-0"
                      style={{ fontSize: 'var(--text-micro)', color: 'var(--color-status-error)' }}
                    >
                      {customError}
                    </p>
                  )}
                </form>
              )}

              {/* Round Verdict Banner + Next Round Button */}
              {currentEvaluation && (
                <div
                  role="status"
                  aria-live="polite"
                  className="p-5 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 panel-enter"
                  style={{
                    borderColor: currentEvaluation.earnedPoint
                      ? 'var(--color-status-ok)'
                      : 'var(--color-border-strong)',
                    backgroundColor: 'var(--color-bg)',
                    borderRadius: 'var(--radius-xs)',
                  }}
                >
                  <div className="space-y-1">
                    <p
                      className="m-0 font-mono uppercase tracking-[var(--tracking-micro)]"
                      style={{
                        fontSize: 'var(--text-micro)',
                        color: currentEvaluation.earnedPoint
                          ? 'var(--color-status-ok)'
                          : 'var(--color-status-warn)',
                      }}
                    >
                      {currentEvaluation.earnedPoint
                        ? `✓ +1 clarity point · ${currentEvaluation.chosenName}`
                        : `• best choice: ${currentEvaluation.bestOption.name} (you picked ${currentEvaluation.chosenName})`}
                    </p>
                    <p
                      className="m-0 font-body"
                      style={{
                        fontSize: 'var(--text-meta)',
                        lineHeight: 1.55,
                        color: 'var(--color-text)',
                      }}
                    >
                      {currentEvaluation.reasoning}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleNextRound}
                    className="px-5 py-2.5 border font-mono uppercase tracking-[var(--tracking-micro)] cursor-pointer shrink-0"
                    style={{
                      fontSize: 'var(--text-micro)',
                      backgroundColor: 'var(--color-accent)',
                      borderColor: 'var(--color-accent)',
                      color: 'var(--color-accent-ink)',
                      borderRadius: 'var(--radius-xs)',
                    }}
                  >
                    {roundIdx + 1 >= NAMING_ROUNDS.length
                      ? 'view code-review verdict →'
                      : 'next round →'}
                  </button>
                </div>
              )}
            </section>
          ) : (
            /* Final Code-Review Verdict Card */
            <section
              aria-label="Code review verdict"
              className="border p-7 sm:p-11 space-y-8 panel-enter"
              style={{
                borderColor: 'var(--color-border-strong)',
                backgroundColor: 'var(--color-bg-elevated)',
                borderRadius: 'var(--radius-sm)',
                borderTop: `4px solid ${verdict.badgeColor}`,
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-4 font-mono">
                <span
                  className="px-3 py-1 border uppercase tracking-[var(--tracking-micro)]"
                  style={{
                    fontSize: 'var(--text-micro)',
                    borderColor: verdict.badgeColor,
                    color: verdict.badgeColor,
                    borderRadius: 'var(--radius-xs)',
                  }}
                >
                  pull request review · {verdict.status}
                </span>

                <span
                  className="tabular-nums"
                  style={{
                    fontSize: 'var(--text-meta)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {verdict.score} / {verdict.total} rounds ·{' '}
                  {verdict.averageReadability}% avg readability
                </span>
              </div>

              <div className="space-y-3">
                <h2
                  className="m-0 font-display font-normal"
                  style={{
                    fontSize: 'clamp(2rem, 4.5vw, 3.35rem)',
                    lineHeight: 1.02,
                    color: 'var(--color-text)',
                  }}
                >
                  {verdict.headline}
                </h2>
                <p
                  className="m-0 font-body"
                  style={{
                    maxWidth: '58ch',
                    fontSize: 'var(--text-lead)',
                    lineHeight: 'var(--leading-lead)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {verdict.summary}
                </p>
              </div>

              {/* Per-round diff recap */}
              <div
                className="border overflow-hidden font-mono"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-bg-deep)',
                  borderRadius: 'var(--radius-xs)',
                }}
              >
                <div
                  className="px-4 py-2.5 border-b uppercase tracking-[var(--tracking-micro)]"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-bg)',
                    fontSize: 'var(--text-micro)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Diff summary (10 files reviewed)
                </div>
                <ul className="m-0 p-0 list-none divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {NAMING_ROUNDS.map((round, idx) => {
                    const ev = evaluations[idx];
                    return (
                      <li
                        key={round.id}
                        className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3"
                        style={{
                          fontSize: 'var(--text-micro)',
                          borderColor: 'var(--color-border)',
                        }}
                      >
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span style={{ color: 'var(--color-text-muted)' }}>
                            {String(round.number).padStart(2, '0')}
                          </span>
                          <code style={{ color: 'var(--color-status-error)' }}>
                            -{round.badName}
                          </code>
                          <span style={{ color: 'var(--color-text-muted)' }}>
                            →
                          </span>
                          <code
                            style={{
                              color: ev?.earnedPoint ? 'var(--color-status-ok)' : 'var(--color-status-warn)',
                            }}
                          >
                            +{ev?.chosenName ?? round.badName}
                          </code>
                        </div>
                        <span
                          className="tabular-nums"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          {ev?.readability ?? round.baselineReadability}%
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Share Verdict & Play Again */}
              <div className="flex flex-wrap items-center justify-between gap-4 font-mono">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleShareVerdict}
                    className="px-5 py-2.5 border uppercase tracking-[var(--tracking-micro)] cursor-pointer"
                    style={{
                      fontSize: 'var(--text-micro)',
                      backgroundColor: 'var(--color-accent)',
                      borderColor: 'var(--color-accent)',
                      color: 'var(--color-accent-ink)',
                      borderRadius: 'var(--radius-xs)',
                    }}
                  >
                    {copiedShare ? 'verdict copied ✓' : 'share review verdict'}
                  </button>

                  <button
                    type="button"
                    onClick={handleRestart}
                    className="px-4 py-2.5 border uppercase tracking-[var(--tracking-micro)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer"
                    style={{
                      fontSize: 'var(--text-micro)',
                      borderColor: 'var(--color-border-strong)',
                      color: 'var(--color-text)',
                      borderRadius: 'var(--radius-xs)',
                    }}
                  >
                    play again
                  </button>
                </div>

                {copiedShare && (
                  <span
                    role="status"
                    aria-live="polite"
                    style={{ fontSize: 'var(--text-micro)', color: 'var(--color-status-ok)' }}
                  >
                    Copied scorecard to clipboard ✓
                  </span>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
