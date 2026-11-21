import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLowPowerMode } from '../lib/lowPower';
import {
  createNoise2D,
  MOBILE_MAX_COUNT,
  PLAYGROUND_PALETTES,
  type CompiledDrawFn,
  type PlaygroundSettings,
} from '../lib/playgroundEngine';

export interface PlaygroundCanvasHandle {
  exportPng: (filename: string) => void;
}

export interface PlaygroundCanvasProps {
  settings: PlaygroundSettings;
  drawFn: CompiledDrawFn | null;
  playing: boolean;
  isMobile: boolean;
  onRuntimeError: (error: string | null) => void;
}

export const PlaygroundCanvas = forwardRef<
  PlaygroundCanvasHandle,
  PlaygroundCanvasProps
>(function PlaygroundCanvas(
  { settings, drawFn, playing, isMobile, onRuntimeError },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lowPower = useLowPowerMode();
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(() =>
    typeof document === 'undefined' ? true : !document.hidden,
  );
  const [canvasSize, setCanvasSize] = useState({ width: 640, height: 480 });

  const elapsedRef = useRef(0);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const drawFnRef = useRef(drawFn);
  drawFnRef.current = drawFn;
  const onRuntimeErrorRef = useRef(onRuntimeError);
  onRuntimeErrorRef.current = onRuntimeError;
  const lastRuntimeErrorRef = useRef<string | null>(null);

  const effectiveCount = isMobile
    ? Math.min(settings.count, MOBILE_MAX_COUNT)
    : settings.count;

  const noise2D = useMemo(() => createNoise2D(settings.seed), [settings.seed]);
  const noiseRef = useRef(noise2D);
  noiseRef.current = noise2D;

  useImperativeHandle(
    ref,
    () => ({
      exportPng(filename: string) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        link.click();
      },
    }),
    [],
  );

  // Pause animation automatically when scrolled off screen
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setInView(Boolean(entries[0]?.isIntersecting));
      },
      { threshold: 0.05 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Pause animation automatically when browser tab is backgrounded
  useEffect(() => {
    const handleVisibility = () => {
      setTabVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Track responsive container size with HiDPI scaling capped at 2x
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const syncSize = () => {
      const rect = node.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setCanvasSize({
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    };

    syncSize();
    const ro = new ResizeObserver(syncSize);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  // Render helper shared by single-frame updates and the RAF loop
  const renderFrame = (timeSeconds: number) => {
    const canvas = canvasRef.current;
    const fn = drawFnRef.current;
    if (!canvas || !fn) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.round(canvasSize.width * dpr);
    const targetH = Math.round(canvasSize.height * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const current = settingsRef.current;
    const cappedCount = isMobile
      ? Math.min(current.count, MOBILE_MAX_COUNT)
      : current.count;

    try {
      fn(ctx, {
        width: canvasSize.width,
        height: canvasSize.height,
        time: timeSeconds,
        shape: current.shape,
        count: cappedCount,
        noiseScale: current.noiseScale,
        speed: current.speed,
        palette: PLAYGROUND_PALETTES[current.palette],
        symmetry: current.symmetry,
        seed: current.seed,
        noise2D: noiseRef.current,
      });

      if (lastRuntimeErrorRef.current !== null) {
        lastRuntimeErrorRef.current = null;
        onRuntimeErrorRef.current(null);
      }
    } catch (err) {
      const message =
        err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      if (lastRuntimeErrorRef.current !== message) {
        lastRuntimeErrorRef.current = message;
        onRuntimeErrorRef.current(message);
      }
    } finally {
      ctx.restore();
    }
  };

  // Keep a stable handle to the latest renderFrame so effects don't restart every render
  const renderFrameRef = useRef(renderFrame);
  useLayoutEffect(() => {
    renderFrameRef.current = renderFrame;
  });

  // Always draw at least one crisp frame when settings, size, or compiled code change
  useEffect(() => {
    renderFrameRef.current(elapsedRef.current);
  }, [settings, drawFn, canvasSize, effectiveCount]);

  // requestAnimationFrame loop — automatically pauses when off-screen, hidden, paused, or low-power
  useEffect(() => {
    if (!playing || !inView || !tabVisible || lowPower || !drawFn) return;

    let rafId = 0;
    let lastTs = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;
      elapsedRef.current += dt;
      renderFrameRef.current(elapsedRef.current);
      rafId = window.requestAnimationFrame(loop);
    };

    rafId = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(rafId);
  }, [playing, inView, tabVisible, lowPower, drawFn, canvasSize, isMobile]);

  const isRunning = playing && inView && tabVisible && !lowPower;

  return (
    <div
      ref={containerRef}
      data-low-power-paused={lowPower ? 'true' : 'false'}
      className="relative w-full aspect-[4/3] border overflow-hidden"
      style={{
        borderColor: 'var(--color-border-strong)',
        backgroundColor: '#191718',
        borderRadius: 'var(--radius-sm)',
      }}
    >
      <canvas
        ref={canvasRef}
        aria-label={`Generative art canvas showing ${effectiveCount} ${settings.shape} primitives in the ${PLAYGROUND_PALETTES[settings.palette].label} palette`}
        className="block w-full h-full"
      />

      {/* Quiet corner status badge */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-3 left-3 px-2 py-0.5 border font-mono uppercase tracking-[var(--tracking-micro)] flex items-center gap-2"
        style={{
          fontSize: '0.625rem',
          borderRadius: 'var(--radius-xs)',
          borderColor: 'var(--color-border)',
          backgroundColor: 'rgba(25, 23, 24, 0.88)',
          color: 'var(--color-text-muted)',
        }}
      >
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{
            backgroundColor: isRunning
              ? 'var(--color-accent)'
              : 'var(--color-text-muted)',
          }}
        />
        <span>
          {isRunning ? 'live' : lowPower ? 'paused (low power)' : 'paused'}
        </span>
        <span>·</span>
        <span>{effectiveCount} pcs</span>
      </div>
    </div>
  );
});
