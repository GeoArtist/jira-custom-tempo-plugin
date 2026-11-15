// The colours of the XLSX file (specs/003-table-export/contracts/files.md, "Colours").
// A sheet is white whatever appearance the add-on is in, and it cannot read the
// stylesheet, so the values of the light appearance stand here once more. A test holds
// them equal to src/styles/_tokens.scss (tests/unit/export-palette.test.ts).
import type { PeriodSummary, ProgressTone } from '../domain/summary';

export const PALETTE = {
  text: '#172033',
  muted: '#5a6475',
  link: '#0b5cd7',
  name: '#b84e00',
  headerFill: '#0c66e4',
  headerText: '#ffffff',
  /** Visible on white, also in print; the muted text of the dark appearance. */
  border: '#9aa3b2',
  tones: {
    red: '#b3261e',
    yellow: '#7a5200',
    green: '#146c43',
    blue: '#0b5cc0',
    violet: '#6b35c4',
  } satisfies Record<ProgressTone, string>,
} as const;

const channels = (hex: string): number[] => [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16));

/** A colour between two, channel by channel: `ratio` 0 is all `from`, 1 is all `to`. */
export function mix(from: string, to: string, ratio: number): string {
  const [a, b] = [channels(from), channels(to)];
  return `#${a
    .map((value, index) =>
      Math.round(value + ((b[index] ?? value) - value) * ratio)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

/** The colour of a total: as on screen (001 FR-018, FR-019, FR-068), in the shades above. */
export function totalColour(summary: PeriodSummary): string {
  if (summary.totalSeconds === 0) return PALETTE.muted;
  if (!summary.colour) return PALETTE.text;
  const { from, to, ratio } = summary.colour;
  return mix(PALETTE.tones[from], PALETTE.tones[to], ratio);
}

/** `#172033` as the file writes a colour: `FF172033`. */
export function argb(hex: string): string {
  return `FF${hex.slice(1).toUpperCase()}`;
}
