import { expect, test } from '@playwright/test';
import { expectInsideWindow, footerTotal, launcher, openPage, openPanel, panel, root, rows, setTheme } from './helpers';

test.describe("today's table", () => {
  test('shows one row per ticket with entries, sums, title, and total', async ({ page }) => {
    await openPanel(page);
    await expect(rows(page)).toHaveCount(3);
    await expect(page.locator('.wt-table tbody a.wt-key')).toHaveText(['AM-10234', 'AM-20012', 'AM-10087']);
    await expect(rows(page).first().locator('.wt-entries li')).toHaveText([
      '07:00–10:30 · 3h 30m',
      '13:00–14:00 · 1h 00m',
      '15:05–17:30 · 2h 25m',
    ]);
    await expect(page.locator('.wt-table tbody .wt-col-sum')).toHaveText(['6h 55m', '1h 45m', '1h 30m']);
    await expect(page.locator('.wt-title')).toHaveText('Piątek 06-11-2026 · 10h 10m');
    await expect(page.locator('.wt-footer__label')).toHaveText('Suma czasu:');
    await expect(footerTotal(page)).toHaveText('10h 10m');
  });

  for (const mode of ['dark', 'light'] as const) {
    for (const scenario of ['today', 'long-title'] as const) {
      test(`fits the window without sideways scrolling (${scenario}, ${mode})`, async ({ page }) => {
        await openPanel(page, { scenario });
        await setTheme(page, mode);
        await expect(rows(page)).toHaveCount(3);
        await expectInsideWindow(page);

        // Ticket numbers stay on one line; nothing sticks out of the panel (FR-036).
        const key = page.locator('.wt-table tbody a.wt-key').first();
        expect(await key.evaluate((node) => node.getClientRects().length)).toBe(1);
        const outside = await root(page).evaluate((node) => {
          const frame = node.querySelector('.wt-panel')?.getBoundingClientRect();
          if (!frame) return ['no panel'];
          return [...node.querySelectorAll<HTMLElement>('.wt-table td, .wt-entries li, .wt-title, .wt-chip, .wt-input')]
            .filter((element) => element.offsetParent !== null) // skip what is not displayed (closed settings)
            .filter((element) => {
              const box = element.getBoundingClientRect();
              return box.left < frame.left - 0.5 || box.right > frame.right + 0.5;
            })
            .map((element) => element.className);
        });
        expect(outside).toEqual([]);
      });
    }
  }

  test('links each ticket to its Jira page in a new tab', async ({ page }) => {
    await openPanel(page);
    const link = page.locator('.wt-table tbody a.wt-key').first();
    await expect(link).toHaveAttribute('href', 'https://example.atlassian.net/browse/AM-10234');
    await expect(link).toHaveAttribute('target', '_blank');
  });

  test('shows the empty state', async ({ page }) => {
    await openPanel(page, { scenario: 'empty' });
    await expect(page.locator('.wt-message')).toHaveText('Brak wpisów czasu w wybranym okresie.');
    await expect(footerTotal(page)).toHaveText('0h 00m');
    await expectInsideWindow(page);
  });

  test('shows the error state with a retry action', async ({ page }) => {
    await openPanel(page, { scenario: 'error' });
    await expect(page.locator('.wt-message p')).toHaveText('Nie udało się pobrać danych z Jiry.');
    await expect(page.getByRole('button', { name: 'Spróbuj ponownie' })).toBeVisible();
    await expectInsideWindow(page);
  });
});

test.describe('opening and closing', () => {
  test('the panel is closed at first and the Jira page stays usable', async ({ page }) => {
    await openPage(page);
    await expect(panel(page)).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Jira (atrapa)' })).toBeVisible();
  });

  test('the close button and the launcher both close the panel', async ({ page }) => {
    await openPanel(page);
    await page.getByRole('button', { name: 'Zamknij' }).click();
    await expect(panel(page)).toBeHidden();
    await expect(launcher(page)).toBeFocused();

    await launcher(page).click();
    await expect(panel(page)).toBeVisible();
    await launcher(page).click();
    await expect(panel(page)).toBeHidden();
  });

  test('Escape closes the panel', async ({ page }) => {
    await openPanel(page);
    await page.keyboard.press('Escape');
    await expect(panel(page)).toBeHidden();
  });

  test('the panel always opens on today', async ({ page }) => {
    await openPanel(page);
    await page.getByRole('button', { name: 'Wczoraj', exact: true }).click();
    await expect(page.locator('.wt-title__text')).toHaveText('Czwartek 05-11-2026');
    await page.getByRole('button', { name: 'Zamknij' }).click();
    await launcher(page).click();
    await expect(page.locator('.wt-title__text')).toHaveText('Piątek 06-11-2026');
  });
});
