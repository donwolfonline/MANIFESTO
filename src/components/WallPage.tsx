import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ManifestoMeta } from '../lib/markdown';
import { getPreloadHandlers } from '../lib/routePreload';
import { usePrefersReducedMotion } from '../lib/useViewportActivity';
import {
  COUNTRY_FLAG_OPTIONS,
  fetchApprovedWall,
  getLikedIds,
  getRemainingCooldownMs,
  likeWallCard,
  recordClientSubmitTimestamp,
  rememberLikedId,
  safeExternalUrl,
  submitWallPrinciple,
  validateWallForm,
  type WallEntry,
} from '../lib/wallApi';
import { FilmGrain } from './FilmGrain';
import { HoverLink } from './HoverLink';
import { RouteEmptyState, RouteErrorState } from './RouteStateBox';

export interface WallPageProps {
  meta: ManifestoMeta;
  onNavigateHome: (section?: string) => void;
  onOpenTerminal: () => void;
  onOpenAdmin: () => void;
  onOpenPrivacy?: () => void;
}

const MAX_PRINCIPLE_LEN = 140;

function HeartLikeButton({
  likes,
  liked,
  onLike,
  prefersReducedMotion,
}: {
  likes: number;
  liked: boolean;
  onLike: () => void;
  prefersReducedMotion: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onLike}
      disabled={liked}
      aria-pressed={liked}
      className="group relative inline-flex items-center gap-1.5 px-2 py-1 border font-mono tabular-nums transition-colors cursor-pointer disabled:cursor-default"
      style={{
        fontSize: 'var(--text-micro)',
        borderRadius: 'var(--radius-xs)',
        borderColor: liked ? 'var(--color-accent)' : 'var(--color-border)',
        backgroundColor: liked ? 'var(--color-accent-soft)' : 'transparent',
        color: liked ? 'var(--color-accent)' : 'var(--color-text-muted)',
      }}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill={liked ? 'var(--color-accent)' : 'none'}
        stroke={liked ? 'var(--color-accent)' : 'currentColor'}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={liked && !prefersReducedMotion ? 'heart-pop' : undefined}
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
      <span className="sr-only">
        {liked ? 'Liked, ' : 'Like this principle, '}
      </span>
      <span>{likes}</span>
    </button>
  );
}

