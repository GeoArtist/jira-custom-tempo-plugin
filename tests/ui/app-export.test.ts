// The whole add-on when the table is exported to a file: what the file is made from, when
// the control can be used, and where the focus goes (specs/003-table-export/spec.md).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { SettingsStorage } from '../../src/domain/settings';
import type { ReportFile } from '../../src/export/index';
import { mountApp, type App } from '../../src/ui/app';
import type { Timers } from '../../src/ui/controller';
import { FakeGateway, FIXTURE_NOW, flush, SEARCH, todayRoutes, type FakeReply } from '../fake-gateway';
import empty from '../fixtures/search-empty.json';
import search from '../fixtures/search-today.json';

const USER_SEARCH = '/rest/api/3/user/search';
/** The recorded day has one hour by this account on the first ticket. */
const JOZEF = { accountId: 'someone-else', accountType: 'atlassian', displayName: 'Józef Śliwiński', active: true };

function manualTimers() {
  let nextId = 1;
  const pending = new Map<number, () => void>();
  const timers: Timers = {
    setTimeout: (handler) => {
      pending.set(nextId, handler);
      return nextId++;
    },
    clearTimeout: (handle) => void pending.delete(handle as number),
  };
  return {
    timers,
    fireAll: () => {
      const due = [...pending.entries()];
      for (const [id, handler] of due) {
        pending.delete(id);
        handler();
      }
    },
  };
}

function memoryStorage(): SettingsStorage {
  const data = new Map<string, string>();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => void data.set(key, value) };
}

/** A search answer the test releases when it wants. */
function held() {
  let release: (reply: FakeReply) => void = () => {};
  const reply = new Promise<FakeReply>((resolve) => (release = resolve));
  return { reply: () => reply, release };
}

type Save = (file: ReportFile, host: Node) => void;

async function mountOpen(gateway: FakeGateway, saveFile: Save = vi.fn()) {
  const timer = manualTimers();
  const container = document.createElement('div');
  document.body.appendChild(container);
  const app = (await mountApp(container, gateway, {
    storage: memoryStorage(),
    now: () => FIXTURE_NOW,
    timers: timer.timers,
    saveFile,
  })) as App;
  await app.open();
  const saved = () => (saveFile as ReturnType<typeof vi.fn>).mock.calls as unknown as Array<[ReportFile, Node]>;
  return { app, root: app.root, timer, saveFile, saved };
}

const button = (root: Element, label: string) =>
  [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === label) as HTMLButtonElement;
