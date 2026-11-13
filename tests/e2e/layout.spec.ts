// The look and feel added by spec Amendments 6 to 8: panel size chosen by the user, the
// launcher the user moves and the panel that hangs on it, spinner over the table, sortable
// columns, the progress tip, the total row, the theme switch, hover colours, minimise and
// close.
import { expect, test } from '@playwright/test';
import { chip, footerTotal, launcher, openPanel, paintedColour, panel, rows, selectDay, theme } from './helpers';

const keys = '.wt-table tbody a.wt-key';

test('the panel keeps one height whatever it shows, and a short table sits at the top', async ({ page }, testInfo) => {
  await openPanel(page);
  await expect(rows(page)).toHaveCount(3);
  const withRows = await panel(page).boundingBox();

  await selectDay(page, '2026-10-01');
  await expect(page.locator('.wt-message')).toHaveText('Brak wpisów czasu w wybranym okresie.');
  const empty = await panel(page).boundingBox();
  expect(empty?.height).toBe(withRows?.height);

  await selectDay(page, '2026-11-06');
  await expect(rows(page)).toHaveCount(3);
  const area = await page.locator('.wt-table-area').boundingBox();
  const table = await page.locator('.wt-table').boundingBox();
  const footer = await page.locator('.wt-footer').boundingBox();
  const box = await panel(page).boundingBox();
  if (!area || !table || !footer || !box) throw new Error('not rendered');
  // The table starts where its area starts; the total row ends where the panel ends.
  expect(Math.abs(table.y - area.y)).toBeLessThan(1);
  // (On a phone the whole panel scrolls, so the total row follows the content instead.)
  if (testInfo.project.name === 'phone') return;
  expect(Math.abs(footer.y + footer.height - (box.y + box.height))).toBeLessThan(3);
});

test('the total row is right-aligned and its label has the colour of the value', async ({ page }) => {
  await openPanel(page);
  await expect(footerTotal(page)).toHaveText('10h 10m');
  const label = page.locator('.wt-footer__label');
  expect(await paintedColour(label)).toEqual(await paintedColour(footerTotal(page)));

  const footer = await page.locator('.wt-footer').boundingBox();
  const value = await footerTotal(page).boundingBox();
  const text = await label.boundingBox();
  if (!footer || !value || !text) throw new Error('not rendered');
  expect(footer.x + footer.width - (value.x + value.width)).toBeLessThan(24);
  expect(value.x - (text.x + text.width)).toBeLessThan(16);
});

test('a column header sorts the table by its column', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'phone', 'the column headers are not shown on a phone');
  await openPanel(page);
  await expect(page.locator(keys)).toHaveText(['AM-10234', 'AM-20012', 'AM-10087']);

  await page.getByRole('button', { name: 'Suma', exact: true }).click();
  await expect(page.locator(keys)).toHaveText(['AM-10087', 'AM-20012', 'AM-10234']);
  await expect(page.locator('th.wt-col-sum')).toHaveAttribute('aria-sort', 'ascending');

  await page.getByRole('button', { name: 'Suma', exact: true }).click();
  await expect(page.locator(keys)).toHaveText(['AM-10234', 'AM-20012', 'AM-10087']);
  await expect(page.locator('th.wt-col-sum')).toHaveAttribute('aria-sort', 'descending');

  await page.getByRole('button', { name: 'Zgłoszenie', exact: true }).click();
  await expect(page.locator(keys)).toHaveText(['AM-10087', 'AM-10234', 'AM-20012']);
  await expect(page.locator('th.wt-col-sum')).toHaveAttribute('aria-sort', 'none');
});

test('the progress bar shows the title and the coloured total while the pointer is over it', async ({ page }) => {
  await openPanel(page);
  await expect(footerTotal(page)).toHaveText('10h 10m');
  const tip = page.locator('.wt-progress__tip');
  await expect(tip).toBeHidden();

  await page.locator('.wt-progress__track').hover();
  await expect(tip).toBeVisible();
  await expect(tip.locator('.wt-progress__tip-period')).toHaveText('Piątek 06-11-2026');
  await expect(tip.locator('.wt-progress__tip-total')).toHaveText('Suma czasu: 10h 10m');
  expect(await paintedColour(tip.locator('.wt-progress__tip-total'))).toEqual(await paintedColour(footerTotal(page)));

  const title = await page.locator('.wt-title').evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
  const small = await tip.evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
  expect(small).toBeLessThan(title);
});

