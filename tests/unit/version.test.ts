// The header shows the version of package.json (004 FR-023); the browser shows the one of
// the manifest. The two must be the same number.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

const root = resolve(__dirname, '..', '..');
const version = (path: string): string =>
  (JSON.parse(readFileSync(resolve(root, path), 'utf8')) as { version: string }).version;

describe('the version', () => {
  it('is the same in the package, in its lock file, and in the manifest of the extension', () => {
    const own = version('package.json');
    expect(own).toMatch(/^\d+\.\d+\.\d+$/);
    expect(version('extension/manifest.json')).toBe(own);
    expect(version('package-lock.json')).toBe(own);
  });

  it('reaches the code through the build', () => {
    expect(__APP_VERSION__).toBe(version('package.json'));
  });
});
