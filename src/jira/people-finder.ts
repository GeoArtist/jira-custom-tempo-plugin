// Looks people up in the Jira site (specs/002-other-user-worktime/contracts/jira-rest.md,
// steps 4 and 5). Only called when the user saves the settings, never while they type:
// Jira's user search has one rate limit for the whole site.
import { isPerson, isValidAccountId, type Person, type PersonCandidate } from '../domain/person';
import { HttpError, type JiraGateway } from './gateway';
import { AbortedError, RequestPool, type PoolOptions } from './request-pool';

const SEARCH_PATH = '/rest/api/3/user/search';
const USER_PATH = '/rest/api/3/user';
/** Enough to know that more people match than the list shows. */
const SEARCH_LIMIT = 50;
/** A check without an answer after this long counts as one that could not be made (FR-045). */
export const CHECK_TIMEOUT_MS = 15_000;

/** The timer functions a check needs; injectable for tests. */
export interface CheckTimers {
  setTimeout(handler: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface CheckOptions extends Pick<PoolOptions, 'sleep' | 'random' | 'maxAttempts'> {
  /** Aborted when the user closes the settings: the result is no longer wanted. */
  signal?: AbortSignal;
  timers?: CheckTimers;
}

/** Jira did not answer in time. */
export class CheckTimeoutError extends Error {
  constructor() {
    super('Jira did not answer the check in time.');
    this.name = 'CheckTimeoutError';
  }
}

const browserTimers: CheckTimers = {
  setTimeout: (handler, ms) => globalThis.setTimeout(handler, ms),
  clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/** The fields read from a Jira user. The pictures in `avatarUrls` are never read (research R8). */
interface RawUser {
  accountId?: unknown;
  accountType?: unknown;
  displayName?: unknown;
  active?: unknown;
  emailAddress?: unknown;
}

/** Only people with an active account can be shown: no app accounts, no customers (FR-017). */
function toCandidate(raw: unknown): PersonCandidate | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const user = raw as RawUser;
  if (user.accountType !== 'atlassian' || user.active === false) return null;
  const person = { accountId: user.accountId, displayName: user.displayName };
  if (!isPerson(person)) return null;
  // Jira sends an empty address for a person who hides it.
  const email = typeof user.emailAddress === 'string' && user.emailAddress !== '' ? user.emailAddress : undefined;
  return email === undefined ? person : { ...person, email };
}

/** Runs one check with the time limit; a superseded or late check rejects. */
async function limited<T>(options: CheckOptions, run: (pool: RequestPool) => Promise<T>): Promise<T> {
  const timers = options.timers ?? browserTimers;
  const outer = options.signal;
  if (outer?.aborted) throw new AbortedError();

  // Stops retries of a request nobody waits for any more.
  const inner = new AbortController();
  const pool = new RequestPool({ ...options, signal: inner.signal, concurrency: 1 });
  const work = run(pool);
  // The race below may leave this promise behind; its late failure is of no interest.
  work.catch(() => {});

  const { promise: stopped, reject: stop } = Promise.withResolvers<never>();
  const timer = timers.setTimeout(() => stop(new CheckTimeoutError()), CHECK_TIMEOUT_MS);
  const onAbort = (): void => stop(new AbortedError());
  outer?.addEventListener('abort', onAbort);

  try {
    return await Promise.race([work, stopped]);
  } finally {
    inner.abort();
    timers.clearTimeout(timer);
    outer?.removeEventListener('abort', onAbort);
  }
}

/**
 * The people Jira returns for a typed name: one request, active accounts of people only.
 * Which of them match the text is decided by `matchPeople`. Rejects when Jira could not be
 * asked; an empty result means nobody was found, also for a user who may not look people up.
 */
export function findPeople(gateway: JiraGateway, text: string, options: CheckOptions = {}): Promise<PersonCandidate[]> {
  const query = text.trim().replace(/\s+/g, ' ');
  const path = `${SEARCH_PATH}?query=${encodeURIComponent(query)}&maxResults=${SEARCH_LIMIT}`;
  return limited(options, async (pool) => {
    const response = await pool.run(() => gateway.request(path));
    if (response.status !== 200) throw new HttpError(response.status, SEARCH_PATH);
    const users: unknown = await response.json();
    if (!Array.isArray(users)) return [];
    return users.map(toCandidate).filter((candidate): candidate is PersonCandidate => candidate !== null);
  });
}

/**
 * One person by account ID, with the name Jira has now. Null when they cannot be shown any
 * more: gone, deactivated, or not visible to this user (FR-036). Rejects when Jira could
 * not be asked.
 */
export function getPerson(gateway: JiraGateway, accountId: string, options: CheckOptions = {}): Promise<Person | null> {
  // An ID that is not one is never sent.
  if (!isValidAccountId(accountId)) return Promise.resolve(null);
  const path = `${USER_PATH}?accountId=${encodeURIComponent(accountId)}`;
  return limited(options, async (pool) => {
    const response = await pool.run(() => gateway.request(path));
    if (response.status === 404 || response.status === 403) return null;
    if (response.status !== 200) throw new HttpError(response.status, USER_PATH);
    const candidate = toCandidate(await response.json());
    return candidate ? { accountId: candidate.accountId, displayName: candidate.displayName } : null;
  });
}