test('the launcher changes colour under the pointer', async ({ page }) => {
  await openPanel(page);
  await page.locator('.wt-title').hover();
  const idle = await paintedColour(launcher(page), 'backgroundColor');
  await launcher(page).hover();
  await expect.poll(() => paintedColour(launcher(page), 'backgroundColor')).not.toEqual(idle);
});

test('minimising keeps the period; the close button starts again on today', async ({ page }) => {
  await openPanel(page);
  await page.getByRole('button', { name: 'Poprzedni okres' }).click();
  await expect(page.locator('.wt-title')).toHaveText('Czwartek 05-11-2026 · 0h 30m');

  await launcher(page).click();
  await expect(panel(page)).toBeHidden();
  await launcher(page).click();
  await expect(page.locator('.wt-title')).toHaveText('Czwartek 05-11-2026 · 0h 30m');
  await expect(chip(page, 'Dzień')).toHaveAttribute('aria-pressed', 'true');

  await page.keyboard.press('Escape');
  await expect(panel(page)).toBeHidden();
  await launcher(page).click();
  await expect(chip(page, 'Dzień')).toHaveAttribute('aria-pressed', 'true');

  // The minimise button of the header, between settings and close, does the same.
  const minimise = page.getByRole('button', { name: 'Minimalizuj' });
  const [gear, own, cross] = await Promise.all(
    [page.getByRole('button', { name: 'Ustawienia' }), minimise, page.getByRole('button', { name: 'Zamknij' })].map(
      (button) => button.boundingBox(),
    ),
  );
  if (!gear || !own || !cross) throw new Error('not rendered');
  expect(own.x).toBeGreaterThan(gear.x);
  expect(own.x).toBeLessThan(cross.x);
  await minimise.click();
  await expect(panel(page)).toBeHidden();
  await expect(launcher(page)).toBeFocused();
  await expect(launcher(page)).toHaveText('05-11-2026: 0h 30m');
  await launcher(page).click();
  await expect(page.locator('.wt-title')).toHaveText('Czwartek 05-11-2026 · 0h 30m');

  await page.getByRole('button', { name: 'Zamknij' }).click();
  await launcher(page).click();
  await expect(page.locator('#wt-day')).toHaveValue('2026-11-06');
  await expect(page.locator('.wt-title')).toHaveText('Piątek 06-11-2026 · 10h 10m');
});

test('settings: a divider under the title, and a sun-and-moon switch at the left', async ({ page }) => {
  await openPanel(page);
  await page.getByRole('button', { name: 'Ustawienia' }).click();
  const popover = page.locator('.wt-popover');
  await expect(popover.locator('.wt-popover__title + .wt-divider')).toBeVisible();

  const toggle = popover.getByRole('switch', { name: 'Tryb ciemny' });
  await expect(toggle.locator('.wt-icon')).toHaveCount(2);
  const label = await popover.locator('label[for="wt-theme"]').boundingBox();
  const box = await toggle.boundingBox();
  const knob = toggle.locator('.wt-switch__knob');
  if (!label || !box) throw new Error('not rendered');
  // The switch follows its label instead of sitting at the right edge.
  expect(box.x - (label.x + label.width)).toBeLessThan(16);
  expect(Math.round(box.width)).toBe(Math.round(box.height * 2));

  // The knob is blue and keeps the same distance to the edge of the switch on every side:
  // at the right in dark mode (under the moon), at the left in light mode (under the sun).
  const gaps = async () => {
    const k = await knob.boundingBox();
    if (!k) throw new Error('no knob');
    return {
      left: Math.round(k.x - box.x),
      right: Math.round(box.x + box.width - (k.x + k.width)),
      top: Math.round(k.y - box.y),
      bottom: Math.round(box.y + box.height - (k.y + k.height)),
    };
  };
  const accent = await paintedColour(popover.locator('.wt-button--primary'), 'backgroundColor');
  expect(await paintedColour(knob, 'backgroundColor')).toEqual(accent);

  // Each icon is centred in the knob's place: the moon at the right, the sun at the left.
  const offCentre = async (name: 'sun' | 'moon') => {
    const k = await knob.boundingBox();
    const i = await toggle.locator(`.wt-switch__icon--${name}`).boundingBox();
    if (!k || !i) throw new Error('not rendered');
    return Math.max(
      Math.abs(k.x + k.width / 2 - (i.x + i.width / 2)),
      Math.abs(k.y + k.height / 2 - (i.y + i.height / 2)),
    );
  };

  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await expect.poll(async () => (await gaps()).right).toBe(4);
  expect(await gaps()).toMatchObject({ right: 4, top: 4, bottom: 4 });
  expect(await offCentre('moon')).toBeLessThan(0.6);

  await toggle.click();
  expect(await theme(page)).toBe('light');
  await expect.poll(async () => (await gaps()).left).toBe(4);
  expect(await gaps()).toMatchObject({ left: 4, top: 4, bottom: 4 });
  expect(await offCentre('sun')).toBeLessThan(0.6);
});

