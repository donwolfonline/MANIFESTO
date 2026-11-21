import {
  applyRateLimitHeaders,
  checkAndRecordRateLimit,
  getClientIp,
  isDatabaseConfigured,
  parseJsonBodySafe,
  sanitizePublicRow,
  setApiSecurityHeaders,
  supabaseFetch,
  validateNewSubmission,
  validateSubmitTiming,
  type ApiRequest,
  type ApiResponse,
  type WallSubmissionRow,
} from './_lib/wallStore';

const SUBMIT_LIMIT_PER_HOUR = 3;
const ONE_HOUR_MS = 60 * 60 * 1000;
const BURST_WINDOW_MS = 60 * 1000;

export default async function handler(req: ApiRequest, res: ApiResponse) {
  setApiSecurityHeaders(res);

  if (!isDatabaseConfigured()) {
    res.status(503).json({
      error:
        'Wall database is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    });
    return;
  }

  if (req.method === 'GET') {
    const dbRes = await supabaseFetch(
      'wall_submissions?select=id,principle,author,country_flag,author_url,status,likes,created_at&status=eq.approved&order=created_at.desc&limit=120',
      { method: 'GET' },
    );

    if (!dbRes.ok) {
      res.status(500).json({ error: 'Could not load wall principles.' });
      return;
    }

    const rows = ((await dbRes.json()) as WallSubmissionRow[]).map(
      sanitizePublicRow,
    );
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=20, stale-while-revalidate=60',
    );
    res.status(200).json({ items: rows });
    return;
  }

  if (req.method === 'POST') {
    const parsed = parseJsonBodySafe(req);
    if (!parsed.ok) {
      res.status(parsed.status ?? 400).json({ error: parsed.error });
      return;
    }
    const body = parsed.body;

    // 1. Honeypot trap: bots fill hidden fields -> silent 202 without writing
    if (
      typeof body.website_confirm === 'string' &&
      body.website_confirm.trim().length > 0
    ) {
      res.status(202).json({
        ok: true,
        status: 'pending',
        message: 'Thanks—your principle is queued for review.',
      });
      return;
    }

    // 2. Time-to-submit check: reject instant (<3s) bot submissions
    const timing = validateSubmitTiming(body.form_started_at);
    if (!timing.ok) {
      if (timing.isBotLike) {
        res.status(202).json({
          ok: true,
          status: 'pending',
          message: 'Thanks—your principle is queued for review.',
        });
        return;
      }
      res.status(400).json({ error: timing.reason });
      return;
    }

    // 3. Strict input sanitization & length validation
    const validation = validateNewSubmission(body);
    if (!validation.ok || !validation.data) {
      res.status(400).json({ error: validation.error ?? 'Invalid submission.' });
      return;
    }

    // 4. Per-IP burst guard (1 / minute) + sliding hourly limit (3 / hour)
    const ip = getClientIp(req);
    const burst = await checkAndRecordRateLimit(
      ip,
      'submit',
      1,
      BURST_WINDOW_MS,
      false,
    );
    if (!burst.allowed) {
      applyRateLimitHeaders(res, burst);
      res.status(429).json({
        error: 'Please wait a minute before sending another principle.',
      });
      return;
    }

    const rate = await checkAndRecordRateLimit(
      ip,
      'submit',
      SUBMIT_LIMIT_PER_HOUR,
      ONE_HOUR_MS,
      true,
    );
    applyRateLimitHeaders(res, rate);

    if (!rate.allowed) {
      res.status(429).json({
        error:
          'Too many submissions from this connection. Please wait an hour before sending another.',
      });
      return;
    }

    // Store ONLY the 4 form fields + moderation status (zero extra personal data)
    const insertRes = await supabaseFetch('wall_submissions', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        principle: validation.data.principle,
        author: validation.data.author,
        country_flag: validation.data.country_flag,
        author_url: validation.data.author_url,
        status: 'pending',
      }),
    });

    if (!insertRes.ok) {
      res.status(500).json({ error: 'Could not save your submission.' });
      return;
    }

    res.status(201).json({
      ok: true,
      status: 'pending',
      message:
        'Received—your principle is pending review and will appear publicly once approved.',
    });
    return;
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({ error: 'Method not allowed.' });
}
