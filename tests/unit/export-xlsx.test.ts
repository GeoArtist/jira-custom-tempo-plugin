// The XLSX file, read back part by part (specs/003-table-export/contracts/files.md, "XLSX";
// FR-020 to FR-027).
import { describe, expect, it } from 'vite-plus/test';
import { mix, PALETTE } from '../../src/export/palette';
import type { Report, ReportRow } from '../../src/export/report';
import { escapeXml, toXlsx } from '../../src/export/xlsx';
import { unzip } from '../helpers/unzip';

const NOW = new Date(2026, 10, 13, 14, 25, 36);
const URL_OF = (key: string) => `https://example.atlassian.net/browse/${key}`;

function row(
  key: string,
  title: string,
  entries: string[],
  sum: string,
  minutes: number,
  url = URL_OF(key),
): ReportRow {
  return { key, url, title, entries, sum, minutes };
}

const ROWS = [
  row('AM-101', 'Poprawka logowania', ['07:00–10:30 · 3h 30m'], '3h 30m', 210),
  row('AM-102', 'Raport & <wersja> "B"', ['10:30–12:00 · 1h 30m', '13:00–13:30 · 0h 30m'], '2h 00m', 120),
  row('AM-103', '=1+1', ['14:00–15:25 · 1h 25m'], '1h 25m', 85),
];

function report(rows: ReportRow[] = ROWS, extra: Partial<Report> = {}): Report {
  return {
    name: 'Józef Śliwiński',
    period: 'Piątek 13-11-2026',
    total: '6h 55m',
    totalMinutes: 415,
    totalColour: mix(PALETTE.tones.blue, PALETTE.tones.green, 415 / 480),
    rows,
    fileBase: 'Jozef_Sliwinski_13-11-2026_tempo_report',
    ...extra,
  };
}

const parse = (xml: string) => new DOMParser().parseFromString(xml, 'application/xml');
const all = (node: Document | Element, tag: string) => [...node.getElementsByTagName(tag)];

/** The parts of a file and helpers to look into its sheet and its styles. */
function open(file: Report = report()) {
  const parts = unzip(toXlsx(file, NOW));
  const sheet = parse(parts.get('xl/worksheets/sheet1.xml') ?? '');
  const styles = parse(parts.get('xl/styles.xml') ?? '');
  const cell = (ref: string) => all(sheet, 'c').find((c) => c.getAttribute('r') === ref);
  const text = (ref: string) => cell(ref)?.getElementsByTagName('t')[0]?.textContent ?? null;
  const number = (ref: string) => Number(cell(ref)?.getElementsByTagName('v')[0]?.textContent);
  const rowOf = (index: number) => all(sheet, 'row').find((r) => r.getAttribute('r') === String(index));
  const height = (index: number) => Number(rowOf(index)?.getAttribute('ht'));
  const widths = () => all(sheet, 'col').map((col) => Number(col.getAttribute('width')));

  /** What the format of a cell resolves to. */
  function look(ref: string) {
    const format = all(all(styles, 'cellXfs')[0] as Element, 'xf')[Number(cell(ref)?.getAttribute('s'))] as Element;
    const font = all(all(styles, 'fonts')[0] as Element, 'font')[Number(format.getAttribute('fontId'))] as Element;
    const fill = all(all(styles, 'fills')[0] as Element, 'fill')[Number(format.getAttribute('fillId'))] as Element;
    const border = all(all(styles, 'borders')[0] as Element, 'border')[
      Number(format.getAttribute('borderId'))
    ] as Element;
    const alignment = format.getElementsByTagName('alignment')[0];
    const numberFormat = all(styles, 'numFmt').find(
      (f) => f.getAttribute('numFmtId') === format.getAttribute('numFmtId'),
    );
    const sides = ['left', 'right', 'top', 'bottom'].map((side) => border.getElementsByTagName(side)[0] as Element);
    return {
      size: Number(font.getElementsByTagName('sz')[0]?.getAttribute('val')),
      bold: font.getElementsByTagName('b').length > 0,
      colour: font.getElementsByTagName('color')[0]?.getAttribute('rgb'),
      fontName: font.getElementsByTagName('name')[0]?.getAttribute('val'),
      fill: fill.getElementsByTagName('fgColor')[0]?.getAttribute('rgb') ?? null,
      fillPattern: fill.getElementsByTagName('patternFill')[0]?.getAttribute('patternType'),
      border: sides.map((side) => side.getAttribute('style')),
      borderColour: sides.map((side) => side.getElementsByTagName('color')[0]?.getAttribute('rgb') ?? null),
      horizontal: alignment?.getAttribute('horizontal') ?? null,
      vertical: alignment?.getAttribute('vertical') ?? null,
      wrap: alignment?.getAttribute('wrapText') === '1',
      format: numberFormat?.getAttribute('formatCode') ?? null,
    };
  }
  return { parts, sheet, styles, cell, text, number, height, widths, look };
}