test('settings: the explanation of the interval is a tooltip of its row', async ({ page }) => {
  await openPanel(page);
  await page.getByRole('button', { name: 'Ustawienia' }).click();
  const popover = page.locator('.wt-popover');
  const hint = '0 = automatyczne odświeżanie wyłączone (domyślnie 5 min)';
  await expect(popover.locator('.wt-hint')).toHaveCount(0);
  const row = popover.locator('.wt-popover__row', { has: page.locator('#wt-interval') });
  await expect(row).toHaveAttribute('title', hint);
  await expect(page.locator('#wt-interval')).toHaveAccessibleDescription(hint);
  // The row with the theme follows the interval row directly: no line of text between them.
  const first = await row.boundingBox();
  const second = await popover.locator('.wt-popover__row').nth(1).boundingBox();
  if (!first || !second) throw new Error('not rendered');
  expect(second.y - (first.y + first.height)).toBeLessThan(16);
});

test('the three rows of the period box are centred, with a round step right beside them at mid-height', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === 'phone', 'the rows wrap on a phone');
  await openPanel(page);
  const frame = await page.locator('.wt-period').boundingBox();
  if (!frame) throw new Error('not rendered');
  const centre = frame.x + frame.width / 2;

  for (const row of await page.locator('.wt-period__row').all()) {
    const first = await row.locator(':scope > *').first().boundingBox();
    const last = await row.locator(':scope > *').last().boundingBox();
    if (!first || !last) throw new Error('not rendered');
    expect(Math.abs((first.x + last.x + last.width) / 2 - centre)).toBeLessThan(2);
  }

  // The steps: circles right beside the rows, at the middle of their height.
  const previous = page.getByRole('button', { name: 'Poprzedni okres' });
  const next = page.getByRole('button', { name: 'Następny okres' });
  const [left, right] = [await previous.boundingBox(), await next.boundingBox()];
  const rows = await page.locator('.wt-period__row').all();
  const top = await rows[0]?.boundingBox();
  const bottom = await rows[2]?.boundingBox();
  if (!left || !right || !top || !bottom) throw new Error('not rendered');
  const middle = (top.y + bottom.y + bottom.height) / 2;
  for (const step of [left, right]) {
    expect(step.width).toBe(step.height);
    expect(step.width).toBeLessThan(50);
    expect(Math.abs(step.y + step.height / 2 - middle)).toBeLessThan(1);
  }
  const widest = await rows[2]?.locator(':scope > *').evaluateAll((nodes) => {
    const boxes = nodes.map((node) => node.getBoundingClientRect());
    return [Math.min(...boxes.map((box) => box.left)), Math.max(...boxes.map((box) => box.right))];
  });
  if (!widest) throw new Error('not rendered');
  // 8 px from the widest row at each side, and well inside the frame.
  expect(Math.abs((widest[0] ?? 0) - (left.x + left.width) - 8)).toBeLessThan(1.5);
  expect(Math.abs(right.x - (widest[1] ?? 0) - 8)).toBeLessThan(1.5);
  expect(left.x - frame.x).toBeGreaterThan(40);
  expect(Math.abs(left.x - frame.x - (frame.x + frame.width - (right.x + right.width)))).toBeLessThan(2);
  expect(Number.parseFloat(await next.evaluate((node) => getComputedStyle(node).borderTopLeftRadius))).toBeGreaterThan(
    22,
  );
  await previous.hover();
  await expect(previous).toHaveCSS('cursor', 'pointer');
});

