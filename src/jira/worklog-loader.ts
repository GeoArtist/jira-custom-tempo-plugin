// Reads the current user's worklogs for a period (contracts/jira-rest.md).
import { formatIsoDate } from '../domain/format';
import { addDays } from '../domain/local-date';
import { endInstant, startInstant, type Period } from '../domain/period';
import { buildRows, type RawIssue, type RawWorklog, type TicketRow } from '../domain/worklog';
import { HttpError, type JiraGateway, type Session } from './gateway';
import { RequestPool, type PoolOptions } from './request-pool';

const SEARCH_PATH = '/rest/api/3/search/jql';
const SEARCH_PAGE_SIZE = 100;
const WORKLOG_PAGE_SIZE = 5000;

interface SearchPage {
  issues?: RawIssue[];
  nextPageToken?: string;
  isLast?: boolean;
}

interface WorklogPage {
  startAt?: number;
  total?: number;
  worklogs?: RawWorklog[];
}

export interface LoadOptions extends PoolOptions {}

/**
 * The candidate query. The dates are padded by one day on each side because the time zone
 * in which Jira evaluates `worklogDate` is not documented; exact filtering happens later.
 */
export function buildJql(period: Period, withAuthor: boolean): string {
  const from = formatIsoDate(addDays(period.from.date, -1));
  const to = formatIsoDate(addDays(period.to.date, 1));
  const dates = `worklogDate >= "${from}" AND worklogDate <= "${to}"`;
  return withAuthor ? `worklogAuthor = currentUser() AND ${dates}` : dates;
}

async function searchIssues(gateway: JiraGateway, pool: RequestPool, jql: string): Promise<RawIssue[]> {
  const issues: RawIssue[] = [];
  let nextPageToken: string | undefined;
  do {
    // GET, not POST: the add-on only ever reads, and a GET needs no cross-site-request token.
    const path =
      `${SEARCH_PATH}?jql=${encodeURIComponent(jql)}&fields=summary&maxResults=${SEARCH_PAGE_SIZE}` +
      (nextPageToken ? `&nextPageToken=${encodeURIComponent(nextPageToken)}` : '');
    const response = await pool.run(() => gateway.request(path));
    if (response.status !== 200) throw new HttpError(response.status, SEARCH_PATH);
    const page = (await response.json()) as SearchPage;
    issues.push(...(page.issues ?? []));
    nextPageToken = page.isLast ? undefined : page.nextPageToken;
  } while (nextPageToken);
  return issues;
}

async function findCandidates(gateway: JiraGateway, pool: RequestPool, period: Period): Promise<RawIssue[]> {
  try {
    return await searchIssues(gateway, pool, buildJql(period, true));
  } catch (error) {
    // `worklogAuthor` is not in the current JQL reference. Without it more issues are
    // scanned, but the author filter in buildRows keeps the result identical.
    if (error instanceof HttpError && error.status === 400) {
      return searchIssues(gateway, pool, buildJql(period, false));
    }
    throw error;
  }
}

async function issueWorklogs(
  gateway: JiraGateway,
  pool: RequestPool,
  issueId: string,
  fromMs: number,
  untilMs: number,
): Promise<RawWorklog[]> {
  const worklogs: RawWorklog[] = [];
  for (let startAt = 0; ;) {
    // Inclusivity of `startedBefore` is not documented: widen by 1 ms, filter exactly later.
    const path =
      `/rest/api/3/issue/${encodeURIComponent(issueId)}/worklog` +
      `?startedAfter=${fromMs - 1}&startedBefore=${untilMs + 1}&maxResults=${WORKLOG_PAGE_SIZE}&startAt=${startAt}`;
    const response = await pool.run(() => gateway.request(path));
    // The issue is no longer visible to the user: it simply contributes nothing.
    if (response.status === 404) return [];
    if (response.status !== 200) throw new HttpError(response.status, path);
    const page = (await response.json()) as WorklogPage;
    const received = page.worklogs ?? [];
    worklogs.push(...received);
    startAt += received.length;
    if (received.length === 0 || startAt >= (page.total ?? 0)) return worklogs;
  }
}

/** Loads the table rows for a period. Rejects when Jira cannot be read. */
export async function loadPeriod(
  gateway: JiraGateway,
  session: Session,
  period: Period,
  options: LoadOptions = {},
): Promise<TicketRow[]> {
  const pool = new RequestPool(options);
  const issues = await findCandidates(gateway, pool, period);
  const fromMs = startInstant(period, session.timeZone);
  const untilMs = endInstant(period, session.timeZone);
  const perIssue = await Promise.all(issues.map((issue) => issueWorklogs(gateway, pool, issue.id, fromMs, untilMs)));
  return buildRows(issues, perIssue.flat(), session, period);
}
