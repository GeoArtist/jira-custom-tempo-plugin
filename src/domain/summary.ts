// Totals and progress state for the header, footer, bar, and launcher (data-model.md, PeriodSummary).
import { isSingleDay, type Period } from './period';
import { totalOf, type TicketRow } from './worklog';

export const NORM_SECONDS = 8 * 3600;
export const MAX_SECONDS = 24 * 3600;

export type ProgressTone = 'red' | 'yellow' | 'green' | 'blue' | 'violet';

/**
 * A colour described as a mix of two named tones, so that the stylesheet (and the
 * active theme) decides the actual colour values. `ratio` 0 = all `from`, 1 = all `to`.
 */
export interface ToneMix {
  from: ProgressTone;
  to: ProgressTone;
  ratio: number;
}

export interface PeriodSummary {
  totalSeconds: number;
  /** The bar and coloured totals apply to single-day periods only (FR-019); a longer one gets the chart. */
  progressActive: boolean;
  normSeconds: number;
  maxSeconds: number;
  /** Share of the 0-to-24h scale that is filled; 0 when not active. */
  fillFraction: number;
  normReached: boolean;
  /** Null means the normal text colour. */
  colour: ToneMix | null;
}

/**
 * Red through yellow (at 4h) to green up to the norm, then green through blue (at 16h) to
 * violet at 24h, and violet above (FR-016, FR-017). The stops match the progress bar's
 * gradients, so a total has the colour of the bar at its value (FR-018).
 */
export function colourFor(totalSeconds: number): ToneMix | null {
  const r = totalSeconds / NORM_SECONDS;
  if (r <= 0) return null;
  if (r <= 0.5) return { from: 'red', to: 'yellow', ratio: r * 2 };
  if (r <= 1) return { from: 'yellow', to: 'green', ratio: r * 2 - 1 };
  if (r <= 2) return { from: 'green', to: 'blue', ratio: r - 1 };
  if (r <= 3) return { from: 'blue', to: 'violet', ratio: r - 2 };
  return { from: 'violet', to: 'violet', ratio: 1 };
}

export function summarise(rows: TicketRow[], period: Period): PeriodSummary {
  const totalSeconds = totalOf(rows);
  const progressActive = isSingleDay(period);
  return {
    totalSeconds,
    progressActive,
    normSeconds: NORM_SECONDS,
    maxSeconds: MAX_SECONDS,
    fillFraction: progressActive ? Math.min(totalSeconds, MAX_SECONDS) / MAX_SECONDS : 0,
    normReached: totalSeconds >= NORM_SECONDS,
    colour: progressActive ? colourFor(totalSeconds) : null,
  };
}
