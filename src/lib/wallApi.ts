export type WallSubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface WallEntry {
  id: string;
  principle: string;
  author: string;
  country_flag: string | null;
  author_url: string | null;
  status: WallSubmissionStatus;
  likes: number;
  created_at: string;
}

export interface SubmitPrinciplePayload {
  principle: string;
  author: string;
  countryFlag: string;
  link: string;
  /** Hidden honeypot field — must stay empty for real users */
  website_confirm: string;
  /** Timestamp (ms) recorded when the form mounted for server-side time-to-submit check */
  form_started_at?: number;
}

/**
 * Validates that an external link uses strictly http: or https: before rendering an anchor.
 */
export function safeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

export const COUNTRY_FLAG_OPTIONS: { flag: string; label: string }[] = [
  { flag: '', label: 'No flag (optional)' },
  { flag: '🇺🇸', label: '🇺🇸 United States' },
  { flag: '🇬🇧', label: '🇬🇧 United Kingdom' },
  { flag: '🇨🇦', label: '🇨🇦 Canada' },
  { flag: '🇩🇪', label: '🇩🇪 Germany' },
  { flag: '🇫🇷', label: '🇫🇷 France' },
  { flag: '🇳🇱', label: '🇳🇱 Netherlands' },
  { flag: '🇸🇪', label: '🇸🇪 Sweden' },
  { flag: '🇵🇱', label: '🇵🇱 Poland' },
  { flag: '🇪🇸', label: '🇪🇸 Spain' },
  { flag: '🇧🇷', label: '🇧🇷 Brazil' },
  { flag: '🇯🇵', label: '🇯🇵 Japan' },
  { flag: '🇰🇷', label: '🇰🇷 South Korea' },
  { flag: '🇮🇳', label: '🇮🇳 India' },
  { flag: '🇦🇺', label: '🇦🇺 Australia' },
  { flag: '🇳🇬', label: '🇳🇬 Nigeria' },
  { flag: '🇲🇽', label: '🇲🇽 Mexico' },
  { flag: '🌍', label: '🌍 Earth' },
];

const DEMO_STORE_KEY = 'working_copy_wall_demo_v1';
const LIKED_IDS_KEY = 'working_copy_wall_liked_ids';
const LAST_SUBMIT_KEY = 'working_copy_wall_last_submit';
export const CLIENT_COOLDOWN_MS = 60_000;

const SEEDED_WALL_ENTRIES: WallEntry[] = [
  {
    id: 'seed-01',
    principle:
      'Write the commit message for the teammate who will read it during a 2am rollback.',
    author: 'maya_k',
    country_flag: '🇨🇦',
    author_url: null,
    status: 'approved',
    likes: 34,
    created_at: '2026-11-18T14:20:00Z',
  },
  {
    id: 'seed-02',
    principle:
      'If a script needs a twelve-step wiki to run locally, the script is the bug.',
    author: 'tomasz',
    country_flag: '🇵🇱',
    author_url: null,
    status: 'approved',
    likes: 28,
    created_at: '2026-11-17T09:10:00Z',
  },
  {
    id: 'seed-03',
    principle: 'Name booleans like a yes/no question, never "flag" or "mode".',
    author: 'kenji',
    country_flag: '🇯🇵',
    author_url: null,
    status: 'approved',
    likes: 41,
    created_at: '2026-11-16T18:45:00Z',
  },
  {
    id: 'seed-04',
    principle:
      'Leave one kind, specific sentence in every pull request review before mentioning a nit.',
    author: 'nadia',
    country_flag: '🇬🇧',
    author_url: null,
    status: 'approved',
    likes: 52,
    created_at: '2026-11-15T11:30:00Z',
  },
  {
    id: 'seed-05',
    principle:
      'A fifteen-minute walk solves more bugs than a third cup of burnt office coffee.',
    author: '@diego_dev',
    country_flag: '🇲🇽',
    author_url: null,
    status: 'approved',
    likes: 39,
    created_at: '2026-11-14T20:05:00Z',
  },
  {
    id: 'seed-06',
    principle:
      'Delete commented-out code; git remembers what you tried so your teammates do not have to.',
    author: 'freja',
    country_flag: '🇸🇪',
    author_url: null,
    status: 'approved',
    likes: 47,
    created_at: '2026-11-13T16:12:00Z',
  },
  {
    id: 'seed-07',
    principle:
      'Before optimizing a query, measure it twice and read the execution plan once.',
    author: 'arjun',
    country_flag: '🇮🇳',
    author_url: null,
    status: 'approved',
    likes: 23,
    created_at: '2026-11-12T08:40:00Z',
  },
  {
    id: 'seed-08',
    principle:
      'Admitting "I have never touched this subsystem" in standup saves everyone half a sprint.',
    author: 'chidi',
    country_flag: '🇳🇬',
    author_url: null,
    status: 'approved',
    likes: 61,
    created_at: '2026-11-11T13:15:00Z',
  },
  {
    id: 'seed-09',
    principle:
      'Boring tools that behave predictably on Friday at 4pm are a gift to your weekend.',
    author: 'lena_b',
    country_flag: '🇩🇪',
    author_url: null,
    status: 'approved',
    likes: 36,
    created_at: '2026-11-10T17:50:00Z',
  },
  {
    id: 'seed-pending-01',
    principle:
      'Keep your error messages honest: say what failed, where it failed, and what to check next.',
    author: 'samir',
    country_flag: '🇧🇷',
    author_url: 'https://example.com',
    status: 'pending',
    likes: 0,
    created_at: '2026-11-19T12:00:00Z',
  },
];

