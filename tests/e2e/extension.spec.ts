// Loads the real, built extension (dist/extension) into Chromium and opens a page on a
// Jira Cloud address. The network is intercepted: the "Jira site" and its REST API are
// answered here, so no real Jira and no sign-in are needed. This proves the parts the demo
// page cannot: the manifest, the content script injection, the session-based requests.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, expect, test, type BrowserContext, type Route } from '@playwright/test';

const EXTENSION = resolve('dist/extension');
const SITE = 'https://example.atlassian.net';

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

// A content script has its own clock, which the test cannot set: the worklogs are logged
// "now", so they always belong to today.
const worklog = (id: string, issueId: string, minutes: number, accountId = 'me') => ({
  id,
  issueId,
  author: { accountId },
  started: new Date().toISOString(),
  timeSpentSeconds: minutes * 60,
});

test('the built folder carries the installation guide, unchanged', () => {
  const guide = 'BrowserInstallation.md';
  expect(readFileSync(resolve(EXTENSION, guide), 'utf8')).toBe(readFileSync(resolve(guide), 'utf8'));
});

/** A context with the extension installed and a fake Jira site behind the Jira address. */
async function jiraWithExtension(
  signedIn: boolean,
): Promise<{ context: BrowserContext; requests: string[]; queries: string[]; urls: string[] }> {
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    args: [`--disable-extensions-except=${EXTENSION}`, `--load-extension=${EXTENSION}`],
    timezoneId: 'Europe/Warsaw',
    viewport: { width: 1280, height: 800 },
  });
  const requests: string[] = [];
  /** The JQL of every search, to see whose time was asked for. */
  const queries: string[] = [];
  /** Every address anything in the browser asked for, whatever the host. */
  const urls: string[] = [];
  context.on('request', (request) => urls.push(request.url()));

  await context.route(`${SITE}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (!url.pathname.startsWith('/rest/')) {
      // A strict policy like a real site's: inline scripts and styles are refused.
      return route.fulfill({
        contentType: 'text/html',
        headers: { 'Content-Security-Policy': "default-src 'self'; style-src 'self'; script-src 'self'" },
        body: '<!doctype html><html lang="en"><head><title>Jira</title></head><body><h1>Jira</h1></body></html>',
      });
    }

    requests.push(`${request.method()} ${url.pathname}`);
    if (url.pathname === '/rest/api/3/myself') {
      return signedIn
        ? json(route, { accountId: 'me', displayName: 'Jan Kowalski', timeZone: 'Europe/Warsaw' })
        : json(route, {}, 401);
    }
    if (url.pathname === '/rest/api/3/user/search') {
      // A colleague, with a picture address the add-on must never ask for.
      return json(route, [
        {
          accountId: 'someone-else',
          accountType: 'atlassian',
          displayName: 'Anna Nowak',
          active: true,
          emailAddress: '',
          avatarUrls: { '48x48': 'https://avatars.invalid/someone-else/48' },
        },
      ]);
    }
    if (url.pathname === '/rest/api/3/search/jql') {
      queries.push(url.searchParams.get('jql') ?? '');
      return json(route, {
        isLast: true,
        issues: [
          { id: '1', key: 'AM-10234', fields: { summary: 'Integracja z API' } },
          { id: '2', key: 'AM-20012', fields: { summary: 'Daily standup' } },
        ],
      });
    }
    if (url.pathname === '/rest/api/3/issue/1/worklog') {
      const worklogs = [worklog('1', '1', 210), worklog('2', '1', 60, 'someone-else')];
      return json(route, { startAt: 0, maxResults: 5000, total: worklogs.length, worklogs });
    }
    if (url.pathname === '/rest/api/3/issue/2/worklog') {
      const worklogs = [worklog('3', '2', 45)];
      return json(route, { startAt: 0, maxResults: 5000, total: worklogs.length, worklogs });
    }
    return json(route, {}, 404);
  });

  return { context, requests, queries, urls };
}

test.describe('the built extension on a Jira Cloud address', () => {
  test.skip(() => !existsSync(resolve(EXTENSION, 'manifest.json')), 'run `vp run build` first');

  test('adds the launcher and the panel to the page and reads with the page session', async () => {
    const { context, requests } = await jiraWithExtension(true);
    try {
      const page = await context.newPage();
      await page.goto(`${SITE}/jira/your-work`);

      const launcher = page.locator('.wt-launcher');
      await expect(launcher).toHaveText('Dziś: 4h 15m');
      // The styles arrived despite the page's strict content security policy.
      expect(await launcher.evaluate((node) => getComputedStyle(node).position)).toBe('fixed');

      await launcher.click();
      await expect(page.locator('.wt-title .wt-total')).toHaveText('4h 15m');
      await expect(page.locator('.wt-table tbody a.wt-key')).toHaveText(['AM-10234', 'AM-20012']);
      await expect(page.locator('.wt-table tbody a.wt-key').first()).toHaveAttribute('href', `${SITE}/browse/AM-10234`);

      // Only reads, and only the three documented endpoints.
      expect(requests.every((request) => request.startsWith('GET '))).toBe(true);
      expect([...new Set(requests)].sort()).toEqual([
        'GET /rest/api/3/issue/1/worklog',
        'GET /rest/api/3/issue/2/worklog',
        'GET /rest/api/3/myself',
        'GET /rest/api/3/search/jql',
      ]);
    } finally {
      await context.close();
    }
  });

  test('shows the time of a colleague, reading only from the Jira site', async () => {
    const { context, requests, queries, urls } = await jiraWithExtension(true);
    try {
      const page = await context.newPage();
      await page.goto(`${SITE}/jira/your-work`);
      const launcher = page.locator('.wt-launcher');
      await launcher.click();
      await expect(page.locator('.wt-person')).toHaveText('Jan Kowalski');

      await page.getByRole('button', { name: 'Ustawienia' }).click();
      await page.getByRole('radio', { name: 'Inny użytkownik' }).check();
      await page.locator('#wt-person-name').fill('anna nowak');
      await page.locator('.wt-popover__actions .wt-button--primary').click();

      await expect(page.locator('.wt-person')).toHaveText('Anna Nowak');
      await expect(page.locator('.wt-title .wt-total')).toHaveText('1h 00m');
      await expect(page.locator('.wt-table tbody a.wt-key')).toHaveText(['AM-10234']);
      await expect(launcher).toHaveText('Anna Nowak · Dziś: 1h 00m');
      expect(queries.at(-1)).toContain('worklogAuthor = "someone-else"');

      // Only reads (002 FR-005), only the documented endpoints, and nothing outside the
      // Jira site: no picture was asked for.
      expect(requests.every((request) => request.startsWith('GET '))).toBe(true);
      expect([...new Set(requests)].sort()).toEqual([
        'GET /rest/api/3/issue/1/worklog',
        'GET /rest/api/3/issue/2/worklog',
        'GET /rest/api/3/myself',
        'GET /rest/api/3/search/jql',
        'GET /rest/api/3/user/search',
      ]);
      expect(requests.filter((request) => request.endsWith('/user/search'))).toHaveLength(1);
      expect(urls.filter((url) => !url.startsWith(SITE) && !url.startsWith('chrome-extension://'))).toEqual([]);
    } finally {
      await context.close();
    }
  });

  test('keeps the selected period when minimised with the launcher, until the reset or the close button', async () => {
    const { context } = await jiraWithExtension(true);
    try {
      const page = await context.newPage();
      await page.goto(`${SITE}/jira/your-work`);
      const launcher = page.locator('.wt-launcher');
      const pressed = (name: string) => page.getByRole('button', { name, exact: true });

      await launcher.click();
      await page.getByRole('button', { name: 'Poprzedni okres' }).click();
      await expect(pressed('Dzień')).toHaveAttribute('aria-pressed', 'true');
      const day = await page.locator('#wt-day').inputValue();

      // Three rounds of minimise and reopen with the launcher: the period stays.
      for (let round = 0; round < 3; round += 1) {
        await launcher.click();
        await expect(page.locator('.wt-panel')).toBeHidden();
        await expect(launcher).not.toContainText('Dziś');
        await launcher.click();
        await expect(page.locator('.wt-panel')).toBeVisible();
        await expect(pressed('Dzień')).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('#wt-day')).toHaveValue(day);
      }

      // A custom range survives too.
      await pressed('Miesiąc').click();
      await launcher.click();
      await expect(launcher).toContainText('Zakres:');
      await launcher.click();
      await expect(pressed('Miesiąc')).toHaveAttribute('aria-pressed', 'true');

      // The header has two rows: the window buttons, and the toolbar under them (004).
      await expect(page.locator('.wt-header__window button')).toHaveCount(2);
      await expect(page.locator('.wt-header__tools button')).toHaveCount(5);

      // The reset button goes back to today with the panel open.
      const reset = pressed('Resetuj');
      await expect(reset).toBeEnabled();
      await reset.click();
      await expect(page.locator('.wt-panel')).toBeVisible();
      await expect(pressed('Dzień')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('#wt-day')).not.toHaveValue(day);
      await expect(launcher).toHaveText('Dziś: 4h 15m');
      await expect(reset).toBeDisabled();

      // The close button goes back to today as well, as before.
      await pressed('Miesiąc').click();
      await expect(reset).toBeEnabled();
      await page.getByRole('button', { name: 'Zamknij' }).click();
      await expect(launcher).toHaveText('Dziś: 4h 15m');
      await launcher.click();
      await expect(page.locator('.wt-chip[aria-pressed="true"]')).toHaveText(['Dzień']);
      await expect(page.locator('#wt-day')).not.toHaveValue(day);
    } finally {
      await context.close();
    }
  });

  test('stays out of the way when nobody is signed in', async () => {
    const { context, requests } = await jiraWithExtension(false);
    try {
      const page = await context.newPage();
      await page.goto(`${SITE}/login`);
      await expect(page.getByRole('heading', { name: 'Jira' })).toBeVisible();
      await expect.poll(() => requests).toEqual(['GET /rest/api/3/myself']);
      await expect(page.locator('.wt-root')).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test('saves the table as a CSV and as an XLSX file, without a request and without a permission', async () => {
    const { context, requests, urls } = await jiraWithExtension(true);
    try {
      const page = await context.newPage();
      await page.goto(`${SITE}/jira/your-work`);
      await page.locator('.wt-launcher').click();
      await expect(page.locator('.wt-table tbody a.wt-key')).toHaveText(['AM-10234', 'AM-20012']);
      const control = page.locator('.wt-export__button');
      await expect(control).toBeVisible();

      // The content script has its own clock: the name carries the real day, in Warsaw.
      const [day, month, year] = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Warsaw' })
        .format(new Date())
        .split('/');
      const base = `Jan_Kowalski_${day}-${month}-${year}_tempo_report`;
      const before = { requests: requests.length, urls: urls.filter((url) => !url.startsWith('blob:')).length };

      await control.click();
      const [csv] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('menuitem', { name: 'Eksport do pliku CSV' }).click(),
      ]);
      expect(csv.suggestedFilename()).toBe(`${base}.csv`);
      const text = readFileSync(await csv.path());
      expect([...text.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
      const lines = text.subarray(3).toString('utf8').split('\r\n');
      expect(lines[0]).toBe('Zgłoszenie;Tytuł;Czas wpisów;Suma');
      expect(lines.slice(1, 3).map((line) => line.split(';')[0])).toEqual(['AM-10234', 'AM-20012']);

      await control.click();
      const [xlsx] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('menuitem', { name: 'Eksport do pliku XLSX' }).click(),
      ]);
      expect(xlsx.suggestedFilename()).toBe(`${base}.xlsx`);
      expect([...readFileSync(await xlsx.path()).subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);

      // The page's strict content security policy did not stand in the way, and nothing was
      // asked of Jira or of anybody else for the files (003 FR-012, SC-009).
      await expect(page.locator('.wt-export__message')).toBeHidden();
      expect(requests).toHaveLength(before.requests);
      expect(urls.filter((url) => !url.startsWith('blob:'))).toHaveLength(before.urls);

      const manifest = JSON.parse(readFileSync(resolve(EXTENSION, 'manifest.json'), 'utf8')) as Record<string, unknown>;
      expect([manifest.permissions, manifest.host_permissions, manifest.optional_permissions]).toEqual([
        undefined,
        undefined,
        undefined,
      ]);
    } finally {
      await context.close();
    }
  });

  test('does not run on Confluence pages of the same site', async () => {
    const { context, requests } = await jiraWithExtension(true);
    try {
      const page = await context.newPage();
      await page.goto(`${SITE}/wiki/spaces/TEAM`);
      await expect(page.getByRole('heading', { name: 'Jira' })).toBeVisible();
      await page.waitForTimeout(500);
      expect(requests).toEqual([]);
      await expect(page.locator('#jira-custom-tempo')).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
});
