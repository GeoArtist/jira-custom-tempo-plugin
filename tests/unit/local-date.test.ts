import { describe, expect, it } from 'vite-plus/test';
import {
  addDays,
  addMonths,
  compare,
  diffDays,
  fromInstant,
  toInstant,
  today,
  weekday,
} from '../../src/domain/local-date';

const WARSAW = 'Europe/Warsaw';

describe('calendar arithmetic', () => {
  it('adds days across a year boundary', () => {
    expect(addDays({ year: 2026, month: 12, day: 31 }, 1)).toEqual({ year: 2027, month: 1, day: 1 });
    expect(addDays({ year: 2027, month: 1, day: 1 }, -1)).toEqual({ year: 2026, month: 12, day: 31 });
  });

  it('handles a leap day', () => {
    expect(addDays({ year: 2028, month: 2, day: 28 }, 1)).toEqual({ year: 2028, month: 2, day: 29 });
    expect(addDays({ year: 2027, month: 2, day: 28 }, 1)).toEqual({ year: 2027, month: 3, day: 1 });
  });

  it('clamps the day when the target month is shorter', () => {
    expect(addMonths({ year: 2026, month: 1, day: 31 }, 1)).toEqual({ year: 2026, month: 2, day: 28 });
    expect(addMonths({ year: 2026, month: 1, day: 15 }, -1)).toEqual({ year: 2025, month: 12, day: 15 });
  });

  it('numbers weekdays from Monday', () => {
    expect(weekday({ year: 2026, month: 11, day: 2 })).toBe(1); // Monday
    expect(weekday({ year: 2026, month: 11, day: 6 })).toBe(5); // Friday
    expect(weekday({ year: 2026, month: 11, day: 8 })).toBe(7); // Sunday
  });

  it('compares and measures distance', () => {
    const a = { year: 2026, month: 11, day: 2 };
    const b = { year: 2026, month: 11, day: 8 };
    expect(compare(a, b)).toBeLessThan(0);
    expect(diffDays(a, b)).toBe(6);
  });
});

describe('time zone mapping', () => {
  it('maps midnight in Warsaw in winter and summer', () => {
    expect(toInstant({ year: 2026, month: 11, day: 6 }, 0, WARSAW)).toBe(Date.parse('2026-11-05T23:00:00Z'));
    expect(toInstant({ year: 2026, month: 7, day: 2 }, 0, WARSAW)).toBe(Date.parse('2026-07-01T22:00:00Z'));
  });

  it('gives a 23-hour day when clocks go forward and a 25-hour day when they go back', () => {
    const hours = (day: { year: number; month: number; day: number }): number =>
      (toInstant(addDays(day, 1), 0, WARSAW) - toInstant(day, 0, WARSAW)) / 3_600_000;
    expect(hours({ year: 2026, month: 3, day: 29 })).toBe(23);
    expect(hours({ year: 2026, month: 10, day: 25 })).toBe(25);
    expect(hours({ year: 2026, month: 11, day: 6 })).toBe(24);
  });

  it('round-trips an instant to a local date and minute', () => {
    const instant = Date.parse('2026-11-06T07:05:00+01:00');
    expect(fromInstant(instant, WARSAW)).toEqual({ date: { year: 2026, month: 11, day: 6 }, minuteOfDay: 425 });
    expect(toInstant({ year: 2026, month: 11, day: 6 }, 425, WARSAW)).toBe(instant);
  });

  it('uses the zone, not UTC, to decide which day it is', () => {
    // 23:30 UTC on the 5th is already the 6th in Warsaw.
    expect(today(WARSAW, Date.parse('2026-11-05T23:30:00Z'))).toEqual({ year: 2026, month: 11, day: 6 });
    expect(today('America/New_York', Date.parse('2026-11-06T03:00:00Z'))).toEqual({ year: 2026, month: 11, day: 5 });
  });
});
