// The view turned into the texts of the two files, and the name of the file
// (specs/003-table-export/data-model.md, "Report" and "File name").
import { describe, expect, it } from 'vite-plus/test';
import { formatEntry } from '../../src/domain/format';
import { customPeriod, dayPeriod, presetPeriod, type Period } from '../../src/domain/period';
import { summarise } from '../../src/domain/summary';
import { buildRows, type TicketRow } from '../../src/domain/worklog';
import type { ExportView } from '../../src/export/index';
import { PALETTE } from '../../src/export/palette';
import { buildReport, MAX_FILE_NAME_PART } from '../../src/export/report';
import { fakeSession, FIXTURE_NOW } from '../fake-gateway';
import search from '../fixtures/search-today.json';
import worklogs10001 from '../fixtures/worklogs-10001.json';
import worklogs10002 from '../fixtures/worklogs-10002.json';
import worklogs10003 from '../fixtures/worklogs-10003.json';

const TZ = fakeSession.timeZone;
const worklogs = [...worklogs10001.worklogs, ...worklogs10002.worklogs, ...worklogs10003.worklogs];
const today = presetPeriod('today', TZ, FIXTURE_NOW);
const week = presetPeriod('thisWeek', TZ, FIXTURE_NOW);
const todayRows = buildRows(search.issues, worklogs, fakeSession, today);

const day13 = dayPeriod({ year: 2026, month: 11, day: 13 });
const november = customPeriod(
  { date: { year: 2026, month: 11, day: 1 }, minuteOfDay: 0 },
  { date: { year: 2026, month: 11, day: 30 }, minuteOfDay: 1439 },
) as Period;
const morning = customPeriod(
  { date: { year: 2026, month: 11, day: 13 }, minuteOfDay: 8 * 60 },
  { date: { year: 2026, month: 11, day: 13 }, minuteOfDay: 12 * 60 },
) as Period;

function view(rows: TicketRow[], period: Period, personName = 'Jan Kowalski'): ExportView {
  return { rows, period, timeZone: TZ, summary: summarise(rows, period), personName };
}

function row(title: string, seconds = 3600, key = 'AM-1'): TicketRow {
  return {
    ticket: { id: key, key, title, url: `https://example.atlassian.net/browse/${key}` },
    entries: [{ id: '1', issueId: key, startedMs: FIXTURE_NOW, durationSeconds: seconds }],
    totalSeconds: seconds,
  };
}

const fileBase = (personName: string, period: Period = day13) => buildReport(view([], period, personName)).fileBase;

