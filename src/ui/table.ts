// The table of tickets with sortable columns, its loading / empty / error states, and the
// total row (FR-002 to FR-011, FR-014, FR-037, FR-060 to FR-063).
import { formatDuration, formatEntry } from '../domain/format';
import type { Period } from '../domain/period';
import type { PeriodSummary } from '../domain/summary';
import type { TicketRow } from '../domain/worklog';
import { pl } from '../i18n/pl';
import { applyTotal, clear, el } from './dom';

export interface Table {
  element: HTMLElement;
  render(rows: TicketRow[], period: Period, timeZone: string, summary: PeriodSummary): void;
  /**
   * Removes every row and shows the total as not known yet. Used when the person changes:
   * rows of one person must never stand under the name of another (002 FR-003).
   */
  clear(): void;
  /** A load is running: a spinner covers the table area; what is shown stays (FR-060). */
  showLoading(): void;
  /** The load failed. With `keepRows` the last data stays visible under the message. */
  showError(onRetry: () => void, keepRows: boolean): void;
}

export type SortColumn = 'ticket' | 'title' | 'entries' | 'sum';
type SortDirection = 'ascending' | 'descending';

const COLUMNS: readonly { name: SortColumn; class: string }[] = [
  { name: 'ticket', class: 'wt-col-key' },
  { name: 'title', class: 'wt-col-title' },
  { name: 'entries', class: 'wt-col-entries' },
  { name: 'sum', class: 'wt-col-sum' },
];

/** `AM-9` sorts before `AM-10`: the project part as text, the number as a number. */
function compareKeys(a: string, b: string): number {
  const split = (key: string): [string, number] => {
    const at = key.lastIndexOf('-');
    return [key.slice(0, at), Number(key.slice(at + 1))];
  };
  const [projectA, numberA] = split(a);
  const [projectB, numberB] = split(b);
  return projectA.localeCompare(projectB) || numberA - numberB || a.localeCompare(b);
}

const COMPARATORS: Record<SortColumn, (a: TicketRow, b: TicketRow) => number> = {
  ticket: (a, b) => compareKeys(a.ticket.key, b.ticket.key),
  title: (a, b) => a.ticket.title.localeCompare(b.ticket.title, 'pl', { sensitivity: 'base' }),
  entries: (a, b) => (a.entries[0]?.startedMs ?? 0) - (b.entries[0]?.startedMs ?? 0),
  sum: (a, b) => a.totalSeconds - b.totalSeconds,
};

/** A sorted copy. Rows that compare equal keep the order they were loaded in (FR-009). */
export function sortRows(rows: TicketRow[], column: SortColumn, direction: SortDirection): TicketRow[] {
  const sign = direction === 'ascending' ? 1 : -1;
  return [...rows].sort((a, b) => sign * COMPARATORS[column](a, b));
}

/** Shown in place of the total while it is not known. */
const PENDING = '…';

/** Nothing loaded: a zero total in the muted colour. */
const EMPTY = { totalSeconds: 0, colour: null } as PeriodSummary;

