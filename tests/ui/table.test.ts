import { describe, expect, it, vi } from 'vite-plus/test';
import { presetPeriod } from '../../src/domain/period';
import { summarise } from '../../src/domain/summary';
import { buildRows } from '../../src/domain/worklog';
import { createTable, sortRows, type ShownView, type TableOptions } from '../../src/ui/table';
import { fakeSession, FIXTURE_NOW } from '../fake-gateway';
import search from '../fixtures/search-today.json';
import worklogs10001 from '../fixtures/worklogs-10001.json';
import worklogs10002 from '../fixtures/worklogs-10002.json';
import worklogs10003 from '../fixtures/worklogs-10003.json';

const TZ = fakeSession.timeZone;
const worklogs = [...worklogs10001.worklogs, ...worklogs10002.worklogs, ...worklogs10003.worklogs];
const today = presetPeriod('today', TZ, FIXTURE_NOW);
const week = presetPeriod('thisWeek', TZ, FIXTURE_NOW);
const todayRows = buildRows(search.issues, worklogs, fakeSession, today);

function build(options: TableOptions = {}) {
  const table = createTable(options);
  return { table, root: table.element };
}

/** The parts of the export control in the total row. */
function exportParts(root: HTMLElement) {
  const button = root.querySelector<HTMLButtonElement>('.wt-export__button') as HTMLButtonElement;
  const menu = root.querySelector<HTMLElement>('.wt-export__menu') as HTMLElement;
  const [csv, xlsx] = [...menu.querySelectorAll<HTMLButtonElement>('button')] as [HTMLButtonElement, HTMLButtonElement];
  const message = root.querySelector<HTMLElement>('.wt-export__message') as HTMLElement;
  return { button, menu, csv, xlsx, message };
}

const cells = (row: Element) => [...row.querySelectorAll('td')].map((cell) => cell.textContent);

