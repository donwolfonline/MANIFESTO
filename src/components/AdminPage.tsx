import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { ManifestoMeta } from '../lib/markdown';
import {
  deleteSubmission,
  exportWallDatabase,
  fetchAdminSubmissions,
  moderateSubmission,
  type WallEntry,
  type WallSubmissionStatus,
} from '../lib/wallApi';
import { FilmGrain } from './FilmGrain';
import { HoverLink } from './HoverLink';

export interface AdminPageProps {
  meta: ManifestoMeta;
  onNavigateHome: (section?: string) => void;
  onOpenWall: () => void;
}

const SESSION_PASS_KEY = 'working_copy_admin_pass';

export function AdminPage({
  meta,
  onNavigateHome,
  onOpenWall,
}: AdminPageProps) {
  const [password, setPassword] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return window.sessionStorage.getItem(SESSION_PASS_KEY) ?? '';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiMode, setApiMode] = useState<'live' | 'demo'>('live');
  const [entries, setEntries] = useState<WallEntry[]>([]);
  const [statusTab, setStatusTab] = useState<'all' | WallSubmissionStatus>(
    'pending',
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'json' | 'csv' | null>(null);

  const handleExport = async (format: 'json' | 'csv') => {
    setExporting(format);
    await exportWallDatabase(password, format);
    setExporting(null);
  };

  const loadQueue = useCallback(async (pass: string) => {
    setLoading(true);
    setAuthError(null);
    const res = await fetchAdminSubmissions(pass);
    setLoading(false);

    if (!res.ok) {
      setAuthed(false);
      setAuthError(res.error ?? 'Authentication failed.');
      window.sessionStorage.removeItem(SESSION_PASS_KEY);
      return;
    }

    setAuthed(true);
    setPassword(pass);
    setEntries(res.items);
    setApiMode(res.mode);
    window.sessionStorage.setItem(SESSION_PASS_KEY, pass);
  }, []);

  // Restore a saved session exactly once on mount (not on every password change)
  useEffect(() => {
    if (password) {
      loadQueue(password);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only session restore
  }, []);

  const handleLogin = (event: FormEvent) => {
    event.preventDefault();
    if (!passwordInput.trim()) return;
    loadQueue(passwordInput.trim());
  };

  const handleSignOut = () => {
    window.sessionStorage.removeItem(SESSION_PASS_KEY);
    setPassword('');
    setPasswordInput('');
    setAuthed(false);
    setEntries([]);
  };

  const handleStatusChange = async (
    id: string,
    nextStatus: WallSubmissionStatus,
  ) => {
    setBusyId(id);
    const res = await moderateSubmission(password, id, nextStatus);
    setBusyId(null);
    if (res.ok) {
      setEntries((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: nextStatus } : item,
        ),
      );
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    const res = await deleteSubmission(password, id);
    setBusyId(null);
    if (res.ok) {
      setEntries((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const counts = useMemo(
    () => ({
      all: entries.length,
      pending: entries.filter((e) => e.status === 'pending').length,
      approved: entries.filter((e) => e.status === 'approved').length,
      rejected: entries.filter((e) => e.status === 'rejected').length,
    }),
    [entries],
  );

  const filtered = useMemo(() => {
    if (statusTab === 'all') return entries;
    return entries.filter((e) => e.status === statusTab);
  }, [entries, statusTab]);

  return (
    <div
      className="relative min-h-dvh flex flex-col"
      style={{
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)',
      }}
    >
      <FilmGrain />

      <header
        className="sticky top-0 shrink-0 border-b"
        style={{
          height: 'var(--header-height)',
          zIndex: 'var(--z-header)',
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-bg-glass)',
        }}
      >
        <div className="editorial-shell h-full flex items-center justify-between gap-4 font-mono">
          <HoverLink
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigateHome();
            }}
            className="inline-flex items-center gap-2.5 uppercase tracking-[var(--tracking-mono)]"
            style={{
              fontSize: 'var(--text-meta)',
              color: 'var(--color-text)',
            }}
          >
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: 'var(--color-accent)' }}
            />
            <span>~/{meta.filename} · /admin</span>
          </HoverLink>

          <div className="flex items-center gap-5">
            <HoverLink
              href="/wall"
              restingRule
              onClick={(e) => {
                e.preventDefault();
                onOpenWall();
              }}
              className="uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              view /wall
            </HoverLink>

            {authed && (
              <button
                type="button"
                onClick={handleSignOut}
                className="link-draw uppercase tracking-[var(--tracking-micro)] cursor-pointer"
                style={{
                  fontSize: 'var(--text-micro)',
                  color: 'var(--color-text-muted)',
                }}
              >
                sign out
              </button>
            )}
          </div>
        </div>
      </header>

      <main
        aria-label="Wall moderation dashboard"
        className="flex-1 editorial-shell py-10 sm:py-16"
      >
        {!authed ? (
          <div className="max-w-md mx-auto mt-10 border p-6 sm:p-8" style={{ borderColor: 'var(--color-border-strong)', backgroundColor: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
            <p
              className="m-0 mb-2 font-mono uppercase tracking-[var(--tracking-micro)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-accent)',
              }}
            >
              /admin · Moderation Gate
            </p>
            <h1
              className="m-0 mb-6 font-display font-normal"
              style={{
                fontSize: 'clamp(1.85rem, 3.5vw, 2.5rem)',
                lineHeight: 1.05,
                color: 'var(--color-text)',
              }}
            >
              Sign in to review <span className="italic">/wall</span>
            </h1>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="admin-password"
                  className="block mb-2 font-mono uppercase tracking-[var(--tracking-micro)]"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Admin Password
                </label>
                <input
                  id="admin-password"
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter ADMIN_PASSWORD"
                  className="w-full px-3.5 py-2.5 border bg-[var(--color-bg-deep)] font-mono text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
                  style={{
                    borderColor: 'var(--color-border-strong)',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: 'var(--text-meta)',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 border font-mono uppercase tracking-[var(--tracking-micro)] cursor-pointer disabled:opacity-50"
                style={{
                  fontSize: 'var(--text-micro)',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: 'var(--color-accent)',
                  borderColor: 'var(--color-accent)',
                  color: 'var(--color-accent-ink)',
                }}
              >
                {loading ? 'verifying…' : 'unlock queue'}
              </button>

              {authError && (
                <p
                  role="alert"
                  className="m-0 p-3 border font-mono"
                  style={{
                    borderColor: 'var(--color-status-error)',
                    backgroundColor: 'rgba(244, 114, 107, 0.12)',
                    color: 'var(--color-status-error)',
                    fontSize: 'var(--text-micro)',
                    borderRadius: 'var(--radius-xs)',
                  }}
                >
                  {authError}
                </p>
              )}
            </form>
          </div>
        ) : (
          <div className="max-w-[64rem] mx-auto space-y-8">
            <div
              className="pb-6 border-b flex flex-wrap items-end justify-between gap-4"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div>
                <p
                  className="m-0 mb-2 font-mono uppercase tracking-[var(--tracking-micro)]"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: 'var(--color-accent)',
                  }}
                >
                  /admin · {apiMode === 'live' ? 'Supabase Live' : 'Local Preview Mode'}
                </p>
                <h1
                  className="m-0 font-display font-normal"
                  style={{
                    fontSize: 'clamp(2.1rem, 4.5vw, 3.5rem)',
                    lineHeight: 0.98,
                  }}
                >
                  Moderation <span className="italic">Queue</span>
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 font-mono">
                  <button
                    type="button"
                    disabled={exporting !== null}
                    onClick={() => handleExport('json')}
                    className="px-3 py-1.5 border uppercase tracking-[var(--tracking-micro)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer disabled:opacity-50"
                    style={{
                      fontSize: 'var(--text-micro)',
                      borderRadius: 'var(--radius-xs)',
                      borderColor: 'var(--color-border-strong)',
                      color: 'var(--color-text)',
                    }}
                  >
                    {exporting === 'json' ? 'exporting…' : 'export json ↓'}
                  </button>
                  <button
                    type="button"
                    disabled={exporting !== null}
                    onClick={() => handleExport('csv')}
                    className="px-3 py-1.5 border uppercase tracking-[var(--tracking-micro)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer disabled:opacity-50"
                    style={{
                      fontSize: 'var(--text-micro)',
                      borderRadius: 'var(--radius-xs)',
                      borderColor: 'var(--color-border-strong)',
                      color: 'var(--color-text)',
                    }}
                  >
                    {exporting === 'csv' ? 'exporting…' : 'export csv ↓'}
                  </button>
                </div>

                <div
                  role="group"
                  aria-label="Filter submissions by moderation status"
                  className="flex flex-wrap gap-2 font-mono"
                >
                {(['pending', 'approved', 'rejected', 'all'] as const).map(
                  (tab) => {
                    const active = statusTab === tab;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setStatusTab(tab)}
                        aria-pressed={active}
                        className="px-3 py-1.5 border uppercase tracking-[var(--tracking-micro)] cursor-pointer"
                        style={{
                          fontSize: 'var(--text-micro)',
                          borderRadius: 'var(--radius-xs)',
                          backgroundColor: active
                            ? 'var(--color-text)'
                            : 'transparent',
                          borderColor: active
                            ? 'var(--color-text)'
                            : 'var(--color-border)',
                          color: active
                            ? 'var(--color-bg)'
                            : 'var(--color-text-secondary)',
                        }}
                      >
                        {tab} ({counts[tab]})
                      </button>
                    );
                  },
                )}
                </div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <p
                className="font-mono"
                style={{
                  fontSize: 'var(--text-meta)',
                  color: 'var(--color-text-muted)',
                }}
              >
                Nothing in the &ldquo;{statusTab}&rdquo; queue.
              </p>
            ) : (
              <ol className="list-none p-0 m-0 space-y-4">
                {filtered.map((item) => {
                  const isBusy = busyId === item.id;
                  return (
                    <li
                      key={item.id}
                      className="border p-5 flex flex-col md:flex-row md:items-center justify-between gap-5"
                      style={{
                        borderColor: 'var(--color-border-strong)',
                        backgroundColor: 'var(--color-bg-elevated)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <div className="space-y-2.5 min-w-0">
                        <div
                          className="flex flex-wrap items-center gap-2.5 font-mono uppercase tracking-[var(--tracking-micro)]"
                          style={{
                            fontSize: 'var(--text-micro)',
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          <span
                            style={{
                              color:
                                item.status === 'approved'
                                  ? 'var(--color-status-ok)'
                                  : item.status === 'rejected'
                                    ? 'var(--color-status-error)'
                                    : 'var(--color-accent)',
                            }}
                          >
                            [{item.status}]
                          </span>
                          <span>
                            {item.country_flag ? `${item.country_flag} ` : ''}
                            {item.author}
                          </span>
                          <span>·</span>
                          <span>{item.created_at.slice(0, 10)}</span>
                          <span>·</span>
                          <span>♥ {item.likes}</span>
                        </div>

                        <p
                          className="m-0 font-body"
                          style={{
                            fontSize: 'var(--text-body)',
                            lineHeight: 1.5,
                            color: 'var(--color-text)',
                          }}
                        >
                          &ldquo;{item.principle}&rdquo;
                        </p>

                        {item.author_url && (
                          <p
                            className="m-0 font-mono truncate"
                            style={{
                              fontSize: 'var(--text-micro)',
                              color: 'var(--color-text-muted)',
                            }}
                          >
                            link: {item.author_url}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0 font-mono">
                        {item.status !== 'approved' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleStatusChange(item.id, 'approved')}
                            className="px-3 py-1.5 border uppercase tracking-[var(--tracking-micro)] cursor-pointer disabled:opacity-50"
                            style={{
                              fontSize: 'var(--text-micro)',
                              borderRadius: 'var(--radius-xs)',
                              borderColor: 'var(--color-status-ok)',
                              color: 'var(--color-status-ok)',
                              backgroundColor: 'rgba(110, 196, 156, 0.12)',
                            }}
                          >
                            approve
                          </button>
                        )}

                        {item.status !== 'rejected' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleStatusChange(item.id, 'rejected')}
                            className="px-3 py-1.5 border uppercase tracking-[var(--tracking-micro)] cursor-pointer disabled:opacity-50"
                            style={{
                              fontSize: 'var(--text-micro)',
                              borderRadius: 'var(--radius-xs)',
                              borderColor: 'var(--color-border-strong)',
                              color: 'var(--color-text-secondary)',
                            }}
                          >
                            reject
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleDelete(item.id)}
                          className="px-3 py-1.5 border uppercase tracking-[var(--tracking-micro)] cursor-pointer disabled:opacity-50"
                          style={{
                            fontSize: 'var(--text-micro)',
                            borderRadius: 'var(--radius-xs)',
                            borderColor: 'var(--color-status-error)',
                            color: 'var(--color-status-error)',
                          }}
                        >
                          delete
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
