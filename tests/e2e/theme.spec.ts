import { expect, test } from '@playwright/test';
import {
  contrast,
  footerTotal,
  launcher,
  openPage,
  openPanel,
  paintedColour,
  panel,
  setTheme,
  theme,
  titleTotal,
} from './helpers';

test('is dark by default and leaves the Jira page alone', async ({ page }) => {
  await openPage(page);
  expect(await theme(page)).toBe('dark');
  expect(await page.evaluate(() => document.documentElement.hasAttribute('data-theme'))).toBe(false);
});

test('the switch previews, "Anuluj" reverts, "Zapisz" keeps, and a reload starts light', async ({ page }) => {
  await openPanel(page);
  const gear = page.getByRole('button', { name: 'Ustawienia' });
  const darkMode = page.getByRole('switch', { name: 'Tryb ciemny' });

  await gear.click();
  await expect(darkMode).toHaveAttribute('aria-checked', 'true');
  await darkMode.click();
  expect(await theme(page)).toBe('light');
  await expect(darkMode).toHaveAttribute('aria-checked', 'false');

  await page.getByRole('button', { name: 'Anuluj' }).click();
  expect(await theme(page)).toBe('dark');

  await gear.click();
  await darkMode.click();
  await page.keyboard.press('Escape');
  expect(await theme(page)).toBe('dark');
  // Escape closed the settings only; the panel is still open.
  await expect(panel(page)).toBeVisible();

  await gear.click();
  await darkMode.click();
  await page.getByRole('button', { name: 'Zapisz' }).click();
  expect(await theme(page)).toBe('light');

  // After a reload the launcher appears in the saved theme straight away.
  await page.reload();
  await expect(launcher(page)).toBeVisible();
  expect(await theme(page)).toBe('light');
});

for (const mode of ['dark', 'light'] as const) {
  for (const scenario of ['h4', 'h8', 'today', 'h20'] as const) {
    test(`text is readable in the ${mode} theme (${scenario})`, async ({ page }) => {
      await openPanel(page, { scenario });
      await setTheme(page, mode);
      await expect(titleTotal(page)).toHaveText(/\dh \d\dm/);
      // The pointer is still on the launcher from opening the panel: measure it at rest.
      await page.mouse.move(0, 0);

      const surface = await paintedColour(panel(page), 'backgroundColor');
      const targets = {
        'title total': titleTotal(page),
        'footer total': footerTotal(page),
        title: page.locator('.wt-title__text'),
        'ticket link': page.locator('.wt-table tbody a.wt-key').first(),
        'ticket title': page.locator('.wt-table tbody .wt-col-title').first(),
        entries: page.locator('.wt-entries li').first(),
      };
      for (const [name, locator] of Object.entries(targets)) {
        const ratio = contrast(await paintedColour(locator), surface);
        expect(ratio, `${name} against the surface`).toBeGreaterThanOrEqual(4.5);
      }

      // The launcher: its label and its coloured total against its own background.
      const pill = await paintedColour(launcher(page), 'backgroundColor');
      for (const part of ['.wt-launcher__label', '.wt-total']) {
        const ratio = contrast(await paintedColour(launcher(page).locator(part)), pill);
        expect(ratio, `launcher ${part}`).toBeGreaterThanOrEqual(4.5);
      }

      // The active preset: text against the accent colour.
      await page.getByRole('button', { name: 'Dzień', exact: true }).click();
      const active = page.locator('.wt-chip--active');
      await expect(active).toHaveCount(1);
      await page.mouse.move(0, 0);
      expect(
        contrast(await paintedColour(active), await paintedColour(active, 'backgroundColor')),
        'active preset',
      ).toBeGreaterThanOrEqual(4.5);
    });
  }
}
