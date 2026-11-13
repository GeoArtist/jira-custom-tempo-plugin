// Talks to Jira from inside a Jira page, with the session the user already has there.
// The extension holds no credentials and asks for none: the browser attaches the user's
// own Jira session to same-origin requests.
import { HttpError, type GatewayResponse, type JiraGateway, type Session } from './gateway';

const MYSELF_PATH = '/rest/api/3/myself';

type Fetch = (input: string, init?: RequestInit) => Promise<GatewayResponse>;

interface Myself {
  accountId?: string;
  displayName?: string;
  timeZone?: string;
}

/** The browser's own time zone, used when the Jira profile does not state one. */
function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function createGateway(
  siteUrl: string = location.origin,
  fetchFn: Fetch = (input, init) => fetch(input, init),
): JiraGateway {
  const request = (path: string): Promise<GatewayResponse> =>
    fetchFn(path, { method: 'GET', credentials: 'same-origin', headers: { Accept: 'application/json' } });

  return {
    request,

    async getSession(): Promise<Session> {
      const response = await request(MYSELF_PATH);
      if (response.status !== 200) throw new HttpError(response.status, MYSELF_PATH);
      const myself = (await response.json()) as Myself;
      if (!myself.accountId) throw new HttpError(401, MYSELF_PATH);
      return {
        accountId: myself.accountId,
        displayName: myself.displayName ?? '',
        timeZone: myself.timeZone || browserTimeZone(),
        siteUrl: siteUrl.replace(/\/+$/, ''),
      };
    },
  };
}