const byLabel = (root: Element, label: string) =>
  root.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`) as HTMLButtonElement;
const exportButton = (root: Element) =>
  root.querySelector<HTMLButtonElement>('.wt-export__button') as HTMLButtonElement;
const exportMenu = (root: Element) => root.querySelector<HTMLElement>('.wt-export__menu') as HTMLElement;
const exportMessage = (root: Element) => root.querySelector<HTMLElement>('.wt-export__message') as HTMLElement;
const format = (root: Element, name: 'csv' | 'xlsx') =>
  root.querySelector<HTMLButtonElement>(`.wt-export__item[data-format="${name}"]`) as HTMLButtonElement;
const rowKeys = (root: Element) => [...root.querySelectorAll('tbody tr a')].map((a) => a.textContent);
const usable = (root: Element) => !exportButton(root).hidden && !exportButton(root).disabled;

function choose(root: Element, name: 'csv' | 'xlsx'): void {
  exportButton(root).click();
  format(root, name).click();
}

/** The lines of a CSV text without the mark and the header. */
const dataLines = (file: ReportFile) => (file.data as string).slice(1).split('\r\n').slice(1, -1);
const firstFields = (file: ReportFile) => dataLines(file).map((line) => line.split(';')[0]);

const key = (target: Element, name: string) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));

beforeEach(() => {
  document.body.innerHTML = '';
  Object.defineProperty(document, 'hidden', { value: false, configurable: true });
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('the exported file', () => {
  it('is made from the rows on screen, for the person and the period on screen, without asking Jira', async () => {
    const gateway = new FakeGateway(todayRoutes());
    const { root, saved } = await mountOpen(gateway);
    const before = gateway.requests.length;

    choose(root, 'csv');
    expect(saved()).toHaveLength(1);
    const [file, host] = saved()[0] as [ReportFile, Node];
    expect(file.name).toBe('Jan_Kowalski_06-11-2026_tempo_report.csv');
    expect(file.mime).toBe('text/csv;charset=utf-8');
    expect(firstFields(file)).toEqual(rowKeys(root));
    expect(dataLines(file).map((line) => line.split(';').at(-1))).toEqual(['6h 55m', '1h 45m', '1h 30m']);
    // The download link is made inside the add-on's own element.
    expect(host).toBe(root);
    expect(gateway.requests).toHaveLength(before);
  });

  it('follows the order on screen', async () => {
    const { root, saved } = await mountOpen(new FakeGateway(todayRoutes()));
    const sum = [...root.querySelectorAll<HTMLButtonElement>('th button')].at(-1) as HTMLButtonElement;
    sum.click();
    choose(root, 'csv');
    expect(firstFields(saved()[0]?.[0] as ReportFile)).toEqual(['AM-10087', 'AM-20012', 'AM-10234']);
    expect(firstFields(saved()[0]?.[0] as ReportFile)).toEqual(rowKeys(root));
  });

  it('is a spreadsheet for the second format, under the same name with another ending', async () => {
    const { root, saved } = await mountOpen(new FakeGateway(todayRoutes()));
    choose(root, 'xlsx');
    choose(root, 'csv');
    const [xlsx, csv] = saved().map(([file]) => file) as [ReportFile, ReportFile];
    expect(xlsx.name).toBe('Jan_Kowalski_06-11-2026_tempo_report.xlsx');
    expect(xlsx.mime).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(Array.from((xlsx.data as Uint8Array).slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    // FR-019: the two names differ only in their ending.
    expect(xlsx.name.replace(/\.xlsx$/, '')).toBe(csv.name.replace(/\.csv$/, ''));
  });

  it('carries the name of another person, without Polish letters in the file name', async () => {
    const gateway = new FakeGateway([...todayRoutes(), { path: USER_SEARCH, reply: { json: [JOZEF] } }]);
    const { root, saved } = await mountOpen(gateway);
    byLabel(root, 'Ustawienia').click();
    const other = [...root.querySelectorAll<HTMLInputElement>('input[type="radio"]')][1] as HTMLInputElement;
    other.checked = true;
    other.dispatchEvent(new Event('change', { bubbles: true }));
    const field = root.querySelector<HTMLInputElement>('#wt-person-name') as HTMLInputElement;
    field.value = 'Józef Śliwiński';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    button(root, 'Zapisz').click();
    await flush(80);
    expect(root.querySelector('.wt-person')?.textContent).toBe('Józef Śliwiński');

    choose(root, 'csv');
    const file = saved()[0]?.[0] as ReportFile;
    expect(file.name).toBe('Jozef_Sliwinski_06-11-2026_tempo_report.csv');
    expect(firstFields(file)).toEqual(rowKeys(root));
  });

  it('names the range and dates the entries in a longer period', async () => {
    const { root, saved } = await mountOpen(new FakeGateway(todayRoutes()));
    button(root, 'Tydzień').click();
    await flush(80);
    choose(root, 'csv');
    const file = saved()[0]?.[0] as ReportFile;
    expect(file.name).toBe('Jan_Kowalski_02-11-2026_08-11-2026_tempo_report.csv');
    expect(file.data as string).toContain('06-11 07:00–10:30 · 3h 30m');
  });
});

describe('when the control can be used', () => {
  it('is not there for an empty period', async () => {
    const { root } = await mountOpen(new FakeGateway([{ path: SEARCH, reply: { json: empty } }]));
    expect(exportButton(root).hidden).toBe(true);
    // Its place in the total row is kept.
    expect(root.querySelector('.wt-footer .wt-export')).not.toBeNull();
  });

  it('cannot be used while another period loads, and comes back with the rows', async () => {
    const gateway = new FakeGateway(todayRoutes());
    const { root } = await mountOpen(gateway);
    expect(usable(root)).toBe(true);
    exportButton(root).click();
    expect(exportMenu(root).hidden).toBe(false);

    const slow = held();
    gateway.add({ path: SEARCH, reply: slow.reply });
    byLabel(root, 'Poprzedni okres').click();
    await flush();
    // The rows of the day before are still under the spinner: they are not that period's.
    expect([exportButton(root).hidden, exportButton(root).disabled]).toEqual([false, true]);
    expect(exportMenu(root).hidden).toBe(true);

    slow.release({ json: search });
    await flush(80);
    expect(exportButton(root).hidden || usable(root)).toBe(true);
  });

  it('exports the rows that stay on screen after a refresh failed', async () => {
    const gateway = new FakeGateway(todayRoutes());
    const { root, saved } = await mountOpen(gateway);
    gateway.add({ path: SEARCH, reply: { status: 500 } });
    button(root, 'Odśwież').click();
    await flush(80);
    expect(root.querySelector('.wt-message--error')).not.toBeNull();
    expect(rowKeys(root)).toHaveLength(3);
    expect(usable(root)).toBe(true);

    choose(root, 'csv');
    expect(firstFields(saved()[0]?.[0] as ReportFile)).toEqual(['AM-10234', 'AM-20012', 'AM-10087']);
  });

  it('is gone after a change of person until that person has rows on screen', async () => {
    const gateway = new FakeGateway([...todayRoutes(), { path: USER_SEARCH, reply: { json: [JOZEF] } }]);
    const { root } = await mountOpen(gateway);
    const slow = held();
    byLabel(root, 'Ustawienia').click();
    const other = [...root.querySelectorAll<HTMLInputElement>('input[type="radio"]')][1] as HTMLInputElement;
    other.checked = true;
    other.dispatchEvent(new Event('change', { bubbles: true }));
    const field = root.querySelector<HTMLInputElement>('#wt-person-name') as HTMLInputElement;
    field.value = 'Józef Śliwiński';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    gateway.add({ path: SEARCH, reply: slow.reply });
    button(root, 'Zapisz').click();
    await flush(80);
    expect(rowKeys(root)).toEqual([]);
    expect(exportButton(root).hidden).toBe(true);

    slow.release({ json: search });
    await flush(80);
    expect(rowKeys(root)).toEqual(['AM-10234']);
    expect(usable(root)).toBe(true);
  });

  it('can be used at once for a view shown from what is already loaded', async () => {
    const gateway = new FakeGateway(todayRoutes());
    const { root, saved } = await mountOpen(gateway);
    button(root, 'Tydzień').click();
    await flush(80);
    const weekRows = rowKeys(root);
    const requests = gateway.requests.length;

    // The current day lies inside the loaded week: no request, no loading state.
    button(root, 'Dzień').click();
    expect(gateway.requests).toHaveLength(requests);
    expect(usable(root)).toBe(true);
    choose(root, 'csv');
    expect(saved()[0]?.[0].name).toBe('Jan_Kowalski_06-11-2026_tempo_report.csv');
    expect(firstFields(saved()[0]?.[0] as ReportFile)).toEqual(rowKeys(root));

    // Back to the week, as it was shown.
    byLabel(root, 'Cofnij').click();
    expect(gateway.requests).toHaveLength(requests);
    expect(usable(root)).toBe(true);
    choose(root, 'csv');
    expect(saved()[1]?.[0].name).toBe('Jan_Kowalski_02-11-2026_08-11-2026_tempo_report.csv');
    expect(firstFields(saved()[1]?.[0] as ReportFile)).toEqual(weekRows);
  });

  it('says so when the file could not be saved, and lets the user try again', async () => {
    const saveFile = vi.fn(() => {
      throw new Error('blocked');
    });
    const { root } = await mountOpen(new FakeGateway(todayRoutes()), saveFile);
    choose(root, 'csv');
    expect(exportMessage(root).textContent).toBe('Nie udało się utworzyć pliku.');
    expect(rowKeys(root)).toHaveLength(3);
    expect(usable(root)).toBe(true);

    exportButton(root).click();
    expect(exportMessage(root).textContent).toBe('');
    expect(exportMenu(root).hidden).toBe(false);
  });
});

describe('the menu and the panel', () => {
  it('closes on Escape before the panel does', async () => {
    const { app, root } = await mountOpen(new FakeGateway(todayRoutes()));
    exportButton(root).click();
    key(format(root, 'csv'), 'Escape');
    expect(exportMenu(root).hidden).toBe(true);
    expect(app.isOpen()).toBe(true);
    expect(document.activeElement).toBe(exportButton(root));

    key(exportButton(root), 'Escape');
    expect(app.isOpen()).toBe(false);
  });

  it('closes when the panel is minimised or closed', async () => {
    const { app, root, saved } = await mountOpen(new FakeGateway(todayRoutes()));
    exportButton(root).click();
    byLabel(root, 'Minimalizuj').click();
    expect(exportMenu(root).hidden).toBe(true);

    await app.open();
    await flush(80);
    exportButton(root).click();
    byLabel(root, 'Zamknij').click();
    expect(exportMenu(root).hidden).toBe(true);
    expect(saved()).toHaveLength(0);
  });
});

describe('the focus when the control loses its use', () => {
  it('goes to "Odśwież" on the first view, and stays there when the rows are back', async () => {
    const { root, timer } = await mountOpen(new FakeGateway(todayRoutes()));
    const refresh = button(root, 'Odśwież');
    exportButton(root).focus();

    // An automatic refresh starts.
    timer.fireAll();
    expect(exportButton(root).disabled).toBe(true);
    expect(document.activeElement).toBe(refresh);
    expect(refresh.getAttribute('aria-disabled')).toBe('true');

    await flush(80);
    expect(usable(root)).toBe(true);
    expect(document.activeElement).toBe(refresh);
    expect(refresh.hasAttribute('aria-disabled')).toBe(false);
  });

  it('goes to "Cofnij" once there is a view to go back to', async () => {
    const { root, timer } = await mountOpen(new FakeGateway(todayRoutes()));
    button(root, 'Tydzień').click();
    await flush(80);
    expect(byLabel(root, 'Cofnij').disabled).toBe(false);

    exportButton(root).click();
    expect(document.activeElement).toBe(format(root, 'csv'));
    timer.fireAll();
    expect(document.activeElement).toBe(byLabel(root, 'Cofnij'));
    expect(exportMenu(root).hidden).toBe(true);
  });

  it('does not move when it is somewhere else', async () => {
    const { root, timer } = await mountOpen(new FakeGateway(todayRoutes()));
    const from = root.querySelector<HTMLInputElement>('#wt-from') as HTMLInputElement;
    from.focus();
    timer.fireAll();
    expect(document.activeElement).toBe(from);
    await flush(80);
    expect(document.activeElement).toBe(from);
  });
});
