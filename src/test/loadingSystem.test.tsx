import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BOOT_LOG_LINES,
  hasSeenPreloaderThisSession,
  Preloader,
  PRELOADER_SESSION_KEY,
} from '../components/Preloader';
import { RouteSkeleton } from '../components/RouteSkeletons';
import {
  RouteEmptyState,
  RouteErrorState,
} from '../components/RouteStateBox';

describe('Loading system: first-visit preloader, 150ms-delayed route skeletons, and error/empty states', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    window.sessionStorage.clear();
  });

  it('runs the first-visit preloader with 5 boot log lines, real milestone waiting (min 900ms, max 3000ms), 000 -> 100 counter, and skips on repeat visits', async () => {
    const onComplete = vi.fn();
    let resolveMilestone!: () => void;
    const delayedMilestone = new Promise<void>((res) => {
      resolveMilestone = res;
    });

    const { unmount } = render(
      <Preloader
        forceRun={true}
        minDurationMs={900}
        maxDurationMs={3000}
        milestones={[delayedMilestone]}
        onComplete={onComplete}
      />,
    );

    const preloader = screen.getByTestId('first-visit-preloader');
    expect(preloader).toBeInTheDocument();
    expect(screen.getByTestId('preloader-boot-log')).toHaveTextContent(
      BOOT_LOG_LINES[0],
    );

    // At 500ms (< 900ms minDurationMs), even if milestone is pending, preloader has not completed
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onComplete).not.toHaveBeenCalled();

    // Resolve the real asset/font/chunk milestone, then advance past 900ms minimum duration
    await act(async () => {
      resolveMilestone();
      await Promise.resolve();
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByTestId('preloader-percent-counter')).toHaveTextContent(
      '100%',
    );
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(hasSeenPreloaderThisSession()).toBe(true);

    unmount();

    // Repeat visit in the same session skips immediately
    const onRepeatComplete = vi.fn();
    const { queryByTestId } = render(
      <Preloader onComplete={onRepeatComplete} />,
    );
    expect(window.sessionStorage.getItem(PRELOADER_SESSION_KEY)).toBe('true');
    expect(onRepeatComplete).toHaveBeenCalledTimes(1);
    expect(queryByTestId('first-visit-preloader')).toBeNull();
  });

  it('delays route skeletons by 150ms to avoid flashes and renders layout-matched 1px outlined mono skeletons for terminal, bug-museum, commit-log, shelf, and playground', () => {
    const { rerender } = render(
      <RouteSkeleton routeKey="terminal" delayMs={150} />,
    );

    // Before 150ms: only the zero-CLS reserved height spacer is rendered
    expect(screen.getByTestId('skeleton-delay-spacer')).toBeInTheDocument();
    expect(screen.queryByTestId('skeleton-terminal')).not.toBeInTheDocument();

    // After 150ms: reveals the terminal skeleton with blinking cursor line
    act(() => {
      vi.advanceTimersByTime(160);
    });
    expect(screen.getByTestId('skeleton-terminal')).toBeInTheDocument();
    expect(screen.getByTestId('terminal-skeleton-cursor')).toBeInTheDocument();

    // Bug Museum skeleton: placard cards
    rerender(<RouteSkeleton routeKey="bug-museum" immediate={true} />);
    expect(screen.getByTestId('skeleton-bug-museum')).toBeInTheDocument();
    expect(
      screen.getAllByTestId('bug-museum-skeleton-placard'),
    ).toHaveLength(3);

    // Commit Log skeleton: timeline with dots
    rerender(<RouteSkeleton routeKey="commit-log" immediate={true} />);
    expect(screen.getByTestId('skeleton-commit-log')).toBeInTheDocument();
    expect(screen.getAllByTestId('commit-log-skeleton-dot')).toHaveLength(4);

    // Shelf skeleton: book spines
    rerender(<RouteSkeleton routeKey="shelf" immediate={true} />);
    expect(screen.getByTestId('skeleton-shelf')).toBeInTheDocument();
    expect(screen.getAllByTestId('shelf-skeleton-spine')).toHaveLength(10);

    // Playground skeleton: canvas box and slider rows
    rerender(<RouteSkeleton routeKey="playground" immediate={true} />);
    expect(screen.getByTestId('skeleton-playground')).toBeInTheDocument();
    expect(
      screen.getByTestId('playground-skeleton-canvas'),
    ).toBeInTheDocument();
    expect(
      screen.getAllByTestId('playground-skeleton-slider'),
    ).toHaveLength(5);
  });

  it('renders consistent error ("error: failed to load /wall, retry") and empty states', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(<RouteErrorState routePath="/wall" onRetry={onRetry} />);

    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toHaveTextContent('error: failed to load /wall, retry');

    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    render(
      <RouteEmptyState
        routePath="/wall"
        message="No approved notes yet—be the first to leave one above."
      />,
    );
    expect(screen.getByTestId('route-empty-state')).toHaveTextContent(
      /empty state · \/wall/i,
    );
  });
});
