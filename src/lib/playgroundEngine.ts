export type PlaygroundShape = 'orb' | 'line' | 'ring' | 'cross';

export type PlaygroundPaletteId =
  | 'vermilion'
  | 'blueprint'
  | 'botanical'
  | 'monochrome';

export interface PlaygroundPalette {
  id: PlaygroundPaletteId;
  label: string;
  bg: string;
  colors: [string, string, string, string];
}

export interface PlaygroundSettings {
  shape: PlaygroundShape;
  count: number;
  noiseScale: number;
  speed: number;
  palette: PlaygroundPaletteId;
  symmetry: boolean;
  seed: number;
}

export interface DrawFrameState {
  width: number;
  height: number;
  time: number;
  shape: PlaygroundShape;
  count: number;
  noiseScale: number;
  speed: number;
  palette: PlaygroundPalette;
  symmetry: boolean;
  seed: number;
  noise2D: (x: number, y: number) => number;
}

export type CompiledDrawFn = (
  ctx: CanvasRenderingContext2D,
  state: DrawFrameState,
) => void;

export const PLAYGROUND_SHAPES: PlaygroundShape[] = [
  'orb',
  'line',
  'ring',
  'cross',
];

export const PLAYGROUND_PALETTES: Record<
  PlaygroundPaletteId,
  PlaygroundPalette
> = {
  vermilion: {
    id: 'vermilion',
    label: 'Vermilion',
    bg: '#191718',
    colors: ['#f0642d', '#f2eee8', '#e9a83b', '#968f86'],
  },
  blueprint: {
    id: 'blueprint',
    label: 'Blueprint',
    bg: '#191718',
    colors: ['#7cb8e8', '#f2eee8', '#6ec49c', '#968f86'],
  },
  botanical: {
    id: 'botanical',
    label: 'Botanical',
    bg: '#191718',
    colors: ['#a3d95b', '#6ec49c', '#f2eee8', '#d8c9a8'],
  },
  monochrome: {
    id: 'monochrome',
    label: 'Paper & Ink',
    bg: '#191718',
    colors: ['#f2eee8', '#b8b1a7', '#968f86', '#f0642d'],
  },
};

export const PLAYGROUND_PALETTE_LIST: PlaygroundPalette[] = [
  PLAYGROUND_PALETTES.vermilion,
  PLAYGROUND_PALETTES.blueprint,
  PLAYGROUND_PALETTES.botanical,
  PLAYGROUND_PALETTES.monochrome,
];

export const MOBILE_MAX_COUNT = 110;
export const DESKTOP_MAX_COUNT = 240;

export const DEFAULT_PLAYGROUND_SETTINGS: PlaygroundSettings = {
  shape: 'line',
  count: 110,
  noiseScale: 0.0085,
  speed: 0.85,
  palette: 'vermilion',
  symmetry: true,
  seed: 4219,
};

/**
 * Editable JavaScript body executed on every animation frame.
 * Receives `(ctx, state)` where `state` contains the live slider values + `noise2D(x, y)`.
 */
export const DEFAULT_PLAYGROUND_CODE = `// Live Canvas 2D sketch — edit freely (re-runs after a short pause).
// Available on state: width, height, time, count, shape, noiseScale,
// speed, palette, symmetry, seed, noise2D(x, y)

const { width, height, time, count, shape, noiseScale, speed, palette, symmetry, seed, noise2D } = state;

// Warm near-black canvas clear
ctx.fillStyle = palette.bg;
ctx.fillRect(0, 0, width, height);

// Subtle concentric studio guide rings
ctx.strokeStyle = 'rgba(242, 238, 232, 0.06)';
ctx.lineWidth = 1;
const cx = width / 2;
const cy = height / 2;
const maxRadius = Math.min(width, height) * 0.42;

for (let r = 1; r <= 3; r++) {
  ctx.beginPath();
  ctx.arc(cx, cy, (maxRadius / 3) * r, 0, Math.PI * 2);
  ctx.stroke();
}

const t = time * speed * 0.45;
const copies = symmetry ? 4 : 1;

function drawPrimitive(x, y, angle, size, color, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.4;

  if (shape === 'orb') {
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
    ctx.fill();
  } else if (shape === 'ring') {
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.72, 0, Math.PI * 2);
    ctx.stroke();
  } else if (shape === 'cross') {
    const arm = size * 0.65;
    ctx.beginPath();
    ctx.moveTo(-arm, 0);
    ctx.lineTo(arm, 0);
    ctx.moveTo(0, -arm);
    ctx.lineTo(0, arm);
    ctx.stroke();
  } else {
    // Crisp directional flow stroke
    ctx.beginPath();
    ctx.moveTo(-size, 0);
    ctx.lineTo(size, 0);
    ctx.stroke();
  }
  ctx.restore();
}

// Golden-angle spiral distribution perturbed by smooth 2D noise
const goldenAngle = 2.3999632297;

for (let i = 0; i < count; i++) {
  const ratio = (i + 0.5) / count;
  const baseRadius = Math.sqrt(ratio) * maxRadius;
  const theta = i * goldenAngle + seed * 0.01;

  const baseX = cx + Math.cos(theta) * baseRadius;
  const baseY = cy + Math.sin(theta) * baseRadius;

  const n = noise2D(baseX * noiseScale + t, baseY * noiseScale - t * 0.7);
  const angle = n * Math.PI * 3.5 + theta * 0.25;
  const drift = (n - 0.5) * 46;

  const px = baseX + Math.cos(angle) * drift;
  const py = baseY + Math.sin(angle) * drift;

  const size = 5 + Math.abs(n) * 15 * (1 - ratio * 0.35);
  const color = palette.colors[i % palette.colors.length];
  const alpha = 0.32 + (1 - ratio) * 0.58;

  for (let s = 0; s < copies; s++) {
    const mirrorX = s === 1 || s === 3 ? width - px : px;
    const mirrorY = s === 2 || s === 3 ? height - py : py;
    const mirrorAngle = s === 1 || s === 2 ? -angle : angle;
    drawPrimitive(mirrorX, mirrorY, mirrorAngle, size, color, alpha);
  }
}
`;

