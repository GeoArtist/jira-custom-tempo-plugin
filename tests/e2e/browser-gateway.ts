// Replaces src/jira/session-gateway.ts in demo builds (see vite.config.ts). It answers like
// Jira from data chosen by the page address:
//   ?scenario=today|empty|error|long-title|h4|h8|h20|week|month|refresh-changes|signed-out
//             |long-name      (the signed-in user has a very long name)
//             |people-many    (12 more people named Kowalski, for the list of people)
//             |people-offline (the search of people fails)
//             |showcase   (a whole year of plausible work, for the screenshots of the README)
//   &delay=<ms>    how long each fake Jira request takes
// With refresh-changes, 30 more minutes appear once the test sets window.__moreLogged.
// Every scenario knows a few colleagues, so the time of another person can be shown
// (specs/002-other-user-worktime/quickstart.md, "Test data").
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
/** Two colleagues with time logged on 6 November 2026. */
const ANNA = 'anna-1';
const PIOTR = 'piotr-1';
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

/** A name of about 60 characters, for the header and the launcher at their narrowest. */
const LONG_NAME = 'Maksymilian Aleksander Konstanty Brzeczyszczykiewicz-Wolski';

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
      // Colleagues: Anna Nowak 6h 00m on two tickets, Piotr Nowakowski 1h 30m.
      log('1', 6, '08:00', 240, ANNA),
      log('3', 6, '13:00', 120, ANNA),
      log('2', 6, '09:00', 90, PIOTR),
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

/**
 * A year that looks like real work: every working day of 2026 up to 6 November has two to
 * four entries on a handful of tickets, a summer holiday is empty, and today is the day of
 * the `today` scenario. The same numbers every time: the "random" values come from a fixed
 * sequence.
 */
function showcase(): Scenario {
  const base = today();
  const issues = [
    ...base.issues,
    issue('4', 'AM-10391', 'Eksport raportu czasu pracy do pliku CSV'),
    issue('5', 'AM-10412', 'Poprawki wydajnosci listy zgloszen'),
    issue('6', 'AM-20034', 'Planowanie sprintu i refinement'),
    issue('7', 'AM-10455', 'Testy automatyczne modulu platnosci'),
  ];
  const logs = base.logs.filter((entry) => entry.started.startsWith('2026-11-06'));

  let seed = 20261106;
  const random = (): number => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const two = (value: number): string => String(value).padStart(2, '0');
  const work = ['1', '3', '4', '5', '7'];

  const last = Date.UTC(2026, 10, 5);
  for (let at = Date.UTC(2026, 0, 2); at <= last; at += 86_400_000) {
    const date = new Date(at);
    const weekday = date.getUTCDay();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    if (weekday === 0 || weekday === 6) continue;
    // Two weeks off in July, and a free day now and then.
    if ((month === 7 && day >= 13 && day <= 24) || random() < 0.04) continue;

    // Poland is on summer time from 29 March to 24 October 2026.
    const summer = (month > 3 && month < 10) || (month === 3 && day >= 29) || (month === 10 && day <= 24);
    const stamp = (minute: number): string =>
      `2026-${two(month)}-${two(day)}T${two(Math.floor(minute / 60))}:${two(minute % 60)}:00.000${summer ? '+0200' : '+0100'}`;
    const add = (issueId: string, minute: number, minutes: number): void => {
      logs.push({
        id: `s${logs.length}`,
        issueId,
        author: { accountId: ME },
        started: stamp(minute),
        timeSpentSeconds: minutes * 60,
      });
    };

    // A short meeting most mornings, then two or three blocks of work: 6 to 11.5 hours.
    let minute = 8 * 60 + Math.floor(random() * 4) * 15;
    if (random() < 0.7) {
      add(weekday === 1 ? '6' : '2', minute, weekday === 1 ? 60 : 15 + Math.floor(random() * 3) * 15);
      minute += 75;
    }
    const total = 360 + Math.floor(random() * random() * 17) * 15 + (random() < 0.3 ? 90 : 0);
    const blocks = 2 + Math.floor(random() * 2);
    let left = total;
    for (let block = 0; block < blocks && left > 0; block += 1) {
      const minutes = block === blocks - 1 ? left : Math.max(30, Math.round((left * (0.3 + random() * 0.4)) / 15) * 15);
      add(work[Math.floor(random() * work.length)] as string, minute, Math.min(minutes, left));
      minute += minutes + 15 + Math.floor(random() * 3) * 15;
      left -= minutes;
    }
  }
  return { issues, logs };
}

