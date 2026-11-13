// Calendar days and their mapping to instants in a given IANA time zone.
// Uses only the built-in Intl API; no date library (research R4).

/** A calendar day, independent of any clock time or time zone. */
export interface LocalDate {
  year: number;
  /** 1 to 12. */
  month: number;
  day: number;
}

export interface LocalDateTime {
  date: LocalDate;
  /** Minutes since 00:00, 0 to 1439. */
  minuteOfDay: number;
}

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

function toUtcMs(date: LocalDate): number {
  return Date.UTC(date.year, date.month - 1, date.day);
}

function fromUtcMs(ms: number): LocalDate {
  const d = new Date(ms);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return fromUtcMs(toUtcMs(date) + days * DAY_MS);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Moves by whole months; a day that does not exist in the target month is clamped to its last day. */
export function addMonths(date: LocalDate, months: number): LocalDate {
  const index = date.year * 12 + (date.month - 1) + months;
  const year = Math.floor(index / 12);
  const month = (((index % 12) + 12) % 12) + 1;
  return { year, month, day: Math.min(date.day, daysInMonth(year, month)) };
}

/** 1 = Monday … 7 = Sunday. */
export function weekday(date: LocalDate): number {
  const day = new Date(toUtcMs(date)).getUTCDay();
  return day === 0 ? 7 : day;
}

/** Negative when a is before b, zero when equal, positive when after. */
export function compare(a: LocalDate, b: LocalDate): number {
  return toUtcMs(a) - toUtcMs(b);
}

export function isSameDate(a: LocalDate, b: LocalDate): boolean {
  return compare(a, b) === 0;
}

/** Whole days from a to b (positive when b is later). */
export function diffDays(a: LocalDate, b: LocalDate): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / DAY_MS);
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** The wall-clock reading in the zone, expressed as if it were UTC. */
function wallClockAsUtc(ms: number, timeZone: string): number {
  const fields: Record<string, number> = {};
  for (const part of formatterFor(timeZone).formatToParts(new Date(ms))) {
    if (part.type !== 'literal') fields[part.type] = Number(part.value);
  }
  return Date.UTC(
    fields['year'] ?? 0,
    (fields['month'] ?? 1) - 1,
    fields['day'] ?? 1,
    fields['hour'] ?? 0,
    fields['minute'] ?? 0,
    fields['second'] ?? 0,
  );
}

function offsetMs(ms: number, timeZone: string): number {
  return wallClockAsUtc(ms, timeZone) - Math.floor(ms / 1000) * 1000;
}

/** Epoch milliseconds of a wall-clock date and minute in the given zone. */
export function toInstant(date: LocalDate, minuteOfDay: number, timeZone: string): number {
  const wall = toUtcMs(date) + minuteOfDay * MINUTE_MS;
  // Two passes: the offset at the first guess can differ from the offset at the real
  // instant when a daylight-saving change lies between them.
  const guess = wall - offsetMs(wall, timeZone);
  return wall - offsetMs(guess, timeZone);
}

/** The calendar day and minute that an instant falls on in the given zone. */
export function fromInstant(ms: number, timeZone: string): LocalDateTime {
  const wall = wallClockAsUtc(ms, timeZone);
  const date = fromUtcMs(wall);
  return { date, minuteOfDay: Math.floor((wall - toUtcMs(date)) / MINUTE_MS) };
}

export function today(timeZone: string, nowMs: number): LocalDate {
  return fromInstant(nowMs, timeZone).date;
}