/**
 * Fast deterministic smooth 2D value noise in [0, 1] seeded cleanly per artwork.
 */
export function createNoise2D(seed: number): (x: number, y: number) => number {
  const hash = (ix: number, iy: number): number => {
    let h =
      Math.imul(ix, 374761393) +
      Math.imul(iy, 668265263) +
      Math.imul(seed, 1442695041);
    h = (h ^ (h >>> 13)) | 0;
    h = Math.imul(h, 1274126177);
    h = (h ^ (h >>> 16)) >>> 0;
    return h / 4294967295;
  };

  const smoothstep = (t: number) => t * t * (3 - 2 * t);

  return (x: number, y: number): number => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = smoothstep(x - ix);
    const fy = smoothstep(y - iy);

    const a = hash(ix, iy);
    const b = hash(ix + 1, iy);
    const c = hash(ix, iy + 1);
    const d = hash(ix + 1, iy + 1);

    const top = a + (b - a) * fx;
    const bottom = c + (d - c) * fx;
    return top + (bottom - top) * fy;
  };
}

/**
 * Static compiled implementation of the default Canvas 2D sketch so `/playground`
 * renders smoothly under strict `script-src 'self'` CSP without invoking `new Function`
 * until the visitor explicitly edits the live code buffer.
 */
export const drawDefaultSketch: CompiledDrawFn = (ctx, state) => {
  const {
    width,
    height,
    time,
    count,
    shape,
    noiseScale,
    speed,
    palette,
    symmetry,
    seed,
    noise2D,
  } = state;

  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(242, 238, 232, 0.06)';
  ctx.lineWidth = 1;
  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = Math.min(width, height) * 0.42;

  for (let r = 1; r <= 3; r++) {
    ctx.beginPath();
    ctx.arc(cx, cy, (maxRadius / 3) * r, 0, Math.PI * 2);
    ctx.stroke();
  }

  const t = time * speed * 0.45;
  const copies = symmetry ? 4 : 1;

  const drawPrimitive = (
    x: number,
    y: number,
    angle: number,
    size: number,
    color: string,
    alpha: number,
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.4;

    if (shape === 'orb') {
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else if (shape === 'ring') {
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.72, 0, Math.PI * 2);
      ctx.stroke();
    } else if (shape === 'cross') {
      const arm = size * 0.65;
      ctx.beginPath();
      ctx.moveTo(-arm, 0);
      ctx.lineTo(arm, 0);
      ctx.moveTo(0, -arm);
      ctx.lineTo(0, arm);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(-size, 0);
      ctx.lineTo(size, 0);
      ctx.stroke();
    }
    ctx.restore();
  };

  const goldenAngle = 2.3999632297;

  for (let i = 0; i < count; i++) {
    const ratio = (i + 0.5) / count;
    const baseRadius = Math.sqrt(ratio) * maxRadius;
    const theta = i * goldenAngle + seed * 0.01;

    const baseX = cx + Math.cos(theta) * baseRadius;
    const baseY = cy + Math.sin(theta) * baseRadius;

    const n = noise2D(baseX * noiseScale + t, baseY * noiseScale - t * 0.7);
    const angle = n * Math.PI * 3.5 + theta * 0.25;
    const drift = (n - 0.5) * 46;

    const px = baseX + Math.cos(angle) * drift;
    const py = baseY + Math.sin(angle) * drift;

    const size = 5 + Math.abs(n) * 15 * (1 - ratio * 0.35);
    const color = palette.colors[i % palette.colors.length];
    const alpha = 0.32 + (1 - ratio) * 0.58;

    for (let s = 0; s < copies; s++) {
      const mirrorX = s === 1 || s === 3 ? width - px : px;
      const mirrorY = s === 2 || s === 3 ? height - py : py;
      const mirrorAngle = s === 1 || s === 2 ? -angle : angle;
      drawPrimitive(mirrorX, mirrorY, mirrorAngle, size, color, alpha);
    }
  }
};