const ARGB = (hex: string) => `FF${hex.slice(1).toUpperCase()}`;
const THIN = ['thin', 'thin', 'thin', 'thin'];
const NONE = [null, null, null, null];

describe('xlsx: the package', () => {
  it('holds the seven parts, in order, each an XML document', () => {
    const { parts } = open();
    expect([...parts.keys()]).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/worksheets/sheet1.xml',
      'xl/worksheets/_rels/sheet1.xml.rels',
    ]);
    for (const [name, xml] of parts) {
      expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'), name).toBe(true);
      expect(parse(xml).getElementsByTagName('parsererror'), name).toHaveLength(0);
    }
  });

  it('declares the workbook, the sheet, and the styles, and ties them together', () => {
    const { parts } = open();
    const types = parse(parts.get('[Content_Types].xml') ?? '');
    expect(all(types, 'Override').map((o) => o.getAttribute('PartName'))).toEqual([
      '/xl/workbook.xml',
      '/xl/worksheets/sheet1.xml',
      '/xl/styles.xml',
    ]);
    expect(all(parse(parts.get('_rels/.rels') ?? ''), 'Relationship').map((r) => r.getAttribute('Target'))).toEqual([
      'xl/workbook.xml',
    ]);
    expect(
      all(parse(parts.get('xl/_rels/workbook.xml.rels') ?? ''), 'Relationship').map((r) => r.getAttribute('Target')),
    ).toEqual(['worksheets/sheet1.xml', 'styles.xml']);
  });

  it('has one sheet named "Raport"', () => {
    const sheets = all(parse(open().parts.get('xl/workbook.xml') ?? ''), 'sheet');
    expect(sheets.map((s) => [s.getAttribute('name'), s.getAttribute('r:id')])).toEqual([['Raport', 'rId1']]);
  });

  it('gives the same bytes for the same report and time', () => {
    expect(toXlsx(report(), NOW)).toEqual(toXlsx(report(), new Date(NOW)));
  });
});

