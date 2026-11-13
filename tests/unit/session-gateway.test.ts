import { describe, expect, it } from 'vite-plus/test';
import { HttpError } from '../../src/jira/gateway';
import { createGateway } from '../../src/jira/session-gateway';
import { response, type FakeReply } from '../fake-gateway';

/** A fetch stand-in that records what it was asked for. */
function fakeFetch(reply: FakeReply) {
  const calls: Array<{ input: string; init: RequestInit | undefined }> = [];
  const fetchFn = async (input: string, init?: RequestInit) => {
    calls.push({ input, init });
    return response(reply);
  };
  return { fetchFn, calls };
}

describe('session gateway', () => {
  it("reads with the user's own Jira session and never writes", async () => {
    const { fetchFn, calls } = fakeFetch({ json: {} });
    const gateway = createGateway('https://example.atlassian.net', fetchFn);
    await gateway.request('/rest/api/3/search/jql?jql=x');

    expect(calls).toHaveLength(1);
    // A path on the Jira site itself: the browser attaches the session, the add-on holds none.
    expect(calls[0]?.input).toBe('/rest/api/3/search/jql?jql=x');
    expect(calls[0]?.init).toMatchObject({ method: 'GET', credentials: 'same-origin' });
    expect(calls[0]?.init?.body).toBeUndefined();
  });

  it('describes the signed-in user from the Jira profile', async () => {
    const { fetchFn, calls } = fakeFetch({
      json: { accountId: 'abc', displayName: 'Jan Kowalski', timeZone: 'Europe/Warsaw' },
    });
    const session = await createGateway('https://example.atlassian.net/', fetchFn).getSession();
    expect(calls[0]?.input).toBe('/rest/api/3/myself');
    expect(session).toEqual({
      accountId: 'abc',
      displayName: 'Jan Kowalski',
      timeZone: 'Europe/Warsaw',
      siteUrl: 'https://example.atlassian.net',
    });
  });

  it("falls back to the browser's time zone when the profile has none", async () => {
    const { fetchFn } = fakeFetch({ json: { accountId: 'abc' } });
    const session = await createGateway('https://example.atlassian.net', fetchFn).getSession();
    expect(session.timeZone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
  });

  it('has an empty name when the profile gives none', async () => {
    const { fetchFn } = fakeFetch({ json: { accountId: 'abc' } });
    const session = await createGateway('https://example.atlassian.net', fetchFn).getSession();
    expect(session.displayName).toBe('');
  });

  it('rejects when nobody is signed in', async () => {
    const signedOut = createGateway('https://example.atlassian.net', fakeFetch({ status: 401 }).fetchFn);
    await expect(signedOut.getSession()).rejects.toBeInstanceOf(HttpError);

    const anonymous = createGateway('https://example.atlassian.net', fakeFetch({ json: {} }).fetchFn);
    await expect(anonymous.getSession()).rejects.toMatchObject({ status: 401 });
  });
});
