import grainTile from '../assets/grain.webp';

/**
 * Full-viewport subtle film-grain overlay (~4% opacity via --grain-opacity).
 * Uses a tiny pre-baked 160x160 static PNG tile promoted to its own GPU layer
 * instead of a live SVG feTurbulence filter or mix-blend-mode, keeping scroll
 * performance locked at 60-120fps on HiDPI displays.
 */
export function FilmGrain() {
  return (
    <div
      className="film-grain"
      aria-hidden="true"
      style={{ backgroundImage: `url(${grainTile})` }}
    />
  );
}