describe('xlsx: the cells', () => {
  it('names the person, the period, and the total above the table', () => {
    const { text, cell, sheet } = open();
    expect(text('A1')).toBe('Józef Śliwiński');
    expect(text('A2')).toBe('Piątek 13-11-2026');
    expect(text('A3')).toBe('Suma czasu: 6h 55m');
    // Row 4 is empty.
    expect(all(sheet, 'row').map((r) => r.getAttribute('r'))).toEqual(['1', '2', '3', '5', '6', '7', '8', '9']);
    expect(cell('B1')).toBeUndefined();
  });

  it('spans the three title rows over the four columns, and nothing else', () => {
    expect(all(open().sheet, 'mergeCell').map((m) => m.getAttribute('ref'))).toEqual(['A1:D1', 'A2:D2', 'A3:D3']);
  });

  it('has the header in row 5 and one row per ticket, in order', () => {
    const { text } = open();
    expect(['A5', 'B5', 'C5', 'D5'].map(text)).toEqual(['Zgłoszenie', 'Tytuł', 'Czas wpisów', 'Suma']);
    expect(['A6', 'A7', 'A8'].map(text)).toEqual(['AM-101', 'AM-102', 'AM-103']);
    expect(text('B6')).toBe('Poprawka logowania');
  });

  it('writes text as inline strings that keep their spaces', () => {
    const { sheet } = open();
    for (const cell of all(sheet, 'c').filter((c) => c.getElementsByTagName('t').length > 0)) {
      expect(cell.getAttribute('t'), cell.getAttribute('r') ?? '').toBe('inlineStr');
      expect(cell.getElementsByTagName('t')[0]?.getAttribute('xml:space')).toBe('preserve');
    }
  });

  it('puts the entries of a ticket one per line into one cell', () => {
    expect(open().text('C7')).toBe('10:30–12:00 · 1h 30m\n13:00–13:30 · 0h 30m');
  });

  it('writes the sums as numbers shown as on screen', () => {
    const { number, cell, look } = open();
    expect([number('D6'), number('D7'), number('D8')]).toEqual([210 / 1440, 120 / 1440, 85 / 1440]);
    expect(cell('D6')?.hasAttribute('t')).toBe(false);
    expect(look('D6').format).toBe('[h]"h" mm"m"');
    // The rows add up to the total of the total row.
    expect(number('D9')).toBe(415 / 1440);
    expect((number('D6') + number('D7') + number('D8')) * 1440).toBeCloseTo(415, 9);
    expect(look('D9').format).toBe('[h]"h" mm"m"');
  });

  it('ends with the total row: empty cells, the label, and the total', () => {
    const { text, cell } = open();
    expect([cell('A9')?.childNodes.length, cell('B9')?.childNodes.length]).toEqual([0, 0]);
    expect(text('C9')).toBe('Suma czasu:');
  });

  it('holds no formula, and shows a title that looks like one as it is written', () => {
    const { sheet, text } = open();
    expect(all(sheet, 'f')).toHaveLength(0);
    expect(text('B8')).toBe('=1+1');
  });

  it('escapes what XML needs escaped and removes what XML cannot carry', () => {
    const { text, parts } = open(report([row('AM-1', 'a\u0001b & <c> "d"', ['07:00–08:00 · 1h 00m'], '1h 00m', 60)]));
    expect(text('B6')).toBe('ab & <c> "d"');
    expect(parts.get('xl/worksheets/sheet1.xml')).toContain('ab &amp; &lt;c&gt; &quot;d&quot;');
    expect(escapeXml('x\u0000\u000by\ud800z\ttab')).toBe('xyz\ttab');
  });

  it('keeps an empty first row when there is no name, and an empty cell for an empty title', () => {
    const { cell, height, text } = open(
      report([row('AM-1', '', ['07:00–08:00 · 1h 00m'], '1h 00m', 60)], { name: '' }),
    );
    expect(cell('A1')?.childNodes.length).toBe(0);
    expect(height(1)).toBe(21);
    expect(text('A2')).toBe('Piątek 13-11-2026');
    expect(cell('B6')?.childNodes.length).toBe(0);
    expect(cell('B6')?.getAttribute('s')).toBe('7');
  });

  it('links each ticket number to its ticket', () => {
    const { sheet, parts } = open();
    const links = all(sheet, 'hyperlink').map((h) => [h.getAttribute('ref'), h.getAttribute('r:id')]);
    expect(links).toEqual([
      ['A6', 'rId1'],
      ['A7', 'rId2'],
      ['A8', 'rId3'],
    ]);
    const targets = all(parse(parts.get('xl/worksheets/_rels/sheet1.xml.rels') ?? ''), 'Relationship');
    expect(targets.map((r) => [r.getAttribute('Id'), r.getAttribute('Target'), r.getAttribute('TargetMode')])).toEqual([
      ['rId1', URL_OF('AM-101'), 'External'],
      ['rId2', URL_OF('AM-102'), 'External'],
      ['rId3', URL_OF('AM-103'), 'External'],
    ]);
  });

  it('leaves a ticket without a usable address without a link', () => {
    const rows = [
      row('AM-1', 'a', ['07:00–08:00 · 1h 00m'], '1h 00m', 60, ''),
      row('AM-2', 'b', ['08:00–09:00 · 1h 00m'], '1h 00m', 60, 'javascript:alert(1)'),
      row('AM-3', 'c', ['09:00–10:00 · 1h 00m'], '1h 00m', 60),
    ];
    const { sheet, look } = open(report(rows));
    expect(all(sheet, 'hyperlink').map((h) => h.getAttribute('ref'))).toEqual(['A8']);
    // The look of a ticket number stays.
    expect(look('A6').colour).toBe(ARGB(PALETTE.link));

    const none = open(report(rows.slice(0, 2)));
    expect(all(none.sheet, 'hyperlinks')).toHaveLength(0);
    expect(none.parts.has('xl/worksheets/_rels/sheet1.xml.rels')).toBe(false);
  });

  it('orders the parts of the sheet as the format demands', () => {
    const { sheet } = open();
    expect([...(sheet.documentElement?.children ?? [])].map((child) => child.tagName)).toEqual([
      'cols',
      'sheetData',
      'mergeCells',
      'hyperlinks',
    ]);
  });
});

