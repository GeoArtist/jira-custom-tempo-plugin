import { describe, expect, it } from 'vite-plus/test';
import { customPeriod, presetPeriod, type Period } from '../../src/domain/period';
import { HttpError } from '../../src/jira/gateway';
import { buildJql, loadPeriod } from '../../src/jira/worklog-loader';
import { FakeGateway, fakeSession, FIXTURE_NOW, SEARCH, todayRoutes, worklogPath } from '../fake-gateway';
import empty from '../fixtures/search-empty.json';
import page1 from '../fixtures/search-page1.json';
import page2 from '../fixtures/search-page2.json';
import search from '../fixtures/search-today.json';
import paged1 from '../fixtures/worklogs-paged-1.json';
import paged2 from '../fixtures/worklogs-paged-2.json';

const today = presetPeriod('today', fakeSession.timeZone, FIXTURE_NOW);
const noWait = { sleep: async () => {} };

describe('buildJql', () => {
  it('pads the dates by one day on each side', () => {
    expect(buildJql(today, true)).toBe(
      'worklogAuthor = currentUser() AND worklogDate >= "2026-11-05" AND worklogDate <= "2026-11-07"',
    );
    expect(buildJql(today, false)).toBe('worklogDate >= "2026-11-05" AND worklogDate <= "2026-11-07"');
  });

  it('names another person by their account ID in double quotes', () => {
    expect(buildJql(today, true, '712020:abc-1')).toBe(
      'worklogAuthor = "712020:abc-1" AND worklogDate >= "2026-11-05" AND worklogDate <= "2026-11-07"',
    );
    expect(buildJql(today, false, '712020:abc-1')).toBe('worklogDate >= "2026-11-05" AND worklogDate <= "2026-11-07"');
  });

  it('never writes an account ID that could change the query', () => {
    const dates = 'worklogDate >= "2026-11-05" AND worklogDate <= "2026-11-07"';
    expect(buildJql(today, true, 'x" OR project = "SECRET')).toBe(dates);
    expect(buildJql(today, true, '')).toBe(dates);
  });
});

