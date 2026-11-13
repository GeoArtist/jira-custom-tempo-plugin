// The bar chart shown in place of the progress bar for a period longer than one day
// (FR-076 to FR-079): one bar per day, month, or year, in the colours of the progress bar.
import {
  autoGranularity,
  buildChart,
  chartScale,
  zoomLevels,
  type ChartBucket,
  type Granularity,
} from '../domain/chart';
import { formatBucket, formatBucketLabel, formatDuration } from '../domain/format';
import { NORM_SECONDS } from '../domain/summary';
import { slicePeriod, type Period } from '../domain/period';
import type { TicketRow } from '../domain/worklog';
import { pl } from '../i18n/pl';
import { applyToneMix, clear, el, icon } from './dom';

export interface Chart {
  element: HTMLElement;
  update(rows: readonly TicketRow[], period: Period, timeZone: string): void;
}

export interface ChartOptions {
  /** A bar was clicked, or chosen with Enter: the part of the period it stands for (FR-080). */
  onSelect?(period: Period): void;
}

/** The room one axis label needs, in px, by what a bar stands for. */
const LABEL_WIDTH: Record<Granularity, number> = { day: 40, month: 52, year: 36 };
/** The narrowest column, in px: tight when all bars have to fit, roomy after zooming in. */
const FIT_WIDTH = 3;
const ZOOMED_WIDTH: Record<Granularity, number> = { day: 14, month: 32, year: 40 };
/** The width assumed where the page has no layout to measure. */
const DEFAULT_VIEW_WIDTH = 720;

const hours = (seconds: number): string => `${Math.round(seconds / 3600)}h`;

