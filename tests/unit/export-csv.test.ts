// The CSV text (specs/003-table-export/contracts/files.md, "CSV"; FR-013 to FR-016).
import { describe, expect, it } from 'vite-plus/test';
import { toCsv } from '../../src/export/csv';
import type { Report, ReportRow } from '../../src/export/report';

const HEADER = 'Zgłoszenie;Tytuł;Czas wpisów;Suma';

function row(title: string, entries = ['07:00–10:30 · 3h 30m'], key = 'AM-101', sum = '3h 30m'): ReportRow {
  return { key, url: `https://example.atlassian.net/browse/${key}`, title, entries, sum, minutes: 210 };
}

function report(rows: ReportRow[]): Report {
  return {
    name: 'Jan Kowalski',
    period: 'Piątek 13-11-2026',
    total: '3h 30m',
    totalMinutes: 210,
    totalColour: '#172033',
    rows,
    fileBase: 'Jan_Kowalski_13-11-2026_tempo_report',
  };
}

/** The lines of the text without the mark and without the empty piece after the last line break. */
const lines = (text: string) => text.slice(1).split('\r\n').slice(0, -1);
/** The second field of the only data line. */
const titleField = (title: string) =>
  (lines(toCsv(report([row(title)])))[1] ?? '').slice('AM-101;'.length, -';07:00–10:30 · 3h 30m;3h 30m'.length);

describe('csv', () => {
  it('starts with the byte order mark and the header', () => {
    const text = toCsv(report([row('Poprawka logowania')]));
    expect(text.charCodeAt(0)).toBe(0xfeff);
    expect(new TextEncoder().encode(text).slice(0, 3)).toEqual(new Uint8Array([0xef, 0xbb, 0xbf]));
    expect(lines(text)[0]).toBe(HEADER);
  });

  it('has one line per row, in order, each ended by CR LF, and nothing after the last', () => {
    const text = toCsv(report([row('Pierwsze', undefined, 'AM-1'), row('Drugie', undefined, 'AM-2')]));
    expect(lines(text)).toEqual([
      HEADER,
      'AM-1;Pierwsze;07:00–10:30 · 3h 30m;3h 30m',
      'AM-2;Drugie;07:00–10:30 · 3h 30m;3h 30m',
    ]);
    expect(text.endsWith('3h 30m\r\n')).toBe(true);
    // No lone line feed and no lone carriage return anywhere.
    expect(text.replaceAll('\r\n', '')).not.toMatch(/[\r\n]/);
  });

  it('keeps all entries of a ticket in one field of one line', () => {
    const entries = [
      '07:00–08:00 · 1h 00m',
      '08:00–09:00 · 1h 00m',
      '09:00–10:00 · 1h 00m',
      '10:00–11:00 · 1h 00m',
      '11:00–12:00 · 1h 00m',
    ];
    const text = toCsv(report([row('Praca', entries, 'AM-7', '5h 00m')]));
    expect(lines(text)).toEqual([HEADER, `AM-7;Praca;${entries.join(', ')};5h 00m`]);
  });

  it('puts a field with a semicolon or a quotation mark in quotation marks', () => {
    expect(titleField('Raport; wersja "B"')).toBe('"Raport; wersja ""B"""');
    expect(titleField('bez zmian')).toBe('bez zmian');
    expect(titleField('a "b" c')).toBe('"a ""b"" c"');
  });

  it('keeps a text that looks like a formula from being run', () => {
    expect(titleField('=1+1')).toBe("'=1+1");
    expect(titleField('+48 600')).toBe("'+48 600");
    expect(titleField('-5 dni')).toBe("'-5 dni");
    expect(titleField('@jan')).toBe("'@jan");
    // Also behind white space: the apostrophe is the very first character.
    expect(titleField(' -5 dni')).toBe("' -5 dni");
    expect(titleField('\t=1+1')).toBe("'\t=1+1");
    expect(titleField('\u00a0@jan')).toBe("'\u00a0@jan");
  });

  it('adds the apostrophe first and the quotation marks after', () => {
    expect(titleField('-test; a')).toBe('"\'-test; a"');
  });

  it('leaves alone a text that only holds such a character further in', () => {
    expect(titleField('a-b')).toBe('a-b');
    expect(titleField('1+1=2')).toBe('1+1=2');
    const text = toCsv(report([row('Praca')]));
    expect(lines(text)[1]).toBe('AM-101;Praca;07:00–10:30 · 3h 30m;3h 30m');
  });

  it('writes an empty field for a ticket without a title', () => {
    expect(lines(toCsv(report([row('')])))[1]).toBe('AM-101;;07:00–10:30 · 3h 30m;3h 30m');
  });

  it('is the mark and the header alone for a report without rows', () => {
    expect(toCsv(report([]))).toBe(`\ufeff${HEADER}\r\n`);
  });
});
