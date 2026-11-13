import { describe, expect, it } from 'vite-plus/test';
import { autoGranularity, buildChart, chartScale, zoomLevels, type ChartBucket } from '../../src/domain/chart';
import { formatBucket, formatBucketLabel } from '../../src/domain/format';
import { toInstant, type LocalDate } from '../../src/domain/local-date';
import { contains, customPeriod, dayPeriod, presetPeriod, slicePeriod, type Period } from '../../src/domain/period';
import { filterRows, type TicketRow } from '../../src/domain/worklog';
import { FIXTURE_NOW } from '../fake-gateway';

const TZ = 'Europe/Warsaw';
const H = 3600;
const day = (year: number, month: number, date: number): LocalDate => ({ year, month, day: date });
const range = (from: LocalDate, to: LocalDate): Period =>
  customPeriod({ date: from, minuteOfDay: 0 }, { date: to, minuteOfDay: 1439 }) as Period;

/** One ticket with an entry per [day, minute of the day, seconds]. */
function rows(...entries: [LocalDate, number, number][]): TicketRow[] {
  return [
    {
      ticket: { id: '1', key: 'AM-1', title: '', url: '' },
      entries: entries.map(([date, minute, seconds], index) => ({
        id: String(index),
        issueId: '1',
        startedMs: toInstant(date, minute, TZ),
        durationSeconds: seconds,
      })),
      totalSeconds: entries.reduce((sum, entry) => sum + entry[2], 0),
    },
  ];
}

const week = presetPeriod('thisWeek', TZ, FIXTURE_NOW);
const year = presetPeriod('thisYear', TZ, FIXTURE_NOW);

describe('what a bar stands for', () => {
  it('is a day up to 31 days, a month up to 24 months, and a year beyond', () => {
    expect(autoGranularity(week)).toBe('day');
    expect(autoGranularity(range(day(2026, 10, 1), day(2026, 10, 31)))).toBe('day');
    expect(autoGranularity(range(day(2026, 10, 1), day(2026, 11, 1)))).toBe('month');
    expect(autoGranularity(year)).toBe('month');
    expect(autoGranularity(range(day(2025, 1, 1), day(2026, 12, 31)))).toBe('month');
    expect(autoGranularity(range(day(2024, 12, 31), day(2026, 12, 31)))).toBe('year');
  });

  it('can be zoomed through the levels the period touches more than one of', () => {
    expect(zoomLevels(week)).toEqual(['day']);
    expect(zoomLevels(range(day(2026, 10, 28), day(2026, 11, 3)))).toEqual(['month', 'day']);
    expect(zoomLevels(year)).toEqual(['month', 'day']);
    expect(zoomLevels(range(day(2025, 12, 30), day(2026, 1, 2)))).toEqual(['year', 'month', 'day']);
  });
});

describe('the buckets of the chart', () => {
  it('gives every day of the period a bar, also the empty ones, with the entries of that day', () => {
    const buckets = buildChart(
      rows([day(2026, 11, 2), 480, 8 * H], [day(2026, 11, 2), 1000, H], [day(2026, 11, 5), 540, 1800]),
      week,
      TZ,
      'day',
    );
    expect(buckets).toHaveLength(7);
    expect(buckets.map((bucket) => bucket.seconds)).toEqual([9 * H, 0, 0, 1800, 0, 0, 0]);
    expect(buckets[0]).toMatchObject({ from: day(2026, 11, 2), to: day(2026, 11, 2), granularity: 'day' });
    expect(buckets[6]?.from).toEqual(day(2026, 11, 8));
  });

  it('counts an entry on the day it starts in the time zone of the user', () => {
    // 23:30 in Warsaw is still the 2nd, although it is the 2nd 22:30 in UTC and runs past midnight.
    const buckets = buildChart(rows([day(2026, 11, 2), 1410, 2 * H]), week, TZ, 'day');
    expect(buckets.map((bucket) => bucket.seconds)).toEqual([2 * H, 0, 0, 0, 0, 0, 0]);
  });

  it('colours a day like the progress bar', () => {
    const buckets = buildChart(
      rows([day(2026, 11, 2), 480, 4 * H], [day(2026, 11, 3), 480, 8 * H], [day(2026, 11, 4), 480, 12 * H]),
      week,
      TZ,
      'day',
    );
    expect(buckets.slice(0, 4).map((bucket) => bucket.colour)).toEqual([
      { from: 'blue', to: 'green', ratio: 0.5 },
      { from: 'blue', to: 'green', ratio: 1 },
      { from: 'yellow', to: 'orange', ratio: 0.5 },
      null,
    ]);
  });

  it('sums months and colours them by the average of a working day', () => {
    // November 2026 has 21 working days: 84 hours are 4 hours a working day.
    const buckets = buildChart(rows([day(2026, 11, 2), 480, 84 * H], [day(2026, 3, 9), 480, H]), year, TZ, 'month');
    expect(buckets).toHaveLength(12);
    expect(buckets[10]).toMatchObject({ from: day(2026, 11, 1), to: day(2026, 11, 30), seconds: 84 * H });
    expect(buckets[10]?.colour).toEqual({ from: 'blue', to: 'green', ratio: 0.5 });
    expect(buckets[2]?.seconds).toBe(H);
    expect(buckets[0]?.colour).toBeNull();
  });

  it('cuts the first and the last month or year to the period', () => {
    const period = range(day(2025, 12, 30), day(2026, 1, 2));
    const months = buildChart([], period, TZ, 'month');
    expect(months.map((bucket) => [bucket.from, bucket.to])).toEqual([
      [day(2025, 12, 30), day(2025, 12, 31)],
      [day(2026, 1, 1), day(2026, 1, 2)],
    ]);
    expect(buildChart([], period, TZ, 'year').map((bucket) => bucket.from.year)).toEqual([2025, 2026]);
  });
});

