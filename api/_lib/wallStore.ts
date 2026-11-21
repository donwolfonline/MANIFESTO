/**
 * Shared server-side helpers for Vercel serverless functions in /api.
 * Prefixed with _lib so Vercel does not expose this module as a public endpoint.
 */

export interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
}

export interface ApiResponse {
  status: (code: number) => ApiResponse;
  setHeader: (name: string, value: string) => void;
  json: (payload: unknown) => void;
  send?: (body: string) => void;
}

export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export type RateLimitAction = 'submit' | 'like' | 'admin_auth' | 'error_report';

export interface WallSubmissionRow {
  id: string;
  principle: string;
  author: string;
  country_flag: string | null;
  author_url: string | null;
  status: SubmissionStatus;
  likes: number;
  created_at: string;
}

export const MAX_BODY_BYTES = 4096;
export const MIN_SUBMIT_DURATION_MS = 3_000;
export const MAX_SUBMIT_DURATION_MS = 24 * 60 * 60 * 1000;

export const ALLOWED_COUNTRY_FLAGS = new Set<string>([
  '🇺🇸',
  '🇬🇧',
  '🇨🇦',
  '🇩🇪',
  '🇫🇷',
  '🇳🇱',
  '🇸🇪',
  '🇵🇱',
  '🇪🇸',
  '🇧🇷',
  '🇯🇵',
  '🇰🇷',
  '🇮🇳',
  '🇦🇺',
  '🇳🇬',
  '🇲🇽',
  '🌍',
]);

interface EnvConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  adminPassword: string;
  rateLimitSalt: string;
  alertWebhookUrl: string;
}

export function getEnvConfig(): EnvConfig {
  const env =
    (
      globalThis as unknown as {
        process?: { env?: Record<string, string | undefined> };
      }
    ).process?.env ?? {};

  return {
    supabaseUrl: (env.SUPABASE_URL ?? '').replace(/\/+$/, ''),
    supabaseServiceKey: env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    adminPassword: env.ADMIN_PASSWORD ?? '',
    rateLimitSalt: env.RATE_LIMIT_SALT ?? 'working-copy-default-salt',
    alertWebhookUrl: env.ALERT_WEBHOOK_URL ?? '',
  };
}

export function isDatabaseConfigured(): boolean {
  const { supabaseUrl, supabaseServiceKey } = getEnvConfig();
  return Boolean(supabaseUrl && supabaseServiceKey);
}

/**
 * Applies defensive security headers to every JSON/export API response so
 * browsers never sniff JSON as HTML or frame API output.
 */
export function setApiSecurityHeaders(res: ApiResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
}

/**
 * Extracts client IP preferring trusted hosting headers before x-forwarded-for.
 * Raw IPs are NEVER written to storage—only salted SHA-256 hashes are persisted.
 */
export function getClientIp(req: ApiRequest): string {
  const vercelForwarded = req.headers['x-vercel-forwarded-for'];
  if (typeof vercelForwarded === 'string' && vercelForwarded.trim().length > 0) {
    return vercelForwarded.split(',')[0].trim();
  }
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim().length > 0) {
    return realIp.trim();
  }
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim().length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return 'unknown';
}

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashIp(ip: string): Promise<string> {
  const { rateLimitSalt } = getEnvConfig();
  return sha256Hex(`${rateLimitSalt}:${ip}`);
}

/**
 * Constant-time admin password check via SHA-256 digest comparison.
 */
export async function verifyAdminRequest(req: ApiRequest): Promise<boolean> {
  const { adminPassword } = getEnvConfig();
  if (!adminPassword) return false;

  const authHeader = req.headers.authorization;
  const rawToken =
    typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : '';

  if (!rawToken) return false;

  const [a, b] = await Promise.all([
    sha256Hex(rawToken),
    sha256Hex(adminPassword),
  ]);

  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function supabaseFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const { supabaseUrl, supabaseServiceKey } = getEnvConfig();
  const headers = new Headers(init.headers);
  headers.set('apikey', supabaseServiceKey);
  headers.set('Authorization', `Bearer ${supabaseServiceKey}`);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers,
  });
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSec: number;
  resetAtEpochSec: number;
}

/**
 * Privacy-preserving sliding-window rate limit stored strictly as salted IP hashes.
 * Fails closed if the backing lookup errors, and prunes stale entries older than 24h.
 */
