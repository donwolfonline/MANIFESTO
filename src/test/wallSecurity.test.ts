import { describe, expect, it } from 'vitest';
import {
  escapeCsvCell,
  escapeHtml,
  MAX_BODY_BYTES,
  MIN_SUBMIT_DURATION_MS,
  parseJsonBodySafe,
  sanitizeOptionalUrl,
  sanitizePlainText,
  sanitizePublicRow,
  validateNewSubmission,
  validateSubmitTiming,
  type WallSubmissionRow,
} from '../../api/_lib/wallStore';
import {
  buildScrubbedErrorEvent,
  scrubErrorText,
} from '../lib/errorMonitor';
import { safeExternalUrl } from '../lib/wallApi';

describe('Wall backend security helpers', () => {
  it('strips HTML tags, angle brackets, control chars, and Unicode bidi overrides', () => {
    const payload =
      'Write <script>alert(1)</script> clean \u202Ecode\u202C\u0000 with <img src=x onerror=alert(1)> care';
    const clean = sanitizePlainText(payload);

    expect(clean).toBe('Write alert(1) clean code with care');
    expect(clean).not.toContain('<');
    expect(clean).not.toContain('>');
    expect(clean).not.toContain('\u202E');
    expect(clean).not.toContain('\u0000');
  });

  it('escapes HTML special characters to block stored XSS in HTML/email outputs', () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&</a>`)).toBe(
      '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;',
    );
  });

  it('blocks dangerous protocols, embedded credentials, and private/SSRF hosts in URLs', () => {
    expect(sanitizeOptionalUrl('javascript:alert(1)').error).toBeDefined();
    expect(sanitizeOptionalUrl('data:text/html,<script>alert(1)</script>').error).toBeDefined();
    expect(sanitizeOptionalUrl('vbscript:msgbox(1)').error).toBeDefined();
    expect(sanitizeOptionalUrl('https://user:pass@example.com').error).toBeDefined();
    expect(sanitizeOptionalUrl('http://localhost:3000').error).toBeDefined();
    expect(sanitizeOptionalUrl('http://127.0.0.1/admin').error).toBeDefined();
    expect(sanitizeOptionalUrl('http://169.254.169.254/latest/meta-data').error).toBeDefined();
    expect(sanitizeOptionalUrl('http://10.0.0.5/internal').error).toBeDefined();
    expect(sanitizeOptionalUrl('http://192.168.1.1').error).toBeDefined();
    expect(sanitizeOptionalUrl('http://172.16.0.4').error).toBeDefined();

    expect(sanitizeOptionalUrl('example.dev/notes')).toEqual({
      value: 'https://example.dev/notes',
    });
    expect(sanitizeOptionalUrl('')).toEqual({ value: null });
  });

  it('enforces client-side safeExternalUrl checks against javascript: and data: URIs', () => {
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull();
    expect(safeExternalUrl('data:text/html,hi')).toBeNull();
    expect(safeExternalUrl('https://github.com/octocat')).toBe(
      'https://github.com/octocat',
    );
  });

  it('enforces the time-to-submit anti-bot gate', () => {
    const now = 1_800_000_000_000;

    // Missing or invalid timestamp -> flagged as bot-like
    expect(validateSubmitTiming(undefined, now)).toMatchObject({
      ok: false,
      isBotLike: true,
    });
    expect(validateSubmitTiming('not-a-number', now)).toMatchObject({
      ok: false,
      isBotLike: true,
    });

    // Submitted faster than 3s -> flagged as bot-like
    expect(
      validateSubmitTiming(now - (MIN_SUBMIT_DURATION_MS - 500), now),
    ).toMatchObject({
      ok: false,
      isBotLike: true,
    });

    // Stale (>24h) -> rejected cleanly as expired session
    expect(
      validateSubmitTiming(now - 25 * 60 * 60 * 1000, now),
    ).toMatchObject({
      ok: false,
      isBotLike: false,
    });

    // Normal human duration (12 seconds) -> allowed
    expect(validateSubmitTiming(now - 12_000, now)).toEqual({
      ok: true,
      isBotLike: false,
    });
  });

  it('rejects oversized JSON request payloads with 413', () => {
    const huge = 'a'.repeat(MAX_BODY_BYTES + 200);
    const byHeader = parseJsonBodySafe({
      headers: { 'content-length': String(MAX_BODY_BYTES + 1) },
      body: {},
    });
    expect(byHeader).toMatchObject({ ok: false, status: 413 });

    const byString = parseJsonBodySafe({
      headers: {},
      body: JSON.stringify({ principle: huge }),
    });
    expect(byString).toMatchObject({ ok: false, status: 413 });

    const byObject = parseJsonBodySafe({
      headers: {},
      body: { principle: huge },
    });
    expect(byObject).toMatchObject({ ok: false, status: 413 });
  });

  it('validates length limits, strips tags, and filters country flags against an allowlist', () => {
    const valid = validateNewSubmission({
      principle: '  <b>Leave</b> logs you can read at 2am.  ',
      author: '  @ada_l  ',
      countryFlag: '🇬🇧',
      link: 'https://ada.example.com',
    });
    expect(valid).toEqual({
      ok: true,
      data: {
        principle: 'Leave logs you can read at 2am.',
        author: '@ada_l',
        country_flag: '🇬🇧',
        author_url: 'https://ada.example.com/',
      },
    });

    // Unknown/arbitrary flag string is dropped to null
    const badFlag = validateNewSubmission({
      principle: 'Keep pull requests small enough to review thoroughly.',
      author: 'sam',
      countryFlag: '<script>',
    });
    expect(badFlag.ok).toBe(true);
    expect(badFlag.data?.country_flag).toBeNull();

    // Oversized principle rejected
    const tooLong = validateNewSubmission({
      principle: 'x'.repeat(141),
      author: 'sam',
    });
    expect(tooLong.ok).toBe(false);
  });

  it('sanitizes rows read back from the database as defense in depth', () => {
    const taintedRow: WallSubmissionRow = {
      id: 'row-1',
      principle: '<img src=x onerror=alert(1)>Prefer boring code.',
      author: '<b>eve</b>',
      country_flag: 'not-a-flag',
      author_url: 'javascript:alert(1)',
      status: 'approved',
      likes: -5,
      created_at: '2026-11-20T00:00:00Z',
    };

    expect(sanitizePublicRow(taintedRow)).toEqual({
      id: 'row-1',
      principle: 'Prefer boring code.',
      author: 'eve',
      country_flag: null,
      author_url: null,
      status: 'approved',
      likes: 0,
      created_at: '2026-11-20T00:00:00Z',
    });
  });

  it('neutralizes CSV formula injection prefixes (=, +, -, @)', () => {
    expect(escapeCsvCell('=CMD("calc")')).toBe(`"'=CMD(""calc"")"`);
    expect(escapeCsvCell('+SUM(A1:A2)')).toBe(`'+SUM(A1:A2)`);
    expect(escapeCsvCell('-2+3')).toBe(`'-2+3`);
    expect(escapeCsvCell('@HYPERLINK("http://evil")')).toBe(
      `"'@HYPERLINK(""http://evil"")"`,
    );
    expect(escapeCsvCell('Normal, quoted "note"')).toBe(
      `"Normal, quoted ""note"""`,
    );
  });
});

describe('Privacy-friendly client error scrubbing', () => {
  it('strips query strings, URL fragments, email addresses, and Bearer tokens', () => {
    const raw =
      'Failed for alice@example.com with Bearer eyJhbGciOiJIUzI1NiJ9 at https://site.test/playground?secret=123#privateHash';
    const scrubbed = scrubErrorText(raw);

    expect(scrubbed).not.toContain('alice@example.com');
    expect(scrubbed).not.toContain('eyJhbGciOiJIUzI1NiJ9');
    expect(scrubbed).not.toContain('secret=123');
    expect(scrubbed).not.toContain('privateHash');
    expect(scrubbed).toContain('[redacted-email]');
    expect(scrubbed).toContain('Bearer [redacted]');
    expect(scrubbed).toContain('https://site.test/playground');
  });

  it('builds a scrubbed error event with route stripped of query/hash', () => {
    const err = new Error('Crash for bob@corp.io');
    const event = buildScrubbedErrorEvent(err, '/wall?token=xyz#top');

    expect(event.route).toBe('/wall');
    expect(event.message).toBe('Crash for [redacted-email]');
    expect(event.release).toContain('working-copy');
  });
});
