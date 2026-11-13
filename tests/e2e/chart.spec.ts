// The bar chart of a period longer than one day (FR-076 to FR-079).
import { expect, test } from '@playwright/test';
import { chip, expectInsideWindow, openPanel, paintedColour, panel, rows, selectDay } from './helpers';

const bars = '.wt-chart__bar';
const columns = '.wt-chart__col';

test('a week shows one bar per day in place of the progress bar', async ({ page }) => {
  await openPanel(page);
  const day = await panel(page).boundingBox();
  await chip(page, 'Tydzień').click();
  await expect(page.locator('.wt-title')).toHaveText('02-11-2026 – 08-11-2026 · 22h 40m');

  await expect(page.locator('.wt-chart')).toBeVisible();
  await expect(page.locator('.wt-progress__bar')).toBeHidden();
  await expect(page.locator(bars)).toHaveCount(7);
  // The bars add up to the total of the period.
  const seconds = await page
    .locator(columns)
    .evaluateAll((nodes) => nodes.map((node) => Number(node.getAttribute('data-seconds'))));
  expect(seconds.reduce((sum, value) => sum + value, 0)).toBe(22 * 3600 + 40 * 60);

  // The days are named under the bars, the hours at the side.
  await expect(page.locator('.wt-chart__label').first()).toHaveText('02-11');
  await expect(page.locator('.wt-chart__tick').first()).toHaveText('0h');

  // The bars do not touch, and a taller bar stands for more time.
  const boxes = await page.locator(bars).evaluateAll((nodes) =>
    nodes.map((node) => {
      const box = node.getBoundingClientRect();
      return { left: box.left, right: box.right, height: box.height };
    }),
  );
  for (let index = 1; index < boxes.length; index += 1) {
    expect((boxes[index]?.left ?? 0) - (boxes[index - 1]?.right ?? 0)).toBeGreaterThanOrEqual(2);
  }
  const tallest = seconds.indexOf(Math.max(...seconds));
  expect(boxes[tallest]?.height).toBe(Math.max(...boxes.map((box) => box.height)));
  expect(boxes[seconds.indexOf(0)]?.height).toBe(0);

  // The panel keeps its size, and nothing leaves the window.
  expect((await panel(page).boundingBox())?.height).toBe(day?.height);
  await expectInsideWindow(page);

  // One day again: the progress bar is back.
  await selectDay(page, '2026-11-06');
  await expect(page.locator('.wt-chart')).toBeHidden();
  await expect(page.locator('.wt-progress__track')).toBeVisible();
});

test('a bar has the colour of the progress bar for its value, and stands out under the pointer', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === 'phone', 'a phone has no pointer to hover with');
  await openPanel(page);
  await chip(page, 'Tydzień').click();
  await expect(page.locator(bars)).toHaveCount(7);
  await page.mouse.move(0, 0);

  // Friday, 10h 10m, is past the norm: the yellow of the bar, not its blue or green.
  const friday = page.locator(columns).nth(4);
  await expect(friday).toHaveAttribute('data-seconds', String(10 * 3600 + 10 * 60));
  const [red, green, blue] = await paintedColour(friday.locator(bars), 'backgroundColor');
  expect(red).toBeGreaterThan(200);
  expect(green).toBeGreaterThan(150);
  expect(blue).toBeLessThan(120);
  // Thursday, half an hour, is at the blue end.
  const thursday = await paintedColour(page.locator(columns).nth(3).locator(bars), 'backgroundColor');
  expect(thursday[2]).toBeGreaterThan(thursday[0] ?? 255);

  const tip = page.locator('.wt-chart__tip');
  await expect(friday.locator(bars)).toHaveCSS('opacity', '0.75');
  await expect(tip).toBeHidden();
  await friday.hover();
  await expect(friday.locator(bars)).toHaveCSS('opacity', '1');
  await expect(tip).toBeVisible();
  await expect(tip.locator('.wt-chart__tip-period')).toHaveText('Piątek 06-11-2026');
  await expect(tip.locator('.wt-chart__tip-total')).toHaveText('Suma czasu: 10h 10m');
  // The tip stands over its bar.
  const over = await tip.boundingBox();
  const bar = await friday.boundingBox();
  if (!over || !bar) throw new Error('not rendered');
  expect(Math.abs(over.x + over.width / 2 - (bar.x + bar.width / 2))).toBeLessThan(2);
  expect(over.y + over.height).toBeLessThanOrEqual(bar.y);

  // A day without time answers too.
  await page.locator(columns).nth(2).hover();
  await expect(tip.locator('.wt-chart__tip-total')).toHaveText('Suma czasu: 0h 00m');

  await page.locator('.wt-title').hover();
  await expect(tip).toBeHidden();
});

