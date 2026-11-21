import type { PreloadableRouteKey } from './routePreload';

export type RouteGroup = 'read' | 'play' | 'tools';
export type RoutePriority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface RouteConfig {
  /** Internal target identifier used by router & preload handlers */
  id: PreloadableRouteKey;
  /** Canonical pathname */
  path:
    | '/'
    | '/commit-log'
    | '/bug-museum'
    | '/shelf'
    | '/naming'
    | '/playground'
    | '/delete'
    | '/today'
    | '/focus'
    | '/terminal'
    | '/wall';
  /**
   * Unified lowercase path-style label ("/today", "/naming", "/commit-log",
   * "/bug-museum", "/terminal", etc.), styled uppercase with tracking via CSS only.
   */
  label: string;
  /** Semantic navigation group */
  group: RouteGroup;
  /** Relative priority (1–10) for ordering, command palette ranking, and XML sitemap */
  priority: RoutePriority;
  /** Keyboard / command shortcut hint */
  shortcut: string;
  /** Concise one-line description for Field Index, Command Palette, and Sitemap */
  description: string;
  /** Inline 16×16 SVG markup; for /terminal, renders the orange ">_" prompt glyph */
  icon: string;
  /** Additional search keywords for Command Palette */
  keywords: string;
}

export const ROUTE_GROUPS: readonly RouteGroup[] = [
  'read',
  'play',
  'tools',
] as const;

export const ROUTE_GROUP_META: Record<
  RouteGroup,
  { label: string; title: string }
> = {
  read: { label: 'read', title: 'Read & Reference' },
  play: { label: 'play', title: 'Play & Practice' },
  tools: { label: 'tools', title: 'Tools & Daily Workbench' },
};

/**
 * Orange `>_` prompt glyph SVG used exclusively as the icon on the `/terminal` route item.
 */
export const TERMINAL_PROMPT_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="var(--color-accent, #f0642d)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.25 4.25L6.5 8L2.25 11.75"/><path d="M8.5 11.75H13.75"/></svg>';

/**
 * Single source of truth driving the Header, Field Index overlay,
 * Command Palette, Sitemap, and Footer navigation.
 */
export const ROUTES: readonly RouteConfig[] = [
  // =========================================================================
  // GROUP: "read" — Home, Commit Log, Bug Museum, Shelf
  // =========================================================================
  {
    id: 'home',
    path: '/',
    label: '/home',
    group: 'read',
    priority: 10,
    shortcut: 'g h',
    description: 'Editorial manifesto & 10 working engineering principles',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 3.5H13.5V12.5H2.5V3.5Z"/><path d="M5 6.5H11"/><path d="M5 9.5H9"/></svg>',
    keywords: 'home hero manifesto editorial working_copy.md start top read',
  },
  {
    id: 'commit-log',
    path: '/commit-log',
    label: '/commit-log',
    group: 'read',
    priority: 9,
    shortcut: 'g c',
    description: '10 working principles tracked as git diffs and blame',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="5" cy="4.5" r="1.75"/><circle cx="5" cy="11.5" r="1.75"/><circle cx="11" cy="8" r="1.75"/><path d="M5 6.25V9.75"/><path d="M6.75 4.75C8.5 4.75 9.25 6.5 9.25 8"/></svg>',
    keywords: 'git commit log history diff blame branch refactor',
  },
  {
    id: 'bug-museum',
    path: '/bug-museum',
    label: '/bug-museum',
    group: 'read',
    priority: 8,
    shortcut: 'g b',
    description: '8 production postmortem exhibits with interactive diffs',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.5" y="4.5" width="7" height="8" rx="3.5"/><path d="M6 4.5V3C6 2.2 6.8 1.5 8 1.5C9.2 1.5 10 2.2 10 3V4.5"/><path d="M2 7H4.5"/><path d="M11.5 7H14"/><path d="M2.5 10.5H4.5"/><path d="M11.5 10.5H13.5"/></svg>',
    keywords: 'bugs museum exhibits postmortems off-by-one timezones outage',
  },
  {
    id: 'shelf',
    path: '/shelf',
    label: '/shelf',
    group: 'read',
    priority: 7,
    shortcut: 'g s',
    description: 'Bookshelf & daily workbench tools for software craft',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 2.5H6V13.5H3V2.5Z"/><path d="M6 3.5H9V13.5H6V3.5Z"/><path d="M9.5 2.8L12.3 3.4L10.8 13.5L8 12.9L9.5 2.8Z"/></svg>',
    keywords: 'shelf books reading library toolbox editor workbench',
  },

  // =========================================================================
  // GROUP: "play" — Naming, Playground, Delete
  // =========================================================================
  {
    id: 'naming',
    path: '/naming',
    label: '/naming',
    group: 'play',
    priority: 9,
    shortcut: 'g n',
    description: '10-round game on naming variables and functions for 2am',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 8.5L7.5 3.5H12.5V8.5L7.5 13.5L2.5 8.5Z"/><circle cx="10" cy="6" r="1"/></svg>',
    keywords: 'naming variables functions game quiz readability code review 2am',
  },
  {
    id: 'playground',
    path: '/playground',
    label: '/playground',
    group: 'play',
    priority: 7,
    shortcut: 'g p',
    description: 'Generative flow-field and editorial typography canvas',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="5.5"/><path d="M2.8 8C5 5.5 7 10.5 13.2 8"/></svg>',
    keywords: 'playground canvas art generative noise sliders seed export',
  },
  {
    id: 'delete',
    path: '/delete',
    label: '/delete',
    group: 'play',
    priority: 8,
    shortcut: 'g d',
    description: 'The joy of deleting code: 4,000 → 400 lines & red-pencil game',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8H13"/><path d="M5.5 4.5H10.5"/><path d="M5.5 11.5H10.5"/></svg>',
    keywords: 'delete refactor before after slider shiki red pencil game',
  },

  // =========================================================================
  // GROUP: "tools" — Today, Focus, Terminal, Wall
  // =========================================================================
  {
    id: 'today',
    path: '/today',
    label: '/today',
    group: 'tools',
    priority: 9,
    shortcut: 'g y',
    description: 'Deterministic principle of the day & 1080×1080 PNG card export',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="3.5" width="11" height="10" rx="1"/><path d="M5.5 2V4.5"/><path d="M10.5 2V4.5"/><path d="M2.5 6.5H13.5"/></svg>',
    keywords: 'today daily principle date hash share image notification reminder',
  },
  {
    id: 'focus',
    path: '/focus',
    label: '/focus',
    group: 'tools',
    priority: 8,
    shortcut: 'g f',
    description: 'Calm 25/5 focus timer with Web Audio ambient sound & session log',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8.5" r="5"/><path d="M8 6V8.5L9.8 9.8"/><path d="M6.5 2H9.5"/></svg>',
    keywords: 'focus timer pomodoro work session ambient rain keyboard room log weekly',
  },
  {
    id: 'terminal',
    path: '/terminal',
    label: '/terminal',
    group: 'tools',
    priority: 9,
    shortcut: 'g t',
    description: 'Interactive working_copy.md shell with commands & themes',
    icon: TERMINAL_PROMPT_ICON_SVG,
    keywords: 'terminal shell cli console commands sudo coffee theme whoami',
  },
  {
    id: 'wall',
    path: '/wall',
    label: '/wall',
    group: 'tools',
    priority: 7,
    shortcut: 'g w',
    description: 'Community wall of one-line engineering principles',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="3" width="11" height="8" rx="1"/><path d="M5.5 11L4 13.5L7.5 11"/></svg>',
    keywords: 'wall community submit principles notes engineers',
  },
] as const;

