// The only seam between the app and Jira. Production wires it to the signed-in user's
// Jira session (session-gateway.ts); tests wire it to a fake.

export interface GatewayResponse {
  status: number;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
}

/** Who is using the app and where (data-model.md, Session). */
export interface Session {
  accountId: string;
  /** IANA time zone of the user's Jira profile. */
  timeZone: string;
  /** Base URL of the Jira site, without a trailing slash. */
  siteUrl: string;
}

export interface JiraGateway {
  /** Reads from the Jira REST API as the signed-in user. Only GET: the app never writes (FR-050). */
  request(path: string): Promise<GatewayResponse>;
  /** The signed-in user. Rejects when nobody is signed in to Jira on this page. */
  getSession(): Promise<Session>;
}

/** A Jira response with a status the caller cannot recover from. */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, path: string) {
    super(`Jira request failed with status ${status}: ${path}`);
    this.name = 'HttpError';
    this.status = status;
  }
}
