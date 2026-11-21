import { z } from 'zod';

/**
 * Shared frontmatter fields required on every MDX entry under /content.
 * Any missing or malformed field fails the Vite build with file + field details.
 */
export const baseFrontmatterSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters'),
  slug: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must be lowercase kebab-case (a-z, 0-9, hyphens)',
    ),
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format'),
  tags: z
    .array(z.string().trim().min(1, 'Tags cannot be empty'))
    .min(1, 'Provide at least one tag'),
  summary: z
    .string()
    .trim()
    .min(10, 'Summary must be at least 10 characters')
    .max(280, 'Summary must be 280 characters or fewer'),
  draft: z.boolean().default(false),
});

/* ---------------- 1. Principles (/content/principles) ---------------- */

export const principleFrontmatterSchema = baseFrontmatterSchema.extend({
  number: z.number().int().positive('Principle number must be a positive integer'),
});

/* ---------------- 2. Bug Stories (/content/bug-stories) -------------- */

export const bugCategorySchema = z.enum([
  'off-by-one',
  'time-zones',
  'concurrency',
  'naming',
  'caching',
  'works-on-my-machine',
]);

export const bugSnippetSchema = z.object({
  filename: z.string().trim().min(1),
  language: z.string().trim().min(1),
  contextBefore: z.array(z.string()),
  brokenLine: z.string().min(1),
  fixedLine: z.string().min(1),
  contextAfter: z.array(z.string()),
  brokenNote: z.string().trim().min(5),
  fixedNote: z.string().trim().min(5),
});

export const bugStoryFrontmatterSchema = baseFrontmatterSchema.extend({
  exhibitNumber: z
    .string()
    .trim()
    .regex(/^\d{2}$/, 'exhibitNumber must be two digits (e.g. "01")'),
  year: z.number().int().min(2000).max(2100),
  category: bugCategorySchema,
  cause: z.string().trim().min(5),
  cost: z.string().trim().min(5),
  lesson: z.string().trim().min(5),
  snippet: bugSnippetSchema,
});

/* ---------------- 3. Shelf Items (/content/shelf-items) -------------- */

export const shelfBookCategorySchema = z.enum([
  'craft',
  'humility',
  'systems-thinking',
  'communication',
  'rest',
]);

export const shelfToolKindSchema = z.enum([
  'editor',
  'terminal',
  'note-taking',
  'debugging',
]);

const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a 6-digit hex code (e.g. #7b3826)');

export const shelfBookFrontmatterSchema = baseFrontmatterSchema.extend({
  itemType: z.literal('book'),
  order: z.number().int().positive(),
  author: z.string().trim().min(2),
  category: shelfBookCategorySchema,
  color: hexColorSchema,
  inkColor: hexColorSchema.default('#f2eee8'),
  widthPx: z.number().int().min(36).max(68).default(48),
  heightPx: z.number().int().min(190).max(290).default(244),
  yearRead: z.string().trim().optional(),
  isPlaceholder: z.boolean().default(false),
});

export const shelfToolFrontmatterSchema = baseFrontmatterSchema.extend({
  itemType: z.literal('tool'),
  order: z.number().int().positive(),
  kind: shelfToolKindSchema,
  url: z.string().url('Tool url must be a valid URL').optional(),
  isPlaceholder: z.boolean().default(false),
});

export const shelfItemFrontmatterSchema = z.discriminatedUnion('itemType', [
  shelfBookFrontmatterSchema,
  shelfToolFrontmatterSchema,
]);

/* ---------------- 4. Commits (/content/commits) ---------------------- */

export const commitPrefixSchema = z.enum([
  'feat',
  'fix',
  'refactor',
  'docs',
  'chore',
]);

export const commitHunkSchema = z.object({
  removed: z.array(z.string().min(1)).min(1),
  added: z.array(z.string().min(1)).min(1),
  blame: z.object({
    hash: z.string().trim().min(6).max(12),
    author: z.string().trim().min(1),
    when: z.string().trim().min(4),
    note: z.string().trim().min(4),
  }),
});

export const commitFrontmatterSchema = baseFrontmatterSchema.extend({
  principleNumber: z.number().int().positive(),
  hash: z
    .string()
    .trim()
    .regex(/^[0-9a-f]{7,10}$/, 'Commit hash must be 7-10 lowercase hex characters'),
  prefix: commitPrefixSchema,
  author: z.string().trim().min(2),
  relativeDate: z.string().trim().min(2),
  refTag: z.string().trim().optional(),
  filePath: z.string().trim().min(3),
  hunks: z.array(commitHunkSchema).min(1),
});

/* ---------------- Shared Compiled Entry Types ------------------------ */

export type ContentCollectionName =
  | 'principles'
  | 'bug-stories'
  | 'shelf-items'
  | 'commits';

export interface ContentTocItem {
  id: string;
  depth: 2 | 3;
  text: string;
}

export interface ContentNavLink {
  slug: string;
  title: string;
  collection: ContentCollectionName;
}

export type ParsedProseBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'lines'; lines: string[] };

export interface CompiledEntryMeta {
  collection: ContentCollectionName;
  sourceFile: string;
  body: string;
  wordCount: number;
  readingTimeMinutes: number;
  toc: ContentTocItem[];
  prev: ContentNavLink | null;
  next: ContentNavLink | null;
}

export type PrincipleFrontmatter = z.infer<typeof principleFrontmatterSchema>;
export type BugStoryFrontmatter = z.infer<typeof bugStoryFrontmatterSchema>;
export type ShelfBookFrontmatter = z.infer<typeof shelfBookFrontmatterSchema>;
export type ShelfToolFrontmatter = z.infer<typeof shelfToolFrontmatterSchema>;
export type ShelfItemFrontmatter = z.infer<typeof shelfItemFrontmatterSchema>;
export type CommitFrontmatter = z.infer<typeof commitFrontmatterSchema>;

export interface CompiledPrinciple
  extends PrincipleFrontmatter,
    CompiledEntryMeta {
  collection: 'principles';
  blocks: ParsedProseBlock[];
}

export interface CompiledBugStory
  extends BugStoryFrontmatter,
    CompiledEntryMeta {
  collection: 'bug-stories';
  paragraphs: string[];
}

export interface CompiledShelfBook
  extends ShelfBookFrontmatter,
    CompiledEntryMeta {
  collection: 'shelf-items';
}

export interface CompiledShelfTool
  extends ShelfToolFrontmatter,
    CompiledEntryMeta {
  collection: 'shelf-items';
}

export interface CompiledCommit extends CommitFrontmatter, CompiledEntryMeta {
  collection: 'commits';
}

export interface SiteContentBundle {
  isDev: boolean;
  principles: CompiledPrinciple[];
  bugStories: CompiledBugStory[];
  shelfBooks: CompiledShelfBook[];
  shelfTools: CompiledShelfTool[];
  commits: CompiledCommit[];
}
