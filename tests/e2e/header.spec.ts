// The header and its rows, in a real browser, on the stand-in Jira page
// (specs/004-reset-button-toolbar/quickstart.md, V1 to V9). Runs at 320 px with touch and at
// 1280 px: the same rows at both widths.
import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  chip,
  contrast,
  expectInsideWindow,
  openPanel,
  paintedColour,
  panel,
  rows,
  setTheme,
  titleTotal,
} from './helpers';

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const WINDOW = ['Minimalizuj', 'Zamknij'];
const TOOLS = ['Cofnij', 'Ponów', 'Odśwież', 'Resetuj', 'Ustawienia'];

const named = (page: Page, name: string): Locator => page.getByRole('button', { name, exact: true });
const windowButtons = (page: Page): Locator => page.locator('.wt-header__window button');
const tools = (page: Page): Locator => page.locator('.wt-header__tools button');
const settings = (page: Page): Locator => page.locator('.wt-popover');
const isPhone = (page: Page): boolean => (page.viewportSize()?.width ?? 0) <= 600;
const right = (box: Box): number => box.x + box.width;
const bottom = (box: Box): number => box.y + box.height;

async function box(locator: Locator): Promise<Box> {
  const found = await locator.boundingBox();
  if (!found) throw new Error('not laid out');
  return found;
}

const boxes = (locator: Locator): Promise<Box[]> =>
  locator.evaluateAll((nodes) =>
    nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }),
  );

/** The panel without its border: what its children are laid out in. */
const inner = (page: Page): Promise<Box> =>
  panel(page).evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return {
      x: rect.x + node.clientLeft,
      y: rect.y + node.clientTop,
      width: node.clientWidth,
      height: rect.height - 2 * node.clientTop,
    };
  });

/** A box as distances from the panel's inner edges, so two page loads can be compared. */
async function placed(page: Page, locator: Locator): Promise<Box> {
  const [frame, own] = [await inner(page), await box(locator)];
  return { x: own.x - frame.x, y: own.y - frame.y, width: own.width, height: own.height };
}

function expectInside(own: Box, frame: Box, what: string): void {
  expect(own.x, `${what}: left`).toBeGreaterThanOrEqual(frame.x - 0.5);
  expect(own.y, `${what}: top`).toBeGreaterThanOrEqual(frame.y - 0.5);
  expect(right(own), `${what}: right`).toBeLessThanOrEqual(right(frame) + 0.5);
  expect(bottom(own), `${what}: bottom`).toBeLessThanOrEqual(bottom(frame) + 0.5);
}

/** The longest title the panel has: a range of dates with its total. */
async function goToYear(page: Page): Promise<void> {
  await chip(page, 'Rok').click();
  await expect(chip(page, 'Rok')).toHaveAttribute('aria-pressed', 'true');
  await expect(titleTotal(page)).not.toHaveText('…');
}

async function store(page: Page, sizes: { panelHeight: number | null; panelWidth: number | null }): Promise<void> {
  await page.addInitScript(
    (value) => localStorage.setItem('worktime.settings.v1', value),
    JSON.stringify({ refreshMinutes: 5, theme: 'dark', launcher: null, lastPerson: null, ...sizes }),
  );
}

