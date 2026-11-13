// The time of another person, in a real browser, on the stand-in Jira page
// (specs/002-other-user-worktime/quickstart.md, V1 to V13). Runs at 320 px and at 1280 px.
import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  chip,
  contrast,
  expectInsideWindow,
  footerTotal,
  launcher,
  openPanel,
  paintedColour,
  panel,
  rows,
  setTheme,
  titleTotal,
} from './helpers';

const NOT_FOUND = 'Nie znaleziono użytkownika. Nie można zapisać ustawień.';
const CHECK_FAILED = 'Nie udało się sprawdzić użytkownika w Jirze. Ustawienia nie zostały zapisane.';
const LONG_NAME = 'Aleksandra Konstancja Brzeczyszczykiewicz';

const person = (page: Page): Locator => page.locator('.wt-person');
const settings = (page: Page): Locator => page.locator('.wt-popover');
const nameField = (page: Page): Locator => page.locator('#wt-person-name');
const interval = (page: Page): Locator => page.locator('#wt-interval');
const saveButton = (page: Page): Locator => settings(page).locator('.wt-popover__actions .wt-button--primary');
const option = (page: Page, name: string): Locator => page.getByRole('radio', { name });
const alertWindow = (page: Page): Locator => page.getByRole('alertdialog');
const people = (page: Page): Locator => page.locator('.wt-people__option');
const fieldMessages = (page: Page): Locator => settings(page).locator('.wt-field-error:visible');
const requests = (page: Page): Promise<string[]> => page.evaluate(() => window.__jiraRequests);

async function openSettings(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Ustawienia' }).click();
  await expect(settings(page)).toBeVisible();
}

/** Settings → the other person → the name → save, as the user does it. */
async function saveOther(page: Page, name: string): Promise<void> {
  await openSettings(page);
  await option(page, 'Inny użytkownik').check();
  await nameField(page).fill(name);
  await saveButton(page).click();
}

