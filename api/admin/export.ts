import {
  applyRateLimitHeaders,
  checkAndRecordRateLimit,
  escapeCsvCell,
  getClientIp,
  getEnvConfig,
  isDatabaseConfigured,
  sanitizePublicRow,
  setApiSecurityHeaders,
  supabaseFetch,
  verifyAdminRequest,
  type ApiRequest,
  type ApiResponse,
  type WallSubmissionRow,
} from '../_lib/wallStore.js';

const ADMIN_AUTH_FAIL_LIMIT = 5;
const FIFTEEN_MIN_MS = 15 * 60 * 1000;

/**
 * One-click authenticated database export (`GET /api/admin/export?format=json|csv`).
 * Returns all Wall submissions with CSV formula-injection neutralization and zero PII.
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  setApiSecurityHeaders(res);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  if (!isDatabaseConfigured() || !getEnvConfig().adminPassword) {
    res.status(503).json({
      error:
        'Export requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and ADMIN_PASSWORD.',
    });
    return;
  }

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
    res.status(429).json({ error: 'Too many failed admin attempts.' });
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

  const dbRes = await supabaseFetch(
    'wall_submissions?select=id,principle,author,country_flag,author_url,status,likes,created_at&order=created_at.desc&limit=5000',
    { method: 'GET' },
  );

  if (!dbRes.ok) {
    res.status(500).json({ error: 'Could not export database rows.' });
    return;
  }

  const rows = ((await dbRes.json()) as WallSubmissionRow[]).map(
    sanitizePublicRow,
  );
  const dateStamp = new Date().toISOString().slice(0, 10);
  const format = req.query?.format === 'csv' ? 'csv' : 'json';

  if (format === 'csv') {
    const header = [
      'id',
      'status',
      'principle',
      'author',
      'country_flag',
      'author_url',
      'likes',
      'created_at',
    ].join(',');
    const lines = rows.map((row) =>
      [
        escapeCsvCell(row.id),
        escapeCsvCell(row.status),
        escapeCsvCell(row.principle),
        escapeCsvCell(row.author),
        escapeCsvCell(row.country_flag ?? ''),
        escapeCsvCell(row.author_url ?? ''),
        escapeCsvCell(row.likes),
        escapeCsvCell(row.created_at),
      ].join(','),
    );
    const csv = [header, ...lines].join('\n') + '\n';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="wall-backup-${dateStamp}.csv"`,
    );
    if (res.send) {
      res.status(200);
      res.send(csv);
    } else {
      res.status(200).json({ csv });
    }
    return;
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="wall-backup-${dateStamp}.json"`,
  );
  res.status(200).json({
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    count: rows.length,
    items: rows,
  });
}
