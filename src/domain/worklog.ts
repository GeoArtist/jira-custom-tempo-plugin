// Time entries of the current user, grouped into table rows (data-model.md).
import type { Session } from '../jira/gateway';
import { endInstant, startInstant, type Period } from './period';

/** The fields the app reads from a Jira issue (contracts/jira-rest.md). */
export interface RawIssue {
  id: string;
  key: string;
  fields?: { summary?: string };
}

/** The fields the app reads from a Jira worklog (contracts/jira-rest.md). */
export interface RawWorklog {
  id: string;
  issueId: string;
  author?: { accountId?: string };
  /** For example `2026-11-06T07:00:00.000+0100`. */
  started: string;
  timeSpentSeconds: number;
}

export interface TimeEntry {
  id: string;
  issueId: string;
  /** Absolute start instant, epoch milliseconds. */
  startedMs: number;
  /** As logged in Jira; never rounded (FR-010). */
  durationSeconds: number;
}

export interface Ticket {
  id: string;
  key: string;
  title: string;
  url: string;
}

/** One table row: a ticket with all its entries in the period (FR-003). */
export interface TicketRow {
  ticket: Ticket;
  /** Sorted by start time; never empty. */
  entries: TimeEntry[];
  totalSeconds: number;
}

const STARTED = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:?\d{2})$/;

/** Parses Jira's `started` value (offset with or without a colon) into epoch milliseconds. */
export function parseStarted(value: string): number {
  const match = STARTED.exec(value);
  if (!match) return Number.NaN;
  const [, year, month, day, hour, minute, second, fraction = '0', zone = 'Z'] = match;
  const utc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    Number(fraction.padEnd(3, '0')),
  );
  if (zone === 'Z') return utc;
  const sign = zone.startsWith('-') ? -1 : 1;
  const digits = zone.slice(1).replace(':', '');
  const offsetMinutes = Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2, 4));
  return utc - sign * offsetMinutes * 60_000;
}

/**
 * Builds the table rows: only the current user's worklogs that start inside the period,
 * grouped per ticket. An entry belongs to the period by its start and counts with its
 * full duration (FR-001, FR-023).
 */
export function buildRows(issues: RawIssue[], worklogs: RawWorklog[], session: Session, period: Period): TicketRow[] {
  const from = startInstant(period, session.timeZone);
  const until = endInstant(period, session.timeZone);

  const entriesByIssue = new Map<string, TimeEntry[]>();
  for (const worklog of worklogs) {
    if (worklog.author?.accountId !== session.accountId) continue;
    const startedMs = parseStarted(worklog.started);
    if (!(startedMs >= from && startedMs < until)) continue;
    const entry: TimeEntry = {
      id: worklog.id,
      issueId: worklog.issueId,
      startedMs,
      durationSeconds: worklog.timeSpentSeconds,
    };
    const list = entriesByIssue.get(worklog.issueId);
    if (list) list.push(entry);
    else entriesByIssue.set(worklog.issueId, [entry]);
  }

  const rows: TicketRow[] = [];
  for (const issue of issues) {
    const entries = entriesByIssue.get(issue.id);
    if (!entries) continue;
    entries.sort((a, b) => a.startedMs - b.startedMs || a.id.localeCompare(b.id));
    rows.push({
      ticket: {
        id: issue.id,
        key: issue.key,
        title: issue.fields?.summary ?? '',
        url: `${session.siteUrl}/browse/${issue.key}`,
      },
      entries,
      totalSeconds: entries.reduce((sum, entry) => sum + entry.durationSeconds, 0),
    });
  }

  return sortRows(rows);
}

/** Rows follow the start of their earliest entry (FR-009); the key breaks ties. */
function sortRows(rows: TicketRow[]): TicketRow[] {
  return rows.sort(
    (a, b) =>
      (a.entries[0]?.startedMs ?? 0) - (b.entries[0]?.startedMs ?? 0) || a.ticket.key.localeCompare(b.ticket.key),
  );
}

/**
 * The rows of a period that lies inside the one `rows` were loaded for: the same entries
 * Jira would return for it, without asking again (FR-081).
 */
export function filterRows(rows: readonly TicketRow[], period: Period, timeZone: string): TicketRow[] {
  const from = startInstant(period, timeZone);
  const until = endInstant(period, timeZone);
  const kept: TicketRow[] = [];
  for (const row of rows) {
    const entries = row.entries.filter((entry) => entry.startedMs >= from && entry.startedMs < until);
    if (entries.length === 0) continue;
    kept.push({
      ticket: row.ticket,
      entries,
      totalSeconds: entries.reduce((sum, entry) => sum + entry.durationSeconds, 0),
    });
  }
  return sortRows(kept);
}

export function totalOf(rows: TicketRow[]): number {
  return rows.reduce((sum, row) => sum + row.totalSeconds, 0);
}