test.describe('the name above the title', () => {
  for (const mode of ['dark', 'light'] as const) {
    test(`names the signed-in user in a colour of its own (${mode})`, async ({ page }) => {
      await openPanel(page);
      await setTheme(page, mode);
      await expect(person(page)).toHaveText('Jan Kowalski');
      await expect(launcher(page)).toHaveText('Dziś: 10h 10m');

      // A line of its own, directly above the title.
      const name = await person(page).boundingBox();
      const title = await page.locator('.wt-title').boundingBox();
      if (!name || !title) throw new Error('the header is not laid out');
      expect(name.y + name.height).toBeLessThanOrEqual(title.y + 1);
      expect(Math.abs(name.x - title.x)).toBeLessThanOrEqual(1);

      const colour = await paintedColour(person(page));
      expect(colour).not.toEqual(await paintedColour(page.locator('.wt-title__text')));
      expect(colour).not.toEqual(await paintedColour(page.locator('.wt-key').first()));
      expect(contrast(colour, await paintedColour(panel(page), 'backgroundColor'))).toBeGreaterThanOrEqual(4.5);
      await expectInsideWindow(page);
    });
  }

  test('cuts a very long name on one line and leaves the buttons where they are', async ({ page }) => {
    await openPanel(page);
    const before = await page.getByRole('button', { name: 'Zamknij' }).boundingBox();

    await openPanel(page, { scenario: 'long-name' });
    const name = person(page);
    await expect(name).toHaveText(/^Maksymilian Aleksander/);
    await expect(name).toHaveAttribute('title', /Brzeczyszczykiewicz-Wolski$/);
    expect(await name.evaluate((node) => getComputedStyle(node).textOverflow)).toBe('ellipsis');
    // One line: no taller than the short name was.
    const box = await name.boundingBox();
    expect(box && box.height).toBeLessThan(24);
    const viewport = page.viewportSize();
    if (viewport && viewport.width < 600) {
      // On a phone the name is longer than the panel: it is cut, the tip has all of it.
      expect(await name.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
    }
    expect(await page.getByRole('button', { name: 'Zamknij' }).boundingBox()).toEqual(before);
    await expectInsideWindow(page);
  });
});

test.describe('the time of a colleague', () => {
  test('is shown after the name is checked, with the old rows cleared at once', async ({ page }) => {
    await openPanel(page, { delay: 300 });
    await expect(rows(page)).toHaveCount(3);
    await saveOther(page, 'piotr nowakowski');

    // The name changes together with the emptied table, before any of his data is here.
    await expect(person(page)).toHaveText('Piotr Nowakowski');
    expect(await rows(page).count()).toBe(0);
    await expect(titleTotal(page)).toHaveText('…');
    await expect(footerTotal(page)).toHaveText('…');
    await expect(launcher(page)).toHaveText('Piotr Nowakowski · Dziś: –');
    await expect(settings(page)).toBeHidden();

    await expect(rows(page)).toHaveCount(1);
    await expect(titleTotal(page)).toHaveText('1h 30m');
    await expect(footerTotal(page)).toHaveText('1h 30m');
    await expect(launcher(page)).toHaveText('Piotr Nowakowski · Dziś: 1h 30m');
    await expect(page.getByRole('button', { name: 'Cofnij' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Ponów' })).toBeDisabled();
    // The name has the colour it has in the header.
    expect(await paintedColour(launcher(page).locator('.wt-launcher__person'))).toEqual(
      await paintedColour(person(page)),
    );
    await expectInsideWindow(page);
  });

  test('stays his through a change of period and a refresh', async ({ page }) => {
    await openPanel(page);
    await saveOther(page, 'Piotr Nowakowski');
    await expect(titleTotal(page)).toHaveText('1h 30m');
    const before = (await requests(page)).length;

    await chip(page, 'Tydzień').click();
    await expect(page.locator('.wt-title__text')).toHaveText('02-11-2026 – 08-11-2026');
    await expect(titleTotal(page)).toHaveText('1h 30m');
    await page.getByRole('button', { name: 'Odśwież' }).click();
    await expect(titleTotal(page)).toHaveText('1h 30m');
    await expect(person(page)).toHaveText('Piotr Nowakowski');

    const searches = (await requests(page)).slice(before).filter((path) => path.includes('/search/jql'));
    expect(searches.length).toBeGreaterThanOrEqual(2);
    for (const path of searches) expect(decodeURIComponent(path)).toContain('worklogAuthor = "piotr-1"');
  });

  test('is found when the name is typed without its Polish letters', async ({ page }) => {
    await openPanel(page);
    await saveOther(page, 'jozef sliwinski');
    await expect(person(page)).toHaveText('Józef Śliwiński');
    await expect(titleTotal(page)).toHaveText('0h 00m');
    await expect(page.locator('.wt-message')).toHaveText('Brak wpisów czasu w wybranym okresie.');
  });

  test('keeps a long name on the launcher on one line, inside the window', async ({ page }) => {
    await openPanel(page);
    await saveOther(page, LONG_NAME);
    await expect(person(page)).toHaveText(LONG_NAME);
    await page.getByRole('button', { name: 'Minimalizuj' }).click();

    await expect(launcher(page)).toHaveText(`${LONG_NAME} · Dziś: 0h 00m`);
    await expect(launcher(page)).toHaveAttribute('title', LONG_NAME);
    const name = launcher(page).locator('.wt-launcher__person');
    // The name is the part that gives way; the label and the total are whole.
    expect(await name.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
    for (const part of ['.wt-launcher__label', '.wt-total']) {
      expect(
        await launcher(page)
          .locator(part)
          .evaluate((node) => node.scrollWidth <= node.clientWidth),
      ).toBe(true);
    }
    const box = await launcher(page).boundingBox();
    expect(box?.height).toBe(44);
    await expectInsideWindow(page);
  });

  test('can be chosen with the keyboard alone', async ({ page }) => {
    await openPanel(page);
    await page.getByRole('button', { name: 'Ustawienia' }).focus();
    await page.keyboard.press('Enter');
    await expect(interval(page)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('switch', { name: 'Tryb ciemny' })).toBeFocused();
    await page.keyboard.press('Tab');
    const current = option(page, 'Obecny użytkownik');
    await expect(current).toBeFocused();
    expect(await current.evaluate((node) => node.matches(':focus-visible'))).toBe(true);
    expect(await current.evaluate((node) => getComputedStyle(node).outlineStyle)).not.toBe('none');

    // The arrow key moves to the second option; the name field takes the focus.
    await page.keyboard.press('ArrowDown');
    await expect(option(page, 'Inny użytkownik')).toBeChecked();
    await expect(nameField(page)).toBeFocused();
    await page.keyboard.type('Piotr Nowakowski');
    await page.keyboard.press('Enter');

    await expect(settings(page)).toBeHidden();
    await expect(person(page)).toHaveText('Piotr Nowakowski');
    await expect(titleTotal(page)).toHaveText('1h 30m');
  });

  test('never asks for a picture', async ({ page }) => {
    const asked: string[] = [];
    page.on('request', (request) => asked.push(request.url()));
    await openPanel(page);
    await saveOther(page, 'Nowak');
    await expect(people(page)).toHaveCount(3);
    expect(asked.filter((url) => !url.startsWith('http://127.0.0.1'))).toEqual([]);
  });
});

test.describe('a name that is not in Jira', () => {
  for (const mode of ['dark', 'light'] as const) {
    test(`gives the alert window and saves nothing (${mode})`, async ({ page }) => {
      await openPanel(page);
      await setTheme(page, mode);
      await openSettings(page);
      await interval(page).fill('10');
      await option(page, 'Inny użytkownik').check();
      await nameField(page).fill('Jan Nieistniejący');
      await saveButton(page).click();

      const alert = alertWindow(page);
      await expect(alert).toBeVisible();
      await expect(alert.locator('.wt-alert__text')).toHaveText(NOT_FOUND);
      // The second sentence stands on a line of its own.
      const lines = await alert.locator('.wt-alert__text').evaluate((node) => {
        const range = document.createRange();
        range.selectNodeContents(node);
        const tops = [...range.getClientRects()].map((rect) => Math.round(rect.top));
        return { text: (node as HTMLElement).innerText, rows: new Set(tops).size };
      });
      expect(lines.text).toBe('Nie znaleziono użytkownika.\nNie można zapisać ustawień.');
      expect(lines.rows).toBeGreaterThanOrEqual(2);
      const ok = alert.getByRole('button', { name: 'OK' });
      await expect(ok).toBeFocused();
      await expect(settings(page).locator('.wt-popover__content')).toHaveAttribute('inert', '');

      // The dimmed layer covers the settings and nothing else; the box is inside it.
      const layer = await page.locator('.wt-alert').boundingBox();
      const pop = await settings(page).boundingBox();
      const box = await alert.boundingBox();
      if (!layer || !pop || !box) throw new Error('the alert is not laid out');
      expect(layer.x).toBeGreaterThanOrEqual(pop.x);
      expect(layer.x + layer.width).toBeLessThanOrEqual(pop.x + pop.width);
      expect(box.width).toBeLessThanOrEqual(280);
      expect(box.x).toBeGreaterThanOrEqual(pop.x);
      expect(box.x + box.width).toBeLessThanOrEqual(pop.x + pop.width);
      expect(
        contrast(await paintedColour(alert.locator('.wt-alert__text')), await paintedColour(alert, 'backgroundColor')),
      ).toBeGreaterThanOrEqual(4.5);
      await expectInsideWindow(page);

      // Tab stays in the alert; Escape closes the alert only.
      await page.keyboard.press('Tab');
      await expect(ok).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(alert).toBeHidden();
      await expect(settings(page)).toBeVisible();
      await expect(panel(page)).toBeVisible();

      // Back in the settings, everything as it was left.
      await expect(nameField(page)).toBeFocused();
      await expect(nameField(page)).toHaveValue('Jan Nieistniejący');
      await expect(option(page, 'Inny użytkownik')).toBeChecked();
      await expect(interval(page)).toHaveValue('10');
      await expect(person(page)).toHaveText('Jan Kowalski');
      await expect(rows(page)).toHaveCount(3);

      // Nothing of the visit was stored, not the interval either.
      await settings(page).getByRole('button', { name: 'Anuluj' }).click();
      expect(await page.evaluate(() => localStorage.getItem('worktime.settings.v1'))).toBeNull();
    });
  }

  test('closes the alert with "OK" and lets the name be corrected', async ({ page }) => {
    await openPanel(page);
    await saveOther(page, 'Piotr Nowakowsky');
    await alertWindow(page).getByRole('button', { name: 'OK' }).click();
    await expect(alertWindow(page)).toBeHidden();
    await nameField(page).fill('Piotr Nowakowski');
    await saveButton(page).click();
    await expect(settings(page)).toBeHidden();
    await expect(person(page)).toHaveText('Piotr Nowakowski');
  });

  test('offers a list for two people of the same name, and saves for the one picked', async ({ page }) => {
    await openPanel(page);
    await saveOther(page, 'Anna Nowak');

    await expect(alertWindow(page)).toBeHidden();
    await expect(page.locator('.wt-people__title')).toHaveText('Znaleziono kilka osób. Wybierz jedną:');
    // The same name twice: the address tells them apart. The order is the same every time.
    await expect(people(page)).toHaveText(['Anna Nowakanna.nowak@example.com', 'Anna Nowaka.nowak@example.com']);
    await expect(people(page).first()).toBeFocused();
    await expect(person(page)).toHaveText('Jan Kowalski');

    await people(page).filter({ hasText: 'anna.nowak@example.com' }).click();
    await expect(nameField(page)).toHaveValue('Anna Nowak');
    await expect(page.locator('.wt-people')).toBeHidden();
    await expect(saveButton(page)).toBeFocused();
    const before = (await requests(page)).filter((path) => path.includes('/user/search')).length;

    await saveButton(page).click();
    await expect(settings(page)).toBeHidden();
    await expect(person(page)).toHaveText('Anna Nowak');
    await expect(titleTotal(page)).toHaveText('6h 00m');
    await expect(rows(page)).toHaveCount(2);
    // Picked a moment ago: Jira was not asked a second time.
    expect((await requests(page)).filter((path) => path.includes('/user/search'))).toHaveLength(before);
  });

  test('offers a list for a surname alone, in alphabetical order', async ({ page }) => {
    await openPanel(page);
    await saveOther(page, 'Nowak');
    await expect(people(page).locator('.wt-people__name')).toHaveText(['Anna Nowak', 'Anna Nowak', 'Piotr Nowakowski']);
    // A person who hides the address is shown by name alone.
    await expect(people(page).nth(2).locator('.wt-people__email')).toHaveCount(0);
  });

  test('shows 10 people at most, in a list that scrolls inside the settings', async ({ page }) => {
    await openPanel(page, { scenario: 'people-many' });
    await saveOther(page, 'Kowalski');
    await expect(people(page)).toHaveCount(10);
    await expect(page.locator('.wt-people__more')).toHaveText(
      'Pokazano 10 pierwszych osób. Wpisz dokładniejsze imię i nazwisko.',
    );
    const list = page.locator('.wt-people__list');
    expect(await list.evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true);
    expect((await list.boundingBox())?.height).toBeLessThanOrEqual(220);
    await expectInsideWindow(page);

    // The last entry and the buttons can be reached.
    await people(page).last().scrollIntoViewIfNeeded();
    await expect(people(page).last()).toBeInViewport();
    await saveButton(page).scrollIntoViewIfNeeded();
    await expect(saveButton(page)).toBeInViewport();
  });

  test('does not offer a deactivated account or an app account', async ({ page }) => {
    await openPanel(page);
    await saveOther(page, 'Marta Zielińska');
    await expect(alertWindow(page).locator('.wt-alert__text')).toHaveText(NOT_FOUND);
    await alertWindow(page).getByRole('button', { name: 'OK' }).click();

    await nameField(page).fill('Worklog Bot');
    await saveButton(page).click();
    await expect(alertWindow(page).locator('.wt-alert__text')).toHaveText(NOT_FOUND);
  });

  test('asks for a name, and not Jira, when the field is empty', async ({ page }) => {
    await openPanel(page);
    await saveOther(page, '   ');
    await expect(fieldMessages(page)).toHaveText(['Podaj imię i nazwisko.']);
    await expect(nameField(page)).toBeFocused();
    await expect(alertWindow(page)).toBeHidden();
    expect((await requests(page)).filter((path) => path.includes('/rest/api/3/user'))).toEqual([]);
  });

  test('says that the user could not be checked when Jira cannot be asked', async ({ page }) => {
    await openPanel(page, { scenario: 'people-offline' });
    await saveOther(page, 'Piotr Nowakowski');
    await expect(fieldMessages(page)).toHaveText([CHECK_FAILED]);
    await expect(alertWindow(page)).toBeHidden();
    await expect(settings(page)).toBeVisible();
    await expect(nameField(page)).toHaveValue('Piotr Nowakowski');
    await expect(person(page)).toHaveText('Jan Kowalski');
    await expectInsideWindow(page);
  });
});

test.describe('the life of the choice', () => {
  test('survives minimising and ends with the close button', async ({ page }) => {
    await openPanel(page);
    await saveOther(page, 'Piotr Nowakowski');
    await expect(titleTotal(page)).toHaveText('1h 30m');

    await page.getByRole('button', { name: 'Minimalizuj' }).click();
    await expect(panel(page)).toBeHidden();
    await expect(launcher(page)).toHaveText('Piotr Nowakowski · Dziś: 1h 30m');
    await expectInsideWindow(page);
    await launcher(page).click();
    await expect(person(page)).toHaveText('Piotr Nowakowski');
    await expect(rows(page)).toHaveCount(1);

    await page.getByRole('button', { name: 'Zamknij' }).click();
    await expect(launcher(page)).toHaveText('Dziś: 10h 10m');
    await expect(launcher(page)).not.toHaveAttribute('title', /.+/);
    await launcher(page).click();
    await expect(person(page)).toHaveText('Jan Kowalski');
    await expect(titleTotal(page)).toHaveText('10h 10m');
    await expect(rows(page)).toHaveCount(3);
    await openSettings(page);
    await expect(option(page, 'Obecny użytkownik')).toBeChecked();
  });

  test('starts on the signed-in user after a reload, and remembers the last name', async ({ page }) => {
    await openPanel(page);
    await saveOther(page, 'piotr nowakowski');
    await expect(titleTotal(page)).toHaveText('1h 30m');

    await page.reload();
    await expect(launcher(page)).toHaveText('Dziś: 10h 10m');
    await launcher(page).click();
    await expect(person(page)).toHaveText('Jan Kowalski');
    await expect(rows(page)).toHaveCount(3);

    await openSettings(page);
    await expect(option(page, 'Obecny użytkownik')).toBeChecked();
    await option(page, 'Inny użytkownik').check();
    // Already there, written as Jira has it, and selected so that typing replaces it.
    await expect(nameField(page)).toHaveValue('Piotr Nowakowski');
    await expect(nameField(page)).toBeFocused();
    expect(await nameField(page).evaluate((node: HTMLInputElement) => node.selectionEnd)).toBe(16);

    await saveButton(page).click();
    await expect(person(page)).toHaveText('Piotr Nowakowski');
    await expect(titleTotal(page)).toHaveText('1h 30m');
    // Checked by account ID: no search by name was needed.
    const asked = (await requests(page)).filter((path) => path.includes('/rest/api/3/user'));
    expect(asked).toEqual(['/rest/api/3/user?accountId=piotr-1']);
  });

  test("shows the user's own time when they type their own name, and does not remember it", async ({ page }) => {
    await openPanel(page);
    await saveOther(page, 'Piotr Nowakowski');
    await expect(titleTotal(page)).toHaveText('1h 30m');
    await saveOther(page, 'jan kowalski');
    await expect(person(page)).toHaveText('Jan Kowalski');
    await expect(titleTotal(page)).toHaveText('10h 10m');
    await expect(launcher(page)).toHaveText('Dziś: 10h 10m');
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('worktime.settings.v1') ?? '{}'));
    expect(stored.lastPerson).toEqual({ accountId: 'piotr-1', displayName: 'Piotr Nowakowski' });
  });
});
