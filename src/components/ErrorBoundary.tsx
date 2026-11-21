import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportClientError } from '../lib/errorMonitor';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const combined = new Error(
      `${error.message}${info.componentStack ? ` | ${info.componentStack.slice(0, 180)}` : ''}`,
    );
    combined.stack = error.stack;
    reportClientError(combined);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        className="min-h-dvh flex items-center justify-center p-6 font-mono"
        style={{
          backgroundColor: 'var(--color-bg, #201e1f)',
          color: 'var(--color-text, #f2eee8)',
        }}
      >
        <div
          className="max-w-lg w-full border p-6 sm:p-8 space-y-5"
          style={{
            borderColor: 'var(--color-border-strong, rgba(242,238,232,0.24))',
            backgroundColor: '#191718',
            borderRadius: '4px',
          }}
        >
          <p
            className="m-0 uppercase tracking-widest"
            style={{ fontSize: '0.7rem', color: '#f4726b' }}
          >
            ✗ runtime error caught
          </p>
          <h1
            className="m-0 font-display font-normal"
            style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', lineHeight: 1.05 }}
          >
            Something tripped on this view.
          </h1>
          <p
            className="m-0 font-body"
            style={{ color: 'var(--color-text-secondary, #b8b1a7)', lineHeight: 1.65 }}
          >
            An anonymous, stripped error note was logged so it can be fixed. No
            personal data or cookies were collected.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 border uppercase tracking-widest cursor-pointer"
              style={{
                fontSize: '0.7rem',
                backgroundColor: 'var(--color-accent, #f0642d)',
                borderColor: 'var(--color-accent, #f0642d)',
                color: 'var(--color-accent-ink, #201e1f)',
              }}
            >
              reload page
            </button>
            <a
              href="/"
              className="px-4 py-2 border uppercase tracking-widest no-underline"
              style={{
                fontSize: '0.7rem',
                borderColor: 'var(--color-border-strong, rgba(242,238,232,0.24))',
                color: 'var(--color-text, #f2eee8)',
              }}
            >
              ← return home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
