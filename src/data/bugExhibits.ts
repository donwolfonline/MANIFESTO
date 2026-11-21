import { bugStories } from 'virtual:content/bug-stories';
import type {
  BugStoryFrontmatter,
  ContentNavLink,
  ContentTocItem,
} from '../lib/contentSchema';

export type BugCategory = BugStoryFrontmatter['category'];
export type BugCodeSnippet = BugStoryFrontmatter['snippet'];

export interface BugExhibit {
  id: string;
  slug: string;
  number: string;
  title: string;
  date: string;
  year: number;
  category: BugCategory;
  tags: string[];
  summary: string;
  draft: boolean;
  cause: string;
  cost: string;
  lesson: string;
  story: string[];
  rawBody: string;
  readingTimeMinutes: number;
  toc: ContentTocItem[];
  prev: ContentNavLink | null;
  next: ContentNavLink | null;
  snippet: BugCodeSnippet;
}

export const BUG_CATEGORY_LABELS: Record<BugCategory, string> = {
  'off-by-one': 'off-by-one',
  'time-zones': 'time zones',
  concurrency: 'concurrency',
  naming: 'naming',
  caching: 'caching',
  'works-on-my-machine': 'it worked on my machine',
};

export const BUG_CATEGORIES: BugCategory[] = [
  'off-by-one',
  'time-zones',
  'concurrency',
  'naming',
  'caching',
  'works-on-my-machine',
];

/**
 * Loaded and Zod-validated at build time from /content/bug-stories/*.mdx.
 */
export const BUG_EXHIBITS: BugExhibit[] = bugStories.map((entry) => ({
  id: `exhibit-${entry.exhibitNumber}`,
  slug: entry.slug,
  number: entry.exhibitNumber,
  title: entry.title,
  date: entry.date,
  year: entry.year,
  category: entry.category,
  tags: entry.tags,
  summary: entry.summary,
  draft: entry.draft,
  cause: entry.cause,
  cost: entry.cost,
  lesson: entry.lesson,
  story: entry.paragraphs,
  rawBody: entry.body,
  readingTimeMinutes: entry.readingTimeMinutes,
  toc: entry.toc,
  prev: entry.prev,
  next: entry.next,
  snippet: entry.snippet,
}));
