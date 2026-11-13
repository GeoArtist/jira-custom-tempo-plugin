// Replaces src/jira/session-gateway.ts in demo builds (see vite.config.ts). It answers like
// Jira from data chosen by the page address:
//   ?scenario=today|empty|error|long-title|h4|h8|h20|week|month|refresh-changes|signed-out
//   &delay=<ms>    how long each fake Jira request takes
// With refresh-changes, 30 more minutes appear once the test sets window.__moreLogged.
// The tests fix the browser clock at Friday 6 November 2026, 12:00 in Warsaw.
import { HttpError, type GatewayResponse, type JiraGateway, type Session } from '../../src/jira/gateway';

interface Log {
  id: string;
  issueId: string;
  author: { accountId: string };
  started: string;
  timeSpentSeconds: number;
}

interface Issue {
  id: string;
  key: string;
  fields: { summary: string };
}

interface Scenario {
  issues: Issue[];
  logs: Log[];
}

declare global {
  interface Window {
    /** The requests the add-on sent to the fake Jira, for assertions. */
    __jiraRequests: string[];
    /** Set by a test to pretend that more time was logged in Jira meanwhile. */
    __moreLogged?: boolean;
  }
}

const ME = 'me';
const params = new URLSearchParams(location.search);
const scenarioName = params.get('scenario') ?? 'today';

const issue = (id: string, key: string, summary: string): Issue => ({ id, key, fields: { summary } });

let nextLogId = 1;
/** A worklog starting at the given day of November 2026 and clock time, Warsaw winter time. */
function log(issueId: string, day: number, time: string, minutes: number, accountId = ME): Log {
  const id = String(nextLogId);
  nextLogId += 1;
  return {
    id,
    issueId,
    author: { accountId },
    started: `2026-11-${String(day).padStart(2, '0')}T${time}:00.000+0100`,
    timeSpentSeconds: minutes * 60,
  };
}

const LONG_WORD = 'Superdlugaidentyfikacjabezzadnychspacjiktoramusisiezlamac'.repeat(5).slice(0, 255);

function today(): Scenario {
  return {
    issues: [
      issue(
        '1',
        'AM-10234',
        'Integracja z zewnetrznym API platnosci - obsluga zwrotow, czesciowych platnosci, webhookow statusu oraz migracja historycznych transakcji do nowego modelu danych',
      ),
      issue('2', 'AM-20012', 'Daily standup i spotkania'),
      issue('3', 'AM-10087', 'Code review modulu raportow'),
    ],
    logs: [
      log('1', 6, '07:00', 210),
      log('1', 6, '13:00', 60),
      log('1', 6, '15:05', 145),
      log('1', 6, '09:00', 60, 'someone-else'),
      log('2', 6, '10:30', 45),
      log('2', 6, '17:30', 60),
      log('3', 6, '11:00', 90),
      log('2', 5, '09:00', 30),
      log('3', 3, '08:00', 240),
      log('1', 2, '08:00', 480),
    ],
  };
}

function hours(count: number): Scenario {
  return { issues: [issue('1', 'AM-10234', 'Praca nad zadaniem')], logs: [log('1', 6, '00:00', count * 60)] };
}

function month(): Scenario {
  const issues: Issue[] = [];
  const logs: Log[] = [];
  for (let index = 0; index < 60; index += 1) {
    const id = String(100 + index);
    issues.push(issue(id, `AM-${20000 + index}`, `Zadanie numer ${index + 1} z dluzszym opisem zakresu prac`));
  }
  // 200 entries spread over the working days of November 2026.
  for (let index = 0; index < 200; index += 1) {
    const day = 2 + (index % 27);
    const hour = 7 + (Math.floor(index / 27) % 10);
    logs.push(log(String(100 + (index % 60)), day, `${String(hour).padStart(2, '0')}:00`, 30));
  }
  return { issues, logs };
}

function scenario(name: string): Scenario {
  switch (name) {
    case 'empty':
      return { issues: [], logs: [] };
    case 'long-title': {
      const data = today();
      const first = data.issues[0];
      if (first) first.fields.summary = LONG_WORD;
      return data;
    }
    case 'h4':
      return hours(4);
    case 'h8':
      return hours(8);
    case 'h20':
      return hours(20);
    case 'month':
      return month();
    case 'refresh-changes': {
      // Once the test says so, 30 more minutes are logged on the last ticket.
      const data = today();
      if (window.__moreLogged) data.logs.push(log('3', 6, '12:30', 30));
      return data;
    }
    default:
      return today();
  }
}

function reply(status: number, json: unknown = {}): GatewayResponse {
  return { status, headers: { get: () => null }, json: async () => json };
}

export function createGateway(): JiraGateway {
  window.__jiraRequests = [];
  let current: Scenario = scenario(scenarioName);

  return {
    async request(path: string): Promise<GatewayResponse> {
      window.__jiraRequests.push(path);
      // A short delay, so loading states are observable.
      await new Promise((resolve) => setTimeout(resolve, Number(params.get('delay') ?? 20)));
      if (scenarioName === 'error') return reply(500);

      if (path.startsWith('/rest/api/3/search/jql')) {
        nextLogId = 1;
        current = scenario(scenarioName);
        return reply(200, { issues: current.issues, isLast: true });
      }

      const match = /\/issue\/([^/]+)\/worklog\?startedAfter=(-?\d+)&startedBefore=(-?\d+)/.exec(path);
      if (match) {
        const [, issueId, after, before] = match;
        const worklogs = current.logs.filter((entry) => {
          const started = Date.parse(entry.started.replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
          return entry.issueId === issueId && started >= Number(after) && started <= Number(before);
        });
        return reply(200, { startAt: 0, maxResults: 5000, total: worklogs.length, worklogs });
      }
      return reply(404);
    },

    async getSession(): Promise<Session> {
      if (scenarioName === 'signed-out') throw new HttpError(401, '/rest/api/3/myself');
      return { accountId: ME, timeZone: 'Europe/Warsaw', siteUrl: 'https://example.atlassian.net' };
    },
  };
}
