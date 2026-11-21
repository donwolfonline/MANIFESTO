import {
  isDatabaseConfigured,
  setApiSecurityHeaders,
  supabaseFetch,
  type ApiRequest,
  type ApiResponse,
} from './_lib/wallStore';

/**
 * Lightweight uptime health check endpoint (`GET /api/health`).
 * Verifies serverless runtime + Supabase database reachability without exposing secrets.
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  setApiSecurityHeaders(res);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.status(405).json({ ok: false, error: 'Method not allowed.' });
    return;
  }

  let db: 'connected' | 'not-configured' | 'error' = 'not-configured';

  if (isDatabaseConfigured()) {
    try {
      const ping = await supabaseFetch(
        'wall_submissions?select=id&limit=1',
        { method: 'GET' },
      );
      db = ping.ok ? 'connected' : 'error';
    } catch {
      db = 'error';
    }
  }

  const healthy = db !== 'error';
  res.status(healthy ? 200 : 503).json({
    ok: healthy,
    service: 'working-copy-manifesto',
    db,
    timestamp: new Date().toISOString(),
  });
}
