// Guards the one door to the export code (specs/003-table-export, research R10): the size
// build replaces the import `…/export/index` by a stub. An import spelled another way, or of
// another module of the folder, would slip the export code into the measured core.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

const root = resolve(__dirname, '..', '..');
const exportDir = join(root, 'src', 'export') + sep;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return name.endsWith('.ts') ? [path] : [];
  });
}

/** Every module a file imports, statically or on demand. */
function imports(text: string): string[] {
  return [...text.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map((match) => match[1] ?? '');
}

describe('the export code', () => {
  it('is imported from outside only as …/export/index', () => {
    const offenders = sourceFiles(join(root, 'src'))
      .filter((path) => !path.startsWith(exportDir))
      .flatMap((path) =>
        imports(readFileSync(path, 'utf8'))
          .filter((specifier) => /(^|\/)export(\/|$)/.test(specifier) && !specifier.endsWith('/export/index'))
          .map((specifier) => `${relative(root, path)}: ${specifier}`),
      );
    expect(offenders).toEqual([]);
  });

  it('does not reach into the panel', () => {
    const offenders = sourceFiles(exportDir).flatMap((path) =>
      imports(readFileSync(path, 'utf8'))
        .filter((specifier) => /(^|\/)ui(\/|$)/.test(specifier))
        .map((specifier) => `${relative(root, path)}: ${specifier}`),
    );
    expect(offenders).toEqual([]);
  });
});
