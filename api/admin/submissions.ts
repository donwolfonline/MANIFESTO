import {
  applyRateLimitHeaders,
  checkAndRecordRateLimit,
  getClientIp,
  getEnvConfig,
  isDatabaseConfigured,
  parseJsonBodySafe,
  sanitizePublicRow,
  setApiSecurityHeaders,
  supabaseFetch,
  verifyAdminRequest,
  type ApiRequest,
  type ApiResponse,
  type SubmissionStatus,
  type WallSubmissionRow,
} from '../_lib/wallStore';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_STATUSES: SubmissionStatus[] = ['pending', 'approved', 'rejected'];
const ADMIN_AUTH_FAIL_LIMIT = 5;
const FIFTEEN_MIN_MS = 15 * 60 * 1000;

export default async function handler(req: ApiRequest, res: ApiResponse) {
  setApiSecurityHeaders(res);
  res.setHeader('Cache-Control', 'no-store');

  if (!isDatabaseConfigured() || !getEnvConfig().adminPassword) {
    res.status(503).json({
      error:
        'Admin API requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and ADMIN_PASSWORD.',
    });
    return;
  }

  // Throttle brute-force admin login guesses per salted IP hash
  const ip = getClientIp(req);
  const authGate = await checkAndRecordRateLimit(
    ip,
    'admin_auth',
    ADMIN_AUTH_FAIL_LIMIT,
    FIFTEEN_MIN_MS,
    false,
  );
  if (!authGate.allowed) {
    applyRateLimitHeaders(res, authGate);
    res.status(429).json({
      error: 'Too many failed admin login attempts. Try again in 15 minutes.',
    });
    return;
  }

  const authorized = await verifyAdminRequest(req);
  if (!authorized) {
    await checkAndRecordRateLimit(
      ip,
      'admin_auth',
      ADMIN_AUTH_FAIL_LIMIT,
      FIFTEEN_MIN_MS,
      true,
    );
    res.status(401).json({ error: 'Invalid admin password.' });
    return;
  }

  if (req.method === 'GET') {
    const rawStatus = req.query?.status;
    const status = typeof rawStatus === 'string' ? rawStatus : 'all';
    const filter = VALID_STATUSES.includes(status as SubmissionStatus)
      ? `&status=eq.${status}`
      : '';

    const dbRes = await supabaseFetch(
      `wall_submissions?select=id,principle,author,country_flag,author_url,status,likes,created_at${filter}&order=created_at.desc&limit=200`,
      { method: 'GET' },
    );

    if (!dbRes.ok) {
      res.status(500).json({ error: 'Could not load moderation queue.' });
      return;
    }

    const items = ((await dbRes.json()) as WallSubmissionRow[]).map(
      sanitizePublicRow,
    );
    res.status(200).json({ items });
    return;
  }

  if (req.method === 'PATCH') {
    const parsed = parseJsonBodySafe(req, 1024);
    if (!parsed.ok) {
      res.status(parsed.status ?? 400).json({ error: parsed.error });
      return;
    }

    const id = typeof parsed.body.id === 'string' ? parsed.body.id.trim() : '';
    const nextStatus = parsed.body.status as SubmissionStatus;

    if (!UUID_REGEX.test(id) || !VALID_STATUSES.includes(nextStatus)) {
      res.status(400).json({ error: 'Invalid id or status.' });
      return;
    }

    const patchRes = await supabaseFetch(
      `wall_submissions?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ status: nextStatus }),
      },
    );

    if (!patchRes.ok) {
      res.status(500).json({ error: 'Could not update submission status.' });
      return;
    }

    const updated = (await patchRes.json()) as WallSubmissionRow[];
    res.status(200).json({
      item: updated[0] ? sanitizePublicRow(updated[0]) : null,
    });
    return;
  }

  if (req.method === 'DELETE') {
    const parsed = parseJsonBodySafe(req, 512);
    if (!parsed.ok) {
      res.status(parsed.status ?? 400).json({ error: parsed.error });
      return;
    }

    const id = typeof parsed.body.id === 'string' ? parsed.body.id.trim() : '';

    if (!UUID_REGEX.test(id)) {
      res.status(400).json({ error: 'Invalid submission id.' });
      return;
    }

    const delRes = await supabaseFetch(
      `wall_submissions?id=eq.${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    );

    if (!delRes.ok) {
      res.status(500).json({ error: 'Could not delete submission.' });
      return;
    }

    res.status(200).json({ deleted: id });
    return;
  }

  res.setHeader('Allow', 'GET, PATCH, DELETE');
  res.status(405).json({ error: 'Method not allowed.' });
}
