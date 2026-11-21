import { useEffect } from 'react';
import { useLenis } from '../lib/lenis';

export interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutRow {
  keys: string[];
  label: string;
}

const SHORTCUT_GROUPS: { heading: string; rows: ShortcutRow[] }[] = [
  {
    heading: 'Global Navigation',
    rows: [
      { keys: ['⌘ / Ctrl', 'K'], label: 'Open command palette (jump to any page)' },
      { keys: ['/'], label: 'Focus site-wide search' },
      { keys: ['?'], label: 'Toggle this keyboard shortcuts sheet' },
      { keys: ['Esc'], label: 'Close active overlay, modal, or drawer' },
    ],
  },
  {
    heading: 'Interactive Pages',
    rows: [
      { keys: ['←', '→'], label: 'Step through Bug Museum cards, Shelf books, or /delete slider' },
      { keys: ['Home', 'End'], label: 'Snap /delete comparison slider to 0% or 100%' },
    ],
  },
  {
    heading: 'Terminal (/terminal)',
    rows: [
      { keys: ['↑', '↓'], label: 'Walk command history' },
      { keys: ['Tab'], label: 'Autocomplete command names & arguments' },
      { keys: ['Ctrl', 'L'], label: 'Clear terminal screen' },
      { keys: ['Ctrl', 'C'], label: 'Stop streaming manifesto output' },
    ],
  },
];

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  const { lenis } = useLenis();

  useEffect(() => {
    if (!isOpen) return;

    lenis?.stop();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      lenis?.start();
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, lenis, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 overflow-y-auto backdrop-enter"
      style={{
        zIndex: 'var(--z-overlay)',
        backgroundColor: 'rgba(14, 12, 13, 0.78)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-title"
        data-lenis-prevent
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl border overflow-hidden panel-enter"
        style={{
          borderColor: 'var(--color-border-strong)',
          backgroundColor: 'var(--color-bg-deep)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <div
          className="px-5 sm:px-6 py-4 border-b flex items-center justify-between gap-4 font-mono"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-bg)',
          }}
        >
          <h2
            id="shortcuts-modal-title"
            className="m-0 uppercase tracking-[var(--tracking-micro)] font-normal"
            style={{
              fontSize: 'var(--text-micro)',
              color: 'var(--color-text)',
            }}
          >
            <span
              aria-hidden="true"
              className="mr-2"
              style={{ color: 'var(--color-accent)' }}
            >
              ?
            </span>
            Keyboard Shortcuts
          </h2>

          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="link-draw uppercase tracking-[var(--tracking-micro)] cursor-pointer"
            style={{
              fontSize: 'var(--text-micro)',
              color: 'var(--color-text-secondary)',
            }}
          >
            close [esc]
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-6 max-h-[75dvh] overflow-y-auto">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.heading} className="space-y-3">
              <p
                className="m-0 font-mono uppercase tracking-[var(--tracking-micro)]"
                style={{
                  fontSize: 'var(--text-micro)',
                  color: 'var(--color-accent)',
                }}
              >
                {group.heading}
              </p>
              <ul className="m-0 p-0 list-none space-y-2.5">
                {group.rows.map((row) => (
                  <li
                    key={row.label}
                    className="flex items-center justify-between gap-4 pb-2.5 border-b last:border-b-0 last:pb-0"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <span
                      className="font-body"
                      style={{
                        fontSize: 'var(--text-meta)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {row.label}
                    </span>
                    <span className="shrink-0 flex items-center gap-1.5 font-mono">
                      {row.keys.map((key) => (
                        <kbd
                          key={key}
                          className="px-2 py-0.5 border"
                          style={{
                            fontSize: 'var(--text-micro)',
                            borderColor: 'var(--color-border-strong)',
                            backgroundColor: 'var(--color-bg)',
                            color: 'var(--color-text)',
                            borderRadius: 'var(--radius-xs)',
                          }}
                        >
                          {key}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <p
            className="m-0 pt-3 border-t font-mono"
            style={{
              borderColor: 'var(--color-border)',
              fontSize: 'var(--text-micro)',
              color: 'var(--color-text-muted)',
            }}
          >
            psst: classic arcade muscle memory (↑ ↑ ↓ ↓ …) also works here.
          </p>
        </div>
      </div>
    </div>
  );
}