test('a year shows months, and zooming in shows its days', async ({ page }, testInfo) => {
  await openPanel(page);
  await chip(page, 'Rok').click();
  await expect(page.locator(bars)).toHaveCount(12);
  await expect(page.locator('.wt-chart')).toHaveAttribute('data-granularity', 'month');
  await expect(page.locator('.wt-chart__label').first()).toHaveText('01-2026');
  const view = page.locator('.wt-chart__view');
  expect(await view.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);

  const zoomIn = page.getByRole('button', { name: 'Przybliż' });
  const zoomOut = page.getByRole('button', { name: 'Oddal' });
  await expect(zoomOut).toBeDisabled();
  await zoomIn.click();
  await expect(page.locator(bars)).toHaveCount(365);
  await expect(page.locator('.wt-chart')).toHaveAttribute('data-granularity', 'day');
  await expect(zoomIn).toBeDisabled();
  // The days keep a width that can be read and pointed at; the chart scrolls sideways.
  expect(await view.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
  expect((await page.locator(columns).first().boundingBox())?.width).toBeGreaterThanOrEqual(14);
  // It stays on the middle of the year.
  expect(await view.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  await expectInsideWindow(page);

  // The labels that are shown do not run into each other.
  const labels = await page.locator('.wt-chart__label:visible').evaluateAll((nodes) =>
    nodes.map((node) => {
      const box = node.getBoundingClientRect();
      return [box.left, box.right];
    }),
  );
  for (let index = 1; index < labels.length; index += 1) {
    expect(labels[index]?.[0] ?? 0).toBeGreaterThanOrEqual((labels[index - 1]?.[1] ?? 0) - 0.5);
  }

  // The keyboard: the arrows walk through the bars, minus zooms out.
  await view.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.wt-chart__tip-period')).toHaveText('Czwartek 01-01-2026');
  await page.keyboard.press('-');
  await expect(page.locator(bars)).toHaveCount(12);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.wt-chart__tip-period')).toHaveText('01-2026');

  if (testInfo.project.name === 'phone') return;
  // Ctrl and the wheel zoom in around the pointer: November stays under it.
  const november = await page.locator(columns).nth(10).boundingBox();
  if (!november) throw new Error('not rendered');
  await page.mouse.move(november.x + november.width / 2, november.y + november.height / 2);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -100);
  await page.keyboard.up('Control');
  await expect(page.locator(bars)).toHaveCount(365);
  await page.mouse.move(november.x + november.width / 2 + 1, november.y + november.height / 2);
  await expect(page.locator('.wt-chart__tip-period')).toContainText('-11-2026');
});

test('a period inside one month has no zoom, and one across two months has', async ({ page }) => {
  await openPanel(page);
  await chip(page, 'Tydzień').click();
  await expect(page.locator(bars)).toHaveCount(7);
  await expect(page.locator('.wt-chart__tools')).toBeHidden();

  await page.locator('#wt-to').fill('2026-12-02T23:59');
  await expect(page.locator(bars)).toHaveCount(31);
  await expect(page.locator('.wt-chart__tools')).toBeVisible();
  await page.getByRole('button', { name: 'Oddal' }).click();
  await expect(page.locator(bars)).toHaveCount(2);
  await page.locator(columns).first().hover();
  await expect(page.locator('.wt-chart__tip-period')).toHaveText('02-11-2026 – 30-11-2026');

  // More than 31 days: months by default.
  await page.locator('#wt-to').fill('2026-12-03T23:59');
  await expect(page.locator(bars)).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Oddal' })).toBeDisabled();
});

test('a click on a bar shows only its month, then only its day, without asking Jira again', async ({ page }) => {
  await openPanel(page);
  await chip(page, 'Rok').click();
  await expect(page.locator(bars)).toHaveCount(12);
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  const november = page.locator(columns).nth(10);
  const total = Number(await november.getAttribute('data-seconds'));
  await expect(november).toHaveCSS('cursor', 'pointer');

  // The month: its days in the chart, its range in the fields, its entries in the table.
  await november.click();
  await expect(page.locator(bars)).toHaveCount(30);
  await expect(page.locator('#wt-from')).toHaveValue('2026-11-01T00:00');
  await expect(page.locator('#wt-to')).toHaveValue('2026-11-30T23:59');
  await expect(page.locator('.wt-title')).toContainText('01-11-2026 – 30-11-2026');
  await expect(chip(page, 'Miesiąc')).toHaveAttribute('aria-pressed', 'true');
  const seconds = await page
    .locator(columns)
    .evaluateAll((nodes) => nodes.map((node) => Number(node.getAttribute('data-seconds'))));
  expect(seconds.reduce((sum, value) => sum + value, 0)).toBe(total);

  // The day: the progress bar and only that day's rows.
  await page.locator(columns).nth(5).click();
  await expect(page.locator('.wt-title')).toHaveText('Piątek 06-11-2026 · 10h 10m');
  await expect(page.locator('.wt-chart')).toBeHidden();
  await expect(page.locator('.wt-progress__track')).toBeVisible();
  await expect(page.locator('#wt-day')).toHaveValue('2026-11-06');
  await expect(rows(page)).toHaveCount(3);

  // Back to the month and to the year, and forward again: still nothing is asked.
  const back = page.getByRole('button', { name: 'Cofnij' });
  const forward = page.getByRole('button', { name: 'Ponów' });
  await expect(forward).toBeDisabled();
  await back.click();
  await expect(page.locator(bars)).toHaveCount(30);
  await back.click();
  await expect(page.locator(bars)).toHaveCount(12);
  await expect(chip(page, 'Rok')).toHaveAttribute('aria-pressed', 'true');
  await back.click();
  await expect(page.locator('.wt-title')).toHaveText('Piątek 06-11-2026 · 10h 10m');
  await expect(back).toBeDisabled();
  await expect(back).toHaveCSS('opacity', '0.4');
  await forward.click();
  await forward.click();
  await expect(page.locator(bars)).toHaveCount(30);
  await expect(forward).toBeEnabled();
  expect(requests.filter((url) => url.includes('/rest/'))).toEqual([]);
  await expectInsideWindow(page);
});

test('the chart is readable in both themes', async ({ page }) => {
  await openPanel(page);
  await chip(page, 'Tydzień').click();
  await expect(page.locator(bars)).toHaveCount(7);
  for (const mode of ['dark', 'light'] as const) {
    await page.locator('.wt-root').evaluate((node, value) => node.setAttribute('data-theme', value), mode);
    const surface = await paintedColour(panel(page), 'backgroundColor');
    const bar = await paintedColour(page.locator(columns).nth(4).locator(bars), 'backgroundColor');
    expect(bar, `${mode}: the bar differs from the panel`).not.toEqual(surface);
    const label = await paintedColour(page.locator('.wt-chart__label').first());
    expect(label, `${mode}: the label differs from the panel`).not.toEqual(surface);
  }
});
