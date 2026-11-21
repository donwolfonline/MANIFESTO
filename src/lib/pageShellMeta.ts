import type { PreloadableRouteKey } from './routePreload';
import {
  getRoutesByGroup,
  ROUTE_GROUPS,
  type RouteConfig,
  type RouteGroup,
} from './routes';

export interface BreadcrumbSegment {
  label: string;
  href: string;
  target: string;
  preloadKey: PreloadableRouteKey;
  isLast: boolean;
}

export interface PageShellRouteInfo {
  routeId: PreloadableRouteKey;
  path: string;
  group: RouteGroup;
  groupIndexLabel: string;
  indexNumber: string;
  /** e.g. "01 / read", "02 / play", "03 / tools" */
  monoIndex: string;
  title: string;
  description: string;
  statusLine: string;
  seoTitle: string;
  seoDescription: string;
  ogUrl: string;
  prevRoute: RouteConfig | null;
  nextRoute: RouteConfig | null;
}

const SITE_ORIGIN = 'https://manifestomd.vercel.app';

const GROUP_NUMBER_MAP: Record<RouteGroup, string> = {
  read: '01',
  play: '02',
  tools: '03',
};

/**
 * Exact sequence used by the Field Index overlay:
 * READ (home, commit-log, bug-museum, shelf) ->
 * PLAY (naming, playground, delete) ->
 * TOOLS (today, focus, terminal, wall)
 */
export const FIELD_INDEX_SEQUENCE: readonly RouteConfig[] =
  ROUTE_GROUPS.flatMap((group) => getRoutesByGroup(group));

interface RouteCopyOverride {
  title: string;
  description: string;
  statusLine: string;
  seoTitle: string;
  seoDescription: string;
}

const ROUTE_COPY_OVERRIDES: Record<string, RouteCopyOverride> = {
  '/commit-log': {
    title: 'Commit History',
    description:
      'Ten working principles tracked as diffs—green lines for the habit kept, red lines for the habit retired.',
    statusLine: '10 commits, updated Nov 2026',
    seoTitle: '/commit-log · Commit History · WORKING_COPY.md',
    seoDescription:
      'Ten working engineering principles tracked as git commits, inline diffs, and honest blame annotations.',
  },
  '/bug-museum': {
    title: 'Bug Museum',
    description:
      'Small, anonymized postmortems mounted behind glass. Inspect every incident diff and the lesson it left.',
    statusLine: '8 exhibits, updated Nov 2026',
    seoTitle: '/bug-museum · Production Postmortems · WORKING_COPY.md',
    seoDescription:
      'Eight production bug postmortems mounted as museum exhibits with failing code, operational cost, and fix diffs.',
  },
  '/shelf': {
    title: 'Books & Workbench',
    description:
      'Books, quiet essays, and everyday tools that shaped how these ten engineering principles are practiced.',
    statusLine: '10 books · 4 tools, updated Nov 2026',
    seoTitle: '/shelf · Books & Workbench · WORKING_COPY.md',
    seoDescription:
      'Curated engineering bookshelf and daily terminal, editor, and debugging workbench tools.',
  },
  '/naming': {
    title: 'Naming Game',
    description:
      'Ten rounds of vague identifiers from real production snippets—pick a clear name for the engineer awake at 2am.',
    statusLine: '10 rounds · Principle #02, updated Nov 2026',
    seoTitle: '/naming · Naming Game · WORKING_COPY.md',
    seoDescription:
      'Ten interactive rounds on naming variables and functions clearly, with instant readability scoring and code review verdicts.',
  },
  '/playground': {
    title: 'Generative Canvas',
    description:
      'Interactive flow-field and editorial geometry sandbox where small code edits immediately reshape the frame.',
    statusLine: '5 parameters · live 2D canvas, updated Nov 2026',
    seoTitle: '/playground · Generative Canvas · WORKING_COPY.md',
    seoDescription:
      'Interactive Canvas 2D generative art sketchbook with live code compilation, noise controls, seed links, and PNG export.',
  },
  '/delete': {
    title: 'Subtracting Code',
    description:
      'From 4,000 fragile lines down to 400 clear ones—compare before/after diffs and practice cutting speculative code.',
    statusLine: '3 comparisons · 12 red-pencil lines, updated Nov 2026',
    seoTitle: '/delete · The Joy of Subtracting Code · WORKING_COPY.md',
    seoDescription:
      'Before-and-after refactoring comparisons and an interactive red-pencil game celebrating deleted dead code.',
  },
  '/today': {
    title: 'Principle of the Day',
    description:
      'A deterministic daily engineering principle seeded by UTC calendar date, complete with a shareable 1080×1080 PNG card.',
    statusLine: 'daily UTC seed · PNG card export, updated Nov 2026',
    seoTitle: '/today · Principle of the Day · WORKING_COPY.md',
    seoDescription:
      'Deterministic daily working principle with calendar stepping, browser reminders, and 1080x1080 PNG card export.',
  },
  '/focus': {
    title: 'Quiet Focus Room',
    description:
      'Calm 25/5 and 50/10 deep-work timer paired with Web Audio rain ambiance and a local-only session log.',
    statusLine: '3 timer presets · offline audio, updated Nov 2026',
    seoTitle: '/focus · Quiet Focus Room · WORKING_COPY.md',
    seoDescription:
      'Distraction-free focus timer with synthesized ambient soundscapes, keyboard shortcuts, and private weekly session logs.',
  },
  '/terminal': {
    title: 'Interactive Shell',
    description:
      'Query working_copy.md from a retro command prompt—stream principles, inspect exhibits, and switch accent phosphors.',
    statusLine: '14 commands · local CLI, updated Nov 2026',
    seoTitle: '/terminal · Interactive Shell · WORKING_COPY.md',
    seoDescription:
      'Command-line interface to explore working_copy.md principles, random advice, and accent palettes.',
  },
  '/wall': {
    title: 'The Engineer’s Wall',
    description:
      'Community margin notes and one-line working principles earned from real outages, diffs, and code reviews.',
    statusLine: '140-char margin notes, updated Nov 2026',
    seoTitle: '/wall · Community Principles Wall · WORKING_COPY.md',
    seoDescription:
      'Community wall of concise, human-curated engineering principles shared by working developers.',
  },
  '/privacy': {
    title: 'Privacy Notes',
    description:
      'Plain-language summary of what stays strictly in your browser—zero analytics trackers, zero third-party fonts.',
    statusLine: 'zero trackers · local storage only, updated Nov 2026',
    seoTitle: '/privacy · Plain-Language Privacy · WORKING_COPY.md',
    seoDescription:
      'Plain-language privacy notes detailing self-hosted fonts, localStorage keys, and zero behavioral tracking.',
  },
  '/admin': {
    title: 'Wall Moderation',
    description:
      'Private moderation queue for reviewing, approving, and exporting reader submissions to the Engineer’s Wall.',
    statusLine: 'moderation console, updated Nov 2026',
    seoTitle: '/admin · Wall Moderation · WORKING_COPY.md',
    seoDescription:
      'Moderation queue and CSV/JSON export controls for community principles on WORKING_COPY.md.',
  },
  '/404': {
    title: 'Exit Code 404',
    description:
      'That path could not be resolved in this working tree—grab a random principle below or return to the manifesto.',
    statusLine: 'exit code 404 · route missing, updated Nov 2026',
    seoTitle: '404 · Path Not Found · WORKING_COPY.md',
    seoDescription:
      'Route not found on WORKING_COPY.md — inspect a random engineering principle or return home.',
  },
};

