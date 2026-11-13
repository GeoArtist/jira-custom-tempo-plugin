// A JiraGateway for tests: answers from route handlers and records every request.
import type { GatewayResponse, JiraGateway, Session } from '../src/jira/gateway';
import { HttpError } from '../src/jira/gateway';
import search from './fixtures/search-today.json';
import worklogs10001 from './fixtures/worklogs-10001.json';
import worklogs10002 from './fixtures/worklogs-10002.json';
import worklogs10003 from './fixtures/worklogs-10003.json';

export interface RecordedRequest {
  path: string;
  /** The query parameters of the path, decoded. */
  query: URLSearchParams;
}

export interface FakeReply {
  status?: number;
  json?: unknown;
  headers?: Record<string, string>;
}

type Handler = (request: RecordedRequest) => FakeReply | Promise<FakeReply>;

export interface Route {
  /** A path prefix, or a pattern tested against the whole path. */
  path: string | RegExp;
  reply: FakeReply | Handler;
}

export const fakeSession: Session = {
  accountId: 'me',
  timeZone: 'Europe/Warsaw',
  siteUrl: 'https://example.atlassian.net',
};

/** Friday 6 November 2026, 12:00 in Warsaw: the "now" of the recorded fixtures. */
export const FIXTURE_NOW = Date.parse('2026-11-06T12:00:00+01:00');

export function response(reply: FakeReply): GatewayResponse {
  const headers = new Map(Object.entries(reply.headers ?? {}).map(([name, value]) => [name.toLowerCase(), value]));
  return {
    status: reply.status ?? 200,
    headers: { get: (name) => headers.get(name.toLowerCase()) ?? null },
    json: async () => reply.json,
  };
}

export class FakeGateway implements JiraGateway {
  readonly requests: RecordedRequest[] = [];
  session: Session = { ...fakeSession };
  /** When true, nobody is signed in: getSession rejects. */
  signedOut = false;

  private readonly routes: Route[];

  constructor(routes: Route[] = []) {
    this.routes = routes;
  }

  /** Later routes win, so a test can override one answer of a standard set. */
  add(route: Route): this {
    this.routes.push(route);
    return this;
  }

  async request(path: string): Promise<GatewayResponse> {
    const request: RecordedRequest = { path, query: new URLSearchParams(path.split('?')[1] ?? '') };
    this.requests.push(request);
    for (let index = this.routes.length - 1; index >= 0; index -= 1) {
      const route = this.routes[index];
      if (!route) continue;
      const matches = typeof route.path === 'string' ? path.startsWith(route.path) : route.path.test(path);
      if (!matches) continue;
      return response(typeof route.reply === 'function' ? await route.reply(request) : route.reply);
    }
    return response({ status: 404, json: { errorMessages: [`No fake route for ${path}`] } });
  }

  async getSession(): Promise<Session> {
    if (this.signedOut) throw new HttpError(401, '/rest/api/3/myself');
    return this.session;
  }

  /** Requests whose path contains the fragment, for assertions. */
  sent(fragment = ''): RecordedRequest[] {
    return this.requests.filter((request) => request.path.includes(fragment));
  }

  /** The issue searches that were sent. */
  searches(): RecordedRequest[] {
    return this.sent(SEARCH);
  }

  /** The per-issue worklog requests that were sent. */
  worklogRequests(): RecordedRequest[] {
    return this.sent('/worklog');
  }
}

export const SEARCH = '/rest/api/3/search/jql';
export const worklogPath = (issueId: string): string => `/rest/api/3/issue/${issueId}/worklog`;

/** The recorded day from quickstart.md: three tickets, 10h 10m in total. */
export function todayRoutes(): Route[] {
  return [
    { path: SEARCH, reply: { json: search } },
    { path: worklogPath('10001'), reply: { json: worklogs10001 } },
    { path: worklogPath('10002'), reply: { json: worklogs10002 } },
    { path: worklogPath('10003'), reply: { json: worklogs10003 } },
  ];
}

/** Lets pending promise callbacks run. */
export async function flush(times = 20): Promise<void> {
  for (let index = 0; index < times; index += 1) await Promise.resolve();
}
