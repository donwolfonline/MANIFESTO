import { describe, expect, it } from 'vitest';
import {
  compileSketchCode,
  decodeSettingsFromHash,
  DEFAULT_PLAYGROUND_CODE,
  DEFAULT_PLAYGROUND_SETTINGS,
  DESKTOP_MAX_COUNT,
  encodeSettingsToHash,
  PLAYGROUND_PALETTES,
  PLAYGROUND_SHAPES,
  type PlaygroundPaletteId,
  type PlaygroundSettings,
} from '../lib/playgroundEngine';

describe('playground URL-hash encoder/decoder', () => {
  it('round-trips default settings faithfully', () => {
    const token = encodeSettingsToHash(DEFAULT_PLAYGROUND_SETTINGS);

    // Short, strictly URL-safe base64url (no +, /, =, or #)
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeLessThan(64);

    expect(decodeSettingsFromHash(token)).toEqual(DEFAULT_PLAYGROUND_SETTINGS);
    expect(decodeSettingsFromHash(`#${token}`)).toEqual(
      DEFAULT_PLAYGROUND_SETTINGS,
    );
  });

  it('round-trips every shape, palette, and symmetry boolean', () => {
    const palettes = Object.keys(PLAYGROUND_PALETTES) as PlaygroundPaletteId[];

    for (const shape of PLAYGROUND_SHAPES) {
      for (const palette of palettes) {
        for (const symmetry of [true, false]) {
          const settings: PlaygroundSettings = {
            shape,
            count: 74,
            noiseScale: 0.0125,
            speed: 1.45,
            palette,
            symmetry,
            seed: 8081,
          };

          const encoded = encodeSettingsToHash(settings);
          const decoded = decodeSettingsFromHash(`#${encoded}`);

          expect(decoded).toEqual(settings);
        }
      }
    }
  });

  it('clamps out-of-range numbers and falls back unknown shape/palette indices to defaults', () => {
    // Packed tuple: [shapeIdx, count, noiseInt, speedInt, paletteIdx, symmetry, seed]
    const rawTuple = [99, 9999, 99999, 9999, 42, 0, -123456];
    const token = btoa(JSON.stringify(rawTuple))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');

    const decoded = decodeSettingsFromHash(`#${token}`);
    expect(decoded).toEqual({
      shape: DEFAULT_PLAYGROUND_SETTINGS.shape,
      count: DESKTOP_MAX_COUNT,
      noiseScale: 0.025,
      speed: 2.5,
      palette: DEFAULT_PLAYGROUND_SETTINGS.palette,
      symmetry: false,
      seed: 123456 % 99999,
    });

    // Lower bounds
    const lowTuple = [0, 1, 1, 1, 0, 1, 0];
    const lowToken = btoa(JSON.stringify(lowTuple))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
    expect(decodeSettingsFromHash(lowToken)).toEqual({
      shape: 'orb',
      count: 16,
      noiseScale: 0.002,
      speed: 0.1,
      palette: 'vermilion',
      symmetry: true,
      seed: 0,
    });
  });

  it('returns null for empty, malformed, non-array, or truncated hashes', () => {
    expect(decodeSettingsFromHash('')).toBeNull();
    expect(decodeSettingsFromHash('#')).toBeNull();
    expect(decodeSettingsFromHash('#not!valid@chars')).toBeNull();
    expect(decodeSettingsFromHash('#!!!')).toBeNull();

    // Valid base64url, invalid JSON
    const notJson = btoa('hello world').replace(/=+$/g, '');
    expect(decodeSettingsFromHash(notJson)).toBeNull();

    // Valid JSON object, not an array
    const objToken = btoa(JSON.stringify({ shape: 'orb' })).replace(/=+$/g, '');
    expect(decodeSettingsFromHash(objToken)).toBeNull();

    // Array too short (< 7 elements)
    const shortToken = btoa(JSON.stringify([0, 50, 85])).replace(/=+$/g, '');
    expect(decodeSettingsFromHash(shortToken)).toBeNull();
  });

  it('compiles valid sketch code and reports syntax errors safely without throwing', () => {
    const ok = compileSketchCode(DEFAULT_PLAYGROUND_CODE);
    expect(ok.error).toBeNull();
    expect(typeof ok.fn).toBe('function');

    const broken = compileSketchCode('const x = ;');
    expect(broken.fn).toBeNull();
    expect(broken.error).toMatch(/SyntaxError/i);
  });
});
