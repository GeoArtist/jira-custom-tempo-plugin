import { describe, expect, it } from 'vite-plus/test';
import { HttpError } from '../../src/jira/gateway';
import {
  CHECK_TIMEOUT_MS,
  CheckTimeoutError,
  findPeople,
  getPerson,
  type CheckTimers,
} from '../../src/jira/people-finder';
import { AbortedError } from '../../src/jira/request-pool';
import { FakeGateway, type FakeReply } from '../fake-gateway';
import userAnna from '../fixtures/user-anna-nowak.json';
import userInactive from '../fixtures/user-inactive.json';
import none from '../fixtures/users-search-empty.json';
import nowak from '../fixtures/users-search-nowak.json';

const USER_SEARCH = '/rest/api/3/user/search';
const USER = '/rest/api/3/user?';
const noWait = { sleep: async () => {} };

/** Timers the test fires by hand. */
function manualTimers() {
  const pending = new Map<number, { handler: () => void; ms: number }>();
  let nextId = 1;
  const timers: CheckTimers = {
    setTimeout: (handler, ms) => {
      pending.set(nextId, { handler, ms });
      return nextId++;
    },
    clearTimeout: (handle) => void pending.delete(handle as number),
  };
  return {
    timers,
    delays: () => [...pending.values()].map((timer) => timer.ms),
    fire: () => {
      const due = [...pending.entries()];
      for (const [id, timer] of due) {
        pending.delete(id);
        timer.handler();
      }
    },
  };
}

/** An answer the test never gives: Jira stays silent. */
const silent = (): Promise<FakeReply> => new Promise(() => {});

describe('findPeople', () => {
  it('sends one request with the typed text and reads the people in the answer', async () => {
    const gateway = new FakeGateway([{ path: USER_SEARCH, reply: { json: nowak } }]);
    const people = await findPeople(gateway, '  Anna   Nowak ');

    expect(gateway.requests).toHaveLength(1);
    expect(gateway.requests[0]?.path).toBe('/rest/api/3/user/search?query=Anna%20Nowak&maxResults=50');
    // No app account and no deactivated one; an empty address counts as none.
    expect(people).toEqual([
      { accountId: '712020:anna-1', displayName: 'Anna Nowak', email: 'anna.nowak@example.com' },
      { accountId: '712020:anna-2', displayName: 'Anna Nowak', email: 'a.nowak@example.com' },
      { accountId: '712020:piotr-1', displayName: 'Piotr Nowakowski' },
    ]);
  });

  it('encodes Polish letters and symbols in the text', async () => {
    const gateway = new FakeGateway([{ path: USER_SEARCH, reply: { json: none } }]);
    await findPeople(gateway, 'Żółć & "x"%');
    expect(gateway.requests[0]?.path).toBe(
      `/rest/api/3/user/search?query=${encodeURIComponent('Żółć & "x"%')}&maxResults=50`,
    );
    expect(gateway.requests[0]?.query.get('query')).toBe('Żółć & "x"%');
  });

  it('finds nobody when Jira returns nothing, as for a user who may not look people up', async () => {
    const gateway = new FakeGateway([{ path: USER_SEARCH, reply: { json: none } }]);
    expect(await findPeople(gateway, 'Jan')).toEqual([]);
    const odd = new FakeGateway([{ path: USER_SEARCH, reply: { json: { errorMessages: [] } } }]);
    expect(await findPeople(odd, 'Jan')).toEqual([]);
  });

  it('drops users without a usable account ID or name', async () => {
    const gateway = new FakeGateway([
      {
        path: USER_SEARCH,
        reply: {
          json: [
            { accountId: 'a"b', accountType: 'atlassian', displayName: 'Bad Id', active: true },
            { accountId: 'ok-1', accountType: 'atlassian', displayName: '', active: true },
            { accountId: 'ok-2', accountType: 'customer', displayName: 'A Customer', active: true },
            { accountId: 'ok-3', accountType: 'atlassian', displayName: 'Good One' },
            null,
          ],
        },
      },
    ]);
    expect(await findPeople(gateway, 'x')).toEqual([{ accountId: 'ok-3', displayName: 'Good One' }]);
  });

  it.each([401, 403, 500])('rejects when Jira answers %i', async (status) => {
    const gateway = new FakeGateway([{ path: USER_SEARCH, reply: { status } }]);
    await expect(findPeople(gateway, 'Anna')).rejects.toBeInstanceOf(HttpError);
  });

  it('waits and tries again when Jira asks it to slow down', async () => {
    let calls = 0;
    const gateway = new FakeGateway([
      {
        path: USER_SEARCH,
        reply: () => {
          calls += 1;
          return calls === 1 ? { status: 429, headers: { 'Retry-After': '1' } } : { json: nowak };
        },
      },
    ]);
    expect(await findPeople(gateway, 'Nowak', noWait)).toHaveLength(3);
    expect(gateway.requests).toHaveLength(2);
  });

  it('gives up after 15 seconds without an answer', async () => {
    const gateway = new FakeGateway([{ path: USER_SEARCH, reply: silent }]);
    const timer = manualTimers();
    const check = findPeople(gateway, 'Anna', { timers: timer.timers });
    expect(CHECK_TIMEOUT_MS).toBe(15_000);
    expect(timer.delays()).toEqual([15_000]);
    timer.fire();
    await expect(check).rejects.toBeInstanceOf(CheckTimeoutError);
  });

  it('clears its timer when the answer arrives in time', async () => {
    const gateway = new FakeGateway([{ path: USER_SEARCH, reply: { json: nowak } }]);
    const timer = manualTimers();
    await findPeople(gateway, 'Anna', { timers: timer.timers });
    expect(timer.delays()).toEqual([]);
  });

  it('stops when the settings are closed meanwhile', async () => {
    const gateway = new FakeGateway([{ path: USER_SEARCH, reply: silent }]);
    const abort = new AbortController();
    const check = findPeople(gateway, 'Anna', { signal: abort.signal, timers: manualTimers().timers });
    abort.abort();
    await expect(check).rejects.toBeInstanceOf(AbortedError);

    const late = new AbortController();
    late.abort();
    await expect(findPeople(gateway, 'Anna', { signal: late.signal })).rejects.toBeInstanceOf(AbortedError);
  });
});

