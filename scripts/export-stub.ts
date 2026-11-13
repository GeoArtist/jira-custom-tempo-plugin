// Stands in for src/export/index.ts in the size build (`vp build --mode core`, see
// vite.config.ts). That build is the add-on without the export code: its size is what the
// budget of the constitution applies to, and the difference to the real build is the size
// of the export code (scripts/check-size.ts). It is never shipped.

export function buildFile(): never {
  throw new Error('The export code is left out of this build.');
}

export function saveFile(): never {
  throw new Error('The export code is left out of this build.');
}
