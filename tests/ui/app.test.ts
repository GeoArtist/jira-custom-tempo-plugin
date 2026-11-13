// The whole add-on on a page: launcher, panel, loading, periods, refresh, settings.
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { SETTINGS_KEY, type SettingsStorage } from '../../src/domain/settings';
import { mountApp, type App } from '../../src/ui/app';
import type { Timers } from '../../src/ui/controller';
import { FakeGateway, FIXTURE_NOW, flush, SEARCH, todayRoutes, type FakeReply } from '../fake-gateway';
import empty from '../fixtures/search-empty.json';
import search from '../fixtures/search-today.json';

const DAY = 86_400_000;

/** Timers the test fires by hand. Several can be pending: the launcher's and the panel's. */
function manualTimers() {
  let nextId = 1;
  const pending = new Map<number, { handler: () => void; ms: number }>();
  const timers: Timers = {
    setTimeout: (handler, ms) => {
      pending.set(nextId, { handler, ms });
      return nextId++;
    },
    clearTimeout: (handle) => void pending.delete(handle as number),
  };
  return {
    timers,
    delays: () => [...pending.values()].map((timer) => timer.ms).sort((a, b) => a - b),
    /** Fires everything that is due now; timers started by the handlers stay pending. */
    fireAll: () => {
      const due = [...pending.entries()];
      for (const [id, timer] of due) {
        pending.delete(id);
        timer.handler();
      }
    },
  };
}

function memoryStorage(settings?: object): SettingsStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  if (settings) data.set(SETTINGS_KEY, JSON.stringify(settings));
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => void data.set(key, value) };
}

/** A search answer the test releases when it wants. */
function held() {
  let release: (reply: FakeReply) => void = () => {};
  const reply = new Promise<FakeReply>((resolve) => (release = resolve));
  return { reply: () => reply, release };
}

async function mount(gateway: FakeGateway, settings?: object) {
  const clock = { now: FIXTURE_NOW };
  const timer = manualTimers();
  const storage = memoryStorage(settings);
  const container = document.createElement('div');
  document.body.appendChild(container);
  const app = await mountApp(container, gateway, { storage, now: () => clock.now, timers: timer.timers });
  return { app: app as App, container, clock, timer, storage };
}

/** Mounts and opens the panel, as a user who clicked the launcher. */
async function mountOpen(gateway: FakeGateway, settings?: object) {
  const mounted = await mount(gateway, settings);
  await mounted.app.open();
  return { ...mounted, root: mounted.app.root, controller: mounted.app.controller };
}

const text = (root: Element, selector: string) => root.querySelector(selector)?.textContent;
/** The label and the value of the total row; the row also holds the export control (003). */
const footerText = (root: Element) => `${text(root, '.wt-footer__label')}${text(root, '.wt-footer__value')}`;
const rowKeys = (root: Element) => [...root.querySelectorAll('tbody tr a')].map((a) => a.textContent);
const button = (root: Element, label: string) =>
  [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === label);