test.describe('the rows of the header', () => {
  test('the title row has the two window buttons, the toolbar the other five (FR-001, FR-002, FR-004)', async ({
    page,
  }) => {
    await openPanel(page);
    await expect(rows(page)).toHaveCount(3);
    await expect(windowButtons(page)).toHaveCount(2);
    await expect(tools(page)).toHaveCount(5);
    for (const [index, name] of WINDOW.entries())
      await expect(windowButtons(page).nth(index)).toHaveAccessibleName(name);
    for (const [index, name] of TOOLS.entries()) await expect(tools(page).nth(index)).toHaveAccessibleName(name);

    const frame = await inner(page);
    const upper = await boxes(windowButtons(page));
    const lower = await boxes(tools(page));
    for (const button of [...upper, ...lower]) expectInside(button, frame, 'a header button');
    // Each row is one line; the toolbar stands under the title row, the period box under both.
    expect(new Set(upper.map((button) => Math.round(button.y))).size).toBe(1);
    expect(new Set(lower.map((button) => Math.round(button.y))).size).toBe(1);
    const text = await box(page.locator('.wt-header__text'));
    const titleRowEnd = Math.max(bottom(text), ...upper.map(bottom));
    expect(Math.min(...lower.map((button) => button.y))).toBeGreaterThanOrEqual(titleRowEnd - 0.5);
    const period = await box(page.locator('.wt-period'));
    expect(period.y).toBeGreaterThanOrEqual(Math.max(...lower.map(bottom)));
    // The name and the title stand at the left of the window buttons, level with them.
    expect(right(text)).toBeLessThanOrEqual(Math.min(...upper.map((button) => button.x)) + 0.5);
    expect(Math.abs(text.y - (upper[0] as Box).y)).toBeLessThan(1);
    // Nothing of the header stands above the name of the person.
    await expect(page.locator('.wt-header .wt-app')).toHaveCount(0);
    await expectInsideWindow(page);
  });

  test('the toolbar stands clear of the title, and the bar or chart clear of its neighbours (FR-024)', async ({
    page,
  }) => {
    await openPanel(page);
    await expect(rows(page)).toHaveCount(3);
    // Twice the spacing of 16 px above the toolbar, besides the gap between rows.
    const titleRow = await box(page.locator('.wt-header__bar'));
    const toolbar = await box(page.locator('.wt-header__tools'));
    expect(Math.abs(toolbar.y - bottom(titleRow) - (32 + 8))).toBeLessThan(1);

    // The spacing of 16 px above and below the part with the bar, the same at both sides.
    const period = await box(page.locator('.wt-period'));
    const progress = await box(page.locator('.wt-progress'));
    const table = await box(page.locator('.wt-table-wrap'));
    expect(Math.abs(progress.y - bottom(period) - 16)).toBeLessThan(1);
    expect(Math.abs(table.y - bottom(progress) - 16)).toBeLessThan(1);

    // The same above the chart of a longer period.
    await chip(page, 'Tydzień').click();
    await expect(page.locator('.wt-chart__bar').first()).toBeAttached();
    const chart = await box(page.locator('.wt-progress'));
    expect(Math.abs(chart.y - bottom(await box(page.locator('.wt-period'))) - 16)).toBeLessThan(1);
  });

  test('the window buttons stand at the top right corner for every title (FR-003, SC-008)', async ({ page }) => {
    await openPanel(page);
    await expect(rows(page)).toHaveCount(3);
    const edge = isPhone(page) ? { top: 12, right: 12 } : { top: 16, right: 20 };
    const frame = await inner(page);
    const close = await box(named(page, 'Zamknij'));
    expect(Math.abs(close.y - frame.y - edge.top)).toBeLessThan(1.5);
    expect(Math.abs(right(frame) - right(close) - edge.right)).toBeLessThan(1.5);
    const minimise = await box(named(page, 'Minimalizuj'));
    expect(Math.abs(close.x - right(minimise) - 8)).toBeLessThan(0.5);

    const places = async () => [
      await placed(page, named(page, 'Minimalizuj')),
      await placed(page, named(page, 'Zamknij')),
    ];
    const day = await places();
    await goToYear(page);
    expect(await places()).toEqual(day);

    // The longest name with the longest title.
    await openPanel(page, { scenario: 'long-name' });
    await goToYear(page);
    expect(await places()).toEqual(day);
    const title = await box(page.locator('.wt-title'));
    const name = await box(page.locator('.wt-person'));
    const first = await box(named(page, 'Minimalizuj'));
    expect(right(title)).toBeLessThanOrEqual(first.x + 0.5);
    expect(right(name)).toBeLessThanOrEqual(first.x + 0.5);
    // What the title needs more, the toolbar gives way for: it stands under the title.
    const toolbar = await box(page.locator('.wt-header__tools'));
    expect(toolbar.y).toBeGreaterThanOrEqual(bottom(title) - 0.5);
    if (isPhone(page)) expect(title.height).toBeGreaterThan(30);
    await expectInsideWindow(page);
  });

  test('the toolbar is centred, with 8 px between its buttons (FR-004, FR-007)', async ({ page }) => {
    await openPanel(page);
    await expect(rows(page)).toHaveCount(3);
    const all = await boxes(tools(page));
    for (let index = 1; index < all.length; index += 1) {
      const [before, after] = [all[index - 1] as Box, all[index] as Box];
      expect(Math.abs(after.x - right(before) - 8), `gap ${index}`).toBeLessThan(0.5);
    }
    const [first, last] = [all[0] as Box, all.at(-1) as Box];
    const header = await box(page.locator('.wt-header'));
    expect(Math.abs((first.x + right(last)) / 2 - (header.x + header.width / 2))).toBeLessThan(1);
    // Five buttons of the touch size: 5 × 44 px and four gaps.
    if (isPhone(page)) expect(Math.round(right(last) - first.x)).toBe(252);
  });

  test('refresh and reset show their labels where there is room, and only their signs on a phone (FR-007)', async ({
    page,
  }) => {
    await openPanel(page);
    for (const name of ['Odśwież', 'Resetuj']) {
      // The name is there for assistive technology at every width.
      await expect(named(page, name)).toHaveCount(1);
      const label = await box(named(page, name).locator('span'));
      if (isPhone(page)) expect(label.width).toBeLessThanOrEqual(1);
      else expect(label.width).toBeGreaterThan(30);
    }
  });

  for (const mode of ['dark', 'light'] as const) {
    test(`the reset button has the colours of the refresh button (${mode}) (FR-022)`, async ({ page }) => {
      await openPanel(page);
      await setTheme(page, mode);
      await chip(page, 'Miesiąc').click();
      await expect(titleTotal(page)).not.toHaveText('…');
      await expect(named(page, 'Resetuj')).toBeEnabled();
      await page.locator('.wt-title').hover();
      for (const property of ['backgroundColor', 'color'] as const) {
        expect(await paintedColour(named(page, 'Resetuj'), property)).toEqual(
          await paintedColour(named(page, 'Odśwież'), property),
        );
      }
      const border = await named(page, 'Odśwież').evaluate((node) => getComputedStyle(node).borderTopColor);
      await expect(named(page, 'Resetuj')).toHaveCSS('border-top-color', border);
      await expect(windowButtons(page)).toHaveCount(2);
      await expect(tools(page)).toHaveCount(5);
    });
  }

  test('two buttons and five at every width, in both themes (SC-006)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'the widths are set by the test itself');
    for (const width of [320, 600, 1280, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await openPanel(page);
      for (const mode of ['dark', 'light'] as const) {
        await setTheme(page, mode);
        const frame = await inner(page);
        const upper = await boxes(windowButtons(page));
        const lower = await boxes(tools(page));
        expect([upper.length, lower.length], `${width} px, ${mode}`).toEqual([2, 5]);
        for (const button of [...upper, ...lower]) expectInside(button, frame, `a header button at ${width} px`);
        expect(Math.min(...lower.map((button) => button.y))).toBeGreaterThanOrEqual(Math.max(...upper.map(bottom)));
      }
      await expectInsideWindow(page);
    }
  });
});

