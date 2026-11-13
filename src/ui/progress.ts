// The progress bar against the 8-hour norm (FR-015 to FR-020) and its hover tip (FR-058).
// A period longer than one day shows the bar chart in its place (FR-076).
import { formatDuration, formatTitle } from '../domain/format';
import type { Period } from '../domain/period';
import { MAX_SECONDS, NORM_SECONDS, type PeriodSummary } from '../domain/summary';
import type { TicketRow } from '../domain/worklog';
import { pl } from '../i18n/pl';
import { createChart, type ChartOptions } from './chart';
import { applyTotal, el } from './dom';

export interface Progress {
  element: HTMLElement;
  /** `rows` and `timeZone` feed the chart of a period longer than one day. */
  update(summary: PeriodSummary, period: Period, rows: readonly TicketRow[], timeZone: string): void;
}

/** Share of the bar's width taken by the 0-to-8h segment, as in the mock-up. */
const NORM_WIDTH = 60;
const TICK_HOURS = [0, 4, 8, 12, 16, 24];

/**
 * Position on the bar in percent. The scale is piecewise linear: the first 8 hours take
 * 60% of the width, the remaining 16 hours the other 40%, so a normal day is easy to read
 * and overtime up to 24h still fits.
 */
export function barPosition(seconds: number): number {
  const clamped = Math.min(Math.max(seconds, 0), MAX_SECONDS);
  if (clamped <= NORM_SECONDS) return (clamped / NORM_SECONDS) * NORM_WIDTH;
  return NORM_WIDTH + ((clamped - NORM_SECONDS) / (MAX_SECONDS - NORM_SECONDS)) * (100 - NORM_WIDTH);
}

export function createProgress(options: ChartOptions = {}): Progress {
  // The track carries both gradients at full size; the cover hides the part not reached.
  const cover = el('div', { class: 'wt-progress__cover' });
  const track = el('div', { class: 'wt-progress__track' }, [cover]);
  const scale = el('div', { class: 'wt-progress__scale', attrs: { 'aria-hidden': 'true' } });

  for (const hours of TICK_HOURS) {
    const position = `${barPosition(hours * 3600)}%`;
    const isNorm = hours * 3600 === NORM_SECONDS;
    const edge = hours === 0 ? ' wt-progress__label--start' : hours === 24 ? ' wt-progress__label--end' : '';
    if (hours > 0 && hours < 24) {
      const tick = el('span', { class: `wt-progress__tick${isNorm ? ' wt-progress__tick--norm' : ''}` });
      tick.style.setProperty('--wt-pos', position);
      track.appendChild(tick);
    }
    const label = el('span', { class: `wt-progress__label${edge}`, text: `${hours}h` });
    label.style.setProperty('--wt-pos', position);
    scale.appendChild(label);
  }

  // Shown while the pointer is over the bar: the header's title again, in two small lines.
  // It repeats what the header says, so assistive technology does not need it.
  const tipPeriod = el('span', { class: 'wt-progress__tip-period' });
  const tipTotal = el('span', { class: 'wt-progress__tip-total wt-total' });
  const tip = el('div', { class: 'wt-progress__tip', attrs: { 'aria-hidden': 'true' } }, [tipPeriod, tipTotal]);

  const bar = el('div', { class: 'wt-progress__bar' }, [tip, track, scale]);
  // Nothing is written under the bar: the totals are in the title, the tip, and the total row.
  const chart = createChart(options);
  const element = el('section', { class: 'wt-progress' }, [bar, chart.element]);

  return {
    element,
    update(summary, period, rows, timeZone) {
      const text = formatDuration(summary.totalSeconds);
      // One day: the bar against the norm. Longer: the chart of the days (FR-019, FR-076).
      element.classList.toggle('wt-progress--chart', !summary.progressActive);
      bar.hidden = !summary.progressActive;
      chart.element.hidden = summary.progressActive;
      if (!summary.progressActive) {
        chart.update(rows, period, timeZone);
        return;
      }

      tipPeriod.textContent = formatTitle(period);
      tipTotal.textContent = `${pl.total} ${formatDuration(summary.totalSeconds)}`;
      applyTotal(tipTotal, summary);

      cover.style.setProperty('--wt-fill', `${barPosition(summary.totalSeconds)}%`);
      track.setAttribute('role', 'progressbar');
      track.setAttribute('aria-valuemin', '0');
      track.setAttribute('aria-valuemax', String(summary.maxSeconds));
      track.setAttribute('aria-valuenow', String(Math.min(summary.totalSeconds, summary.maxSeconds)));
      track.setAttribute('aria-valuetext', text);
      track.setAttribute('aria-label', formatTitle(period));
    },
  };
}
