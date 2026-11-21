import { useCallback, useEffect, useState } from 'react';

export type ReadingThemePreference = 'system' | 'night' | 'paper' | 'sepia';
export type ResolvedReadingTheme = 'night' | 'paper' | 'sepia';
export type ReadingFontSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ReadingModePrefs {
  enabled: boolean;
  theme: ReadingThemePreference;
  fontSize: ReadingFontSize;
}

export interface ThemePaletteTokens {
  id: ResolvedReadingTheme;
  label: string;
  bg: string;
  bgElevated: string;
  bgDeep: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentInk: string;
}

export const READING_PREFS_STORAGE_KEY = 'manifesto_reading_prefs_v1';

export const DEFAULT_READING_PREFS: ReadingModePrefs = {
  enabled: false,
  theme: 'system',
  fontSize: 'md',
};

export const READING_THEME_OPTIONS: {
  id: ReadingThemePreference;
  label: string;
}[] = [
  { id: 'system', label: 'System' },
  { id: 'night', label: 'Night' },
  { id: 'paper', label: 'Paper' },
  { id: 'sepia', label: 'Sepia' },
];

export const READING_FONT_SIZE_ORDER: ReadingFontSize[] = [
  'sm',
  'md',
  'lg',
  'xl',
];

export const READING_FONT_SIZE_LABELS: Record<ReadingFontSize, string> = {
  sm: 'Small',
  md: 'Default',
  lg: 'Large',
  xl: 'Extra Large',
};

/**
 * Verified WCAG 2.1 AA/AAA color tokens for all three themes.
 */
export const THEME_PALETTES: Record<ResolvedReadingTheme, ThemePaletteTokens> =
  {
    night: {
      id: 'night',
      label: 'Night',
      bg: '#201e1f',
      bgElevated: '#282527',
      bgDeep: '#191718',
      text: '#f2eee8',
      textSecondary: '#b8b1a7',
      textMuted: '#968f86',
      accent: '#f0642d',
      accentInk: '#201e1f',
    },
    paper: {
      id: 'paper',
      label: 'Paper',
      bg: '#faf7f2',
      bgElevated: '#f1ece3',
      bgDeep: '#e8e1d5',
      text: '#1a1718',
      textSecondary: '#3b3532',
      textMuted: '#59514c',
      accent: '#942b06',
      accentInk: '#faf7f2',
    },
    sepia: {
      id: 'sepia',
      label: 'Sepia',
      bg: '#f2e7d3',
      bgElevated: '#e8dac1',
      bgDeep: '#dfd0b4',
      text: '#221a13',
      textSecondary: '#3b2f24',
      textMuted: '#524234',
      accent: '#942b06',
      accentInk: '#faf5ec',
    },
  };

const VALID_THEMES = new Set<ReadingThemePreference>([
  'system',
  'night',
  'paper',
  'sepia',
]);
const VALID_FONT_SIZES = new Set<ReadingFontSize>(['sm', 'md', 'lg', 'xl']);

/**
 * Safely reads persisted reading preferences from localStorage wrapped in try/catch,
 * returning sensible defaults whenever storage is empty, malformed, or blocked.
 */
export function loadReadingPrefs(): ReadingModePrefs {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_READING_PREFS };
  }

  try {
    const raw = window.localStorage.getItem(READING_PREFS_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_READING_PREFS };
    }
    const parsed = JSON.parse(raw) as Partial<ReadingModePrefs> | null;
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_READING_PREFS };
    }

    const enabled =
      typeof parsed.enabled === 'boolean'
        ? parsed.enabled
        : DEFAULT_READING_PREFS.enabled;
    const theme =
      typeof parsed.theme === 'string' &&
      VALID_THEMES.has(parsed.theme as ReadingThemePreference)
        ? (parsed.theme as ReadingThemePreference)
        : DEFAULT_READING_PREFS.theme;
    const fontSize =
      typeof parsed.fontSize === 'string' &&
      VALID_FONT_SIZES.has(parsed.fontSize as ReadingFontSize)
        ? (parsed.fontSize as ReadingFontSize)
        : DEFAULT_READING_PREFS.fontSize;

    return { enabled, theme, fontSize };
  } catch {
    return { ...DEFAULT_READING_PREFS };
  }
}

/**
 * Resolves a theme preference ('system' | 'night' | 'paper' | 'sepia') into
 * an active visual theme ('night' | 'paper' | 'sepia') using prefers-color-scheme.
 */
export function resolveReadingTheme(
  preference: ReadingThemePreference,
): ResolvedReadingTheme {
  if (preference === 'night' || preference === 'paper' || preference === 'sepia') {
    return preference;
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'paper';
      }
    } catch {
      // Fallback to night if matchMedia fails
    }
  }
  return 'night';
}

export function applyReadingPrefsToDocument(
  prefs: ReadingModePrefs,
): ResolvedReadingTheme {
  const resolved = resolveReadingTheme(prefs.theme);
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.setAttribute('data-theme', resolved);
    root.setAttribute('data-theme-pref', prefs.theme);
    root.setAttribute('data-reading-mode', prefs.enabled ? 'true' : 'false');
    root.setAttribute('data-font-size', prefs.fontSize);
  }
  return resolved;
}

