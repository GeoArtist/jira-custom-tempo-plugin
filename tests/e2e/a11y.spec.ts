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
