// The view turned into what both files hold, and the name of the file
// (specs/003-table-export/data-model.md, "Report" and "File name"). No DOM, no Jira.
import { formatClock, formatDate, formatDuration, formatEntry, formatTitle } from '../domain/format';
import { isSingleDay, isWholeDays, type Period } from '../domain/period';
import type { ExportView } from './index';
import { totalColour } from './palette';

export interface ReportRow {
  key: string;
  /** The address of the ticket; only the XLSX file links to it. */
  url: string;
  /** Always one line; may be empty. */
  title: string;
  /** One text per time entry, as on screen; never empty. */
  entries: string[];
  sum: string;
  /** The whole minutes `sum` shows: the number of the XLSX cell (FR-025). */
  minutes: number;
}

export interface Report {
  /** The full name of the selected person, with its own letters. */
  name: string;
  /** The period as the title of the panel names it, without the total. */
  period: string;
  total: string;
  /** The whole minutes `total` shows. */
  totalMinutes: number;
  totalColour: string;
  rows: ReportRow[];
  /** The file name without its ending. */
  fileBase: string;
}

/** A name part longer than this is too long for a file name (FR-017). */
export const MAX_FILE_NAME_PART = 100;

const wholeMinutes = (seconds: number): number => Math.floor(Math.max(0, seconds) / 60);

const isControl = (char: string): boolean => {
  const code = char.codePointAt(0) ?? 0;
  return code <= 0x1f || code === 0x7f;
};

function withoutControls(text: string): string {
  let kept = '';
  for (const char of text) if (!isControl(char)) kept += char;
  return kept;
}

/** One line: a tab or a line break becomes a space, other control characters go (FR-011). */
function oneLine(title: string): string {
  return withoutControls(title.replace(/\r\n|[\t\r\n]/g, ' '));
}

/** The name as a part of a file name; empty when nothing usable is left (FR-017). */
function namePart(personName: string): string {
  const plain = personName
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    // The one Polish letter that is not a letter with a mark.
    .replace(/\u0142/g, 'l')
    .replace(/\u0141/g, 'L');
  const cleaned = withoutControls(plain)
    .replace(/[\\/:*?"<>|]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/^[._]+|[._]+$/g, '');
  if (cleaned.length <= MAX_FILE_NAME_PART) return cleaned;
  // Too long: the surname alone, never a word cut short.
  const surname = cleaned.slice(cleaned.lastIndexOf('_') + 1);
  return surname.length <= MAX_FILE_NAME_PART ? surname : '';
}

const compactClock = (minuteOfDay: number): string => formatClock(minuteOfDay).replace(':', '');

/** The period as a part of a file name (FR-018). */
function rangePart({ from, to }: Period, wholeDays: boolean, singleDay: boolean): string {
  if (!wholeDays) {
    return `${formatDate(from.date)}_${compactClock(from.minuteOfDay)}_${formatDate(to.date)}_${compactClock(to.minuteOfDay)}`;
  }
  return singleDay ? formatDate(from.date) : `${formatDate(from.date)}_${formatDate(to.date)}`;
}

export function buildReport(view: ExportView): Report {
  const { rows, period, timeZone, summary, personName } = view;
  const range = rangePart(period, isWholeDays(period), isSingleDay(period));
  return {
    name: personName,
    period: formatTitle(period),
    total: formatDuration(summary.totalSeconds),
    totalMinutes: wholeMinutes(summary.totalSeconds),
    totalColour: totalColour(summary),
    rows: rows.map((row) => ({
      key: row.ticket.key,
      url: row.ticket.url,
      title: oneLine(row.ticket.title),
      entries: row.entries.map((entry) => formatEntry(entry, period, timeZone)),
      sum: formatDuration(row.totalSeconds),
      minutes: wholeMinutes(row.totalSeconds),
    })),
    fileBase: [namePart(personName), range, 'tempo_report'].filter((part) => part !== '').join('_'),
  };
}
