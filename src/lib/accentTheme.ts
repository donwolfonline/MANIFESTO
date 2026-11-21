export interface AccentPreset {
  name: string;
  label: string;
  /** Hex for Night theme (verified >= 4.74:1 against #201e1f & #282527) */
  hex: string;
  soft: string;
  /** Companion shade for Paper & Sepia themes (verified >= 5.0:1 against #faf7f2 & #f2e7d3) */
  lightHex: string;
  lightSoft: string;
}

export const ACCENT_PRESETS: Record<string, AccentPreset> = {
  orange: {
    name: 'orange',
    label: 'Warm Vermilion',
    hex: '#f0642d',
    soft: 'rgba(240, 100, 45, 0.14)',
    lightHex: '#942b06',
    lightSoft: 'rgba(148, 43, 6, 0.12)',
  },
  lime: {
    name: 'lime',
    label: 'Editorial Lime',
    hex: '#a3d95b',
    soft: 'rgba(163, 217, 91, 0.14)',
    lightHex: '#2f6108',
    lightSoft: 'rgba(47, 97, 8, 0.12)',
  },
  amber: {
    name: 'amber',
    label: 'Warm Brass',
    hex: '#e9a83b',
    soft: 'rgba(233, 168, 59, 0.14)',
    lightHex: '#7a4600',
    lightSoft: 'rgba(122, 70, 0, 0.12)',
  },
  sage: {
    name: 'sage',
    label: 'Mineral Sage',
    hex: '#6ec49c',
    soft: 'rgba(110, 196, 156, 0.14)',
    lightHex: '#115938',
    lightSoft: 'rgba(17, 89, 56, 0.12)',
  },
  coral: {
    name: 'coral',
    label: 'Terracotta Coral',
    hex: '#f4726b',
    soft: 'rgba(244, 114, 107, 0.14)',
    lightHex: '#961c16',
    lightSoft: 'rgba(150, 28, 22, 0.12)',
  },
  ice: {
    name: 'ice',
    label: 'Blueprint Ice',
    hex: '#7cb8e8',
    soft: 'rgba(124, 184, 232, 0.14)',
    lightHex: '#144d7a',
    lightSoft: 'rgba(20, 77, 122, 0.12)',
  },
};

const STORAGE_KEY = 'working_copy_accent';

export function getSavedAccentName(): string {
  if (typeof window === 'undefined') return 'orange';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && saved in ACCENT_PRESETS) return saved;
  } catch {
    // Ignore storage errors in restricted environments
  }
  return 'orange';
}

export function applyAccentPreset(name: string): {
  ok: boolean;
  label: string;
  hex?: string;
  available: string[];
} {
  const normalized = name.trim().toLowerCase();
  const available = Object.keys(ACCENT_PRESETS);
  const preset = ACCENT_PRESETS[normalized];

  if (!preset) {
    return {
      ok: false,
      label: normalized,
      available,
    };
  }

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.style.setProperty('--color-accent-night', preset.hex);
    root.style.setProperty('--color-accent-night-soft', preset.soft);
    root.style.setProperty('--color-accent-light', preset.lightHex);
    root.style.setProperty('--color-accent-light-soft', preset.lightSoft);
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, preset.name);
  } catch {
    // Ignore storage errors
  }

  return {
    ok: true,
    label: `${preset.name} (${preset.label})`,
    hex: preset.hex,
    available,
  };
}

/**
 * Hidden CRT phosphor theme unlocked via the Konami code.
 */
export function applySecretPhosphorTheme() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--color-accent-night', '#9bf065');
  root.style.setProperty(
    '--color-accent-night-soft',
    'rgba(155, 240, 101, 0.16)',
  );
  root.style.setProperty('--color-accent-light', '#2f6108');
  root.style.setProperty(
    '--color-accent-light-soft',
    'rgba(47, 97, 8, 0.14)',
  );
}
