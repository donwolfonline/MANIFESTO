import { useEffect, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'framer-motion';
import { EASE_OUT_EXPO } from '../lib/motion';

export interface CustomCursorProps {
  /** CSS selector for the reading/body section where the label appears */
  readSectionSelector?: string;
  /** Label shown inside the expanded ring over the reading section */
  readLabel?: string;
  /** Toggle custom cursor on/off */
  enabled?: boolean;
}

type CursorVariant = 'default' | 'link' | 'read';

const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';

export function CustomCursor({
  readSectionSelector = '#read',
  readLabel = 'read',
  enabled = true,
}: CustomCursorProps) {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const [isDesktopPointer, setIsDesktopPointer] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(FINE_POINTER_QUERY).matches;
  });
  const [visible, setVisible] = useState(false);
  const [variant, setVariant] = useState<CursorVariant>('default');
  const [pressed, setPressed] = useState(false);

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  const ringX = useSpring(mouseX, { stiffness: 360, damping: 32, mass: 0.45 });
  const ringY = useSpring(mouseY, { stiffness: 360, damping: 32, mass: 0.45 });

  // Detect fine-pointer desktop vs. touch device dynamically
  useEffect(() => {
    const mediaQuery = window.matchMedia(FINE_POINTER_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktopPointer(event.matches);
    };

    setIsDesktopPointer(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const active = enabled && isDesktopPointer && !prefersReducedMotion;

  // Toggle global class to hide the native cursor only while active
  useEffect(() => {
    const root = document.documentElement;
    if (active) {
      root.classList.add('has-custom-cursor');
    } else {
      root.classList.remove('has-custom-cursor');
    }
    return () => root.classList.remove('has-custom-cursor');
  }, [active]);

  useEffect(() => {
    if (!active) return;

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        setVisible(false);
        return;
      }

      mouseX.set(event.clientX);
      mouseY.set(event.clientY);
      setVisible(true);

      const target = event.target as HTMLElement | null;
      if (!target) {
        setVariant('default');
        return;
      }

      if (
        target.closest(
          'a, button, [role="button"], input, textarea, select, [data-cursor="link"]',
        )
      ) {
        setVariant('link');
        return;
      }

      if (target.closest(readSectionSelector)) {
        setVariant('read');
        return;
      }

      setVariant('default');
    };

    const handlePointerDown = () => setPressed(true);
    const handlePointerUp = () => setPressed(false);
    const handleMouseLeave = () => setVisible(false);
    const handleMouseEnter = () => setVisible(true);

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [active, mouseX, mouseY, readSectionSelector]);

  if (!active) return null;

  const ringSize =
    variant === 'read' ? 62 : variant === 'link' ? 50 : 30;
  const pressScale = pressed ? 0.88 : 1;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 'var(--z-cursor)' }}
    >
      {/* Trailing outer ring */}
      <motion.div
        className="fixed top-0 left-0 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center border"
        style={{
          x: ringX,
          y: ringY,
        }}
        animate={{
          width: ringSize,
          height: ringSize,
          opacity: visible ? 1 : 0,
          scale: pressScale,
          borderColor:
            variant === 'link'
              ? 'var(--color-accent)'
              : variant === 'read'
                ? 'rgba(242, 238, 232, 0.45)'
                : 'rgba(242, 238, 232, 0.35)',
          backgroundColor:
            variant === 'read'
              ? 'rgba(32, 30, 31, 0.86)'
              : variant === 'link'
                ? 'rgba(235, 94, 40, 0.12)'
                : 'rgba(32, 30, 31, 0)',
        }}
        transition={{
          duration: 0.24,
          ease: EASE_OUT_EXPO,
        }}
      >
        <AnimatePresence mode="wait">
          {variant === 'read' && (
            <motion.span
              key="read-label"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.16, ease: EASE_OUT_EXPO }}
              className="font-mono lowercase tracking-[0.1em] select-none"
              style={{
                fontSize: '0.625rem',
                color: 'var(--color-text)',
              }}
            >
              {readLabel}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Immediate center dot */}
      <motion.div
        className="fixed top-0 left-0 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          x: mouseX,
          y: mouseY,
          width: 6,
          height: 6,
          backgroundColor: 'var(--color-accent)',
        }}
        animate={{
          opacity: visible && variant !== 'read' ? 1 : 0,
          scale: variant === 'link' ? 0.65 : pressed ? 1.35 : 1,
        }}
        transition={{ duration: 0.14 }}
      />
    </div>
  );
}
