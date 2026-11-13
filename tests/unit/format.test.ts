import { describe, expect, it } from 'vite-plus/test';
import {
  formatClock,
  formatDate,
  formatDayMonth,
  formatDuration,
  formatEntry,
  formatInputValue,
  formatIsoDate,
  formatLauncherLabel,
  formatTitle,
  parseInputValue,
} from '../../src/domain/format';
import { customPeriod, presetPeriod, type Period } from '../../src/domain/period';
import { FIXTURE_NOW } from '../fake-gateway';

const TZ = 'Europe/Warsaw';
const friday = { year: 2026, month: 11, day: 6 };
const today = presetPeriod('today', TZ, FIXTURE_NOW);
const week = presetPeriod('thisWeek', TZ, FIXTURE_NOW);

describe('basic formats', () => {
  it('formats durations with unpadded hours and two-digit minutes', () => {
    expect(formatDuration(6 * 3600 + 55 * 60)).toBe('6h 55m');
    expect(formatDuration(45 * 60)).toBe('0h 45m');
    expect(formatDuration(0)).toBe('0h 00m');
    expect(formatDuration(38.5 * 3600)).toBe('38h 30m');
  });

  it('shows the logged value without rounding up', () => {
    expect(formatDuration(7 * 60)).toBe('0h 07m');
    expect(formatDuration(59)).toBe('0h 00m');
  });

  it('formats clock times and dates', () => {
    expect(formatClock(420)).toBe('07:00');
    expect(formatClock(1439)).toBe('23:59');
    expect(formatDate(friday)).toBe('06-11-2026');
    expect(formatDate({ year: 2026, month: 7, day: 2 })).toBe('02-07-2026');
    expect(formatDayMonth(friday)).toBe('06-11');
    expect(formatIsoDate(friday)).toBe('2026-11-06');
  });
});

describe('title', () => {
  it('shows the Polish weekday and date for a whole single day', () => {
    expect(formatTitle(today)).toBe('Piątek 06-11-2026');
  });

  it('adds the times for part of a single day', () => {
    const window = customPeriod({ date: friday, minuteOfDay: 480 }, { date: friday, minuteOfDay: 720 }) as Period;
    expect(formatTitle(window)).toBe('Piątek 06-11-2026 08:00–12:00');
  });

  it('shows the date range for whole days', () => {
    expect(formatTitle(week)).toBe('02-11-2026 – 08-11-2026');
  });

  it('adds the times for a multi-day range that does not cover whole days', () => {
    const range = customPeriod(
      { date: { year: 2026, month: 11, day: 2 }, minuteOfDay: 480 },
      { date: { year: 2026, month: 11, day: 4 }, minuteOfDay: 960 },
    ) as Period;
    expect(formatTitle(range)).toBe('02-11-2026 08:00 – 04-11-2026 16:00');
  });
});

describe('entry line', () => {
  const entry = { id: '1', issueId: '1', startedMs: Date.parse('2026-11-06T07:00:00+01:00'), durationSeconds: 12600 };

  it('shows start, end, and duration for a single-day period', () => {
    expect(formatEntry(entry, today, TZ)).toBe('07:00–10:30 · 3h 30m');
  });

  it('adds the date for a longer period', () => {
    expect(formatEntry(entry, week, TZ)).toBe('06-11 07:00–10:30 · 3h 30m');
  });

  it('shows only the end time when the entry ends on the next day', () => {
    const late = { ...entry, startedMs: Date.parse('2026-11-06T22:00:00+01:00') };
    expect(formatEntry(late, today, TZ)).toBe('22:00–01:30 · 3h 30m');
  });
});

describe('launcher label', () => {
  it('names today, another whole day by its date, and anything else as a range', () => {
    expect(formatLauncherLabel(today)).toBe('Dziś:');
    const may = { year: 2026, month: 5, day: 12 };
    expect(
      formatLauncherLabel({
        from: { date: may, minuteOfDay: 0 },
        to: { date: may, minuteOfDay: 1439 },
        preset: 'custom',
      }),
    ).toBe('12-05-2026:');
    expect(formatLauncherLabel(week)).toBe('Zakres:');
    // A part of a day is a range too: its total is not the total of that day.
    expect(
      formatLauncherLabel({
        from: { date: may, minuteOfDay: 480 },
        to: { date: may, minuteOfDay: 720 },
        preset: 'custom',
      }),
    ).toBe('Zakres:');
  });
});

describe('date-time input value', () => {
  it('round-trips', () => {
    expect(formatInputValue(friday, 425)).toBe('2026-11-06T07:05');
    expect(parseInputValue('2026-11-06T07:05')).toEqual({ date: friday, minuteOfDay: 425 });
  });

  it('rejects incomplete or impossible values', () => {
    expect(parseInputValue('')).toBeNull();
    expect(parseInputValue('2026-11-06')).toBeNull();
    expect(parseInputValue('2026-02-30T10:00')).toBeNull();
  });
});
