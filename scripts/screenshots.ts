// Takes the screenshots of the README from the demo page with its "showcase" data.
// Usage: node scripts/screenshots.ts   (build the demo first; `vp run screenshots` does both)
// Writes docs/screenshots/*.png.
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Page } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const site = join(root, 'dist-e2e');
const target = join(root, 'docs', 'screenshots');

if (!existsSync(join(site, 'index.html'))) {
  console.error(`Nothing to show: ${site} has no index.html. Run "vp build --mode demo" first.`);
  process.exit(1);
}
mkdirSync(target, { recursive: true });

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
};

// The built demo page, served from this machine only for the time of the run.
const server = createServer((request, response) => {
  const path = normalize(decodeURIComponent((request.url ?? '/').split('?')[0] ?? '/'));
  const file = join(site, path === '/' || path === '\\' ? 'index.html' : path);
  if (!file.startsWith(site) || !existsSync(file)) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  response.end(readFileSync(file));
});
await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
const address = `http://127.0.0.1:${(server.address() as AddressInfo).port}/index.html?scenario=showcase`;

// The date fields are the browser's own: they follow its language, not the page's.
const browser = await chromium.launch({ args: ['--lang=pl-PL'] });

/** A page on the demo with the add-on, on Friday 6 November 2026, 12:00 in Warsaw. */
async function open(theme: 'dark' | 'light'): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
    timezoneId: 'Europe/Warsaw',
    locale: 'pl-PL',
    colorScheme: theme,
  });
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date('2026-11-06T12:00:00+01:00'));
  await page.addInitScript(
    (value) =>
      localStorage.setItem(
        'worktime.settings.v1',
        JSON.stringify({ refreshMinutes: 5, theme: value, panelHeight: 640 }),
      ),
    theme,
  );
  await page.goto(address);
  await page.locator('.wt-launcher').waitFor();
  return page;
}

/** The panel and the launcher with a little of the page around them. */
async function shoot(page: Page, name: string, parts = ['.wt-panel', '.wt-launcher']): Promise<void> {
  // Let hover colours and the spinner settle.
  await page.waitForTimeout(350);
  const boxes = [];
  for (const part of parts) {
    const box = await page.locator(part).first().boundingBox();
    if (box) boxes.push(box);
  }
  const margin = 12;
  const left = Math.max(0, Math.min(...boxes.map((box) => box.x)) - margin);
  const top = Math.max(0, Math.min(...boxes.map((box) => box.y)) - margin);
  const right = Math.max(...boxes.map((box) => box.x + box.width)) + margin;
  const bottom = Math.max(...boxes.map((box) => box.y + box.height)) + margin;
  await page.screenshot({
    path: join(target, `${name}.png`),
    clip: { x: left, y: top, width: Math.min(right, 1280) - left, height: Math.min(bottom, 900) - top },
  });
  console.log(`  docs/screenshots/${name}.png`);
}

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const loaded = (page: Page) => page.locator('.wt-header .wt-button--busy').waitFor({ state: 'detached' });

try {
  const page = await open('dark');

  // The launcher alone, on a Jira page.
  await shoot(page, 'launcher', ['.wt-launcher']);

  // One day: the progress bar against the norm and the table.
  await page.locator('.wt-launcher').click();
  await page.locator('.wt-table tbody tr').first().waitFor();
  await page.mouse.move(0, 0);
  await shoot(page, 'day');

  // The export menu with its two formats, in the total row.
  await page.locator('.wt-export__button').click();
  await page.locator('.wt-export__menu').waitFor();
  await page.mouse.move(0, 0);
  await shoot(page, 'export');
  await page.keyboard.press('Escape');

  // A week: one bar per day, with the tip of the bar under the pointer.
  await button(page, 'Tydzień').click();
  await page.locator('.wt-chart__bar').nth(6).waitFor({ state: 'attached' });
  await loaded(page);
  await page.locator('.wt-chart__col').nth(2).hover();
  await shoot(page, 'week');

  // A year: one bar per month.
  await button(page, 'Rok').click();
  await page.locator('.wt-chart__bar').nth(11).waitFor({ state: 'attached' });
  await loaded(page);
  await page.locator('.wt-chart__col').nth(4).hover();
  await shoot(page, 'year');

  // A click on a month: its days, from the data already loaded; "Cofnij" leads back.
  await page.locator('.wt-chart__col').nth(9).click();
  await page.locator('.wt-chart__bar').nth(30).waitFor({ state: 'attached' });
  await page.locator('.wt-chart__col').nth(14).hover();
  await shoot(page, 'month');

  // The settings.
  await button(page, 'Ustawienia').click();
  await page.locator('.wt-popover').waitFor();
  await page.mouse.move(0, 0);
  await shoot(page, 'settings', ['.wt-panel', '.wt-launcher', '.wt-popover']);
  await page.context().close();

  // The light appearance.
  const light = await open('light');
  await light.locator('.wt-launcher').click();
  await light.locator('.wt-table tbody tr').first().waitFor();
  await button(light, 'Tydzień').click();
  await light.locator('.wt-chart__bar').nth(6).waitFor({ state: 'attached' });
  await loaded(light);
  await light.mouse.move(0, 0);
  await shoot(light, 'light');
  await light.context().close();
} finally {
  await browser.close();
  server.close();
}
