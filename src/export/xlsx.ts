// The XLSX file: one formatted sheet, written as the few XML parts the format needs and
// packed into a ZIP container (specs/003-table-export/contracts/files.md, "XLSX"; research
// R2, R4, R5, R13). Every cell is text, except the sums, which are numbers shown as text.
import { pl } from '../i18n/pl';
import { argb, PALETTE } from './palette';
import type { Report, ReportRow } from './report';
import { zip } from './zip';

const DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const OFFICE_RELS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PACKAGE_RELS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const CONTENT = 'application/vnd.openxmlformats-officedocument.spreadsheetml';

const FONT = 'Calibri';
/** The height of one line of 11 pt text, in points (FR-023). */
const LINE_HEIGHT = 15;
const HEADING_HEIGHTS = [21, 18, 18] as const;
const HEADER_HEIGHT = 18;
/** The widths the columns start from, in characters: the proportions of the panel's table. */
const BASE_WIDTHS = { key: 14, title: 47, entries: 24, sum: 11 } as const;
/** Durations are fractions of a day; this format shows them as `6h 55m`, also above 24 hours. */
const DURATION_FORMAT_ID = 164;
const DURATION_FORMAT = '[h]"h" mm"m"';
const MINUTES_PER_DAY = 1440;

/** The cell formats, by their number in the styles part (contracts/files.md, "Styles"). */
const STYLE = {
  name: 1,
  period: 2,
  totalHeading: 3,
  header: 4,
  headerRight: 5,
  key: 6,
  title: 7,
  entries: 8,
  sum: 9,
  totalLabel: 10,
  totalBlank: 11,
  totalValue: 12,
} as const;

/** True for a character XML 1.0 can carry. */
function isXmlChar(code: number): boolean {
  return (
    code === 0x9 ||
    code === 0xa ||
    code === 0xd ||
    (code >= 0x20 && code <= 0xd7ff) ||
    (code >= 0xe000 && code <= 0xfffd) ||
    code >= 0x10000
  );
}

