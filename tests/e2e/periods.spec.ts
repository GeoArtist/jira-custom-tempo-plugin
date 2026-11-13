import { expect, test } from '@playwright/test';
import {
  chip,
  expectInsideWindow,
  footerTotal,
  launcher,
  openPanel,
  paintedColour,
  rows,
  selectDay,
  titleTotal,
} from './helpers';

test('a week shows dated entries, a range title, the bar chart, and neutral totals', async ({ page }) => {
  await openPanel(page);
  await chip(page, 'Ten tydzień').click();

  await expect(page.locator('.wt-title')).toHaveText('02-11-2026 – 08-11-2026 · 22h 40m');
  await expect(chip(page, 'Ten tydzień')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#wt-from')).toHaveValue('2026-11-02T00:00');
  await expect(page.locator('#wt-to')).toHaveValue('2026-11-08T23:59');
  await expect(rows(page)).toHaveCount(3);
  await expect(page.locator('.wt-entries li').first()).toHaveText('02-11 08:00–16:00 · 8h 00m');

  // No norm for several days: the chart in place of the bar, totals in the normal text
  // colour (FR-019, FR-076).
  await expect(page.locator('.wt-progress')).toHaveClass(/wt-progress--chart/);
  await expect(page.locator('.wt-progress__bar')).toBeHidden();
  await expect(page.locator('.wt-chart__bar')).toHaveCount(7);
  const text = await paintedColour(page.locator('.wt-title__text'));
  expect(await paintedColour(titleTotal(page))).toEqual(text);
  expect(await paintedColour(footerTotal(page))).toEqual(text);
  // The launcher follows the panel: a range, in the normal text colour.
  await expect(launcher(page)).toHaveText('Zakres: 22h 40m');
  expect(await paintedColour(launcher(page).locator('.wt-total'))).toEqual(text);
  await expectInsideWindow(page);

  await selectDay(page, '2026-11-06');
  await expect(page.locator('.wt-title')).toHaveText('Piątek 06-11-2026 · 10h 10m');
  await expect(page.locator('.wt-progress')).not.toHaveClass(/wt-progress--chart/);
  expect(await paintedColour(titleTotal(page))).not.toEqual(text);
});

test('yesterday and the arrows', async ({ page }) => {
  await openPanel(page);
  await chip(page, 'Wczoraj').click();
  await expect(page.locator('.wt-title')).toHaveText('Czwartek 05-11-2026 · 0h 30m');

  await page.getByRole('button', { name: 'Następny okres' }).click();
  await expect(page.locator('.wt-title')).toHaveText('Piątek 06-11-2026 · 10h 10m');
  // Today has no button of its own: the day field names it and no preset is selected.
  await expect(page.locator('#wt-day')).toHaveValue('2026-11-06');
  await expect(page.locator('.wt-chip[aria-pressed="true"]')).toHaveCount(0);

  await page.getByRole('button', { name: 'Poprzedni okres' }).click();
  await expect(chip(page, 'Wczoraj')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Poprzedni okres' }).click();
  await expect(page.locator('.wt-title__text')).toHaveText('Środa 04-11-2026');
  await expect(page.locator('#wt-day')).toHaveValue('2026-11-04');

  await page.getByRole('button', { name: 'Poprzedni okres' }).click();
  await expect(page.locator('.wt-title__text')).toHaveText('Wtorek 03-11-2026');
  await expect(page.locator('.wt-chip[aria-pressed="true"]')).toHaveCount(0);
});

test('a custom window inside one day filters by start time and keeps the bar active', async ({ page }) => {
  await openPanel(page);
  await page.locator('#wt-from').fill('2026-11-06T10:00');
  await expect(page.locator('.wt-title__text')).toHaveText('Piątek 06-11-2026 10:00–23:59');
  await page.locator('#wt-to').fill('2026-11-06T12:00');

  await expect(page.locator('.wt-title')).toHaveText('Piątek 06-11-2026 10:00–12:00 · 2h 15m');
  await expect(page.locator('.wt-table tbody a.wt-key')).toHaveText(['AM-20012', 'AM-10087']);
  await expect(page.locator('.wt-progress')).not.toHaveClass(/wt-progress--chart/);
  await expect(page.locator('.wt-chip[aria-pressed="true"]')).toHaveCount(0);
  await expectInsideWindow(page);
});

test('a range that ends before it starts is rejected in Polish', async ({ page }) => {
  await openPanel(page);
  await page.locator('#wt-to').fill('2026-11-05T08:00');
  await expect(page.locator('.wt-period .wt-field-error')).toHaveText(
    'Początek „Od” nie może być późniejszy niż koniec „Do”.',
  );
  await expect(page.locator('#wt-to')).toHaveValue('2026-11-06T23:59');
  await expect(page.locator('.wt-title')).toHaveText('Piątek 06-11-2026 · 10h 10m');
});

test('changing "Od" to another day moves "Do" to that day', async ({ page }) => {
  await openPanel(page);
  await chip(page, 'Ten tydzień').click();
  await expect(page.locator('#wt-to')).toHaveValue('2026-11-08T23:59');
  await page.locator('#wt-from').fill('2026-11-05T00:00');
  await expect(page.locator('#wt-to')).toHaveValue('2026-11-05T23:59');
  await expect(page.locator('.wt-title')).toHaveText('Czwartek 05-11-2026 · 0h 30m');
  await expect(chip(page, 'Wczoraj')).toHaveAttribute('aria-pressed', 'true');
});

test('the day field shows one whole day', async ({ page }) => {
  await openPanel(page);
  await expect(page.locator('#wt-day')).toHaveValue('2026-11-06');
  await page.locator('#wt-day').fill('2026-11-05');
  await expect(page.locator('.wt-title')).toHaveText('Czwartek 05-11-2026 · 0h 30m');
  await expect(page.locator('#wt-from')).toHaveValue('2026-11-05T00:00');
  await expect(page.locator('#wt-to')).toHaveValue('2026-11-05T23:59');
});

test('the period box has three rows and the year presets', async ({ page }) => {
  await openPanel(page);
  await expect(page.locator('.wt-period__row')).toHaveCount(3);
  await chip(page, 'Ten rok').click();
  await expect(page.locator('.wt-title__text')).toHaveText('01-01-2026 – 31-12-2026');
  await expect(page.locator('.wt-progress')).toHaveClass(/wt-progress--chart/);
  await expect(page.locator('.wt-chart__bar')).toHaveCount(12);
  await expectInsideWindow(page);
});

test('the period box offers one day with the arrows, four presets, and the range', async ({ page }) => {
  await openPanel(page);
  await expect(page.locator('.wt-period__days .wt-chip')).toHaveCount(2);
  await expect(page.locator('.wt-period__presets .wt-chip')).toHaveText([
    'Wczoraj',
    'Ten tydzień',
    'Ten miesiąc',
    'Ten rok',
  ]);
  await expect(page.locator('label[for="wt-from"] span')).toHaveText('Od:');
  await expect(page.locator('label[for="wt-to"] span')).toHaveText('Do:');
});
