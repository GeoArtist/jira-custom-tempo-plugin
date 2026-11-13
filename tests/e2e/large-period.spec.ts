import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { unzip } from '../helpers/unzip';
import { chip, expectInsideWindow, footerTotal, openPanel, panel, rows, selectDay } from './helpers';

// SC-009: a month with 200 entries on 60 tickets.
test('a large month is shown completely and stays usable', async ({ page }, testInfo) => {
  await openPanel(page, { scenario: 'month', delay: 5 });

  const started = Date.now();
  await chip(page, 'Miesiąc').click();
  await expect(rows(page)).toHaveCount(60);
  // SC-003: a preset shows its data within 3 seconds.
  expect(Date.now() - started).toBeLessThan(3000);

  await expect(page.locator('.wt-entries li')).toHaveCount(200);
  await expect(footerTotal(page)).toHaveText('100h 00m');
  await expect(page.locator('.wt-title')).toHaveText('01-11-2026 – 30-11-2026 · 100h 00m');
  await expectInsideWindow(page);

  if (testInfo.project.name === 'phone') {
    // On a phone the whole panel scrolls, and the last row and the total are reachable.
    expect(await panel(page).evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true);
    await page.locator('.wt-footer').scrollIntoViewIfNeeded();
    await expect(footerTotal(page)).toBeInViewport();
    await expect(rows(page).last()).toBeInViewport();
  } else {
    // The rows scroll inside their own area; the header, the period controls, and the total
    // stay in view the whole time.
    const scroll = page.locator('.wt-table-scroll');
    expect(await scroll.evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true);
    await scroll.evaluate((node) => node.scrollTo(0, node.scrollHeight));
    await expect(rows(page).last()).toBeInViewport();
    await expect(page.locator('.wt-title')).toBeInViewport();
    await expect(chip(page, 'Miesiąc')).toBeInViewport();
    await expect(footerTotal(page)).toBeInViewport();
  }

  // Still responsive: another period loads right away.
  await selectDay(page, '2026-11-06');
  await expect(page.locator('.wt-title__text')).toHaveText('Piątek 06-11-2026');
});

// 003 SC-001: a table of 500 rows is a file within 2 seconds of the choice, in both formats.
test('500 rows are exported within two seconds', async ({ page }) => {
  test.slow();
  await openPanel(page, { scenario: 'tickets-500', delay: 1 });
  await expect(rows(page)).toHaveCount(500, { timeout: 30_000 });
  const control = page.locator('.wt-export__button');
  await expect(control).toBeEnabled();

  const timed = async (name: 'CSV' | 'XLSX') => {
    await control.click();
    const item = page.getByRole('menuitem', { name: `Eksport do pliku ${name}` });
    await expect(item).toBeVisible();
    const started = Date.now();
    const [download] = await Promise.all([page.waitForEvent('download'), item.click()]);
    const elapsed = Date.now() - started;
    return { elapsed, bytes: readFileSync(await download.path()) };
  };

  const csv = await timed('CSV');
  expect(csv.elapsed).toBeLessThan(2000);
  // The header and one line for each of the 500 tickets.
  expect(csv.bytes.toString('utf8').split('\r\n').slice(0, -1)).toHaveLength(501);

  const xlsx = await timed('XLSX');
  expect(xlsx.elapsed).toBeLessThan(2000);
  const sheet = unzip(new Uint8Array(xlsx.bytes)).get('xl/worksheets/sheet1.xml') ?? '';
  // Three title rows, the header, 500 tickets, and the total row.
  expect(sheet.match(/<row /g)).toHaveLength(505);
});