describe('getPerson', () => {
  it('reads one person by account ID, with the name Jira has now', async () => {
    const gateway = new FakeGateway([{ path: USER, reply: { json: userAnna } }]);
    const person = await getPerson(gateway, '712020:anna-1');
    expect(gateway.requests.map((request) => request.path)).toEqual(['/rest/api/3/user?accountId=712020%3Aanna-1']);
    expect(person).toEqual({ accountId: '712020:anna-1', displayName: 'Anna Nowak-Kowalska' });
  });

  it('gives nobody for a deactivated person', async () => {
    const gateway = new FakeGateway([{ path: USER, reply: { json: userInactive } }]);
    expect(await getPerson(gateway, '712020:old-1')).toBeNull();
  });

  it('gives nobody for an app account', async () => {
    const gateway = new FakeGateway([
      { path: USER, reply: { json: { accountId: 'bot-1', accountType: 'app', displayName: 'Bot', active: true } } },
    ]);
    expect(await getPerson(gateway, 'bot-1')).toBeNull();
  });

  it.each([404, 403])('gives nobody when Jira answers %i', async (status) => {
    const gateway = new FakeGateway([{ path: USER, reply: { status } }]);
    expect(await getPerson(gateway, 'abc')).toBeNull();
  });

  it.each([401, 500])('rejects when Jira answers %i', async (status) => {
    const gateway = new FakeGateway([{ path: USER, reply: { status } }]);
    await expect(getPerson(gateway, 'abc')).rejects.toBeInstanceOf(HttpError);
  });

  it('gives up after 15 seconds without an answer', async () => {
    const gateway = new FakeGateway([{ path: USER, reply: silent }]);
    const timer = manualTimers();
    const check = getPerson(gateway, 'abc', { timers: timer.timers });
    timer.fire();
    await expect(check).rejects.toBeInstanceOf(CheckTimeoutError);
  });

  it('sends nothing for something that is not an account ID', async () => {
    const gateway = new FakeGateway();
    expect(await getPerson(gateway, 'a" OR "b')).toBeNull();
    expect(gateway.requests).toHaveLength(0);
  });
});
