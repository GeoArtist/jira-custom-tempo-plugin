// The size gate of the build (constitution 3.1.0, Principle I): scripts/check-size.ts is run
// as the build runs it, against builds made up in temporary directories.
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';

const script = resolve(__dirname, '..', '..', 'scripts', 'check-size.ts');

let dir = '';

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'wt-size-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** Writes `content.js` of the page "extension" into a build directory. */
function build(name: string, content: Uint8Array | string): string {
  const out = join(dir, name);
  mkdirSync(join(out, 'extension'), { recursive: true });
  writeFileSync(join(out, 'extension', 'content.js'), content);
  return out;
}

function run(out: string, core: string) {
  const result = spawnSync(process.execPath, [script, `--out=${out}`, `--core=${core}`], { encoding: 'utf8' });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

// Random bytes do not get smaller under gzip.
const noise = (kilobytes: number): Uint8Array => randomBytes(kilobytes * 1024);

describe('check-size', () => {
  it('passes and reports the whole, the core, and the export code when the core is in budget', () => {
    const core = noise(20);
    const out = build('dist', Buffer.concat([core, noise(150)]));
    const result = run(out, build('dist-core', core));
    expect(result.output).toMatch(
      /ok {3}extension: whole 17\d\.\d kB, core 20\.\d kB of 100\.0 kB, export 15\d\.\d kB \(no limit\)/,
    );
    expect(result.status).toBe(0);
  });

  it('fails when the core is above the budget, whatever the export code weighs', () => {
    const core = noise(120);
    const result = run(build('dist', core), build('dist-core', core));
    expect(result.output).toContain('FAIL extension');
    expect(result.status).toBe(1);
  });

  it('fails when the core build is missing', () => {
    const result = run(build('dist', 'x'), join(dir, 'nowhere'));
    expect(result.output).toContain('vp build --mode core');
    expect(result.status).toBe(1);
  });
});
