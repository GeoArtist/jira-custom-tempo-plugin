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
async function jiraWithExtension(signedIn: boolean): Promise<{ context: BrowserContext; requests: string[] }> {
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    args: [`--disable-extensions-except=${EXTENSION}`, `--load-extension=${EXTENSION}`],
    timezoneId: 'Europe/Warsaw',
    viewport: { width: 1280, height: 800 },
  });
  const requests: string[] = [];

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
      return signedIn ? json(route, { accountId: 'me', timeZone: 'Europe/Warsaw' }) : json(route, {}, 401);
    }
    if (url.pathname === '/rest/api/3/search/jql') {
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

  return { context, requests };
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

  test('keeps the selected period when minimised with the launcher, until the close button', async () => {
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

      // Only the close button goes back to today.
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
