// The whole add-on and its reset button: when the button is switched on, and what a press
// brings back (specs/004-reset-button-toolbar/spec.md).
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { SETTINGS_KEY, type SettingsStorage } from '../../src/domain/settings';
import { mountApp, type App } from '../../src/ui/app';
import type { Timers } from '../../src/ui/controller';
import { FakeGateway, FIXTURE_NOW, flush, SEARCH, todayRoutes, type FakeReply, type Route } from '../fake-gateway';
import search from '../fixtures/search-today.json';

const DAY = 86_400_000;
const USER_SEARCH = '/rest/api/3/user/search';

/** The recorded day has one hour by this account on the first ticket. */
const ANNA = { accountId: 'someone-else', accountType: 'atlassian', displayName: 'Anna Nowak', active: true };
const ME = { accountId: 'me', accountType: 'atlassian', displayName: 'Jan Kowalski', active: true };
const AUTHOR_ME = 'worklogAuthor = currentUser()';

/** The recorded day, and a Jira that knows two people. */
function routes(): Route[] {
  return [...todayRoutes(), { path: USER_SEARCH, reply: { json: [ANNA, ME] } }];
}

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
  const app = (await mountApp(container, gateway, { storage, now: () => clock.now, timers: timer.timers })) as App;
  return { app, root: app.root, controller: app.controller, clock, timer, storage };
}

/** Mounts and opens the panel, as a user who clicked the launcher. */
async function mountOpen(gateway: FakeGateway, settings?: object) {
  const mounted = await mount(gateway, settings);
  await mounted.app.open();
  return mounted;
}

const text = (root: Element, selector: string) => root.querySelector(selector)?.textContent;
const rowKeys = (root: Element) => [...root.querySelectorAll('tbody tr a')].map((a) => a.textContent);
const button = (root: Element, label: string) =>
  [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === label) as HTMLButtonElement;