describe('xlsx: the look', () => {
  it('uses one font, with the sizes and colours of the three title rows', () => {
    const { look } = open();
    const total = mix(PALETTE.tones.blue, PALETTE.tones.green, 415 / 480);
    expect(look('A1')).toMatchObject({ fontName: 'Calibri', size: 14, bold: true, colour: ARGB(PALETTE.name) });
    expect(look('A2')).toMatchObject({ fontName: 'Calibri', size: 12, bold: true, colour: ARGB(PALETTE.text) });
    expect(look('A3')).toMatchObject({ fontName: 'Calibri', size: 12, bold: true, colour: ARGB(total) });
    expect([look('A1').border, look('A2').border, look('A3').border]).toEqual([NONE, NONE, NONE]);
  });

  it('gives the header a filled background with white bold text, "Suma" at the right', () => {
    const { look } = open();
    for (const ref of ['A5', 'B5', 'C5', 'D5']) {
      expect(look(ref), ref).toMatchObject({
        bold: true,
        size: 11,
        colour: 'FFFFFFFF',
        fill: 'FF0C66E4',
        fillPattern: 'solid',
        border: THIN,
      });
    }
    expect(['A5', 'B5', 'C5', 'D5'].map((ref) => look(ref).horizontal)).toEqual(['left', 'left', 'left', 'right']);
  });

  it('gives the cells of a ticket row the look of the table', () => {
    const { look } = open();
    expect(look('A6')).toMatchObject({ bold: true, colour: ARGB(PALETTE.link), vertical: 'top', wrap: false });
    expect(look('B6')).toMatchObject({ bold: false, colour: ARGB(PALETTE.text), vertical: 'top', wrap: true });
    expect(look('C6')).toMatchObject({ bold: false, colour: ARGB(PALETTE.muted), vertical: 'top', wrap: true });
    expect(look('D6')).toMatchObject({
      bold: false,
      colour: ARGB(PALETTE.text),
      vertical: 'top',
      horizontal: 'right',
      wrap: false,
    });
    for (const ref of ['A6', 'B6', 'C6', 'D6']) expect(look(ref).fill, ref).toBeNull();
  });

  it('gives the total row bold text in the colour of the total, at the right', () => {
    const { look } = open();
    const total = ARGB(mix(PALETTE.tones.blue, PALETTE.tones.green, 415 / 480));
    expect(look('C9')).toMatchObject({ bold: true, colour: total, horizontal: 'right' });
    expect(look('D9')).toMatchObject({ bold: true, colour: total, horizontal: 'right' });
    expect(open(report(ROWS, { totalColour: PALETTE.text })).look('D9').colour).toBe(ARGB(PALETTE.text));
  });

  it('draws a thin border round every cell from the header to the total row', () => {
    const { look } = open();
    for (const index of [5, 6, 7, 8, 9]) {
      for (const column of ['A', 'B', 'C', 'D']) {
        const cell = look(`${column}${index}`);
        expect(cell.border, `${column}${index}`).toEqual(THIN);
        expect(cell.borderColour, `${column}${index}`).toEqual(Array(4).fill('FF9AA3B2'));
      }
    }
  });

  it('starts the columns from the proportions of the panel', () => {
    expect(open().widths()).toEqual([14, 47, 24, 11]);
  });

  it('widens a column to its longest text, and keeps the title the widest', () => {
    const wide = open(report([row('PROJEKT-123456789012', 'a', ['06-11 07:00–10:30 · 3h 30m'], '123h 55m', 7435)]));
    // 20 characters and 2; the title is 10 wider than the widest of the others; 26 and 2; 8 and 2 is less than 11.
    expect(wide.widths()).toEqual([22, 47, 28, 11]);

    const wider = open(report([row('AM-1', 'a', [`${'x'.repeat(48)}`], '1h 00m', 60)]));
    expect(wider.widths()).toEqual([14, 60, 50, 11]);
    const total = open(report(ROWS, { total: '12345h 00m' }));
    expect(total.widths()).toEqual([14, 47, 24, 12]);
  });

  it('sets the height of every row: 15 pt for each line of a ticket', () => {
    const rows = [
      row('AM-1', 'krótki', ['a'], '1h 00m', 60),
      row('AM-2', 'krótki', ['a', 'b', 'c', 'd'], '1h 00m', 60),
      // 100 characters in a column of 47: 42 fit on a line, so three lines.
      row('AM-3', 'x'.repeat(100), ['a'], '1h 00m', 60),
      row('AM-4', '', ['a'], '1h 00m', 60),
    ];
    const { height, sheet } = open(report(rows));
    expect([1, 2, 3, 5].map(height)).toEqual([21, 18, 18, 18]);
    expect([6, 7, 8, 9].map(height)).toEqual([15, 60, 45, 15]);
    expect(height(10)).toBe(18);
    for (const item of all(sheet, 'row')) expect(item.getAttribute('customHeight')).toBe('1');
  });
});