export function WallPage({
  meta,
  onNavigateHome,
  onOpenTerminal,
  onOpenAdmin,
  onOpenPrivacy,
}: WallPageProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const formLoadedAtRef = useRef<number>(Date.now());

  const [entries, setEntries] = useState<WallEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [apiMode, setApiMode] = useState<'live' | 'demo'>('live');
  const [likedIds, setLikedIds] = useState<Set<string>>(() => getLikedIds());

  // Form state
  const [principle, setPrinciple] = useState('');
  const [author, setAuthor] = useState('');
  const [countryFlag, setCountryFlag] = useState('');
  const [link, setLink] = useState('');
  // Hidden honeypot anti-spam trap
  const [honeypot, setHoneypot] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const loadWallEntries = () => {
    setLoading(true);
    setLoadError(false);
    fetchApprovedWall()
      .then(({ items, mode }) => {
        setEntries(items);
        setApiMode(mode);
        setLoading(false);
      })
      .catch(() => {
        setLoadError(true);
        setLoading(false);
      });
  };

  useEffect(() => {
    let active = true;
    fetchApprovedWall()
      .then(({ items, mode }) => {
        if (!active) return;
        setEntries(items);
        setApiMode(mode);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLoadError(true);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleLike = async (entryId: string) => {
    if (likedIds.has(entryId)) return;

    // Optimistic heart update
    rememberLikedId(entryId);
    setLikedIds((prev) => new Set([...prev, entryId]));
    setEntries((prev) =>
      prev.map((item) =>
        item.id === entryId ? { ...item, likes: item.likes + 1 } : item,
      ),
    );

    const res = await likeWallCard(entryId);
    if (typeof res.likes === 'number') {
      setEntries((prev) =>
        prev.map((item) =>
          item.id === entryId ? { ...item, likes: res.likes! } : item,
        ),
      );
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const remainingMs = getRemainingCooldownMs();
    if (remainingMs > 0) {
      const secs = Math.ceil(remainingMs / 1000);
      setFormError(
        `Please wait ${secs}s before sending another principle (rate limit active).`,
      );
      return;
    }

    const payload = {
      principle,
      author,
      countryFlag,
      link,
      website_confirm: honeypot,
      form_started_at: formLoadedAtRef.current,
    };

    const validationError = validateWallForm(payload);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSubmitting(true);
    const result = await submitWallPrinciple(payload);
    setSubmitting(false);

    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    recordClientSubmitTimestamp();
    formLoadedAtRef.current = Date.now();
    setPrinciple('');
    setAuthor('');
    setCountryFlag('');
    setLink('');
    setHoneypot('');
    setApiMode(result.mode);
    setFormSuccess(result.message);
  };

  const charsUsed = principle.length;
  const nearLimit = charsUsed >= 120;
  const overLimit = charsUsed > MAX_PRINCIPLE_LEN;

  return (
    <div
      className="relative min-h-dvh flex flex-col"
      style={{
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)',
      }}
    >
      <FilmGrain />

      {/* Sticky top bar */}
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
            <span>~/{meta.filename}</span>
          </HoverLink>

          <div className="flex items-center gap-5 sm:gap-7">
            <HoverLink
              href="/terminal"
              {...getPreloadHandlers('terminal')}
              onClick={(e) => {
                e.preventDefault();
                onOpenTerminal();
              }}
              className="hidden sm:inline-flex items-center gap-1.5 uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <span aria-hidden="true" style={{ color: 'var(--color-accent)' }}>
                &gt;_
              </span>
              <span>/terminal</span>
            </HoverLink>

            <HoverLink
              href="/#read"
              restingRule
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome('read');
              }}
              className="uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              ← back to editorial
            </HoverLink>
          </div>
        </div>
      </header>

      <main
        aria-label="Community principles wall"
        className="flex-1 editorial-shell py-10 sm:py-16"
      >
        {/* Header + Submission Panel */}
        <div
          className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 pb-14 border-b items-start"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {/* Intro column */}
          <div className="lg:col-span-5 space-y-5">
            <div data-legacy-title-block="true" className="space-y-5">
              <p
                className="m-0 font-mono uppercase tracking-[var(--tracking-micro)]"
                style={{
                  fontSize: 'var(--text-micro)',
                  color: 'var(--color-accent)',
                }}
              >
                /wall · Community Margin Notes ({entries.length})
              </p>
              <h1
                className="m-0 font-display font-normal"
                style={{
                  fontSize: 'clamp(2.5rem, 6vw, 4.75rem)',
                  lineHeight: 0.94,
                  letterSpacing: 'var(--tracking-display)',
                  color: 'var(--color-text)',
                }}
              >
                The Engineer’s <span className="italic">Wall</span>
                <span style={{ color: 'var(--color-accent)' }}>.</span>
              </h1>
              <p
                className="m-0 font-body"
                style={{
                  maxWidth: '46ch',
                  fontSize: 'var(--text-body)',
                  lineHeight: 'var(--leading-body)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Pin one short principle you have earned the hard way. Every note is read by a human before it goes up on the wall.
              </p>
            </div>

            <div
              className="p-3 border font-mono flex flex-wrap items-center justify-between gap-2"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg-elevated)',
                borderRadius: 'var(--radius-xs)',
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-muted)',
              }}
            >
              <span>
                {loading
                  ? 'connecting wall queue…'
                  : apiMode === 'demo'
                    ? 'local preview (browser storage)'
                    : 'live moderated queue'}
              </span>
              <button
                type="button"
                onClick={onOpenAdmin}
                className="link-draw uppercase tracking-[var(--tracking-micro)] cursor-pointer"
                style={{ color: 'var(--color-accent)' }}
              >
                open /admin →
              </button>
            </div>
          </div>

          {/* Submission Form */}
          <form
            onSubmit={handleSubmit}
            noValidate
            className="lg:col-span-7 border p-5 sm:p-7 space-y-5"
            style={{
              borderColor: 'var(--color-border-strong)',
              backgroundColor: 'var(--color-bg-elevated)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {/* Principle textarea + live 140-char counter */}
            <div>
              <div className="flex items-baseline justify-between mb-2 font-mono">
                <label
                  htmlFor="wall-principle"
                  className="uppercase tracking-[var(--tracking-micro)]"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: 'var(--color-text)',
                  }}
                >
                  Your one-line principle *
                </label>
                <span
                  aria-live="polite"
                  className="tabular-nums"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: overLimit
                      ? 'var(--color-status-error)'
                      : nearLimit
                        ? 'var(--color-accent)'
                        : 'var(--color-text-muted)',
                  }}
                >
                  {charsUsed} / {MAX_PRINCIPLE_LEN}
                </span>
              </div>

              <textarea
                id="wall-principle"
                required
                rows={3}
                maxLength={MAX_PRINCIPLE_LEN}
                value={principle}
                onChange={(e) => setPrinciple(e.target.value)}
                placeholder="Write a single concrete rule you want future-you to remember…"
                className="w-full p-3.5 border bg-[var(--color-bg-deep)] font-body text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
                style={{
                  borderColor: overLimit
                    ? 'var(--color-status-error)'
                    : 'var(--color-border-strong)',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: 'var(--text-body)',
                  lineHeight: 1.5,
                }}
              />
            </div>

            {/* Name/handle + optional flag + optional link */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="wall-author"
                  className="block mb-2 font-mono uppercase tracking-[var(--tracking-micro)]"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: 'var(--color-text)',
                  }}
                >
                  Name or handle *
                </label>
                <input
                  id="wall-author"
                  type="text"
                  required
                  maxLength={40}
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="maya / @handle"
                  className="w-full px-3 py-2 border bg-[var(--color-bg-deep)] font-mono text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
                  style={{
                    borderColor: 'var(--color-border-strong)',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: 'var(--text-meta)',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="wall-flag"
                  className="block mb-2 font-mono uppercase tracking-[var(--tracking-micro)]"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Flag (optional)
                </label>
                <select
                  id="wall-flag"
                  value={countryFlag}
                  onChange={(e) => setCountryFlag(e.target.value)}
                  className="w-full px-3 py-2 border bg-[var(--color-bg-deep)] font-mono text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
                  style={{
                    borderColor: 'var(--color-border-strong)',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: 'var(--text-meta)',
                  }}
                >
                  {COUNTRY_FLAG_OPTIONS.map((opt) => (
                    <option key={opt.label} value={opt.flag}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="wall-link"
                  className="block mb-2 font-mono uppercase tracking-[var(--tracking-micro)]"
                  style={{
                    fontSize: 'var(--text-micro)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Link (optional)
                </label>
                <input
                  id="wall-link"
                  type="url"
                  maxLength={200}
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://yoursite.dev"
                  className="w-full px-3 py-2 border bg-[var(--color-bg-deep)] font-mono text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
                  style={{
                    borderColor: 'var(--color-border-strong)',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: 'var(--text-meta)',
                  }}
                />
              </div>
            </div>

            {/* Hidden anti-spam honeypot field — invisible to humans & screen readers */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '-9999px',
                width: '1px',
                height: '1px',
                overflow: 'hidden',
              }}
            >
              <label htmlFor="wall-website-confirm">Leave this blank</label>
              <input
                id="wall-website-confirm"
                name="website_confirm"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            {/* Public visibility & privacy notice + Submit button */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p
                className="m-0 font-mono leading-relaxed"
                style={{
                  maxWidth: '48ch',
                  fontSize: 'var(--text-micro)',
                  color: 'var(--color-text-muted)',
                }}
              >
                Submissions are reviewed before publishing and become{' '}
                <strong style={{ color: 'var(--color-text)' }}>public</strong>{' '}
                once approved (principle, name/handle, optional flag &amp; link).
                Do not share private contact info.{' '}
                {onOpenPrivacy && (
                  <a
                    href="/privacy"
                    {...getPreloadHandlers('privacy')}
                    onClick={(e) => {
                      e.preventDefault();
                      onOpenPrivacy();
                    }}
                    className="link-draw link-draw--resting transition-colors hover:text-[var(--color-accent)]"
                    style={{ color: 'var(--color-text)' }}
                  >
                    Privacy details
                  </a>
                )}
              </p>

              <button
                type="submit"
                disabled={submitting || overLimit}
                className="shrink-0 px-5 py-2.5 border font-mono uppercase tracking-[var(--tracking-micro)] transition-opacity cursor-pointer disabled:opacity-50"
                style={{
                  fontSize: 'var(--text-micro)',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: 'var(--color-accent)',
                  borderColor: 'var(--color-accent)',
                  color: 'var(--color-accent-ink)',
                }}
              >
                {submitting ? 'sending…' : 'submit note'}
              </button>
            </div>

            {formError && (
              <p
                role="alert"
                className="m-0 px-3.5 py-2.5 border font-mono"
                style={{
                  borderColor: 'var(--color-status-error)',
                  backgroundColor: 'rgba(244, 114, 107, 0.12)',
                  color: 'var(--color-status-error)',
                  fontSize: 'var(--text-micro)',
                  borderRadius: 'var(--radius-xs)',
                }}
              >
                {formError}
              </p>
            )}

            {formSuccess && (
              <p
                role="status"
                className="m-0 px-3.5 py-2.5 border font-mono"
                style={{
                  borderColor: 'var(--color-status-ok)',
                  backgroundColor: 'rgba(110, 196, 156, 0.12)',
                  color: 'var(--color-status-ok)',
                  fontSize: 'var(--text-micro)',
                  borderRadius: 'var(--radius-xs)',
                }}
              >
                ✓ {formSuccess}
              </p>
            )}
          </form>
        </div>

        {/* Masonry Wall of Approved Cards (single column on mobile / narrow containers, 2-4 cols wider) */}
        <section aria-label="Approved community principles" className="cq-wall pt-12">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className="skeleton-outline-block p-6 space-y-4"
                  style={{ minHeight: '9.5rem', aspectRatio: '16 / 10' }}
                >
                  <div className="skeleton-outline-block h-4 w-4/5" />
                  <div className="skeleton-outline-block h-4 w-2/3" />
                  <div className="skeleton-outline-block h-3 w-24 mt-6" />
                </div>
              ))}
            </div>
          ) : loadError ? (
            <RouteErrorState
              routePath="/wall"
              detail="Could not fetch approved community notes from /api/wall."
              onRetry={loadWallEntries}
            />
          ) : entries.length === 0 ? (
            <RouteEmptyState
              routePath="/wall"
              title="0 approved notes on the wall"
              message="No approved notes yet—be the first to leave one above."
            />
          ) : (
            <div
              data-testid="wall-masonry-grid"
              className="cq-wall-masonry columns-1 sm:columns-2 lg:columns-3 gap-5 [column-fill:_balance]"
            >
              {entries.map((entry, idx) => {
                const isLiked = likedIds.has(entry.id);
                const safeAuthorHref = safeExternalUrl(entry.author_url);
                return (
                  <article
                    key={entry.id}
                    className="break-inside-avoid mb-5 border p-5 sm:p-6 flex flex-col justify-between gap-6 panel-enter"
                    style={{
                      borderColor: 'var(--color-border-strong)',
                      backgroundColor: 'var(--color-bg-elevated)',
                      borderRadius: 'var(--radius-sm)',
                      animationDelay: prefersReducedMotion
                        ? '0ms'
                        : `${(idx % 6) * 50}ms`,
                    }}
                  >
                    <blockquote
                      className="m-0 font-body"
                      style={{
                        fontSize: 'clamp(1.05rem, 1.25vw, 1.2rem)',
                        lineHeight: 1.55,
                        color: 'var(--color-text)',
                      }}
                    >
                      &ldquo;{entry.principle}&rdquo;
                    </blockquote>

                    <div
                      className="pt-4 border-t flex items-center justify-between gap-3"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <div
                        className="flex items-center gap-2 min-w-0 font-mono"
                        style={{ fontSize: 'var(--text-micro)' }}
                      >
                        {entry.country_flag && (
                          <span aria-hidden="true" className="text-sm leading-none">
                            {entry.country_flag}
                          </span>
                        )}
                        {safeAuthorHref ? (
                          <HoverLink
                            href={safeAuthorHref}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            restingRule
                            className="truncate transition-colors hover:text-[var(--color-accent)]"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            {entry.author}
                          </HoverLink>
                        ) : (
                          <span
                            className="truncate"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            {entry.author}
                          </span>
                        )}
                      </div>

                      <HeartLikeButton
                        likes={entry.likes}
                        liked={isLiked}
                        onLike={() => handleLike(entry.id)}
                        prefersReducedMotion={prefersReducedMotion}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
