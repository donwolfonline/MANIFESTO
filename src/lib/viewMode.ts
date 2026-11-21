import type { ViewMode } from '../components/Header';

export const VIEW_MODE_STORAGE_KEY = 'manifesto_view_mode_v1';

/**
 * Loads the persisted EDITORIAL | RAW .MD view mode from localStorage inside try/catch,
 * defaulting to 'editorial'. Honors a page-level `#raw` deep-link hash when present.
 */
export function loadViewMode(hashOverride?: string): ViewMode {
  const hash =
    hashOverride ??
    (typeof window !== 'undefined' ? window.location.hash : '');
  if (hash.trim().toLowerCase() === '#raw') {
    return 'raw';
  }

  if (typeof window === 'undefined') {
    return 'editorial';
  }

  try {
    const saved = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (saved === 'raw' || saved === 'editorial') {
      return saved;
    }
  } catch {
    // Ignore storage access errors (private browsing / disabled storage)
  }

  return 'editorial';
}

/**
 * Persists the EDITORIAL | RAW .MD view mode in localStorage inside try/catch.
 * Keeps state out of the URL during normal toggling (and clears any stale `#raw` hash when returning to editorial).
 */
export function saveViewMode(mode: ViewMode): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore quota or disabled localStorage errors
  }

  if (mode === 'editorial' && window.location.hash.toLowerCase() === '#raw') {
    try {
      window.history.replaceState(
        window.history.state,
        '',
        `${window.location.pathname}${window.location.search}`,
      );
    } catch {
      // Ignore history API errors
    }
  }
}