test.describe('the total row: the name of the add-on, the export, the total (FR-023, FR-025)', () => {
  const app = (page: Page): Locator => page.locator('.wt-footer .wt-app');
  const exportButton = (page: Page): Locator => page.locator('.wt-export__button');
  const total = (page: Page): Locator => page.locator('.wt-footer__total');

  test('the name of the add-on carries the version, in the smallest text, grey, and slanted, at the bottom left', async ({
    page,
  }) => {
    await openPanel(page);
    await expect(rows(page)).toHaveCount(3);
    await expect(page.locator('.wt-app')).toHaveCount(1);
    await expect(app(page)).toHaveText(/^Jira Custom Tempo - \d+\.\d+\.\d+$/);
    await expect(app(page)).toHaveCSS('font-style', 'italic');
    // The smallest text size of the panel.
    await expect(app(page)).toHaveCSS('font-size', '11px');
    await expect(app(page)).toHaveCSS('font-weight', '400');
    // Quieter than the total beside it, yet readable on the panel.
    for (const mode of ['dark', 'light'] as const) {
      await setTheme(page, mode);
      const colour = await paintedColour(app(page));
      expect(colour).not.toEqual(await paintedColour(page.locator('.wt-footer__label')));
      expect(contrast(colour, await paintedColour(panel(page), 'backgroundColor'))).toBeGreaterThanOrEqual(4.5);
    }

    // The bottom left corner: at the left edge of the total row, the last line of the panel.
    const footer = await box(page.locator('.wt-footer'));
    const own = await box(app(page));
    const edge = isPhone(page) ? 12 : 20;
    expectInside(own, footer, 'the name of the add-on');
    expect(Math.abs(own.x - footer.x - edge)).toBeLessThan(1);
    expect(own.height).toBeLessThanOrEqual(isPhone(page) ? 24 : 44);
    const others = [await box(exportButton(page)), await box(total(page))];
    if (isPhone(page)) {
      // No room beside the other two: a line of its own under them.
      expect(own.y).toBeGreaterThanOrEqual(Math.max(...others.map(bottom)));
    } else {
      // On the line of the export button and of the total, at the left of both.
      const middle = (part: Box): number => part.y + part.height / 2;
      for (const other of others) {
        expect(Math.abs(middle(own) - middle(other))).toBeLessThan(1.5);
        expect(right(own)).toBeLessThanOrEqual(other.x + 0.5);
      }
    }
    await expectInsideWindow(page);
  });

  test('the export button stands in the middle of the row where there is room, the total at the right', async ({
    page,
  }) => {
    await openPanel(page);
    await expect(rows(page)).toHaveCount(3);
    await expect(exportButton(page)).toBeVisible();
    const footer = await box(page.locator('.wt-footer'));
    const button = await box(exportButton(page));
    const sum = await box(total(page));
    const edge = isPhone(page) ? 12 : 20;
    expect(Math.abs(right(footer) - right(sum) - edge)).toBeLessThan(1);
    if (isPhone(page)) {
      // Three parts do not fit side by side: the control keeps the left edge (003 FR-001).
      expect(Math.abs(button.x - footer.x - edge)).toBeLessThan(1);
    } else {
      expect(Math.abs(button.x + button.width / 2 - (footer.x + footer.width / 2))).toBeLessThan(1);
      // Also for a long total, in the narrowest panel, and with the menu open.
      await goToYear(page);
      const wide = await box(exportButton(page));
      expect(Math.abs(wide.x + wide.width / 2 - (footer.x + footer.width / 2))).toBeLessThan(1);
      await exportButton(page).click();
      const menu = await box(page.getByRole('menu', { name: 'Eksport' }));
      expect(Math.abs(menu.x - wide.x)).toBeLessThan(1);
      expectInside(menu, await inner(page), 'the export menu');
    }
    expect(right(button)).toBeLessThanOrEqual(sum.x + 0.5);
  });

  test('the row keeps its three places while there is nothing to export', async ({ page }) => {
    await openPanel(page, { scenario: 'empty' });
    await expect(page.locator('.wt-message')).toBeVisible();
    await expect(exportButton(page)).toBeHidden();
    const footer = await box(page.locator('.wt-footer'));
    const own = await box(app(page));
    const sum = await box(total(page));
    const edge = isPhone(page) ? 12 : 20;
    expect(Math.abs(own.x - footer.x - edge)).toBeLessThan(1);
    expect(Math.abs(right(footer) - right(sum) - edge)).toBeLessThan(1);
  });
});

