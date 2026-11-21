import { principles } from 'virtual:content/principles';
import type {
  ContentNavLink,
  ContentTocItem,
  ParsedProseBlock,
} from '../lib/contentSchema';
import type { ManifestoMeta } from '../lib/markdown';
import { SITE_CONFIG } from '../site.config';

export type ManifestoBodyBlock = ParsedProseBlock;

export interface ManifestoItem {
  number: number;
  slug: string;
  title: string;
  date: string;
  tags: string[];
  summary: string;
  draft: boolean;
  readingTimeMinutes: number;
  wordCount: number;
  toc: ContentTocItem[];
  prev: ContentNavLink | null;
  next: ContentNavLink | null;
  body: ManifestoBodyBlock[];
  rawBody: string;
}

export interface ClosingSignOff {
  disclaimer: string;
  signature: string;
  lastTouched: string;
  email: string;
}

/**
 * Loaded and Zod-validated at build time from /content/principles/*.mdx.
 * Draft entries (draft: true) appear in dev and are stripped in production builds.
 */
export const MANIFESTO_ITEMS: ManifestoItem[] = principles.map((entry) => ({
  number: entry.number,
  slug: entry.slug,
  title: entry.title,
  date: entry.date,
  tags: entry.tags,
  summary: entry.summary,
  draft: entry.draft,
  readingTimeMinutes: entry.readingTimeMinutes,
  wordCount: entry.wordCount,
  toc: entry.toc,
  prev: entry.prev,
  next: entry.next,
  body: entry.blocks,
  rawBody: entry.body,
}));

export const STOP_DOING_ITEMS: string[] = [
  'opening pull requests with "misc fixes" as the entire description',
  'checking Slack alerts before my first cup of coffee',
  'building an abstract helper after seeing a pattern twice',
  'treating an urgent message like an urgent problem',
  'staying online past dinner to prove I care',
];

export const DO_MORE_ITEMS: string[] = [
  'celebrating negative-line diffs in code review',
  'asking clarifying questions out loud in design reviews',
  'writing error messages that name the missing config key',
  'stepping away for a twenty-minute walk when a test refuses to pass',
  'updating broken onboarding docs the same afternoon they trip me up',
];

export const CLOSING_SIGN_OFF: ClosingSignOff = {
  disclaimer:
    'This is a working copy, not a finished rulebook—written from real diffs, humbling outages, and quiet mornings, and revised whenever practice teaches me better.',
  signature: `— ${SITE_CONFIG.author}`,
  lastTouched: SITE_CONFIG.lastTouched,
  email: SITE_CONFIG.email,
};

/**
 * Serializes metadata, validated MDX principles, and closing lists into plain-text
 * Markdown so the "Raw .md" view and document stats always match the rendered page.
 */
export function serializeManifestoToMarkdown(
  meta: ManifestoMeta,
  items: ManifestoItem[],
  stopItems: string[] = STOP_DOING_ITEMS,
  doMoreItems: string[] = DO_MORE_ITEMS,
  signOff: ClosingSignOff = CLOSING_SIGN_OFF,
): string {
  const headerLines = [
    '---',
    `filename: ${meta.filename}`,
    `title: ${meta.title}`,
    `author: ${meta.author}`,
    `date: ${meta.date}`,
    ...meta.subtitles.map((line, i) => `subtitle_${i + 1}: ${line}`),
    `location: ${meta.location}`,
    '---',
    '',
    '## the actual (human) job',
    '',
  ];

  const bodyLines: string[] = [];

  items.forEach((item, idx) => {
    bodyLines.push(`### ${item.number}. ${item.title}`);
    bodyLines.push('');

    item.body.forEach((block) => {
      if (block.type === 'paragraph') {
        bodyLines.push(block.text);
        bodyLines.push('');
      } else if (block.type === 'bullets') {
        block.items.forEach((entry) => {
          bodyLines.push(`- ${entry}`);
        });
        bodyLines.push('');
      } else if (block.type === 'lines') {
        block.lines.forEach((line) => {
          bodyLines.push(`${line}  `);
        });
        bodyLines.push('');
      }
    });

    if (idx < items.length - 1) {
      bodyLines.push('---');
      bodyLines.push('');
    }
  });

  const closingLines = [
    '---',
    '',
    '## things I am trying to stop doing',
    '',
    ...stopItems.map((item) => `- ~~${item}~~`),
    '',
    '## things I am trying to do more',
    '',
    ...doMoreItems.map((item) => `- [x] ${item}`),
    '',
    '---',
    '',
    `*${signOff.disclaimer}*`,
    '',
    signOff.signature,
    `last touched: ${signOff.lastTouched}`,
    signOff.email,
  ];

  return (
    [...headerLines, ...bodyLines, ...closingLines].join('\n').trimEnd() + '\n'
  );
}