function humanizeSlug(slug: string): string {
  return slug
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Resolves header breadcrumbs (`~/working_copy.md / bug-museum`), intro block metadata,
 * Field-Index-ordered prev/next neighbors, and per-route SEO/OG tags.
 */
export function getPageShellInfo(
  pathname: string,
  filename = 'working_copy.md',
  siteTitle = 'WORKING_COPY.md',
): {
  info: PageShellRouteInfo;
  breadcrumbs: BreadcrumbSegment[];
} {
  const clean = (pathname.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/').toLowerCase();

  // Dynamic long-form note detail routes (/notes/:collection/:slug)
  if (clean.startsWith('/notes/')) {
    const parts = clean.replace(/^\/notes\//, '').split('/');
    const collection = parts[0] ?? 'principles';
    const slug = parts[1] ?? 'note';

    const parentMap: Record<
      string,
      { label: string; href: string; target: string; preloadKey: PreloadableRouteKey }
    > = {
      principles: {
        label: 'read',
        href: '/#read',
        target: 'home',
        preloadKey: 'home',
      },
      'bug-stories': {
        label: 'bug-museum',
        href: '/bug-museum',
        target: 'bug-museum',
        preloadKey: 'bug-museum',
      },
      'shelf-items': {
        label: 'shelf',
        href: '/shelf',
        target: 'shelf',
        preloadKey: 'shelf',
      },
      commits: {
        label: 'commit-log',
        href: '/commit-log',
        target: 'commit-log',
        preloadKey: 'commit-log',
      },
    };
    const parent = parentMap[collection] ?? parentMap.principles;
    const noteTitle = humanizeSlug(slug);

    const breadcrumbs: BreadcrumbSegment[] = [
      {
        label: `~/${filename}`,
        href: '/',
        target: 'home',
        preloadKey: 'home',
        isLast: false,
      },
      {
        label: parent.label,
        href: parent.href,
        target: parent.target,
        preloadKey: parent.preloadKey,
        isLast: false,
      },
      {
        label: slug,
        href: clean,
        target: `notes/${collection}/${slug}`,
        preloadKey: 'notes',
        isLast: true,
      },
    ];

    return {
      breadcrumbs,
      info: {
        routeId: 'notes',
        path: clean,
        group: 'read',
        groupIndexLabel: '01',
        indexNumber: '01',
        monoIndex: '01 / read · note',
        title: noteTitle,
        description: `Long-form field note from /${parent.label} — distraction-free reading mode supported.`,
        statusLine: `${parent.label} entry, updated Nov 2026`,
        seoTitle: `${noteTitle} · ${siteTitle}`,
        seoDescription: `Long-form engineering field note "${noteTitle}" in WORKING_COPY.md.`,
        ogUrl: `${SITE_ORIGIN}${clean}`,
        prevRoute: FIELD_INDEX_SEQUENCE[0] ?? null,
        nextRoute: FIELD_INDEX_SEQUENCE[1] ?? null,
      },
    };
  }

  const fieldIdx = FIELD_INDEX_SEQUENCE.findIndex((r) => r.path === clean);
  const matchedRoute = fieldIdx >= 0 ? FIELD_INDEX_SEQUENCE[fieldIdx] : undefined;

  let prevRoute: RouteConfig | null;
  let nextRoute: RouteConfig | null;

  if (fieldIdx >= 0) {
    prevRoute =
      FIELD_INDEX_SEQUENCE[
        (fieldIdx - 1 + FIELD_INDEX_SEQUENCE.length) %
          FIELD_INDEX_SEQUENCE.length
      ] ?? null;
    nextRoute =
      FIELD_INDEX_SEQUENCE[(fieldIdx + 1) % FIELD_INDEX_SEQUENCE.length] ??
      null;
  } else {
    prevRoute = FIELD_INDEX_SEQUENCE[FIELD_INDEX_SEQUENCE.length - 1] ?? null;
    nextRoute = FIELD_INDEX_SEQUENCE[0] ?? null;
  }

  const override = ROUTE_COPY_OVERRIDES[clean];
  const segment = clean.replace(/^\//, '') || 'home';
  const group: RouteGroup = matchedRoute?.group ?? 'tools';
  const groupNum = GROUP_NUMBER_MAP[group];
  const itemNum =
    fieldIdx >= 0 ? String(fieldIdx + 1).padStart(2, '0') : groupNum;

  const title =
    override?.title ??
    humanizeSlug(segment);
  const description =
    override?.description ??
    matchedRoute?.description ??
    'Working copy route inside Fred Dineen’s engineering field manual.';
  const statusLine = override?.statusLine ?? 'updated Nov 2026';
  const seoTitle = override?.seoTitle ?? `${title} · ${siteTitle}`;
  const seoDescription = override?.seoDescription ?? description;

  const breadcrumbs: BreadcrumbSegment[] = [
    {
      label: `~/${filename}`,
      href: '/',
      target: 'home',
      preloadKey: 'home',
      isLast: false,
    },
    {
      label: segment,
      href: clean,
      target: segment,
      preloadKey: matchedRoute?.id ?? (segment === 'privacy' ? 'privacy' : segment === 'admin' ? 'admin' : '404'),
      isLast: true,
    },
  ];

  return {
    breadcrumbs,
    info: {
      routeId: matchedRoute?.id ?? (segment === 'privacy' ? 'privacy' : segment === 'admin' ? 'admin' : '404'),
      path: clean,
      group,
      groupIndexLabel: groupNum,
      indexNumber: itemNum,
      monoIndex: `${groupNum} / ${group}`,
      title,
      description,
      statusLine,
      seoTitle,
      seoDescription,
      ogUrl: `${SITE_ORIGIN}${clean}`,
      prevRoute,
      nextRoute,
    },
  };
}

function upsertMetaTag(
  selector: string,
  attrName: 'name' | 'property',
  attrValue: string,
  content: string,
): void {
  if (typeof document === 'undefined' || !document.head) return;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonicalLink(href: string): void {
  if (typeof document === 'undefined' || !document.head) return;
  let link = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

/**
 * Sets per-route `document.title`, `<meta name="description">`, canonical URL,
 * Open Graph tags (`og:title`, `og:description`, `og:url`), and Twitter tags.
 */
export function applyPageSeoMeta(options: {
  title: string;
  description: string;
  url: string;
}): void {
  if (typeof document === 'undefined') return;
  document.title = options.title;
  upsertMetaTag(
    'meta[name="description"]',
    'name',
    'description',
    options.description,
  );
  upsertMetaTag(
    'meta[property="og:title"]',
    'property',
    'og:title',
    options.title,
  );
  upsertMetaTag(
    'meta[property="og:description"]',
    'property',
    'og:description',
    options.description,
  );
  upsertMetaTag('meta[property="og:url"]', 'property', 'og:url', options.url);
  upsertMetaTag(
    'meta[name="twitter:title"]',
    'name',
    'twitter:title',
    options.title,
  );
  upsertMetaTag(
    'meta[name="twitter:description"]',
    'name',
    'twitter:description',
    options.description,
  );
  upsertCanonicalLink(options.url);
}
