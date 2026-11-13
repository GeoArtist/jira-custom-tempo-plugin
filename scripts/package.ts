// Packs dist/extension into one .zip file, the form browsers' extension stores accept.
// Usage: node scripts/package.ts   (run the build first; `vp run package` does both)
// Writes the ZIP format directly with node:zlib, so no dependency is needed.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateRawSync } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'dist', 'extension');

if (!existsSync(join(source, 'manifest.json'))) {
  console.error(`Nothing to pack: ${source} has no manifest.json. Run the build first.`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(join(source, 'manifest.json'), 'utf8')) as { version: string };
const target = join(root, 'dist', `jira-custom-tempo-${manifest.version}.zip`);

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => (entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]))
    .sort();
}

// A fixed timestamp (1 January 2026) keeps the archive identical for identical input.
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

const local: Buffer[] = [];
const central: Buffer[] = [];
let offset = 0;

for (const file of files(source)) {
  const name = Buffer.from(relative(source, file).replaceAll('\\', '/'), 'utf8');
  const content = readFileSync(file);
  const packed = deflateRawSync(content, { level: 9 });
  const checksum = crc32(content);

  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0); // local file header
  header.writeUInt16LE(20, 4); // version needed
  header.writeUInt16LE(0x0800, 6); // file names are UTF-8
  header.writeUInt16LE(8, 8); // deflate
  header.writeUInt16LE(DOS_TIME, 10);
  header.writeUInt16LE(DOS_DATE, 12);
  header.writeUInt32LE(checksum, 14);
  header.writeUInt32LE(packed.length, 18);
  header.writeUInt32LE(content.length, 22);
  header.writeUInt16LE(name.length, 26);
  local.push(header, name, packed);

  const entry = Buffer.alloc(46);
  entry.writeUInt32LE(0x02014b50, 0); // central directory entry
  entry.writeUInt16LE(20, 4); // version made by
  entry.writeUInt16LE(20, 6); // version needed
  entry.writeUInt16LE(0x0800, 8);
  entry.writeUInt16LE(8, 10);
  entry.writeUInt16LE(DOS_TIME, 12);
  entry.writeUInt16LE(DOS_DATE, 14);
  entry.writeUInt32LE(checksum, 16);
  entry.writeUInt32LE(packed.length, 20);
  entry.writeUInt32LE(content.length, 24);
  entry.writeUInt16LE(name.length, 28);
  entry.writeUInt32LE(offset, 42); // where the local header starts
  central.push(entry, name);

  offset += header.length + name.length + packed.length;
}

const directory = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); // end of central directory
end.writeUInt16LE(central.length / 2, 8);
end.writeUInt16LE(central.length / 2, 10);
end.writeUInt32LE(directory.length, 12);
end.writeUInt32LE(offset, 16);

writeFileSync(target, Buffer.concat([...local, directory, end]));
console.log(`Packed ${central.length / 2} files into ${relative(root, target).replaceAll('\\', '/')}`);
