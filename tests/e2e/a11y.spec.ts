import { expect, test, type Page } from '@playwright/test';
import { launcher, openPanel, panel, root, rows } from './helpers';

const CONTROLS = 'button, a[href], input, [role="switch"]';

/** Visible controls of the add-on smaller than 44 × 44 CSS pixels. */
async function tooSmall(page: Page): Promise<string[]> {
  return root(page).evaluate((node, selector) => {
    return [...node.querySelectorAll<HTMLElement>(selector)]
      .filter((element) => element.offsetParent !== null || getComputedStyle(element).position === 'fixed')
      .filter((element) => getComputedStyle(element).display !== 'none')
      .map((element) => ({ element, box: element.getBoundingClientRect() }))
      .filter(({ box }) => box.width > 0 && (box.width < 44 || box.height < 44))
      .map(
        ({ element, box }) =>
          `${element.tagName} "${element.textContent?.trim() || element.getAttribute('aria-label') || element.id}" ${Math.round(box.width)}×${Math.round(box.height)}`,
      );
  }, CONTROLS);
}

test('touch targets are at least 44 × 44 on a phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'touch sizes apply to the phone layout');

  await openPanel(page);
  await expect(rows(page)).toHaveCount(3);
  expect(await tooSmall(page)).toEqual([]);

  await page.getByRole('button', { name: 'Ustawienia' }).click();
  await expect(page.locator('.wt-popover')).toBeVisible();
  expect(await tooSmall(page)).toEqual([]);

  // The choice of another person: the two options, the name field, the list of people,
  // and the "OK" of the alert window (002 FR-015).
  await page.getByRole('radio', { name: 'Inny użytkownik' }).check();
  await expect(page.locator('#wt-person-name')).toBeVisible();
  expect(await tooSmall(page)).toEqual([]);
  await page.locator('#wt-person-name').fill('Nowak');
  await page.locator('.wt-popover__actions .wt-button--primary').click();
  await expect(page.locator('.wt-people__option')).toHaveCount(3);
  expect(await tooSmall(page)).toEqual([]);
  await page.locator('#wt-person-name').fill('Jan Nieistniejący');
  await page.locator('.wt-popover__actions .wt-button--primary').click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  const ok = await page.getByRole('alertdialog').getByRole('button', { name: 'OK' }).boundingBox();
  expect(ok && ok.width >= 44 && ok.height >= 44).toBe(true);
});

test('every control is reachable by keyboard and shows a focus ring', async ({ page }) => {
  await openPanel(page);
  await expect(rows(page)).toHaveCount(3);

  const expected = await root(page).evaluate(
    (node, selector) =>
      // "Cofnij" and "Ponów" are switched off until there is a view to go to: no stop for Tab.
      [...node.querySelectorAll<HTMLElement>(selector)].filter(
        (element) => element.getClientRects().length > 0 && !element.matches(':disabled'),
      ).length,
    CONTROLS,
  );

  const reached = new Set<string>();
  const withoutRing: string[] = [];
  for (let step = 0; step < expected + 30; step += 1) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate((selector) => {
      // The add-on lives in a shadow root: the page only sees its host as focused.
      const node = document.getElementById('jira-custom-tempo')?.shadowRoot?.activeElement as HTMLElement | null;
      if (!node || !node.matches(selector)) return null;
      const style = getComputedStyle(node);
      const all = [...(node.getRootNode() as ShadowRoot).querySelectorAll(selector)];
      return {
        index: all.indexOf(node),
        label: node.textContent?.trim() || node.getAttribute('aria-label') || node.id,
        ring: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2,
      };
    }, CONTROLS);
    if (!info) continue;
    reached.add(String(info.index));
    if (!info.ring) withoutRing.push(info.label);
  }

  expect(reached.size).toBe(expected);
  expect(withoutRing).toEqual([]);
});

