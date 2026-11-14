// The reset button, in a real browser, on the stand-in Jira page
// (specs/004-reset-button-toolbar/quickstart.md, V10 to V23). Runs at 320 px and at 1280 px.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { chip, launcher, openPage, openPanel, panel, rows, titleTotal } from './helpers';

const SETTINGS_KEY = 'worktime.settings.v1';
const TODAY = 'Piątek 06-11-2026 · 10h 10m';

const named = (page: Page, name: string): Locator => page.getByRole('button', { name, exact: true });
const reset = (page: Page): Locator => named(page, 'Resetuj');
const title = (page: Page): Locator => page.locator('.wt-title');
const person = (page: Page): Locator => page.locator('.wt-person');
const settings = (page: Page): Locator => page.locator('.wt-popover');
const interval = (page: Page): Locator => page.locator('#wt-interval');
const saveButton = (page: Page): Locator => settings(page).locator('.wt-popover__actions .wt-button--primary');
const sent = (page: Page): Promise<number> => page.evaluate(() => window.__jiraRequests.length);
const stored = (page: Page): Promise<string | null> => page.evaluate((key) => localStorage.getItem(key), SETTINGS_KEY);

/** Another period, loaded: the view is no longer the start view. */
async function goToMonth(page: Page): Promise<void> {
  await chip(page, 'Miesiąc').click();
  await expect(chip(page, 'Miesiąc')).toHaveAttribute('aria-pressed', 'true');
  await expect(titleTotal(page)).not.toHaveText('…');
}

/** The start view, loaded: today for the signed-in user, with nothing left to reset. */
async function expectStartView(page: Page): Promise<void> {
  await expect(panel(page)).toBeVisible();
  await expect(title(page)).toHaveText(TODAY);
  await expect(person(page)).toHaveText('Jan Kowalski');
  await expect(chip(page, 'Dzień')).toHaveAttribute('aria-pressed', 'true');
  await expect(named(page, 'Cofnij')).toBeDisabled();
  await expect(named(page, 'Ponów')).toBeDisabled();
  await expect(reset(page)).toBeDisabled();
}

test.describe('when the reset button is switched on', () => {
  test('it is off on a newly opened panel and looks like the back button (V10)', async ({ page }, testInfo) => {
    await openPanel(page);
    await expect(rows(page)).toHaveCount(3);
    await expect(reset(page)).toBeDisabled();
    await expect(reset(page)).toHaveAttribute('title', 'Resetuj');
    for (const property of ['opacity', 'cursor'] as const) {
      const expected = await named(page, 'Cofnij').evaluate((node, name) => getComputedStyle(node)[name], property);
      await expect(reset(page)).toHaveCSS(property, expected);
    }
    await expect(reset(page)).toHaveCSS('opacity', '0.4');
    // The label stands beside the sign where there is room for it (FR-009).
    if (testInfo.project.name !== 'phone') await expect(reset(page).locator('span')).toBeVisible();
  });

  test('it is on at once with another period, before the period has loaded (V11)', async ({ page }) => {
    await openPanel(page, { delay: 400 });
    await expect(rows(page)).toHaveCount(3);
    await chip(page, 'Miesiąc').click();
    expect(await reset(page).isEnabled()).toBe(true);
    await expect(titleTotal(page)).toHaveText('…');
  });

  test('it is on while a step is left to go forward to, and a press forgets the step (V14)', async ({ page }) => {
    await openPanel(page);
    await chip(page, 'Tydzień').click();
    await expect(named(page, 'Cofnij')).toBeEnabled();
    await named(page, 'Cofnij').click();
    await expect(title(page)).toHaveText(TODAY);
    await expect(named(page, 'Ponów')).toBeEnabled();
    await expect(reset(page)).toBeEnabled();
    // The total of today is known: the launcher keeps it (FR-014).
    await expect(launcher(page)).toHaveText('Dziś: 10h 10m');

    await reset(page).click();
    await expect(launcher(page)).toHaveText('Dziś: 10h 10m');
    await expectStartView(page);
  });
});