test('buttons change colour under the pointer; the selected preset answers the other way round', async ({ page }) => {
  await openPanel(page);
  await expect(footerTotal(page)).toHaveText('10h 10m');
  const settle = () => page.waitForTimeout(250);

  for (const control of [chip(page, 'Tydzień'), page.getByRole('button', { name: 'Ustawienia' })]) {
    await page.locator('.wt-title').hover();
    const idle = await paintedColour(control, 'backgroundColor');
    await control.hover();
    await settle();
    expect(await paintedColour(control, 'backgroundColor')).not.toEqual(idle);
  }

  // Selected: filled when idle, an outline with coloured text under the pointer.
  const active = chip(page, 'Dzień');
  await page.getByRole('button', { name: 'Poprzedni okres' }).click();
  await expect(active).toHaveAttribute('aria-pressed', 'true');
  await expect(footerTotal(page)).toHaveText('0h 30m');
  await page.locator('.wt-title').hover();
  await settle();
  const filled = await paintedColour(active, 'backgroundColor');
  const plain = await paintedColour(chip(page, 'Rok'), 'backgroundColor');
  await active.hover();
  await settle();
  const hovered = await paintedColour(active, 'backgroundColor');
  expect(hovered).not.toEqual(filled);
  expect(hovered).not.toEqual(plain);
  expect(await paintedColour(active)).toEqual(await paintedColour(page.locator('.wt-table tbody a.wt-key').first()));
});

test('the launcher names the period of the panel and mutes a total of zero', async ({ page }) => {
  await openPanel(page);
  await expect(launcher(page)).toHaveText('Dziś: 10h 10m');

  await page.getByRole('button', { name: 'Poprzedni okres' }).click();
  await expect(launcher(page)).toHaveText('05-11-2026: 0h 30m');
  // A day with logged time: the dot has the colour of the total, as the bar would.
  const dot = launcher(page).locator('.wt-launcher__dot');
  expect(await paintedColour(dot, 'backgroundColor')).toEqual(await paintedColour(launcher(page).locator('.wt-total')));

  // An empty day, then an empty range of three days.
  await selectDay(page, '2026-10-01');
  await expect(launcher(page)).toHaveText('01-10-2026: 0h 00m');
  await page.locator('#wt-to').fill('2026-10-03T23:59');
  await expect(launcher(page)).toHaveText('Zakres: 0h 00m');
  // Muted: not the colour of ordinary text, and the dot agrees with the value.
  const muted = await paintedColour(launcher(page).locator('.wt-total'));
  expect(muted).not.toEqual(await paintedColour(launcher(page).locator('.wt-launcher__label')));
  expect(await paintedColour(dot, 'backgroundColor')).toEqual(muted);
  // The same muted zero in the title and in the whole total row.
  expect(await paintedColour(page.locator('.wt-title .wt-total'))).toEqual(muted);
  expect(await paintedColour(footerTotal(page))).toEqual(muted);
  expect(await paintedColour(page.locator('.wt-footer__label'))).toEqual(muted);
  expect(await paintedColour(page.locator('.wt-title__text'))).not.toEqual(muted);

  await page.getByRole('button', { name: 'Zamknij' }).click();
  await expect(launcher(page)).toHaveText('Dziś: 10h 10m');
});

test('the header has no subtitle and the bar stands midway between the period box and the table', async ({
  page,
}, testInfo) => {
  await openPanel(page);
  await expect(page.locator('.wt-header__text > *')).toHaveCount(1);
  await expect(panel(page)).not.toContainText('Twój zalogowany czas');
  if (testInfo.project.name === 'phone') return;

  const period = await page.locator('.wt-period').boundingBox();
  const track = await page.locator('.wt-progress__track').boundingBox();
  const scale = await page.locator('.wt-progress__scale').boundingBox();
  const table = await page.locator('.wt-table-wrap').boundingBox();
  if (!period || !track || !scale || !table) throw new Error('not rendered');
  const above = track.y - (period.y + period.height);
  const below = table.y - (scale.y + scale.height);
  expect(Math.abs(above - below)).toBeLessThan(2);
});

