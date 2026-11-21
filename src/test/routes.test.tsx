import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Header } from '../components/Header';
import { CLOSING_SIGN_OFF } from '../data/manifestoItems';
import manifestoRaw from '../content/manifesto.md?raw';
import { parseManifesto } from '../lib/markdown';
import {
  generateSitemapXml,
  getRoutesByGroup,
  ROUTE_GROUPS,
  ROUTES,
  TERMINAL_PROMPT_ICON_SVG,
  TOP_HEADER_ROUTES,
} from '../lib/routes';

describe('Unified typed routes config (routes.ts) & author identity', () => {
  it('sets author to Frederick Dineen and email to frederickdineen@gmail.com', () => {
    const parsed = parseManifesto(manifestoRaw);
    expect(parsed.meta.author).toBe('Frederick Dineen');
    expect(CLOSING_SIGN_OFF.signature).toContain('Frederick Dineen');
    expect(CLOSING_SIGN_OFF.email).toBe('frederickdineen@gmail.com');
  });

  it('defines all 11 routes across read, play, and tools with lowercase path-style labels and priorities 1-10', () => {
    expect(ROUTE_GROUPS).toEqual(['read', 'play', 'tools']);

    const readRoutes = getRoutesByGroup('read').map((r) => r.label);
    expect(readRoutes).toEqual([
      '/home',
      '/commit-log',
      '/bug-museum',
      '/shelf',
    ]);

    const playRoutes = getRoutesByGroup('play').map((r) => r.label);
    expect(playRoutes).toEqual(['/naming', '/playground', '/delete']);

    const toolsRoutes = getRoutesByGroup('tools').map((r) => r.label);
    expect(toolsRoutes).toEqual(['/today', '/focus', '/terminal', '/wall']);

    for (const route of ROUTES) {
      // Lowercase path-style label everywhere, no mixed prefixes
      expect(route.label).toMatch(/^\/[a-z-]+$/);
      expect(route.label).toBe(route.label.toLowerCase());
      expect(route.priority).toBeGreaterThanOrEqual(1);
      expect(route.priority).toBeLessThanOrEqual(10);
      expect(route.shortcut.length).toBeGreaterThan(0);
      expect(route.description.length).toBeGreaterThan(5);
      expect(route.icon).toContain('<svg');
    }

    // Only /terminal uses the orange ">_" prompt glyph icon
    const terminalRoute = ROUTES.find((r) => r.path === '/terminal');
    expect(terminalRoute?.label).toBe('/terminal');
    expect(terminalRoute?.icon).toBe(TERMINAL_PROMPT_ICON_SVG);
  });

  it('generates sitemap XML containing every route from ROUTES', () => {
    const xml = generateSitemapXml('https://workingcopy.yourdomain.com');
    expect(xml).toContain('<urlset');
    for (const route of ROUTES) {
      const expectedLoc = `https://workingcopy.yourdomain.com${
        route.path === '/' ? '/' : route.path
      }`;
      expect(xml).toContain(`<loc>${expectedLoc}</loc>`);
    }
  });

  it('renders only the 4 highest-priority links inline in Header, with sliding view-mode pill and gliding layoutId route indicator', async () => {
    const user = userEvent.setup();
    const onViewModeChange = vi.fn();
    const onNavigateRoute = vi.fn();

    expect(TOP_HEADER_ROUTES).toHaveLength(4);
    expect(TOP_HEADER_ROUTES.map((r) => r.label)).toEqual([
      '/today',
      '/naming',
      '/terminal',
      '/commit-log',
    ]);

    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280,
    });

    render(
      <Header
        filename="working_copy.md"
        viewMode="editorial"
        onViewModeChange={onViewModeChange}
        isIndexOpen={false}
        onToggleIndex={() => {}}
        onNavigateRoute={onNavigateRoute}
      />,
    );

    // 1. Sliding pill indicator inside segmented EDITORIAL | RAW .MD toggle
    const pill = screen.getByTestId('view-mode-sliding-pill');
    expect(pill).toHaveStyle({ transform: 'translate3d(0%, 0, 0)' });

    // 2. Priority+ nav shows top links that fit at default 1280px width (4-5 links) and +N counter
    const nav = screen.getByRole('navigation', {
      name: /primary interactive pages/i,
    });
    const navLinks = nav.querySelectorAll('a');
    expect(navLinks.length).toBeGreaterThanOrEqual(4);
    expect(navLinks.length).toBeLessThanOrEqual(5);
    expect(
      screen.getByTestId('field-index-overflow-count'),
    ).toBeInTheDocument();

    // 3. Active-route indicator square has layoutId="header-active-route" and glides on hover/click
    const activeSquare = screen.getByTestId('header-active-route-indicator');
    expect(activeSquare).toHaveAttribute(
      'data-layout-id',
      'header-active-route',
    );

    const namingLink = screen.getByRole('link', { name: '/naming' });
    await user.hover(namingLink);
    expect(namingLink).toHaveAttribute('data-active', 'true');
    expect(
      namingLink.querySelector('[data-layout-id="header-active-route"]'),
    ).not.toBeNull();

    // 4. FIELD INDEX [+] rotates [+] 90deg and nudges brackets outward
    expect(screen.getByTestId('field-index-plus-glyph')).toHaveTextContent('+');
  });
});
