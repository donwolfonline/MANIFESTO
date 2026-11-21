import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WallPage } from '../components/WallPage';
import type { ManifestoMeta } from '../lib/markdown';
import {
  CLIENT_COOLDOWN_MS,
  getRemainingCooldownMs,
  recordClientSubmitTimestamp,
  submitWallPrinciple,
  validateWallForm,
  type SubmitPrinciplePayload,
} from '../lib/wallApi';

const TEST_META: ManifestoMeta = {
  filename: 'WORKING_COPY.md',
  title: 'WORKING_COPY.md',
  subtitles: [],
  author: 'Test Author',
  date: 'Nov 2026',
  location: 'Plain Text, UTF-8',
};

function makePayload(
  overrides: Partial<SubmitPrinciplePayload> = {},
): SubmitPrinciplePayload {
  return {
    principle: 'Leave error messages that name the missing config key.',
    author: 'maya_k',
    countryFlag: '🇨🇦',
    link: '',
    website_confirm: '',
    ...overrides,
  };
}

describe('validateWallForm', () => {
  it('accepts a valid principle, author, and empty optional link', () => {
    expect(validateWallForm(makePayload())).toBeNull();
  });

  it('rejects principles shorter than 8 characters (after collapsing whitespace)', () => {
    expect(validateWallForm(makePayload({ principle: '   short ' }))).toMatch(
      /at least 8 characters/i,
    );
    expect(validateWallForm(makePayload({ principle: '1234567' }))).toMatch(
      /at least 8 characters/i,
    );
    expect(validateWallForm(makePayload({ principle: '12345678' }))).toBeNull();
  });

  it('rejects principles longer than 140 characters and allows exactly 140', () => {
    const exact140 = 'a'.repeat(140);
    const over140 = 'a'.repeat(141);

    expect(validateWallForm(makePayload({ principle: exact140 }))).toBeNull();
    expect(validateWallForm(makePayload({ principle: over140 }))).toMatch(
      /within 140 characters/i,
    );
  });

  it('validates author name/handle length boundaries (2 to 40 characters)', () => {
    expect(validateWallForm(makePayload({ author: 'a' }))).toMatch(
      /between 2 and 40 characters/i,
    );
    expect(validateWallForm(makePayload({ author: 'ab' }))).toBeNull();
    expect(validateWallForm(makePayload({ author: 'x'.repeat(40) }))).toBeNull();
    expect(validateWallForm(makePayload({ author: 'x'.repeat(41) }))).toMatch(
      /between 2 and 40 characters/i,
    );
  });

  it('validates optional link URLs and auto-handles bare domains', () => {
    expect(
      validateWallForm(makePayload({ link: 'https://example.dev/notes' })),
    ).toBeNull();
    expect(
      validateWallForm(makePayload({ link: 'http://example.org' })),
    ).toBeNull();
    expect(validateWallForm(makePayload({ link: 'yoursite.dev' }))).toBeNull();

    expect(validateWallForm(makePayload({ link: 'localhost' }))).toMatch(
      /valid http:\/\/ or https:\/\/ url/i,
    );
    expect(validateWallForm(makePayload({ link: 'not a valid url' }))).toMatch(
      /valid url/i,
    );
    expect(
      validateWallForm(makePayload({ link: 'javascript:alert(1)' })),
    ).toMatch(/valid/i);
  });
});

describe('client cooldown & honeypot handling', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('enforces client cooldown right after recording a submit timestamp', () => {
    expect(getRemainingCooldownMs()).toBe(0);

    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    recordClientSubmitTimestamp();

    vi.spyOn(Date, 'now').mockReturnValue(now + 10_000);
    expect(getRemainingCooldownMs()).toBe(CLIENT_COOLDOWN_MS - 10_000);

    vi.spyOn(Date, 'now').mockReturnValue(now + CLIENT_COOLDOWN_MS + 1);
    expect(getRemainingCooldownMs()).toBe(0);
  });

  it('silently drops honeypot submissions without writing them to the local store', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

    const res = await submitWallPrinciple(
      makePayload({ website_confirm: 'https://spam-bot.example' }),
    );

    expect(res.ok).toBe(true);
    expect(window.localStorage.getItem('working_copy_wall_demo_v1')).toBeNull();
  });
});

describe('<WallPage /> form validation and submission UX', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      if (init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            message: 'Received—pending moderation before appearing publicly.',
          }),
          { status: 201, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('updates the live character counter, displays validation alerts, shows a pending confirmation, and enforces cooldown', async () => {
    const user = userEvent.setup();
    render(
      <WallPage
        meta={TEST_META}
        onNavigateHome={vi.fn()}
        onOpenTerminal={vi.fn()}
        onOpenAdmin={vi.fn()}
      />,
    );

    const principleInput = screen.getByLabelText(/your one-line principle/i);
    const authorInput = screen.getByLabelText(/name or handle/i);
    const submitBtn = screen.getByRole('button', { name: /submit note/i });

    expect(screen.getByText('0 / 140')).toBeInTheDocument();

    // Too-short submission displays an accessible alert
    await user.type(principleInput, 'short');
    await user.type(authorInput, 'maya');
    expect(screen.getByText('5 / 140')).toBeInTheDocument();
    await user.click(submitBtn);

    expect(screen.getByRole('alert')).toHaveTextContent(/at least 8 characters/i);

    // Valid submission displays pending confirmation and resets inputs
    await user.clear(principleInput);
    const text = 'Test boundary counts, never only a tidy fixture of twelve.';
    await user.type(principleInput, text);
    expect(screen.getByText(`${text.length} / 140`)).toBeInTheDocument();

    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/pending/i);
    });
    expect(principleInput).toHaveValue('');
    expect(authorInput).toHaveValue('');

    // Immediate second submit hits the client-side rate limit
    await user.type(principleInput, 'Another thoughtful principle to share.');
    await user.type(authorInput, 'maya');
    await user.click(submitBtn);

    expect(screen.getByRole('alert')).toHaveTextContent(/rate limit active/i);
  });
});
