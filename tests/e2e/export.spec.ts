// The export of the table to a file, in a real browser, on the stand-in Jira page
// (specs/003-table-export/quickstart.md, V1 to V21). Runs at 320 px and at 1280 px. The
// downloads are caught and the saved files are read back.
import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { unzip } from '../helpers/unzip';
import {
  chip,
  contrast,
  footerTotal,
  openPanel,
  paintedColour,
  panel,
  rows,
  setTheme,
  type OpenOptions,
} from './helpers';

const HEADER = 'Zgłoszenie;Tytuł;Czas wpisów;Suma';
const FAILED = 'Nie udało się utworzyć pliku.';

const exportButton = (page: Page): Locator => page.locator('.wt-export__button');
const exportMenu = (page: Page): Locator => page.getByRole('menu', { name: 'Eksport' });
const format = (page: Page, name: 'CSV' | 'XLSX'): Locator =>
  page.getByRole('menuitem', { name: `Eksport do pliku ${name}` });
const exportMessage = (page: Page): Locator => page.locator('.wt-export__message');
const focused = (page: Page): Promise<string> =>
  page.evaluate(() => {
    const node = document.getElementById('jira-custom-tempo')?.shadowRoot?.activeElement;
    return node?.getAttribute('aria-label') ?? node?.textContent?.trim() ?? '';
  });

async function open(page: Page, options: OpenOptions = {}): Promise<void> {
  await openPanel(page, options);
  // Hidden until the first rows are on screen.
  await expect(exportButton(page)).toBeVisible();
  await expect(exportButton(page)).toBeEnabled();
}

/** Chooses a format and returns the file the browser saved. */
async function exportFile(page: Page, name: 'CSV' | 'XLSX'): Promise<{ name: string; bytes: Buffer }> {
  await exportButton(page).click();
  const [download] = await Promise.all([page.waitForEvent('download'), format(page, name).click()]);
  return { name: download.suggestedFilename(), bytes: readFileSync(await download.path()) };
}

/** The lines of a CSV file after its mark, without the empty piece behind the last line break. */
function csvLines(bytes: Buffer): string[] {
  expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  const text = bytes.subarray(3).toString('utf8');
  expect(text.endsWith('\r\n')).toBe(true);
  return text.split('\r\n').slice(0, -1);
}

/** The cells of the sheet of an XLSX file: texts by reference, numbers by reference. */
function sheetOf(bytes: Buffer) {
  const parts = unzip(new Uint8Array(bytes));
  const xml = parts.get('xl/worksheets/sheet1.xml') ?? '';
  const texts = new Map<string, string>();
  const numbers = new Map<string, number>();
  for (const [, ref, body] of xml.matchAll(/<c r="([A-D]\d+)"[^>]*?(?:\/>|>(.*?)<\/c>)/gs)) {
    const text = /<t[^>]*>(.*?)<\/t>/s.exec(body ?? '');
    const value = /<v>(.*?)<\/v>/.exec(body ?? '');
    if (text) texts.set(ref as string, (text[1] as string).replaceAll('&quot;', '"').replaceAll('&amp;', '&'));
    if (value) numbers.set(ref as string, Number(value[1]));
  }
  return { parts, xml, texts, numbers };
}

const tableKeys = (page: Page): Promise<string[]> => page.locator('.wt-table tbody a.wt-key').allTextContents();
const tableSums = (page: Page): Promise<string[]> => page.locator('.wt-table tbody .wt-col-sum').allTextContents();