const CHANGE_EVENT = 'manifesto:reading-prefs-change';

/**
 * Safely saves reading preferences to localStorage wrapped in try/catch,
 * applies them to document.documentElement, and notifies active hooks.
 */
export function saveReadingPrefs(
  patch: Partial<ReadingModePrefs>,
): ReadingModePrefs {
  const current = loadReadingPrefs();
  const next: ReadingModePrefs = {
    enabled:
      typeof patch.enabled === 'boolean' ? patch.enabled : current.enabled,
    theme:
      patch.theme && VALID_THEMES.has(patch.theme)
        ? patch.theme
        : current.theme,
    fontSize:
      patch.fontSize && VALID_FONT_SIZES.has(patch.fontSize)
        ? patch.fontSize
        : current.fontSize,
  };

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(
        READING_PREFS_STORAGE_KEY,
        JSON.stringify(next),
      );
    } catch {
      // Ignore storage quota or security errors
    }
  }

  applyReadingPrefsToDocument(next);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }));
  }

  return next;
}

export function stepFontSize(
  current: ReadingFontSize,
  delta: -1 | 1,
): ReadingFontSize {
  const idx = READING_FONT_SIZE_ORDER.indexOf(current);
  const safeIdx = idx === -1 ? 1 : idx;
  const nextIdx = Math.min(
    READING_FONT_SIZE_ORDER.length - 1,
    Math.max(0, safeIdx + delta),
  );
  return READING_FONT_SIZE_ORDER[nextIdx];
}

/**
 * Computes reading progress percentage and estimated reading time remaining
 * based on total words and current scroll progress (0..1).
 */
export function estimateTimeRemaining(
  totalWords: number,
  progress: number,
  wordsPerMinute = 200,
): {
  percent: number;
  minutesLeft: number;
  label: string;
} {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const percent = Math.round(clamped * 100);

  if (percent >= 98) {
    return {
      percent,
      minutesLeft: 0,
      label: 'Finished reading',
    };
  }

  const remainingWords = Math.max(0, totalWords * (1 - clamped));
  const rawMinutes = remainingWords / Math.max(60, wordsPerMinute);

  if (rawMinutes < 0.75) {
    return {
      percent,
      minutesLeft: 1,
      label: '< 1 min left',
    };
  }

  const minutesLeft = Math.max(1, Math.ceil(rawMinutes));
  return {
    percent,
    minutesLeft,
    label: `${minutesLeft} min left`,
  };
}

/**
 * React hook that manages reading mode, theme (Night/Paper/Sepia/System),
 * and font-size preferences across long-form reading pages.
 */
export function useReadingMode() {
  const [prefs, setPrefs] = useState<ReadingModePrefs>(() => {
    const initial = loadReadingPrefs();
    applyReadingPrefsToDocument(initial);
    return initial;
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedReadingTheme>(() =>
    resolveReadingTheme(prefs.theme),
  );

  useEffect(() => {
    setResolvedTheme(applyReadingPrefsToDocument(prefs));
  }, [prefs]);

  // Sync across multiple hook instances and system prefers-color-scheme changes
  useEffect(() => {
    const handleCustomChange = (event: Event) => {
      const detail = (event as CustomEvent<ReadingModePrefs>).detail;
      if (detail) {
        setPrefs(detail);
        setResolvedTheme(resolveReadingTheme(detail.theme));
      } else {
        const loaded = loadReadingPrefs();
        setPrefs(loaded);
        setResolvedTheme(resolveReadingTheme(loaded.theme));
      }
    };

    window.addEventListener(CHANGE_EVENT, handleCustomChange);

    let mq: MediaQueryList | null = null;
    const handleSystemThemeChange = () => {
      const latest = loadReadingPrefs();
      if (latest.theme === 'system') {
        setResolvedTheme(applyReadingPrefsToDocument(latest));
      }
    };

    if (typeof window.matchMedia === 'function') {
      try {
        mq = window.matchMedia('(prefers-color-scheme: light)');
        mq.addEventListener('change', handleSystemThemeChange);
      } catch {
        // Ignore
      }
    }

    return () => {
      window.removeEventListener(CHANGE_EVENT, handleCustomChange);
      mq?.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  const updatePrefs = useCallback((patch: Partial<ReadingModePrefs>) => {
    const updated = saveReadingPrefs(patch);
    setPrefs(updated);
    setResolvedTheme(resolveReadingTheme(updated.theme));
    return updated;
  }, []);

  const toggleReadingMode = useCallback(() => {
    return updatePrefs({ enabled: !prefs.enabled });
  }, [prefs.enabled, updatePrefs]);

  const setTheme = useCallback(
    (theme: ReadingThemePreference) => updatePrefs({ theme }),
    [updatePrefs],
  );

  const setFontSize = useCallback(
    (fontSize: ReadingFontSize) => updatePrefs({ fontSize }),
    [updatePrefs],
  );

  const adjustFontSize = useCallback(
    (delta: -1 | 1) => {
      return updatePrefs({ fontSize: stepFontSize(prefs.fontSize, delta) });
    },
    [prefs.fontSize, updatePrefs],
  );

  return {
    prefs,
    resolvedTheme,
    toggleReadingMode,
    setTheme,
    setFontSize,
    adjustFontSize,
  };
}