test('the user sets the height of the panel by dragging its top edge, and it is remembered', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === 'phone', 'on a phone the window is lower than the lowest panel');
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openPanel(page);
  await expect(rows(page)).toHaveCount(3);
  const height = async () => Math.round((await panel(page).boundingBox())?.height ?? 0);
  // The default is half of the window.
  expect(await height()).toBe(500);

  const drag = async (by: number) => {
    const grip = await page.locator('.wt-resize--block').boundingBox();
    if (!grip) throw new Error('no handle');
    const x = grip.x + grip.width / 2;
    const y = grip.y + grip.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y - by, { steps: 4 });
    await page.mouse.up();
  };

  await drag(200);
  expect(await height()).toBe(700);

  // Far down: the panel stops at its lowest height, where one whole row is still visible.
  await drag(-600);
  expect(await height()).toBe(440);
  const area = await page.locator('.wt-table-scroll').boundingBox();
  const head = await page.locator('.wt-table thead').boundingBox();
  if (!area || !head) throw new Error('not rendered');
  // Room under the column headers for a row of one or two lines.
  expect(area.y + area.height - (head.y + head.height)).toBeGreaterThanOrEqual(46);

  await drag(160);
  expect(await height()).toBe(600);
  await page.reload();
  await launcher(page).click();
  expect(await height()).toBe(600);

  // A double click on the edge goes back to the default.
  await page.locator('.wt-resize--block').dblclick();
  expect(await height()).toBe(500);
  await page.reload();
  await launcher(page).click();
  expect(await height()).toBe(500);
});

test('the user sets the width at the side edge and both dimensions at the corner', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'phone', 'on a phone the panel takes the whole width');
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openPanel(page);
  await expect(rows(page)).toHaveCount(3);
  const size = async () => {
    const box = await panel(page).boundingBox();
    return [Math.round(box?.width ?? 0), Math.round(box?.height ?? 0)];
  };
  expect(await size()).toEqual([800, 500]);

  const drag = async (kind: string, dx: number, dy: number) => {
    const grip = await page.locator(`.wt-resize--${kind}`).boundingBox();
    if (!grip) throw new Error('no handle');
    // The middle of the side grip; the corner grip is small enough for its own middle.
    const x = grip.x + grip.width / 2;
    const y = grip.y + grip.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx, y + dy, { steps: 4 });
    await page.mouse.up();
  };

  // The free edges are the left and the top: the panel hangs on the launcher at its right.
  await drag('inline', -100, 0);
  expect(await size()).toEqual([900, 500]);
  const right = async () => {
    const box = await panel(page).boundingBox();
    return Math.round((box?.x ?? 0) + (box?.width ?? 0));
  };
  expect(await right()).toBe(1280 - 88);

  // Far to the right: the panel stops at its narrowest, where the table still reads well.
  await drag('inline', 700, 0);
  expect(await size()).toEqual([640, 500]);
  for (const cell of ['.wt-col-key', '.wt-col-sum', '.wt-entries li']) {
    const node = page.locator(`.wt-table tbody ${cell}`).first();
    expect(await node.evaluate((n) => getComputedStyle(n).whiteSpace)).toBe('nowrap');
    expect(await node.evaluate((n) => n.scrollWidth <= n.clientWidth)).toBe(true);
  }
  expect(await page.locator('.wt-table-scroll').evaluate((n) => n.scrollWidth <= n.clientWidth)).toBe(true);
  // The rows of the period box still take one line each.
  for (const row of await page.locator('.wt-period__row').all()) {
    expect((await row.boundingBox())?.height).toBeLessThan(40);
  }

  await drag('corner', -160, -100);
  expect(await size()).toEqual([800, 600]);
  await page.reload();
  await launcher(page).click();
  expect(await size()).toEqual([800, 600]);

  await page.locator('.wt-resize--inline').focus();
  await page.keyboard.press('ArrowLeft');
  expect(await size()).toEqual([816, 600]);

  // A double click on the corner goes back to the default size.
  await page.locator('.wt-resize--corner').dblclick();
  expect(await size()).toEqual([800, 500]);
});

