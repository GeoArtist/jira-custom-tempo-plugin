// The ZIP container of the XLSX file (specs/003-table-export/research.md, R3).
import { describe, expect, it } from 'vite-plus/test';
import { crc32, zip } from '../../src/export/zip';
import { unzip } from '../helpers/unzip';

const encode = (text: string) => new TextEncoder().encode(text);
const NOW = new Date(2026, 10, 13, 14, 25, 36);

describe('crc32', () => {
  it('gives the known checksums', () => {
    expect(crc32(encode('123456789'))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
    expect(crc32(encode('The quick brown fox jumps over the lazy dog'))).toBe(0x414fa339);
  });
});

describe('zip', () => {
  const entries = [
    { name: '[Content_Types].xml', data: encode('<Types/>') },
    { name: 'xl/workbook.xml', data: encode('<workbook name="Zażółć"/>') },
    { name: 'empty.txt', data: new Uint8Array() },
  ];

  it('starts with a local file header', () => {
    expect(Array.from(zip(entries, NOW).slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
  });

  it('is read back to the same names, in the same order, with the same contents', () => {
    const read = unzip(zip(entries, NOW));
    expect([...read.keys()]).toEqual(['[Content_Types].xml', 'xl/workbook.xml', 'empty.txt']);
    expect(read.get('xl/workbook.xml')).toBe('<workbook name="Zażółć"/>');
    expect(read.get('empty.txt')).toBe('');
  });

  it('keeps a name with letters outside ASCII, marked as UTF-8', () => {
    const bytes = zip([{ name: 'Zażółć.xml', data: encode('x') }], NOW);
    expect([...unzip(bytes).keys()]).toEqual(['Zażółć.xml']);
    // The general purpose flags of the first local header.
    expect(new DataView(bytes.buffer).getUint16(6, true)).toBe(0x0800);
  });

  it('stores every entry without compression, with matching sizes and checksums', () => {
    const bytes = zip(entries, NOW);
    const view = new DataView(bytes.buffer);
    const data = entries[1]?.data as Uint8Array;
    // The second local header follows the first entry: 30 bytes, its name, its data.
    const second = 30 + '[Content_Types].xml'.length + (entries[0]?.data.length ?? 0);
    expect(view.getUint32(second, true)).toBe(0x04034b50);
    expect(view.getUint16(second + 8, true)).toBe(0);
    expect(view.getUint32(second + 14, true)).toBe(crc32(data));
    expect([view.getUint32(second + 18, true), view.getUint32(second + 22, true)]).toEqual([data.length, data.length]);

    // The end record counts the entries and points at the central directory.
    const end = bytes.length - 22;
    expect(view.getUint32(end, true)).toBe(0x06054b50);
    expect([view.getUint16(end + 8, true), view.getUint16(end + 10, true)]).toEqual([3, 3]);
    expect(view.getUint32(view.getUint32(end + 16, true), true)).toBe(0x02014b50);
  });

  it('writes the given time into the entries', () => {
    const view = new DataView(zip(entries, NOW).buffer);
    // 14:25:36 and 13 November 2026, as MS-DOS kept time.
    expect(view.getUint16(10, true)).toBe((14 << 11) | (25 << 5) | 18);
    expect(view.getUint16(12, true)).toBe((46 << 9) | (11 << 5) | 13);
  });

  it('gives the same bytes for the same input and time', () => {
    expect(zip(entries, NOW)).toEqual(zip(entries, new Date(NOW)));
    expect(zip(entries, NOW)).not.toEqual(zip(entries, new Date(2026, 10, 13, 15, 0, 0)));
  });

  it('is an empty archive for no entries', () => {
    const bytes = zip([], NOW);
    expect(bytes).toHaveLength(22);
    expect(unzip(bytes).size).toBe(0);
  });
});
