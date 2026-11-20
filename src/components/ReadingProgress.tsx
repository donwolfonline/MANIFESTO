import { motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';

export interface ReadingProgressProps {
  /** Bar thickness in pixels (defaults to 2px) */
  height?: number;
  /** Bar color (defaults to the warm accent CSS token) */
  color?: string;
  /** Apply subtle spring damping when reduced motion is off */
  smooth?: boolean;
}

export function ReadingProgress({
  height = 2,
  color = 'var(--color-accent)',
  smooth = true,
}: ReadingProgressProps) {
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 32,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden="true"
      className="fixed top-0 right-0 left-0 origin-left pointer-events-none"
      style={{
        height: `${height}px`,
        zIndex: 'var(--z-progress)',
        backgroundColor: color,
        scaleX:
          prefersReducedMotion || !smooth ? scrollYProgress : smoothProgress,
      }}
    />
  );
}