test.describe('the control and the CSV file', () => {
  test('the control stands at the left of the total row and opens a menu of two formats above it', async ({ page }) => {
    await open(page);
    const button = await exportButton(page).boundingBox();
    const total = await footerTotal(page).boundingBox();
    const footer = await page.locator('.wt-footer').boundingBox();
    if (!button || !total || !footer) throw new Error('the total row is not laid out');
    expect(button.x).toBeLessThan(total.x);
    expect(button.x - footer.x).toBeLessThan(24);
    expect(footer.x + footer.width - (total.x + total.width)).toBeLessThan(24);
    // On the same line.
    expect(Math.abs(button.y + button.height / 2 - (total.y + total.height / 2))).toBeLessThan(3);

    await exportButton(page).click();
    await expect(exportMenu(page)).toBeVisible();
    await expect(exportMenu(page).getByRole('menuitem')).toHaveText(['*.csv', '*.xlsx']);
    const menu = await exportMenu(page).boundingBox();
    if (!menu) throw new Error('the menu is not laid out');
    expect(menu.y + menu.height).toBeLessThanOrEqual(button.y);
    expect(await focused(page)).toBe('Eksport do pliku CSV');
  });

  test('saves the rows on screen under the name of the person and the day', async ({ page }) => {
    await open(page);
    const file = await exportFile(page, 'CSV');
    expect(file.name).toBe('Jan_Kowalski_06-11-2026_tempo_report.csv');

    const lines = csvLines(file.bytes);
    expect(lines[0]).toBe(HEADER);
    expect(lines).toHaveLength(1 + (await rows(page).count()));
    expect(lines.slice(1).map((line) => line.split(';')[0])).toEqual(await tableKeys(page));
    expect(lines.slice(1).map((line) => line.split(';').at(-1))).toEqual(await tableSums(page));
    // Three entries of one ticket stay in one field of one line.
    expect(lines[1]).toContain('07:00–10:30 · 3h 30m, 13:00–14:00 · 1h 00m, 15:05–17:30 · 2h 25m');

    // The menu is closed again and the focus is back on the control.
    await expect(exportMenu(page)).toBeHidden();
    expect(await focused(page)).toBe('Eksport');
  });

  test('follows the order of the table', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'phone', 'the column headers are not shown on a phone');
    await open(page);
    const sum = page.locator('.wt-table th').last().getByRole('button');
    await sum.click();
    await sum.click();
    await expect(page.locator('.wt-table tbody a.wt-key').first()).toHaveText('AM-10234');
    const lines = csvLines((await exportFile(page, 'CSV')).bytes);
    expect(lines.slice(1).map((line) => line.split(';')[0])).toEqual(await tableKeys(page));
    expect(lines.slice(1).map((line) => line.split(';').at(-1))).toEqual(['6h 55m', '1h 45m', '1h 30m']);
  });

  test('names a longer period by its range and dates every entry', async ({ page }) => {
    await open(page);
    await chip(page, 'Miesiąc').click();
    await expect(page.locator('.wt-title__text')).toHaveText('01-11-2026 – 30-11-2026');
    await expect(exportButton(page)).toBeEnabled();
    const file = await exportFile(page, 'CSV');
    expect(file.name).toBe('Jan_Kowalski_01-11-2026_30-11-2026_tempo_report.csv');
    for (const line of csvLines(file.bytes).slice(1)) {
      for (const entry of (line.split(';')[2] ?? '').split(', ')) expect(entry).toMatch(/^\d\d-\d\d \d\d:\d\d–/);
    }
  });

  test('names a part of a day with its times', async ({ page }) => {
    await open(page);
    await page.locator('#wt-from').fill('2026-11-06T08:00');
    await page.locator('#wt-to').fill('2026-11-06T12:00');
    await expect(page.locator('.wt-title__text')).toHaveText('Piątek 06-11-2026 08:00–12:00');
    await expect(exportButton(page)).toBeEnabled();
    const file = await exportFile(page, 'CSV');
    expect(file.name).toBe('Jan_Kowalski_06-11-2026_0800_06-11-2026_1200_tempo_report.csv');
  });

  test("carries another person's name and rows", async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Ustawienia' }).click();
    await page.getByRole('radio', { name: 'Inny użytkownik' }).check();
    await page.locator('#wt-person-name').fill('Piotr Nowakowski');
    await page.locator('.wt-popover__actions .wt-button--primary').click();
    await expect(page.locator('.wt-person')).toHaveText('Piotr Nowakowski');
    await expect(rows(page)).toHaveCount(1);
    await expect(exportButton(page)).toBeEnabled();

    const file = await exportFile(page, 'CSV');
    expect(file.name).toBe('Piotr_Nowakowski_06-11-2026_tempo_report.csv');
    expect(csvLines(file.bytes).slice(1)).toEqual(['AM-20012;Daily standup i spotkania;09:00–10:30 · 1h 30m;1h 30m']);
  });

  test('works by keyboard alone, and Escape closes the menu before the panel', async ({ page }) => {
    await open(page);
    await exportButton(page).focus();
    await page.keyboard.press('Enter');
    await expect(exportMenu(page)).toBeVisible();
    expect(await focused(page)).toBe('Eksport do pliku CSV');
    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('Eksport do pliku XLSX');
    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('Eksport do pliku CSV');

    await page.keyboard.press('Escape');
    await expect(exportMenu(page)).toBeHidden();
    await expect(panel(page)).toBeVisible();
    expect(await focused(page)).toBe('Eksport');

    await page.keyboard.press('Space');
    await expect(exportMenu(page)).toBeVisible();
    const [download] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Enter')]);
    expect(download.suggestedFilename()).toBe('Jan_Kowalski_06-11-2026_tempo_report.csv');
    await expect(exportMenu(page)).toBeHidden();
  });

  test('writes titles that would break a spreadsheet so that they do not', async ({ page }) => {
    await open(page, { scenario: 'special-titles' });
    await expect(rows(page)).toHaveCount(6);
    const lines = csvLines((await exportFile(page, 'CSV')).bytes);
    // Exactly one line per ticket, whatever its title holds.
    expect(lines).toEqual([
      HEADER,
      "AM-1;'=1+1;07:00–07:30 · 0h 30m;0h 30m",
      "AM-2;' -5 dni;08:00–08:30 · 0h 30m;0h 30m",
      'AM-3;"Raport; wersja ""B""";09:00–09:30 · 0h 30m;0h 30m',
      'AM-4;Pierwsza linia Druga linia;10:00–10:30 · 0h 30m;0h 30m',
      'AM-5;;11:00–11:30 · 0h 30m;0h 30m',
      'AM-6;Dwa wpisy;12:00–12:30 · 0h 30m, 13:00–13:45 · 0h 45m;1h 15m',
    ]);
  });
});

