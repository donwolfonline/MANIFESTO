import fs from 'node:fs';
import path from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BugMuseumPage } from '../components/BugMuseumPage';
import { CodeCompareSlider } from '../components/CodeCompareSlider';
import { CommitLogPage } from '../components/CommitLogPage';
import { FilmGrain } from '../components/FilmGrain';
import { PlaygroundPage } from '../components/PlaygroundPage';
import { ShelfPage } from '../components/ShelfPage';
import { Terminal } from '../components/Terminal';
import { WallPage } from '../components/WallPage';
import { MANIFESTO_COMMITS } from '../data/commitLog';
import { MANIFESTO_ITEMS } from '../data/manifestoItems';
import { SmoothScrollProvider } from '../lib/lenis';
import { detectLowPowerMode } from '../lib/lowPower';
import { parseManifesto } from '../lib/markdown';
import { createManifestoCommands } from '../lib/terminalCommands';

describe('Responsive architecture (breakpoints, safe-area viewport, container queries, page-by-page mobile patterns & low-power pause)', () => {
  const { meta } = parseManifesto('');

  afterEach(() => {
    document.documentElement.removeAttribute('data-low-power');
    vi.restoreAllMocks();
  });

  it('defines all breakpoint tokens (360..2560), 1440px ultrawide cap, 62ch measure, viewport-fit=cover, landscape phone & coarse-pointer CSS rules', () => {
    const html = fs.readFileSync(path.resolve('index.html'), 'utf8');
    const tokens = fs.readFileSync(path.resolve('src/styles/tokens.css'), 'utf8');
    const globalCss = fs.readFileSync(
      path.resolve('src/styles/global.css'),
      'utf8',
    );

    expect(html).toContain('viewport-fit=cover');

    [
      '--bp-xs: 360px',
      '--bp-fold: 480px',
      '--bp-sm: 640px',
      '--bp-md: 768px',
      '--bp-lg: 1024px',
      '--bp-xl: 1280px',
      '--bp-2xl: 1536px',
      '--bp-3xl: 1920px',
      '--bp-4xl: 2560px',
      '--measure: 62ch',
      '--container-max: 90rem',
      '100dvh',
      '100svh',
      '100lvh',
    ].forEach((token) => {
      expect(tokens).toContain(token);
    });

    expect(globalCss).toContain('@media (hover: hover)');
    expect(globalCss).toContain('@media (pointer: coarse)');
    expect(globalCss).toContain('min-height: 44px');
    expect(globalCss).toContain('container-type: inline-size');
    expect(globalCss).toContain('@container (min-width: 600px)');
    expect(globalCss).toContain(
      '@media (orientation: landscape) and (max-height: 500px)',
    );
    expect(globalCss).toContain(':root[data-low-power=\'true\']');
  });

  it('renders on-screen mobile terminal key row (Tab, Up/Down arrows, Ctrl-C) with min 44x44px hit targets that execute real terminal actions', async () => {
    const user = userEvent.setup();
    const commands = createManifestoCommands(meta, MANIFESTO_ITEMS);

    render(
      <Terminal
        commands={commands}
        onNavigate={() => {}}
        onAccentChange={() => ({
          ok: true,
          label: 'ember',
          hex: '#f0642d',
          available: ['ember', 'lime', 'ice', 'rose'],
        })}
      />,
    );

    const keyRow = screen.getByTestId('terminal-mobile-key-row');
    expect(keyRow).toBeInTheDocument();

    const input = screen.getByLabelText('Terminal command input') as HTMLInputElement;
    await user.type(input, 'man');

    // Tapping on-screen Tab completes 'man' -> 'manifesto'
    await user.click(screen.getByRole('button', { name: /tab autocomplete/i }));
    expect(input.value).toBe('manifesto');

    // Ctrl-C virtual button interrupts/clears the current line with ^C
    await user.click(screen.getByRole('button', { name: /ctrl-c interrupt/i }));
    expect(input.value).toBe('');

    // Run a command, then tap ↑ virtual key to recall it from history
    await user.type(input, 'ls{Enter}');
    expect(input.value).toBe('');
    await user.click(
      screen.getByRole('button', { name: /previous command in history/i }),
    );
    expect(input.value).toBe('ls');
  });

  it('provides vertical swipe cards in Bug Museum, collapsed diffs on mobile in Commit Log, large 44x44px Delete slider handle, Playground bottom sheet, single-col Wall masonry, and horizontal snap Shelf', async () => {
    const user = userEvent.setup();

    // 1. Bug Museum vertical swipe deck + swipe controls
    const { unmount: unmountMuseum } = render(
      <SmoothScrollProvider>
        <BugMuseumPage
          meta={meta}
          onNavigateHome={() => {}}
          onOpenTerminal={() => {}}
        />
      </SmoothScrollProvider>,
    );
    expect(
      screen.getByTestId('bug-museum-mobile-swipe-bar'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('bug-museum-track').className).toContain(
      'snap-y',
    );
    unmountMuseum();

    // 2. Commit Log collapsed diff by default on mobile (< 768px)
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 390,
    });
    const origMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((q: string) => ({
        matches: q.includes('max-width: 767px') || q.includes('pointer: coarse'),
        media: q,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const { unmount: unmountLog } = render(
      <CommitLogPage
        meta={meta}
        commits={MANIFESTO_COMMITS}
        onNavigateHome={() => {}}
        onOpenTerminal={() => {}}
        onOpenMuseum={() => {}}
      />,
    );
    const firstCommitBtn = screen.getByRole('button', {
      name: new RegExp(MANIFESTO_COMMITS[0].subject, 'i'),
    });
    expect(firstCommitBtn).toHaveAttribute('aria-expanded', 'false');
    unmountLog();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: origMatchMedia,
    });

    // 3. Delete comparison slider large 44x44px touch handle
    const { unmount: unmountSlider } = render(
      <CodeCompareSlider
        title="Refactor"
        filename="index.ts"
        beforeCode="const a = 1;\nconst b = 2;"
        afterCode="const sum = 3;"
      />,
    );
    const handle = screen.getByTestId('delete-slider-handle');
    expect(handle.className).toContain('min-w-[44px]');
    unmountSlider();

    // 4. Playground bottom sheet toggle
    const { unmount: unmountPlayground } = render(
      <PlaygroundPage
        meta={meta}
        onNavigateHome={() => {}}
        onOpenTerminal={() => {}}
        onOpenDelete={() => {}}
      />,
    );
    const sheetToggle = screen.getByTestId('playground-sheet-toggle');
    const sheet = screen.getByTestId('playground-controls-sheet');
    expect(sheet).toHaveAttribute('data-sheet-open', 'false');
    await user.click(sheetToggle);
    expect(sheet).toHaveAttribute('data-sheet-open', 'true');
    unmountPlayground();

    // 5. Wall single-column mobile masonry grid
    const { unmount: unmountWall } = render(
      <WallPage
        meta={meta}
        onNavigateHome={() => {}}
        onOpenTerminal={() => {}}
        onOpenAdmin={() => {}}
      />,
    );
    await screen.findByTestId('wall-masonry-grid');
    expect(screen.getByTestId('wall-masonry-grid')).toHaveClass(
      'cq-wall-masonry',
    );
    unmountWall();

    // 6. Shelf horizontal snap scroll + touch long-press preview
    render(
      <SmoothScrollProvider>
        <ShelfPage
          meta={meta}
          onNavigateHome={() => {}}
          onOpenTerminal={() => {}}
          onOpenWall={() => {}}
        />
      </SmoothScrollProvider>,
    );
    const rows = screen.getAllByTestId('shelf-scroll-row');
    expect(rows[0].className).toContain('snap-x');
    expect(rows[0].className).toContain('overflow-x-auto');
    expect(rows[0].className).not.toContain('flex-wrap');
  });

  it('pauses heavy ambient animations on low-power and battery-saver devices', () => {
    expect(detectLowPowerMode({ charging: false, level: 0.15 })).toBe(true);
    expect(detectLowPowerMode({ charging: true, level: 0.15 })).toBe(false);

    document.documentElement.setAttribute('data-low-power', 'true');
    expect(detectLowPowerMode()).toBe(true);

    render(<FilmGrain />);
    const grain = screen.getByTestId('film-grain-overlay');
    expect(grain).toHaveAttribute('data-low-power-paused', 'true');
    expect(grain).not.toHaveClass('film-grain--drift');
    fireEvent.touchStart(grain);
  });
});