const byLabel = (root: Element, label: string) => root.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`);
const launcher = (root: Element) => root.querySelector<HTMLButtonElement>('.wt-launcher') as HTMLButtonElement;
const panel = (root: Element) => root.querySelector<HTMLElement>('.wt-panel') as HTMLElement;
const setHidden = (hidden: boolean) => {
  Object.defineProperty(document, 'hidden', { value: hidden, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
};

beforeEach(() => {
  document.body.innerHTML = '';
  Object.defineProperty(document, 'hidden', { value: false, configurable: true });
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('launcher', () => {
  it("shows today's total in the colour of the progress bar, with the panel closed", async () => {
    const { app } = await mount(new FakeGateway(todayRoutes()));
    expect(launcher(app.root).textContent).toBe('Dziś: 10h 10m');
    expect(launcher(app.root).style.getPropertyValue('--wt-total-from')).toBe('var(--wt-tone-yellow)');
    expect(launcher(app.root).style.getPropertyValue('--wt-total-to')).toBe('var(--wt-tone-orange)');
    expect(panel(app.root).hidden).toBe(true);
    expect(app.isOpen()).toBe(false);
    expect(launcher(app.root).getAttribute('aria-expanded')).toBe('false');
  });

  it('opens the panel on today and closes it again', async () => {
    const { app } = await mount(new FakeGateway(todayRoutes()));
    launcher(app.root).click();
    await flush(80);
    expect(app.isOpen()).toBe(true);
    expect(launcher(app.root).getAttribute('aria-expanded')).toBe('true');
    expect(text(app.root, '.wt-title')).toBe('Piątek 06-11-2026 · 10h 10m');

    launcher(app.root).click();
    expect(app.isOpen()).toBe(false);
    expect(panel(app.root).hidden).toBe(true);
  });

  it('draws nothing when nobody is signed in to Jira', async () => {
    const gateway = new FakeGateway(todayRoutes());
    gateway.signedOut = true;
    const { app, container } = await mount(gateway);
    expect(app).toBeNull();
    expect(container.childElementCount).toBe(0);
    expect(gateway.requests).toHaveLength(0);
  });

  it('shows a dash and explains the failure when today cannot be read', async () => {
    const gateway = new FakeGateway(todayRoutes()).add({ path: SEARCH, reply: { status: 500 } });
    const { app } = await mount(gateway);
    expect(launcher(app.root).textContent).toBe('Dziś: –');
    expect(launcher(app.root).getAttribute('title')).toBe('Nie udało się pobrać danych z Jiry.');
  });

  it('reloads today at the saved interval while the panel is closed', async () => {
    const gateway = new FakeGateway(todayRoutes());
    const { timer } = await mount(gateway, { refreshMinutes: 10, theme: 'dark' });
    expect(timer.delays()).toEqual([10 * 60_000]);
    timer.fireAll();
    await flush(80);
    expect(gateway.searches()).toHaveLength(2);
    expect(timer.delays()).toEqual([10 * 60_000]);
  });

  it('does not reload by itself when the interval is 0', async () => {
    const { timer } = await mount(new FakeGateway(todayRoutes()), { refreshMinutes: 0, theme: 'dark' });
    expect(timer.delays()).toEqual([]);
  });

  it('skips its reload while the tab is hidden and catches up when it is shown', async () => {
    const gateway = new FakeGateway(todayRoutes());
    const { timer } = await mount(gateway);
    setHidden(true);
    timer.fireAll();
    await flush(80);
    expect(gateway.searches()).toHaveLength(1);

    setHidden(false);
    await flush(80);
    expect(gateway.searches()).toHaveLength(2);
  });

  it('takes its total from the open panel instead of asking Jira twice', async () => {
    const gateway = new FakeGateway(todayRoutes());
    const { timer } = await mountOpen(gateway);
    const before = gateway.searches().length;
    // Both the launcher's and the panel's timers are due: only the panel asks Jira.
    timer.fireAll();
    await flush(80);
    expect(gateway.searches()).toHaveLength(before + 1);
  });
});

describe('opening the panel', () => {
  it("shows today's time without any further input", async () => {
    const { controller, root } = await mountOpen(new FakeGateway(todayRoutes()));
    expect(controller.state).toBe('ready');
    expect(text(root, '.wt-title')).toBe('Piątek 06-11-2026 · 10h 10m');
    expect(rowKeys(root)).toEqual(['AM-10234', 'AM-20012', 'AM-10087']);
    expect(footerText(root)).toBe('Suma czasu:10h 10m');
    expect(root.querySelector<HTMLInputElement>('#wt-day')?.value).toBe('2026-11-06');
  });

  it('gives both totals the colour of the bar', async () => {
    const { root } = await mountOpen(new FakeGateway(todayRoutes()));
    const [title, footer] = [...root.querySelectorAll<HTMLElement>('.wt-panel .wt-total')];
    expect(title?.style.getPropertyValue('--wt-total-from')).toBe('var(--wt-tone-yellow)');
    expect(footer?.style.cssText).toBe(title?.style.cssText);
    expect(root.querySelector('.wt-progress__caption')).toBeNull();
    expect(root.querySelector('.wt-subtitle')).toBeNull();
  });

  it('shows the day of a clicked bar from the loaded week, without asking Jira', async () => {
    const gateway = new FakeGateway(todayRoutes());
    const { controller, root, timer } = await mountOpen(gateway);
    await controller.selectPreset('thisWeek');
    const asked = gateway.requests.length;
    const column = (index: number) => root.querySelectorAll<HTMLElement>('.wt-chart__col')[index];

    column(4)?.click();
    expect(gateway.requests).toHaveLength(asked);
    expect(controller.state).toBe('ready');
    expect(controller.period.preset).toBe('today');
    expect(text(root, '.wt-title')).toBe('Piątek 06-11-2026 · 10h 10m');
    expect(rowKeys(root)).toEqual(['AM-10234', 'AM-20012', 'AM-10087']);
    expect(footerText(root)).toBe('Suma czasu:10h 10m');
    expect(root.querySelector('.wt-progress')?.classList.contains('wt-progress--chart')).toBe(false);
    expect(root.querySelector<HTMLInputElement>('#wt-day')?.value).toBe('2026-11-06');
    expect(launcher(root).textContent).toBe('Dziś: 10h 10m');
    // Auto-refresh goes on, and a refresh asks Jira for that day.
    expect(timer.delays()).toContain(5 * 60_000);
    await controller.refresh();
    expect(gateway.requests.length).toBeGreaterThan(asked);
  });

  it('shows an empty day of the chart as a day without entries', async () => {
    const gateway = new FakeGateway(todayRoutes());
    const { controller, root } = await mountOpen(gateway);
    await controller.selectPreset('thisWeek');
    const asked = gateway.requests.length;
    root.querySelectorAll<HTMLElement>('.wt-chart__col')[0]?.click();
    expect(gateway.requests).toHaveLength(asked);
    expect(controller.state).toBe('empty');
    expect(text(root, '.wt-title')).toBe('Poniedziałek 02-11-2026 · 0h 00m');
  });

  it('goes back and forward through the views without asking Jira again', async () => {
    const gateway = new FakeGateway(todayRoutes());
    const { controller, root } = await mountOpen(gateway);
    const back = byLabel(root, 'Cofnij') as HTMLButtonElement;
    const forward = byLabel(root, 'Ponów') as HTMLButtonElement;
    expect([back.disabled, forward.disabled]).toEqual([true, true]);

    await controller.selectPreset('thisWeek');
    root.querySelectorAll<HTMLElement>('.wt-chart__col')[3]?.click();
    expect(text(root, '.wt-title')).toBe('Czwartek 05-11-2026 · 1h 30m');
    expect([back.disabled, forward.disabled]).toEqual([false, true]);
    const asked = gateway.requests.length;

    back.click();
    expect(text(root, '.wt-title')).toBe('02-11-2026 – 08-11-2026 · 11h 40m');
    expect(controller.period.preset).toBe('thisWeek');
    expect(root.querySelectorAll('.wt-chart__col')).toHaveLength(7);
    expect([back.disabled, forward.disabled]).toEqual([false, false]);
    back.click();
    expect(text(root, '.wt-title')).toBe('Piątek 06-11-2026 · 10h 10m');
    expect(rowKeys(root)).toEqual(['AM-10234', 'AM-20012', 'AM-10087']);
    expect([back.disabled, forward.disabled]).toEqual([true, false]);
    expect(launcher(root).textContent).toBe('Dziś: 10h 10m');

    forward.click();
    forward.click();
    expect(text(root, '.wt-title')).toBe('Czwartek 05-11-2026 · 1h 30m');
    expect(forward.disabled).toBe(true);
    expect(gateway.requests).toHaveLength(asked);

    // A new step from an earlier view drops the views after it.
    back.click();
    await controller.selectPreset('yesterday');
    expect([back.disabled, forward.disabled]).toEqual([false, true]);
    back.click();
    expect(controller.period.preset).toBe('thisWeek');
  });

  it('remembers ten steps back, not the same period twice, and nothing after the close button', async () => {
    const gateway = new FakeGateway(todayRoutes());
    const { app, controller, root } = await mountOpen(gateway);
    const back = byLabel(root, 'Cofnij') as HTMLButtonElement;
    await controller.selectPreset('today');
    expect(back.disabled).toBe(true);

    for (let step = 0; step < 12; step += 1) await controller.shiftPeriod(-1);
    let steps = 0;
    while (!back.disabled) {
      back.click();
      steps += 1;
    }
    expect(steps).toBe(10);
    // Twelve days back, ten of them undone: the oldest views are forgotten.
    expect(controller.period.from.date).toEqual({ year: 2026, month: 11, day: 4 });

    // Auto-refresh and "Odśwież" are not steps.
    await controller.refresh();
    expect(back.disabled).toBe(true);
    expect(byLabel(root, 'Ponów')?.disabled).toBe(false);

    byLabel(root, 'Zamknij')?.click();
    await app.open();
    expect(controller.period.preset).toBe('today');
    expect([back.disabled, byLabel(root, 'Ponów')?.disabled]).toEqual([true, true]);
  });

  it('loads a view again when going back to one that never loaded', async () => {
    const gateway = new FakeGateway(todayRoutes());
    const { controller, root } = await mountOpen(gateway);
    gateway.add({ path: SEARCH, reply: { status: 500 } });
    await controller.selectPreset('yesterday');
    expect(controller.state).toBe('error');
    byLabel(root, 'Cofnij')?.click();
    expect(controller.state).toBe('ready');
    const asked = gateway.requests.length;
    byLabel(root, 'Ponów')?.click();
    expect(controller.state).toBe('loading');
    await flush(80);
    expect(gateway.requests.length).toBeGreaterThan(asked);
  });

  it('starts on today again after the close button', async () => {
    const { app, controller, root } = await mountOpen(new FakeGateway(todayRoutes()));
    await controller.selectPreset('thisWeek');
    byLabel(root, 'Zamknij')?.click();
    await app.open();
    expect(controller.period.preset).toBe('today');
  });

  it('keeps the selected period when minimised with the launcher or with Escape', async () => {
    const { app, controller, root } = await mountOpen(new FakeGateway(todayRoutes()));
    await controller.selectPreset('thisWeek');

    launcher(root).click();
    expect(app.isOpen()).toBe(false);
    launcher(root).click();
    await flush(80);
    expect(app.isOpen()).toBe(true);
    expect(controller.period.preset).toBe('thisWeek');
    expect(text(root, '.wt-title')).toBe('02-11-2026 – 08-11-2026 · 11h 40m');

    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(app.isOpen()).toBe(false);
    await app.open();
    expect(controller.period.preset).toBe('thisWeek');
  });

  it('minimises with the header button like with the launcher: the period and the steps stay', async () => {
    const { app, controller, root } = await mountOpen(new FakeGateway(todayRoutes()));
    await controller.selectPreset('thisWeek');
    byLabel(root, 'Minimalizuj')?.click();
    expect(app.isOpen()).toBe(false);
    expect(panel(root).hidden).toBe(true);
    expect(launcher(root).getAttribute('aria-expanded')).toBe('false');
    expect(launcher(root).textContent).toContain('Zakres:');

    launcher(root).click();
    await flush(80);
    expect(app.isOpen()).toBe(true);
    expect(controller.period.preset).toBe('thisWeek');
    expect(byLabel(root, 'Cofnij')?.disabled).toBe(false);
  });

  it('reloads the kept period when it is shown again', async () => {
    const gateway = new FakeGateway(todayRoutes());
    const { app, controller } = await mountOpen(gateway);
    await controller.selectPreset('yesterday');
    app.minimise();
    const before = gateway.requests.length;
    await app.open();
    expect(gateway.requests.length).toBeGreaterThan(before);
    expect(controller.period.preset).toBe('yesterday');
  });

  it('shows the empty state when nothing was logged', async () => {
    const { controller, root } = await mountOpen(new FakeGateway([{ path: SEARCH, reply: { json: empty } }]));
    expect(controller.state).toBe('empty');
    expect(text(root, '.wt-message')).toBe('Brak wpisów czasu w wybranym okresie.');
    expect(text(root, '.wt-title')).toBe('Piątek 06-11-2026 · 0h 00m');
    expect(launcher(root).textContent).toBe('Dziś: 0h 00m');
  });

  it('shows the error state and recovers on retry', async () => {
    const gateway = new FakeGateway(todayRoutes()).add({ path: SEARCH, reply: { status: 500 } });
    const { controller, root } = await mountOpen(gateway);
    expect(controller.state).toBe('error');
    expect(text(root, '.wt-message p')).toBe('Nie udało się pobrać danych z Jiry.');

    gateway.add({ path: SEARCH, reply: { json: search } });
    root.querySelector<HTMLButtonElement>('.wt-message button')?.click();
    await flush(80);
    expect(controller.state).toBe('ready');
    expect(rowKeys(root)).toHaveLength(3);
    expect(launcher(root).textContent).toBe('Dziś: 10h 10m');
  });

  it('closes with the close button and with Escape, and returns the focus to the launcher', async () => {
    const { app, root } = await mountOpen(new FakeGateway(todayRoutes()));
    byLabel(root, 'Zamknij')?.click();
    expect(app.isOpen()).toBe(false);
    expect(document.activeElement).toBe(launcher(root));

    await app.open();
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(app.isOpen()).toBe(false);
  });

  it('keeps keys typed inside the add-on away from the Jira page', async () => {
    const { root } = await mountOpen(new FakeGateway(todayRoutes()));
    const reached: string[] = [];
    document.addEventListener('keydown', (event) => reached.push(event.key));
    root.querySelector('#wt-from')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }));
    expect(reached).toEqual([]);
  });
});

describe('changing the period', () => {
  it('shows yesterday', async () => {
    const { controller, root } = await mountOpen(new FakeGateway(todayRoutes()));
    await controller.selectPreset('yesterday');
    expect(text(root, '.wt-title')).toBe('Czwartek 05-11-2026 · 1h 30m');
    expect(rowKeys(root)).toEqual(['AM-20012', 'AM-10234']);
    expect(button(root, 'Dzień')?.getAttribute('aria-pressed')).toBe('true');
    // The launcher follows the period of the panel: another day is named by its date.
    expect(launcher(root).textContent).toBe('05-11-2026: 1h 30m');
  });

  it('shows the selected period on the launcher: a range without a colour, zero muted', async () => {
    const gateway = new FakeGateway(todayRoutes());
    const { app, controller, root } = await mountOpen(gateway);
    await controller.selectPreset('thisWeek');
    expect(launcher(root).textContent).toBe('Zakres: 11h 40m');
    expect(launcher(root).style.getPropertyValue('--wt-total-from')).toBe('');
    expect(launcher(root).hasAttribute('data-zero')).toBe(false);

    gateway.add({ path: SEARCH, reply: { json: empty } });
    await controller.selectPreset('prevWeek');
    expect(launcher(root).textContent).toBe('Zakres: 0h 00m');
    expect(launcher(root).hasAttribute('data-zero')).toBe(true);
    expect(root.querySelector('.wt-title .wt-total')?.hasAttribute('data-zero')).toBe(true);
    expect(root.querySelector('.wt-footer__label')?.hasAttribute('data-zero')).toBe(true);
    expect(root.querySelector('.wt-footer__value')?.hasAttribute('data-zero')).toBe(true);

    // Minimised, it keeps the period. Closed with the close button, it is back on today.
    gateway.add({ path: SEARCH, reply: { json: search } });
    app.minimise();
    expect(launcher(root).textContent).toBe('Zakres: 0h 00m');
    await app.open();
    byLabel(root, 'Zamknij')?.click();
    await flush(80);
    expect(launcher(root).textContent).toBe('Dziś: 10h 10m');
  });

  it('refreshes the kept period on the launcher while the panel is minimised', async () => {
    const gateway = new FakeGateway(todayRoutes());
    const { app, controller, root, timer } = await mountOpen(gateway);
    await controller.selectPreset('yesterday');
    app.minimise();
    const before = gateway.requests.length;
    timer.fireAll();
    await flush(80);
    expect(gateway.requests.length).toBeGreaterThan(before);
    expect(controller.period.preset).toBe('yesterday');
    expect(launcher(root).textContent).toBe('05-11-2026: 1h 30m');
  });

  it('shows a week with dated entries, the bar chart, and neutral totals', async () => {
    const { controller, root } = await mountOpen(new FakeGateway(todayRoutes()));
    await controller.selectPreset('thisWeek');
    expect(text(root, '.wt-title')).toBe('02-11-2026 – 08-11-2026 · 11h 40m');
    expect(root.querySelector('.wt-progress')?.classList.contains('wt-progress--chart')).toBe(true);
    // One bar per day; the fixtures have time on Thursday and Friday.
    const seconds = [...root.querySelectorAll('.wt-chart__col')].map((col) => Number(col.getAttribute('data-seconds')));
    expect(seconds).toEqual([0, 0, 0, 5400, 36600, 0, 0]);
    for (const total of root.querySelectorAll<HTMLElement>('.wt-panel .wt-title .wt-total, .wt-footer .wt-total')) {
      expect(total.style.getPropertyValue('--wt-total-from')).toBe('');
    }
    expect([...root.querySelectorAll('.wt-entries li')].map((li) => li.textContent)).toContain(
      '05-11 09:00–09:30 · 0h 30m',
    );

    await controller.selectPreset('today');
    expect(root.querySelector('.wt-progress')?.classList.contains('wt-progress--chart')).toBe(false);
  });

  it('moves with the arrows and recognises the preset it lands on', async () => {
    const { controller, root } = await mountOpen(new FakeGateway(todayRoutes()));
    byLabel(root, 'Poprzedni okres')?.click();
    await flush(80);
    expect(controller.period.preset).toBe('yesterday');
    byLabel(root, 'Poprzedni okres')?.click();
    await flush(80);
    expect(controller.period.preset).toBe('dayBeforeYesterday');
    byLabel(root, 'Poprzedni okres')?.click();
    await flush(80);
    expect(controller.period.preset).toBe('custom');
    expect(text(root, '.wt-title__text')).toBe('Wtorek 03-11-2026');
    // The arrows keep the kind of period selected, like a radio button (FR-085).
    expect([...root.querySelectorAll('.wt-chip[aria-pressed="true"]')].map((chip) => chip.textContent)).toEqual([
      'Dzień',
    ]);
  });

  it('goes to the current day, week, month, or year with the four buttons', async () => {
    const gateway = new FakeGateway(todayRoutes());
    const { controller, root } = await mountOpen(gateway);
    const pressed = () => [...root.querySelectorAll('.wt-chip[aria-pressed="true"]')].map((chip) => chip.textContent);
    expect(pressed()).toEqual(['Dzień']);

    button(root, 'Tydzień')?.click();
    await flush(80);
    expect(pressed()).toEqual(['Tydzień']);
    byLabel(root, 'Poprzedni okres')?.click();
    await flush(80);
    expect(text(root, '.wt-title__text')).toBe('26-10-2026 – 01-11-2026');
    expect(pressed()).toEqual(['Tydzień']);

    // The button again: the current week, not the one the arrows reached.
    button(root, 'Tydzień')?.click();
    await flush(80);
    expect(controller.period.preset).toBe('thisWeek');

    // The current day lies inside the loaded week: it is shown without asking Jira.
    const asked = gateway.requests.length;
    button(root, 'Dzień')?.click();
    expect(controller.state).toBe('ready');
    expect(text(root, '.wt-title')).toBe('Piątek 06-11-2026 · 10h 10m');
    expect(gateway.requests).toHaveLength(asked);

    // Pressed while its period is on screen, a button loads it again.
    button(root, 'Dzień')?.click();
    expect(controller.state).toBe('loading');
    await flush(80);
    expect(gateway.requests.length).toBeGreaterThan(asked);
    expect(byLabel(root, 'Cofnij')?.disabled).toBe(false);
  });

  it('filters a custom window by start time and keeps the bar active inside one day', async () => {
    const { controller, root } = await mountOpen(new FakeGateway(todayRoutes()));
    await controller.selectCustom({
      from: { date: { year: 2026, month: 11, day: 6 }, minuteOfDay: 600 },
      to: { date: { year: 2026, month: 11, day: 6 }, minuteOfDay: 720 },
      preset: 'custom',
    });
    expect(text(root, '.wt-title')).toBe('Piątek 06-11-2026 10:00–12:00 · 2h 15m');
    expect(rowKeys(root)).toEqual(['AM-20012', 'AM-10087']);
    expect(root.querySelector('.wt-progress')?.classList.contains('wt-progress--chart')).toBe(false);
  });

  it('shows a spinner over the old rows while another period loads', async () => {
    const gateway = new FakeGateway(todayRoutes());
    const { controller, root } = await mountOpen(gateway);
    const slow = held();
    gateway.add({ path: SEARCH, reply: slow.reply });

    const loading = controller.selectPreset('yesterday');
    await flush();
    expect(controller.state).toBe('loading');
    // The rows of the previous period stay under the spinner; the title names the new one.
    expect(rowKeys(root)).toEqual(['AM-10234', 'AM-20012', 'AM-10087']);
    expect(root.querySelector<HTMLElement>('.wt-loading')?.hidden).toBe(false);
    expect(text(root, '.wt-title')).toBe('Czwartek 05-11-2026 · …');

    slow.release({ json: search });
    await loading;
    expect(rowKeys(root)).toEqual(['AM-20012', 'AM-10234']);
    expect(root.querySelector<HTMLElement>('.wt-loading')?.hidden).toBe(true);
  });

  it('drops the rows of the previous period when the new one cannot be loaded', async () => {
    const gateway = new FakeGateway(todayRoutes());
    const { controller, root } = await mountOpen(gateway);
    gateway.add({ path: SEARCH, reply: { status: 500 } });
    await controller.selectPreset('yesterday');
    expect(controller.state).toBe('error');
    expect(rowKeys(root)).toEqual([]);
    expect(text(root, '.wt-title')).toBe('Czwartek 05-11-2026 · 0h 00m');
    expect(text(root, '.wt-message p')).toBe('Nie udało się pobrać danych z Jiry.');
  });

  it('shows the title and the coloured total again in the tip of the progress bar', async () => {
    const { root } = await mountOpen(new FakeGateway(todayRoutes()));
    expect(text(root, '.wt-progress__tip-period')).toBe('Piątek 06-11-2026');
    expect(text(root, '.wt-progress__tip-total')).toBe('Suma czasu: 10h 10m');
    const total = root.querySelector<HTMLElement>('.wt-progress__tip-total') as HTMLElement;
    expect(total.style.getPropertyValue('--wt-total-from')).toBe('var(--wt-tone-yellow)');
  });

  it('ignores the late answer of a period the user has already left', async () => {
    const gateway = new FakeGateway(todayRoutes());
    const { controller, root } = await mountOpen(gateway);
    const slow = held();
    let first = true;
    gateway.add({
      path: SEARCH,
      // Only the first of the following searches is slow.
      reply: () => {
        if (!first) return { json: search };
        first = false;
        return slow.reply();
      },
    });

    const week = controller.selectPreset('thisWeek');
    await flush();
    await controller.selectPreset('yesterday');
    slow.release({ json: search });
    await week;
    await flush(80);

    expect(controller.period.preset).toBe('yesterday');
    expect(text(root, '.wt-title')).toBe('Czwartek 05-11-2026 · 1h 30m');
  });
});

describe('refresh', () => {
  it('keeps the data on screen while reloading and does not change the period', async () => {
    const gateway = new FakeGateway(todayRoutes());
    const { controller, root } = await mountOpen(gateway);
    const slow = held();
    gateway.add({ path: SEARCH, reply: slow.reply });
    const refresh = button(root, 'Odśwież') as HTMLButtonElement;

    refresh.click();
    await flush();
    // Switched off, but not `disabled`: it keeps the keyboard focus (003 FR-030).
    expect([refresh.getAttribute('aria-disabled'), refresh.disabled]).toEqual(['true', false]);
    expect(rowKeys(root)).toHaveLength(3);
    expect(footerText(root)).toBe('Suma czasu:10h 10m');

    slow.release({ json: search });
    await flush(80);
    expect(refresh.hasAttribute('aria-disabled')).toBe(false);
    expect(controller.period.preset).toBe('today');
    expect(controller.state).toBe('ready');
  });

  it('keeps the last data and offers a retry when a refresh fails', async () => {
    const gateway = new FakeGateway(todayRoutes());
    const { controller, root } = await mountOpen(gateway);
    gateway.add({ path: SEARCH, reply: { status: 503 } });

    await controller.refresh();
    expect(controller.state).toBe('error');
    expect(text(root, '.wt-message p')).toBe('Nie udało się pobrać danych z Jiry.');
    expect(rowKeys(root)).toHaveLength(3);
    expect(root.querySelector('.wt-message button')?.textContent).toBe('Spróbuj ponownie');
  });
});

describe('auto-refresh of the open panel', () => {
  it('reloads every 5 minutes by default', async () => {
    const gateway = new FakeGateway(todayRoutes());
    const { timer } = await mountOpen(gateway);
    expect(timer.delays()).toEqual([5 * 60_000, 5 * 60_000]); // launcher and panel
    const before = gateway.searches().length;
    timer.fireAll();
    await flush(80);
    expect(gateway.searches()).toHaveLength(before + 1);
  });

  it('never reloads by itself when the interval is 0', async () => {
    const gateway = new FakeGateway(todayRoutes());
    const { controller, timer } = await mountOpen(gateway, { refreshMinutes: 0, theme: 'dark' });
    expect(timer.delays()).toEqual([]);
    const before = gateway.searches().length;
    await controller.refresh();
    expect(gateway.searches()).toHaveLength(before + 1);
    expect(timer.delays()).toEqual([]);
  });

  it('stops when the panel is closed', async () => {
    const gateway = new FakeGateway(todayRoutes());
    const { app, timer } = await mountOpen(gateway);
    app.close();
    expect(timer.delays()).toEqual([5 * 60_000]); // only the launcher's
  });

  it('applies and stores a new interval from settings at once', async () => {
    const { root, timer, storage } = await mountOpen(new FakeGateway(todayRoutes()));
    byLabel(root, 'Ustawienia')?.click();
    (root.querySelector('#wt-interval') as HTMLInputElement).value = '0';
    button(root, 'Zapisz')?.click();
    expect(timer.delays()).toEqual([]);
    expect(JSON.parse(storage.data.get(SETTINGS_KEY) ?? '{}')).toEqual({
      refreshMinutes: 0,
      theme: 'dark',
      panelHeight: null,
      panelWidth: null,
      launcher: null,
      lastPerson: null,
    });

    byLabel(root, 'Ustawienia')?.click();
    (root.querySelector('#wt-interval') as HTMLInputElement).value = '2';
    button(root, 'Zapisz')?.click();
    expect(timer.delays()).toEqual([2 * 60_000, 2 * 60_000]);
  });

  it('follows the calendar when the day changes while "Dziś" is shown', async () => {
    const gateway = new FakeGateway(todayRoutes());
    const { controller, root, clock, timer } = await mountOpen(gateway);
    clock.now = FIXTURE_NOW + DAY;
    timer.fireAll();
    await flush(80);
    expect(controller.period.from.date).toEqual({ year: 2026, month: 11, day: 7 });
    expect(text(root, '.wt-title__text')).toBe('Sobota 07-11-2026');
    expect(controller.period.preset).toBe('today');
  });

  it('skips the reload while the tab is hidden and catches up when it is shown', async () => {
    const gateway = new FakeGateway(todayRoutes());
    const { timer } = await mountOpen(gateway);
    const before = gateway.searches().length;
    setHidden(true);
    timer.fireAll();
    await flush(80);
    expect(gateway.searches()).toHaveLength(before);

    setHidden(false);
    await flush(80);
    expect(gateway.searches()).toHaveLength(before + 1);
  });
});

describe('panel height', () => {
  const handle = (root: Element) => root.querySelector<HTMLElement>('.wt-resize') as HTMLElement;
  const height = (root: Element) => panel(root).style.getPropertyValue('--wt-panel-height');
  const stored = (storage: { data: Map<string, string> }) =>
    JSON.parse(storage.data.get(SETTINGS_KEY) ?? '{}') as Record<string, unknown>;

  it('uses the default until the user chooses one, and applies a saved height', async () => {
    const fresh = await mountOpen(new FakeGateway(todayRoutes()));
    expect(height(fresh.root)).toBe('');
    expect(handle(fresh.root).getAttribute('role')).toBe('separator');
    expect(handle(fresh.root).getAttribute('aria-label')).toBe('Zmień wysokość okna');

    document.body.innerHTML = '';
    const saved = await mountOpen(new FakeGateway(todayRoutes()), {
      refreshMinutes: 5,
      theme: 'dark',
      panelHeight: 600,
      panelWidth: null,
      launcher: null,
      lastPerson: null,
    });
    expect(height(saved.root)).toBe('600px');
  });

  it('changes with the arrow keys, never below the minimum, and is remembered', async () => {
    const { root, storage } = await mountOpen(new FakeGateway(todayRoutes()), {
      refreshMinutes: 10,
      theme: 'light',
      panelHeight: 600,
      panelWidth: null,
      launcher: null,
      lastPerson: null,
    });
    // The test page has no layout, so the height the handle reads is the saved one.
    handle(root).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(height(root)).toBe('616px');
    expect(stored(storage)).toEqual({
      refreshMinutes: 10,
      theme: 'light',
      panelHeight: 616,
      panelWidth: null,
      launcher: null,
      lastPerson: null,
    });

    for (let press = 0; press < 30; press += 1) {
      handle(root).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    }
    expect(height(root)).toBe('440px');
    expect(stored(storage).panelHeight).toBe(440);
  });

  it('goes back to the default with Home or a double click', async () => {
    const { root, storage } = await mountOpen(new FakeGateway(todayRoutes()), {
      refreshMinutes: 5,
      theme: 'dark',
      panelHeight: 600,
      panelWidth: null,
      launcher: null,
      lastPerson: null,
    });
    handle(root).dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(height(root)).toBe('');
    expect(stored(storage).panelHeight).toBeNull();
  });

  it('keeps the chosen height when the settings are saved', async () => {
    const { root, storage } = await mountOpen(new FakeGateway(todayRoutes()), {
      refreshMinutes: 5,
      theme: 'dark',
      panelHeight: 600,
      panelWidth: null,
      launcher: null,
      lastPerson: null,
    });
    handle(root).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    byLabel(root, 'Ustawienia')?.click();
    button(root, 'Zapisz')?.click();
    expect(stored(storage)).toEqual({
      refreshMinutes: 5,
      theme: 'dark',
      panelHeight: 616,
      panelWidth: null,
      launcher: null,
      lastPerson: null,
    });
  });
});

describe('panel width', () => {
  const handle = (root: Element, kind: string) => root.querySelector<HTMLElement>(`.wt-resize--${kind}`) as HTMLElement;
  const size = (root: Element, axis: string) => panel(root).style.getPropertyValue(`--wt-panel-${axis}`);
  const stored = (storage: { data: Map<string, string> }) =>
    JSON.parse(storage.data.get(SETTINGS_KEY) ?? '{}') as Record<string, unknown>;
  const press = (node: HTMLElement, key: string) =>
    node.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  const saved = {
    refreshMinutes: 5,
    theme: 'dark',
    panelHeight: 600,
    panelWidth: 700,
    launcher: null,
    lastPerson: null,
  };

  it('has a grip for the width and one for both dimensions', async () => {
    const { root } = await mountOpen(new FakeGateway(todayRoutes()), saved);
    expect(size(root, 'width')).toBe('700px');
    expect(handle(root, 'inline').getAttribute('aria-label')).toBe('Zmień szerokość okna');
    expect(handle(root, 'inline').getAttribute('aria-orientation')).toBe('vertical');
    expect(handle(root, 'corner').getAttribute('aria-label')).toBe('Zmień rozmiar okna');
    // The free edges are the ones away from the launcher: top and left by default.
    expect(panel(root).dataset.freeBlock).toBe('top');
    expect(panel(root).dataset.freeInline).toBe('left');
  });

  it('changes with the arrow keys, never below the minimum, and is remembered', async () => {
    const { root, storage } = await mountOpen(new FakeGateway(todayRoutes()), saved);
    press(handle(root, 'inline'), 'ArrowLeft');
    expect(size(root, 'width')).toBe('716px');
    expect(stored(storage)).toEqual({ ...saved, panelWidth: 716 });
    // The width grip does not answer to the keys of the height.
    press(handle(root, 'inline'), 'ArrowUp');
    expect(size(root, 'height')).toBe('600px');

    for (let count = 0; count < 20; count += 1) press(handle(root, 'inline'), 'ArrowRight');
    expect(size(root, 'width')).toBe('640px');
    expect(stored(storage).panelWidth).toBe(640);
  });

  it('changes both dimensions at the corner and resets both with Home', async () => {
    const { root, storage } = await mountOpen(new FakeGateway(todayRoutes()), saved);
    press(handle(root, 'corner'), 'ArrowLeft');
    press(handle(root, 'corner'), 'ArrowUp');
    expect(stored(storage)).toEqual({ ...saved, panelWidth: 716, panelHeight: 616 });
    press(handle(root, 'corner'), 'Home');
    expect(size(root, 'width')).toBe('');
    expect(size(root, 'height')).toBe('');
    expect(stored(storage)).toEqual({ ...saved, panelWidth: null, panelHeight: null });
  });
});

describe('launcher position', () => {
  const offsets = (root: HTMLElement) => [
    root.style.getPropertyValue('--wt-launcher-right'),
    root.style.getPropertyValue('--wt-launcher-bottom'),
  ];
  const stored = (storage: { data: Map<string, string> }) =>
    JSON.parse(storage.data.get(SETTINGS_KEY) ?? '{}') as Record<string, unknown>;
  const pointer = (node: HTMLElement, type: string, clientX: number, clientY: number) =>
    node.dispatchEvent(new PointerEvent(type, { clientX, clientY, pointerId: 1, bubbles: true }));

  it('is the default corner until the user moves it, and a saved place is applied', async () => {
    const fresh = await mount(new FakeGateway(todayRoutes()));
    expect(offsets(fresh.app.root)).toEqual(['', '']);
    // The panel is positioned against the launcher, which therefore comes first.
    expect([...fresh.app.root.children].map((child) => child.className)).toEqual(['wt-launcher', 'wt-panel']);

    document.body.innerHTML = '';
    const moved = await mount(new FakeGateway(todayRoutes()), {
      refreshMinutes: 5,
      theme: 'dark',
      launcher: { right: 300, bottom: 200 },
      lastPerson: null,
    });
    expect(offsets(moved.app.root)).toEqual(['300px', '200px']);
  });

  it('follows a drag, remembers the place, and does not open the panel', async () => {
    const { app, storage } = await mount(new FakeGateway(todayRoutes()));
    const node = launcher(app.root);
    // The test page has no layout: the launcher starts at offsets 0, 0.
    pointer(node, 'pointerdown', 500, 500);
    pointer(node, 'pointermove', 460, 470);
    expect(offsets(app.root)).toEqual(['40px', '30px']);
    expect(stored(storage).launcher).toBeUndefined();
    pointer(node, 'pointerup', 400, 440);
    node.click();
    expect(offsets(app.root)).toEqual(['100px', '60px']);
    expect(stored(storage).launcher).toEqual({ right: 100, bottom: 60 });
    expect(app.isOpen()).toBe(false);

    // The next click is an ordinary one again.
    node.click();
    expect(app.isOpen()).toBe(true);
  });

  it('treats a press that barely moves as a click', async () => {
    const { app, storage } = await mount(new FakeGateway(todayRoutes()));
    const node = launcher(app.root);
    pointer(node, 'pointerdown', 500, 500);
    pointer(node, 'pointermove', 502, 501);
    pointer(node, 'pointerup', 502, 501);
    node.click();
    expect(app.isOpen()).toBe(true);
    expect(stored(storage).launcher).toBeUndefined();
  });

  it('moves with Shift and the arrow keys, and stays inside the window', async () => {
    const { app, storage } = await mount(new FakeGateway(todayRoutes()));
    const node = launcher(app.root);
    const press = (key: string, shiftKey = true) =>
      node.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true }));
    press('ArrowLeft');
    expect(stored(storage).launcher).toEqual({ right: 16, bottom: 4 });
    press('ArrowUp');
    expect(offsets(app.root)).toEqual(['4px', '16px']);
    // An arrow alone belongs to the page.
    press('ArrowUp', false);
    expect(offsets(app.root)).toEqual(['4px', '16px']);
  });

  it('keeps the place when the settings are saved', async () => {
    const { root, storage } = await mountOpen(new FakeGateway(todayRoutes()), {
      refreshMinutes: 5,
      theme: 'dark',
      launcher: { right: 300, bottom: 200 },
      lastPerson: null,
    });
    byLabel(root, 'Ustawienia')?.click();
    button(root, 'Zapisz')?.click();
    expect(stored(storage).launcher).toEqual({ right: 300, bottom: 200 });
  });
});

describe('appearance', () => {
  it('is dark by default and light when that was saved, without touching the Jira page', async () => {
    const dark = await mount(new FakeGateway(todayRoutes()));
    expect(dark.app.root.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);

    const light = await mount(new FakeGateway(todayRoutes()), { refreshMinutes: 5, theme: 'light' });
    expect(light.app.root.getAttribute('data-theme')).toBe('light');
  });

  it('previews, cancels, and stores the theme chosen in settings', async () => {
    const { root, storage } = await mountOpen(new FakeGateway(todayRoutes()));
    byLabel(root, 'Ustawienia')?.click();
    root.querySelector<HTMLButtonElement>('[role="switch"]')?.click();
    expect(root.getAttribute('data-theme')).toBe('light');
    button(root, 'Anuluj')?.click();
    expect(root.getAttribute('data-theme')).toBe('dark');

    byLabel(root, 'Ustawienia')?.click();
    root.querySelector<HTMLButtonElement>('[role="switch"]')?.click();
    button(root, 'Zapisz')?.click();
    expect(root.getAttribute('data-theme')).toBe('light');
    expect(JSON.parse(storage.data.get(SETTINGS_KEY) ?? '{}')).toEqual({
      refreshMinutes: 5,
      theme: 'light',
      panelHeight: null,
      panelWidth: null,
      launcher: null,
      lastPerson: null,
    });
  });

  it('closes the settings first when Escape is pressed, then the panel', async () => {
    const { app, root } = await mountOpen(new FakeGateway(todayRoutes()));
    byLabel(root, 'Ustawienia')?.click();
    const popover = root.querySelector<HTMLElement>('.wt-popover') as HTMLElement;
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(popover.hidden).toBe(true);
    expect(app.isOpen()).toBe(true);
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(app.isOpen()).toBe(false);
  });
});
