import { type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { EASE_EDITORIAL, MOTION_DURATION, VIEWPORT_ONCE } from '../lib/motion';

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}

export function Reveal({
  children,
  className,
  delay = 0,
  y = 22,
}: RevealProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT_ONCE}
      transition={{
        duration: MOTION_DURATION.base,
        delay,
        ease: EASE_EDITORIAL,
      }}
    >
      {children}
    </motion.div>
  );
}
