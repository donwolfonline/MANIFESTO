import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NamingPage } from '../components/NamingPage';
import {
  buildCodeReviewVerdict,
  evaluateCustomIdentifier,
  evaluatePresetOption,
  formatShareableVerdict,
  getBestOption,
  NAMING_ROUNDS,
  previewRenamedCode,
} from '../data/namingGame';
import type { ManifestoMeta } from '../lib/markdown';

const TEST_META: ManifestoMeta = {
  filename: 'WORKING_COPY.md',
  title: 'WORKING_COPY.md',
  subtitles: ['notes-to-self, mostly.'],
  author: 'Test Author',
  date: 'Nov 2026',
  location: 'Plain Text, UTF-8',
};

describe('/naming 10-round game data and evaluator', () => {
  it('defines 10 valid rounds in namingRounds.json with 4 options, 1 best option, and one-sentence reasoning', () => {
    expect(NAMING_ROUNDS).toHaveLength(10);

    NAMING_ROUNDS.forEach((round, index) => {
      expect(round.number).toBe(index + 1);
      expect(round.code).toContain(round.badName);
      expect(round.options).toHaveLength(4);
      const best = round.options.filter((o) => o.isBest);
      expect(best).toHaveLength(1);
      for (const opt of round.options) {
        expect(opt.reasoning.length).toBeGreaterThan(20);
        expect(opt.readability).toBeGreaterThanOrEqual(0);
        expect(opt.readability).toBeLessThanOrEqual(100);
      }
    });
  });

  it('evaluates preset choices, custom identifiers, code preview, and code-review verdicts', () => {
    const round1 = NAMING_ROUNDS[0];
    const best1 = getBestOption(round1);

    const presetEval = evaluatePresetOption(round1, best1.id);
    expect(presetEval.earnedPoint).toBe(true);
    expect(presetEval.readability).toBeGreaterThan(90);

    // Custom identifier with domain keywords earns credit
    const customGood = evaluateCustomIdentifier(round1, 'SESSION_EXPIRY_TTL_MS');
    expect(customGood.ok).toBe(true);
    expect(customGood.evaluation?.earnedPoint).toBe(true);
    expect(customGood.evaluation?.readability).toBeGreaterThanOrEqual(88);

    // Invalid identifier syntax is rejected with a clear message
    const invalid = evaluateCustomIdentifier(round1, 'not a valid name!');
    expect(invalid.ok).toBe(false);

    // Code preview substitutes whole-word badName
    const preview = previewRenamedCode(round1, 'SESSION_IDLE_TTL_MS');
    expect(preview).toContain('const SESSION_IDLE_TTL_MS = 15 * 60 * 1000;');

    // Code-review verdict scales with score
    const allBest = NAMING_ROUNDS.map((r) =>
      evaluatePresetOption(r, getBestOption(r).id),
    );
    const verdict = buildCodeReviewVerdict(allBest);
    expect(verdict.status).toBe('APPROVED · LGTM');
    expect(verdict.score).toBe(10);
    expect(formatShareableVerdict(verdict, allBest)).toContain('10/10');
  });

  it('plays through rounds on <NamingPage />, updates the readability meter, and shows the final code-review verdict card', async () => {
    const user = userEvent.setup();

    render(
      <NamingPage
        meta={TEST_META}
        onNavigateHome={vi.fn()}
        onOpenTerminal={vi.fn()}
      />,
    );

    // Round 1 starts at baseline readability (16%)
    expect(screen.getByTestId('readability-meter-bar')).toHaveStyle({
      width: '16%',
    });

    // Submit a custom name on Round 1
    const customInput = screen.getByLabelText(/or type your own identifier/i);
    await user.type(customInput, 'SESSION_IDLE_TTL_MS');
    await user.click(
      screen.getByRole('button', { name: /submit custom name/i }),
    );

    // Readability meter animates to 97% and reasoning is revealed
    expect(screen.getByTestId('readability-meter-bar')).toHaveStyle({
      width: '97%',
    });
    expect(screen.getByRole('status')).toHaveTextContent(/\+1 clarity point/i);

    await user.click(screen.getByRole('button', { name: /next round/i }));

    // Play remaining rounds 2..10 by picking the best option on each round
    for (let i = 1; i < NAMING_ROUNDS.length; i++) {
      const round = NAMING_ROUNDS[i];
      const best = getBestOption(round);
      await user.click(
        screen.getByRole('button', {
          name: new RegExp(best.name, 'i'),
        }),
      );
      const nextBtn = screen.getByRole('button', {
        name: /next round|view code-review verdict/i,
      });
      await user.click(nextBtn);
    }

    // Final code-review verdict card is rendered with 10 / 10 and share button
    expect(
      screen.getByRole('region', { name: /code review verdict/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/APPROVED · LGTM/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /share review verdict/i }),
    ).toBeInTheDocument();
  });
});
