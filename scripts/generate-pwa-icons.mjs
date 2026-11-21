import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const iconsDir = path.join(root, 'public/icons');
const appleTouchPath = path.join(root, 'public/apple-touch-icon.png');

/**
 * Builds an SVG string for the WORKING_COPY.md emblem.
 * - When `maskable` is true, fills the entire canvas with `#201e1f` (no rounded outer corners)
 *   and scales the inner frame, serif "W" monogram, and warm orange `#f0642d` dot inside
 *   the 80% W3C maskable icon safe zone so Android/iOS adaptive launchers never clip the glyph.
 */
function createIconSvg(size, { maskable = false } = {}) {
  const pad = maskable ? Math.round(size * 0.16) : Math.round(size * 0.0625);
  const frameSize = size - pad * 2;
  const outerRadius = maskable ? 0 : Math.round(size * 0.156);
  const frameRadius = Math.round(frameSize * 0.14);
  const strokeWidth = Math.max(2, Math.round(size * 0.022));

  // Monogram "W" & orange period dot coordinates scaled to safe box
  const fontSize = Math.round(frameSize * 0.56);
  const textX = Math.round(pad + frameSize * 0.16);
  const textY = Math.round(pad + frameSize * 0.70);
  const dotCx = Math.round(pad + frameSize * 0.80);
  const dotCy = Math.round(pad + frameSize * 0.65);
  const dotR = Math.max(4, Math.round(frameSize * 0.072));
  const topBarWidth = Math.round(frameSize * 0.34);

  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" rx="${outerRadius}" fill="#201e1f" />
      <rect
        x="${pad}"
        y="${pad}"
        width="${frameSize}"
        height="${frameSize}"
        rx="${frameRadius}"
        fill="#282527"
        stroke="#f2eee8"
        stroke-opacity="0.18"
        stroke-width="${strokeWidth}"
      />
      <rect
        x="${pad}"
        y="${pad}"
        width="${topBarWidth}"
        height="${Math.max(3, Math.round(strokeWidth * 1.4))}"
        fill="#f0642d"
      />
      <text
        x="${textX}"
        y="${textY}"
        fill="#f2eee8"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="${fontSize}"
        font-weight="400"
      >W</text>
      <circle cx="${dotCx}" cy="${dotCy}" r="${dotR}" fill="#f0642d" />
    </svg>
  `);
}

async function main() {
  await fs.mkdir(iconsDir, { recursive: true });

  const targets = [
    {
      file: path.join(iconsDir, 'icon-192.png'),
      size: 192,
      maskable: false,
    },
    {
      file: path.join(iconsDir, 'icon-512.png'),
      size: 512,
      maskable: false,
    },
    {
      file: path.join(iconsDir, 'icon-maskable-192.png'),
      size: 192,
      maskable: true,
    },
    {
      file: path.join(iconsDir, 'icon-maskable-512.png'),
      size: 512,
      maskable: true,
    },
    {
      file: appleTouchPath,
      size: 180,
      maskable: false,
    },
  ];

  for (const target of targets) {
    const svg = createIconSvg(target.size, { maskable: target.maskable });
    await sharp(svg)
      .resize(target.size, target.size)
      .png({ compressionLevel: 9 })
      .toFile(target.file);
    const stat = await fs.stat(target.file);
    console.log(
      `✓ Generated ${path.relative(root, target.file)} (${target.size}x${target.size}, ${(stat.size / 1024).toFixed(1)} KB)`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
