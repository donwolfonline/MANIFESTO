import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Copies only the Latin .woff2 subsets used by the site from @fontsource into
 * public/fonts/ so production builds self-host exact subsets with zero external
 * Google Fonts requests and deterministic <link rel="preload"> URLs.
 */
const FONT_FILES = [
  [
    'node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2',
    'public/fonts/instrument-serif-latin-400-normal.woff2',
  ],
  [
    'node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2',
    'public/fonts/instrument-serif-latin-400-italic.woff2',
  ],
  [
    'node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2',
    'public/fonts/jetbrains-mono-latin-400-normal.woff2',
  ],
  [
    'node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2',
    'public/fonts/jetbrains-mono-latin-500-normal.woff2',
  ],
  [
    'node_modules/@fontsource/newsreader/files/newsreader-latin-400-normal.woff2',
    'public/fonts/newsreader-latin-400-normal.woff2',
  ],
  [
    'node_modules/@fontsource/newsreader/files/newsreader-latin-400-italic.woff2',
    'public/fonts/newsreader-latin-400-italic.woff2',
  ],
  [
    'node_modules/@fontsource/newsreader/files/newsreader-latin-500-normal.woff2',
    'public/fonts/newsreader-latin-500-normal.woff2',
  ],
];

async function main() {
  await fs.mkdir(path.resolve('public/fonts'), { recursive: true });
  let totalBytes = 0;

  for (const [src, dest] of FONT_FILES) {
    const absSrc = path.resolve(src);
    const absDest = path.resolve(dest);
    await fs.copyFile(absSrc, absDest);
    const stat = await fs.stat(absDest);
    totalBytes += stat.size;
    console.log(
      `✓ ${path.basename(dest).padEnd(44)} ${(stat.size / 1024).toFixed(1)} kB`,
    );
  }

  console.log(`\nSynced ${FONT_FILES.length} Latin .woff2 subsets (${(totalBytes / 1024).toFixed(1)} kB total).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
