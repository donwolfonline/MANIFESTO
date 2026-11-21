import fs from 'node:fs';
import path from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';
import { parse as parseYaml } from 'yaml';
import type { ZodType } from 'zod';
import {
  bugStoryFrontmatterSchema,
  commitFrontmatterSchema,
  principleFrontmatterSchema,
  shelfItemFrontmatterSchema,
  type CompiledBugStory,
  type CompiledCommit,
  type CompiledPrinciple,
  type CompiledShelfBook,
  type CompiledShelfTool,
  type ContentCollectionName,
  type ContentNavLink,
  type ContentTocItem,
  type ParsedProseBlock,
  type SiteContentBundle,
} from './src/lib/contentSchema';

const VIRTUAL_MODULES: Record<string, string> = {
  'virtual:content': '\0virtual:content',
  'virtual:content/principles': '\0virtual:content/principles',
  'virtual:content/bug-stories': '\0virtual:content/bug-stories',
  'virtual:content/shelf-items': '\0virtual:content/shelf-items',
  'virtual:content/commits': '\0virtual:content/commits',
};

function slugifyHeading(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function extractFrontmatter(
  raw: string,
  relPath: string,
): { data: unknown; body: string } {
  const normalized = raw.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    throw new Error(
      `[content-validation] Missing YAML frontmatter block ("--- ... ---") in ${relPath}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(match[1]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `[content-validation] YAML syntax error in ${relPath}:\n  ${msg}`,
      { cause: err },
    );
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error(
      `[content-validation] Frontmatter must be a YAML object in ${relPath}`,
    );
  }

  return {
    data: parsed,
    body: normalized.slice(match[0].length).trim(),
  };
}

function computeReadingStats(body: string): {
  wordCount: number;
  readingTimeMinutes: number;
} {
  const plain = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`[\]()-]/g, ' ')
    .trim();
  const wordCount = plain ? plain.split(/\s+/).filter(Boolean).length : 0;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));
  return { wordCount, readingTimeMinutes };
}

function extractToc(body: string): ContentTocItem[] {
  const toc: ContentTocItem[] = [];
  const regex = /^(#{2,3})\s+(.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(body)) !== null) {
    const depth = match[1].length as 2 | 3;
    const text = match[2].trim();
    toc.push({
      id: slugifyHeading(text),
      depth,
      text,
    });
  }
  return toc;
}

/**
 * Extracts concise structured blocks (paragraphs, `- ` bullet lists, `| ` / `> ` line blocks)
 * from the opening section before any `##` extended essay heading.
 */
function extractSummaryBlocks(body: string): ParsedProseBlock[] {
  const introSection = body.split(/^##\s+/m)[0].trim();
  const chunks = introSection.split(/\n{2,}/).map((c) => c.trim()).filter(Boolean);
  const blocks: ParsedProseBlock[] = [];

  for (const chunk of chunks) {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.every((l) => l.startsWith('- '))) {
      blocks.push({
        type: 'bullets',
        items: lines.map((l) => l.slice(2).trim()),
      });
    } else if (lines.every((l) => l.startsWith('> '))) {
      blocks.push({
        type: 'lines',
        lines: lines.map((l) => l.slice(2).trim()),
      });
    } else {
      blocks.push({
        type: 'paragraph',
        text: lines.join(' '),
      });
    }
  }

  return blocks;
}

function extractPlainParagraphs(body: string): string[] {
  return body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0 && !block.startsWith('#'))
    .map((block) => block.replace(/\n+/g, ' '));
}

