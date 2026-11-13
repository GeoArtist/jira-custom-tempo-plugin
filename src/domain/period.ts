// The displayed range of time (data-model.md, Period).
import {
  addDays,
  addMonths,
  compare,
  daysInMonth,
  diffDays,
  isSameDate,
  toInstant,
  today,
  weekday,
  type LocalDate,
  type LocalDateTime,
} from './local-date';

export type PresetName =
  | 'today'
  | 'yesterday'
  | 'dayBeforeYesterday'
  | 'thisWeek'
  | 'prevWeek'
  | 'thisMonth'
  | 'prevMonth'
  | 'thisYear'
  | 'prevYear';
export type Preset = PresetName | 'custom';

/** The presets the period box offers as buttons (FR-021). */
export type PanelPreset = 'yesterday' | 'thisWeek' | 'thisMonth' | 'thisYear';
export const PANEL_PRESETS: readonly PanelPreset[] = ['yesterday', 'thisWeek', 'thisMonth', 'thisYear'];
/** Every range that has a name; the arrows and the date fields can reach all of them. */
export const PRESET_NAMES: readonly PresetName[] = [
  'today',
  'yesterday',
  'dayBeforeYesterday',
  'thisWeek',
  'prevWeek',
  'thisMonth',
  'prevMonth',
  'thisYear',
  'prevYear',
];

/** A point in the period: a calendar day and a minute of that day (0 to 1439). */
export type PeriodPoint = LocalDateTime;

export interface Period {
  from: PeriodPoint;
  /** Inclusive: the whole minute counts. */
  to: PeriodPoint;
  preset: Preset;
}

const START_OF_DAY = 0;
const END_OF_DAY = 1439;
const MINUTE_MS = 60_000;

function wholeDays(first: LocalDate, last: LocalDate, preset: Preset): Period {
  return {
    from: { date: first, minuteOfDay: START_OF_DAY },
    to: { date: last, minuteOfDay: END_OF_DAY },
    preset,
  };
}

/** A preset always runs from 00:00 of its first day to 23:59 of its last day (FR-024). */
export function presetPeriod(preset: PresetName, timeZone: string, nowMs: number): Period {
  const now = today(timeZone, nowMs);
  switch (preset) {
    case 'today':
      return wholeDays(now, now, preset);
    case 'yesterday':
    case 'dayBeforeYesterday': {
      const day = addDays(now, preset === 'yesterday' ? -1 : -2);
      return wholeDays(day, day, preset);
    }
    case 'thisWeek':
    case 'prevWeek': {
      // Weeks run Monday to Sunday (FR-026).
      const monday = addDays(now, 1 - weekday(now) - (preset === 'prevWeek' ? 7 : 0));
      return wholeDays(monday, addDays(monday, 6), preset);
    }
    case 'thisMonth':
    case 'prevMonth': {
      const first = addMonths({ ...now, day: 1 }, preset === 'prevMonth' ? -1 : 0);
      return wholeDays(first, { ...first, day: daysInMonth(first.year, first.month) }, preset);
    }
    case 'thisYear':
    case 'prevYear': {
      const year = now.year - (preset === 'prevYear' ? 1 : 0);
      return wholeDays({ year, month: 1, day: 1 }, { year, month: 12, day: 31 }, preset);
    }
  }
}

/** One whole calendar day, 00:00 to 23:59: what the day field selects. */
export function dayPeriod(date: LocalDate): Period {
  return wholeDays(date, date, 'custom');
}

function comparePoints(a: PeriodPoint, b: PeriodPoint): number {
  return compare(a.date, b.date) || a.minuteOfDay - b.minuteOfDay;
}

/** A custom range, or null when "Od" is later than "Do" (FR-027). */
export function customPeriod(from: PeriodPoint, to: PeriodPoint): Period | null {
  return comparePoints(from, to) > 0 ? null : { from, to, preset: 'custom' };
}

