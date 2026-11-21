import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PwaUpdateToast } from '../components/PwaUpdateToast';
import {
  classifySwFetchStrategy,
  notifyPwaUpdateAvailable,
} from '../lib/pwa';

describe('PWA service worker cache strategies & update toast', () => {
  it('routes static assets to cache-first and content/navigations to network-first', () => {
    // Static assets -> cache-first
    expect(
      classifySwFetchStrategy({
        url: 'https://manifestomd.vercel.app/assets/index-DghlxsdY.js',
        destination: 'script',
      }),
    ).toBe('cache-first');

    expect(
      classifySwFetchStrategy({
        url: 'https://manifestomd.vercel.app/fonts/instrument-serif-latin-400-normal.woff2',
        destination: 'font',
      }),
    ).toBe('cache-first');

    expect(
      classifySwFetchStrategy({
        url: 'https://manifestomd.vercel.app/icons/icon-192.png',
        destination: 'image',
      }),
    ).toBe('cache-first');

    // Content & HTML navigations -> network-first
    expect(
      classifySwFetchStrategy({
        url: 'https://manifestomd.vercel.app/',
        mode: 'navigate',
        destination: 'document',
      }),
    ).toBe('network-first');

    expect(
      classifySwFetchStrategy({
        url: 'https://manifestomd.vercel.app/today',
        mode: 'navigate',
        destination: 'document',
      }),
    ).toBe('network-first');

    expect(
      classifySwFetchStrategy({
        url: 'https://manifestomd.vercel.app/api/wall',
        mode: 'cors',
      }),
    ).toBe('network-first');

    expect(
      classifySwFetchStrategy({
        url: 'https://manifestomd.vercel.app/manifest.webmanifest',
        mode: 'cors',
      }),
    ).toBe('network-first');

    // Non-GET or sw.js itself -> bypass
    expect(
      classifySwFetchStrategy({
        url: 'https://manifestomd.vercel.app/api/wall',
        method: 'POST',
      }),
    ).toBe('bypass');

    expect(
      classifySwFetchStrategy({
        url: 'https://manifestomd.vercel.app/sw.js',
      }),
    ).toBe('bypass');
  });

  it('shows the "update available" toast when a new service worker is waiting and posts SKIP_WAITING on reload', async () => {
    const user = userEvent.setup();
    const postMessage = vi.fn();

    render(<PwaUpdateToast />);

    expect(
      screen.queryByRole('status', { name: /service worker update available/i }),
    ).not.toBeInTheDocument();

    act(() => {
      notifyPwaUpdateAvailable({
        versionLabel: 'v1.0.1-ready',
        waitingWorker: { postMessage },
      });
    });

    const toast = screen.getByRole('status', {
      name: /service worker update available/i,
    });
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveTextContent(/update available/i);
    expect(toast).toHaveTextContent(/v1\.0\.1-ready/i);

    await user.click(
      screen.getByRole('button', { name: /reload to update/i }),
    );
    expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });
});