test('the panel hangs on the launcher, which the user drags anywhere in the window', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'phone', 'a phone has no room to move the panel around');
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openPanel(page);
  await expect(rows(page)).toHaveCount(3);

  const boxes = async () => {
    const p = await panel(page).boundingBox();
    const l = await launcher(page).boundingBox();
    if (!p || !l) throw new Error('not rendered');
    return { p, l };
  };
  const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1.5);
  const dragTo = async (x: number, y: number) => {
    const { l } = await boxes();
    await page.mouse.move(l.x + l.width / 2, l.y + l.height / 2);
    await page.mouse.down();
    await page.mouse.move(x, y, { steps: 6 });
    await page.mouse.up();
  };

  // By default: above the launcher, the right edges in one line.
  let { p, l } = await boxes();
  near(p.y + p.height + 8, l.y);
  near(p.x + p.width, l.x + l.width);

  // A little to the left and up: the panel follows, and the drag does not close it.
  await dragTo(900, 800);
  await expect(panel(page)).toBeVisible();
  ({ p, l } = await boxes());
  near(l.x + l.width / 2, 900);
  near(l.y + l.height / 2, 800);
  near(p.y + p.height + 8, l.y);
  near(p.x + p.width, l.x + l.width);

  // At the top there is no room above: the panel goes below the launcher.
  await dragTo(1000, 60);
  ({ p, l } = await boxes());
  near(p.y, l.y + l.height + 8);
  near(p.x + p.width, l.x + l.width);
  await expect(panel(page)).toHaveAttribute('data-free-block', 'bottom');
  await expect(panel(page)).toHaveAttribute('data-free-inline', 'left');
  const grip = await page.locator('.wt-resize--block').boundingBox();
  near((grip?.y ?? 0) + (grip?.height ?? 0), p.y + p.height);

  // At the bottom left there is no room to the left: the left edges line up.
  await dragTo(120, 940);
  ({ p, l } = await boxes());
  near(p.y + p.height + 8, l.y);
  near(p.x, l.x);
  await expect(panel(page)).toHaveAttribute('data-free-block', 'top');
  await expect(panel(page)).toHaveAttribute('data-free-inline', 'right');

  // Far outside the window: the launcher stops at the edge.
  await dragTo(-200, 2000);
  ({ l } = await boxes());
  expect(l.x).toBeGreaterThanOrEqual(0);
  expect(l.y + l.height).toBeLessThanOrEqual(1000);

  // The place is remembered, and a plain click still opens and closes the panel.
  await dragTo(700, 500);
  const before = (await boxes()).l;
  await page.reload();
  await expect(launcher(page)).toBeVisible();
  const after = await launcher(page).boundingBox();
  // The place is kept as the distance from the right and bottom edges.
  near((after?.x ?? 0) + (after?.width ?? 0), before.x + before.width);
  near(after?.y ?? 0, before.y);
  await launcher(page).click();
  await expect(panel(page)).toBeVisible();
  await launcher(page).click();
  await expect(panel(page)).toBeHidden();

  // With the keyboard: Shift and an arrow move it one step.
  await launcher(page).focus();
  await page.keyboard.press('Shift+ArrowUp');
  near((await launcher(page).boundingBox())?.y ?? 0, before.y - 16);
});

test('the launcher shows no text cursor and its text cannot be selected', async ({ page }) => {
  await openPanel(page);
  await launcher(page).click();
  await expect(panel(page)).toBeHidden();
  await expect(launcher(page)).toBeFocused();
  const style = await launcher(page).evaluate((node) => {
    const computed = getComputedStyle(node);
    return [computed.caretColor, computed.userSelect];
  });
  expect(style).toEqual(['rgba(0, 0, 0, 0)', 'none']);
});

test('the panel stays above the launcher on every screen', async ({ page }) => {
  await openPanel(page);
  const p = await panel(page).boundingBox();
  const l = await launcher(page).boundingBox();
  if (!p || !l) throw new Error('not rendered');
  expect(p.y + p.height).toBeLessThanOrEqual(l.y - 7);
});

