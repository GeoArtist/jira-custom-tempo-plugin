import { describe, expect, it } from 'vite-plus/test';
import { toInstant, type LocalDate } from '../../src/domain/local-date';
import { presetPeriod, type Period } from '../../src/domain/period';
import type { TicketRow } from '../../src/domain/worklog';
import { createChart } from '../../src/ui/chart';
import { FIXTURE_NOW } from '../fake-gateway';

const TZ = 'Europe/Warsaw';
const H = 3600;
const week = presetPeriod('thisWeek', TZ, FIXTURE_NOW);
const year = presetPeriod('thisYear', TZ, FIXTURE_NOW);
const day = (month: number, date: number): LocalDate => ({ year: 2026, month, day: date });

function rows(...entries: [LocalDate, number][]): TicketRow[] {
  return [
    {
      ticket: { id: '1', key: 'AM-1', title: '', url: '' },
      entries: entries.map(([date, seconds], index) => ({
        id: String(index),
        issueId: '1',
        startedMs: toInstant(date, 480, TZ),
        durationSeconds: seconds,
      })),
      totalSeconds: 0,
    },
  ];
}

const weekRows = rows([day(11, 2), 8 * H], [day(11, 3), 4 * H], [day(11, 6), 12 * H]);

function build(data = weekRows, period = week) {
  const selected: Period[] = [];
  const chart = createChart({ onSelect: (part) => selected.push(part) });
  document.body.appendChild(chart.element);
  chart.update(data, period, TZ);
  const root = chart.element;
  const columns = () => [...root.querySelectorAll<HTMLElement>('.wt-chart__col')];
  const bars = () => [...root.querySelectorAll<HTMLElement>('.wt-chart__bar')];
  const view = root.querySelector<HTMLElement>('.wt-chart__view') as HTMLElement;
  const tip = root.querySelector<HTMLElement>('.wt-chart__tip') as HTMLElement;
  const zoom = (label: string) => root.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`) as HTMLButtonElement;
  const press = (key: string) => view.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  return { chart, root, columns, bars, view, tip, zoom, press, selected };
}

describe('bar chart', () => {
  it('draws one bar per day, as tall as the time of that day against the axis', () => {
    const { bars, root } = build();
    expect(bars()).toHaveLength(7);
    // The axis ends at 12h, the tallest day.
    expect([...root.querySelectorAll('.wt-chart__tick')].map((tick) => tick.textContent)).toEqual([
      '0h',
      '4h',
      '8h',
      '12h',
    ]);
    const heights = bars().map((bar) => bar.style.getPropertyValue('--wt-bar-height'));
    expect(heights.slice(0, 5).map((height) => Math.round(Number.parseFloat(height)))).toEqual([67, 33, 0, 0, 100]);
    expect(root.querySelector('.wt-chart__line--norm')).not.toBeNull();
  });

  it('gives every bar the colour of the progress bar for its value', () => {
    const { bars } = build();
    const colour = (index: number) =>
      ['from', 'to', 'pct'].map((name) => bars()[index]?.style.getPropertyValue(`--wt-bar-${name}`));
    expect(colour(0)).toEqual(['var(--wt-progress-yellow)', 'var(--wt-progress-green)', '100%']);
    expect(colour(1)).toEqual(['var(--wt-progress-red)', 'var(--wt-progress-yellow)', '100%']);
    expect(colour(4)).toEqual(['var(--wt-progress-green)', 'var(--wt-progress-blue)', '50%']);
    expect(colour(2)).toEqual(['', '', '']);
  });

  it('names the days under the bars', () => {
    const { root } = build();
    expect([...root.querySelectorAll('.wt-chart__label')].map((label) => label.textContent)).toEqual([
      '02-11',
      '03-11',
      '04-11',
      '05-11',
      '06-11',
      '07-11',
      '08-11',
    ]);
  });

  it('shows the day and its total for the bar under the pointer', () => {
    const { columns, tip, view } = build();
    expect(tip.hidden).toBe(true);
    columns()[0]?.dispatchEvent(new Event('pointerenter'));
    expect(tip.hidden).toBe(false);
    expect(tip.textContent).toBe('Poniedziałek 02-11-2026Suma czasu: 8h 00m');
    expect(columns()[0]?.classList.contains('wt-chart__col--active')).toBe(true);
    const total = tip.querySelector<HTMLElement>('.wt-chart__tip-total') as HTMLElement;
    expect(total.style.getPropertyValue('--wt-total-to')).toBe('var(--wt-tone-green)');

    // A day without time can be asked about too; its total is muted.
    columns()[2]?.dispatchEvent(new Event('pointerenter'));
    expect(tip.textContent).toBe('Środa 04-11-2026Suma czasu: 0h 00m');
    expect(total.hasAttribute('data-zero')).toBe(true);
    expect(columns()[0]?.classList.contains('wt-chart__col--active')).toBe(false);

    view.dispatchEvent(new Event('pointerleave'));
    expect(tip.hidden).toBe(true);
  });

  it('walks through the bars with the arrow keys', () => {
    const { press, tip, view } = build();
    expect(view.getAttribute('aria-label')).toBe('Wykres czasu');
    expect(view.getAttribute('tabindex')).toBe('0');
    press('ArrowRight');
    expect(tip.textContent).toContain('Poniedziałek 02-11-2026');
    press('ArrowRight');
    expect(tip.textContent).toContain('Wtorek 03-11-2026');
    press('ArrowLeft');
    press('ArrowLeft');
    expect(tip.textContent).toContain('Poniedziałek 02-11-2026');
    expect(tip.getAttribute('role')).toBe('status');
  });

  it('selects the day of the bar that is clicked, or chosen with Enter', () => {
    const { columns, press, selected } = build();
    columns()[4]?.click();
    expect(selected).toEqual([
      { from: { date: day(11, 6), minuteOfDay: 0 }, to: { date: day(11, 6), minuteOfDay: 1439 }, preset: 'custom' },
    ]);
    // Enter does nothing until a bar is chosen.
    press('Enter');
    expect(selected).toHaveLength(1);
    press('ArrowRight');
    press('Enter');
    expect(selected[1]?.from.date).toEqual(day(11, 2));
  });

  it('selects the whole month of a month bar', () => {
    const { columns, selected } = build([], year);
    columns()[1]?.click();
    expect([selected[0]?.from.date, selected[0]?.to.date]).toEqual([day(2, 1), day(2, 28)]);
  });

  it('has no zoom for a period inside one month', () => {
    const { root } = build();
    expect(root.querySelector<HTMLElement>('.wt-chart__tools')?.hidden).toBe(true);
  });

  it('shows a year by months and zooms in to its days', () => {
    const { bars, root, zoom, tip, columns } = build(rows([day(11, 2), 84 * H], [day(3, 9), H]), year);
    expect(bars()).toHaveLength(12);
    expect(root.dataset.granularity).toBe('month');
    expect(root.querySelector('.wt-chart__label')?.textContent).toBe('01-2026');
    expect(root.querySelector('.wt-chart__line--norm')).toBeNull();
    expect(root.querySelector<HTMLElement>('.wt-chart__tools')?.hidden).toBe(false);
    expect(zoom('Oddal').disabled).toBe(true);
    expect(zoom('Przybliż').disabled).toBe(false);
    columns()[10]?.dispatchEvent(new Event('pointerenter'));
    expect(tip.textContent).toBe('11-2026Suma czasu: 84h 00m');

    zoom('Przybliż').click();
    expect(bars()).toHaveLength(365);
    expect(root.dataset.granularity).toBe('day');
    expect(zoom('Przybliż').disabled).toBe(true);
    expect(zoom('Oddal').disabled).toBe(false);
    // Zoomed in, the bars keep a comfortable width and the chart scrolls.
    expect(root.querySelector<HTMLElement>('.wt-chart__plot')?.style.getPropertyValue('--wt-col-min')).toBe('14px');

    zoom('Oddal').click();
    expect(bars()).toHaveLength(12);
  });

  it('zooms with the plus and minus keys, and with Ctrl and the wheel', () => {
    const { bars, press, view } = build([], year);
    press('+');
    expect(bars()).toHaveLength(365);
    press('-');
    expect(bars()).toHaveLength(12);
    // (The test page does not pass `ctrlKey` through the constructor.)
    const pinch = new WheelEvent('wheel', { deltaY: -100, cancelable: true });
    Object.defineProperty(pinch, 'ctrlKey', { value: true });
    view.dispatchEvent(pinch);
    expect(pinch.defaultPrevented).toBe(true);
    expect(bars()).toHaveLength(365);
    // The wheel alone belongs to the page.
    view.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, cancelable: true }));
    expect(bars()).toHaveLength(365);
  });

  it('keeps the zoom when the same period is refreshed and drops it for another period', () => {
    const { chart, bars, zoom } = build([], year);
    zoom('Przybliż').click();
    chart.update([], presetPeriod('thisYear', TZ, FIXTURE_NOW), TZ);
    expect(bars()).toHaveLength(365);
    chart.update([], presetPeriod('prevYear', TZ, FIXTURE_NOW), TZ);
    expect(bars()).toHaveLength(12);
  });
});
