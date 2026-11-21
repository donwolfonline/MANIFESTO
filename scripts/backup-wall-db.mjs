import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';

/**
 * Automated Wall database backup script (`npm run db:backup`).
 * Fetches all rows from Supabase `wall_submissions` (strictly non-PII form records),
 * writes a gzip-compressed JSON snapshot + SHA-256 checksum to ./backups/.
 */
async function main() {
  const supabaseUrl = (process.env.SUPABASE_URL ?? '').replace(/\/+$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const outDir = path.resolve(process.env.BACKUP_DIR ?? 'backups');

  if (!supabaseUrl || !serviceKey) {
    console.error(
      '✗ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set both secrets before running backup.',
    );
    process.exit(1);
  }

  const endpoint = `${supabaseUrl}/rest/v1/wall_submissions?select=id,principle,author,country_flag,author_url,status,likes,created_at&order=created_at.desc&limit=10000`;
  const res = await fetch(endpoint, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    console.error(`✗ Supabase export failed with HTTP ${res.status}`);
    process.exit(1);
  }

  const rows = await res.json();
  if (!Array.isArray(rows)) {
    console.error('✗ Unexpected response format from Supabase (expected JSON array).');
    process.exit(1);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const payload = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      schemaVersion: 1,
      table: 'wall_submissions',
      count: rows.length,
      items: rows,
    },
    null,
    2,
  );

  const gzipped = zlib.gzipSync(Buffer.from(payload, 'utf8'), { level: 9 });
  // Verify round-trip integrity before writing
  const verified = JSON.parse(zlib.gunzipSync(gzipped).toString('utf8'));
  if (verified.count !== rows.length) {
    throw new Error('Backup integrity verification failed.');
  }

  const sha256 = crypto.createHash('sha256').update(gzipped).digest('hex');

  await fs.mkdir(outDir, { recursive: true });
  const fileName = `wall-backup-${stamp}.json.gz`;
  const filePath = path.join(outDir, fileName);
  const checksumPath = `${filePath}.sha256`;

  await fs.writeFile(filePath, gzipped);
  await fs.writeFile(checksumPath, `${sha256}  ${fileName}\n`, 'utf8');

  console.log(
    `✓ Backed up ${rows.length} rows -> ${path.relative(process.cwd(), filePath)} (${(gzipped.length / 1024).toFixed(1)} kB gzip)`,
  );
  console.log(`✓ SHA-256: ${sha256}`);
}

main().catch((err) => {
  console.error('✗ Backup failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
