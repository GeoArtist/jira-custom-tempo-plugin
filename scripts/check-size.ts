// Fails the build when a page's script and styles exceed the size budget (constitution, Principle I).
// Usage: node scripts/check-size.ts [--out=dist]
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const BUDGET_BYTES = 100 * 1024;

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outArg = process.argv.find((arg) => arg.startsWith('--out='));
const outDir = resolve(root, outArg ? outArg.slice('--out='.length) : 'dist');

if (!existsSync(outDir)) {
  console.error(`Nothing to measure: ${outDir} does not exist. Run the build first.`);
  process.exit(1);
}

/** Every script and stylesheet below a directory. */
function assets(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return assets(path);
    return /\.(js|css)$/.test(entry.name) ? [path] : [];
  });
}

const kb = (bytes: number): string => `${(bytes / 1024).toFixed(1)} kB`;
let failed = false;
let pages = 0;

for (const page of readdirSync(outDir, { withFileTypes: true })) {
  if (!page.isDirectory()) continue;
  pages += 1;
  const dir = join(outDir, page.name);
  let total = 0;
  for (const file of assets(dir)) {
    const size = gzipSync(readFileSync(file)).length;
    total += size;
    console.log(`  ${page.name}/${relative(dir, file).replaceAll('\\', '/')}: ${kb(size)} gzipped`);
  }
  const over = total > BUDGET_BYTES;
  failed ||= over;
  console.log(`${over ? 'FAIL' : 'ok  '} ${page.name}: ${kb(total)} of ${kb(BUDGET_BYTES)}`);
}

if (pages === 0) {
  console.error(`Nothing to measure: ${outDir} has no page directories.`);
  process.exit(1);
}
if (failed) {
  console.error('Size budget exceeded.');
  process.exit(1);
}
