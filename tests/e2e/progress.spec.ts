import { expect, test } from '@playwright/test';
import { footerTotal, openPanel, paintedColour, panel, titleTotal } from './helpers';

const cases = [
  { scenario: 'h4', total: '4h 00m', fill: 30 },
  { scenario: 'h8', total: '8h 00m', fill: 60 },
  { scenario: 'h20', total: '20h 00m', fill: 90 },
];

for (const { scenario, total, fill } of cases) {
  test(`bar and coloured totals at ${total}`, async ({ page }) => {
    await openPanel(page, { scenario });
    await expect(titleTotal(page)).toHaveText(total);
    // Nothing is written under the bar, and nothing in the panel talks about the norm.
    await expect(page.locator('.wt-progress__caption')).toHaveCount(0);
    await expect(panel(page)).not.toContainText(/norm/i);

    // The uncovered part of the track ends where the logged time is on the scale.
    const track = await page.locator('.wt-progress__track').boundingBox();
    const cover = await page.locator('.wt-progress__cover').boundingBox();
    if (!track || !cover) throw new Error('progress bar is not laid out');
    expect(((cover.x - track.x) / track.width) * 100).toBeCloseTo(fill, 0);

    await expect(page.locator('.wt-progress__track')).toHaveAttribute('role', 'progressbar');
    await expect(page.locator('.wt-progress__track')).toHaveAttribute('aria-valuetext', total);

    // Both totals share one colour, and it is not the normal text colour (FR-018).
    const title = await paintedColour(titleTotal(page));
    expect(await paintedColour(footerTotal(page))).toEqual(title);
    expect(title).not.toEqual(await paintedColour(page.locator('.wt-title__text')));
  });
}

test('the colour moves from blue-green towards red as the day gets longer', async ({ page }) => {
  const colours: number[][] = [];
  for (const scenario of ['h4', 'h20']) {
    await openPanel(page, { scenario });
    await expect(titleTotal(page)).toHaveText(scenario === 'h4' ? '4h 00m' : '20h 00m');
    colours.push(await paintedColour(titleTotal(page)));
  }
  const [short = [], long = []] = colours;
  // Four hours: more green and blue than red. Twenty hours: red dominates.
  expect((short[1] ?? 0) + (short[2] ?? 0)).toBeGreaterThan((short[0] ?? 0) * 1.5);
  expect(long[0] ?? 0).toBeGreaterThan(long[2] ?? 0);
  expect(long[0] ?? 0).toBeGreaterThan(long[1] ?? 0);
});