export function createTable(): Table {
  // The order the rows are loaded in (FR-009) is the entries column ascending.
  let sort: { column: SortColumn; direction: SortDirection } = { column: 'entries', direction: 'ascending' };
  let shown: { rows: TicketRow[]; period: Period; timeZone: string } | null = null;

  const headers = new Map<SortColumn, { cell: HTMLTableCellElement; button: HTMLButtonElement }>();
  for (const column of COLUMNS) {
    const button = el('button', {
      class: 'wt-sort',
      text: pl.columns[column.name],
      attrs: { type: 'button' },
      on: { click: () => sortBy(column.name) },
    });
    const cell = el('th', { class: column.class, attrs: { scope: 'col' } }, [button]);
    headers.set(column.name, { cell, button });
  }

  const body = el('tbody');
  const table = el('table', { class: 'wt-table' }, [
    el('thead', {}, [
      el(
        'tr',
        {},
        [...headers.values()].map((header) => header.cell),
      ),
    ]),
    body,
  ]);
  const scroll = el('div', { class: 'wt-table-scroll', attrs: { tabindex: '0' } }, [table]);
  const message = el('div', { class: 'wt-message', attrs: { role: 'status', 'aria-live': 'polite', hidden: true } });
  const spinner = el('div', { class: 'wt-loading', attrs: { role: 'status', hidden: true } }, [
    el('span', { class: 'wt-spinner', attrs: { 'aria-hidden': 'true' } }),
    el('span', { class: 'wt-visually-hidden', text: pl.loading }),
  ]);
  const area = el('div', { class: 'wt-table-area' }, [message, scroll, spinner]);
  const totalLabel = el('span', { class: 'wt-footer__label', text: pl.total });
  const total = el('span', { class: 'wt-footer__value wt-total', text: formatDuration(0) });
  const footer = el('div', { class: 'wt-footer' }, [totalLabel, total]);
  const element = el('section', { class: 'wt-table-wrap' }, [area, footer]);

  function setTotal(summary: PeriodSummary): void {
    total.textContent = formatDuration(summary.totalSeconds);
    // The label takes the colour of the value (FR-062).
    applyTotal(total, summary);
    applyTotal(totalLabel, summary);
  }

  function setMessage(kind: 'empty' | 'error' | null, onRetry?: () => void): void {
    clear(message);
    message.hidden = kind === null;
    message.className = kind ? `wt-message wt-message--${kind}` : 'wt-message';
    if (kind === null) return;
    message.appendChild(el('p', { text: pl[kind] }));
    if (kind === 'error' && onRetry) {
      message.appendChild(
        el('button', { class: 'wt-button', text: pl.retry, attrs: { type: 'button' }, on: { click: () => onRetry() } }),
      );
    }
  }

  function setBusy(busy: boolean): void {
    spinner.hidden = !busy;
    area.setAttribute('aria-busy', String(busy));
  }

  function renderRow(row: TicketRow, period: Period, timeZone: string): HTMLTableRowElement {
    const link = el('a', {
      class: 'wt-key',
      text: row.ticket.key,
      // A plain link: the add-on runs inside the Jira page, so the browser opens it itself.
      attrs: { href: row.ticket.url, target: '_blank', rel: 'noopener noreferrer' },
    });
    // Several entries of one ticket are lines inside one cell, never extra rows (FR-007).
    const entries = el(
      'ul',
      { class: 'wt-entries' },
      row.entries.map((entry) => el('li', { text: formatEntry(entry, period, timeZone) })),
    );
    return el('tr', {}, [
      el('td', { class: 'wt-col-key' }, [link]),
      el('td', { class: 'wt-col-title', text: row.ticket.title }),
      el('td', { class: 'wt-col-entries' }, [entries]),
      el('td', { class: 'wt-col-sum', text: formatDuration(row.totalSeconds) }),
    ]);
  }

  function renderHeaders(): void {
    for (const [name, { cell, button }] of headers) {
      const active = sort.column === name;
      cell.setAttribute('aria-sort', active ? sort.direction : 'none');
      // The hint names what the next click does.
      const next = active && sort.direction === 'ascending' ? pl.sortDescending : pl.sortAscending;
      button.title = `${pl.columns[name]}: ${next}`;
    }
  }

  function renderBody(): void {
    clear(body);
    if (!shown) return;
    for (const row of sortRows(shown.rows, sort.column, sort.direction)) {
      body.appendChild(renderRow(row, shown.period, shown.timeZone));
    }
  }

  function sortBy(column: SortColumn): void {
    const flip = sort.column === column && sort.direction === 'ascending';
    sort = { column, direction: flip ? 'descending' : 'ascending' };
    renderHeaders();
    renderBody();
  }

  renderHeaders();

  return {
    element,
    render(rows, period, timeZone, summary) {
      shown = { rows, period, timeZone };
      renderBody();
      setTotal(summary);
      setBusy(false);
      scroll.hidden = rows.length === 0;
      setMessage(rows.length > 0 ? null : 'empty');
    },
    clear() {
      shown = null;
      renderBody();
      total.textContent = PENDING;
      applyTotal(total, null);
      applyTotal(totalLabel, null);
      scroll.hidden = true;
      setMessage(null);
    },
    showLoading() {
      setBusy(true);
    },
    showError(onRetry, keepRows) {
      if (!keepRows) {
        // The rows on screen belong to another period.
        shown = null;
        renderBody();
        setTotal(EMPTY);
      }
      setBusy(false);
      scroll.hidden = !(keepRows && body.childElementCount > 0);
      setMessage('error', onRetry);
    },
  };
}