/**
 * Safely compiles user-edited Canvas 2D sketch code without crashing the page.
 */
export function compileSketchCode(source: string): {
  fn: CompiledDrawFn | null;
  error: string | null;
} {
  if (source === DEFAULT_PLAYGROUND_CODE) {
    return { fn: drawDefaultSketch, error: null };
  }

  try {
    const fn = new Function('ctx', 'state', `"use strict";\n${source}`) as CompiledDrawFn;
    return { fn, error: null };
  } catch (err) {
    const message =
      err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    if (/unsafe-eval|Content Security Policy/i.test(message)) {
      return {
        fn: null,
        error:
          'Reload /playground directly to enable live code editing under the playground CSP.',
      };
    }
    return { fn: null, error: message };
  }
}

/**
 * Encodes all settings into a short plain URL-safe base64 hash token (`[A-Za-z0-9_-]`).
 */
export function encodeSettingsToHash(settings: PlaygroundSettings): string {
  const shapeIdx = Math.max(0, PLAYGROUND_SHAPES.indexOf(settings.shape));
  const paletteIds = Object.keys(PLAYGROUND_PALETTES) as PlaygroundPaletteId[];
  const paletteIdx = Math.max(0, paletteIds.indexOf(settings.palette));

  const packed = [
    shapeIdx,
    Math.round(settings.count),
    Math.round(settings.noiseScale * 10000),
    Math.round(settings.speed * 100),
    paletteIdx,
    settings.symmetry ? 1 : 0,
    Math.round(settings.seed),
  ];

  const json = JSON.stringify(packed);
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/**
 * Decodes a compact base64url hash back into validated PlaygroundSettings.
 */
export function decodeSettingsFromHash(
  rawHash: string,
): PlaygroundSettings | null {
  const token = rawHash.replace(/^#/, '').trim();
  if (!token || !/^[A-Za-z0-9_-]+$/.test(token)) return null;

  try {
    const base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const parsed = JSON.parse(atob(padded));
    if (!Array.isArray(parsed) || parsed.length < 7) return null;

    const [shapeIdx, count, noiseInt, speedInt, paletteIdx, sym, seed] =
      parsed.map(Number);
    const paletteIds = Object.keys(
      PLAYGROUND_PALETTES,
    ) as PlaygroundPaletteId[];

    const shape = PLAYGROUND_SHAPES[shapeIdx] ?? DEFAULT_PLAYGROUND_SETTINGS.shape;
    const palette =
      paletteIds[paletteIdx] ?? DEFAULT_PLAYGROUND_SETTINGS.palette;

    return {
      shape,
      count: Math.min(DESKTOP_MAX_COUNT, Math.max(16, Math.round(count || 110))),
      noiseScale: Math.min(0.025, Math.max(0.002, (noiseInt || 85) / 10000)),
      speed: Math.min(2.5, Math.max(0.1, (speedInt || 85) / 100)),
      palette,
      symmetry: sym === 1,
      seed: Number.isFinite(seed) ? Math.abs(Math.round(seed)) % 99999 : 4219,
    };
  } catch {
    return null;
  }
}

export function createRandomSettings(maxCount: number): PlaygroundSettings {
  const paletteIds = Object.keys(PLAYGROUND_PALETTES) as PlaygroundPaletteId[];
  const pick = <T,>(arr: T[]): T =>
    arr[Math.floor(Math.random() * arr.length)];

  return {
    shape: pick(PLAYGROUND_SHAPES),
    count: Math.round(28 + Math.random() * (maxCount - 28)),
    noiseScale: Number((0.003 + Math.random() * 0.017).toFixed(4)),
    speed: Number((0.3 + Math.random() * 1.5).toFixed(2)),
    palette: pick(paletteIds),
    symmetry: Math.random() > 0.3,
    seed: Math.floor(1000 + Math.random() * 8999),
  };
}
