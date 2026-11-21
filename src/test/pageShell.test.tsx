import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PageShell } from '../components/PageShell';
import { SmoothScrollProvider } from '../lib/lenis';
import { parseManifesto } from '../lib/markdown';
import { FIELD_INDEX_SEQUENCE } from '../lib/pageShellMeta';

describe('<PageShell /> shared sub-route shell, breadcrumbs, scroll header hide/show, intro block, prev/next hover preview & SEO meta tags', () => {
  const { meta } = parseManifesto('');

  beforeEach(() => {
    document.head.innerHTML = '';
    document.title = '';
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      configurable: true,
      value: 0,
    });
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      writable: true,
      configurable: true,
      value: 2000,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1000,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders compact sticky header with clickable breadcrumb path ("~/working_copy.md / bug-museum"), accent last segment, and hide-on-scroll-down / show-on-scroll-up + 2px top orange progress bar', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();

    render(
      <SmoothScrollProvider>
        <PageShell
          pathname="/bug-museum"
          meta={meta}
          onNavigate={onNavigate}
        >
          <div>Museum body</div>
        </PageShell>
      </SmoothScrollProvider>,
    );

    // Breadcrumb trail: both segments clickable, last segment in accent
    const part0 = screen.getByTestId('breadcrumb-part-0');
    const part1 = screen.getByTestId('breadcrumb-part-1');
    expect(part0).toHaveTextContent('~/working_copy.md');
    expect(part0).toHaveAttribute('data-breadcrumb-accent', 'false');
    expect(part1).toHaveTextContent('bug-museum');
    expect(part1).toHaveAttribute('data-breadcrumb-accent', 'true');

    await user.click(part0);
    expect(onNavigate).toHaveBeenCalledWith('home');

    // 2px orange progress bar at the very top + hide-on-scroll-down / show-on-scroll-up
    const progressBar = screen.getByTestId('pageshell-progress-bar');
    const stickyHeader = screen.getByTestId('pageshell-header');
    expect(progressBar).toHaveStyle({ height: '2px' });
    expect(stickyHeader).toHaveAttribute('data-header-hidden', 'false');

    // Scroll down to 250px -> header hides and progress bar scales to 0.25 (25%)
    act(() => {
      Object.defineProperty(window, 'scrollY', {
        writable: true,
        configurable: true,
        value: 250,
      });
      fireEvent.scroll(window);
    });
    expect(stickyHeader).toHaveAttribute('data-header-hidden', 'true');
    expect(progressBar).toHaveAttribute('data-progress-pct', '25.0');
    expect(progressBar.style.transform).toContain('scaleX(0.25');

    // Scroll back up to 180px -> header reappears
    act(() => {
      Object.defineProperty(window, 'scrollY', {
        writable: true,
        configurable: true,
        value: 180,
      });
      fireEvent.scroll(window);
    });
    expect(stickyHeader).toHaveAttribute('data-header-hidden', 'false');
  });

  it('renders page intro block (mono index "02 / play", large serif title, description, status line) and updates document.title, meta description, and OG tags per route', () => {
    const { rerender } = render(
      <SmoothScrollProvider>
        <PageShell pathname="/naming" meta={meta}>
          <div>Naming game</div>
        </PageShell>
      </SmoothScrollProvider>,
    );

    expect(screen.getByTestId('pageshell-index')).toHaveTextContent('02 / play');
    expect(screen.getByTestId('pageshell-title')).toHaveTextContent(
      'Naming Game',
    );
    expect(screen.getByTestId('pageshell-description')).toHaveTextContent(
      /vague identifiers/i,
    );
    expect(screen.getByTestId('pageshell-status')).toHaveTextContent(
      '10 rounds · Principle #02, updated Nov 2026',
    );

    expect(document.title).toContain('/naming');
    expect(
      document.head
        .querySelector('meta[name="description"]')
        ?.getAttribute('content'),
    ).toContain('naming variables');
    expect(
      document.head
        .querySelector('meta[property="og:title"]')
        ?.getAttribute('content'),
    ).toContain('/naming');
    expect(
      document.head
        .querySelector('meta[property="og:url"]')
        ?.getAttribute('content'),
    ).toBe('https://workingcopy.yourdomain.com/naming');

    // Navigate to /bug-museum -> title, meta description, and OG tags update automatically
    rerender(
      <SmoothScrollProvider>
        <PageShell
          pathname="/bug-museum"
          meta={meta}
          statusLine="12 exhibits, updated Nov 2026"
        >
          <div>Exhibits</div>
        </PageShell>
      </SmoothScrollProvider>,
    );

    expect(screen.getByTestId('pageshell-index')).toHaveTextContent('01 / read');
    expect(screen.getByTestId('pageshell-status')).toHaveTextContent(
      '12 exhibits, updated Nov 2026',
    );
    expect(document.title).toContain('/bug-museum');
    expect(
      document.head
        .querySelector('meta[name="description"]')
        ?.getAttribute('content'),
    ).toContain('postmortems');
    expect(
      document.head
        .querySelector('meta[property="og:url"]')
        ?.getAttribute('content'),
    ).toBe('https://workingcopy.yourdomain.com/bug-museum');
  });

  it('links Prev / Next pages in the exact order of Field Index with interactive hover previews', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();

    render(
      <SmoothScrollProvider>
        <PageShell
          pathname="/bug-museum"
          meta={meta}
          onNavigate={onNavigate}
        >
          <div>Exhibits</div>
        </PageShell>
      </SmoothScrollProvider>,
    );

    // In Field Index: commit-log (idx 1) -> bug-museum (idx 2) -> shelf (idx 3)
    const idx = FIELD_INDEX_SEQUENCE.findIndex((r) => r.path === '/bug-museum');
    expect(idx).toBe(2);
    expect(FIELD_INDEX_SEQUENCE[idx - 1].path).toBe('/commit-log');
    expect(FIELD_INDEX_SEQUENCE[idx + 1].path).toBe('/shelf');

    const prevLink = screen.getByTestId('pageshell-prev-link');
    const nextLink = screen.getByTestId('pageshell-next-link');
    const nextPreview = screen.getByTestId('pageshell-next-preview');

    expect(prevLink).toHaveTextContent('/commit-log');
    expect(nextLink).toHaveTextContent('/shelf');
    expect(nextPreview).toHaveAttribute('data-preview-visible', 'false');

    // Hovering Next activates the preview and reveals the destination route description
    await user.hover(nextLink);
    expect(nextPreview).toHaveAttribute('data-preview-visible', 'true');
    expect(nextPreview).toHaveTextContent(/Bookshelf & daily workbench/i);

    await user.click(nextLink);
    expect(onNavigate).toHaveBeenCalledWith('shelf');
  });
});