describe('the part of the period a bar selects', () => {
  it('is whole days, except where the period itself starts or ends inside a day', () => {
    expect(slicePeriod(year, day(2026, 11, 1), day(2026, 11, 30))).toEqual({
      from: { date: day(2026, 11, 1), minuteOfDay: 0 },
      to: { date: day(2026, 11, 30), minuteOfDay: 1439 },
      preset: 'custom',
    });
    const cut = customPeriod(
      { date: day(2026, 11, 2), minuteOfDay: 600 },
      { date: day(2026, 11, 4), minuteOfDay: 900 },
    ) as Period;
    expect(slicePeriod(cut, day(2026, 11, 2), day(2026, 11, 2)).from.minuteOfDay).toBe(600);
    expect(slicePeriod(cut, day(2026, 11, 2), day(2026, 11, 2)).to.minuteOfDay).toBe(1439);
    expect(slicePeriod(cut, day(2026, 11, 4), day(2026, 11, 4)).to.minuteOfDay).toBe(900);
    expect(contains(cut, slicePeriod(cut, day(2026, 11, 4), day(2026, 11, 4)))).toBe(true);
  });

  it('lies inside the period, unlike a wider or a shifted one', () => {
    expect(contains(year, week)).toBe(true);
    expect(contains(week, week)).toBe(true);
    expect(contains(week, year)).toBe(false);
    expect(contains(week, dayPeriod(day(2026, 11, 9)))).toBe(false);
  });

  it('gets its rows from the loaded ones: only its entries, tickets without any left out', () => {
    const loaded: TicketRow[] = [
      ...rows([day(2026, 11, 5), 600, H], [day(2026, 11, 6), 480, 2 * H], [day(2026, 11, 6), 1410, 3 * H]),
      { ...rows([day(2026, 11, 6), 420, 1800])[0], ticket: { id: '2', key: 'AM-2', title: '', url: '' } } as TicketRow,
      { ...rows([day(2026, 11, 3), 480, H])[0], ticket: { id: '3', key: 'AM-3', title: '', url: '' } } as TicketRow,
    ];
    const friday = filterRows(loaded, dayPeriod(day(2026, 11, 6)), TZ);
    // The ticket whose entry on that day starts first comes first.
    expect(friday.map((row) => [row.ticket.key, row.entries.length, row.totalSeconds])).toEqual([
      ['AM-2', 1, 1800],
      ['AM-1', 2, 5 * H],
    ]);
    expect(filterRows(loaded, dayPeriod(day(2026, 11, 4)), TZ)).toEqual([]);
    // The loaded rows are not changed.
    expect(loaded[0]?.entries).toHaveLength(3);
  });
});

describe('the vertical axis', () => {
  const scaleOf = (...hours: number[]) =>
    chartScale(hours.map((value) => ({ seconds: value * H }) as ChartBucket)).ticks.map((tick) => tick / H);

  it('ends on round hours above the tallest bar, with at most four steps', () => {
    expect(scaleOf(0, 0)).toEqual([0, 4, 8]);
    expect(scaleOf(0.5)).toEqual([0, 1]);
    expect(scaleOf(6.5, 3)).toEqual([0, 2, 4, 6, 8]);
    expect(scaleOf(10.2)).toEqual([0, 4, 8, 12]);
    expect(scaleOf(160)).toEqual([0, 40, 80, 120, 160]);
    expect(scaleOf(1700)).toEqual([0, 800, 1600, 2400]);
  });
});

describe('the name of a bar', () => {
  const bucket = (granularity: ChartBucket['granularity'], from: LocalDate, to: LocalDate): ChartBucket => ({
    granularity,
    from,
    to,
    seconds: 0,
    colour: null,
  });

  it('is short under the chart', () => {
    expect(formatBucketLabel(bucket('day', day(2026, 11, 6), day(2026, 11, 6)))).toBe('06-11');
    expect(formatBucketLabel(bucket('month', day(2026, 3, 1), day(2026, 3, 31)))).toBe('03-2026');
    expect(formatBucketLabel(bucket('year', day(2026, 1, 1), day(2026, 12, 31)))).toBe('2026');
  });

  it('is complete in the tip, and a range for a month or year the period cuts short', () => {
    expect(formatBucket(bucket('day', day(2026, 11, 6), day(2026, 11, 6)))).toBe('Piątek 06-11-2026');
    expect(formatBucket(bucket('month', day(2026, 2, 1), day(2026, 2, 28)))).toBe('02-2026');
    expect(formatBucket(bucket('month', day(2026, 2, 10), day(2026, 2, 28)))).toBe('10-02-2026 – 28-02-2026');
    expect(formatBucket(bucket('year', day(2026, 1, 1), day(2026, 12, 31)))).toBe('2026');
    expect(formatBucket(bucket('year', day(2026, 1, 1), day(2026, 6, 30)))).toBe('01-01-2026 – 30-06-2026');
  });
});