export function createChart(options: ChartOptions = {}): Chart {
  const axis = el('div', { class: 'wt-chart__axis', attrs: { 'aria-hidden': 'true' } });
  const plot = el('div', { class: 'wt-chart__plot' });
  // The whole chart is one stop for the keyboard; the arrow keys walk through the bars.
  const view = el('div', { class: 'wt-chart__view', attrs: { role: 'group', 'aria-label': pl.chart, tabindex: '0' } }, [
    plot,
  ]);

  const tipPeriod = el('span', { class: 'wt-chart__tip-period' });
  const tipTotal = el('span', { class: 'wt-chart__tip-total wt-total' });
  // Announced when the keyboard moves to a bar.
  const tip = el('div', { class: 'wt-chart__tip', attrs: { role: 'status', hidden: true } }, [tipPeriod, tipTotal]);

  const zoomButton = (name: 'plus' | 'minus', label: string, step: -1 | 1): HTMLButtonElement => {
    const button = el(
      'button',
      { class: 'wt-chart__zoom', attrs: { type: 'button', 'aria-label': label }, on: { click: () => zoom(step) } },
      [icon(name)],
    );
    button.title = label;
    return button;
  };
  const zoomIn = zoomButton('plus', pl.zoomIn, 1);
  const zoomOut = zoomButton('minus', pl.zoomOut, -1);
  const tools = el('div', { class: 'wt-chart__tools' }, [zoomIn, zoomOut]);

  const body = el('div', { class: 'wt-chart__body' }, [axis, view, tools, tip]);
  const element = el('div', { class: 'wt-chart', attrs: { hidden: true } }, [body]);

  let rows: readonly TicketRow[] = [];
  let period: Period | null = null;
  let timeZone = 'UTC';
  let levels: Granularity[] = ['day'];
  /** Index into `levels`; a larger one is a closer look. */
  let level = 0;
  let buckets: ChartBucket[] = [];
  let columns: HTMLElement[] = [];
  let active = -1;

  const samePeriod = (a: Period | null, b: Period): boolean =>
    a !== null && JSON.stringify([a.from, a.to]) === JSON.stringify([b.from, b.to]);

  function show(index: number): void {
    columns[active]?.classList.remove('wt-chart__col--active');
    active = index;
    const column = columns[index];
    const bucket = buckets[index];
    if (!column || !bucket) {
      tip.hidden = true;
      return;
    }
    column.classList.add('wt-chart__col--active');
    tipPeriod.textContent = formatBucket(bucket);
    tipTotal.textContent = `${pl.total} ${formatDuration(bucket.seconds)}`;
    applyToneMix(tipTotal, bucket.colour);
    tipTotal.toggleAttribute('data-zero', bucket.seconds === 0);
    tip.hidden = false;

    // Above the bar, but never outside the chart.
    const frame = body.getBoundingClientRect();
    const box = column.getBoundingClientRect();
    const half = tip.getBoundingClientRect().width / 2;
    const centre = box.left + box.width / 2 - frame.left;
    const left = frame.width > 2 * half ? Math.min(Math.max(centre, half), frame.width - half) : frame.width / 2;
    tip.style.setProperty('--wt-tip-left', `${left}px`);
  }

  /** The user wants to see only what this bar stands for. */
  function select(index: number): void {
    const bucket = buckets[index];
    if (bucket && period) options.onSelect?.(slicePeriod(period, bucket.from, bucket.to));
  }

  /** Writes a label under every bar that has room for one. */
  function label(): void {
    const granularity = levels[level] ?? 'day';
    const width = plot.getBoundingClientRect().width || view.clientWidth || DEFAULT_VIEW_WIDTH;
    const step = Math.max(1, Math.ceil(LABEL_WIDTH[granularity] / (width / Math.max(columns.length, 1))));
    columns.forEach((column, index) => {
      const text = column.querySelector<HTMLElement>('.wt-chart__label');
      if (text) text.hidden = index % step !== 0;
    });
  }

  function draw(): void {
    if (!period) return;
    const granularity = levels[level] ?? 'day';
    buckets = buildChart(rows, period, timeZone, granularity);
    const scale = chartScale(buckets);

    clear(axis);
    for (const tick of scale.ticks) {
      const mark = el('span', { class: 'wt-chart__tick', text: hours(tick) });
      mark.style.setProperty('--wt-pos', `${(tick / scale.maxSeconds) * 100}%`);
      axis.appendChild(mark);
    }

    clear(plot);
    for (const tick of scale.ticks.slice(1)) {
      const line = el('span', { class: 'wt-chart__line' });
      line.style.setProperty('--wt-pos-ratio', String(tick / scale.maxSeconds));
      plot.appendChild(line);
    }
    // The norm of a day, as on the progress bar; a month or a year has none.
    if (granularity === 'day' && scale.maxSeconds >= NORM_SECONDS) {
      const norm = el('span', { class: 'wt-chart__line wt-chart__line--norm' });
      norm.style.setProperty('--wt-pos-ratio', String(NORM_SECONDS / scale.maxSeconds));
      plot.appendChild(norm);
    }

    active = -1;
    tip.hidden = true;
    columns = buckets.map((bucket, index) => {
      const bar = el('span', { class: 'wt-chart__bar' });
      bar.style.setProperty('--wt-bar-height', `${(bucket.seconds / scale.maxSeconds) * 100}%`);
      if (bucket.colour) {
        bar.style.setProperty('--wt-bar-from', `var(--wt-progress-${bucket.colour.from})`);
        bar.style.setProperty('--wt-bar-to', `var(--wt-progress-${bucket.colour.to})`);
        bar.style.setProperty('--wt-bar-pct', `${Math.round(bucket.colour.ratio * 100)}%`);
      }
      const column = el('div', { class: 'wt-chart__col', attrs: { 'data-seconds': String(bucket.seconds) } }, [
        el('span', { class: 'wt-chart__slot' }, [bar]),
        el('span', { class: 'wt-chart__label', text: formatBucketLabel(bucket), attrs: { 'aria-hidden': 'true' } }),
      ]);
      column.addEventListener('pointerenter', () => show(index));
      column.addEventListener('click', () => select(index));
      return column;
    });
    plot.append(...columns);

    // Zoomed in, the bars keep a comfortable width and the chart scrolls sideways.
    const zoomed = level > levels.indexOf(autoGranularity(period));
    plot.style.setProperty('--wt-col-min', `${zoomed ? ZOOMED_WIDTH[granularity] : FIT_WIDTH}px`);
    element.dataset.granularity = granularity;
    zoomIn.disabled = level >= levels.length - 1;
    zoomOut.disabled = level <= 0;
    tools.hidden = levels.length < 2;
    label();
  }

  /** Changes what a bar stands for, keeping the same part of the period in view. */
  function zoom(step: -1 | 1, pointer?: number): void {
    const next = Math.min(Math.max(level + step, 0), levels.length - 1);
    if (next === level) return;
    // The place that stays put: under the pointer, or the middle of what is in view.
    const offset = pointer ?? view.clientWidth / 2;
    const ratio = (view.scrollLeft + offset) / (view.scrollWidth || 1);
    level = next;
    draw();
    view.scrollLeft = ratio * view.scrollWidth - offset;
  }

  view.addEventListener('pointerleave', () => show(-1));
  view.addEventListener('blur', () => show(-1));
  view.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      const next = active < 0 ? 0 : active + (event.key === 'ArrowRight' ? 1 : -1);
      const index = Math.min(Math.max(next, 0), columns.length - 1);
      columns[index]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      show(index);
    } else if ((event.key === 'Enter' || event.key === ' ') && active >= 0) {
      select(active);
    } else if (event.key === '+' || event.key === '=') {
      zoom(1);
    } else if (event.key === '-') {
      zoom(-1);
    } else {
      return;
    }
    event.preventDefault();
  });
  // Ctrl + wheel (and a pinch on a touchpad) zooms around the pointer.
  view.addEventListener(
    'wheel',
    (event) => {
      if (!event.ctrlKey || event.deltaY === 0) return;
      event.preventDefault();
      zoom(event.deltaY < 0 ? 1 : -1, event.clientX - view.getBoundingClientRect().left);
    },
    { passive: false },
  );
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => label()).observe(view);

  return {
    element,
    update(nextRows, nextPeriod, nextTimeZone) {
      // A refresh of the same period keeps the zoom; another period starts from its own.
      if (!samePeriod(period, nextPeriod)) {
        levels = zoomLevels(nextPeriod);
        level = levels.indexOf(autoGranularity(nextPeriod));
        view.scrollLeft = 0;
      }
      rows = nextRows;
      period = nextPeriod;
      timeZone = nextTimeZone;
      draw();
    },
  };
}
