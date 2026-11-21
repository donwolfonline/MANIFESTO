import { useEffect, useRef } from 'react';
import humanJobJpg from '../assets/human-job.jpg';
import humanJobWebp from '../assets/human-job.webp';
import {
  usePrefersReducedMotion,
  useScrollScrub,
} from '../lib/useViewportActivity';

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
  const clipFrameRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Warm-fetch and decode the tiny 32KB WebP after initial window load settles
  useEffect(() => {
    const preloadSrc = webpSrc || imageSrc;
    if (!preloadSrc) return;

    let timer = 0;
    let idleId = 0;
    const warmDecode = () => {
      const preloader = new Image();
      preloader.decoding = 'async';
      preloader.src = preloadSrc;
      if (typeof preloader.decode === 'function') {
        preloader.decode().catch(() => {});
      }
    };

    const scheduleWarm = () => {
      const w = window as Window & {
        requestIdleCallback?: (
          cb: () => void,
          opts?: { timeout: number },
        ) => number;
        cancelIdleCallback?: (id: number) => void;
      };
      if (typeof w.requestIdleCallback === 'function') {
        idleId = w.requestIdleCallback(warmDecode, { timeout: 2500 });
      } else {
        timer = window.setTimeout(warmDecode, 2200);
      }
    };

    if (document.readyState === 'complete') {
      scheduleWarm();
    } else {
      window.addEventListener('load', scheduleWarm, { once: true });
    }

    return () => {
      window.removeEventListener('load', scheduleWarm);
      if (timer) window.clearTimeout(timer);
      if (idleId) {
        (
          window as Window & { cancelIdleCallback?: (id: number) => void }
        ).cancelIdleCallback?.(idleId);
      }
    };
  }, [webpSrc, imageSrc]);

  // Scrub clip-path and image scale directly; pauses automatically when off-screen or tab is hidden
  useScrollScrub(
    sectionRef,
    (progress) => {
      const t = Math.min(1, Math.max(0, progress / TRANSITION_END));
      if (clipFrameRef.current) {
        const insetY = 15 * (1 - t);
        const insetX = 10 * (1 - t);
        const radius = 12 * (1 - t);
        clipFrameRef.current.style.clipPath = `inset(${insetY.toFixed(1)}% ${insetX.toFixed(1)}% round ${radius.toFixed(1)}px)`;
      }
      if (imgRef.current) {
        const scale = 1.15 - 0.15 * t;
        imgRef.current.style.transform = `scale(${scale.toFixed(4)})`;
      }
    },
    { disabled: prefersReducedMotion },
  );

  const darkOverlayStyle = {
    background:
      'radial-gradient(ellipse at center, rgba(20, 18, 19, 0.56) 0%, rgba(20, 18, 19, 0.3) 56%, rgba(20, 18, 19, 0.64) 100%), linear-gradient(to bottom, rgba(32, 30, 31, 0.5) 0%, rgba(32, 30, 31, 0.16) 35%, rgba(32, 30, 31, 0.24) 68%, rgba(32, 30, 31, 0.72) 100%)',
  };

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
            color: '#f2eee8',
            textShadow: '0 2px 28px rgba(18, 16, 17, 0.65)',
          }}
        >
          <span aria-hidden="true" style={{ color: '#f0642d' }}>
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
      <div className="sticky top-0 h-dvh w-full flex items-center justify-center overflow-hidden">
        <div
          ref={clipFrameRef}
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: 'inset(15.0% 10.0% round 12.0px)' }}
        >
          <picture className="block w-full h-full">
            {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
            <img
              ref={imgRef}
              src={imageSrc}
              alt={imageAlt}
              width={imageWidth}
              height={imageHeight}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              className="w-full h-full object-cover select-none will-change-transform"
              style={{ transform: 'scale(1.15)' }}
              draggable={false}
            />
          </picture>
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={darkOverlayStyle}
          />
        </div>

        <h2
          className="relative z-10 m-0 px-6 text-center font-mono font-normal tracking-[0.02em]"
          style={{
            fontSize: 'clamp(1.125rem, 2.75vw, 2.35rem)',
            lineHeight: 1.25,
            color: '#f2eee8',
            textShadow: '0 2px 28px rgba(18, 16, 17, 0.65)',
          }}
        >
          <span aria-hidden="true" style={{ color: '#f0642d' }}>
            {prefix}
          </span>{' '}
          <span>{heading}</span>
        </h2>
      </div>
    </section>
  );
}
