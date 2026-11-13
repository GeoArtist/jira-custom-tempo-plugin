// The one door to the export code (specs/003-table-export). No file outside this folder may
// import another module of it, and this one is always imported as `…/export/index`: the
// size build replaces exactly that import by a stub (vite.config.ts, mode "core"), so what
// stands behind this door is measured apart from the rest (constitution, Principle I).
import type { Period } from '../domain/period';
import type { PeriodSummary } from '../domain/summary';
import type { TicketRow } from '../domain/worklog';
import { toCsv } from './csv';
import { buildReport } from './report';
import { toXlsx } from './xlsx';

export { saveFile } from './download';

export type ExportFormat = 'csv' | 'xlsx';

/** What the table has on screen, and whose time it is: the only source of a file (FR-011). */
export interface ExportView {
  /** The rows on screen, in the order on screen. */
  rows: TicketRow[];
  /** The period these rows were drawn for. */
  period: Period;
  timeZone: string;
  /** The total and its colour, as the total row shows them. */
  summary: PeriodSummary;
  /** The full name of the selected person as Jira has it; empty when Jira gives none. */
  personName: string;
}

/** A finished file, ready to be handed to the browser. */
export interface ReportFile {
  name: string;
  mime: string;
  data: string | Uint8Array;
}

/** Makes the file of one view in one format. `now` is the time written into the file. */
export function buildFile(view: ExportView, format: ExportFormat, now: Date): ReportFile {
  const report = buildReport(view);
  if (format === 'csv') {
    return { name: `${report.fileBase}.csv`, mime: 'text/csv;charset=utf-8', data: toCsv(report) };
  }
  return {
    name: `${report.fileBase}.xlsx`,
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    data: toXlsx(report, now),
  };
}
