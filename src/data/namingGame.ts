import rawRounds from './namingRounds.json';

export type IdentifierKind = 'variable' | 'function' | 'boolean' | 'constant';

export interface NamingOption {
  id: 'a' | 'b' | 'c' | 'd';
  name: string;
  isBest: boolean;
  readability: number;
  reasoning: string;
}

export interface NamingRound {
  id: string;
  number: number;
  title: string;
  filename: string;
  badName: string;
  kind: IdentifierKind;
  baselineReadability: number;
  code: string;
  acceptedKeywords: string[];
  options: [NamingOption, NamingOption, NamingOption, NamingOption];
}

export interface RoundEvaluation {
  roundNumber: number;
  chosenName: string;
  source: 'preset' | 'custom';
  selectedOptionId?: NamingOption['id'];
  earnedPoint: boolean;
  readability: number;
  reasoning: string;
  bestOption: NamingOption;
}

export interface CodeReviewVerdict {
  status:
    | 'APPROVED · LGTM'
    | 'APPROVED WITH MINOR NITS'
    | 'COMMENTED · NEEDS CLARITY PASS'
    | 'CHANGES REQUESTED';
  badgeColor: string;
  headline: string;
  summary: string;
  score: number;
  total: number;
  averageReadability: number;
}

export const NAMING_ROUNDS: NamingRound[] = rawRounds.map((round) => ({
  ...round,
  kind: round.kind as IdentifierKind,
  options: round.options.map((opt) => ({
    ...opt,
    id: opt.id as NamingOption['id'],
    name: opt.name.trim(),
  })) as [NamingOption, NamingOption, NamingOption, NamingOption],
}));

const VALID_IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export function getBestOption(round: NamingRound): NamingOption {
  return round.options.find((opt) => opt.isBest) ?? round.options[0];
}

/**
 * Replaces the bad identifier in a round's code snippet with a chosen identifier
 * on whole-word boundaries so visitors can see their rename live in context.
 */
export function previewRenamedCode(
  round: NamingRound,
  replacementName: string,
): string {
  const clean = replacementName.trim();
  if (!clean) return round.code;
  const escaped = round.badName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const wordRegex = new RegExp(`\\b${escaped}\\b`, 'g');
  return round.code.replace(wordRegex, clean);
}

export function evaluatePresetOption(
  round: NamingRound,
  optionId: NamingOption['id'],
): RoundEvaluation {
  const bestOption = getBestOption(round);
  const chosen =
    round.options.find((opt) => opt.id === optionId) ?? round.options[0];

  return {
    roundNumber: round.number,
    chosenName: chosen.name,
    source: 'preset',
    selectedOptionId: chosen.id,
    earnedPoint: chosen.isBest,
    readability: chosen.readability,
    reasoning: chosen.reasoning,
    bestOption,
  };
}

/**
 * Evaluates a custom user-typed identifier against the round's domain keywords,
 * syntax rules, and preset options, returning a one-sentence reasoning and readability score.
 */
