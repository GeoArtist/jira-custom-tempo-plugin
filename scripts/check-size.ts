// Fails the build when the add-on without the export code exceeds the size budget
// (constitution 3.1.0, Principle I). The export code has no limit; its size is reported.
//
// Usage: node scripts/check-size.ts [--out=dist] [--core=dist-core]
//   --out   the real build (`vp build`)
//   --core  the same build without the export code (`vp build --mode core`)
// For each page: whole = the real build, core = the build without the export code (this one
// must stay within the budget), export = the difference.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const BUDGET_BYTES = 100 * 1024;

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function directory(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return resolve(root, arg ? arg.slice(prefix.length) : fallback);
}

const outDir = directory('out', 'dist');
const coreDir = directory('core', 'dist-core');

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
const gzipped = (file: string): number => gzipSync(readFileSync(file)).length;

let failed = false;
let pages = 0;

for (const page of readdirSync(outDir, { withFileTypes: true })) {
  if (!page.isDirectory()) continue;
  pages += 1;
  const dir = join(outDir, page.name);
  let whole = 0;
  for (const file of assets(dir)) {
    const size = gzipped(file);
    whole += size;
    console.log(`  ${page.name}/${relative(dir, file).replaceAll('\\', '/')}: ${kb(size)} gzipped`);
  }

  const corePage = join(coreDir, page.name);
  if (!existsSync(corePage)) {
    console.error(`FAIL ${page.name}: ${corePage} does not exist. Run \`vp build --mode core\` first.`);
    failed = true;
    continue;
  }
  const core = assets(corePage).reduce((sum, file) => sum + gzipped(file), 0);
  const over = core > BUDGET_BYTES;
  failed ||= over;
  console.log(
    `${over ? 'FAIL' : 'ok  '} ${page.name}: whole ${kb(whole)}, core ${kb(core)} of ${kb(BUDGET_BYTES)}, ` +
      `export ${kb(whole - core)} (no limit)`,
  );
}

if (pages === 0) {
  console.error(`Nothing to measure: ${outDir} has no page directories.`);
  process.exit(1);
}
if (failed) {
  console.error('Size budget exceeded, or the core build is missing.');
  process.exit(1);
}
