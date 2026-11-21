import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportClientError } from '../lib/errorMonitor';

export interface RouteErrorStateProps {
  /** Route path that failed to load (e.g. "/wall", "/bug-museum") */
  routePath: string;
  /** Optional secondary diagnostic note */
  detail?: string;
  /** Retry callback */
  onRetry?: () => void;
  /** Optional navigate-home callback */
  onGoHome?: () => void;
}

/**
 * Consistent 1px-outlined mono error state ("error: failed to load /wall, retry").
 */
export function RouteErrorState({
  routePath,
  detail,
  onRetry,
  onGoHome,
}: RouteErrorStateProps) {
  const normalizedPath = routePath.startsWith('/')
    ? routePath
    : `/${routePath}`;

  return (
    <div
      role="alert"
      data-testid="route-error-state"
      className="border p-6 sm:p-8 font-mono space-y-4"
      style={{
        borderColor: 'var(--color-status-error)',
        backgroundColor: 'var(--color-bg-deep)',
        borderRadius: 'var(--radius-sm)',
      }}
    >
      <div
        className="pb-3 border-b flex items-center justify-between gap-3 uppercase tracking-[var(--tracking-micro)]"
        style={{
          borderColor: 'var(--color-border)',
          fontSize: 'var(--text-micro)',
          color: 'var(--color-status-error)',
        }}
      >
        <span>✗ build / fetch error</span>
        <span style={{ color: 'var(--color-text-muted)' }}>
          {normalizedPath}
        </span>
      </div>

      <p
        className="m-0 font-mono"
        style={{
          fontSize: 'var(--text-meta)',
          color: 'var(--color-status-error)',
        }}
      >
        error: failed to load {normalizedPath}, retry
      </p>

      {detail && (
        <p
          className="m-0 font-body"
          style={{
            fontSize: 'var(--text-meta)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {detail}
        </p>
      )}

      <div className="pt-2 flex flex-wrap items-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-2 border uppercase tracking-[var(--tracking-micro)] cursor-pointer"
            style={{
              fontSize: 'var(--text-micro)',
              backgroundColor: 'var(--color-accent)',
              borderColor: 'var(--color-accent)',
              color: 'var(--color-accent-ink)',
              borderRadius: 'var(--radius-xs)',
            }}
          >
            retry ↻
          </button>
        )}

        {onGoHome && (
          <button
            type="button"
            onClick={onGoHome}
            className="px-3.5 py-2 border uppercase tracking-[var(--tracking-micro)] cursor-pointer"
            style={{
              fontSize: 'var(--text-micro)',
              borderColor: 'var(--color-border-strong)',
              color: 'var(--color-text)',
              borderRadius: 'var(--radius-xs)',
            }}
          >
            ← go home
          </button>
        )}
      </div>
    </div>
  );
}

export interface RouteEmptyStateProps {
  routePath: string;
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Consistent 1px-outlined mono empty state for collections, logs, or filtered views.
 */
export function RouteEmptyState({
  routePath,
  title,
  message,
  actionLabel,
  onAction,
}: RouteEmptyStateProps) {
  const normalizedPath = routePath.startsWith('/')
    ? routePath
    : `/${routePath}`;

  return (
    <div
      role="region"
      aria-label={`Empty state for ${normalizedPath}`}
      data-testid="route-empty-state"
      className="border p-6 sm:p-8 font-mono space-y-3"
      style={{
        borderColor: 'var(--color-border-strong)',
        backgroundColor: 'var(--color-bg-elevated)',
        borderRadius: 'var(--radius-sm)',
      }}
    >
      <div
        className="flex items-center justify-between gap-3 uppercase tracking-[var(--tracking-micro)]"
        style={{
          fontSize: 'var(--text-micro)',
          color: 'var(--color-text-muted)',
        }}
      >
        <span>○ empty state · {normalizedPath}</span>
        <span>0 items</span>
      </div>

      {title && (
        <p
          className="m-0 font-mono"
          style={{
            fontSize: 'var(--text-meta)',
            color: 'var(--color-text)',
          }}
        >
          {title}
        </p>
      )}

      <p
        className="m-0 font-body italic"
        style={{
          fontSize: 'var(--text-body)',
          color: 'var(--color-text-secondary)',
        }}
      >
        {message}
      </p>

      {actionLabel && onAction && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onAction}
            className="px-3.5 py-1.5 border uppercase tracking-[var(--tracking-micro)] cursor-pointer"
            style={{
              fontSize: 'var(--text-micro)',
              borderColor: 'var(--color-border-strong)',
              color: 'var(--color-text)',
              borderRadius: 'var(--radius-xs)',
            }}
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}

interface RouteErrorBoundaryProps {
  routePath: string;
  onGoHome?: () => void;
  children: ReactNode;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
  retryKey: number;
}

export class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = { hasError: false, retryKey: 0 };

  static getDerivedStateFromError(): Partial<RouteErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: RouteErrorBoundaryProps): void {
    if (prevProps.routePath !== this.props.routePath && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const combined = new Error(
      `${error.message}${
        info.componentStack ? ` | ${info.componentStack.slice(0, 160)}` : ''
      }`,
    );
    combined.stack = error.stack;
    reportClientError(combined);
  }

  handleRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      retryKey: prev.retryKey + 1,
    }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="editorial-shell py-16">
          <RouteErrorState
            routePath={this.props.routePath}
            detail="The route module or data request encountered an unexpected error."
            onRetry={this.handleRetry}
            onGoHome={this.props.onGoHome}
          />
        </div>
      );
    }

    return <div key={this.state.retryKey}>{this.props.children}</div>;
  }
}
