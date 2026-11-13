import { describe, expect, it } from 'vite-plus/test';
import {
  customPeriod,
  dayPeriod,
  endInstant,
  isSingleDay,
  isWholeDays,
  matchPreset,
  presetPeriod,
  shift,
  startInstant,
  type Period,
} from '../../src/domain/period';
import { FIXTURE_NOW } from '../fake-gateway';

const TZ = 'Europe/Warsaw';
const d = (year: number, month: number, day: number) => ({ year, month, day });
const range = (period: Period) => [period.from.date, period.to.date];

describe('presets', () => {
  it('covers the whole current day for "today"', () => {
    const period = presetPeriod('today', TZ, FIXTURE_NOW);
    expect(period.from).toEqual({ date: d(2026, 11, 6), minuteOfDay: 0 });
    expect(period.to).toEqual({ date: d(2026, 11, 6), minuteOfDay: 1439 });
    expect(isSingleDay(period)).toBe(true);
    expect(isWholeDays(period)).toBe(true);
  });

  it('builds yesterday, weeks from Monday to Sunday, and whole months', () => {
    expect(range(presetPeriod('yesterday', TZ, FIXTURE_NOW))).toEqual([d(2026, 11, 5), d(2026, 11, 5)]);
    expect(range(presetPeriod('thisWeek', TZ, FIXTURE_NOW))).toEqual([d(2026, 11, 2), d(2026, 11, 8)]);
    expect(range(presetPeriod('prevWeek', TZ, FIXTURE_NOW))).toEqual([d(2026, 10, 26), d(2026, 11, 1)]);
    expect(range(presetPeriod('thisMonth', TZ, FIXTURE_NOW))).toEqual([d(2026, 11, 1), d(2026, 11, 30)]);
    expect(range(presetPeriod('prevMonth', TZ, FIXTURE_NOW))).toEqual([d(2026, 10, 1), d(2026, 10, 31)]);
  });

  it('builds the day before yesterday and whole calendar years', () => {
    expect(range(presetPeriod('dayBeforeYesterday', TZ, FIXTURE_NOW))).toEqual([d(2026, 11, 4), d(2026, 11, 4)]);
    expect(range(presetPeriod('thisYear', TZ, FIXTURE_NOW))).toEqual([d(2026, 1, 1), d(2026, 12, 31)]);
    expect(range(presetPeriod('prevYear', TZ, FIXTURE_NOW))).toEqual([d(2025, 1, 1), d(2025, 12, 31)]);
    expect(dayPeriod(d(2026, 10, 15))).toEqual({
      from: { date: d(2026, 10, 15), minuteOfDay: 0 },
      to: { date: d(2026, 10, 15), minuteOfDay: 1439 },
      preset: 'custom',
    });
  });

  it('keeps Sunday in the week that started on Monday', () => {
    const sunday = Date.parse('2026-11-08T20:00:00+01:00');
    expect(range(presetPeriod('thisWeek', TZ, sunday))).toEqual([d(2026, 11, 2), d(2026, 11, 8)]);
  });

  it('handles a week that crosses a year boundary', () => {
    const newYear = Date.parse('2027-01-01T10:00:00+01:00');
    expect(range(presetPeriod('thisWeek', TZ, newYear))).toEqual([d(2026, 12, 28), d(2027, 1, 3)]);
    expect(range(presetPeriod('prevMonth', TZ, newYear))).toEqual([d(2026, 12, 1), d(2026, 12, 31)]);
  });
});

describe('instants', () => {
  it('is a half-open interval covering the last minute', () => {
    const period = presetPeriod('today', TZ, FIXTURE_NOW);
    expect(startInstant(period, TZ)).toBe(Date.parse('2026-11-06T00:00:00+01:00'));
    expect(endInstant(period, TZ)).toBe(Date.parse('2026-11-07T00:00:00+01:00'));
  });

  it('spans a daylight-saving change inside the period', () => {
    const october = presetPeriod('thisMonth', TZ, Date.parse('2026-10-15T12:00:00+02:00'));
    const hours = (endInstant(october, TZ) - startInstant(october, TZ)) / 3_600_000;
    expect(hours).toBe(31 * 24 + 1);
  });
});