describe('loadPeriod', () => {
  it('loads the recorded day', async () => {
    const gateway = new FakeGateway(todayRoutes());
    const rows = await loadPeriod(gateway, fakeSession, today);
    expect(rows.map((row) => [row.ticket.key, row.totalSeconds])).toEqual([
      ['AM-10234', 24900],
      ['AM-20012', 6300],
      ['AM-10087', 5400],
    ]);
  });

  it('sends exactly the documented requests', async () => {
    const gateway = new FakeGateway(todayRoutes());
    await loadPeriod(gateway, fakeSession, today);

    expect(gateway.searches()).toHaveLength(1);
    const query = gateway.searches()[0]?.query;
    expect(query?.get('jql')).toBe(buildJql(today, true));
    expect(query?.get('fields')).toBe('summary');
    expect(query?.get('maxResults')).toBe('100');
    expect(query?.has('nextPageToken')).toBe(false);

    const from = Date.parse('2026-11-06T00:00:00+01:00');
    const until = Date.parse('2026-11-07T00:00:00+01:00');
    const paths = gateway.worklogRequests().map((request) => request.path);
    expect(paths.sort()).toEqual(
      ['10001', '10002', '10003'].map(
        (id) => `${worklogPath(id)}?startedAfter=${from - 1}&startedBefore=${until + 1}&maxResults=5000&startAt=0`,
      ),
    );
    // Nothing else is requested: one search plus one worklog request per ticket.
    expect(gateway.requests).toHaveLength(4);
  });

  it('follows nextPageToken until the last search page', async () => {
    const gateway = new FakeGateway(todayRoutes()).add({
      path: SEARCH,
      reply: (request) => ({ json: request.query.has('nextPageToken') ? page2 : page1 }),
    });
    const rows = await loadPeriod(gateway, fakeSession, today);
    expect(gateway.searches()).toHaveLength(2);
    expect(gateway.searches()[1]?.query.get('nextPageToken')).toBe('token-2');
    expect(rows).toHaveLength(3);
  });

  it('pages through the worklogs of one issue', async () => {
    const gateway = new FakeGateway(todayRoutes()).add({
      path: worklogPath('10003'),
      reply: (request) => ({ json: request.query.get('startAt') === '0' ? paged1 : paged2 }),
    });
    const rows = await loadPeriod(gateway, fakeSession, today);
    expect(gateway.sent(worklogPath('10003')).map((request) => request.query.get('startAt'))).toEqual(['0', '1']);
    expect(rows.find((row) => row.ticket.key === 'AM-10087')?.entries.map((entry) => entry.id)).toEqual(['20', '21']);
  });

  it('repeats the search without worklogAuthor when Jira rejects it', async () => {
    const gateway = new FakeGateway(todayRoutes()).add({
      path: SEARCH,
      reply: (request) =>
        request.query.get('jql')?.includes('worklogAuthor')
          ? { status: 400, json: { errorMessages: ["Field 'worklogAuthor' does not exist"] } }
          : { json: search },
    });
    const rows = await loadPeriod(gateway, fakeSession, today);
    expect(gateway.searches().map((request) => request.query.get('jql'))).toEqual([
      buildJql(today, true),
      buildJql(today, false),
    ]);
    expect(rows).toHaveLength(3);
  });

  it('skips an issue the user can no longer see', async () => {
    const gateway = new FakeGateway(todayRoutes()).add({ path: worklogPath('10002'), reply: { status: 404 } });
    const rows = await loadPeriod(gateway, fakeSession, today);
    expect(rows.map((row) => row.ticket.key)).toEqual(['AM-10234', 'AM-10087']);
  });

  it('fails the load on a server error', async () => {
    const worklogFails = new FakeGateway(todayRoutes()).add({ path: worklogPath('10002'), reply: { status: 500 } });
    await expect(loadPeriod(worklogFails, fakeSession, today)).rejects.toBeInstanceOf(HttpError);

    const searchFails = new FakeGateway([{ path: SEARCH, reply: { status: 401 } }]);
    await expect(loadPeriod(searchFails, fakeSession, today)).rejects.toMatchObject({ status: 401 });
  });

  it('fails the load when Jira keeps answering 429', async () => {
    const gateway = new FakeGateway([{ path: SEARCH, reply: { status: 429 } }]);
    await expect(loadPeriod(gateway, fakeSession, today, noWait)).rejects.toMatchObject({ status: 429 });
    expect(gateway.searches()).toHaveLength(4);
  });

  it('returns no rows when nothing was logged', async () => {
    const gateway = new FakeGateway([{ path: SEARCH, reply: { json: empty } }]);
    expect(await loadPeriod(gateway, fakeSession, today)).toEqual([]);
    expect(gateway.worklogRequests()).toHaveLength(0);
  });

  it('asks for the exact window of a custom range', async () => {
    const window = customPeriod(
      { date: today.from.date, minuteOfDay: 600 },
      { date: today.from.date, minuteOfDay: 720 },
    ) as Period;
    const gateway = new FakeGateway(todayRoutes());
    const rows = await loadPeriod(gateway, fakeSession, window);
    const from = Date.parse('2026-11-06T10:00:00+01:00');
    const until = Date.parse('2026-11-06T12:01:00+01:00');
    expect(gateway.worklogRequests()[0]?.path).toContain(`startedAfter=${from - 1}&startedBefore=${until + 1}`);
    // Only entries starting 10:00 to 12:00: AM-20012 10:30 (45m) and AM-10087 11:00 (1h 30m).
    expect(rows.map((row) => [row.ticket.key, row.totalSeconds])).toEqual([
      ['AM-20012', 2700],
      ['AM-10087', 5400],
    ]);
  });
});

describe('loadPeriod for another person', () => {
  const OTHER = 'someone-else';

  it('asks for that person and keeps only their worklogs', async () => {
    const gateway = new FakeGateway(todayRoutes());
    const rows = await loadPeriod(gateway, fakeSession, today, { authorId: OTHER });

    expect(gateway.searches()[0]?.query.get('jql')).toBe(buildJql(today, true, OTHER));
    // The recorded day has one hour by another author on the first ticket.
    expect(rows.map((row) => [row.ticket.key, row.totalSeconds])).toEqual([['AM-10234', 3600]]);
  });

  it('keeps `currentUser()` in the query when the person is the signed-in user', async () => {
    const gateway = new FakeGateway(todayRoutes());
    await loadPeriod(gateway, fakeSession, today, { authorId: fakeSession.accountId });
    expect(gateway.searches()[0]?.query.get('jql')).toBe(buildJql(today, true));
  });

  it('repeats the search without the author when Jira rejects it, with the same result', async () => {
    const gateway = new FakeGateway(todayRoutes()).add({
      path: SEARCH,
      reply: (request) => (request.query.get('jql')?.includes('worklogAuthor') ? { status: 400 } : { json: search }),
    });
    const rows = await loadPeriod(gateway, fakeSession, today, { authorId: OTHER });

    expect(gateway.searches().map((request) => request.query.get('jql'))).toEqual([
      buildJql(today, true, OTHER),
      buildJql(today, false),
    ]);
    expect(rows.map((row) => [row.ticket.key, row.totalSeconds])).toEqual([['AM-10234', 3600]]);
  });
});