function readDemoStore(): WallEntry[] {
  try {
    const raw = window.localStorage.getItem(DEMO_STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WallEntry[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Ignore storage read errors
  }
  return SEEDED_WALL_ENTRIES;
}

function writeDemoStore(entries: WallEntry[]) {
  try {
    window.localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(entries));
  } catch {
    // Ignore storage write errors
  }
}

export function getLikedIds(): Set<string> {
  try {
    const raw = window.localStorage.getItem(LIKED_IDS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function rememberLikedId(id: string) {
  try {
    const set = getLikedIds();
    set.add(id);
    window.localStorage.setItem(LIKED_IDS_KEY, JSON.stringify([...set]));
  } catch {
    // Ignore storage errors
  }
}

export function getRemainingCooldownMs(): number {
  try {
    const last = Number(window.localStorage.getItem(LAST_SUBMIT_KEY) || '0');
    const remaining = CLIENT_COOLDOWN_MS - (Date.now() - last);
    return remaining > 0 ? remaining : 0;
  } catch {
    return 0;
  }
}

export function recordClientSubmitTimestamp() {
  try {
    window.localStorage.setItem(LAST_SUBMIT_KEY, String(Date.now()));
  } catch {
    // Ignore storage errors
  }
}

export function validateWallForm(payload: SubmitPrinciplePayload): string | null {
  const principle = payload.principle.replace(/\s+/g, ' ').trim();
  const author = payload.author.replace(/\s+/g, ' ').trim();
  const link = payload.link.trim();

  if (principle.length < 8) {
    return 'Write at least 8 characters so the principle stands on its own.';
  }
  if (principle.length > 140) {
    return 'Keep your principle within 140 characters.';
  }
  if (author.length < 2 || author.length > 40) {
    return 'Enter a first name or handle between 2 and 40 characters.';
  }
  if (link) {
    const withProto = /^https?:\/\//i.test(link) ? link : `https://${link}`;
    try {
      const parsed = new URL(withProto);
      if (
        (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
        !parsed.hostname.includes('.')
      ) {
        return 'Optional link must be a valid http:// or https:// URL.';
      }
    } catch {
      return 'Optional link does not look like a valid URL.';
    }
  }
  return null;
}

function isUnavailableApiResponse(res: Response): boolean {
  const contentType = res.headers.get('content-type') ?? '';
  return (
    res.status === 404 ||
    res.status === 503 ||
    !contentType.includes('application/json')
  );
}

export async function fetchApprovedWall(): Promise<{
  items: WallEntry[];
  mode: 'live' | 'demo';
}> {
  try {
    const res = await fetch('/api/wall', { headers: { Accept: 'application/json' } });
    if (res.ok && !isUnavailableApiResponse(res)) {
      const data = (await res.json()) as { items: WallEntry[] };
      return { items: data.items ?? [], mode: 'live' };
    }
  } catch {
    // Fall back to local preview store when serverless API is unavailable
  }

  const demo = readDemoStore().filter((entry) => entry.status === 'approved');
  return { items: demo, mode: 'demo' };
}

export async function submitWallPrinciple(
  payload: SubmitPrinciplePayload,
): Promise<{ ok: boolean; message: string; mode: 'live' | 'demo' }> {
  try {
    const res = await fetch('/api/wall', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!isUnavailableApiResponse(res)) {
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        return {
          ok: false,
          message: data.error ?? 'Could not submit right now.',
          mode: 'live',
        };
      }
      return {
        ok: true,
        message:
          data.message ??
          'Received—pending moderation before appearing publicly.',
        mode: 'live',
      };
    }
  } catch {
    // Fall back to local demo store
  }

  // Silent honeypot no-op in demo mode too
  if (payload.website_confirm.trim().length > 0) {
    return {
      ok: true,
      message: 'Received—your principle is queued for review.',
      mode: 'demo',
    };
  }

  const normalizedUrl = payload.link.trim()
    ? /^https?:\/\//i.test(payload.link.trim())
      ? payload.link.trim()
      : `https://${payload.link.trim()}`
    : null;

  const current = readDemoStore();
  const nextEntry: WallEntry = {
    id: `local-${Date.now()}`,
    principle: payload.principle.replace(/\s+/g, ' ').trim(),
    author: payload.author.replace(/\s+/g, ' ').trim(),
    country_flag: payload.countryFlag || null,
    author_url: normalizedUrl,
    status: 'pending',
    likes: 0,
    created_at: new Date().toISOString(),
  };

  writeDemoStore([nextEntry, ...current]);
  return {
    ok: true,
    message:
      'Saved locally as pending—open /admin (password "demo") to approve it in preview mode.',
    mode: 'demo',
  };
}

export async function likeWallCard(
  id: string,
): Promise<{ likes: number | null; mode: 'live' | 'demo' }> {
  try {
    const res = await fetch('/api/wall/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok && !isUnavailableApiResponse(res)) {
      const data = (await res.json()) as { likes: number };
      return { likes: data.likes, mode: 'live' };
    }
  } catch {
    // Local demo fallback
  }

  const current = readDemoStore();
  let updatedLikes: number | null = null;
  const next = current.map((entry) => {
    if (entry.id !== id) return entry;
    updatedLikes = entry.likes + 1;
    return { ...entry, likes: updatedLikes };
  });
  writeDemoStore(next);
  return { likes: updatedLikes, mode: 'demo' };
}

/* -------------------- Admin Moderation Helpers -------------------- */

export async function fetchAdminSubmissions(
  password: string,
): Promise<{ ok: boolean; items: WallEntry[]; error?: string; mode: 'live' | 'demo' }> {
  try {
    const res = await fetch('/api/admin/submissions?status=all', {
      headers: {
        Authorization: `Bearer ${password}`,
        Accept: 'application/json',
      },
    });

    if (!isUnavailableApiResponse(res)) {
      const data = (await res.json()) as { items?: WallEntry[]; error?: string };
      if (!res.ok) {
        return {
          ok: false,
          items: [],
          error: data.error ?? 'Unauthorized.',
          mode: 'live',
        };
      }
      return { ok: true, items: data.items ?? [], mode: 'live' };
    }
  } catch {
    // Local preview mode fallback
  }

  if (password !== 'demo') {
    return {
      ok: false,
      items: [],
      error: 'Local preview mode detected — enter "demo" to test moderation locally.',
      mode: 'demo',
    };
  }

  return { ok: true, items: readDemoStore(), mode: 'demo' };
}

export async function moderateSubmission(
  password: string,
  id: string,
  status: WallSubmissionStatus,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/admin/submissions', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${password}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, status }),
    });

    if (!isUnavailableApiResponse(res)) {
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        return { ok: false, error: data.error ?? 'Update failed.' };
      }
      return { ok: true };
    }
  } catch {
    // Demo fallback
  }

  const next = readDemoStore().map((entry) =>
    entry.id === id ? { ...entry, status } : entry,
  );
  writeDemoStore(next);
  return { ok: true };
}