describe('custom range', () => {
  const at = (day: number, minuteOfDay: number) => ({ date: d(2026, 11, day), minuteOfDay });

  it('accepts a window inside one day and treats it as a single day', () => {
    const period = customPeriod(at(6, 480), at(6, 720));
    expect(period?.preset).toBe('custom');
    expect(period && isSingleDay(period)).toBe(true);
    expect(period && isWholeDays(period)).toBe(false);
    expect(period && endInstant(period, TZ)).toBe(Date.parse('2026-11-06T12:01:00+01:00'));
  });

  it('rejects "Od" later than "Do"', () => {
    expect(customPeriod(at(7, 0), at(6, 1439))).toBeNull();
    expect(customPeriod(at(6, 721), at(6, 720))).toBeNull();
    expect(customPeriod(at(6, 720), at(6, 720))).not.toBeNull();
  });
});

describe('shift', () => {
  it('moves a single day by one day and recognises the preset it lands on', () => {
    const previous = shift(presetPeriod('today', TZ, FIXTURE_NOW), -1, TZ, FIXTURE_NOW);
    expect(range(previous)).toEqual([d(2026, 11, 5), d(2026, 11, 5)]);
    expect(previous.preset).toBe('yesterday');
    const twoBack = shift(previous, -1, TZ, FIXTURE_NOW);
    expect(twoBack.preset).toBe('dayBeforeYesterday');
    expect(shift(twoBack, -1, TZ, FIXTURE_NOW).preset).toBe('custom');
  });

  it('moves a full week by seven days', () => {
    const previous = shift(presetPeriod('thisWeek', TZ, FIXTURE_NOW), -1, TZ, FIXTURE_NOW);
    expect(range(previous)).toEqual([d(2026, 10, 26), d(2026, 11, 1)]);
    expect(previous.preset).toBe('prevWeek');
  });

  it('moves a full month to the neighbouring month, whatever its length', () => {
    const november = presetPeriod('thisMonth', TZ, FIXTURE_NOW);
    expect(range(shift(november, 1, TZ, FIXTURE_NOW))).toEqual([d(2026, 12, 1), d(2026, 12, 31)]);
    const february = shift(shift(shift(november, 1, TZ, FIXTURE_NOW), 1, TZ, FIXTURE_NOW), 1, TZ, FIXTURE_NOW);
    expect(range(february)).toEqual([d(2027, 2, 1), d(2027, 2, 28)]);
  });

  it('moves a full year by one year', () => {
    const previous = shift(presetPeriod('thisYear', TZ, FIXTURE_NOW), -1, TZ, FIXTURE_NOW);
    expect(range(previous)).toEqual([d(2025, 1, 1), d(2025, 12, 31)]);
    expect(previous.preset).toBe('prevYear');
    expect(range(shift(previous, -1, TZ, FIXTURE_NOW))).toEqual([d(2024, 1, 1), d(2024, 12, 31)]);
  });

  it('moves any other range by the days it spans and keeps its clock times', () => {
    const custom = customPeriod(
      { date: d(2026, 11, 2), minuteOfDay: 480 },
      { date: d(2026, 11, 4), minuteOfDay: 960 },
    ) as Period;
    const next = shift(custom, 1, TZ, FIXTURE_NOW);
    expect(next.from).toEqual({ date: d(2026, 11, 5), minuteOfDay: 480 });
    expect(next.to).toEqual({ date: d(2026, 11, 7), minuteOfDay: 960 });
    expect(next.preset).toBe('custom');
  });
});

describe('matchPreset', () => {
  it('names a custom range that equals a preset', () => {
    const period = customPeriod(
      { date: d(2026, 11, 2), minuteOfDay: 0 },
      { date: d(2026, 11, 8), minuteOfDay: 1439 },
    ) as Period;
    expect(matchPreset(period, TZ, FIXTURE_NOW)).toBe('thisWeek');
  });
});