describe('table', () => {
  it('has the four Polish column headers', () => {
    const { root } = build();
    expect([...root.querySelectorAll('th')].map((th) => th.textContent)).toEqual([
      'Zgłoszenie',
      'Tytuł',
      'Czas wpisów',
      'Suma',
    ]);
  });

  it('renders exactly one row per ticket with its sum', () => {
    const { table, root } = build();
    table.render(todayRows, today, TZ, summarise(todayRows, today));
    const rows = [...root.querySelectorAll('tbody tr')];
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => cells(row)[0])).toEqual(['AM-10234', 'AM-20012', 'AM-10087']);
    expect(rows.map((row) => cells(row)[3])).toEqual(['6h 55m', '1h 45m', '1h 30m']);
  });

  it('puts several entries of a ticket on separate lines inside one cell', () => {
    const { table, root } = build();
    table.render(todayRows, today, TZ, summarise(todayRows, today));
    const first = root.querySelector('tbody tr') as Element;
    expect([...first.querySelectorAll('.wt-entries li')].map((li) => li.textContent)).toEqual([
      '07:00–10:30 · 3h 30m',
      '13:00–14:00 · 1h 00m',
      '15:05–17:30 · 2h 25m',
    ]);
  });

  it('shows the date of each entry in a period longer than one day', () => {
    const { table, root } = build();
    const rows = buildRows(search.issues, worklogs, fakeSession, week);
    table.render(rows, week, TZ, summarise(rows, week));
    const lines = [...root.querySelectorAll('.wt-entries li')].map((li) => li.textContent);
    expect(lines).toContain('05-11 10:00–11:00 · 1h 00m');
    expect(lines).toContain('06-11 07:00–10:30 · 3h 30m');
  });

  it('links the ticket number to its Jira page in a new tab', () => {
    const { table, root } = build();
    table.render(todayRows, today, TZ, summarise(todayRows, today));
    const link = root.querySelector<HTMLAnchorElement>('a.wt-key') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('https://example.atlassian.net/browse/AM-10234');
    expect(link.target).toBe('_blank');
    expect(link.rel).toContain('noopener');
  });

  it('shows the total under the table, equal to the sum of the rows, in the bar colour', () => {
    const { table, root } = build();
    table.render(todayRows, today, TZ, summarise(todayRows, today));
    expect(root.querySelector('.wt-footer__label')?.textContent).toBe('Suma czasu:');
    expect(root.querySelector('.wt-footer__value')?.textContent).toBe('10h 10m');
    const total = root.querySelector<HTMLElement>('.wt-footer__value') as HTMLElement;
    expect(total.style.getPropertyValue('--wt-total-from')).toBe('var(--wt-tone-yellow)');
    // The label has the colour of the value.
    const label = root.querySelector<HTMLElement>('.wt-footer__label') as HTMLElement;
    expect(label.style.getPropertyValue('--wt-total-from')).toBe('var(--wt-tone-yellow)');
    expect(label.getAttribute('data-tone')).toBe(total.getAttribute('data-tone'));
  });

  it('shows the empty state with a zero total', () => {
    const { table, root } = build();
    table.render([], today, TZ, summarise([], today));
    expect(root.querySelector('.wt-message')?.textContent).toBe('Brak wpisów czasu w wybranym okresie.');
    expect(root.querySelector('.wt-footer__value')?.textContent).toBe('0h 00m');
    expect(root.querySelectorAll('tbody tr')).toHaveLength(0);
  });

  it('shows a spinner over the table while loading and keeps the loaded rows', () => {
    const { table, root } = build();
    const spinner = root.querySelector<HTMLElement>('.wt-loading') as HTMLElement;
    expect(spinner.hidden).toBe(true);

    table.render(todayRows, today, TZ, summarise(todayRows, today));
    table.showLoading();
    expect(spinner.hidden).toBe(false);
    expect(spinner.textContent).toBe('Ładowanie…');
    expect(spinner.parentElement?.classList.contains('wt-table-area')).toBe(true);
    expect(root.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(root.querySelector('.wt-footer__value')?.textContent).toBe('10h 10m');

    table.render(todayRows, today, TZ, summarise(todayRows, today));
    expect(spinner.hidden).toBe(true);
  });

  it('sorts by each column, ascending first and descending on the second click', () => {
    const { table, root } = build();
    table.render(todayRows, today, TZ, summarise(todayRows, today));
    const keys = () => [...root.querySelectorAll('tbody tr a')].map((a) => a.textContent);
    const header = (name: string) =>
      [...root.querySelectorAll<HTMLTableCellElement>('th')].find((th) => th.textContent === name) as HTMLElement;
    const sort = (name: string) => header(name).querySelector('button')?.click();

    // As loaded: by the start of the earliest entry.
    expect(header('Czas wpisów').getAttribute('aria-sort')).toBe('ascending');
    expect(header('Suma').getAttribute('aria-sort')).toBe('none');
    expect(keys()).toEqual(['AM-10234', 'AM-20012', 'AM-10087']);

    sort('Zgłoszenie');
    expect(keys()).toEqual(['AM-10087', 'AM-10234', 'AM-20012']);
    expect(header('Zgłoszenie').getAttribute('aria-sort')).toBe('ascending');
    expect(header('Czas wpisów').getAttribute('aria-sort')).toBe('none');
    sort('Zgłoszenie');
    expect(keys()).toEqual(['AM-20012', 'AM-10234', 'AM-10087']);
    expect(header('Zgłoszenie').getAttribute('aria-sort')).toBe('descending');

    sort('Suma');
    expect(keys()).toEqual(['AM-10087', 'AM-20012', 'AM-10234']);
    sort('Suma');
    expect(keys()).toEqual(['AM-10234', 'AM-20012', 'AM-10087']);

    sort('Tytuł');
    const titles = [...root.querySelectorAll('tbody td.wt-col-title')].map((td) => td.textContent ?? '');
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b, 'pl', { sensitivity: 'base' })));

    sort('Czas wpisów');
    sort('Czas wpisów');
    expect(keys()).toEqual(['AM-10087', 'AM-20012', 'AM-10234']);
  });

  it('keeps the chosen order when new data arrives', () => {
    const { table, root } = build();
    table.render(todayRows, today, TZ, summarise(todayRows, today));
    root.querySelector<HTMLButtonElement>('th.wt-col-sum button')?.click();
    table.render(todayRows, today, TZ, summarise(todayRows, today));
    expect([...root.querySelectorAll('tbody tr a')].map((a) => a.textContent)).toEqual([
      'AM-10087',
      'AM-20012',
      'AM-10234',
    ]);
  });

  it('sorts ticket numbers as numbers', () => {
    const row = (key: string) => ({
      ...(todayRows[0] as (typeof todayRows)[number]),
      ticket: { id: key, key, title: key, url: key },
    });
    const sorted = sortRows([row('AM-10'), row('AB-200'), row('AM-9')], 'ticket', 'ascending');
    expect(sorted.map((r) => r.ticket.key)).toEqual(['AB-200', 'AM-9', 'AM-10']);
  });

  it('shows the error with a retry action and can keep the last rows', () => {
    const { table, root } = build();
    const onRetry = vi.fn();
    table.render(todayRows, today, TZ, summarise(todayRows, today));
    table.showError(onRetry, true);
    expect(root.querySelector('.wt-message p')?.textContent).toBe('Nie udało się pobrać danych z Jiry.');
    expect(root.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(root.querySelector('.wt-footer__value')?.textContent).toBe('10h 10m');
    root.querySelector<HTMLButtonElement>('.wt-message button')?.click();
    expect(onRetry).toHaveBeenCalledOnce();

    table.showError(onRetry, false);
    expect(root.querySelectorAll('tbody tr')).toHaveLength(0);
  });
});