function validateCollection<T>(
  rootDir: string,
  collection: ContentCollectionName,
  schema: ZodType<T>,
  includeDrafts: boolean,
): Array<{
  frontmatter: T;
  sourceFile: string;
  body: string;
  wordCount: number;
  readingTimeMinutes: number;
  toc: ContentTocItem[];
}> {
  const dir = path.join(rootDir, 'content', collection);
  if (!fs.existsSync(dir)) {
    throw new Error(
      `[content-validation] Required content directory missing: content/${collection}`,
    );
  }

  const files = fs
    .readdirSync(dir)
    .filter((file: string) => file.endsWith('.mdx'))
    .sort();

  const seenSlugs = new Map<string, string>();
  const validItems: Array<{
    frontmatter: T;
    sourceFile: string;
    body: string;
    wordCount: number;
    readingTimeMinutes: number;
    toc: ContentTocItem[];
  }> = [];

  for (const file of files) {
    const absPath = path.join(dir, file);
    const relPath = path.relative(rootDir, absPath);
    const raw = fs.readFileSync(absPath, 'utf8');
    const { data, body } = extractFrontmatter(raw, relPath);

    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      const details = parsed.error.issues
        .map((issue) => {
          const field = issue.path.length > 0 ? issue.path.join('.') : '(root)';
          return `  • field "${field}": ${issue.message}`;
        })
        .join('\n');

      throw new Error(
        `[content-validation] Invalid frontmatter in ${relPath}:\n${details}`,
      );
    }

    const fm = parsed.data as { slug: string; draft?: boolean };
    const existing = seenSlugs.get(fm.slug);
    if (existing) {
      throw new Error(
        `[content-validation] Duplicate slug "${fm.slug}" in ${relPath} (already declared in ${existing})`,
      );
    }
    seenSlugs.set(fm.slug, relPath);

    if (fm.draft && !includeDrafts) {
      continue;
    }

    const { wordCount, readingTimeMinutes } = computeReadingStats(body);
    const toc = extractToc(body);

    validItems.push({
      frontmatter: parsed.data,
      sourceFile: relPath,
      body,
      wordCount,
      readingTimeMinutes,
      toc,
    });
  }

  return validItems;
}

function attachPrevNext<
  T extends {
    slug: string;
    title: string;
    collection: ContentCollectionName;
    prev: ContentNavLink | null;
    next: ContentNavLink | null;
  },
>(items: T[]): T[] {
  return items.map((item, idx) => ({
    ...item,
    prev:
      idx > 0
        ? {
            slug: items[idx - 1].slug,
            title: items[idx - 1].title,
            collection: items[idx - 1].collection,
          }
        : null,
    next:
      idx < items.length - 1
        ? {
            slug: items[idx + 1].slug,
            title: items[idx + 1].title,
            collection: items[idx + 1].collection,
          }
        : null,
  }));
}

export function loadAllContent(
  rootDir: string,
  includeDrafts: boolean,
): SiteContentBundle {
  const rawPrinciples = validateCollection(
    rootDir,
    'principles',
    principleFrontmatterSchema,
    includeDrafts,
  );
  const principles: CompiledPrinciple[] = attachPrevNext(
    rawPrinciples
      .map((item) => ({
        ...item.frontmatter,
        collection: 'principles' as const,
        sourceFile: item.sourceFile,
        body: item.body,
        blocks: extractSummaryBlocks(item.body),
        wordCount: item.wordCount,
        readingTimeMinutes: item.readingTimeMinutes,
        toc: item.toc,
        prev: null,
        next: null,
      }))
      .sort((a, b) => a.number - b.number),
  );

  const rawBugs = validateCollection(
    rootDir,
    'bug-stories',
    bugStoryFrontmatterSchema,
    includeDrafts,
  );
  const bugStories: CompiledBugStory[] = attachPrevNext(
    rawBugs
      .map((item) => ({
        ...item.frontmatter,
        collection: 'bug-stories' as const,
        sourceFile: item.sourceFile,
        body: item.body,
        paragraphs: extractPlainParagraphs(item.body),
        wordCount: item.wordCount,
        readingTimeMinutes: item.readingTimeMinutes,
        toc: item.toc,
        prev: null,
        next: null,
      }))
      .sort((a, b) => a.exhibitNumber.localeCompare(b.exhibitNumber)),
  );

  const rawShelf = validateCollection(
    rootDir,
    'shelf-items',
    shelfItemFrontmatterSchema,
    includeDrafts,
  );

  const shelfBooks: CompiledShelfBook[] = attachPrevNext(
    rawShelf
      .filter((item) => item.frontmatter.itemType === 'book')
      .map((item) => ({
        ...(item.frontmatter as Extract<
          typeof item.frontmatter,
          { itemType: 'book' }
        >),
        collection: 'shelf-items' as const,
        sourceFile: item.sourceFile,
        body: item.body,
        wordCount: item.wordCount,
        readingTimeMinutes: item.readingTimeMinutes,
        toc: item.toc,
        prev: null,
        next: null,
      }))
      .sort((a, b) => a.order - b.order),
  );

  const shelfTools: CompiledShelfTool[] = attachPrevNext(
    rawShelf
      .filter((item) => item.frontmatter.itemType === 'tool')
      .map((item) => ({
        ...(item.frontmatter as Extract<
          typeof item.frontmatter,
          { itemType: 'tool' }
        >),
        collection: 'shelf-items' as const,
        sourceFile: item.sourceFile,
        body: item.body,
        wordCount: item.wordCount,
        readingTimeMinutes: item.readingTimeMinutes,
        toc: item.toc,
        prev: null,
        next: null,
      }))
      .sort((a, b) => a.order - b.order),
  );

  const rawCommits = validateCollection(
    rootDir,
    'commits',
    commitFrontmatterSchema,
    includeDrafts,
  );
  const commits: CompiledCommit[] = attachPrevNext(
    rawCommits
      .map((item) => ({
        ...item.frontmatter,
        collection: 'commits' as const,
        sourceFile: item.sourceFile,
        body: item.body,
        wordCount: item.wordCount,
        readingTimeMinutes: item.readingTimeMinutes,
        toc: item.toc,
        prev: null,
        next: null,
      }))
      .sort((a, b) => b.principleNumber - a.principleNumber),
  );

  return {
    isDev: includeDrafts,
    principles,
    bugStories,
    shelfBooks,
    shelfTools,
    commits,
  };
}

