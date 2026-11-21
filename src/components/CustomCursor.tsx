/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState } from 'react';
import { useDocumentVisible } from '../lib/useViewportActivity';

export interface CustomCursorProps {
  /** CSS selector for the reading/body section where the "read" label appears */
  readSectionSelector?: string;
  /** Label shown inside the expanded ring over the reading section */
  readLabel?: string;
  /** Toggle custom cursor on/off */
  enabled?: boolean;
}

export type CursorVariant = 'default' | 'link' | 'labeled';
export type CursorAreaLabel = 'read' | 'drag' | 'open';

const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';
const COARSE_POINTER_QUERY = '(pointer: coarse)';
const SPRING_STIFFNESS = 0.22;
const SPRING_DAMPING = 0.72;

export function isFineDesktopPointerDevice(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  if (window.matchMedia(COARSE_POINTER_QUERY).matches) {
    return false;
  }
  return window.matchMedia(FINE_POINTER_QUERY).matches;
}

/**
 * Resolves the cursor variant and optional inner area label ("read", "drag", "open")
 * for a hovered DOM target.
 */
export function resolveCursorStateForTarget(
  target: HTMLElement | null,
  readSectionSelector = '#read',
  defaultReadLabel: CursorAreaLabel = 'read',
): { variant: CursorVariant; label: CursorAreaLabel | null } {
  if (!target || typeof target.closest !== 'function') {
    return { variant: 'default', label: null };
  }

  // 1. Explicit data-cursor-label / data-cursor override ("read", "drag", "open")
  const explicitNode = target.closest<HTMLElement>(
    '[data-cursor-label], [data-cursor]',
  );
  if (explicitNode) {
    const raw = (
      explicitNode.getAttribute('data-cursor-label') ||
      explicitNode.getAttribute('data-cursor') ||
      ''
    )
      .trim()
      .toLowerCase();
    if (raw === 'read' || raw === 'drag' || raw === 'open') {
      return { variant: 'labeled', label: raw };
    }
    if (raw === 'link') {
      return { variant: 'link', label: null };
    }
  }

  // 2. Draggable sliders, range inputs, and comparison dividers -> "drag"
  if (
    target.closest(
      '[role="slider"], input[type="range"], .cursor-ew-resize, .cursor-grab, .cursor-grabbing',
    )
  ) {
    return { variant: 'labeled', label: 'drag' };
  }

  // 3. Dialog triggers, museum exhibit placards, and bookshelf spines -> "open"
  if (
    target.closest(
      '[aria-haspopup="dialog"], [data-exhibit-card], [data-shelf-book]',
    )
  ) {
    return { variant: 'labeled', label: 'open' };
  }

  // 4. Standard links, buttons, and form controls -> expanded ring
  if (
    target.closest(
      'a, button, [role="button"], input, textarea, select, summary',
    )
  ) {
    return { variant: 'link', label: null };
  }

  // 5. Long-form reading section -> expanded ring with "read" label
  if (readSectionSelector && target.closest(readSectionSelector)) {
    return { variant: 'labeled', label: defaultReadLabel };
  }

  return { variant: 'default', label: null };
}

