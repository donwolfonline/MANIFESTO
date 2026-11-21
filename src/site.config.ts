export interface SiteConfig {
  author: string;
  email: string;
  title: string;
  filename: string;
  date: string;
  lastTouched: string;
  location: string;
  subtitles: [string, string, string];
}

export const SITE_CONFIG: SiteConfig = {
  author: 'Frederick Dineen',
  email: 'frederickdineen@gmail.com',
  title: 'WORKING_COPY.md',
  filename: 'working_copy.md',
  date: 'Nov 2026',
  lastTouched: 'november 2026',
  location: 'Plain Text, UTF-8',
  subtitles: [
    'a field manual for working engineers. notes-to-self, mostly.',
    'honest about tight deadlines, shifting stacks, and 2am alerts.',
    'stubbornly devoted to building software that holds up.',
  ],
};

/**
 * Resolves an author string, replacing any "YOUR NAME" placeholder or blank value
 * with `SITE_CONFIG.author`.
 */
export function resolveSiteAuthor(rawAuthor?: string | null): string {
  const trimmed = rawAuthor?.trim();
  if (!trimmed || /^your\s+name$/i.test(trimmed)) {
    return SITE_CONFIG.author;
  }
  return trimmed;
}
