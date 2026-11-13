// The whole add-on when the time of another person is shown: the change of person, the
// name in the header and on the launcher, and the life of the choice
// (specs/002-other-user-worktime/spec.md).
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { SETTINGS_KEY, type SettingsStorage } from '../../src/domain/settings';
import { mountApp, type App } from '../../src/ui/app';
import type { Timers } from '../../src/ui/controller';
import { FakeGateway, FIXTURE_NOW, flush, SEARCH, todayRoutes, type FakeReply, type Route } from '../fake-gateway';
import search from '../fixtures/search-today.json';

const USER_SEARCH = '/rest/api/3/user/search';
const USER = '/rest/api/3/user?';

/** The recorded day has one hour by this account on the first ticket. */
const ANNA = { accountId: 'someone-else', accountType: 'atlassian', displayName: 'Anna Nowak', active: true };
/** Nobody logged anything under this account. */
const PIOTR = { accountId: 'piotr-1', accountType: 'atlassian', displayName: 'Piotr Nowakowski', active: true };
const ME = { accountId: 'me', accountType: 'atlassian', displayName: 'Jan Kowalski', active: true };

const AUTHOR_ANNA = 'worklogAuthor = "someone-else"';
const AUTHOR_ME = 'worklogAuthor = currentUser()';

/** The recorded day, and a Jira that knows three people. */
function routes(): Route[] {
  return [...todayRoutes(), { path: USER_SEARCH, reply: { json: [ANNA, PIOTR, ME] } }];
}

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

async function mountOpen(gateway: FakeGateway, settings?: object, storage = memoryStorage(settings)) {
  const timer = manualTimers();
  const container = document.createElement('div');
  document.body.appendChild(container);
  const app = (await mountApp(container, gateway, { storage, now: () => FIXTURE_NOW, timers: timer.timers })) as App;
  await app.open();
  return { app, root: app.root, controller: app.controller, timer, storage, container };
}

const text = (root: Element, selector: string) => root.querySelector(selector)?.textContent;
const rowKeys = (root: Element) => [...root.querySelectorAll('tbody tr a')].map((a) => a.textContent);
const button = (root: Element, label: string) =>
  [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === label) as HTMLButtonElement;
