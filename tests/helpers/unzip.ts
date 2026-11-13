// Reads back a ZIP archive whose entries are stored without compression, as
// src/export/zip.ts writes them. For the tests only; it refuses anything else.

const END_RECORD = 22;

/** The entries by name, in the order of the archive, each decoded as UTF-8 text. */
export function unzip(bytes: Uint8Array): Map<string, string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.length - END_RECORD;
  if (end < 0 || view.getUint32(end, true) !== 0x06054b50) throw new Error('no end record at the end of the archive');
  const count = view.getUint16(end + 10, true);
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const entries = new Map<string, string>();

  let at = view.getUint32(end + 16, true);
  for (let index = 0; index < count; index += 1) {
    if (view.getUint32(at, true) !== 0x02014b50) throw new Error(`entry ${index}: no central directory header`);
    const method = view.getUint16(at + 10, true);
    const size = view.getUint32(at + 20, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const local = view.getUint32(at + 42, true);
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));
    if (method !== 0) throw new Error(`${name}: compressed entries are not supported`);
    if (size !== view.getUint32(at + 24, true)) throw new Error(`${name}: sizes differ`);

    if (view.getUint32(local, true) !== 0x04034b50) throw new Error(`${name}: no local header`);
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    entries.set(name, decoder.decode(bytes.subarray(start, start + size)));
    at += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}
