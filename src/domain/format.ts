// Display formats (contracts/ui.md, "Formats").
import { pl, weekdays } from '../i18n/pl';
import type { ChartBucket } from './chart';
import { daysInMonth, fromInstant, weekday, type LocalDate } from './local-date';
import { isSingleDay, isWholeDays, type Period } from './period';
import type { TimeEntry } from './worklog';

const pad = (value: number): string => String(value).padStart(2, '0');

/** `6h 55m`: hours unpadded, minutes two digits; the logged value, never rounded (FR-010). */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  return `${Math.floor(minutes / 60)}h ${pad(minutes % 60)}m`;
}

/** `07:00`, 24-hour. */
export function formatClock(minuteOfDay: number): string {
  return `${pad(Math.floor(minuteOfDay / 60))}:${pad(minuteOfDay % 60)}`;
}

/** `06-11-2026`. */
export function formatDate(date: LocalDate): string {
  return `${pad(date.day)}-${pad(date.month)}-${date.year}`;
}

/** `06-11`. */
export function formatDayMonth(date: LocalDate): string {
  return `${pad(date.day)}-${pad(date.month)}`;
}

/** `2026-11-06`, for JQL and date inputs. */
export function formatIsoDate(date: LocalDate): string {
  return `${date.year}-${pad(date.month)}-${pad(date.day)}`;
}

/** The title without the total (FR-012, FR-013). */
export function formatTitle(period: Period): string {
  const { from, to } = period;
  const whole = isWholeDays(period);
  if (isSingleDay(period)) {
    const day = `${weekdays[weekday(from.date) - 1]} ${formatDate(from.date)}`;
    return whole ? day : `${day} ${formatClock(from.minuteOfDay)}–${formatClock(to.minuteOfDay)}`;
  }
  if (whole) return `${formatDate(from.date)} – ${formatDate(to.date)}`;
  return `${formatDate(from.date)} ${formatClock(from.minuteOfDay)} – ${formatDate(to.date)} ${formatClock(to.minuteOfDay)}`;
}

/**
 * One line of the time-entries cell: `07:00–10:30 · 3h 30m`, with a leading `06-11`
 * date when the period covers more than one day (FR-006, FR-011).
 */
export function formatEntry(entry: TimeEntry, period: Period, timeZone: string): string {
  const start = fromInstant(entry.startedMs, timeZone);
  const end = fromInstant(entry.startedMs + entry.durationSeconds * 1000, timeZone);
  const range = `${formatClock(start.minuteOfDay)}–${formatClock(end.minuteOfDay)} · ${formatDuration(entry.durationSeconds)}`;
  return isSingleDay(period) ? range : `${formatDayMonth(start.date)} ${range}`;
}

/**
 * What the launcher's total belongs to (FR-040): today, one whole other day by its date,
 * or anything else as a range.
 */
export function formatLauncherLabel(period: Period): string {
  if (period.preset === 'today') return pl.launcherLabel;
  if (isSingleDay(period) && isWholeDays(period)) return `${formatDate(period.from.date)}:`;
  return pl.launcherRange;
}

/** `2026-11-06T07:00`, the value format of a date-time input. */
export function formatInputValue(date: LocalDate, minuteOfDay: number): string {
  return `${formatIsoDate(date)}T${formatClock(minuteOfDay)}`;
}

/** Parses the value of a date-time input; null when it is not a complete date and time. */
export function parseInputValue(value: string): { date: LocalDate; minuteOfDay: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  const date: LocalDate = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  const minuteOfDay = Number(match[4]) * 60 + Number(match[5]);
  const real = new Date(Date.UTC(date.year, date.month - 1, date.day));
  // A day that does not exist (30 February) rolls over into another month.
  const exists = real.getUTCMonth() + 1 === date.month && real.getUTCDate() === date.day;
  const valid = exists && minuteOfDay >= 0 && minuteOfDay <= 1439;
  return valid ? { date, minuteOfDay } : null;
}

/** `11-2026`. */
function formatMonth(date: LocalDate): string {
  return `${pad(date.month)}-${date.year}`;
}

/** The short name of a bar under the chart: `06-11`, `11-2026`, `2026`. */
export function formatBucketLabel(bucket: ChartBucket): string {
  if (bucket.granularity === 'day') return formatDayMonth(bucket.from);
  return bucket.granularity === 'month' ? formatMonth(bucket.from) : String(bucket.from.year);
}

/**
 * What a bar of the chart stands for, in its tip: a day as in the title, a whole month or
 * year by its number, and a month or year the period cuts short by its first and last day.
 */
export function formatBucket(bucket: ChartBucket): string {
  const { from, to, granularity } = bucket;
  if (granularity === 'day') return `${weekdays[weekday(from) - 1]} ${formatDate(from)}`;
  const whole =
    granularity === 'month'
      ? from.day === 1 && to.day === daysInMonth(to.year, to.month)
      : from.month === 1 && from.day === 1 && to.month === 12 && to.day === 31;
  if (!whole) return `${formatDate(from)} – ${formatDate(to)}`;
  return granularity === 'month' ? formatMonth(from) : String(from.year);
}
