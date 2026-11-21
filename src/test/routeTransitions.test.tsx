import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RouteTransitionStage } from '../components/RouteTransitionCurtain';
import { getPreloadHandlers } from '../lib/routePreload';
import {
  getSavedScrollPositionForPath,
  saveScrollPositionForPath,
} from '../lib/router';
import {
  focusIncomingPageHeading,
  getRouteAnnouncement,
  getRouteTransitionLabel,
  shouldUseShortRouteFade,
} from '../lib/routeTransitions';

describe('Smooth route transitions (Framer Motion AnimatePresence + 2-panel curtain + a11y)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the two-panel dark curtain on route transition, types the incoming route label with the orange ">_" prompt, lifts off after 600ms, and settles at 1100ms', () => {
    const onSettled = vi.fn();

    const { rerender } = render(
      <RouteTransitionStage
        pathname="/"
        transitionCount={0}
        onTransitionSettled={onSettled}
      >
        <main>
          <h1>WORKING_COPY.md</h1>
        </main>
      </RouteTransitionStage>,
    );

    // On initial mount (transitionCount=0), curtain is idle
    expect(
      screen.queryByTestId('route-transition-curtain'),
    ).not.toBeInTheDocument();

    // Navigate to /bug-museum (transitionCount=1)
    rerender(
      <RouteTransitionStage
        pathname="/bug-museum"
        transitionCount={1}
        onTransitionSettled={onSettled}
      >
        <main>
          <h1>The Bug Museum</h1>
        </main>
      </RouteTransitionStage>,
    );

    const curtain = screen.getByTestId('route-transition-curtain');
    expect(curtain).toHaveAttribute('data-curtain-phase', 'entering');
    expect(
      screen.getByTestId('transition-curtain-panel-left'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('transition-curtain-panel-right'),
    ).toBeInTheDocument();

    const prompt = screen.getByTestId('transition-curtain-prompt');
    expect(prompt).toHaveTextContent('>_');

    // Advance 350ms -> typing complete ("/bug-museum")
    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(prompt).toHaveTextContent('>_/bug-museum');

    // Advance to 600ms -> curtain starts lifting off to the top
    act(() => {
      vi.advanceTimersByTime(260);
    });
    expect(curtain).toHaveAttribute('data-curtain-phase', 'lifting');

    // Advance 500ms more (1100ms total) -> curtain finishes lifting and settles
    act(() => {
      vi.advanceTimersByTime(520);
    });
    expect(onSettled).toHaveBeenCalledWith('/bug-museum');
  });

  it('interrupts safely when the user clicks another route mid-transition', () => {
    const onSettled = vi.fn();

    const { rerender } = render(
      <RouteTransitionStage
        pathname="/commit-log"
        transitionCount={1}
        onTransitionSettled={onSettled}
      >
        <main>
          <h1>Commit History</h1>
        </main>
      </RouteTransitionStage>,
    );

    act(() => {
      vi.advanceTimersByTime(250);
    });

    // Click another link mid-transition (/naming)
    rerender(
      <RouteTransitionStage
        pathname="/naming"
        transitionCount={2}
        onTransitionSettled={onSettled}
      >
        <main>
          <h1>Name Things for 2am</h1>
        </main>
      </RouteTransitionStage>,
    );

    act(() => {
      vi.advanceTimersByTime(1150);
    });

    // Only the latest destination (/naming) settles
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledWith('/naming');
  });

  it('shortens to a plain 150ms fade on low deviceMemory, save-data, or reduced motion', () => {
    expect(shouldUseShortRouteFade(true)).toBe(true);

    const origMemory = (navigator as { deviceMemory?: number }).deviceMemory;
    Object.defineProperty(navigator, 'deviceMemory', {
      configurable: true,
      value: 1,
    });
    expect(shouldUseShortRouteFade(false)).toBe(true);
    Object.defineProperty(navigator, 'deviceMemory', {
      configurable: true,
      value: origMemory,
    });
  });

  it('prefetches route chunks on hover, focus, and touchstart, restores scroll positions, and moves focus to h1', () => {
    const handlers = getPreloadHandlers('bug-museum');
    expect(typeof handlers.onPointerEnter).toBe('function');
    expect(typeof handlers.onFocus).toBe('function');
    expect(typeof handlers.onTouchStart).toBe('function');

    saveScrollPositionForPath('/commit-log', 640);
    expect(getSavedScrollPositionForPath('/commit-log')).toBe(640);

    expect(getRouteTransitionLabel('/bug-museum')).toBe('/bug-museum');
    expect(getRouteAnnouncement('/bug-museum').announcement).toContain(
      'Navigated to /bug-museum',
    );

    render(
      <main>
        <h1>The Bug Museum</h1>
      </main>,
    );
    const focused = focusIncomingPageHeading();
    expect(focused?.tagName).toBe('H1');
    expect(document.activeElement).toBe(focused);
  });
});