export function evaluateCustomIdentifier(
  round: NamingRound,
  rawName: string,
): { ok: boolean; error?: string; evaluation?: RoundEvaluation } {
  const trimmed = rawName.trim();
  if (!trimmed) {
    return { ok: false, error: 'Type an identifier first (or pick one of the 4 options).' };
  }
  if (!VALID_IDENTIFIER_RE.test(trimmed)) {
    return {
      ok: false,
      error:
        'Use a valid JavaScript/TypeScript identifier (letters, digits, _, or $, no spaces).',
    };
  }
  if (trimmed.length > 48) {
    return {
      ok: false,
      error: 'Keep the identifier under 48 characters so call sites stay readable.',
    };
  }

  const bestOption = getBestOption(round);

  // Check if the custom entry matches one of the 4 options
  const matchedOption = round.options.find(
    (opt) => opt.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (matchedOption) {
    return {
      ok: true,
      evaluation: {
        roundNumber: round.number,
        chosenName: trimmed,
        source: 'custom',
        selectedOptionId: matchedOption.id,
        earnedPoint: matchedOption.isBest,
        readability: matchedOption.readability,
        reasoning: matchedOption.reasoning,
        bestOption,
      },
    };
  }

  const lower = trimmed.toLowerCase();
  const matchedKeywords = round.acceptedKeywords.filter((kw) =>
    lower.includes(kw.toLowerCase()),
  );

  if (matchedKeywords.length >= 2 || (matchedKeywords.length >= 1 && trimmed.length >= 12)) {
    const readability = Math.min(96, 86 + matchedKeywords.length * 4);
    return {
      ok: true,
      evaluation: {
        roundNumber: round.number,
        chosenName: trimmed,
        source: 'custom',
        earnedPoint: true,
        readability,
        reasoning: `"${trimmed}" captures the domain intent (${matchedKeywords.slice(0, 3).join(', ')}) clearly enough for a 2am reader without extra comments.`,
        bestOption,
      },
    };
  }

  if (matchedKeywords.length === 1 && trimmed.length >= 6) {
    return {
      ok: true,
      evaluation: {
        roundNumber: round.number,
        chosenName: trimmed,
        source: 'custom',
        earnedPoint: false,
        readability: 64,
        reasoning: `"${trimmed}" hints at "${matchedKeywords[0]}", but "${bestOption.name}" is more explicit about the exact unit, side effect, or boundary.`,
        bestOption,
      },
    };
  }

  return {
    ok: true,
    evaluation: {
      roundNumber: round.number,
      chosenName: trimmed,
      source: 'custom',
      earnedPoint: false,
      readability: Math.max(round.baselineReadability, 28),
      reasoning: `"${trimmed}" still leaves the 2am reader guessing the domain rule or unit compared to "${bestOption.name}".`,
      bestOption,
    },
  };
}

export function getReadabilityLabel(score: number): {
  label: string;
  color: string;
} {
  if (score >= 88) {
    return { label: 'Self-explanatory at 2am', color: 'var(--color-status-ok)' };
  }
  if (score >= 58) {
    return {
      label: 'Passable, but leaves room for a bug',
      color: 'var(--color-status-warn)',
    };
  }
  return {
    label: '2am pager trap — requires archaeology',
    color: 'var(--color-status-error)',
  };
}

export function buildCodeReviewVerdict(
  evaluations: RoundEvaluation[],
  totalRounds = NAMING_ROUNDS.length,
): CodeReviewVerdict {
  const score = evaluations.filter((e) => e.earnedPoint).length;
  const averageReadability =
    evaluations.length > 0
      ? Math.round(
          evaluations.reduce((sum, e) => sum + e.readability, 0) /
            evaluations.length,
        )
      : 0;

  if (score >= 9) {
    return {
      status: 'APPROVED · LGTM',
      badgeColor: 'var(--color-status-ok)',
      headline: 'Approved with zero naming nits.',
      summary:
        'Your identifiers carry the unit, the boundary, and the side effects right on the label. The engineer on 2am pager duty owes you a coffee.',
      score,
      total: totalRounds,
      averageReadability,
    };
  }

  if (score >= 7) {
    return {
      status: 'APPROVED WITH MINOR NITS',
      badgeColor: 'var(--color-status-ok)',
      headline: 'Approved—clear intent across almost every diff.',
      summary:
        'Strong domain naming overall, with only a couple of ambiguous units or filter arrays worth tightening before merge.',
      score,
      total: totalRounds,
      averageReadability,
    };
  }

  if (score >= 4) {
    return {
      status: 'COMMENTED · NEEDS CLARITY PASS',
      badgeColor: 'var(--color-status-warn)',
      headline: 'Logic works, but several names are wearing a trench coat.',
      summary:
        'A few variables still describe their primitive type instead of their domain job. Do one quick rename pass before merging.',
      score,
      total: totalRounds,
      averageReadability,
    };
  }

  return {
    status: 'CHANGES REQUESTED',
    badgeColor: 'var(--color-status-error)',
    headline: 'Blocked by the 2am readability check.',
    summary:
      'Too many mystery single-letter constants, double negatives, and silent side effects. Replace the placeholders and request a re-review.',
    score,
    total: totalRounds,
    averageReadability,
  };
}

export function formatShareableVerdict(
  verdict: CodeReviewVerdict,
  evaluations: RoundEvaluation[],
): string {
  const blocks = evaluations
    .map((e) => (e.earnedPoint ? '🟩' : e.readability >= 58 ? '🟨' : '🟥'))
    .join('');

  return [
    `WORKING_COPY.md // /naming — Code Review Verdict`,
    `${verdict.status} (${verdict.score}/${verdict.total} · ${verdict.averageReadability}% 2am readability)`,
    blocks,
    `"${verdict.headline}"`,
  ].join('\n');
}
