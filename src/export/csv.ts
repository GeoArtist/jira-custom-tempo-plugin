// The CSV text (specs/003-table-export/contracts/files.md, "CSV"): the form a spreadsheet
// program with Polish settings opens by itself. One ticket is one line.
import { pl } from '../i18n/pl';
import type { Report } from './report';

/** The byte order mark: by it a spreadsheet program reads the text as UTF-8 (FR-016). */
const MARK = '\ufeff';
const SEPARATOR = ';';
const LINE_END = '\r\n';
/** Entries of one ticket stay in one field (FR-014). */
const ENTRY_SEPARATOR = ', ';

/** A text a spreadsheet program would take for a formula, also behind white space (FR-015). */
const LOOKS_LIKE_FORMULA = /^[ \u00a0\t]*[=+\-@]/;
const NEEDS_QUOTES = /[;"\r\n]/;

function field(text: string): string {
  // The apostrophe first, the quotation marks after.
  const safe = LOOKS_LIKE_FORMULA.test(text) ? `'${text}` : text;
  return NEEDS_QUOTES.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function toCsv(report: Report): string {
  const lines = [
    [pl.columns.ticket, pl.columns.title, pl.columns.entries, pl.columns.sum],
    ...report.rows.map((row) => [row.key, row.title, row.entries.join(ENTRY_SEPARATOR), row.sum]),
  ];
  return MARK + lines.map((line) => line.map(field).join(SEPARATOR) + LINE_END).join('');
}
