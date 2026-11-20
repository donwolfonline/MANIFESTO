/**
 * Full-viewport subtle SVG fractal-noise overlay (~4% opacity via --grain-opacity).
 * Rendered statically (no rapid animation) so it adds analog paper/film texture
 * with minimal GPU cost and full respect for prefers-reduced-motion.
 */
export function FilmGrain() {
  return (
    <svg
      className="film-grain"
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <filter id="manifesto-film-grain">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.82"
          numOctaves={3}
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#manifesto-film-grain)" />
    </svg>
  );
}