test.describe('a press on the reset button', () => {
  test('goes back to today with the panel open (V12)', async ({ page }) => {
    await openPanel(page);
    await goToMonth(page);
    await expect(launcher(page)).toContainText('Zakres:');

    await reset(page).click();
    await expectStartView(page);
    await expect(launcher(page)).toHaveText('Dziś: 10h 10m');
    await expect(rows(page)).toHaveCount(3);
  });

  test('returns to the signed-in user (V13)', async ({ page }) => {
    await openPanel(page);
    await named(page, 'Ustawienia').click();
    await page.getByRole('radio', { name: 'Inny użytkownik' }).check();
    await page.locator('#wt-person-name').fill('Piotr Nowakowski');
    await saveButton(page).click();
    await expect(person(page)).toHaveText('Piotr Nowakowski');
    await expect(launcher(page)).toHaveText('Piotr Nowakowski · Dziś: 1h 30m');
    await expect(reset(page)).toBeEnabled();

    await reset(page).click();
    await expect(person(page)).toHaveText('Jan Kowalski');
    await expectStartView(page);
    // No name on the launcher: the time is the user's own.
    await expect(launcher(page)).toHaveText('Dziś: 10h 10m');
  });

  test('changes no stored setting (V15)', async ({ page }) => {
    await openPanel(page);
    await named(page, 'Ustawienia').click();
    await page.getByRole('switch', { name: 'Tryb ciemny' }).click();
    await interval(page).fill('10');
    await saveButton(page).click();
    await expect(settings(page)).toBeHidden();
    await goToMonth(page);
    const before = await stored(page);
    expect(JSON.parse(before ?? '{}')).toMatchObject({ refreshMinutes: 10, theme: 'light' });

    await reset(page).click();
    await expectStartView(page);
    expect(await stored(page)).toBe(before);

    await page.reload();
    await expect(launcher(page)).toBeVisible();
    expect(await stored(page)).toBe(before);
    await expect(page.locator('.wt-root')).toHaveAttribute('data-theme', 'light');
  });

  test('moves the keyboard focus to refresh, inside the panel (V17)', async ({ page }) => {
    await openPanel(page);
    await goToMonth(page);
    await reset(page).focus();
    await page.keyboard.press('Enter');

    await expect(named(page, 'Odśwież')).toBeFocused();
    await expectStartView(page);
    await expect(named(page, 'Odśwież')).toBeFocused();
    // The reset button is switched off, so Tab goes past it (SC-012).
    await page.keyboard.press('Tab');
    await expect(named(page, 'Ustawienia')).toBeFocused();
  });

  test('gives up a load that is still running (V18)', async ({ page }) => {
    await openPanel(page, { delay: 500 });
    await expect(rows(page)).toHaveCount(3);
    await chip(page, 'Rok').click();
    await reset(page).click();
    await expectStartView(page);

    // The answer for the year arrives late and is never shown.
    await page.waitForTimeout(900);
    await expect(title(page)).toHaveText(TODAY);
    await expect(rows(page)).toHaveCount(3);
  });

  test('sends the requests of one load of today and no other (SC-005)', async ({ page }) => {
    await openPage(page);
    await expect(launcher(page)).toHaveText('Dziś: 10h 10m');
    const closed = await sent(page);
    await launcher(page).click();
    await expect(title(page)).toHaveText(TODAY);
    const opening = (await sent(page)) - closed;

    await goToMonth(page);
    const before = await sent(page);
    await reset(page).click();
    await expectStartView(page);
    expect((await sent(page)) - before).toBe(opening);

    // Several quick presses are one press: the first switches the button off (V23).
    await goToMonth(page);
    const again = await sent(page);
    await reset(page).evaluate((node: HTMLButtonElement) => {
      node.click();
      node.click();
      node.click();
    });
    await expectStartView(page);
    expect((await sent(page)) - again).toBe(opening);
  });

  test('closes the settings without saving (V19)', async ({ page }) => {
    await openPanel(page);
    await goToMonth(page);
    await named(page, 'Ustawienia').click();
    await expect(settings(page)).toBeVisible();
    await interval(page).fill('2');
    const before = await stored(page);

    await reset(page).click();
    await expect(settings(page)).toBeHidden();
    await expectStartView(page);
    expect(await stored(page)).toBe(before);
    await named(page, 'Ustawienia').click();
    await expect(interval(page)).toHaveValue('5');
  });

  test('closes the export menu (V20)', async ({ page }) => {
    await openPanel(page);
    await goToMonth(page);
    await page.locator('.wt-export__button').click();
    const menu = page.getByRole('menu', { name: 'Eksport' });
    await expect(menu).toBeVisible();

    await reset(page).click();
    await expect(menu).toBeHidden();
    await expectStartView(page);
  });

  test('shows the error state for today when Jira does not answer (V21)', async ({ page }) => {
    await openPanel(page);
    await goToMonth(page);
    await page.evaluate(() => {
      window.__jiraDown = true;
    });

    await reset(page).click();
    await expect(page.locator('.wt-message p')).toHaveText('Nie udało się pobrać danych z Jiry.');
    await expect(named(page, 'Spróbuj ponownie')).toBeVisible();
    await expect(page.locator('.wt-title__text')).toHaveText('Piątek 06-11-2026');
    await expect(person(page)).toHaveText('Jan Kowalski');
    // The reset is not taken back: there is nothing left to reset.
    await expect(reset(page)).toBeDisabled();

    await page.evaluate(() => {
      window.__jiraDown = false;
    });
    await named(page, 'Spróbuj ponownie').click();
    await expectStartView(page);
  });

  test('leaves the close button as it was (V22)', async ({ page }) => {
    await openPanel(page);
    await goToMonth(page);
    await reset(page).click();
    await expectStartView(page);

    await goToMonth(page);
    await named(page, 'Zamknij').click();
    await expect(panel(page)).toBeHidden();
    await expect(launcher(page)).toHaveText('Dziś: 10h 10m');
    await launcher(page).click();
    await expectStartView(page);
  });
});