function scenario(name: string): Scenario {
  switch (name) {
    case 'showcase':
      return showcase();
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

// ---------------------------------------------------------------- people

/** A user as Jira describes one; only the fields the add-on reads, and a picture it must not load. */
interface FakeUser {
  accountId: string;
  accountType: 'atlassian' | 'app';
  displayName: string;
  active: boolean;
  /** Empty when the person hides the address, as Jira sends it. */
  emailAddress: string;
  avatarUrls: Record<string, string>;
}

const person = (
  accountId: string,
  displayName: string,
  emailAddress = '',
  extra: Partial<FakeUser> = {},
): FakeUser => ({
  accountId,
  accountType: 'atlassian',
  displayName,
  active: true,
  emailAddress,
  // The add-on shows no pictures: a request to this address would fail a test.
  avatarUrls: { '48x48': `https://avatars.invalid/${accountId}/48` },
  ...extra,
});

function people(): FakeUser[] {
  const all = [
    person(ME, scenarioName === 'long-name' ? LONG_NAME : 'Jan Kowalski', 'jan.kowalski@example.com'),
    person(ANNA, 'Anna Nowak', 'anna.nowak@example.com'),
    person('anna-2', 'Anna Nowak', 'a.nowak@example.com'),
    person(PIOTR, 'Piotr Nowakowski'),
    person('jozef-1', 'Józef Śliwiński'),
    person('long-1', 'Aleksandra Konstancja Brzeczyszczykiewicz'),
    person('marta-1', 'Marta Zielińska', '', { active: false }),
    person('bot-1', 'Worklog Bot', '', { accountType: 'app' }),
  ];
  if (scenarioName === 'people-many') {
    const first = [
      'Adam',
      'Barbara',
      'Celina',
      'Dawid',
      'Ewa',
      'Filip',
      'Grażyna',
      'Henryk',
      'Iga',
      'Jakub',
      'Kinga',
      'Lech',
    ];
    all.push(...first.map((name, index) => person(`kowalski-${index}`, `${name} Kowalski`)));
  }
  return all;
}

/** As Jira compares names: no letter case and no diacritical marks. */
const fold = (text: string): string =>
  text.trim().replace(/\s+/g, ' ').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replaceAll('ł', 'l');

/** Jira finds active users whose name, a word of it, or a part of the e-mail address begins with the text. */
function findUsers(query: string): FakeUser[] {
  const wanted = fold(query);
  if (wanted === '') return [];
  return people().filter((user) => {
    if (!user.active) return false;
    const name = fold(user.displayName);
    const words = [...name.split(' '), ...fold(user.emailAddress).split(/[@.]/)];
    return name.startsWith(wanted) || words.some((word) => word !== '' && word.startsWith(wanted));
  });
}

/** The account the search asks for: null for the signed-in user or for no author at all. */
function otherAuthor(path: string): string | null {
  const jql = new URLSearchParams(path.split('?')[1] ?? '').get('jql') ?? '';
  return /worklogAuthor = "([^"]+)"/.exec(jql)?.[1] ?? null;
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
        // Another person: only the tickets they logged time on, as Jira answers.
        const author = otherAuthor(path);
        const issues = author
          ? current.issues.filter((item) =>
              current.logs.some((entry) => entry.issueId === item.id && entry.author.accountId === author),
            )
          : current.issues;
        return reply(200, { issues, isLast: true });
      }

      if (path.startsWith('/rest/api/3/user/search')) {
        if (scenarioName === 'people-offline') return reply(500);
        return reply(200, findUsers(new URLSearchParams(path.split('?')[1] ?? '').get('query') ?? ''));
      }
      if (path.startsWith('/rest/api/3/user?')) {
        const accountId = new URLSearchParams(path.split('?')[1] ?? '').get('accountId');
        const user = people().find((candidate) => candidate.accountId === accountId);
        return user ? reply(200, user) : reply(404);
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
      return {
        accountId: ME,
        displayName: scenarioName === 'long-name' ? LONG_NAME : 'Jan Kowalski',
        timeZone: 'Europe/Warsaw',
        siteUrl: 'https://example.atlassian.net',
      };
    },
  };
}