export function CustomCursor({
  readSectionSelector = '#read',
  readLabel = 'read',
  enabled = true,
}: CustomCursorProps) {
  const docVisible = useDocumentVisible();
  const [isDesktopPointer, setIsDesktopPointer] = useState<boolean>(() =>
    isFineDesktopPointerDevice(),
  );
  // Render NOTHING in the DOM until the first real pointermove arrives
  const [hasMoved, setHasMoved] = useState(false);
  const [visible, setVisible] = useState(false);
  const [variant, setVariant] = useState<CursorVariant>('default');
  const [areaLabel, setAreaLabel] = useState<CursorAreaLabel | null>(null);
  const [pressed, setPressed] = useState(false);

  const ringRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);
  const posRef = useRef({
    targetX: -100,
    targetY: -100,
    ringX: -100,
    ringY: -100,
    vx: 0,
    vy: 0,
    initialized: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const fineMq = window.matchMedia(FINE_POINTER_QUERY);
    const coarseMq = window.matchMedia(COARSE_POINTER_QUERY);

    const syncPointerCapability = () => {
      const fine = isFineDesktopPointerDevice();
      setIsDesktopPointer(fine);
      if (!fine) {
        setHasMoved(false);
        setVisible(false);
      }
    };

    syncPointerCapability();
    fineMq.addEventListener('change', syncPointerCapability);
    coarseMq.addEventListener('change', syncPointerCapability);
    return () => {
      fineMq.removeEventListener('change', syncPointerCapability);
      coarseMq.removeEventListener('change', syncPointerCapability);
    };
  }, []);

  const canTrack = enabled && isDesktopPointer && docVisible;
  const shouldRender = canTrack && hasMoved && visible;

  useEffect(() => {
    const root = document.documentElement;
    if (shouldRender) {
      root.classList.add('has-custom-cursor');
    } else {
      root.classList.remove('has-custom-cursor');
    }
    return () => root.classList.remove('has-custom-cursor');
  }, [shouldRender]);

  useEffect(() => {
    if (!canTrack) return;

    let rafId = 0;
    let lastTarget: EventTarget | null = null;

    const animateRingSpring = () => {
      const pos = posRef.current;
      const dx = pos.targetX - pos.ringX;
      const dy = pos.targetY - pos.ringY;

      pos.vx = (pos.vx + dx * SPRING_STIFFNESS) * SPRING_DAMPING;
      pos.vy = (pos.vy + dy * SPRING_STIFFNESS) * SPRING_DAMPING;
      pos.ringX += pos.vx;
      pos.ringY += pos.vy;

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${pos.ringX.toFixed(1)}px, ${pos.ringY.toFixed(1)}px, 0) translate(-50%, -50%)`;
      }

      if (
        Math.abs(dx) > 0.2 ||
        Math.abs(dy) > 0.2 ||
        Math.abs(pos.vx) > 0.1 ||
        Math.abs(pos.vy) > 0.1
      ) {
        rafId = window.requestAnimationFrame(animateRingSpring);
      } else {
        pos.ringX = pos.targetX;
        pos.ringY = pos.targetY;
        pos.vx = 0;
        pos.vy = 0;
        if (ringRef.current) {
          ringRef.current.style.transform = `translate3d(${pos.ringX.toFixed(1)}px, ${pos.ringY.toFixed(1)}px, 0) translate(-50%, -50%)`;
        }
        rafId = 0;
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        setVisible(false);
        setHasMoved(false);
        return;
      }

      const pos = posRef.current;
      pos.targetX = event.clientX;
      pos.targetY = event.clientY;

      if (!pos.initialized) {
        pos.initialized = true;
        pos.ringX = event.clientX;
        pos.ringY = event.clientY;
        pos.vx = 0;
        pos.vy = 0;
      }

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${pos.targetX.toFixed(1)}px, ${pos.targetY.toFixed(1)}px, 0) translate(-50%, -50%)`;
      }

      if (rafId === 0) {
        rafId = window.requestAnimationFrame(animateRingSpring);
      }

      setHasMoved((prev) => (prev ? prev : true));
      setVisible((prev) => (prev ? prev : true));

      if (event.target === lastTarget) return;
      lastTarget = event.target;

      const resolved = resolveCursorStateForTarget(
        event.target as HTMLElement | null,
        readSectionSelector,
        (readLabel as CursorAreaLabel) || 'read',
      );
      setVariant((prev) =>
        prev === resolved.variant ? prev : resolved.variant,
      );
      setAreaLabel((prev) => (prev === resolved.label ? prev : resolved.label));
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        setVisible(false);
        setHasMoved(false);
        return;
      }
      setPressed(true);
    };
    const handlePointerUp = () => setPressed(false);
    const handleMouseLeave = () => setVisible(false);

    window.addEventListener('pointermove', handlePointerMove, {
      passive: true,
    });
    window.addEventListener('pointerdown', handlePointerDown, {
      passive: true,
    });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [canTrack, readSectionSelector, readLabel]);

  // Render nothing at all until the first real pointermove on a fine-pointer desktop device
  if (!shouldRender) return null;

  const baseRingSize =
    variant === 'labeled' ? 62 : variant === 'link' ? 48 : 30;
  const ringSize = pressed ? Math.round(baseRingSize * 0.84) : baseRingSize;
  const dotSize = pressed ? 4 : 6;
  const pos = posRef.current;

  return (
    <div
      aria-hidden="true"
      data-testid="custom-cursor-root"
      className="custom-cursor-root fixed inset-0 pointer-events-none"
      style={{ zIndex: 'var(--z-cursor)' }}
    >
      <div
        ref={ringRef}
        data-testid="custom-cursor-ring"
        data-variant={variant}
        data-label={areaLabel ?? ''}
        data-pressed={pressed ? 'true' : 'false'}
        className="fixed top-0 left-0 rounded-full flex items-center justify-center border"
        style={{
          width: ringSize,
          height: ringSize,
          transform: `translate3d(${pos.ringX.toFixed(1)}px, ${pos.ringY.toFixed(1)}px, 0) translate(-50%, -50%)`,
          borderColor:
            variant === 'link' || variant === 'labeled'
              ? 'var(--color-accent)'
              : 'var(--color-border-strong)',
          backgroundColor:
            variant === 'labeled'
              ? 'var(--color-bg-glass)'
              : variant === 'link'
                ? 'var(--color-accent-soft)'
                : 'transparent',
          transition:
            'width 200ms cubic-bezier(0.16, 1, 0.3, 1), height 200ms cubic-bezier(0.16, 1, 0.3, 1), border-color 160ms ease, background-color 160ms ease',
        }}
      >
        {variant === 'labeled' && areaLabel && (
          <span
            data-testid="custom-cursor-label"
            className="font-mono lowercase tracking-[0.1em] select-none"
            style={{
              fontSize: '0.625rem',
              color: 'var(--color-text)',
              transform: pressed ? 'scale(0.9)' : 'scale(1)',
              transition: 'transform 140ms ease',
            }}
          >
            {areaLabel}
          </span>
        )}
      </div>

      <div
        ref={dotRef}
        data-testid="custom-cursor-dot"
        className="fixed top-0 left-0 rounded-full"
        style={{
          width: dotSize,
          height: dotSize,
          transform: `translate3d(${pos.targetX.toFixed(1)}px, ${pos.targetY.toFixed(1)}px, 0) translate(-50%, -50%)`,
          backgroundColor: 'var(--color-accent)',
          opacity: variant === 'labeled' ? 0 : 1,
          transition:
            'width 140ms ease, height 140ms ease, opacity 140ms ease',
        }}
      />
    </div>
  );
}