test.describe('the XLSX file', () => {
  test('is a sheet with the name, the period, the total, the table, and the total row', async ({ page }) => {
    await open(page);
    const file = await exportFile(page, 'XLSX');
    expect(file.name).toBe('Jan_Kowalski_06-11-2026_tempo_report.xlsx');
    expect([...file.bytes.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);

    const { parts, texts, numbers } = sheetOf(file.bytes);
    expect(parts.get('xl/workbook.xml')).toContain('<sheet name="Raport"');
    expect(texts.get('A1')).toBe('Jan Kowalski');
    expect(texts.get('A2')).toBe('Piątek 06-11-2026');
    expect(texts.get('A3')).toBe('Suma czasu: 10h 10m');
    expect(['A5', 'B5', 'C5', 'D5'].map((ref) => texts.get(ref))).toEqual([
      'Zgłoszenie',
      'Tytuł',
      'Czas wpisów',
      'Suma',
    ]);

    // One row per row on screen, in the order on screen.
    const keys = await tableKeys(page);
    expect(keys.map((_, index) => texts.get(`A${6 + index}`))).toEqual(keys);
    // The entries of a ticket stand one below the other in one cell.
    expect(texts.get('C6')).toBe('07:00–10:30 · 3h 30m\n13:00–14:00 · 1h 00m\n15:05–17:30 · 2h 25m');

    // The sums are numbers (fractions of a day) and add up to the total row.
    const sums = keys.map((_, index) => numbers.get(`D${6 + index}`) as number);
    expect(sums.map((value) => Math.round(value * 1440))).toEqual([415, 105, 90]);
    const totalRow = 6 + keys.length;
    expect(texts.get(`C${totalRow}`)).toBe('Suma czasu:');
    expect(Math.round((numbers.get(`D${totalRow}`) as number) * 1440)).toBe(610);
    expect(sums.reduce((sum, value) => sum + value, 0) * 1440).toBeCloseTo(610, 6);

    // Each ticket number links to its ticket.
    expect(parts.get('xl/worksheets/_rels/sheet1.xml.rels')).toContain(
      'Target="https://example.atlassian.net/browse/AM-10234" TargetMode="External"',
    );
  });

  test('names the range of a longer period, in the file name and in the sheet', async ({ page }) => {
    await open(page);
    await chip(page, 'Miesiąc').click();
    await expect(page.locator('.wt-title__text')).toHaveText('01-11-2026 – 30-11-2026');
    await expect(exportButton(page)).toBeEnabled();
    const file = await exportFile(page, 'XLSX');
    expect(file.name).toBe('Jan_Kowalski_01-11-2026_30-11-2026_tempo_report.xlsx');
    const { texts } = sheetOf(file.bytes);
    expect(texts.get('A2')).toBe('01-11-2026 – 30-11-2026');
    expect(texts.get('A3')).toBe(`Suma czasu: ${await footerTotal(page).textContent()}`);
  });

  test('is the same file in the dark and in the light appearance', async ({ page }) => {
    await open(page);
    await setTheme(page, 'dark');
    const dark = await exportFile(page, 'XLSX');
    await setTheme(page, 'light');
    const light = await exportFile(page, 'XLSX');
    expect(light.bytes.equals(dark.bytes)).toBe(true);
  });

  test('holds titles as text, also one that looks like a formula', async ({ page }) => {
    await open(page, { scenario: 'special-titles' });
    await expect(rows(page)).toHaveCount(6);
    const { texts, xml } = sheetOf((await exportFile(page, 'XLSX')).bytes);
    expect(['B6', 'B7', 'B8', 'B9', 'B11'].map((ref) => texts.get(ref))).toEqual([
      '=1+1',
      ' -5 dni',
      'Raport; wersja "B"',
      'Pierwsza linia Druga linia',
      'Dwa wpisy',
    ]);
    // The ticket without a title has an empty cell, and nothing in the sheet is a formula.
    expect(texts.has('B10')).toBe(false);
    expect(xml).not.toContain('<f>');
  });
});

test.describe('when the control can be used', () => {
  test('is not there without rows, and the total row keeps its height', async ({ page }) => {
    await open(page);
    const withRows = (await page.locator('.wt-footer').boundingBox())?.height;

    await openPanel(page, { scenario: 'empty' });
    await expect(page.locator('.wt-message')).toBeVisible();
    await expect(exportButton(page)).toBeHidden();
    expect((await page.locator('.wt-footer').boundingBox())?.height).toBe(withRows);
  });

  test('cannot be used while another period loads; an open menu closes', async ({ page }) => {
    await open(page, { delay: 400 });
    await exportButton(page).click();
    await expect(exportMenu(page)).toBeVisible();

    await page.getByRole('button', { name: 'Poprzedni okres' }).click();
    await expect(exportMenu(page)).toBeHidden();
    await expect(exportButton(page)).toBeDisabled();
    await expect(exportButton(page)).toBeVisible();

    // The day before has rows of its own: the control comes back with them.
    await expect(page.locator('.wt-title__text')).toHaveText('Czwartek 05-11-2026');
    await expect(exportButton(page)).toBeEnabled();
  });

  test('exports the rows that stay on screen when a refresh fails', async ({ page }) => {
    await open(page);
    await page.evaluate(() => {
      window.__jiraDown = true;
    });
    await page.getByRole('button', { name: 'Odśwież' }).click();
    await expect(page.locator('.wt-message--error')).toBeVisible();
    await expect(rows(page)).toHaveCount(3);
    await expect(exportButton(page)).toBeEnabled();

    const lines = csvLines((await exportFile(page, 'CSV')).bytes);
    expect(lines.slice(1).map((line) => line.split(';')[0])).toEqual(await tableKeys(page));
  });

  test('says so when the file cannot be made, and lets the user try again', async ({ page }) => {
    await open(page);
    await page.evaluate(() => {
      URL.createObjectURL = () => {
        throw new Error('blocked');
      };
    });
    await exportButton(page).click();
    await format(page, 'CSV').click();
    await expect(exportMessage(page)).toHaveText(FAILED);
    await expect(rows(page)).toHaveCount(3);
    await expect(exportButton(page)).toBeEnabled();

    await exportButton(page).click();
    await expect(exportMessage(page)).toBeHidden();
    await expect(exportMenu(page)).toBeVisible();
  });

  test('hands the focus to the header when an automatic refresh switches it off', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-11-06T12:00:00+01:00') });
    await page.goto('/index.html?scenario=today&delay=300');
    await page.locator('.wt-launcher').click();
    await page.clock.runFor(1000);
    await expect(exportButton(page)).toBeVisible();

    // The first view: there is nothing to go back to, so the focus goes to "Odśwież".
    await exportButton(page).focus();
    await page.clock.fastForward('05:01');
    await expect(exportButton(page)).toBeDisabled();
    expect(await focused(page)).toBe('Odśwież');
    await page.clock.runFor(1000);
    await expect(exportButton(page)).toBeEnabled();
    expect(await focused(page)).toBe('Odśwież');

    // After one change of period "Cofnij" can take it.
    await page.getByRole('button', { name: 'Poprzedni okres' }).click();
    await page.clock.runFor(1000);
    await expect(exportButton(page)).toBeEnabled();
    await exportButton(page).focus();
    await page.clock.fastForward('05:01');
    await expect(exportButton(page)).toBeDisabled();
    expect(await focused(page)).toBe('Cofnij');
  });

  for (const mode of ['dark', 'light'] as const) {
    test(`the control, its menu, and its message are readable in the ${mode} appearance`, async ({ page }) => {
      await open(page);
      await setTheme(page, mode);
      const readable = async (locator: Locator, background: Locator) => {
        await expect(locator).toBeVisible();
        const ratio = contrast(await paintedColour(locator), await paintedColour(background, 'backgroundColor'));
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      };

      await readable(exportButton(page), exportButton(page));
      await exportButton(page).click();
      await expect(exportMenu(page)).toBeVisible();
      // An item under the pointer takes the hover background; the other keeps the menu's.
      await format(page, 'CSV').hover();
      await readable(format(page, 'XLSX'), page.locator('.wt-export__menu'));
      await readable(format(page, 'CSV'), format(page, 'CSV'));

      await page.evaluate(() => {
        URL.createObjectURL = () => {
          throw new Error('blocked');
        };
      });
      await format(page, 'CSV').click();
      await expect(exportMessage(page)).toHaveText(FAILED);
      await readable(exportMessage(page), page.locator('.wt-panel'));
    });
  }
});