export const HEADER_SUB_ROUTES: readonly RouteConfig[] = ROUTES.filter(
  (r) => r.path !== '/',
);

/**
 * Priority-ranked candidate routes for the Header's Priority+ navigation bar.
 * Ordered highest-priority first (priority 10 -> 7).
 */
export const PRIORITY_HEADER_ROUTES: readonly RouteConfig[] = [
  ...HEADER_SUB_ROUTES,
].sort((a, b) => {
  if (b.priority !== a.priority) return b.priority - a.priority;
  const preferredOrder = [
    'today',
    'naming',
    'terminal',
    'commit-log',
    'focus',
    'delete',
    'bug-museum',
    'shelf',
    'playground',
    'wall',
  ];
  return preferredOrder.indexOf(a.id) - preferredOrder.indexOf(b.id);
});

/**
 * The 4 highest-priority sub-routes.
 */
export const TOP_HEADER_ROUTES: readonly RouteConfig[] =
  PRIORITY_HEADER_ROUTES.slice(0, 4);

export const TERMINAL_ROUTE: RouteConfig =
  ROUTES.find((r) => r.id === 'terminal') ?? ROUTES[ROUTES.length - 2];

export function getRoutesByGroup(group: RouteGroup): RouteConfig[] {
  return ROUTES.filter((route) => route.group === group);
}

export function getRouteByPath(path: string): RouteConfig | undefined {
  return ROUTES.find((route) => route.path === path);
}

export function getRouteById(id: string): RouteConfig | undefined {
  return ROUTES.find((route) => route.id === id);
}

/**
 * Generates an XML sitemap string directly from the unified `ROUTES` config.
 */
export function generateSitemapXml(
  baseUrl = 'https://manifestomd.vercel.app',
  lastmod = '2026-11-21',
): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const sorted = [...ROUTES].sort((a, b) => b.priority - a.priority);

  const urlNodes = sorted.map((route) => {
    const loc = `${cleanBase}${route.path === '/' ? '/' : route.path}`;
    const priorityDecimal = (route.priority / 10).toFixed(1);
    const changefreq =
      route.id === 'today' || route.id === 'wall' ? 'daily' : 'weekly';
    return [
      '  <url>',
      `    <loc>${loc}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      `    <changefreq>${changefreq}</changefreq>`,
      `    <priority>${priorityDecimal}</priority>`,
      '  </url>',
    ].join('\n');
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urlNodes,
    '</urlset>',
    '',
  ].join('\n');
}