export async function checkAndRecordRateLimit(
  ip: string,
  action: RateLimitAction,
  maxRequests: number,
  windowMs: number,
  recordOnCheck = true,
): Promise<RateLimitResult> {
  const now = Date.now();
  const resetAtEpochSec = Math.ceil((now + windowMs) / 1000);
  const ipHash = await hashIp(ip);
  const cutoffIso = new Date(now - windowMs).toISOString();

  const query = `wall_rate_limits?select=id,created_at&ip_hash=eq.${encodeURIComponent(
    ipHash,
  )}&action=eq.${action}&created_at=gte.${encodeURIComponent(
    cutoffIso,
  )}&order=created_at.asc`;

  const checkRes = await supabaseFetch(query, { method: 'GET' });
  if (!checkRes.ok) {
    // Fail closed when rate-limit backend is unreachable
    return {
      allowed: false,
      limit: maxRequests,
      remaining: 0,
      retryAfterSec: 60,
      resetAtEpochSec: Math.ceil((now + 60_000) / 1000),
    };
  }

  const existing = (await checkRes.json()) as { id: number; created_at: string }[];
  if (existing.length >= maxRequests) {
    const oldestMs = Date.parse(existing[0]?.created_at ?? '') || now;
    const retryAfterSec = Math.max(
      1,
      Math.ceil((oldestMs + windowMs - now) / 1000),
    );
    return {
      allowed: false,
      limit: maxRequests,
      remaining: 0,
      retryAfterSec,
      resetAtEpochSec: Math.ceil((oldestMs + windowMs) / 1000),
    };
  }

  if (recordOnCheck) {
    await supabaseFetch('wall_rate_limits', {
      method: 'POST',
      body: JSON.stringify({ ip_hash: ipHash, action }),
    });
  }

  // Opportunistic cleanup of rate-limit hashes older than 24h (zero long-term IP hash retention)
  const pruneIso = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  supabaseFetch(
    `wall_rate_limits?created_at=lt.${encodeURIComponent(pruneIso)}`,
    { method: 'DELETE' },
  ).catch(() => {});

  return {
    allowed: true,
    limit: maxRequests,
    remaining: Math.max(0, maxRequests - existing.length - (recordOnCheck ? 1 : 0)),
    retryAfterSec: 0,
    resetAtEpochSec,
  };
}

export function applyRateLimitHeaders(
  res: ApiResponse,
  rate: RateLimitResult,
): void {
  res.setHeader('X-RateLimit-Limit', String(rate.limit));
  res.setHeader('X-RateLimit-Remaining', String(rate.remaining));
  res.setHeader('X-RateLimit-Reset', String(rate.resetAtEpochSec));
  if (!rate.allowed && rate.retryAfterSec > 0) {
    res.setHeader('Retry-After', String(rate.retryAfterSec));
  }
}

/**
 * Safely parses JSON bodies while enforcing a hard byte-length cap to block payload floods.
 */
export function parseJsonBodySafe(
  req: ApiRequest,
  maxBytes = MAX_BODY_BYTES,
): { ok: boolean; status?: number; error?: string; body: Record<string, unknown> } {
  const contentLength = Number(req.headers['content-length'] ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return {
      ok: false,
      status: 413,
      error: 'Request payload is too large.',
      body: {},
    };
  }

  if (!req.body) return { ok: true, body: {} };

  if (typeof req.body === 'string') {
    const byteLength = new TextEncoder().encode(req.body).length;
    if (byteLength > maxBytes) {
      return {
        ok: false,
        status: 413,
        error: 'Request payload is too large.',
        body: {},
      };
    }
    try {
      const parsed = JSON.parse(req.body);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { ok: false, status: 400, error: 'Invalid JSON object.', body: {} };
      }
      return { ok: true, body: parsed as Record<string, unknown> };
    } catch {
      return { ok: false, status: 400, error: 'Malformed JSON body.', body: {} };
    }
  }

  if (typeof req.body === 'object' && !Array.isArray(req.body)) {
    const serialized = JSON.stringify(req.body);
    if (new TextEncoder().encode(serialized).length > maxBytes) {
      return {
        ok: false,
        status: 413,
        error: 'Request payload is too large.',
        body: {},
      };
    }
    return { ok: true, body: req.body as Record<string, unknown> };
  }

  return { ok: false, status: 400, error: 'Invalid JSON body.', body: {} };
}

/**
 * Strips HTML tags, angle brackets, invisible control characters, and Unicode
 * bidirectional spoofing overrides to keep stored records pure plain text.
 */
export function sanitizePlainText(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    // Remove complete HTML tags first
    .replace(/<[^>]*>/g, '')
    // Strip any leftover angle brackets
    .replace(/[<>]/g, '')
    // Strip ASCII control chars & Unicode bidi spoofing characters
    // eslint-disable-next-line no-control-regex -- matching control chars is the point
    .replace(/[\u0000-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/g, ' ')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Explicit HTML output escaping helper to prevent stored XSS in HTML/email/export renderers.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isPrivateOrDisallowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host === '::1' ||
    host.startsWith('127.') ||
    host.startsWith('10.') ||
    host.startsWith('169.254.') ||
    host.startsWith('192.168.') ||
    host.startsWith('0.')
  ) {
    return true;
  }
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) {
    return true;
  }
  return false;
}