export async function deleteSubmission(
  password: string,
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/admin/submissions', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${password}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id }),
    });

    if (!isUnavailableApiResponse(res)) {
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        return { ok: false, error: data.error ?? 'Delete failed.' };
      }
      return { ok: true };
    }
  } catch {
    // Demo fallback
  }

  const next = readDemoStore().filter((entry) => entry.id !== id);
  writeDemoStore(next);
  return { ok: true };
}

function escapeCsvCellClient(val: string | number | null | undefined): string {
  let str = val == null ? '' : String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Triggers a one-click JSON or CSV export of the Wall database (live API or local demo store).
 */
export async function exportWallDatabase(
  password: string,
  format: 'json' | 'csv',
): Promise<{ ok: boolean; error?: string }> {
  const dateStamp = new Date().toISOString().slice(0, 10);
  const filename = `wall-backup-${dateStamp}.${format}`;

  const triggerDownload = (content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  try {
    const res = await fetch(`/api/admin/export?format=${format}`, {
      headers: { Authorization: `Bearer ${password}` },
    });
    if (res.ok && res.status !== 404 && res.status !== 503) {
      const text = await res.text();
      if (!text.trim().startsWith('<!doctype html')) {
        triggerDownload(
          text,
          format === 'csv'
            ? 'text/csv;charset=utf-8'
            : 'application/json;charset=utf-8',
        );
        return { ok: true };
      }
    }
  } catch {
    // Fall back to local demo store export
  }

  const rows = readDemoStore();
  if (format === 'csv') {
    const header =
      'id,status,principle,author,country_flag,author_url,likes,created_at';
    const body = rows.map((r) =>
      [
        escapeCsvCellClient(r.id),
        escapeCsvCellClient(r.status),
        escapeCsvCellClient(r.principle),
        escapeCsvCellClient(r.author),
        escapeCsvCellClient(r.country_flag ?? ''),
        escapeCsvCellClient(r.author_url ?? ''),
        escapeCsvCellClient(r.likes),
        escapeCsvCellClient(r.created_at),
      ].join(','),
    );
    triggerDownload([header, ...body].join('\n') + '\n', 'text/csv;charset=utf-8');
    return { ok: true };
  }

  triggerDownload(
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        schemaVersion: 1,
        count: rows.length,
        items: rows,
      },
      null,
      2,
    ),
    'application/json;charset=utf-8',
  );
  return { ok: true };
}