/** A text as XML content or as an attribute value. */
export function escapeXml(text: string): string {
  let kept = '';
  for (const char of text) if (isXmlChar(char.codePointAt(0) ?? 0)) kept += char;
  return kept.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

const COLUMNS = ['A', 'B', 'C', 'D'] as const;
type Column = (typeof COLUMNS)[number];

/** A cell of text; without text it is an empty cell that still carries its format. */
function textCell(column: Column, row: number, style: number, text: string): string {
  const ref = `${column}${row}`;
  if (text === '') return `<c r="${ref}" s="${style}"/>`;
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`;
}

/** A duration as a number the spreadsheet program can add up (FR-025). */
function durationCell(column: Column, row: number, style: number, minutes: number): string {
  return `<c r="${column}${row}" s="${style}"><v>${minutes / MINUTES_PER_DAY}</v></c>`;
}

const rowXml = (row: number, height: number, cells: string[]): string =>
  `<row r="${row}" ht="${height}" customHeight="1">${cells.join('')}</row>`;

const longest = (texts: string[]): number => texts.reduce((max, text) => Math.max(max, text.length), 0);

/** The widths of the four columns, in characters (FR-023). */
function columnWidths(report: Report): Record<'key' | 'title' | 'entries' | 'sum', number> {
  const key = Math.max(BASE_WIDTHS.key, longest([pl.columns.ticket, ...report.rows.map((row) => row.key)]) + 2);
  const entries = Math.max(
    BASE_WIDTHS.entries,
    longest([pl.columns.entries, pl.total, ...report.rows.flatMap((row) => row.entries)]) + 2,
  );
  const sum = Math.max(
    BASE_WIDTHS.sum,
    longest([pl.columns.sum, report.total, ...report.rows.map((row) => row.sum)]) + 2,
  );
  // The title stays the widest column.
  const title = Math.max(BASE_WIDTHS.title, Math.max(key, entries, sum) + 10);
  return { key, title, entries, sum };
}

/** How many lines a ticket row needs: its entries, or its wrapped title, whichever is more. */
function lineCount(row: ReportRow, titleWidth: number): number {
  const titleLines = Math.ceil(row.title.length / Math.floor(titleWidth * 0.9));
  return Math.max(row.entries.length, titleLines, 1);
}

const isLink = (url: string): boolean => /^https?:\/\//.test(url);

function sheetXml(report: Report): { xml: string; links: string[] } {
  const widths = columnWidths(report);
  const firstTicketRow = 6;
  const totalRow = firstTicketRow + report.rows.length;
  const links: string[] = [];
  const hyperlinks: string[] = [];

  const rows = [
    rowXml(1, HEADING_HEIGHTS[0], [textCell('A', 1, STYLE.name, report.name)]),
    rowXml(2, HEADING_HEIGHTS[1], [textCell('A', 2, STYLE.period, report.period)]),
    rowXml(3, HEADING_HEIGHTS[2], [textCell('A', 3, STYLE.totalHeading, `${pl.total} ${report.total}`)]),
    // Row 4 stays empty.
    rowXml(5, HEADER_HEIGHT, [
      textCell('A', 5, STYLE.header, pl.columns.ticket),
      textCell('B', 5, STYLE.header, pl.columns.title),
      textCell('C', 5, STYLE.header, pl.columns.entries),
      textCell('D', 5, STYLE.headerRight, pl.columns.sum),
    ]),
    ...report.rows.map((row, index) => {
      const at = firstTicketRow + index;
      if (isLink(row.url)) {
        links.push(row.url);
        hyperlinks.push(`<hyperlink ref="A${at}" r:id="rId${links.length}"/>`);
      }
      return rowXml(at, LINE_HEIGHT * lineCount(row, widths.title), [
        textCell('A', at, STYLE.key, row.key),
        textCell('B', at, STYLE.title, row.title),
        // One entry per line inside the cell.
        textCell('C', at, STYLE.entries, row.entries.join('\n')),
        durationCell('D', at, STYLE.sum, row.minutes),
      ]);
    }),
    rowXml(totalRow, HEADER_HEIGHT, [
      textCell('A', totalRow, STYLE.totalBlank, ''),
      textCell('B', totalRow, STYLE.totalBlank, ''),
      textCell('C', totalRow, STYLE.totalLabel, pl.total),
      durationCell('D', totalRow, STYLE.totalValue, report.totalMinutes),
    ]),
  ];

  const cols = [widths.key, widths.title, widths.entries, widths.sum]
    .map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`)
    .join('');
  const merges = [1, 2, 3].map((row) => `<mergeCell ref="A${row}:D${row}"/>`).join('');
  const xml =
    `${DECLARATION}<worksheet xmlns="${MAIN}" xmlns:r="${OFFICE_RELS}">` +
    `<cols>${cols}</cols>` +
    `<sheetData>${rows.join('')}</sheetData>` +
    `<mergeCells count="3">${merges}</mergeCells>` +
    (hyperlinks.length > 0 ? `<hyperlinks>${hyperlinks.join('')}</hyperlinks>` : '') +
    '</worksheet>';
  return { xml, links };
}

interface FontSpec {
  size: number;
  bold: boolean;
  colour: string;
}

interface FormatSpec {
  font: number;
  fill?: boolean;
  border?: boolean;
  duration?: boolean;
  horizontal?: 'left' | 'right';
  vertical?: 'top' | 'center';
  wrap?: boolean;
}

