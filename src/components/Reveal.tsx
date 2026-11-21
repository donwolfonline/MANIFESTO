import { useRef, type ReactNode } from 'react';
import {
  useInViewOnce,
  usePrefersReducedMotion,
} from '../lib/useViewportActivity';

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}

export function Reveal({
  children,
  className = '',
  delay = 0,
  y = 22,
}: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const visible = useInViewOnce(ref, prefersReducedMotion, {
    threshold: 0.12,
    rootMargin: '0px 0px -8% 0px',
  });

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translate3d(0, 0, 0)' : `translate3d(0, ${y}px, 0)`,
        transition: `opacity var(--duration-base) var(--ease-editorial) ${delay}s, transform var(--duration-base) var(--ease-editorial) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}
