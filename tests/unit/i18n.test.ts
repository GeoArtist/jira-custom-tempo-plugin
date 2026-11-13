// Guards FR-035: the texts of the UI contract exist in the text module, and no other
// source file carries Polish text of its own.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

const root = resolve(__dirname, '..', '..');
const read = (path: string): string => readFileSync(join(root, path), 'utf8');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|html)$/.test(name) ? [path] : [];
  });
}

describe('Polish texts', () => {
  it('contain every text of the UI contract', () => {
    const contract = read('specs/001-worktime-panel/contracts/ui.md');
    const table = contract.slice(contract.indexOf('## Texts'), contract.indexOf('## Formats'));
    const texts = table
      .split('\n')
      .filter((line) => line.startsWith('|') && !line.startsWith('| Element') && !line.startsWith('|---'))
      .flatMap((line) => [...(line.split('|')[2] ?? '').matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? ''));
    expect(texts.length).toBeGreaterThan(30);

    const module = read('src/i18n/pl.ts');
    const missing = texts.filter((text) => !module.includes(text));
    expect(missing).toEqual([]);
  });

  it('live only in src/i18n/pl.ts', () => {
    const offenders = sourceFiles(join(root, 'src'))
      .filter((path) => !path.endsWith(join('i18n', 'pl.ts')))
      .filter((path) => /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(readFileSync(path, 'utf8')))
      .map((path) => relative(root, path));
    expect(offenders).toEqual([]);
  });
});