export function sanitizeOptionalUrl(raw: unknown): {
  value: string | null;
  error?: string;
} {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return { value: null };
  }

  const trimmed = raw
    // eslint-disable-next-line no-control-regex -- matching control chars is the point
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .trim();

  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return { value: null, error: 'Link must use http:// or https://.' };
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { value: null, error: 'Link must use http:// or https://.' };
    }
    if (parsed.username || parsed.password) {
      return { value: null, error: 'Link cannot include embedded credentials.' };
    }
    if (!parsed.hostname.includes('.') || isPrivateOrDisallowedHost(parsed.hostname)) {
      return { value: null, error: 'Please enter a valid public URL.' };
    }
    if (parsed.href.length > 200) {
      return { value: null, error: 'Link must be under 200 characters.' };
    }
    return { value: parsed.href };
  } catch {
    return { value: null, error: 'Please enter a valid URL.' };
  }
}

/**
 * Time-to-submit anti-bot gate: humans need a few seconds to type a principle.
 * Flags instantaneous submits (< 3s), future timestamps, or stale (> 24h) tokens.
 */
export function validateSubmitTiming(
  rawStartedAt: unknown,
  nowMs = Date.now(),
): { ok: boolean; isBotLike: boolean; reason?: string } {
  if (typeof rawStartedAt !== 'number' || !Number.isFinite(rawStartedAt)) {
    return {
      ok: false,
      isBotLike: true,
      reason: 'Missing form timing metadata.',
    };
  }

  const elapsed = nowMs - rawStartedAt;
  if (elapsed < MIN_SUBMIT_DURATION_MS) {
    return {
      ok: false,
      isBotLike: true,
      reason: 'Submitted too quickly—please take a moment before submitting.',
    };
  }
  if (elapsed > MAX_SUBMIT_DURATION_MS) {
    return {
      ok: false,
      isBotLike: false,
      reason: 'Form session expired—please refresh the page and submit again.',
    };
  }

  return { ok: true, isBotLike: false };
}

export function validateNewSubmission(body: Record<string, unknown>): {
  ok: boolean;
  error?: string;
  data?: {
    principle: string;
    author: string;
    country_flag: string | null;
    author_url: string | null;
  };
} {
  const rawPrinciple = typeof body.principle === 'string' ? body.principle : '';
  const rawAuthor = typeof body.author === 'string' ? body.author : '';

  if (rawPrinciple.length > 500 || rawAuthor.length > 120) {
    return { ok: false, error: 'Input exceeds maximum allowed length.' };
  }

  const principle = sanitizePlainText(rawPrinciple);
  const author = sanitizePlainText(rawAuthor);
  const rawFlag =
    typeof body.countryFlag === 'string' ? body.countryFlag.trim() : '';

  if (principle.length < 8) {
    return {
      ok: false,
      error: 'Principle must be at least 8 characters long.',
    };
  }
  if (principle.length > 140) {
    return {
      ok: false,
      error: 'Principle must be 140 characters or fewer.',
    };
  }
  if (author.length < 2 || author.length > 40) {
    return {
      ok: false,
      error: 'Name or handle must be between 2 and 40 characters.',
    };
  }

  const urlResult = sanitizeOptionalUrl(body.link);
  if (urlResult.error) {
    return { ok: false, error: urlResult.error };
  }

  const countryFlag =
    rawFlag && ALLOWED_COUNTRY_FLAGS.has(rawFlag) ? rawFlag : null;

  return {
    ok: true,
    data: {
      principle,
      author,
      country_flag: countryFlag,
      author_url: urlResult.value,
    },
  };
}

/**
 * Defense-in-depth output sanitizer applied on every read from the database
 * before returning JSON to clients (prevents stored XSS even if DB rows were altered directly).
 */
export function sanitizePublicRow(row: WallSubmissionRow): WallSubmissionRow {
  const safeUrl = sanitizeOptionalUrl(row.author_url).value;
  const safeFlag =
    row.country_flag && ALLOWED_COUNTRY_FLAGS.has(row.country_flag)
      ? row.country_flag
      : null;

  return {
    id: row.id,
    principle: sanitizePlainText(row.principle).slice(0, 140),
    author: sanitizePlainText(row.author).slice(0, 40),
    country_flag: safeFlag,
    author_url: safeUrl,
    status: row.status,
    likes: Math.max(0, Math.floor(Number(row.likes) || 0)),
    created_at: row.created_at,
  };
}

/**
 * Escapes CSV cells per RFC 4180 and neutralizes spreadsheet formula injection (=, +, -, @, tab).
 */
export function escapeCsvCell(value: string | number | null | undefined): string {
  let str = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
