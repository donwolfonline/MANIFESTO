import { commits } from 'virtual:content/commits';
import type {
  CommitFrontmatter,
  ContentNavLink,
  ContentTocItem,
} from '../lib/contentSchema';

export type CommitPrefix = CommitFrontmatter['prefix'];
export type CommitDiffHunk = CommitFrontmatter['hunks'][number];
export type CommitBlameNote = CommitDiffHunk['blame'];

export interface ManifestoCommit {
  id: string;
  slug: string;
  principleNumber: number;
  hash: string;
  prefix: CommitPrefix;
  subject: string;
  author: string;
  date: string;
  relativeDate: string;
  refTag?: string;
  filePath: string;
  tags: string[];
  draft: boolean;
  readingTimeMinutes: number;
  toc: ContentTocItem[];
  prev: ContentNavLink | null;
  next: ContentNavLink | null;
  hunks: CommitDiffHunk[];
}

export const COMMIT_PREFIXES: CommitPrefix[] = [
  'feat',
  'fix',
  'refactor',
  'docs',
  'chore',
];

/**
 * Loaded and Zod-validated at build time from /content/commits/*.mdx.
 */
export const MANIFESTO_COMMITS: ManifestoCommit[] = commits.map((entry) => ({
  id: `commit-${String(entry.principleNumber).padStart(2, '0')}`,
  slug: entry.slug,
  principleNumber: entry.principleNumber,
  hash: entry.hash,
  prefix: entry.prefix,
  subject: entry.title,
  author: entry.author,
  date: entry.date,
  relativeDate: entry.relativeDate,
  refTag: entry.refTag,
  filePath: entry.filePath,
  tags: entry.tags,
  draft: entry.draft,
  readingTimeMinutes: entry.readingTimeMinutes,
  toc: entry.toc,
  prev: entry.prev,
  next: entry.next,
  hunks: entry.hunks,
}));