const byLabel = (root: Element, label: string) =>
  root.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`) as HTMLButtonElement;
const launcher = (root: Element) => root.querySelector<HTMLButtonElement>('.wt-launcher') as HTMLButtonElement;
const popover = (root: Element) => root.querySelector<HTMLElement>('.wt-popover') as HTMLElement;
const radios = (root: Element) =>
  [...root.querySelectorAll<HTMLInputElement>('input[type="radio"]')] as [HTMLInputElement, HTMLInputElement];
const nameField = (root: Element) => root.querySelector<HTMLInputElement>('#wt-person-name') as HTMLInputElement;
const stored = (storage: { data: Map<string, string> }) => JSON.parse(storage.data.get(SETTINGS_KEY) ?? '{}');
const authors = (gateway: FakeGateway, from = 0) =>
  gateway
    .searches()
    .slice(from)
    .map((request) => request.query.get('jql')?.split(' AND ')[0]);

function select(input: HTMLInputElement): void {
  input.checked = true;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Settings → the other person → the name → save, as the user does it. */
async function saveOther(root: Element, name: string): Promise<void> {
  byLabel(root, 'Ustawienia').click();
  select(radios(root)[1]);
  const field = nameField(root);
  field.value = name;
  field.dispatchEvent(new Event('input', { bubbles: true }));
  button(root, 'Zapisz').click();
  await flush(80);
}

/** Settings → the signed-in user → save. */
async function saveCurrent(root: Element): Promise<void> {
  byLabel(root, 'Ustawienia').click();
  select(radios(root)[0]);
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

describe('the name of the person', () => {
  it("is the signed-in user's on every start, above the title, and not on the launcher", async () => {
    const { root } = await mountOpen(new FakeGateway(routes()));
    expect(text(root, '.wt-person')).toBe('Jan Kowalski');
    expect(text(root, '.wt-title')).toBe('Piątek 06-11-2026 · 10h 10m');
    expect(launcher(root).textContent).toBe('Dziś: 10h 10m');
    expect(radios(root).map((radio) => radio.checked)).toEqual([false, false]);
    byLabel(root, 'Ustawienia').click();
    expect(radios(root).map((radio) => radio.checked)).toEqual([true, false]);
  });
});

describe('changing the person', () => {
  it('clears everything of the previous person at the moment the name changes', async () => {
    const gateway = new FakeGateway(routes());
    const { root, controller } = await mountOpen(gateway);
    await controller.shiftPeriod(-1);
    await controller.back();
    expect(rowKeys(root)).toHaveLength(3);
    expect(byLabel(root, 'Ponów').disabled).toBe(false);

    const hold = held();
    gateway.add({ path: SEARCH, reply: hold.reply });
    await saveOther(root, 'anna  nowak');

    // The settings are closed, the new name is up, and nothing of the user's own is left.
    expect(popover(root).hidden).toBe(true);
    expect(text(root, '.wt-person')).toBe('Anna Nowak');
    expect(rowKeys(root)).toEqual([]);
    expect(text(root, '.wt-title .wt-total')).toBe('…');
    expect(text(root, '.wt-footer .wt-total')).toBe('…');
    expect(root.querySelector('.wt-progress__cover')?.getAttribute('style')).toContain('--wt-fill: 0%');
    expect([byLabel(root, 'Cofnij').disabled, byLabel(root, 'Ponów').disabled]).toEqual([true, true]);
    // Only the loading state is in the table area.
    expect(root.querySelector<HTMLElement>('.wt-loading')?.hidden).toBe(false);
    expect(root.querySelector<HTMLElement>('.wt-message')?.hidden).toBe(true);
    expect(launcher(root).textContent).toBe('Anna Nowak · Dziś: –');
    expect(launcher(root).style.getPropertyValue('--wt-total-from')).toBe('');

    hold.release({ json: search });
    await flush(80);
    expect(rowKeys(root)).toEqual(['AM-10234']);
    expect(text(root, '.wt-person')).toBe('Anna Nowak');
    expect(text(root, '.wt-title')).toBe('Piątek 06-11-2026 · 1h 00m');
    expect(text(root, '.wt-footer .wt-total')).toBe('1h 00m');
    expect(launcher(root).textContent).toBe('Anna Nowak · Dziś: 1h 00m');
    expect(launcher(root).getAttribute('title')).toBe('Anna Nowak');
    expect(controller.state).toBe('ready');
  });

  it('asks Jira for that person from then on: period, refresh, and auto-refresh', async () => {
    const gateway = new FakeGateway(routes());
    const { root, controller, timer, app } = await mountOpen(gateway);
    await saveOther(root, 'Anna Nowak');
    const from = gateway.searches().length - 1;
    expect(authors(gateway, from)).toEqual([AUTHOR_ANNA]);

    await controller.selectPreset('thisWeek');
    await controller.refresh();
    timer.fireAll();
    await flush(80);
    // Minimised: the launcher keeps refreshing the same person.
    app.minimise();
    timer.fireAll();
    await flush(80);

    const asked = authors(gateway, from);
    expect(asked.length).toBeGreaterThanOrEqual(5);
    expect(new Set(asked)).toEqual(new Set([AUTHOR_ANNA]));
    expect(launcher(root).textContent).toBe('Anna Nowak · Zakres: 1h 00m');
  });

  it('keeps the period, the sort order, the zoom, the size of the panel, and the place of the launcher', async () => {
    const gateway = new FakeGateway(routes());
    const { root, controller, storage } = await mountOpen(gateway, {
      refreshMinutes: 5,
      theme: 'dark',
      panelHeight: 600,
      panelWidth: 700,
      launcher: { right: 300, bottom: 200 },
    });
    await controller.selectPreset('thisYear');
    byLabel(root, 'Przybliż').click();
    const sum = [...root.querySelectorAll<HTMLButtonElement>('.wt-sort')].find((b) => b.textContent === 'Suma');
    sum?.click();
    sum?.click();
    const chart = root.querySelector<HTMLElement>('.wt-chart') as HTMLElement;
    expect(chart.dataset.granularity).toBe('day');

    await saveOther(root, 'Anna Nowak');

    expect(controller.period.preset).toBe('thisYear');
    expect(text(root, '.wt-title__text')).toBe('01-01-2026 – 31-12-2026');
    expect(root.querySelector('th.wt-col-sum')?.getAttribute('aria-sort')).toBe('descending');
    expect(chart.dataset.granularity).toBe('day');
    expect(byLabel(root, 'Oddal').disabled).toBe(false);
    const panel = root.querySelector<HTMLElement>('.wt-panel') as HTMLElement;
    expect(panel.style.getPropertyValue('--wt-panel-height')).toBe('600px');
    expect(root.style.getPropertyValue('--wt-launcher-right')).toBe('300px');
    expect(stored(storage)).toMatchObject({ panelHeight: 600, panelWidth: 700, launcher: { right: 300, bottom: 200 } });
  });

  it('goes from one other person to a second one in the same way', async () => {
    const gateway = new FakeGateway(routes());
    const { root } = await mountOpen(gateway);
    await saveOther(root, 'Anna Nowak');
    expect(rowKeys(root)).toEqual(['AM-10234']);

    const hold = held();
    gateway.add({ path: SEARCH, reply: hold.reply });
    await saveOther(root, 'Piotr Nowakowski');
    expect(text(root, '.wt-person')).toBe('Piotr Nowakowski');
    expect(rowKeys(root)).toEqual([]);
    expect(launcher(root).textContent).toBe('Piotr Nowakowski · Dziś: –');

    hold.release({ json: search });
    await flush(80);
    // He logged nothing: the usual empty state under his name.
    expect(text(root, '.wt-message')).toBe('Brak wpisów czasu w wybranym okresie.');
    expect(text(root, '.wt-title')).toBe('Piątek 06-11-2026 · 0h 00m');
    expect(launcher(root).textContent).toBe('Piotr Nowakowski · Dziś: 0h 00m');
    expect(authors(gateway).at(-1)).toBe('worklogAuthor = "piotr-1"');
  });

  it('returns to the signed-in user with the first option, clearing the other rows first', async () => {
    const gateway = new FakeGateway(routes());
    const { root } = await mountOpen(gateway);
    await saveOther(root, 'Anna Nowak');

    const hold = held();
    gateway.add({ path: SEARCH, reply: hold.reply });
    await saveCurrent(root);
    expect(text(root, '.wt-person')).toBe('Jan Kowalski');
    expect(rowKeys(root)).toEqual([]);
    expect(launcher(root).textContent).toBe('Dziś: –');
    expect(launcher(root).hasAttribute('title')).toBe(false);

    hold.release({ json: search });
    await flush(80);
    expect(rowKeys(root)).toHaveLength(3);
    expect(launcher(root).textContent).toBe('Dziś: 10h 10m');
    expect(authors(gateway).at(-1)).toBe(AUTHOR_ME);
  });

  it('shows the error state under the new name, with no rows of the person before', async () => {
    const gateway = new FakeGateway(routes());
    const { root, controller } = await mountOpen(gateway);
    gateway.add({ path: SEARCH, reply: { status: 500 } });
    await saveOther(root, 'Anna Nowak');

    expect(controller.state).toBe('error');
    expect(text(root, '.wt-person')).toBe('Anna Nowak');
    expect(rowKeys(root)).toEqual([]);
    expect(text(root, '.wt-message p')).toBe('Nie udało się pobrać danych z Jiry.');
    expect(launcher(root).textContent).toBe('Anna Nowak · Dziś: –');
    expect(launcher(root).getAttribute('title')).toBe('Nie udało się pobrać danych z Jiry.');

    gateway.add({ path: SEARCH, reply: { json: search } });
    root.querySelector<HTMLButtonElement>('.wt-message button')?.click();
    await flush(80);
    expect(rowKeys(root)).toEqual(['AM-10234']);
    expect(authors(gateway).at(-1)).toBe(AUTHOR_ANNA);
  });

  it('loads nothing again when the same person is saved once more', async () => {
    const gateway = new FakeGateway(routes());
    const { root } = await mountOpen(gateway);
    await saveOther(root, 'Anna Nowak');
    const before = gateway.requests.length;

    byLabel(root, 'Ustawienia').click();
    expect(radios(root)[1].checked).toBe(true);
    expect(nameField(root).value).toBe('Anna Nowak');
    button(root, 'Zapisz').click();
    await flush(80);
    expect(gateway.requests).toHaveLength(before);
    expect(rowKeys(root)).toEqual(['AM-10234']);
  });

  it("shows the user's own time, without a name on the launcher, when they type their own name", async () => {
    const gateway = new FakeGateway(routes());
    const { root, storage } = await mountOpen(gateway);
    const searches = gateway.searches().length;
    await saveOther(root, 'jan kowalski');

    expect(text(root, '.wt-person')).toBe('Jan Kowalski');
    expect(launcher(root).textContent).toBe('Dziś: 10h 10m');
    expect(rowKeys(root)).toHaveLength(3);
    // The same person as before: nothing was loaded again, and nobody is remembered.
    expect(gateway.searches()).toHaveLength(searches);
    expect(stored(storage).lastPerson).toBeNull();
    // The settings still say which option was chosen.
    byLabel(root, 'Ustawienia').click();
    expect(radios(root).map((radio) => radio.checked)).toEqual([false, true]);
  });

  it('changes nothing when the name is not found', async () => {
    const gateway = new FakeGateway(routes());
    const { root, storage } = await mountOpen(gateway);
    const before = gateway.searches().length;
    byLabel(root, 'Ustawienia').click();
    (root.querySelector('#wt-interval') as HTMLInputElement).value = '10';
    select(radios(root)[1]);
    nameField(root).value = 'Jan Nieistniejący';
    nameField(root).dispatchEvent(new Event('input', { bubbles: true }));
    button(root, 'Zapisz').click();
    await flush(80);

    expect(text(root, '.wt-alert__text')).toBe('Nie znaleziono użytkownika.\nNie można zapisać ustawień.');
    expect(text(root, '.wt-person')).toBe('Jan Kowalski');
    expect(rowKeys(root)).toHaveLength(3);
    expect(gateway.searches()).toHaveLength(before);
    expect(storage.data.has(SETTINGS_KEY)).toBe(false);
  });
});

describe('Escape with the alert window', () => {
  it('closes one thing at a time: the alert, the settings, then the panel', async () => {
    const { root, app } = await mountOpen(new FakeGateway(routes()));
    await saveOther(root, 'Jan Nieistniejący');
    const alert = root.querySelector<HTMLElement>('.wt-alert') as HTMLElement;
    const escape = (target: Element) =>
      target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));

    expect(alert.hidden).toBe(false);
    escape(alert.querySelector('button') as HTMLButtonElement);
    expect([alert.hidden, popover(root).hidden, app.isOpen()]).toEqual([true, false, true]);

    escape(nameField(root));
    expect([popover(root).hidden, app.isOpen()]).toEqual([true, true]);

    escape(root);
    expect(app.isOpen()).toBe(false);
  });

  it('closes the alert and the settings, without saving, when the panel is closed under them', async () => {
    const { root, app, storage } = await mountOpen(new FakeGateway(routes()));
    await saveOther(root, 'Jan Nieistniejący');
    byLabel(root, 'Minimalizuj').click();
    expect(app.isOpen()).toBe(false);
    expect(root.querySelector<HTMLElement>('.wt-alert')?.hidden).toBe(true);
    expect(popover(root).hidden).toBe(true);
    expect(storage.data.has(SETTINGS_KEY)).toBe(false);
  });
});

describe('the life of the choice', () => {
  it('keeps the person when the panel is minimised, however that is done', async () => {
    const gateway = new FakeGateway(routes());
    const { root, app } = await mountOpen(gateway);
    await saveOther(root, 'Anna Nowak');

    for (const minimise of [
      () => launcher(root).click(),
      () => byLabel(root, 'Minimalizuj').click(),
      () => root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
    ]) {
      minimise();
      expect(app.isOpen()).toBe(false);
      expect(launcher(root).textContent).toBe('Anna Nowak · Dziś: 1h 00m');
      await app.open();
      expect(text(root, '.wt-person')).toBe('Anna Nowak');
      expect(rowKeys(root)).toEqual(['AM-10234']);
      expect(authors(gateway).at(-1)).toBe(AUTHOR_ANNA);
    }
  });

  it('returns to the signed-in user with the close button, leaving no row of the other person', async () => {
    const gateway = new FakeGateway(routes());
    const { root, app } = await mountOpen(gateway);
    await saveOther(root, 'Anna Nowak');

    const hold = held();
    gateway.add({ path: SEARCH, reply: hold.reply });
    const before = gateway.searches().length;
    byLabel(root, 'Zamknij').click();

    expect(app.isOpen()).toBe(false);
    expect(text(root, '.wt-person')).toBe('Jan Kowalski');
    expect(rowKeys(root)).toEqual([]);
    // No name, and no total of the other person while the user's own loads.
    expect(launcher(root).textContent).toBe('Dziś: –');
    expect(launcher(root).hasAttribute('title')).toBe(false);
    // The panel was on today already: today is loaded again all the same, for the user.
    await flush(80);
    expect(authors(gateway, before)).toEqual([AUTHOR_ME]);

    // Opened before any data has arrived: still nothing of the other person.
    const opening = app.open();
    await flush(80);
    expect(rowKeys(root)).toEqual([]);
    expect(text(root, '.wt-title .wt-total')).toBe('…');

    hold.release({ json: search });
    await opening;
    await flush(80);
    expect(rowKeys(root)).toHaveLength(3);
    expect(text(root, '.wt-title')).toBe('Piątek 06-11-2026 · 10h 10m');
    expect(launcher(root).textContent).toBe('Dziś: 10h 10m');
    byLabel(root, 'Ustawienia').click();
    expect(radios(root).map((radio) => radio.checked)).toEqual([true, false]);
  });

  it('forgets the chosen person, and the period, together with the close button', async () => {
    const gateway = new FakeGateway(routes());
    const { root, app, controller } = await mountOpen(gateway);
    await saveOther(root, 'Anna Nowak');
    await controller.selectPreset('thisWeek');
    byLabel(root, 'Zamknij').click();
    await flush(80);
    expect(launcher(root).textContent).toBe('Dziś: 10h 10m');

    await app.open();
    expect(controller.period.preset).toBe('today');
    expect(text(root, '.wt-person')).toBe('Jan Kowalski');
    expect(authors(gateway).at(-1)).toBe(AUTHOR_ME);
  });

  it('starts on the signed-in user on a new page, and offers the remembered person', async () => {
    const storage = memoryStorage();
    const first = await mountOpen(new FakeGateway(routes()), undefined, storage);
    await saveOther(first.root, 'anna nowak');
    // Remembered with the name as Jira has it.
    expect(stored(storage).lastPerson).toEqual({ accountId: 'someone-else', displayName: 'Anna Nowak' });

    document.body.innerHTML = '';
    const gateway = new FakeGateway([...routes(), { path: USER, reply: { json: ANNA } }]);
    const second = await mountOpen(gateway, undefined, storage);
    expect(text(second.root, '.wt-person')).toBe('Jan Kowalski');
    expect(launcher(second.root).textContent).toBe('Dziś: 10h 10m');
    expect(rowKeys(second.root)).toHaveLength(3);
    expect(new Set(authors(gateway))).toEqual(new Set([AUTHOR_ME]));

    byLabel(second.root, 'Ustawienia').click();
    expect(radios(second.root).map((radio) => radio.checked)).toEqual([true, false]);
    select(radios(second.root)[1]);
    expect(nameField(second.root).value).toBe('Anna Nowak');
    button(second.root, 'Zapisz').click();
    await flush(80);

    // Checked by account ID, without a search by name and without typing.
    expect(gateway.sent(USER_SEARCH)).toHaveLength(0);
    expect(gateway.sent(USER).map((request) => request.query.get('accountId'))).toEqual(['someone-else']);
    expect(text(second.root, '.wt-person')).toBe('Anna Nowak');
    expect(rowKeys(second.root)).toEqual(['AM-10234']);
  });

  it('keeps the remembered person when the signed-in user is chosen, the panel resized, or the launcher moved', async () => {
    const gateway = new FakeGateway(routes());
    const { root, storage } = await mountOpen(gateway);
    await saveOther(root, 'Anna Nowak');
    const remembered = { accountId: 'someone-else', displayName: 'Anna Nowak' };

    await saveCurrent(root);
    expect(stored(storage).lastPerson).toEqual(remembered);

    const grip = root.querySelector<HTMLElement>('.wt-resize--block') as HTMLElement;
    grip.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(stored(storage).panelHeight).not.toBeNull();
    expect(stored(storage).lastPerson).toEqual(remembered);

    launcher(root).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', shiftKey: true, bubbles: true }));
    expect(stored(storage).launcher).not.toBeNull();
    expect(stored(storage).lastPerson).toEqual(remembered);
  });

  it('replaces the remembered person only by another person', async () => {
    const gateway = new FakeGateway(routes());
    const { root, storage } = await mountOpen(gateway);
    await saveOther(root, 'Anna Nowak');
    await saveOther(root, 'Jan Kowalski');
    expect(stored(storage).lastPerson).toEqual({ accountId: 'someone-else', displayName: 'Anna Nowak' });
    await saveOther(root, 'Piotr Nowakowski');
    expect(stored(storage).lastPerson).toEqual({ accountId: 'piotr-1', displayName: 'Piotr Nowakowski' });
  });

  it('still shows the person when the browser cannot store the settings, and remembers nothing', async () => {
    const data = new Map<string, string>();
    const storage = {
      data,
      getItem: (key: string) => data.get(key) ?? null,
      setItem: () => {
        throw new Error('blocked');
      },
    };
    const { root } = await mountOpen(new FakeGateway(routes()), undefined, storage);
    await saveOther(root, 'Anna Nowak');

    expect(text(root, '.wt-person')).toBe('Anna Nowak');
    expect(rowKeys(root)).toEqual(['AM-10234']);
    expect(popover(root).hidden).toBe(false);
    const notices = [...root.querySelectorAll<HTMLElement>('.wt-field-error')].filter((notice) => !notice.hidden);
    expect(notices.map((notice) => notice.textContent)).toEqual(['Nie udało się zapisać ustawień w tej przeglądarce.']);
    expect(data.size).toBe(0);
  });
});
