import { describe, expect, it } from 'vite-plus/test';
import { customPeriod, presetPeriod, type Period } from '../../src/domain/period';
import { buildRows, parseStarted, totalOf, type RawIssue, type RawWorklog } from '../../src/domain/worklog';
import { fakeSession, FIXTURE_NOW } from '../fake-gateway';
import search from '../fixtures/search-today.json';
import worklogs10001 from '../fixtures/worklogs-10001.json';
import worklogs10002 from '../fixtures/worklogs-10002.json';
import worklogs10003 from '../fixtures/worklogs-10003.json';

const today = presetPeriod('today', fakeSession.timeZone, FIXTURE_NOW);
const issues: RawIssue[] = search.issues;
const allWorklogs: RawWorklog[] = [...worklogs10001.worklogs, ...worklogs10002.worklogs, ...worklogs10003.worklogs];

const log = (id: string, issueId: string, started: string, seconds: number, accountId = 'me'): RawWorklog => ({
  id,
  issueId,
  author: { accountId },
  started,
  timeSpentSeconds: seconds,
});

describe('parseStarted', () => {
  it('reads offsets with and without a colon, and Z', () => {
    const expected = Date.parse('2026-11-06T06:00:00Z');
    expect(parseStarted('2026-11-06T07:00:00.000+0100')).toBe(expected);
    expect(parseStarted('2026-11-06T07:00:00.000+01:00')).toBe(expected);
    expect(parseStarted('2026-11-06T06:00:00.000Z')).toBe(expected);
    expect(parseStarted('2026-11-06T01:00:00.000-0500')).toBe(expected);
  });

  it('returns NaN for anything else', () => {
    expect(parseStarted('yesterday')).toBeNaN();
  });
});

describe('buildRows', () => {
  const rows = buildRows(issues, allWorklogs, fakeSession, today);

  it('makes one row per ticket, ordered by the earliest entry', () => {
    expect(rows.map((row) => row.ticket.key)).toEqual(['AM-10234', 'AM-20012', 'AM-10087']);
  });

  it('keeps several entries of a ticket in one row, sorted by start', () => {
    expect(rows[0]?.entries.map((entry) => entry.id)).toEqual(['1', '2', '3']);
    expect(rows[1]?.entries.map((entry) => entry.id)).toEqual(['7', '6']);
  });

  it('sums each row and the whole period to the minute', () => {
    expect(rows.map((row) => row.totalSeconds)).toEqual([24900, 6300, 5400]);
    expect(totalOf(rows)).toBe(10 * 3600 + 10 * 60);
  });

  it("leaves out other people's worklogs and worklogs outside the period", () => {
    const ids = rows.flatMap((row) => row.entries.map((entry) => entry.id));
    expect(ids).not.toContain('4'); // another author
    expect(ids).not.toContain('5'); // the day before
    expect(ids).not.toContain('8');
  });

  it('links each ticket to its Jira page', () => {
    expect(rows[0]?.ticket.url).toBe('https://example.atlassian.net/browse/AM-10234');
  });

  it('drops tickets without any kept entry', () => {
    const yesterday = presetPeriod('yesterday', fakeSession.timeZone, FIXTURE_NOW);
    expect(buildRows(issues, allWorklogs, fakeSession, yesterday).map((row) => row.ticket.key)).toEqual([
      'AM-20012',
      'AM-10234',
    ]);
  });

  it('counts an entry that crosses midnight fully on its start day', () => {
    const late = [log('30', '10003', '2026-11-06T22:00:00.000+0100', 4 * 3600)];
    expect(totalOf(buildRows(issues, late, fakeSession, today))).toBe(4 * 3600);
    const tomorrow = presetPeriod('today', fakeSession.timeZone, FIXTURE_NOW + 86_400_000);
    expect(buildRows(issues, late, fakeSession, tomorrow)).toEqual([]);
  });

  it('keeps a duration that is not a multiple of five minutes exactly as logged', () => {
    const odd = [log('31', '10003', '2026-11-06T08:00:00.000+0100', 7 * 60)];
    expect(buildRows(issues, odd, fakeSession, today)[0]?.totalSeconds).toBe(420);
  });

  it('filters a custom window by start time, bounds included', () => {
    const window = customPeriod(
      { date: today.from.date, minuteOfDay: 8 * 60 },
      { date: today.from.date, minuteOfDay: 12 * 60 },
    ) as Period;
    const entries = [
      log('40', '10003', '2026-11-06T07:00:00.000+0100', 3600),
      log('41', '10003', '2026-11-06T08:00:00.000+0100', 3600),
      log('42', '10003', '2026-11-06T11:55:00.000+0100', 3600),
      log('43', '10003', '2026-11-06T12:00:00.000+0100', 300),
      log('44', '10003', '2026-11-06T12:05:00.000+0100', 3600),
    ];
    const kept = buildRows(issues, entries, fakeSession, window)[0]?.entries.map((entry) => entry.id);
    expect(kept).toEqual(['41', '42', '43']);
  });

  it('orders tickets that start at the same minute by key', () => {
    const tie = [
      log('50', '10002', '2026-11-06T09:00:00.000+0100', 600),
      log('51', '10003', '2026-11-06T09:00:00.000+0100', 600),
    ];
    expect(buildRows(issues, tie, fakeSession, today).map((row) => row.ticket.key)).toEqual(['AM-10087', 'AM-20012']);
  });
});