describe('export control in the total row', () => {
  const summary = summarise(todayRows, today);
  const sumHeader = (root: HTMLElement) =>
    [...root.querySelectorAll<HTMLButtonElement>('th button')].at(-1) as HTMLButtonElement;
  const exported = (onExport: ReturnType<typeof vi.fn>, call: number) =>
    onExport.mock.calls[call] as unknown as [string, ShownView];

  it('stands in the total row before the total, in every state', () => {
    const { table, root } = build();
    const footer = root.querySelector('.wt-footer') as HTMLElement;
    const place = () => [...footer.children].map((child) => child.className.split(' ')[0]);
    expect(place()).toEqual(['wt-export', 'wt-footer__label', 'wt-footer__value']);
    table.render(todayRows, today, TZ, summary);
    table.showLoading();
    table.clear();
    expect(place()).toEqual(['wt-export', 'wt-footer__label', 'wt-footer__value']);
  });

  it('is there only while the table shows rows', () => {
    const { table, root } = build();
    const { button } = exportParts(root);
    // Before the first load.
    expect(button.hidden).toBe(true);
    table.showLoading();
    expect(button.hidden).toBe(true);

    table.render(todayRows, today, TZ, summary);
    expect([button.hidden, button.disabled]).toEqual([false, false]);

    // An empty period.
    table.render([], today, TZ, summarise([], today));
    expect(button.hidden).toBe(true);
  });

  it('hands out the rows in the order on screen, with their period and total', () => {
    const onExport = vi.fn();
    const { table, root } = build({ onExport });
    const { button, csv, xlsx } = exportParts(root);
    table.render(todayRows, today, TZ, summary);

    button.click();
    csv.click();
    expect(onExport).toHaveBeenCalledOnce();
    const [format, view] = exported(onExport, 0);
    expect(format).toBe('csv');
    expect(view.rows.map((row) => row.ticket.key)).toEqual(['AM-10234', 'AM-20012', 'AM-10087']);
    expect([view.period, view.timeZone, view.summary]).toEqual([today, TZ, summary]);

    // Sorted by "Suma", ascending and then descending: the file follows the screen.
    sumHeader(root).click();
    button.click();
    xlsx.click();
    const [nextFormat, ascending] = exported(onExport, 1);
    expect(nextFormat).toBe('xlsx');
    expect(ascending.rows.map((row) => row.ticket.key)).toEqual(['AM-10087', 'AM-20012', 'AM-10234']);

    sumHeader(root).click();
    button.click();
    csv.click();
    expect(exported(onExport, 2)[1].rows.map((row) => row.totalSeconds)).toEqual([24900, 6300, 5400]);
  });

  it('cannot be used while a load covers the rows, and its menu closes', () => {
    const { table, root } = build();
    const { button, menu } = exportParts(root);
    table.render(todayRows, today, TZ, summary);
    button.click();
    expect(menu.hidden).toBe(false);

    table.showLoading();
    expect([button.hidden, button.disabled, menu.hidden]).toEqual([false, true, true]);

    table.render(todayRows, today, TZ, summary);
    expect([button.hidden, button.disabled]).toEqual([false, false]);
  });

  it('goes when the table is emptied or a load fails without rows', () => {
    const { table, root } = build();
    const { button } = exportParts(root);
    table.render(todayRows, today, TZ, summary);
    table.clear();
    expect(button.hidden).toBe(true);

    table.render(todayRows, today, TZ, summary);
    table.showLoading();
    table.showError(() => {}, false);
    expect(button.hidden).toBe(true);
  });

  it('exports the rows that stay on screen after a failed refresh', () => {
    const onExport = vi.fn();
    const { table, root } = build({ onExport });
    const { button, csv } = exportParts(root);
    table.render(todayRows, today, TZ, summary);
    table.showLoading();
    table.showError(() => {}, true);
    expect([button.hidden, button.disabled]).toEqual([false, false]);
    button.click();
    csv.click();
    expect(exported(onExport, 0)[1].rows).toHaveLength(3);
  });

  it('leaves an open menu and a shown message alone when the order changes', () => {
    const onExport = vi.fn(() => {
      throw new Error('no file');
    });
    const { table, root } = build({ onExport });
    const { button, menu, csv, message } = exportParts(root);
    table.render(todayRows, today, TZ, summary);
    button.click();
    csv.click();
    expect(message.textContent).toBe('Nie udało się utworzyć pliku.');
    sumHeader(root).click();
    expect(message.textContent).toBe('Nie udało się utworzyć pliku.');

    button.click();
    sumHeader(root).click();
    expect(menu.hidden).toBe(false);
  });

  it('closes its menu when asked, and says when it lost the focus with its use', () => {
    const onFocusLost = vi.fn();
    const { table, root } = build({ onFocusLost });
    document.body.appendChild(root);
    const { button, menu } = exportParts(root);
    table.render(todayRows, today, TZ, summary);
    button.click();
    table.closeMenu();
    expect(menu.hidden).toBe(true);

    button.focus();
    table.showLoading();
    expect(onFocusLost).toHaveBeenCalledOnce();
    table.render(todayRows, today, TZ, summary);
    button.focus();
    table.clear();
    expect(onFocusLost).toHaveBeenCalledTimes(2);
    root.remove();
  });
});