test.describe('the settings under the toolbar (FR-005, SC-013)', () => {
  /** Directly under the toolbar, covering no header button, and inside the panel. */
  async function expectInPlace(page: Page): Promise<void> {
    await expect(settings(page)).toBeVisible();
    const frame = await inner(page);
    const own = await box(settings(page));
    const buttons = [...(await boxes(windowButtons(page))), ...(await boxes(tools(page)))];
    expect(own.y).toBeGreaterThanOrEqual(Math.max(...buttons.map(bottom)));
    expectInside(own, frame, 'the settings');
    if (isPhone(page)) {
      expect(Math.abs(own.x - frame.x - 8)).toBeLessThan(1);
      expect(Math.abs(right(frame) - right(own) - 8)).toBeLessThan(1);
    } else {
      // In the middle, like the toolbar they hang under.
      expect(Math.abs(own.x + own.width / 2 - (frame.x + frame.width / 2))).toBeLessThan(1);
      expect(Math.round(own.width)).toBe(320);
    }
  }

  test('they open under the toolbar, for a short and for the longest title', async ({ page }) => {
    await openPanel(page);
    await expect(rows(page)).toHaveCount(3);
    await named(page, 'Ustawienia').click();
    await expectInPlace(page);
    await page.keyboard.press('Escape');

    await openPanel(page, { scenario: 'long-name' });
    await goToYear(page);
    await named(page, 'Ustawienia').click();
    await expectInPlace(page);
    await expectInsideWindow(page);
  });

  test('they stay inside the smallest and the largest panel', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'phone', 'a phone gives the panel the size of the window');
    await page.setViewportSize({ width: 1920, height: 1080 });
    for (const sizes of [
      { panelHeight: 592, panelWidth: 640 },
      { panelHeight: 900, panelWidth: 1200 },
    ]) {
      await store(page, sizes);
      await openPanel(page, { scenario: 'long-name' });
      const size = await box(panel(page));
      expect([Math.round(size.width), Math.round(size.height)]).toEqual([sizes.panelWidth, sizes.panelHeight]);
      await goToYear(page);
      await named(page, 'Ustawienia').click();
      await expectInPlace(page);
    }
  });

  test('they follow the header when it gets higher while they are open', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'phone', 'the window is made narrower by the test itself');
    await page.setViewportSize({ width: 900, height: 900 });
    await openPanel(page, { scenario: 'long-name' });
    await goToYear(page);
    await named(page, 'Ustawienia').click();
    await expectInPlace(page);
    const before = await box(page.locator('.wt-header'));

    // A narrow window: the title wraps, and the header takes the lines it needs.
    await page.setViewportSize({ width: 340, height: 900 });
    await expect.poll(async () => (await box(page.locator('.wt-header'))).height).toBeGreaterThan(before.height);
    await expectInPlace(page);
  });
});

test('the lowest panel shows a table row under the header of two rows (FR-008, SC-014)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'phone', 'on a phone the window is lower than the lowest panel');
  await page.setViewportSize({ width: 1280, height: 1000 });
  // A height chosen before the header had two rows.
  await store(page, { panelHeight: 440, panelWidth: null });
  await openPanel(page);
  await expect(rows(page)).toHaveCount(3);
  const frame = await box(panel(page));
  expect(Math.round(frame.height)).toBe(592);

  for (const part of ['.wt-header', '.wt-period', '.wt-footer'])
    expectInside(await box(page.locator(part)), frame, part);
  // The panel itself does not scroll: only the rows do.
  expect(await panel(page).evaluate((node) => node.scrollHeight - node.clientHeight)).toBe(0);
  // Room under the column headers for a row of one or two lines.
  const area = await box(page.locator('.wt-table-scroll'));
  const head = await box(page.locator('.wt-table thead'));
  expect(bottom(area) - bottom(head)).toBeGreaterThanOrEqual(46);
});