export function contentPlugin(): Plugin {
  let rootDir = '';
  let isDev = false;

  return {
    name: 'working-copy-content-loader',
    configResolved(config: ResolvedConfig) {
      rootDir = config.root;
      isDev = config.command === 'serve';
    },
    buildStart() {
      // Always validate every MDX file on build start so malformed entries fail immediately
      loadAllContent(rootDir, isDev);
    },
    resolveId(id) {
      if (id in VIRTUAL_MODULES) {
        return VIRTUAL_MODULES[id];
      }
      return null;
    },
    load(id) {
      if (id === '\0virtual:content') {
        const bundle = loadAllContent(rootDir, isDev);
        return [
          `const content = ${JSON.stringify(bundle)};`,
          'export const isDev = content.isDev;',
          'export const principles = content.principles;',
          'export const bugStories = content.bugStories;',
          'export const shelfBooks = content.shelfBooks;',
          'export const shelfTools = content.shelfTools;',
          'export const commits = content.commits;',
          'export default content;',
        ].join('\n');
      }
      if (id === '\0virtual:content/principles') {
        const bundle = loadAllContent(rootDir, isDev);
        return `export const isDev = ${JSON.stringify(bundle.isDev)};\nexport const principles = ${JSON.stringify(bundle.principles)};`;
      }
      if (id === '\0virtual:content/bug-stories') {
        const bundle = loadAllContent(rootDir, isDev);
        return `export const bugStories = ${JSON.stringify(bundle.bugStories)};`;
      }
      if (id === '\0virtual:content/shelf-items') {
        const bundle = loadAllContent(rootDir, isDev);
        return `export const shelfBooks = ${JSON.stringify(bundle.shelfBooks)};\nexport const shelfTools = ${JSON.stringify(bundle.shelfTools)};`;
      }
      if (id === '\0virtual:content/commits') {
        const bundle = loadAllContent(rootDir, isDev);
        return `export const commits = ${JSON.stringify(bundle.commits)};`;
      }
      return null;
    },
    configureServer(server) {
      const contentDir = path.join(rootDir, 'content');
      server.watcher.add(contentDir);
    },
    handleHotUpdate({ file, server }) {
      const contentDir = path.join(rootDir, 'content');
      if (file.startsWith(contentDir) && file.endsWith('.mdx')) {
        for (const resolvedId of Object.values(VIRTUAL_MODULES)) {
          const mod = server.moduleGraph.getModuleById(resolvedId);
          if (mod) {
            server.moduleGraph.invalidateModule(mod);
          }
        }
        server.ws.send({ type: 'full-reload' });
        return [];
      }
      return undefined;
    },
  };
}
