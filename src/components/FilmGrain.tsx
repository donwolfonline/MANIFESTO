import grainTile from '../assets/grain.webp';
import { useLowPowerMode } from '../lib/lowPower';

/**
 * Full-viewport subtle film-grain overlay (~4% opacity via --grain-opacity).
 * Uses a tiny pre-baked 160x160 static PNG tile promoted to its own GPU layer
 * and automatically pauses drift animation on low-power / battery-saver devices.
 */
export function FilmGrain() {
  const lowPower = useLowPowerMode();
  return (
    <div
      data-testid="film-grain-overlay"
      data-low-power-paused={lowPower ? 'true' : 'false'}
      className={lowPower ? 'film-grain' : 'film-grain film-grain--drift'}
      aria-hidden="true"
      style={{ backgroundImage: `url(${grainTile})` }}
    />
  );
}