function stylesXml(totalColour: string): string {
  const fonts: FontSpec[] = [
    { size: 11, bold: false, colour: PALETTE.text }, // 0: body text
    { size: 14, bold: true, colour: PALETTE.name }, // 1: the name
    { size: 12, bold: true, colour: PALETTE.text }, // 2: the period
    { size: 12, bold: true, colour: totalColour }, // 3: the total above the table
    { size: 11, bold: true, colour: PALETTE.headerText }, // 4: the header
    { size: 11, bold: true, colour: PALETTE.link }, // 5: a ticket number
    { size: 11, bold: false, colour: PALETTE.muted }, // 6: the entries
    { size: 11, bold: true, colour: totalColour }, // 7: the total row
  ];
  // In the order of STYLE: the position is the number a cell refers to.
  const formats: FormatSpec[] = [
    { font: 0 },
    { font: 1, horizontal: 'left', vertical: 'center' },
    { font: 2, horizontal: 'left', vertical: 'center' },
    { font: 3, horizontal: 'left', vertical: 'center' },
    { font: 4, fill: true, border: true, horizontal: 'left', vertical: 'center' },
    { font: 4, fill: true, border: true, horizontal: 'right', vertical: 'center' },
    { font: 5, border: true, horizontal: 'left', vertical: 'top' },
    { font: 0, border: true, horizontal: 'left', vertical: 'top', wrap: true },
    { font: 6, border: true, horizontal: 'left', vertical: 'top', wrap: true },
    { font: 0, border: true, duration: true, horizontal: 'right', vertical: 'top' },
    { font: 7, border: true, horizontal: 'right', vertical: 'center' },
    { font: 0, border: true },
    { font: 7, border: true, duration: true, horizontal: 'right', vertical: 'center' },
  ];

  const fontXml = ({ size, bold, colour }: FontSpec): string =>
    `<font>${bold ? '<b/>' : ''}<sz val="${size}"/><color rgb="${argb(colour)}"/><name val="${FONT}"/><family val="2"/></font>`;
  const side = (name: string): string => `<${name} style="thin"><color rgb="${argb(PALETTE.border)}"/></${name}>`;
  const formatXml = (format: FormatSpec): string => {
    const alignment =
      format.horizontal || format.vertical || format.wrap
        ? `<alignment${format.horizontal ? ` horizontal="${format.horizontal}"` : ''}${
            format.vertical ? ` vertical="${format.vertical}"` : ''
          }${format.wrap ? ' wrapText="1"' : ''}/>`
        : '';
    return (
      `<xf numFmtId="${format.duration ? DURATION_FORMAT_ID : 0}" fontId="${format.font}" ` +
      `fillId="${format.fill ? 2 : 0}" borderId="${format.border ? 1 : 0}" xfId="0" applyFont="1"` +
      `${format.duration ? ' applyNumberFormat="1"' : ''}${format.fill ? ' applyFill="1"' : ''}` +
      `${format.border ? ' applyBorder="1"' : ''}${alignment ? ' applyAlignment="1"' : ''}>${alignment}</xf>`
    );
  };

  return (
    `${DECLARATION}<styleSheet xmlns="${MAIN}">` +
    `<numFmts count="1"><numFmt numFmtId="${DURATION_FORMAT_ID}" formatCode="${escapeXml(DURATION_FORMAT)}"/></numFmts>` +
    `<fonts count="${fonts.length}">${fonts.map(fontXml).join('')}</fonts>` +
    // The first two fills are fixed by the format; the third is the header's.
    '<fills count="3"><fill><patternFill patternType="none"/></fill>' +
    '<fill><patternFill patternType="gray125"/></fill>' +
    `<fill><patternFill patternType="solid"><fgColor rgb="${argb(PALETTE.headerFill)}"/><bgColor indexed="64"/></patternFill></fill></fills>` +
    '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' +
    `<border>${['left', 'right', 'top', 'bottom'].map(side).join('')}<diagonal/></border></borders>` +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    `<cellXfs count="${formats.length}">${formats.map(formatXml).join('')}</cellXfs>` +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>'
  );
}

const relationship = (id: number, type: string, target: string, external = false): string =>
  `<Relationship Id="rId${id}" Type="${OFFICE_RELS}/${type}" Target="${escapeXml(target)}"${
    external ? ' TargetMode="External"' : ''
  }/>`;
const relationships = (items: string[]): string =>
  `${DECLARATION}<Relationships xmlns="${PACKAGE_RELS}">${items.join('')}</Relationships>`;

/** The whole file as bytes. `now` is the time written on the parts of the container. */
export function toXlsx(report: Report, now: Date): Uint8Array {
  const sheet = sheetXml(report);
  const parts: Array<[string, string]> = [
    [
      '[Content_Types].xml',
      `${DECLARATION}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        `<Override PartName="/xl/workbook.xml" ContentType="${CONTENT}.sheet.main+xml"/>` +
        `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="${CONTENT}.worksheet+xml"/>` +
        `<Override PartName="/xl/styles.xml" ContentType="${CONTENT}.styles+xml"/>` +
        '</Types>',
    ],
    ['_rels/.rels', relationships([relationship(1, 'officeDocument', 'xl/workbook.xml')])],
    [
      'xl/workbook.xml',
      `${DECLARATION}<workbook xmlns="${MAIN}" xmlns:r="${OFFICE_RELS}">` +
        `<sheets><sheet name="${escapeXml(pl.exportSheet)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    ],
    [
      'xl/_rels/workbook.xml.rels',
      relationships([relationship(1, 'worksheet', 'worksheets/sheet1.xml'), relationship(2, 'styles', 'styles.xml')]),
    ],
    ['xl/styles.xml', stylesXml(report.totalColour)],
    ['xl/worksheets/sheet1.xml', sheet.xml],
  ];
  if (sheet.links.length > 0) {
    parts.push([
      'xl/worksheets/_rels/sheet1.xml.rels',
      relationships(sheet.links.map((url, index) => relationship(index + 1, 'hyperlink', url, true))),
    ]);
  }
  const encoder = new TextEncoder();
  return zip(
    parts.map(([name, xml]) => ({ name, data: encoder.encode(xml) })),
    now,
  );
}
