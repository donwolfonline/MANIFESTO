import { CLOSING_SIGN_OFF } from '../data/manifestoItems';
import type { ManifestoMeta } from '../lib/markdown';
import { getPreloadHandlers } from '../lib/routePreload';
import { FilmGrain } from './FilmGrain';
import { HoverLink } from './HoverLink';

export interface PrivacyPageProps {
  meta: ManifestoMeta;
  onNavigateHome: (section?: string) => void;
  onOpenWall: () => void;
}

export function PrivacyPage({
  meta,
  onNavigateHome,
  onOpenWall,
}: PrivacyPageProps) {
  return (
    <div
      className="relative min-h-dvh flex flex-col"
      style={{
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)',
      }}
    >
      <FilmGrain />

      {/* Minimal sticky header */}
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
            {...getPreloadHandlers('home')}
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
              href="/wall"
              {...getPreloadHandlers('wall')}
              onClick={(e) => {
                e.preventDefault();
                onOpenWall();
              }}
              className="hidden sm:inline-flex uppercase tracking-[var(--tracking-micro)] transition-colors hover:text-[var(--color-accent)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-text-secondary)',
              }}
            >
              /wall
            </HoverLink>

            <HoverLink
              href="/"
              restingRule
              {...getPreloadHandlers('home')}
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome();
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
        aria-label="Plain-language privacy policy"
        className="flex-1 editorial-shell py-12 sm:py-20"
      >
        <article className="max-w-[52rem] mx-auto space-y-12">
          <header
            data-legacy-title-block="true"
            className="pb-8 border-b space-y-4"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <p
              className="m-0 font-mono uppercase tracking-[var(--tracking-micro)]"
              style={{
                fontSize: 'var(--text-micro)',
                color: 'var(--color-accent)',
              }}
            >
              /privacy · Plain Language, Zero Legalese
            </p>
            <h1
              className="m-0 font-display font-normal"
              style={{
                fontSize: 'clamp(2.4rem, 5.5vw, 4.5rem)',
                lineHeight: 0.96,
                letterSpacing: 'var(--tracking-display)',
              }}
            >
              Privacy <span className="italic">Notes</span>
              <span style={{ color: 'var(--color-accent)' }}>.</span>
            </h1>
            <p
              className="m-0 font-body"
              style={{
                maxWidth: '58ch',
                fontSize: 'var(--text-lead)',
                lineHeight: 'var(--leading-lead)',
                color: 'var(--color-text-secondary)',
              }}
            >
              This site does not want your personal data. We run no ad trackers,
              set no advertising cookies, and self-host every font file so
              reading here stays quiet.
            </p>
          </header>

          <section className="space-y-4">
            <h2
              className="m-0 font-mono uppercase tracking-[var(--tracking-mono)] font-normal"
              style={{
                fontSize: 'var(--text-heading-mono)',
                color: 'var(--color-text)',
              }}
            >
              <span aria-hidden="true" style={{ color: 'var(--color-accent)' }}>
                01 ·{' '}
              </span>
              When you read the site
            </h2>
            <p
              className="m-0 font-body"
              style={{
                maxWidth: 'var(--measure)',
                fontSize: 'var(--text-body)',
                lineHeight: 'var(--leading-body)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Nothing is sent to third-party analytics networks, font CDNs, or
              social widgets. Fonts are served directly from this domain.
              Standard web server access logs handled by the hosting provider
              exist briefly to keep the site online and stop abuse.
            </p>
          </section>

          <section className="space-y-4">
            <h2
              className="m-0 font-mono uppercase tracking-[var(--tracking-mono)] font-normal"
              style={{
                fontSize: 'var(--text-heading-mono)',
                color: 'var(--color-text)',
              }}
            >
              <span aria-hidden="true" style={{ color: 'var(--color-accent)' }}>
                02 ·{' '}
              </span>
              What stays inside your own browser
            </h2>
            <p
              className="m-0 font-body"
              style={{
                maxWidth: 'var(--measure)',
                fontSize: 'var(--text-body)',
                lineHeight: 'var(--leading-body)',
                color: 'var(--color-text-secondary)',
              }}
            >
              A few small settings are saved in{' '}
              <code className="font-mono text-[0.88em]">localStorage</code> on
              your device and never transmitted anywhere: your chosen accent
              color from <code className="font-mono text-[0.88em]">/terminal</code>,
              which cards you have liked on{' '}
              <code className="font-mono text-[0.88em]">/wall</code>, and a local
              60-second submit cooldown timer. Clearing site storage resets all
              of them instantly.
            </p>
          </section>

          <section className="space-y-4">
            <h2
              className="m-0 font-mono uppercase tracking-[var(--tracking-mono)] font-normal"
              style={{
                fontSize: 'var(--text-heading-mono)',
                color: 'var(--color-text)',
              }}
            >
              <span aria-hidden="true" style={{ color: 'var(--color-accent)' }}>
                03 ·{' '}
              </span>
              When you submit a principle on /wall
            </h2>
            <p
              className="m-0 font-body"
              style={{
                maxWidth: 'var(--measure)',
                fontSize: 'var(--text-body)',
                lineHeight: 'var(--leading-body)',
                color: 'var(--color-text-secondary)',
              }}
            >
              We store strictly what you type into the form: your one-line
              principle, your first name or handle, your optional country flag,
              and your optional public link. We do not ask for or store your
              email address, user agent, or account credentials.
            </p>
            <p
              className="m-0 font-body"
              style={{
                maxWidth: 'var(--measure)',
                fontSize: 'var(--text-body)',
                lineHeight: 'var(--leading-body)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Every submission enters a private moderation queue first. Once
              approved by a human, those four fields become public on{' '}
              <code className="font-mono text-[0.88em]">/wall</code>. To stop
              automated spam, our server computes a one-way salted SHA-256 hash
              of your connection IP during rate-limit checks and automatically
              deletes that hash after 24 hours. Raw IP addresses are never
              written to our database.
            </p>
          </section>

          <section className="space-y-4">
            <h2
              className="m-0 font-mono uppercase tracking-[var(--tracking-mono)] font-normal"
              style={{
                fontSize: 'var(--text-heading-mono)',
                color: 'var(--color-text)',
              }}
            >
              <span aria-hidden="true" style={{ color: 'var(--color-accent)' }}>
                04 ·{' '}
              </span>
              Error monitoring &amp; backups
            </h2>
            <p
              className="m-0 font-body"
              style={{
                maxWidth: 'var(--measure)',
                fontSize: 'var(--text-body)',
                lineHeight: 'var(--leading-body)',
                color: 'var(--color-text-secondary)',
              }}
            >
              If the page hits an unexpected JavaScript crash, it sends a small,
              cookie-free error report containing only the route path and a
              scrubbed stack trace (emails, URL parameters, hashes, and tokens
              are stripped before sending). Automated daily backups save only
              the Wall submissions table so approved community notes are never
              lost.
            </p>
          </section>

          <section
            className="pt-8 border-t space-y-4"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <h2
              className="m-0 font-mono uppercase tracking-[var(--tracking-mono)] font-normal"
              style={{
                fontSize: 'var(--text-heading-mono)',
                color: 'var(--color-text)',
              }}
            >
              <span aria-hidden="true" style={{ color: 'var(--color-accent)' }}>
                05 ·{' '}
              </span>
              Edit or delete your Wall note
            </h2>
            <p
              className="m-0 font-body"
              style={{
                maxWidth: 'var(--measure)',
                fontSize: 'var(--text-body)',
                lineHeight: 'var(--leading-body)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Want a note you posted on{' '}
              <code className="font-mono text-[0.88em]">/wall</code> edited or
              permanently removed? Send a short note to{' '}
              <HoverLink
                href={`mailto:${CLOSING_SIGN_OFF.email}`}
                restingRule
                className="font-mono transition-colors hover:text-[var(--color-accent)]"
                style={{ color: 'var(--color-text)' }}
              >
                {CLOSING_SIGN_OFF.email}
              </HoverLink>{' '}
              with the handle or principle text and it will be deleted promptly.
            </p>
          </section>
        </article>
      </main>
    </div>
  );
}
