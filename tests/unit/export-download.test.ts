// Handing a file to the browser (specs/003-table-export/research.md, R7).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { saveFile } from '../../src/export/download';

const file = { name: 'Jan_Kowalski_13-11-2026_tempo_report.csv', mime: 'text/csv;charset=utf-8', data: 'a;b\r\n' };

let host: HTMLElement;
let made: Blob[];
let clicked: Array<{ href: string; download: string; parent: Node | null }>;
let released: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  host = document.createElement('div');
  document.body.appendChild(host);
  made = [];
  clicked = [];
  URL.createObjectURL = vi.fn((blob: Blob) => {
    made.push(blob);
    return 'blob:fake/1';
  }) as typeof URL.createObjectURL;
  released = vi.fn();
  URL.revokeObjectURL = released as typeof URL.revokeObjectURL;
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    clicked.push({ href: this.getAttribute('href') ?? '', download: this.download, parent: this.parentNode });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  host.remove();
});

describe('saveFile', () => {
  it('clicks a link to the file inside the host, under the name of the file, and removes it', () => {
    saveFile(file, host);
    expect(made).toHaveLength(1);
    expect(made[0]?.type).toBe('text/csv;charset=utf-8');
    expect(clicked).toEqual([{ href: 'blob:fake/1', download: file.name, parent: host }]);
    expect(host.childNodes).toHaveLength(0);
  });

  it('takes text and bytes alike', async () => {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
    saveFile({ name: 'a.xlsx', mime: 'application/octet-stream', data: bytes }, host);
    expect(made[0]?.size).toBe(4);
    saveFile(file, host);
    expect(await made[1]?.text()).toBe('a;b\r\n');
  });

  it('releases the address later, not at once', () => {
    saveFile(file, host);
    expect(released).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(released).toHaveBeenCalledWith('blob:fake/1');
  });

  it('throws and leaves nothing behind when the file cannot be made', () => {
    URL.createObjectURL = vi.fn(() => {
      throw new Error('blocked');
    }) as typeof URL.createObjectURL;
    expect(() => saveFile(file, host)).toThrow('blocked');
    expect(host.childNodes).toHaveLength(0);
    expect(clicked).toEqual([]);
  });

  it('removes the link also when the click fails', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('no click');
    });
    expect(() => saveFile(file, host)).toThrow('no click');
    expect(host.childNodes).toHaveLength(0);
  });
});
