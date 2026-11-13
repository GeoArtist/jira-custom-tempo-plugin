import { describe, expect, it } from 'vite-plus/test';
import { presetPeriod } from '../../src/domain/period';
import { summarise } from '../../src/domain/summary';
import type { TicketRow } from '../../src/domain/worklog';
import { FIXTURE_NOW } from '../fake-gateway';

const TZ = 'Europe/Warsaw';
const today = presetPeriod('today', TZ, FIXTURE_NOW);
const week = presetPeriod('thisWeek', TZ, FIXTURE_NOW);
const H = 3600;

const rows = (seconds: number): TicketRow[] =>
  seconds === 0
    ? []
    : [
        {
          ticket: { id: '1', key: 'AM-1', title: '', url: '' },
          entries: [{ id: '1', issueId: '1', startedMs: FIXTURE_NOW, durationSeconds: seconds }],
          totalSeconds: seconds,
        },
      ];

describe('summarise for a single day', () => {
  it('has no colour and an empty bar at zero', () => {
    const summary = summarise(rows(0), today);
    expect(summary).toMatchObject({ totalSeconds: 0, progressActive: true, fillFraction: 0, normReached: false });
    expect(summary.colour).toBeNull();
  });

  it('mixes light blue into light green up to the norm', () => {
    expect(summarise(rows(4 * H), today).colour).toEqual({ from: 'blue', to: 'green', ratio: 0.5 });
    const atNorm = summarise(rows(8 * H), today);
    expect(atNorm.colour).toEqual({ from: 'blue', to: 'green', ratio: 1 });
    expect(atNorm.normReached).toBe(true);
    expect(atNorm.fillFraction).toBeCloseTo(1 / 3);
  });

  it('runs yellow, orange, red above the norm', () => {
    expect(summarise(rows(8 * H + 60), today).colour).toMatchObject({ from: 'yellow', to: 'orange' });
    expect(summarise(rows(12 * H), today).colour).toEqual({ from: 'yellow', to: 'orange', ratio: 0.5 });
    expect(summarise(rows(16 * H), today).colour).toEqual({ from: 'yellow', to: 'orange', ratio: 1 });
    expect(summarise(rows(20 * H), today).colour).toEqual({ from: 'orange', to: 'red', ratio: 0.5 });
    expect(summarise(rows(24 * H), today).colour).toEqual({ from: 'orange', to: 'red', ratio: 1 });
  });

  it('stays red with a full bar above 24 hours', () => {
    const summary = summarise(rows(26 * H), today);
    expect(summary.colour).toEqual({ from: 'red', to: 'red', ratio: 1 });
    expect(summary.fillFraction).toBe(1);
    expect(summary.totalSeconds).toBe(26 * H);
  });
});

describe('summarise for a longer period', () => {
  it('turns the bar and the colour off but keeps the total', () => {
    const summary = summarise(rows(38 * H), week);
    expect(summary.progressActive).toBe(false);
    expect(summary.colour).toBeNull();
    expect(summary.fillFraction).toBe(0);
    expect(summary.totalSeconds).toBe(38 * H);
  });
});
