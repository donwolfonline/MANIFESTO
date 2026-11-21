/**
 * Privacy-friendly, cookie-free client error monitor (~1.2 kB, zero third-party SDK bloat).
 *
 * - Scrubs emails, bearer tokens, query strings, and URL hashes before anything leaves the browser.
 * - Sends zero cookies (`credentials: 'omit'`), zero user IDs, and zero session replays.
 * - Supports GlitchTip (open-source, EU-hostable Sentry-compatible endpoint via `VITE_GLITCHTIP_DSN`)
 *   or falls back to the site's own first-party `/api/report-error` endpoint in production.
 */

export interface ScrubbedErrorEvent {
  message: string;
  stack: string;
  route: string;
  release: string;
  timestamp: string;
}

const RELEASE = 'working-copy@1.0.0';
let sentCount = 0;
const MAX_REPORTS_PER_PAGE = 5;

export function scrubErrorText(raw: string, maxLen = 400): string {
  return raw
    // Strip URL query strings and fragments (prevents leaking Playground hashes or tokens)
    .replace(/https?:\/\/[^\s)]+/gi, (match) => {
      try {
        const u = new URL(match);
        return `${u.origin}${u.pathname}`;
      } catch {
        return '[url]';
      }
    })
    // Redact email addresses
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    // Redact Bearer / auth tokens
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

export function buildScrubbedErrorEvent(
  error: unknown,
  routePath?: string,
): ScrubbedErrorEvent {
  const message =
    error instanceof Error
      ? error.message || error.name
      : typeof error === 'string'
        ? error
        : 'Unknown runtime error';

  const stack = error instanceof Error && error.stack ? error.stack : '';
  const pathname =
    routePath ??
    (typeof window !== 'undefined' ? window.location.pathname : '/');

  return {
    message: scrubErrorText(message, 240),
    stack: scrubErrorText(stack, 600),
    route: pathname.split('?')[0].split('#')[0].slice(0, 120) || '/',
    release: RELEASE,
    timestamp: new Date().toISOString(),
  };
}

function parseGlitchTipDsn(dsn: string): {
  endpoint: string;
  publicKey: string;
} | null {
  try {
    const parsed = new URL(dsn);
    const projectId = parsed.pathname.replace(/^\/+|\/+$/g, '');
    const publicKey = parsed.username;
    if (!projectId || !publicKey) return null;
    return {
      endpoint: `${parsed.protocol}//${parsed.host}/api/${projectId}/store/?sentry_version=7&sentry_key=${encodeURIComponent(publicKey)}`,
      publicKey,
    };
  } catch {
    return null;
  }
}

export function reportClientError(error: unknown, routePath?: string): void {
  if (typeof window === 'undefined') return;
  if (sentCount >= MAX_REPORTS_PER_PAGE) return;

  // Never send error beacons from localhost / test runners unless explicitly configured
  const host = window.location.hostname;
  const dsn = (import.meta.env.VITE_GLITCHTIP_DSN as string | undefined)?.trim();
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  if (isLocal && !dsn) return;

  sentCount += 1;
  const event = buildScrubbedErrorEvent(error, routePath);

  // Option A: Privacy-friendly GlitchTip (Sentry-protocol store endpoint, zero PII)
  if (dsn) {
    const parsed = parseGlitchTipDsn(dsn);
    if (parsed) {
      const glitchTipPayload = {
        message: event.message,
        level: 'error',
        platform: 'javascript',
        release: event.release,
        request: {
          url: `${window.location.origin}${event.route}`,
        },
        extra: {
          stack: event.stack,
        },
      };
      fetch(parsed.endpoint, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(glitchTipPayload),
      }).catch(() => {});
      return;
    }
  }

  // Option B: First-party cookie-free endpoint (/api/report-error)
  fetch('/api/report-error', {
    method: 'POST',
    credentials: 'omit',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  }).catch(() => {});
}

let initialized = false;

export function initErrorMonitoring(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  window.addEventListener('error', (event) => {
    reportClientError(event.error ?? event.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    reportClientError(event.reason);
  });
}
