export interface ManifestoMeta {
  filename: string;
  title: string;
  subtitles: string[];
  author: string;
  date: string;
  location: string;
}

export interface TocEntry {
  id: string;
  index: string | null;
  label: string;
  raw: string;
}

export interface ManifestoStats {
  wordCount: number;
  readingTimeMinutes: number;
  lineCount: number;
  charCount: number;
}

export interface ParsedManifesto {
  raw: string;
  meta: ManifestoMeta;
  body: string;
  toc: TocEntry[];
  stats: ManifestoStats;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function splitChapterHeading(heading: string): {
  index: string | null;
  label: string;
} {
  const match = heading.match(/^(\d{1,2})\s*[—–-]\s*(.+)$/);
  if (!match) {
    return { index: null, label: heading.trim() };
  }
  return {
    index: match[1].padStart(2, '0'),
    label: match[2].trim(),
  };
}

export function parseManifesto(rawSource: string): ParsedManifesto {
  const normalized = rawSource.replace(/\r\n/g, '\n');
  const frontmatterMatch = normalized.match(/^---\n([\s\S]*?)\n---\n?/);

  const metaRecord: Record<string, string> = {};
  let body = normalized;

  if (frontmatterMatch) {
    const frontmatterLines = frontmatterMatch[1].split('\n');
    for (const line of frontmatterLines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).trim();
      const value = line
        .slice(colonIdx + 1)
        .trim()
        .replace(/^['"]|['"]$/g, '');
      if (key) metaRecord[key] = value;
    }
    body = normalized.slice(frontmatterMatch[0].length).trimStart();
  }

  const subtitles = [
    metaRecord.subtitle_1,
    metaRecord.subtitle_2,
    metaRecord.subtitle_3,
  ].filter((line): line is string => Boolean(line));

  const meta: ManifestoMeta = {
    filename: metaRecord.filename || 'manifesto.md',
    title: metaRecord.title || 'MANIFESTO.md',
    subtitles:
      subtitles.length > 0
        ? subtitles
        : [
            'a working manifesto. notes-to-self, mostly.',
            'written in plain text so it outlives the tools that rendered it.',
            'quiet type, generous whitespace, and one accent used sparingly.',
          ],
    author: metaRecord.author || 'Your Name',
    date: metaRecord.date || 'Nov 2026',
    location: metaRecord.location || 'Plain Text, UTF-8',
  };

  // Extract ## chapter headings for the table of contents
  const toc: TocEntry[] = [];
  const headingRegex = /^##\s+(.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(body)) !== null) {
    const rawHeading = match[1].trim();
    const { index, label } = splitChapterHeading(rawHeading);
    toc.push({
      id: slugify(rawHeading),
      index,
      label,
      raw: rawHeading,
    });
  }

  const plainWords = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`[\]()-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const wordCount = plainWords.length;
  const readingTimeMinutes = Math.max(1, Math.round(wordCount / 210));
  const lineCount = normalized.split('\n').length;
  const charCount = normalized.length;

  return {
    raw: normalized,
    meta,
    body,
    toc,
    stats: {
      wordCount,
      readingTimeMinutes,
      lineCount,
      charCount,
    },
  };
}
