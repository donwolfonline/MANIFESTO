import { useEffect, useRef } from 'react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion';
import humanJobJpg from '../assets/human-job.jpg';
import humanJobWebp from '../assets/human-job.webp';

export interface FullBleedTransitionProps {
  /** Leading Markdown hash marker rendered in the accent color */
  prefix?: string;
  /** Centered monospace heading text */
  heading?: string;
  /** Primary WebP image source for modern browsers */
  webpSrc?: string;
  /** Fallback JPEG/PNG image source */
  imageSrc?: string;
  /** Intrinsic image width to prevent layout shift (CLS = 0) */
  imageWidth?: number;
  /** Intrinsic image height to prevent layout shift (CLS = 0) */
  imageHeight?: number;
  /** Descriptive alt text for the photograph */
  imageAlt?: string;
}

const TRANSITION_END = 0.78;

export function FullBleedTransition({
  prefix = '##',
  heading = 'the actual (human) job',
  webpSrc = humanJobWebp,
  imageSrc = humanJobJpg,
  imageWidth = 1376,
  imageHeight = 768,
  imageAlt = 'A single person standing quietly beside a long dark-wood worktable in soft directional daylight.',
}: FullBleedTransitionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const prefersReducedMotion = useReducedMotion();

  // Warm-fetch and decode the tiny 32KB WebP during idle time after initial
  // render so entering the pinned transition never stutters mid-scroll.
  useEffect(() => {
    const preloadSrc = webpSrc || imageSrc;
    if (!preloadSrc) return;

    const warmDecode = () => {
      const preloader = new Image();
      preloader.decoding = 'async';
      preloader.src = preloadSrc;
      if (typeof preloader.decode === 'function') {
        preloader.decode().catch(() => {});
      }
    };

    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(warmDecode, { timeout: 1500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const timer = window.setTimeout(warmDecode, 600);
    return () => window.clearTimeout(timer);
  }, [webpSrc, imageSrc]);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  // Scale image from 1.15 -> 1 across the pinned transition window
  const imageScale = useTransform(
    scrollYProgress,
    [0, TRANSITION_END],
    [1.15, 1],
  );

  // Expand clip-path from inset(15% 10% round 12px) -> inset(0)
  const clipPath = useTransform(scrollYProgress, (progress) => {
    const t = Math.min(1, Math.max(0, progress / TRANSITION_END));
    const insetY = 15 * (1 - t);
    const insetX = 10 * (1 - t);
    const radius = 12 * (1 - t);
    return `inset(${insetY.toFixed(1)}% ${insetX.toFixed(1)}% round ${radius.toFixed(1)}px)`;
  });

  const darkOverlayStyle = {
    background:
      'radial-gradient(ellipse at center, rgba(20, 18, 19, 0.56) 0%, rgba(20, 18, 19, 0.3) 56%, rgba(20, 18, 19, 0.64) 100%), linear-gradient(to bottom, rgba(32, 30, 31, 0.5) 0%, rgba(32, 30, 31, 0.16) 35%, rgba(32, 30, 31, 0.24) 68%, rgba(32, 30, 31, 0.72) 100%)',
  };

  // Static full-bleed presentation (no pinning) when prefers-reduced-motion is enabled
  if (prefersReducedMotion) {
    return (
      <section
        id="transition"
        aria-label={`${prefix} ${heading}`}
        className="relative w-full min-h-[75dvh] flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <picture className="absolute inset-0 block w-full h-full">
          {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
          <img
            src={imageSrc}
            alt={imageAlt}
            width={imageWidth}
            height={imageHeight}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover select-none"
            draggable={false}
          />
        </picture>
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={darkOverlayStyle}
        />
        <h2
          className="relative z-10 m-0 px-6 text-center font-mono font-normal tracking-[0.02em]"
          style={{
            fontSize: 'clamp(1.125rem, 2.75vw, 2.35rem)',
            lineHeight: 1.25,
            color: 'var(--color-text)',
            textShadow: '0 2px 28px rgba(18, 16, 17, 0.65)',
          }}
        >
          <span aria-hidden="true" style={{ color: 'var(--color-accent)' }}>
            {prefix}
          </span>{' '}
          <span>{heading}</span>
        </h2>
      </section>
    );
  }

  return (
    <section
      id="transition"
      ref={sectionRef}
      aria-label={`${prefix} ${heading}`}
      className="relative h-[175dvh] w-full"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      {/* Pinned 100dvh viewport stage: holds heading centered during clip-path/scale transition, then releases */}
      <div className="sticky top-0 h-dvh w-full flex items-center justify-center overflow-hidden">
        {/* Expanding clipped image frame */}
        <motion.div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath }}
        >
          <picture className="block w-full h-full">
            {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
            <motion.img
              src={imageSrc}
              alt={imageAlt}
              width={imageWidth}
              height={imageHeight}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              className="w-full h-full object-cover select-none will-change-transform"
              style={{ scale: imageScale }}
              draggable={false}
            />
          </picture>
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={darkOverlayStyle}
          />
        </motion.div>

        {/* Pinned centered mono heading */}
        <h2
          className="relative z-10 m-0 px-6 text-center font-mono font-normal tracking-[0.02em]"
          style={{
            fontSize: 'clamp(1.125rem, 2.75vw, 2.35rem)',
            lineHeight: 1.25,
            color: 'var(--color-text)',
            textShadow: '0 2px 28px rgba(18, 16, 17, 0.65)',
          }}
        >
          <span aria-hidden="true" style={{ color: 'var(--color-accent)' }}>
            {prefix}
          </span>{' '}
          <span>{heading}</span>
        </h2>
      </div>
    </section>
  );
}
