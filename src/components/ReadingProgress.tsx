import { useRef } from 'react';
import { usePageScrollProgress } from '../lib/useViewportActivity';

export interface ReadingProgressProps {
  /** Bar thickness in pixels (defaults to 2px) */
  height?: number;
  /** Bar color (defaults to the warm accent CSS token) */
  color?: string;
  /** Retained for prop compatibility */
  smooth?: boolean;
}

export function ReadingProgress({
  height = 2,
  color = 'var(--color-accent)',
}: ReadingProgressProps) {
  const barRef = useRef<HTMLDivElement | null>(null);

  // Updates GPU-composited scaleX directly; pauses automatically when tab is hidden
  usePageScrollProgress((_y, progress) => {
    if (barRef.current) {
      barRef.current.style.transform = `scaleX(${progress.toFixed(4)})`;
    }
  });

  return (
    <div
      ref={barRef}
      aria-hidden="true"
      className="fixed top-0 right-0 left-0 origin-left pointer-events-none"
      style={{
        height: `${height}px`,
        zIndex: 'var(--z-progress)',
        backgroundColor: color,
        transform: 'scaleX(0)',
      }}
    />
  );
}
