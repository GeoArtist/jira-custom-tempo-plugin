import { expect, test } from '@playwright/test';
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