describe('report', () => {
  it('has one row per row of the view, in the same order, with the texts of the screen', () => {
    const report = buildReport(view(todayRows, today));
    expect(report.rows.map((item) => item.key)).toEqual(['AM-10234', 'AM-20012', 'AM-10087']);
    expect(report.rows.map((item) => item.sum)).toEqual(['6h 55m', '1h 45m', '1h 30m']);
    expect(report.rows.map((item) => item.minutes)).toEqual([415, 105, 90]);
    expect(report.rows[0]?.url).toBe('https://example.atlassian.net/browse/AM-10234');
    expect(report.rows[0]?.title).toBe(todayRows[0]?.ticket.title);
    expect(report.rows[0]?.entries).toEqual(['07:00–10:30 · 3h 30m', '13:00–14:00 · 1h 00m', '15:05–17:30 · 2h 25m']);
  });

  it('keeps the order it is given, whatever that is', () => {
    const reversed = [...todayRows].reverse();
    expect(buildReport(view(reversed, today)).rows.map((item) => item.key)).toEqual([
      'AM-10087',
      'AM-20012',
      'AM-10234',
    ]);
  });

  it('writes the entries as the screen does, with their dates in a longer period', () => {
    const rows = buildRows(search.issues, worklogs, fakeSession, week);
    const report = buildReport(view(rows, week));
    const first = rows[0] as TicketRow;
    expect(report.rows[0]?.entries).toEqual(first.entries.map((entry) => formatEntry(entry, week, TZ)));
    expect(report.rows.flatMap((item) => item.entries)).toContain('06-11 07:00–10:30 · 3h 30m');
  });

  it('names the person, the period as the title does, and the total', () => {
    const report = buildReport(view(todayRows, today, 'Józef Śliwiński'));
    expect(report.name).toBe('Józef Śliwiński');
    expect(report.period).toBe('Piątek 06-11-2026');
    expect(report.total).toBe('10h 10m');
    expect(report.totalMinutes).toBe(610);
    expect(buildReport(view([], november)).period).toBe('01-11-2026 – 30-11-2026');
    expect(buildReport(view([], morning)).period).toBe('Piątek 13-11-2026 08:00–12:00');
  });

  it('holds the whole minutes the screen shows', () => {
    const report = buildReport(view([row('a', 3599), row('b', 61, 'AM-2')], today));
    expect(report.rows.map((item) => [item.sum, item.minutes])).toEqual([
      ['0h 59m', 59],
      ['0h 01m', 1],
    ]);
    // 3660 seconds in all: the total is floored by itself, as on screen.
    expect([report.total, report.totalMinutes]).toEqual(['1h 01m', 61]);
  });

  it('makes a title one line and removes what cannot be shown', () => {
    const titles = ['a\tb', 'a\nb', 'a\r\nb', 'a\rb', 'a\u0001b\u007fc', '', '  kept  as it is  '];
    const report = buildReport(
      view(
        titles.map((title, index) => row(title, 60, `AM-${index}`)),
        today,
      ),
    );
    expect(report.rows.map((item) => item.title)).toEqual([
      'a b',
      'a b',
      'a b',
      'a b',
      'abc',
      '',
      '  kept  as it is  ',
    ]);
  });

  it('is a valid report without rows', () => {
    const report = buildReport(view([], today));
    expect(report.rows).toEqual([]);
    expect([report.total, report.totalMinutes]).toEqual(['0h 00m', 0]);
  });

  it('gives the total the colour it has on screen, in the shades of a white sheet', () => {
    // 10h 10m of a single day lies between green and blue.
    const single = buildReport(view(todayRows, today)).totalColour;
    expect(single).toMatch(/^#[0-9a-f]{6}$/);
    expect([PALETTE.text, PALETTE.muted]).not.toContain(single);
    expect(buildReport(view(todayRows, november)).totalColour).toBe(PALETTE.text);
    expect(buildReport(view([], today)).totalColour).toBe(PALETTE.muted);
  });
});

describe('file name', () => {
  it('is the name, the range, and the fixed ending', () => {
    expect(fileBase('Jan Kowalski')).toBe('Jan_Kowalski_13-11-2026_tempo_report');
  });

  it('names a range of whole days by its first and last day', () => {
    expect(fileBase('Józef Śliwiński', november)).toBe('Jozef_Sliwinski_01-11-2026_30-11-2026_tempo_report');
  });

  it('names both ends with their times when the period is not whole days', () => {
    expect(fileBase('Anna Maria  Nowak-Kowalska', morning)).toBe(
      'Anna_Maria_Nowak-Kowalska_13-11-2026_0800_13-11-2026_1200_tempo_report',
    );
    const untilNoon = customPeriod(
      { date: { year: 2026, month: 11, day: 12 }, minuteOfDay: 0 },
      { date: { year: 2026, month: 11, day: 13 }, minuteOfDay: 12 * 60 },
    ) as Period;
    expect(fileBase('Jan Kowalski', untilNoon)).toBe('Jan_Kowalski_12-11-2026_0000_13-11-2026_1200_tempo_report');
  });

  it('removes diacritical marks and keeps the letter case', () => {
    expect(fileBase('Łukasz Żółć')).toBe('Lukasz_Zolc_13-11-2026_tempo_report');
    expect(fileBase('ąćęłńóśźż ĄĆĘŁŃÓŚŹŻ')).toBe('acelnoszz_ACELNOSZZ_13-11-2026_tempo_report');
    expect(fileBase('Renée Müller-Čapek')).toBe('Renee_Muller-Capek_13-11-2026_tempo_report');
  });

  it('keeps letters that are not a base letter with marks', () => {
    expect(fileBase('Jörg Weiß')).toBe('Jorg_Weiß_13-11-2026_tempo_report');
    expect(fileBase('Søren Đorđe')).toBe('Søren_Đorđe_13-11-2026_tempo_report');
    expect(fileBase('Иван Петров')).toBe('Иван_Петров_13-11-2026_tempo_report');
  });

  it('removes what a file name may not hold', () => {
    expect(fileBase('Jan\\/:*?"<>| Kowalski')).toBe('Jan_Kowalski_13-11-2026_tempo_report');
    expect(fileBase('Jan\u0001 Kowalski')).toBe('Jan_Kowalski_13-11-2026_tempo_report');
    expect(fileBase('.Jan  Kowalski.')).toBe('Jan_Kowalski_13-11-2026_tempo_report');
    expect(fileBase('  Jan   Kowalski  ')).toBe('Jan_Kowalski_13-11-2026_tempo_report');
    expect(fileBase('J.R. Kowalski')).toBe('J.R._Kowalski_13-11-2026_tempo_report');
  });

  it('starts with the range when there is no name, or nothing of it is left', () => {
    expect(fileBase('')).toBe('13-11-2026_tempo_report');
    expect(fileBase('???')).toBe('13-11-2026_tempo_report');
    expect(fileBase(' . _ . ')).toBe('13-11-2026_tempo_report');
  });

  it('keeps a name of exactly the longest length whole', () => {
    expect(MAX_FILE_NAME_PART).toBe(100);
    const name = `${'A'.repeat(49)} ${'B'.repeat(50)}`;
    expect(fileBase(name)).toBe(`${'A'.repeat(49)}_${'B'.repeat(50)}_13-11-2026_tempo_report`);
  });

  it('takes the surname alone when the name is too long, and never cuts a word', () => {
    const firstNames = Array.from({ length: 9 }, () => 'Maksymilian').join(' ');
    expect(fileBase(`${firstNames} Nowak-Kowalska`)).toBe('Nowak-Kowalska_13-11-2026_tempo_report');
  });

  it('leaves the name out when the surname alone is too long', () => {
    expect(fileBase('A'.repeat(120))).toBe('13-11-2026_tempo_report');
    expect(fileBase(`Jan Maria ${'K'.repeat(120)}`)).toBe('13-11-2026_tempo_report');
  });
});
