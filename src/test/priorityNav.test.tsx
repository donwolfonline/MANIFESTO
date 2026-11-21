import { act, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Header } from '../components/Header';
import { PRIORITY_HEADER_ROUTES } from '../lib/routes';

type ResizeCallback = ResizeObserverCallback;

describe('Priority+ Header (usePriorityNav + ResizeObserver viewport adaptation)', () => {
  let activeObservers: Set<ResizeCallback>;
  let currentWidth = 1440;
  let originalResizeObserver: typeof globalThis.ResizeObserver | undefined;
  let rectSpy: ReturnType<typeof vi.spyOn>;

  function setSimulatedViewportWidth(widthPx: number) {
    currentWidth = widthPx;
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: widthPx,
    });
    window.dispatchEvent(new Event('resize'));
    activeObservers.forEach((cb) => {
      cb([], {} as ResizeObserver);
    });
  }

  beforeEach(() => {
    activeObservers = new Set();
    currentWidth = 1440;
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1440,
    });

    originalResizeObserver = globalThis.ResizeObserver;

    class MockResizeObserver implements ResizeObserver {
      private callback: ResizeCallback;
      constructor(callback: ResizeCallback) {
        this.callback = callback;
        activeObservers.add(callback);
      }
      observe() {}
      unobserve() {}
      disconnect() {
        activeObservers.delete(this.callback);
      }
    }

    globalThis.ResizeObserver = MockResizeObserver;

    // Return realistic widths for the header shell, left cluster, right trigger, and candidate links
    rectSpy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        let width = 0;
        if (this.classList.contains('header-cq-shell')) {
          width = currentWidth;
        } else if (this.getAttribute('data-testid') === 'field-index-trigger') {
          width = currentWidth < 768 ? 44 : 185;
        } else if (this.parentElement?.getAttribute('aria-hidden') === 'true') {
          // Off-screen measurement sizer items (~100px each)
          width = 100;
        }

        return {
          x: 0,
          y: 0,
          top: 0,
          left: 0,
          right: width,
          bottom: 44,
          width,
          height: 44,
          toJSON: () => ({}),
        } as DOMRect;
      });
  });

  afterEach(() => {
    rectSpy.mockRestore();
    if (originalResizeObserver) {
      globalThis.ResizeObserver = originalResizeObserver;
    }
  });

  it('dynamically adjusts visible links, toggle density, brand label, and +N overflow counter as viewport resizes across 1440px -> 1150px -> 900px -> 390px', () => {
    render(
      <Header
        filename="working_copy.md"
        viewMode="editorial"
        onViewModeChange={() => {}}
        isIndexOpen={false}
        onToggleIndex={() => {}}
      />,
    );

    const nav = screen.getByTestId('priority-nav');

    // 1. Wide desktop (1440px, >= 1280px):
    //    Shows full "~/working_copy.md", full segmented toggle, top 5 priority links, and "+5" overflow badge
    expect(screen.getByTestId('header-brand-path')).toHaveTextContent(
      '~/working_copy.md',
    );
    expect(
      screen.getByTestId('view-mode-segmented-toggle'),
    ).toBeInTheDocument();

    let visibleLinks = within(nav).getAllByRole('link');
    expect(visibleLinks).toHaveLength(5);
    expect(visibleLinks.map((a) => a.textContent)).toEqual(
      PRIORITY_HEADER_ROUTES.slice(0, 5).map((r) => r.label),
    );
    expect(screen.getByTestId('field-index-overflow-count')).toHaveTextContent(
      '+5',
    );

    // 2. Narrower 1280px desktop where only 4 links fit:
    act(() => {
      setSimulatedViewportWidth(1060);
    });

    // At 1060px (1024-1279px tier):
    // Compact segmented toggle ("ed | .md"), 2-3 highest-priority links, "+7" overflow counter
    visibleLinks = within(nav).getAllByRole('link');
    expect(visibleLinks).toHaveLength(3);
    expect(visibleLinks.map((a) => a.textContent)).toEqual([
      '/today',
      '/naming',
      '/terminal',
    ]);
    expect(screen.getByTestId('field-index-overflow-count')).toHaveTextContent(
      '+7',
    );

    // 3. Tablet (900px, 768-1023px):
    //    Full path "~/working_copy.md", icon-only toggle, 0 inline links, Field Index button with label + "+10"
    act(() => {
      setSimulatedViewportWidth(900);
    });

    expect(screen.getByTestId('header-brand-path')).toHaveTextContent(
      '~/working_copy.md',
    );
    expect(screen.getByTestId('view-mode-icon-toggle')).toBeInTheDocument();
    expect(within(nav).queryAllByRole('link')).toHaveLength(0);
    expect(screen.getByTestId('field-index-overflow-count')).toHaveTextContent(
      '+10',
    );
    expect(screen.getByTestId('field-index-trigger')).toHaveTextContent(
      /field index/i,
    );

    // 4. Mobile (390px, < 768px):
    //    Short path "~/WC.MD", compact toggle icon, 44x44px "[+]" menu button with "+10"
    act(() => {
      setSimulatedViewportWidth(390);
    });

    expect(screen.getByTestId('header-brand-path')).toHaveTextContent(
      '~/WC.MD',
    );
    expect(screen.getByTestId('view-mode-icon-toggle')).toBeInTheDocument();
    expect(within(nav).queryAllByRole('link')).toHaveLength(0);
    expect(screen.getByTestId('field-index-overflow-count')).toHaveTextContent(
      '+10',
    );
    const mobileMenuBtn = screen.getByTestId('field-index-trigger');
    expect(mobileMenuBtn.className).toContain('w-11');
    expect(mobileMenuBtn.className).toContain('h-11');
  });
});