test('the add-on can be used with the keyboard alone', async ({ page }) => {
  await openPanel(page);
  // Opening moved the focus into the panel.
  await expect(page.getByRole('button', { name: 'Zamknij' })).toBeFocused();

  const gear = page.getByRole('button', { name: 'Ustawienia' });
  await gear.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#wt-interval')).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(page.locator('.wt-popover')).toBeHidden();
  await expect(gear).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(panel(page)).toBeHidden();
  await expect(launcher(page)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(panel(page)).toBeVisible();
});

test('the choice of another person is named for assistive technology and works by keyboard', async ({ page }) => {
  await openPanel(page);
  await page.getByRole('button', { name: 'Ustawienia' }).click();

  // One named group of two radio buttons (002 FR-043).
  const group = page.getByRole('radiogroup', { name: 'Użytkownik' });
  await expect(group.getByRole('radio')).toHaveCount(2);
  await expect(group.getByRole('radio', { name: 'Obecny użytkownik' })).toBeChecked();

  await group.getByRole('radio', { name: 'Inny użytkownik' }).check();
  const field = page.getByRole('textbox', { name: 'Imię i nazwisko' });
  await expect(field).toBeFocused();
  await field.fill('Nowak');
  await page.keyboard.press('Enter');

  // The list is a group named by its heading line; Tab walks it, Enter picks.
  const list = page.getByRole('group', { name: 'Znaleziono kilka osób. Wybierz jedną:' });
  const entries = list.getByRole('button');
  await expect(entries).toHaveCount(3);
  for (const entry of await entries.all()) {
    await expect(entry).toBeFocused();
    await page.keyboard.press('Tab');
  }
  await page.keyboard.press('Shift+Tab');
  await expect(entries.last()).toBeFocused();
  expect(await entries.last().evaluate((node) => getComputedStyle(node).outlineStyle)).not.toBe('none');
  await page.keyboard.press('Enter');
  await expect(field).toHaveValue('Piotr Nowakowski');
  const save = page.locator('.wt-popover__actions .wt-button--primary');
  await expect(save).toBeFocused();

  // A name nobody has: the alert is announced with its text and holds the focus.
  await field.fill('Jan Nieistniejący');
  await page.keyboard.press('Enter');
  const alert = page.getByRole('alertdialog', { name: 'Nie znaleziono użytkownika. Nie można zapisać ustawień.' });
  await expect(alert).toBeVisible();
  await expect(alert.getByRole('button', { name: 'OK' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(alert).toBeHidden();
  await expect(field).toBeFocused();
});

test('"Zapisz" says that it is checking while Jira is asked', async ({ page }) => {
  await openPanel(page, { delay: 400 });
  await expect(rows(page)).toHaveCount(3);
  await page.getByRole('button', { name: 'Ustawienia' }).click();
  await page.getByRole('radio', { name: 'Inny użytkownik' }).check();
  await page.locator('#wt-person-name').fill('Piotr Nowakowski');
  const save = page.locator('.wt-popover__actions .wt-button--primary');
  await save.click();

  await expect(save).toHaveAttribute('aria-busy', 'true');
  await expect(save).toHaveAttribute('aria-disabled', 'true');
  await expect(save).toHaveAccessibleName('Sprawdzanie…');
  await expect(page.getByRole('radio', { name: 'Obecny użytkownik' })).toBeDisabled();
  await expect(page.locator('#wt-person-name')).not.toBeEditable();
  // The focus did not fall out of the add-on.
  await expect(save).toBeFocused();

  await expect(page.locator('.wt-popover')).toBeHidden();
  await expect(page.locator('.wt-person')).toHaveText('Piotr Nowakowski');
});

test('the export control and its menu are named, sized, and focusable (003 FR-007, FR-008)', async ({
  page,
}, testInfo) => {
  await openPanel(page);
  const control = page.getByRole('button', { name: 'Eksport', exact: true });
  await expect(control).toBeVisible();
  await expect(control).toHaveAttribute('aria-haspopup', 'menu');
  await expect(control).toHaveAttribute('aria-expanded', 'false');

  // Opened by keyboard, so the focus ring of the first format shows.
  await control.focus();
  await page.keyboard.press('ArrowDown');
  const menu = page.getByRole('menu', { name: 'Eksport' });
  await expect(menu).toBeVisible();
  await expect(control).toHaveAttribute('aria-expanded', 'true');
  const items = menu.getByRole('menuitem');
  await expect(items).toHaveText(['*.csv', '*.xlsx']);
  await expect(page.getByRole('menuitem', { name: 'Eksport do pliku CSV' })).toBeFocused();
  await expect(page.getByRole('menuitem', { name: 'Eksport do pliku XLSX' })).toBeVisible();

  const ring = () =>
    page.evaluate(() => {
      const node = document.getElementById('jira-custom-tempo')?.shadowRoot?.activeElement as HTMLElement;
      const style = getComputedStyle(node);
      return style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2;
    });
  expect(await ring()).toBe(true);
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Eksport do pliku XLSX' })).toBeFocused();
  expect(await ring()).toBe(true);

  if (testInfo.project.name === 'phone') {
    // The button and both formats are touch targets.
    expect(await tooSmall(page)).toEqual([]);
  }

  await page.keyboard.press('Escape');
  await expect(control).toBeFocused();
  await expect(control).toHaveAttribute('aria-expanded', 'false');
  expect(await ring()).toBe(true);
});
