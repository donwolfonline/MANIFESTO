import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const sourceJpg = path.join(root, 'src/assets/human-job.jpg');
const outputWebp = path.join(root, 'src/assets/human-job.webp');
const outputGrain = path.join(root, 'src/assets/grain.webp');
const outputOg = path.join(root, 'public/og-image.png');

async function main() {
  const inputBuffer = await fs.readFile(sourceJpg);
  const metadata = await sharp(inputBuffer).metadata();

  // 1. Generate WebP (quality 82, high compression effort)
  await sharp(inputBuffer)
    .webp({ quality: 82, effort: 6 })
    .toFile(outputWebp);

  // 2. Optimize JPEG fallback (progressive mozjpeg)
  const optimizedJpgBuffer = await sharp(inputBuffer)
    .jpeg({ quality: 80, progressive: true, mozjpeg: true })
    .toBuffer();
  await fs.writeFile(sourceJpg, optimizedJpgBuffer);

  // 3. Generate pixel-exact 1200x630 Open Graph / Twitter Card image
  const ogBackground = await sharp(inputBuffer)
    .resize(1200, 630, { fit: 'cover', position: 'center' })
    .modulate({ brightness: 0.42, saturation: 0.85 })
    .toBuffer();

  const ogOverlaySvg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <defs>
        <linearGradient id="wash" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#201e1f" stop-opacity="0.92" />
          <stop offset="55%" stop-color="#201e1f" stop-opacity="0.78" />
          <stop offset="100%" stop-color="#201e1f" stop-opacity="0.62" />
        </linearGradient>
      </defs>

      <rect width="1200" height="630" fill="url(#wash)" />

      <!-- Outer architectural hairline frame -->
      <rect x="36" y="36" width="1128" height="558" fill="none" stroke="#f2eee8" stroke-opacity="0.14" stroke-width="1" />

      <!-- Top accent bar -->
      <rect x="36" y="36" width="180" height="2" fill="#eb5e28" />

      <!-- Top metadata row -->
      <circle cx="80" cy="88" r="4" fill="#eb5e28" />
      <text x="98" y="93" fill="#f2eee8" font-family="Menlo, Monaco, Courier, monospace" font-size="16" letter-spacing="2.4">~/MANIFESTO.MD</text>
      <text x="1120" y="93" text-anchor="end" fill="#968f86" font-family="Menlo, Monaco, Courier, monospace" font-size="14" letter-spacing="2.2">PLAIN TEXT · UTF-8</text>

      <!-- Giant editorial display wordmark -->
      <text x="76" y="318" fill="#f2eee8" font-family="Georgia, 'Times New Roman', serif" font-size="126" letter-spacing="-3.5">
        MANIFESTO<tspan fill="#eb5e28">.</tspan><tspan fill="#b8b1a7" font-style="italic">md</tspan>
      </text>

      <!-- Three terminal-style Markdown blockquote lines -->
      <text x="78" y="394" font-family="Menlo, Monaco, Courier, monospace" font-size="20">
        <tspan fill="#eb5e28">&gt;</tspan><tspan dx="12" fill="#b8b1a7">a working manifesto. notes-to-self, mostly.</tspan>
      </text>
      <text x="78" y="430" font-family="Menlo, Monaco, Courier, monospace" font-size="20">
        <tspan fill="#eb5e28">&gt;</tspan><tspan dx="12" fill="#b8b1a7">written in plain text so it outlives every tool that renders it.</tspan>
      </text>
      <text x="78" y="466" font-family="Menlo, Monaco, Courier, monospace" font-size="20">
        <tspan fill="#eb5e28">&gt;</tspan><tspan dx="12" fill="#b8b1a7">quiet type, generous silence, and one spark of heat.</tspan>
      </text>

      <!-- Bottom colophon rule -->
      <line x1="76" y1="530" x2="1124" y2="530" stroke="#f2eee8" stroke-opacity="0.14" stroke-width="1" />
      <text x="78" y="562" fill="#968f86" font-family="Menlo, Monaco, Courier, monospace" font-size="14" letter-spacing="2">THE ACTUAL (HUMAN) JOB · 10 WORKING NOTES</text>
      <text x="1124" y="562" text-anchor="end" fill="#f2eee8" font-family="Menlo, Monaco, Courier, monospace" font-size="14" letter-spacing="2">READ →</text>
    </svg>
  `);

  await fs.mkdir(path.dirname(outputOg), { recursive: true });
  await sharp(ogBackground)
    .composite([{ input: ogOverlaySvg, top: 0, left: 0 }])
    .png({ compressionLevel: 9, palette: false })
    .toFile(outputOg);

  // 4. Generate tiny 128x128 static monochrome film-grain WebP tile
  const grainSize = 128;
  const rawGrain = Buffer.alloc(grainSize * grainSize * 4);
  let seed = 133742;
  for (let i = 0; i < grainSize * grainSize; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const v = (seed >>> 24) & 0xff;
    const offset = i * 4;
    rawGrain[offset] = v;
    rawGrain[offset + 1] = v;
    rawGrain[offset + 2] = v;
    rawGrain[offset + 3] = 255;
  }
  await sharp(rawGrain, {
    raw: { width: grainSize, height: grainSize, channels: 4 },
  })
    .webp({ quality: 55, effort: 6 })
    .toFile(outputGrain);

  const [webpStat, jpgStat, ogStat, grainStat, ogMeta] = await Promise.all([
    fs.stat(outputWebp),
    fs.stat(sourceJpg),
    fs.stat(outputOg),
    fs.stat(outputGrain),
    sharp(outputOg).metadata(),
  ]);

  console.log(`Source dimensions: ${metadata.width}x${metadata.height}`);
  console.log(`WebP written: ${(webpStat.size / 1024).toFixed(1)} KB`);
  console.log(`JPG optimized: ${(jpgStat.size / 1024).toFixed(1)} KB`);
  console.log(`Grain tile written: ${(grainStat.size / 1024).toFixed(1)} KB`);
  console.log(
    `OG image written: ${ogMeta.width}x${ogMeta.height} (${(ogStat.size / 1024).toFixed(1)} KB)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
