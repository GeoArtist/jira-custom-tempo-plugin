import { expect, type Locator, type Page } from '@playwright/test';

/** Friday 6 November 2026, 12:00 in Warsaw: the day the fake Jira's data describes. */
export const NOW = new Date('2026-11-06T12:00:00+01:00');

export interface OpenOptions {
  scenario?: string;
  /** Milliseconds each fake Jira request takes. */
  delay?: number;
}

function query(options: OpenOptions): string {
  const params = new URLSearchParams({ scenario: options.scenario ?? 'today' });
  if (options.delay !== undefined) params.set('delay', String(options.delay));
  return params.toString();
}

export const launcher = (page: Page): Locator => page.locator('.wt-launcher');
export const panel = (page: Page): Locator => page.locator('.wt-panel');
export const root = (page: Page): Locator => page.locator('.wt-root');
export const rows = (page: Page): Locator => page.locator('.wt-table tbody tr');
export const titleTotal = (page: Page): Locator => page.locator('.wt-title .wt-total');
export const footerTotal = (page: Page): Locator => page.locator('.wt-footer .wt-total');
export const chip = (page: Page, label: string): Locator => page.getByRole('button', { name: label, exact: true });

/** Selects one whole day with the day field, as `yyyy-mm-dd`. The fake Jira's today is 2026-11-06. */
export async function selectDay(page: Page, day: string): Promise<void> {
  await page.locator('#wt-day').fill(day);
  await expect(page.locator('#wt-from')).toHaveValue(`${day}T00:00`);
}

/** Opens the fake Jira page; the add-on shows its launcher on it. */
export async function openPage(page: Page, options: OpenOptions = {}): Promise<void> {
  await page.clock.setFixedTime(NOW);
  await page.goto(`/index.html?${query(options)}`);
  await expect(launcher(page)).toBeVisible();
}

/** Opens the fake Jira page and the panel, as a user who clicked the launcher. */
export async function openPanel(page: Page, options: OpenOptions = {}): Promise<void> {
  await openPage(page, options);
  await launcher(page).click();
  await expect(panel(page)).toBeVisible();
}

/** The add-on does not make the Jira page scroll sideways and stays inside the window (FR-038). */
export async function expectInsideWindow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const element = document.documentElement;
    return element.scrollWidth - element.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(0);

  const viewport = page.viewportSize();
  for (const part of [panel(page), launcher(page)]) {
    if (!(await part.isVisible())) continue;
    const box = await part.boundingBox();
    expect(box && viewport && box.x >= 0 && box.x + box.width <= viewport.width).toBe(true);
    expect(box && viewport && box.y >= 0 && box.y + box.height <= viewport.height).toBe(true);
  }
}

/** The colour an element is painted in, as [r, g, b], whatever notation the browser reports. */
export async function paintedColour(
  locator: Locator,
  property: 'color' | 'backgroundColor' = 'color',
): Promise<number[]> {
  return locator.evaluate((node, prop) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('no canvas');
    context.fillStyle = getComputedStyle(node)[prop];
    context.fillRect(0, 0, 1, 1);
    return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
  }, property);
}

function luminance([r = 0, g = 0, b = 0]: number[]): number {
  const channel = (value: number): number => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio of two colours. */
export function contrast(a: number[], b: number[]): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

export const theme = (page: Page): Promise<string | null> => root(page).getAttribute('data-theme');

export async function setTheme(page: Page, value: 'dark' | 'light'): Promise<void> {
  await root(page).evaluate((node, name) => node.setAttribute('data-theme', name), value);
}
