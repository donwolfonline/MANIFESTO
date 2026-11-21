import { shelfBooks, shelfTools } from 'virtual:content/shelf-items';
import type {
  ContentNavLink,
  ContentTocItem,
  ShelfBookFrontmatter,
  ShelfToolFrontmatter,
} from '../lib/contentSchema';

export type ShelfBookCategory = ShelfBookFrontmatter['category'];
export type ShelfToolKind = ShelfToolFrontmatter['kind'];

export interface ShelfBook {
  id: string;
  slug: string;
  title: string;
  author: string;
  category: ShelfBookCategory;
  tags: string[];
  draft: boolean;
  color: string;
  inkColor: string;
  widthPx: number;
  heightPx: number;
  oneLineReason: string;
  notes: string;
  yearRead?: string;
  isPlaceholder?: boolean;
  readingTimeMinutes: number;
  toc: ContentTocItem[];
  prev: ContentNavLink | null;
  next: ContentNavLink | null;
}

export interface ShelfTool {
  id: string;
  slug: string;
  kind: ShelfToolKind;
  name: string;
  why: string;
  tags: string[];
  draft: boolean;
  url?: string;
  isPlaceholder?: boolean;
}

export interface ShelfData {
  books: ShelfBook[];
  tools: ShelfTool[];
}

export const BOOK_CATEGORIES: ShelfBookCategory[] = [
  'craft',
  'humility',
  'systems-thinking',
  'communication',
  'rest',
];

export const BOOK_CATEGORY_LABELS: Record<ShelfBookCategory, string> = {
  craft: 'craft',
  humility: 'humility',
  'systems-thinking': 'systems thinking',
  communication: 'communication',
  rest: 'rest',
};

export const TOOL_KIND_LABELS: Record<ShelfToolKind, string> = {
  editor: 'editor',
  terminal: 'terminal',
  'note-taking': 'note-taking',
  debugging: 'debugging',
};

/**
 * Loaded and Zod-validated at build time from /content/shelf-items/*.mdx.
 */
export const SHELF_DATA: ShelfData = {
  books: shelfBooks.map((b) => ({
    id: b.slug,
    slug: b.slug,
    title: b.title,
    author: b.author,
    category: b.category,
    tags: b.tags,
    draft: b.draft,
    color: b.color,
    inkColor: b.inkColor,
    widthPx: b.widthPx,
    heightPx: b.heightPx,
    oneLineReason: b.summary,
    notes: b.body,
    yearRead: b.yearRead,
    isPlaceholder: b.isPlaceholder,
    readingTimeMinutes: b.readingTimeMinutes,
    toc: b.toc,
    prev: b.prev,
    next: b.next,
  })),
  tools: shelfTools.map((t) => ({
    id: t.slug,
    slug: t.slug,
    kind: t.kind,
    name: t.title,
    why: t.summary,
    tags: t.tags,
    draft: t.draft,
    url: t.url,
    isPlaceholder: t.isPlaceholder,
  })),
};