// FR-075: wherever the launcher is and whatever size was chosen, the panel and the launcher
// are both wholly inside the window and do not cover each other.
for (const view of [
  { width: 1280, height: 900 },
  { width: 1000, height: 560 },
]) {
  test(`the panel and the launcher always fit into the window together (${view.width}x${view.height})`, async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'one window size per run is set by the test itself');
    await page.setViewportSize(view);
    await openPanel(page);
    await expect(rows(page)).toHaveCount(3);

    // As large as the panel goes: the height and the width far beyond the window.
    await page.evaluate(() => {
      const key = 'worktime.settings.v1';
      const settings = JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, unknown>;
      localStorage.setItem(key, JSON.stringify({ ...settings, panelHeight: 3000, panelWidth: 700 }));
    });
    await page.reload();
    await launcher(page).click();
    await expect(rows(page)).toHaveCount(3);

    const check = async (where: string) => {
      const p = await panel(page).boundingBox();
      const l = await launcher(page).boundingBox();
      if (!p || !l) throw new Error('not rendered');
      for (const [name, box] of Object.entries({ panel: p, launcher: l })) {
        expect(box.x, `${name} left at ${where}`).toBeGreaterThanOrEqual(0);
        expect(box.y, `${name} top at ${where}`).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width, `${name} right at ${where}`).toBeLessThanOrEqual(view.width + 0.5);
        expect(box.y + box.height, `${name} bottom at ${where}`).toBeLessThanOrEqual(view.height + 0.5);
      }
      const apart = p.y + p.height <= l.y + 0.5 || p.y >= l.y + l.height - 0.5;
      expect(apart, `panel clear of the launcher at ${where}`).toBe(true);
    };

    await check('the default corner');
    for (const fx of [0.02, 0.3, 0.5, 0.7, 0.98]) {
      for (const fy of [0.02, 0.25, 0.5, 0.75, 0.98]) {
        const l = await launcher(page).boundingBox();
        if (!l) throw new Error('not rendered');
        await page.mouse.move(l.x + l.width / 2, l.y + l.height / 2);
        await page.mouse.down();
        await page.mouse.move(view.width * fx, view.height * fy, { steps: 3 });
        await page.mouse.up();
        await expect(panel(page)).toBeVisible();
        await check(`${fx} x ${fy}`);
      }
    }

    // In the middle of a low window the panel is lower than its content: it scrolls, and the
    // total row can be reached.
    await page.locator('.wt-footer').scrollIntoViewIfNeeded();
    await expect(footerTotal(page)).toBeInViewport();
  });
}

// The side of the launcher is chosen afresh when the window changes: a panel that had to
// leave the launcher's edge in a narrow window comes back to it in a wide one.
test('the panel stays on the launcher when the window is resized', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'the test sets its own window sizes');
  await page.setViewportSize({ width: 1500, height: 1000 });
  await openPanel(page);
  await expect(rows(page)).toHaveCount(3);

  const boxes = async () => {
    const p = await panel(page).boundingBox();
    const l = await launcher(page).boundingBox();
    if (!p || !l) throw new Error('not rendered');
    return { p, l };
  };
  const near = (a: number, b: number, what: string) => expect(Math.abs(a - b), what).toBeLessThan(1.5);

  // The launcher at the top left: the panel hangs below it, the left edges in one line.
  let { l } = await boxes();
  await page.mouse.move(l.x + l.width / 2, l.y + l.height / 2);
  await page.mouse.down();
  await page.mouse.move(260, 240, { steps: 4 });
  await page.mouse.up();

  for (const width of [1500, 700, 1100, 500, 1500, 900, 1500]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect
      .poll(async () => {
        const now = await boxes();
        // The panel is placed again a moment after the window has changed.
        return now.l.x + now.l.width <= width && now.p.x >= 0 && now.p.x + now.p.width <= width;
      })
      .toBe(true);
    const { p, l: hook } = await boxes();
    near(p.y, hook.y + hook.height + 8, `below the launcher at ${width}`);
    expect(p.x, `inside at ${width}`).toBeGreaterThanOrEqual(0);
    // Whenever the panel fits beside one of the launcher's edges, it is on that edge.
    // (A window up to 600 px wide has the narrower edge of a phone.)
    const edge = width <= 600 ? 8 : 16;
    const fitsRight = hook.x + hook.width - p.width >= edge;
    const fitsLeft = hook.x + p.width <= width - edge;
    if (fitsRight) near(p.x + p.width, hook.x + hook.width, `right edges at ${width}`);
    else if (fitsLeft) near(p.x, hook.x, `left edges at ${width}`);
    else near(p.x + p.width, width - edge, `held inside at ${width}`);
  }

  // The height of the window too: the panel changes sides and keeps hanging on the launcher.
  for (const height of [1000, 620, 1000]) {
    await page.setViewportSize({ width: 1500, height });
    await expect.poll(async () => (await boxes()).l.y + 44 <= height).toBe(true);
    const { p, l: hook } = await boxes();
    const above = Math.abs(p.y + p.height + 8 - hook.y) < 1.5;
    const below = Math.abs(p.y - (hook.y + hook.height + 8)) < 1.5;
    expect(above || below, `on the launcher at height ${height}`).toBe(true);
    expect(p.y).toBeGreaterThanOrEqual(0);
    expect(p.y + p.height).toBeLessThanOrEqual(height + 0.5);
  }
});
