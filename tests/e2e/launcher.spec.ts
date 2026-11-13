import { expect, test } from '@playwright/test';
import {
  expectInsideWindow,
  launcher,
  openPage,
  openPanel,
  paintedColour,
  root,
  setTheme,
  titleTotal,
} from './helpers';

test("shows today's total on the Jira page, in the colour of the progress bar", async ({ page }) => {
  await openPage(page);
  await expect(launcher(page)).toHaveText('Dziś: 10h 10m');
  const colour = await paintedColour(launcher(page).locator('.wt-total'));
  expect(await paintedColour(launcher(page).locator('.wt-launcher__dot'), 'backgroundColor')).toEqual(colour);

  await launcher(page).click();
  await expect(titleTotal(page)).toHaveText('10h 10m');
  expect(await paintedColour(titleTotal(page))).toEqual(colour);
});

for (const mode of ['dark', 'light'] as const) {
  test(`sits near the bottom-right corner, clear of and level with Jira's own corner button (${mode})`, async ({
    page,
  }) => {
    await openPage(page);
    await setTheme(page, mode);
    await expect(launcher(page)).toHaveText('Dziś: 10h 10m');
    await expectInsideWindow(page);

    const box = await launcher(page).boundingBox();
    const viewport = page.viewportSize();
    if (!box || !viewport) throw new Error('launcher is not laid out');
    // The corner itself is left free: Jira draws its own floating button there.
    expect(viewport.width - (box.x + box.width)).toBe(88);
    // Level with that button: the middle of the launcher is 48 px above the bottom edge.
    expect(viewport.height - (box.y + box.height / 2)).toBe(48);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
  });
}

test('stays in place when the Jira page scrolls', async ({ page }) => {
  await openPage(page);
  await page.evaluate(() => {
    document.body.style.height = '3000px';
    window.scrollTo(0, 1500);
  });
  await expect(launcher(page)).toBeInViewport();
});

test('shows a dash when today cannot be read', async ({ page }) => {
  await openPage(page, { scenario: 'error' });
  await expect(launcher(page)).toHaveText('Dziś: –');
  await expect(launcher(page)).toHaveAttribute('title', 'Nie udało się pobrać danych z Jiry.');
});

test('draws nothing when nobody is signed in to Jira', async ({ page }) => {
  await page.goto('/index.html?scenario=signed-out');
  await expect(page.getByRole('heading', { name: 'Jira (atrapa)' })).toBeVisible();
  await expect(root(page)).toHaveCount(0);
});

test("keys typed in the add-on do not reach Jira's keyboard shortcuts", async ({ page }) => {
  await openPanel(page);
  await page.getByRole('button', { name: 'Ustawienia' }).click();
  await page.locator('#wt-interval').fill('');
  await page.locator('#wt-interval').pressSequentially('15');
  expect(await page.evaluate(() => window.__pageKeys)).toEqual([]);

  // The page's own fields still work as before.
  await page.locator('#jira-field').pressSequentially('c');
  expect(await page.evaluate(() => window.__pageKeys)).toEqual(['c']);
});

test("the add-on's styles and Jira's styles do not affect each other", async ({ page }) => {
  await openPanel(page);
  // A rule a host page could well have: it must not reach into the add-on.
  await page.addStyleTag({
    content: 'button, h1, table { font-size: 40px !important; border: 9px solid red !important; }',
  });
  const button = await page
    .getByRole('button', { name: 'Odśwież' })
    .evaluate((node) => getComputedStyle(node).borderTopWidth);
  expect(button).toBe('1px');
  // And the add-on's reset must not change the page's heading.
  const heading = await page
    .getByRole('heading', { name: 'Jira (atrapa)' })
    .evaluate((node) => getComputedStyle(node).marginTop);
  expect(heading).not.toBe('0px');
});
