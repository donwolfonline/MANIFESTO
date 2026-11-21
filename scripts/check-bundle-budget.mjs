import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

/**
 * Enforces strict production bundle size budgets in CI.
 * Fails with exit code 1 whenever any gzipped/compressed budget is exceeded
 * or if heavy lazy-only libraries (framer-motion, shiki) leak into initial load.
 */
const BUDGETS_KB = {
  initialJsGzip: 85,
  initialCssGzip: 14,
  criticalFontsWoff2: 50,
  totalCriticalPayload: 150,
  maxRouteChunkGzip: 75,
  maxShikiVendorGzip: 115,
};

const distDir = path.resolve('dist');
const indexHtmlPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexHtmlPath)) {
  console.error('✗ dist/index.html not found — run "npm run build" before checking budgets.');
  process.exit(1);
}

const html = fs.readFileSync(indexHtmlPath, 'utf8');

function gzipBytes(filePath) {
  const buf = fs.readFileSync(filePath);
  return {
    raw: buf.length,
    gzip: zlib.gzipSync(buf, { level: 9 }).length,
  };
}

function toKb(bytes) {
  return Number((bytes / 1024).toFixed(2));
}

function extractMatches(regex) {
  const found = new Set();
  let match;
  while ((match = regex.exec(html)) !== null) {
    found.add(match[1]);
  }
  return Array.from(found);
}

const entryScripts = extractMatches(/<script[^>]+src="([^"]+)"/g);
const modulePreloads = extractMatches(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g);
const initialJsFiles = Array.from(new Set([...entryScripts, ...modulePreloads]));
const initialCssFiles = extractMatches(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g);
const preloadedFonts = extractMatches(/<link[^>]+rel="preload"[^>]+href="([^"]+\.woff2)"/g);

const htmlStats = gzipBytes(indexHtmlPath);

let initialJsGzipBytes = 0;
let initialJsRawBytes = 0;
const leakedLazyVendors = [];

for (const href of initialJsFiles) {
  const rel = href.replace(/^\//, '');
  const full = path.join(distDir, rel);
  if (!fs.existsSync(full)) continue;
  const stats = gzipBytes(full);
  initialJsGzipBytes += stats.gzip;
  initialJsRawBytes += stats.raw;
  if (rel.includes('vendor-motion') || rel.includes('vendor-shiki')) {
    leakedLazyVendors.push(rel);
  }
}

let initialCssGzipBytes = 0;
for (const href of initialCssFiles) {
  const full = path.join(distDir, href.replace(/^\//, ''));
  if (!fs.existsSync(full)) continue;
  initialCssGzipBytes += gzipBytes(full).gzip;
}

let criticalFontsBytes = 0;
for (const href of preloadedFonts) {
  const full = path.join(distDir, href.replace(/^\//, ''));
  if (!fs.existsSync(full)) continue;
  criticalFontsBytes += fs.statSync(full).size;
}

const assetsDir = path.join(distDir, 'assets');
const allAssetJs = fs
  .readdirSync(assetsDir)
  .filter((f) => f.endsWith('.js'))
  .map((f) => {
    const full = path.join(assetsDir, f);
    return { name: f, ...gzipBytes(full) };
  })
  .sort((a, b) => b.gzip - a.gzip);

const initialSet = new Set(initialJsFiles.map((h) => path.basename(h)));
const lazyChunks = allAssetJs.filter((c) => !initialSet.has(c.name));
const nonShikiLazyChunks = lazyChunks.filter((c) => !c.name.includes('shiki') && !c.name.includes('DeletePage'));
const shikiChunks = lazyChunks.filter((c) => c.name.includes('shiki') || c.name.includes('DeletePage'));

const largestRouteChunk = nonShikiLazyChunks[0] ?? { name: '(none)', gzip: 0, raw: 0 };
const largestShikiChunk = shikiChunks[0] ?? { name: '(none)', gzip: 0, raw: 0 };

const totalCriticalBytes =
  htmlStats.gzip + initialJsGzipBytes + initialCssGzipBytes + criticalFontsBytes;

const checks = [
  {
    label: `Initial entry JS (${initialJsFiles.map((f) => path.basename(f)).join(' + ')})`,
    actualKb: toKb(initialJsGzipBytes),
    budgetKb: BUDGETS_KB.initialJsGzip,
    note: `${toKb(initialJsRawBytes)} kB raw`,
  },
  {
    label: 'Initial CSS (gzip)',
    actualKb: toKb(initialCssGzipBytes),
    budgetKb: BUDGETS_KB.initialCssGzip,
  },
  {
    label: `Critical preloaded fonts (${preloadedFonts.length} woff2)`,
    actualKb: toKb(criticalFontsBytes),
    budgetKb: BUDGETS_KB.criticalFontsWoff2,
  },
  {
    label: 'Total initial critical payload (HTML+JS+CSS+Fonts)',
    actualKb: toKb(totalCriticalBytes),
    budgetKb: BUDGETS_KB.totalCriticalPayload,
  },
  {
    label: `Largest lazy route chunk (${largestRouteChunk.name})`,
    actualKb: toKb(largestRouteChunk.gzip),
    budgetKb: BUDGETS_KB.maxRouteChunkGzip,
  },
  {
    label: `Lazy Shiki highlighter chunk (${largestShikiChunk.name})`,
    actualKb: toKb(largestShikiChunk.gzip),
    budgetKb: BUDGETS_KB.maxShikiVendorGzip,
  },
];

console.log('\n=== Bundle Size Budget Report ===\n');
let failed = false;

for (const check of checks) {
  const pass = check.actualKb <= check.budgetKb;
  if (!pass) failed = true;
  const icon = pass ? '✓' : '✗';
  const extra = check.note ? ` (${check.note})` : '';
  console.log(
    `${icon} ${check.label.padEnd(56)} ${String(check.actualKb).padStart(6)} kB / ${check.budgetKb} kB${extra}`,
  );
}

if (leakedLazyVendors.length > 0) {
  failed = true;
  console.error(
    `\n✗ Lazy-only vendor leaked into initial bundle: ${leakedLazyVendors.join(', ')}`,
  );
} else {
  console.log('\n✓ Zero lazy-only vendors (framer-motion, shiki) in initial load.');
}

if (failed) {
  console.error('\n✗ Bundle size budget exceeded — failing CI.');
  process.exit(1);
}

console.log('\n✓ All bundle size budgets passed.');
