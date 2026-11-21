import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CustomCursor,
  resolveCursorStateForTarget,
} from '../components/CustomCursor';
import { computeMagneticPull, Header } from '../components/Header';
import { SmoothScrollProvider } from '../lib/lenis';

function mockPointerMedia(fine: boolean, coarse: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches:
        query.includes('pointer: fine')
          ? fine
          : query.includes('pointer: coarse')
            ? coarse
            : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('CustomCursor (zero render before first pointermove, coarse-pointer hiding, labels, press shrink, and Header magnetic pull)', () => {
  beforeEach(() => {
    mockPointerMedia(true, false);
  });

  afterEach(() => {
    document.documentElement.classList.remove('has-custom-cursor');
    vi.restoreAllMocks();
  });

  it('renders nothing before the first real pointermove (preventing any top-left stuck ring) and hides entirely on touch / pointer: coarse devices', () => {
    const { unmount } = render(<CustomCursor />);

    // Before first pointermove: literally nothing rendered in DOM and no has-custom-cursor class
    expect(screen.queryByTestId('custom-cursor-root')).toBeNull();
    expect(screen.queryByTestId('custom-cursor-ring')).toBeNull();
    expect(
      document.documentElement.classList.contains('has-custom-cursor'),
    ).toBe(false);

    // Touch pointermove does NOT activate the cursor
    act(() => {
      const touchMove = new Event('pointermove', { bubbles: true });
      Object.assign(touchMove, {
        clientX: 120,
        clientY: 160,
        pointerType: 'touch',
      });
      window.dispatchEvent(touchMove);
    });
    expect(screen.queryByTestId('custom-cursor-root')).toBeNull();

    // First real fine-pointer move mounts the dot & ring directly at (240, 180)
    act(() => {
      const mouseMove = new Event('pointermove', { bubbles: true });
      Object.assign(mouseMove, {
        clientX: 240,
        clientY: 180,
        pointerType: 'mouse',
      });
      window.dispatchEvent(mouseMove);
    });

    const ring = screen.getByTestId('custom-cursor-ring');
    const dot = screen.getByTestId('custom-cursor-dot');
    expect(ring).toBeInTheDocument();
    expect(dot).toBeInTheDocument();
    expect(ring.style.transform).toContain('240px, 180px');
    expect(dot.style.transform).toContain('240px, 180px');

    unmount();

    // On pointer: coarse device, renders nothing even after mouse pointermove
    mockPointerMedia(false, true);
    render(<CustomCursor />);
    act(() => {
      const move = new Event('pointermove', { bubbles: true });
      Object.assign(move, {
        clientX: 100,
        clientY: 100,
        pointerType: 'mouse',
      });
      window.dispatchEvent(move);
    });
    expect(screen.queryByTestId('custom-cursor-root')).toBeNull();
  });

  it('grows over links/buttons, shows "read", "drag", and "open" labels over specific areas, and shrinks on press', () => {
    render(
      <div>
        <CustomCursor readSectionSelector="#read" />
        <a href="/today" data-testid="sample-link">
          /today
        </a>
        <div id="read" data-testid="read-zone">
          Manifesto prose
        </div>
        <div role="slider" data-testid="drag-zone" aria-valuenow={50}>
          Slider
        </div>
        <button
          type="button"
          aria-haspopup="dialog"
          data-testid="open-zone"
        >
          Field Index
        </button>
      </div>,
    );

    // Move over link -> variant="link" (48px ring)
    const linkEl = screen.getByTestId('sample-link');
    act(() => {
      fireEvent.pointerMove(linkEl, {
        clientX: 100,
        clientY: 100,
        pointerType: 'mouse',
      });
    });
    const ring = screen.getByTestId('custom-cursor-ring');
    expect(ring).toHaveAttribute('data-variant', 'link');
    expect(ring).toHaveStyle({ width: '48px', height: '48px' });

    // Move over #read section -> variant="labeled", label="read" (62px ring)
    act(() => {
      fireEvent.pointerMove(screen.getByTestId('read-zone'), {
        clientX: 150,
        clientY: 150,
        pointerType: 'mouse',
      });
    });
    expect(ring).toHaveAttribute('data-variant', 'labeled');
    expect(ring).toHaveAttribute('data-label', 'read');
    expect(screen.getByTestId('custom-cursor-label')).toHaveTextContent('read');
    expect(ring).toHaveStyle({ width: '62px', height: '62px' });

    // Move over slider -> label="drag"
    act(() => {
      fireEvent.pointerMove(screen.getByTestId('drag-zone'), {
        clientX: 200,
        clientY: 200,
        pointerType: 'mouse',
      });
    });
    expect(ring).toHaveAttribute('data-label', 'drag');
    expect(screen.getByTestId('custom-cursor-label')).toHaveTextContent('drag');

    // Move over dialog trigger -> label="open"
    act(() => {
      fireEvent.pointerMove(screen.getByTestId('open-zone'), {
        clientX: 250,
        clientY: 250,
        pointerType: 'mouse',
      });
    });
    expect(ring).toHaveAttribute('data-label', 'open');
    expect(screen.getByTestId('custom-cursor-label')).toHaveTextContent('open');

    // Press shrinks the ring (62 * 0.84 = 52px)
    act(() => {
      fireEvent.pointerDown(screen.getByTestId('open-zone'), {
        pointerType: 'mouse',
      });
    });
    expect(ring).toHaveAttribute('data-pressed', 'true');
    expect(ring).toHaveStyle({ width: '52px', height: '52px' });

    act(() => {
      fireEvent.pointerUp(screen.getByTestId('open-zone'), {
        pointerType: 'mouse',
      });
    });
    expect(ring).toHaveAttribute('data-pressed', 'false');
    expect(ring).toHaveStyle({ width: '62px', height: '62px' });

    // Also verify helper directly
    expect(
      resolveCursorStateForTarget(screen.getByTestId('drag-zone')),
    ).toEqual({
      variant: 'labeled',
      label: 'drag',
    });
  });

  it('applies magnetic pull of up to 8px within 60px on Header buttons and the Field Index button', () => {
    const rect = { left: 100, top: 20, width: 80, height: 40 }; // center = (140, 40)

    // At 30px to the right of center (within 60px) -> 4px pull
    const midPull = computeMagneticPull(170, 40, rect);
    expect(midPull.active).toBe(true);
    expect(midPull.x).toBe(4);
    expect(midPull.y).toBe(0);

    // At 60px to the right of center -> max 8px pull
    const edgePull = computeMagneticPull(200, 40, rect);
    expect(edgePull.active).toBe(true);
    expect(edgePull.x).toBe(8);
    expect(edgePull.y).toBe(0);

    // Beyond 60px -> 0px pull
    const outsidePull = computeMagneticPull(220, 40, rect);
    expect(outsidePull.active).toBe(false);
    expect(outsidePull.x).toBe(0);
    expect(outsidePull.y).toBe(0);

    render(
      <SmoothScrollProvider>
        <Header
          filename="working_copy.md"
          viewMode="editorial"
          onViewModeChange={() => {}}
          isIndexOpen={false}
          onToggleIndex={() => {}}
        />
      </SmoothScrollProvider>,
    );

    const fieldIndexBtn = screen.getByTestId('field-index-trigger');
    expect(fieldIndexBtn).toHaveAttribute('data-magnetic', 'true');
    expect(fieldIndexBtn).toHaveAttribute('data-cursor-label', 'open');

    vi.spyOn(fieldIndexBtn, 'getBoundingClientRect').mockReturnValue({
      left: 900,
      top: 10,
      width: 120,
      height: 40,
      right: 1020,
      bottom: 50,
      x: 900,
      y: 10,
      toJSON: () => ({}),
    });

    // Pointer 30px right of button center (center = 960, 30 -> pointer = 990, 30)
    act(() => {
      const move = new Event('pointermove', { bubbles: true });
      Object.assign(move, {
        clientX: 990,
        clientY: 30,
        pointerType: 'mouse',
      });
      window.dispatchEvent(move);
    });

    expect(fieldIndexBtn).toHaveAttribute('data-magnetic-x', '4');
    expect(fieldIndexBtn.style.transform).toContain('translate3d(4px, 0px');
  });
});
