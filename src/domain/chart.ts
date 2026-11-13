// The bar chart of a period longer than one day (FR-076 to FR-079): the logged time per
// day, per month, or per year.
import { addDays, compare, diffDays, fromInstant, weekday, type LocalDate } from './local-date';
import type { Period } from './period';
import { colourFor, type ToneMix } from './summary';
import type { TicketRow } from './worklog';

/** What one bar stands for. Listed from the coarsest to the finest: zooming in goes right. */
export type Granularity = 'year' | 'month' | 'day';
const LEVELS: readonly Granularity[] = ['year', 'month', 'day'];

/** Up to this many days every day has its own bar. */
export const MAX_DAY_BARS = 31;
/** Up to this many calendar months every month has its own bar; beyond that, every year. */
export const MAX_MONTH_BARS = 24;

export interface ChartBucket {
  granularity: Granularity;
  /** First and last day of the bucket, cut to the period. */
  from: LocalDate;
  to: LocalDate;
  seconds: number;
  /**
   * The colour of the progress bar for this value. A day is taken as it is; a month or a
   * year by its average per working day (Monday to Friday), so the colours mean the same.
   */
  colour: ToneMix | null;
}

export interface ChartScale {
  /** The top of the vertical axis, in seconds: a round number of hours. */
  maxSeconds: number;
  /** The labelled values, from 0 to the top, in seconds. */
  ticks: number[];
}

const daysOf = (period: Period): number => diffDays(period.from.date, period.to.date) + 1;
const monthsOf = ({ from, to }: Period): number =>
  (to.date.year - from.date.year) * 12 + to.date.month - from.date.month + 1;
const yearsOf = ({ from, to }: Period): number => to.date.year - from.date.year + 1;

/** What a bar stands for when the user has not zoomed (FR-077). */
export function autoGranularity(period: Period): Granularity {
  if (daysOf(period) <= MAX_DAY_BARS) return 'day';
  if (monthsOf(period) <= MAX_MONTH_BARS) return 'month';
  return 'year';
}

/**
 * The levels the user can zoom through, from the coarsest to the finest (FR-078). Days are
 * always there; months and years only when the period touches more than one of them.
 */
export function zoomLevels(period: Period): Granularity[] {
  return LEVELS.filter((level) => level === 'day' || (level === 'month' ? monthsOf(period) > 1 : yearsOf(period) > 1));
}

const key = (date: LocalDate): number => date.year * 10_000 + date.month * 100 + date.day;

function sameBucket(a: LocalDate, b: LocalDate, granularity: Granularity): boolean {
  if (granularity === 'day') return compare(a, b) === 0;
  if (granularity === 'month') return a.year === b.year && a.month === b.month;
  return a.year === b.year;
}

/**
 * One bucket per day, month, or year of the period, in order, also where nothing was
 * logged. An entry belongs to the day it starts on, in the user's time zone, like in the
 * table.
 */
export function buildChart(
  rows: readonly TicketRow[],
  period: Period,
  timeZone: string,
  granularity: Granularity,
): ChartBucket[] {
  const perDay = new Map<number, number>();
  for (const row of rows) {
    for (const entry of row.entries) {
      const day = key(fromInstant(entry.startedMs, timeZone).date);
      perDay.set(day, (perDay.get(day) ?? 0) + entry.durationSeconds);
    }
  }

  const buckets: (ChartBucket & { workdays: number; days: number })[] = [];
  const last = period.to.date;
  for (let date = period.from.date; compare(date, last) <= 0; date = addDays(date, 1)) {
    let bucket = buckets[buckets.length - 1];
    if (!bucket || !sameBucket(bucket.from, date, granularity)) {
      bucket = { granularity, from: date, to: date, seconds: 0, colour: null, workdays: 0, days: 0 };
      buckets.push(bucket);
    }
    bucket.to = date;
    bucket.seconds += perDay.get(key(date)) ?? 0;
    bucket.days += 1;
    if (weekday(date) <= 5) bucket.workdays += 1;
  }

  return buckets.map(({ workdays, days, ...bucket }) => ({
    ...bucket,
    colour: colourFor(granularity === 'day' ? bucket.seconds : bucket.seconds / (workdays || days)),
  }));
}

const HOUR = 3600;
/** Distances between two labelled values, in hours. */
const STEPS = [1, 2, 4, 8, 20, 40, 80, 200, 400, 800, 2000, 4000, 8000];
const MAX_STEPS = 4;

/** A vertical axis with round hours that holds the tallest bar; 8h when there is nothing. */
export function chartScale(buckets: readonly ChartBucket[]): ChartScale {
  const top = Math.max(0, ...buckets.map((bucket) => bucket.seconds)) / HOUR;
  if (top === 0) return { maxSeconds: 8 * HOUR, ticks: [0, 4 * HOUR, 8 * HOUR] };
  const step = STEPS.find((size) => top / size <= MAX_STEPS) ?? Math.ceil(top / MAX_STEPS);
  const count = Math.max(1, Math.ceil(top / step));
  return {
    maxSeconds: count * step * HOUR,
    ticks: Array.from({ length: count + 1 }, (_, index) => index * step * HOUR),
  };
}
