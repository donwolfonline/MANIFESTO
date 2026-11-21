import {
  applyRateLimitHeaders,
  checkAndRecordRateLimit,
  getClientIp,
  isDatabaseConfigured,
  parseJsonBodySafe,
  setApiSecurityHeaders,
  supabaseFetch,
  type ApiRequest,
  type ApiResponse,
} from '../_lib/wallStore';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIKE_LIMIT_PER_HOUR = 60;
const ONE_HOUR_MS = 60 * 60 * 1000;

export default async function handler(req: ApiRequest, res: ApiResponse) {
  setApiSecurityHeaders(res);

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  if (!isDatabaseConfigured()) {
    res.status(503).json({ error: 'Wall database is not configured.' });
    return;
  }

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

  const ip = getClientIp(req);
  const rate = await checkAndRecordRateLimit(
    ip,
    'like',
    LIKE_LIMIT_PER_HOUR,
    ONE_HOUR_MS,
  );
  applyRateLimitHeaders(res, rate);

  if (!rate.allowed) {
    res.status(429).json({ error: 'Slow down—too many likes right now.' });
    return;
  }

  const rpcRes = await supabaseFetch('rpc/increment_wall_like', {
    method: 'POST',
    body: JSON.stringify({ submission_id: id }),
  });

  if (!rpcRes.ok) {
    res.status(500).json({ error: 'Could not update like count.' });
    return;
  }

  const likes = (await rpcRes.json()) as number | null;
  if (typeof likes !== 'number') {
    res.status(404).json({ error: 'Approved submission not found.' });
    return;
  }

  res.status(200).json({ id, likes });
}
