import { expect, test } from '@playwright/test';
import { footerTotal, launcher, openPanel, panel, rows } from './helpers';

const logMore = () => {
  window.__moreLogged = true;
};

test('refresh shows newly logged time and keeps the old rows visible meanwhile', async ({ page }) => {
  await openPanel(page, { scenario: 'refresh-changes', delay: 150 });
  await expect(footerTotal(page)).toHaveText('10h 10m');
  await page.evaluate(logMore);

  const refresh = page.getByRole('button', { name: 'Odśwież' });
  await refresh.click();
  await expect(refresh).toBeDisabled();
  // Switched off, but not taken out of the keyboard order: it keeps the focus, and a second
  // activation starts no second load (003 FR-030).
  await expect(refresh).toHaveAttribute('aria-disabled', 'true');
  expect(await refresh.evaluate((node) => (node as HTMLButtonElement).disabled)).toBe(false);
  await expect(refresh).toBeFocused();
  const searches = () =>
    page.evaluate(() => window.__jiraRequests.filter((path) => path.startsWith('/rest/api/3/search')).length);
  const sent = await searches();
  await refresh.dispatchEvent('click');
  await page.keyboard.press('Enter');
  expect(await searches()).toBe(sent);
  await expect(rows(page)).toHaveCount(3);
  await expect(footerTotal(page)).toHaveText('10h 10m');

  await expect(footerTotal(page)).toHaveText('10h 40m');
  await expect(refresh).toBeEnabled();
  await expect(refresh).toBeFocused();
  await expect(page.locator('.wt-table tbody .wt-col-sum').last()).toHaveText('2h 00m');
  await expect(page.locator('.wt-title')).toHaveText('Piątek 06-11-2026 · 10h 40m');
  // The launcher follows the panel.
  await expect(launcher(page)).toHaveText('Dziś: 10h 40m');
});

test('the interval is validated, saved, and still there after a reload', async ({ page }) => {
  await openPanel(page);
  const gear = page.getByRole('button', { name: 'Ustawienia' });
  const popover = page.locator('.wt-popover');
  const interval = page.locator('#wt-interval');

  await gear.click();
  await expect(popover).toBeVisible();
  await expect(interval).toHaveValue('5');
  await expect(popover).toContainText('0 = automatyczne odświeżanie wyłączone (domyślnie 5 min)');

  // The pop-over stays inside the panel and the window.
  const box = await popover.boundingBox();
  const frame = await panel(page).boundingBox();
  const viewport = page.viewportSize();
  expect(box && viewport && box.x >= 0 && box.x + box.width <= viewport.width).toBe(true);
  expect(box && frame && box.y >= frame.y && box.y + box.height <= frame.y + frame.height + 1).toBe(true);

  await interval.fill('2000');
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(popover).toContainText('Podaj liczbę całkowitą od 0 do 1440.');

  await interval.fill('0');
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(popover).toBeHidden();

  await page.reload();
  await launcher(page).click();
  await page.getByRole('button', { name: 'Ustawienia' }).click();
  await expect(interval).toHaveValue('0');

  // "Anuluj" changes nothing.
  await interval.fill('30');
  await page.getByRole('button', { name: 'Anuluj' }).click();
  await page.getByRole('button', { name: 'Ustawienia' }).click();
  await expect(interval).toHaveValue('0');
});

test('the open panel reloads by itself at the saved interval', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-06T12:00:00+01:00') });
  await page.goto('/index.html?scenario=refresh-changes');
  await launcher(page).click();
  await expect(footerTotal(page)).toHaveText('10h 10m');
  await page.evaluate(logMore);

  await page.clock.fastForward('05:01');
  await expect(footerTotal(page)).toHaveText('10h 40m');
});

test('the launcher reloads by itself while the panel is closed', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-06T12:00:00+01:00') });
  await page.goto('/index.html?scenario=refresh-changes');
  await expect(launcher(page)).toHaveText('Dziś: 10h 10m');
  await page.evaluate(logMore);

  await page.clock.fastForward('05:01');
  await expect(launcher(page)).toHaveText('Dziś: 10h 40m');
});
