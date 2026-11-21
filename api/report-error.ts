import {
  applyRateLimitHeaders,
  checkAndRecordRateLimit,
  getClientIp,
  getEnvConfig,
  isDatabaseConfigured,
  parseJsonBodySafe,
  sanitizePlainText,
  setApiSecurityHeaders,
  type ApiRequest,
  type ApiResponse,
} from './_lib/wallStore.js';

const ERROR_LIMIT_PER_HOUR = 20;
const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Privacy-friendly, cookie-free client error collector (`POST /api/report-error`).
 * Strips emails/tokens/IPs before logging to serverless logs and optionally
 * forwarding a compact alert to ALERT_WEBHOOK_URL (Slack/Discord/ntfy compatible).
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  setApiSecurityHeaders(res);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const parsed = parseJsonBodySafe(req, 2048);
  if (!parsed.ok) {
    res.status(parsed.status ?? 400).json({ error: parsed.error });
    return;
  }

  if (isDatabaseConfigured()) {
    const rate = await checkAndRecordRateLimit(
      getClientIp(req),
      'error_report',
      ERROR_LIMIT_PER_HOUR,
      ONE_HOUR_MS,
    );
    applyRateLimitHeaders(res, rate);
    if (!rate.allowed) {
      res.status(429).json({ ok: false, error: 'Too many error reports.' });
      return;
    }
  }

  const scrub = (val: unknown, maxLen: number) =>
    sanitizePlainText(val)
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
      .slice(0, maxLen);

  const report = {
    type: 'client_error',
    route: scrub(parsed.body.route, 120) || '/',
    message: scrub(parsed.body.message, 240) || 'Unknown client error',
    stack: scrub(parsed.body.stack, 600),
    release: scrub(parsed.body.release, 40) || 'unknown',
    timestamp: new Date().toISOString(),
  };

  // Structured server log — zero IP, zero cookies, zero user-agent stored
  console.error(JSON.stringify(report));

  const { alertWebhookUrl } = getEnvConfig();
  if (alertWebhookUrl && /^https:\/\//i.test(alertWebhookUrl)) {
    fetch(alertWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `[WORKING_COPY.md] Client error on ${report.route}: ${report.message}`,
        content: `[WORKING_COPY.md] Client error on ${report.route}: ${report.message}`,
      }),
    }).catch(() => {});
  }

  res.status(202).json({ ok: true });
}
