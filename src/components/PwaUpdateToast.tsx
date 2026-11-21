import { usePwaUpdater } from '../lib/pwa';

export function PwaUpdateToast() {
  const { updateAvailable, versionLabel, applyUpdate, dismissUpdate } =
    usePwaUpdater();

  if (!updateAvailable) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Service worker update available"
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md border p-4 sm:p-5 font-mono shadow-lg panel-enter"
      style={{
        zIndex: 'var(--z-overlay)',
        borderColor: 'var(--color-accent)',
        backgroundColor: 'var(--color-bg-elevated)',
        color: 'var(--color-text)',
        borderRadius: 'var(--radius-sm)',
        borderTop: '3px solid var(--color-accent)',
      }}
    >
      <div className="space-y-3">
        <div
          className="flex items-center justify-between gap-3 uppercase tracking-[var(--tracking-micro)]"
          style={{ fontSize: 'var(--text-micro)' }}
        >
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: 'var(--color-accent)' }}
            />
            <span style={{ color: 'var(--color-accent)' }}>
              update available · sw.js
            </span>
          </span>
          <span style={{ color: 'var(--color-text-muted)' }}>
            {versionLabel}
          </span>
        </div>

        <p
          className="m-0 font-body"
          style={{
            fontSize: 'var(--text-meta)',
            lineHeight: 1.55,
            color: 'var(--color-text-secondary)',
          }}
        >
          A fresh copy of <code className="font-mono">working_copy.md</code> has
          been cached in the background. Reload when you are ready to apply it.
        </p>

        <div className="pt-1 flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={dismissUpdate}
            className="px-3 py-1.5 border uppercase tracking-[var(--tracking-micro)] cursor-pointer"
            style={{
              fontSize: 'var(--text-micro)',
              borderColor: 'var(--color-border-strong)',
              color: 'var(--color-text-secondary)',
              backgroundColor: 'transparent',
              borderRadius: 'var(--radius-xs)',
            }}
          >
            later
          </button>

          <button
            type="button"
            onClick={applyUpdate}
            className="px-3.5 py-1.5 border uppercase tracking-[var(--tracking-micro)] cursor-pointer"
            style={{
              fontSize: 'var(--text-micro)',
              borderColor: 'var(--color-accent)',
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-accent-ink)',
              borderRadius: 'var(--radius-xs)',
            }}
          >
            reload to update ↻
          </button>
        </div>
      </div>
    </div>
  );
}
