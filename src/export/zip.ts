// A ZIP archive with stored (uncompressed) entries: all an XLSX file needs as its
// container (specs/003-table-export/research.md, R3). Synchronous and without a compressor.

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[index] = value >>> 0;
  }
  return table;
})();

/** The CRC-32 checksum the ZIP format asks for. */
export function crc32(bytes: Uint8Array): number {
  let value = 0xffffffff;
  for (const byte of bytes) value = (CRC_TABLE[(value ^ byte) & 0xff] as number) ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

const LOCAL_HEADER = 30;
const CENTRAL_HEADER = 46;
const END_RECORD = 22;
const VERSION = 20;
/** File names are UTF-8. */
const FLAGS = 0x0800;
const STORED = 0;

/** The entries in the order given, with `now` as their time. The same input gives the same bytes. */
export function zip(entries: readonly ZipEntry[], now: Date): Uint8Array {
  const encoder = new TextEncoder();
  const files = entries.map((entry) => ({
    name: encoder.encode(entry.name),
    data: entry.data,
    crc: crc32(entry.data),
  }));
  const localSize = files.reduce((sum, file) => sum + LOCAL_HEADER + file.name.length + file.data.length, 0);
  const centralSize = files.reduce((sum, file) => sum + CENTRAL_HEADER + file.name.length, 0);

  const bytes = new Uint8Array(localSize + centralSize + END_RECORD);
  const view = new DataView(bytes.buffer);
  // The format keeps time as MS-DOS did: two-second steps, years from 1980.
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const date = (Math.max(0, now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  let at = 0;
  const offsets: number[] = [];
  for (const file of files) {
    offsets.push(at);
    view.setUint32(at, 0x04034b50, true); // local file header
    view.setUint16(at + 4, VERSION, true);
    view.setUint16(at + 6, FLAGS, true);
    view.setUint16(at + 8, STORED, true);
    view.setUint16(at + 10, time, true);
    view.setUint16(at + 12, date, true);
    view.setUint32(at + 14, file.crc, true);
    view.setUint32(at + 18, file.data.length, true);
    view.setUint32(at + 22, file.data.length, true);
    view.setUint16(at + 26, file.name.length, true);
    bytes.set(file.name, at + LOCAL_HEADER);
    bytes.set(file.data, at + LOCAL_HEADER + file.name.length);
    at += LOCAL_HEADER + file.name.length + file.data.length;
  }

  const centralStart = at;
  files.forEach((file, index) => {
    view.setUint32(at, 0x02014b50, true); // central directory entry
    view.setUint16(at + 4, VERSION, true); // made by
    view.setUint16(at + 6, VERSION, true); // needed to read
    view.setUint16(at + 8, FLAGS, true);
    view.setUint16(at + 10, STORED, true);
    view.setUint16(at + 12, time, true);
    view.setUint16(at + 14, date, true);
    view.setUint32(at + 16, file.crc, true);
    view.setUint32(at + 20, file.data.length, true);
    view.setUint32(at + 24, file.data.length, true);
    view.setUint16(at + 28, file.name.length, true);
    view.setUint32(at + 42, offsets[index] as number, true); // where the local header starts
    bytes.set(file.name, at + CENTRAL_HEADER);
    at += CENTRAL_HEADER + file.name.length;
  });

  view.setUint32(at, 0x06054b50, true); // end of central directory
  view.setUint16(at + 8, files.length, true);
  view.setUint16(at + 10, files.length, true);
  view.setUint32(at + 12, centralSize, true);
  view.setUint32(at + 16, centralStart, true);
  return bytes;
}