const byLabel = (root: Element, label: string) =>
  root.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`) as HTMLButtonElement;
const reset = (root: Element) => button(root, 'Resetuj');
const launcher = (root: Element) => root.querySelector<HTMLButtonElement>('.wt-launcher') as HTMLButtonElement;
const popover = (root: Element) => root.querySelector<HTMLElement>('.wt-popover') as HTMLElement;
const pressed = (root: Element) =>
  [...root.querySelectorAll('.wt-chip[aria-pressed="true"]')].map((chip) => chip.textContent);
const sorting = (root: Element) => [...root.querySelectorAll('th')].map((cell) => cell.getAttribute('aria-sort'));
const raw = (storage: { data: Map<string, string> }) => storage.data.get(SETTINGS_KEY);
/** Which of back, forward, and reset are switched off. */
const off = (root: Element) => [
  byLabel(root, 'Cofnij').disabled,
  byLabel(root, 'Ponów').disabled,
  reset(root).disabled,
];

/** A press on one of the four period buttons, and the load it starts. */
async function choose(root: Element, label: string): Promise<void> {
  button(root, label).click();
  await flush(80);
}

function select(input: HTMLInputElement): void {
  input.checked = true;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Settings → one of the two radio buttons → a name for the other person → save. */
async function savePerson(root: Element, name: string | null): Promise<void> {
  byLabel(root, 'Ustawienia').click();
  const radios = [...root.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
  select(radios[name === null ? 0 : 1] as HTMLInputElement);
  if (name !== null) {
    const field = root.querySelector<HTMLInputElement>('#wt-person-name') as HTMLInputElement;
    field.value = name;
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }
  button(root, 'Zapisz').click();
  await flush(80);
}

beforeEach(() => {
  document.body.innerHTML = '';
  Object.defineProperty(document, 'hidden', { value: false, configurable: true });
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('the state of the reset button (004 FR-015)', () => {
  it('is switched off on a newly opened panel', async () => {
    const { root } = await mountOpen(new FakeGateway(routes()));
    expect(off(root)).toEqual([true, true, true]);
  });

  it('is switched on at once with another period, before the period has loaded', async () => {
    const gateway = new FakeGateway(routes());
    const { root } = await mountOpen(gateway);
    const slow = held();
    gateway.add({ path: SEARCH, reply: slow.reply });

    button(root, 'Miesiąc').click();
    expect(reset(root).disabled).toBe(false);

    slow.release({ json: search });
    await flush(80);
    expect(reset(root).disabled).toBe(false);
  });

  it('is switched on with another person on today, and off again with the signed-in user', async () => {
    const { root } = await mountOpen(new FakeGateway(routes()));
    await savePerson(root, 'Anna Nowak');
    expect(text(root, '.wt-person')).toBe('Anna Nowak');
    expect(off(root)).toEqual([true, true, false]);

    // The start view again, without a press on the button.
    await savePerson(root, null);
    expect(text(root, '.wt-person')).toBe('Jan Kowalski');
    expect(off(root)).toEqual([true, true, true]);
  });

  it('is switched on while there is a step to go back or forward to', async () => {
    const { root } = await mountOpen(new FakeGateway(routes()));
    await choose(root, 'Tydzień');
    byLabel(root, 'Cofnij').click();
    await flush(80);
    // Today for the signed-in user, but not the start view: "Ponów" has a step.
    expect(pressed(root)).toEqual(['Dzień']);
    expect(off(root)).toEqual([true, false, false]);

    // Today chosen by hand after another period: "Cofnij" has a step.
    byLabel(root, 'Ponów').click();
    await flush(80);
    await choose(root, 'Dzień');
    expect(pressed(root)).toEqual(['Dzień']);
    expect(off(root)).toEqual([false, true, false]);
  });

  it('stays off when the current day is chosen on the start view', async () => {
    const { root } = await mountOpen(new FakeGateway(routes()));
    const day = root.querySelector<HTMLInputElement>('#wt-day') as HTMLInputElement;
    day.value = '2026-11-06';
    day.dispatchEvent(new Event('change', { bubbles: true }));
    await flush(80);
    expect(off(root)).toEqual([true, true, true]);
  });

  it('does not depend on the load: off while today loads and after it failed', async () => {
    const gateway = new FakeGateway(routes());
    const { app, root } = await mount(gateway);
    const slow = held();
    gateway.add({ path: SEARCH, reply: slow.reply });

    const opening = app.open();
    await flush();
    expect(reset(root).disabled).toBe(true);

    slow.release({ status: 500 });
    await opening;
    expect(text(root, '.wt-message p')).toBe('Nie udało się pobrać danych z Jiry.');
    expect(reset(root).disabled).toBe(true);
  });

  it('stays on when the panel is minimised on another period and opened again', async () => {
    const { app, root } = await mountOpen(new FakeGateway(routes()));
    await choose(root, 'Miesiąc');
    byLabel(root, 'Minimalizuj').click();
    expect(app.isOpen()).toBe(false);
    await app.open();
    await flush(80);
    expect(reset(root).disabled).toBe(false);
  });

  it('follows the calendar: on after a refresh by hand on the day before, off after an automatic one', async () => {
    const byHand = await mountOpen(new FakeGateway(routes()));
    byHand.clock.now = FIXTURE_NOW + DAY;
    button(byHand.root, 'Odśwież').click();
    await flush(80);
    // The period on screen is yesterday now: the dates count, not the name of the preset.
    expect(text(byHand.root, '.wt-title__text')).toBe('Piątek 06-11-2026');
    expect(reset(byHand.root).disabled).toBe(false);

    const automatic = await mountOpen(new FakeGateway(routes()));
    automatic.clock.now = FIXTURE_NOW + DAY;
    automatic.timer.fireAll();
    await flush(80);
    // The view went on to the new day by itself (001).
    expect(text(automatic.root, '.wt-title__text')).toBe('Sobota 07-11-2026');
    expect(reset(automatic.root).disabled).toBe(true);
  });
});

describe('the reset button (004)', () => {
  it('goes back to today with the panel open and nothing to go back to', async () => {
    const gateway = new FakeGateway(routes());
    const { app, root } = await mountOpen(gateway);
    await choose(root, 'Miesiąc');
    await choose(root, 'Tydzień');
    expect(off(root)).toEqual([false, true, false]);
    const asked = gateway.searches().length;

    reset(root).click();
    await flush(80);

    expect(app.isOpen()).toBe(true);
    expect(text(root, '.wt-title')).toBe('Piątek 06-11-2026 · 10h 10m');
    expect(pressed(root)).toEqual(['Dzień']);
    expect(rowKeys(root)).toEqual(['AM-10234', 'AM-20012', 'AM-10087']);
    expect(off(root)).toEqual([true, true, true]);
    // One load of today, and nothing for the period that was left (SC-005).
    expect(gateway.searches()).toHaveLength(asked + 1);
  });

  it('returns to the signed-in user at once, leaving no row of the other person', async () => {
    const gateway = new FakeGateway(routes());
    const { root } = await mountOpen(gateway);
    await savePerson(root, 'Anna Nowak');
    expect(rowKeys(root)).toEqual(['AM-10234']);
    expect(launcher(root).textContent).toBe('Anna Nowak · Dziś: 1h 00m');

    const slow = held();
    gateway.add({ path: SEARCH, reply: slow.reply });
    const asked = gateway.searches().length;
    reset(root).click();

    // In the same moment: the name, the emptied table, and a launcher without the name.
    expect(text(root, '.wt-person')).toBe('Jan Kowalski');
    expect(rowKeys(root)).toEqual([]);
    expect(launcher(root).textContent).toBe('Dziś: –');
    expect(launcher(root).hasAttribute('title')).toBe(false);

    await flush(80);
    const authors = gateway
      .searches()
      .slice(asked)
      .map((request) => request.query.get('jql')?.split(' AND ')[0]);
    expect(authors).toEqual([AUTHOR_ME]);

    slow.release({ json: search });
    await flush(80);
    expect(rowKeys(root)).toHaveLength(3);
    expect(launcher(root).textContent).toBe('Dziś: 10h 10m');
  });

  it('shows the pending sign on the launcher only when the period or the person changes', async () => {
    const gateway = new FakeGateway(routes());
    const { root } = await mountOpen(gateway);
    await choose(root, 'Miesiąc');
    expect(launcher(root).textContent).toMatch(/^Zakres: /);
    const slow = held();
    gateway.add({ path: SEARCH, reply: slow.reply });
    reset(root).click();
    expect(launcher(root).textContent).toBe('Dziś: –');
    slow.release({ json: search });
    await flush(80);
    expect(launcher(root).textContent).toBe('Dziś: 10h 10m');

    // Only the steps are forgotten: the total of today is known and stays (FR-014).
    gateway.add({ path: SEARCH, reply: { json: search } });
    await choose(root, 'Tydzień');
    byLabel(root, 'Cofnij').click();
    await flush(80);
    expect(launcher(root).textContent).toBe('Dziś: 10h 10m');
    const again = held();
    gateway.add({ path: SEARCH, reply: again.reply });
    reset(root).click();
    expect(launcher(root).textContent).toBe('Dziś: 10h 10m');
    await flush(80);
    expect(launcher(root).textContent).toBe('Dziś: 10h 10m');
    again.release({ json: search });
    await flush(80);
    expect(launcher(root).textContent).toBe('Dziś: 10h 10m');
  });

  it('changes no stored setting and keeps the sort order (FR-013)', async () => {
    const settings = {
      refreshMinutes: 10,
      theme: 'light',
      panelHeight: 800,
      panelWidth: 900,
      launcher: { right: 100, bottom: 200 },
      lastPerson: { accountId: 'someone-else', displayName: 'Anna Nowak' },
    };
    const { root, storage } = await mountOpen(new FakeGateway(routes()), settings);
    await choose(root, 'Miesiąc');
    [...root.querySelectorAll<HTMLButtonElement>('.wt-sort')].at(-1)?.click();
    const before = { stored: raw(storage), order: sorting(root) };
    expect(before.order.filter((order) => order !== 'none')).toHaveLength(1);

    reset(root).click();
    await flush(80);

    expect(raw(storage)).toBe(before.stored);
    expect(JSON.parse(raw(storage) ?? '')).toEqual(settings);
    expect(root.getAttribute('data-theme')).toBe('light');
    expect(sorting(root)).toEqual(before.order);
  });

  it('closes the settings without saving, and the export menu (FR-016)', async () => {
    const gateway = new FakeGateway(routes());
    const { root, storage } = await mountOpen(gateway);
    await choose(root, 'Miesiąc');

    byLabel(root, 'Ustawienia').click();
    expect(popover(root).hidden).toBe(false);
    const interval = root.querySelector<HTMLInputElement>('#wt-interval') as HTMLInputElement;
    interval.value = '2';
    interval.dispatchEvent(new Event('input', { bubbles: true }));
    const before = raw(storage);
    reset(root).click();
    await flush(80);
    expect(popover(root).hidden).toBe(true);
    expect(byLabel(root, 'Ustawienia').getAttribute('aria-expanded')).toBe('false');
    expect(raw(storage)).toBe(before);
    expect(pressed(root)).toEqual(['Dzień']);

    // A check of a person that is still running is given up with the settings.
    await choose(root, 'Miesiąc');
    const check = held();
    gateway.add({ path: USER_SEARCH, reply: check.reply });
    void savePerson(root, 'Anna Nowak');
    await flush(80);
    expect(popover(root).hidden).toBe(false);
    reset(root).click();
    expect(popover(root).hidden).toBe(true);
    check.release({ json: [ANNA] });
    await flush(80);
    expect(text(root, '.wt-person')).toBe('Jan Kowalski');
    expect(popover(root).hidden).toBe(true);
    expect(raw(storage)).toBe(before);

    await choose(root, 'Miesiąc');
    const menu = root.querySelector<HTMLElement>('.wt-export__menu') as HTMLElement;
    (root.querySelector<HTMLButtonElement>('.wt-export__button') as HTMLButtonElement).click();
    expect(menu.hidden).toBe(false);
    reset(root).click();
    expect(menu.hidden).toBe(true);
  });

  it('gives up a load that is still running', async () => {
    const gateway = new FakeGateway(routes());
    const { root } = await mountOpen(gateway);
    const slow = held();
    let first = true;
    gateway.add({
      path: SEARCH,
      // Only the first of the following searches is slow: the one of the year.
      reply: () => {
        if (!first) return { json: search };
        first = false;
        return slow.reply();
      },
    });

    button(root, 'Rok').click();
    await flush();
    reset(root).click();
    await flush(80);
    slow.release({ json: search });
    await flush(80);

    expect(text(root, '.wt-title')).toBe('Piątek 06-11-2026 · 10h 10m');
    expect(rowKeys(root)).toEqual(['AM-10234', 'AM-20012', 'AM-10087']);
    expect(pressed(root)).toEqual(['Dzień']);
  });

  it('shows the error state for today when the load fails, and recovers on retry (FR-019)', async () => {
    const gateway = new FakeGateway(routes());
    const { root } = await mountOpen(gateway);
    await savePerson(root, 'Anna Nowak');
    await choose(root, 'Miesiąc');

    gateway.add({ path: SEARCH, reply: { status: 500 } });
    reset(root).click();
    await flush(80);
    expect(text(root, '.wt-message p')).toBe('Nie udało się pobrać danych z Jiry.');
    expect(text(root, '.wt-person')).toBe('Jan Kowalski');
    expect(text(root, '.wt-title__text')).toBe('Piątek 06-11-2026');
    // The reset is not taken back, so there is nothing left to reset.
    expect(off(root)).toEqual([true, true, true]);

    gateway.add({ path: SEARCH, reply: { json: search } });
    (root.querySelector<HTMLButtonElement>('.wt-message button') as HTMLButtonElement).click();
    await flush(80);
    expect(rowKeys(root)).toHaveLength(3);
    expect(reset(root).disabled).toBe(true);
  });

  it('hands the keyboard focus to refresh and keeps the panel open (FR-018)', async () => {
    const { app, root } = await mountOpen(new FakeGateway(routes()));
    await choose(root, 'Miesiąc');
    reset(root).focus();
    expect(document.activeElement).toBe(reset(root));

    reset(root).click();
    expect(document.activeElement).toBe(button(root, 'Odśwież'));
    expect(app.isOpen()).toBe(true);
    await flush(80);
    expect(document.activeElement).toBe(button(root, 'Odśwież'));
  });

  it('lets the automatic refresh go on with the stored interval', async () => {
    const { root, timer } = await mountOpen(new FakeGateway(routes()), {
      refreshMinutes: 10,
      theme: 'dark',
      panelHeight: null,
      panelWidth: null,
      launcher: null,
      lastPerson: null,
    });
    await choose(root, 'Miesiąc');
    reset(root).click();
    await flush(80);
    // The launcher's timer and the panel's, both counted from the new load.
    expect(timer.delays()).toEqual([10 * 60_000, 10 * 60_000]);
  });

  it('does nothing while the panel is hidden', async () => {
    const gateway = new FakeGateway(routes());
    const { app, root } = await mountOpen(gateway);
    await choose(root, 'Miesiąc');
    byLabel(root, 'Minimalizuj').click();
    const asked = gateway.requests.length;
    const shown = launcher(root).textContent;

    app.reset();
    await flush(80);
    expect(gateway.requests).toHaveLength(asked);
    expect(launcher(root).textContent).toBe(shown);
    await app.open();
    await flush(80);
    expect(pressed(root)).toEqual(['Miesiąc']);
  });

  it('forgets exactly what the close button forgets (FR-011)', async () => {
    const seen = [];
    for (const way of ['close', 'reset'] as const) {
      const { app, root, storage } = await mountOpen(new FakeGateway(routes()));
      await savePerson(root, 'Anna Nowak');
      await choose(root, 'Miesiąc');
      await choose(root, 'Tydzień');
      [...root.querySelectorAll<HTMLButtonElement>('.wt-sort')].at(-1)?.click();

      if (way === 'close') {
        byLabel(root, 'Zamknij').click();
        await flush(80);
        await app.open();
      } else {
        reset(root).click();
      }
      await flush(80);

      seen.push({
        title: text(root, '.wt-title'),
        person: text(root, '.wt-person'),
        pressed: pressed(root),
        off: [byLabel(root, 'Cofnij').disabled, byLabel(root, 'Ponów').disabled],
        launcher: launcher(root).textContent,
        stored: raw(storage),
        order: sorting(root),
        rows: rowKeys(root),
      });
    }
    expect(seen[1]).toEqual(seen[0]);
    expect(seen[1]?.title).toBe('Piątek 06-11-2026 · 10h 10m');
    expect(seen[1]?.person).toBe('Jan Kowalski');
  });

  it('leaves the close button as it was (FR-020)', async () => {
    const { app, controller, root } = await mountOpen(new FakeGateway(routes()));
    await choose(root, 'Miesiąc');
    reset(root).click();
    await flush(80);

    await choose(root, 'Tydzień');
    byLabel(root, 'Zamknij').click();
    expect(app.isOpen()).toBe(false);
    await app.open();
    await flush(80);
    expect(controller.period.preset).toBe('today');
    expect(off(root)).toEqual([true, true, true]);
  });
});