/** True when every minute of `inner` lies in `outer`. */
export function contains(outer: Period, inner: Period): boolean {
  return comparePoints(outer.from, inner.from) <= 0 && comparePoints(inner.to, outer.to) <= 0;
}

/**
 * The part of `period` on the days `first` to `last`: whole days, except where the period
 * itself starts or ends in the middle of one. This is what a bar of the chart selects (FR-080).
 */
export function slicePeriod(period: Period, first: LocalDate, last: LocalDate): Period {
  return {
    from: isSameDate(first, period.from.date) ? period.from : { date: first, minuteOfDay: START_OF_DAY },
    to: isSameDate(last, period.to.date) ? period.to : { date: last, minuteOfDay: END_OF_DAY },
    preset: 'custom',
  };
}

/** First instant inside the period. */
export function startInstant(period: Period, timeZone: string): number {
  return toInstant(period.from.date, period.from.minuteOfDay, timeZone);
}

/** First instant after the period (half-open interval). */
export function endInstant(period: Period, timeZone: string): number {
  return toInstant(period.to.date, period.to.minuteOfDay, timeZone) + MINUTE_MS;
}

/** "Od" and "Do" on the same calendar day, whole or partial (FR-051). */
export function isSingleDay(period: Period): boolean {
  return isSameDate(period.from.date, period.to.date);
}

export function isWholeDays(period: Period): boolean {
  return period.from.minuteOfDay === START_OF_DAY && period.to.minuteOfDay === END_OF_DAY;
}

function isFullWeek(period: Period): boolean {
  return isWholeDays(period) && weekday(period.from.date) === 1 && diffDays(period.from.date, period.to.date) === 6;
}

function isFullMonth(period: Period): boolean {
  const { from, to } = period;
  return (
    isWholeDays(period) &&
    from.date.day === 1 &&
    from.date.year === to.date.year &&
    from.date.month === to.date.month &&
    to.date.day === daysInMonth(to.date.year, to.date.month)
  );
}

function isFullYear(period: Period): boolean {
  const { from, to } = period;
  return (
    isWholeDays(period) &&
    from.date.year === to.date.year &&
    from.date.month === 1 &&
    from.date.day === 1 &&
    to.date.month === 12 &&
    to.date.day === 31
  );
}

/** The preset whose range equals the period right now, otherwise `custom`. */
export function matchPreset(period: Period, timeZone: string, nowMs: number): Preset {
  for (const name of PRESET_NAMES) {
    const candidate = presetPeriod(name, timeZone, nowMs);
    if (comparePoints(candidate.from, period.from) === 0 && comparePoints(candidate.to, period.to) === 0) {
      return name;
    }
  }
  return 'custom';
}

/**
 * Moves to the previous (-1) or next (+1) period of the same kind (FR-025): a full week
 * moves by 7 days, a full calendar month by one month, a full calendar year by one year,
 * anything else by the number of calendar days it spans, keeping its clock times.
 */
export function shift(period: Period, direction: -1 | 1, timeZone: string, nowMs: number): Period {
  let from: LocalDate;
  let to: LocalDate;
  if (isFullYear(period)) {
    from = { ...period.from.date, year: period.from.date.year + direction };
    to = { ...period.to.date, year: period.to.date.year + direction };
  } else if (isFullMonth(period)) {
    from = addMonths(period.from.date, direction);
    to = { ...from, day: daysInMonth(from.year, from.month) };
  } else {
    const span = isFullWeek(period) ? 7 : diffDays(period.from.date, period.to.date) + 1;
    from = addDays(period.from.date, span * direction);
    to = addDays(period.to.date, span * direction);
  }
  const moved: Period = {
    from: { date: from, minuteOfDay: period.from.minuteOfDay },
    to: { date: to, minuteOfDay: period.to.minuteOfDay },
    preset: 'custom',
  };
  return { ...moved, preset: matchPreset(moved, timeZone, nowMs) };
}
