// The control "Eksport" in the total row and its menu of two formats
// (specs/003-table-export/contracts/ui.md; FR-001 to FR-009, FR-030).
import type { ExportFormat } from '../export/index';
import { pl } from '../i18n/pl';
import { el } from './dom';

/**
 * absent: nothing to export, the button is not shown. disabled: a load covers the rows.
 * enabled: the rows on screen can be exported.
 */
export type ExportState = 'absent' | 'disabled' | 'enabled';

export interface ExportMenuOptions {
  /** A format was chosen. May throw: the file could not be made. */
  onChoose(format: ExportFormat): void;
  /** The button lost its use while it, or a format of its menu, had the focus (FR-030). */
  onFocusLost?(): void;
}

export interface ExportMenu {
  element: HTMLElement;
  setState(state: ExportState): void;
  /** Closes the menu without a choice and without moving the focus. */
  close(): void;
}

const MENU_ID = 'wt-export-menu';

export function createExportMenu(options: ExportMenuOptions): ExportMenu {
  let state: ExportState = 'absent';
  /** A file is being made: the button ignores activation but keeps the focus (FR-009). */
  let busy = false;

  const button = el('button', {
    class: 'wt-button wt-export__button',
    text: pl.exportLabel,
    attrs: {
      type: 'button',
      'aria-haspopup': 'menu',
      'aria-expanded': 'false',
      'aria-controls': MENU_ID,
      hidden: true,
    },
  });
  const item = (format: ExportFormat, text: string, label: string): HTMLButtonElement =>
    el('button', {
      class: 'wt-export__item',
      text,
      // Reached with the arrow keys, not with Tab.
      attrs: { type: 'button', role: 'menuitem', 'aria-label': label, 'data-format': format, tabindex: '-1' },
      on: { click: () => choose(format) },
    });
  const items = [
    item('csv', pl.exportCsv, pl.exportCsvLabel),
    item('xlsx', pl.exportXlsx, pl.exportXlsxLabel),
  ] as const;
  const menu = el(
    'div',
    { class: 'wt-export__menu', attrs: { id: MENU_ID, role: 'menu', 'aria-label': pl.exportLabel, hidden: true } },
    [...items],
  );
  const message = el('span', { class: 'wt-export__message', attrs: { role: 'status', 'aria-live': 'polite' } });
  // The menu is placed against the button, not against the whole group.
  const anchor = el('div', { class: 'wt-export__anchor' }, [button, menu]);
  const element = el('div', { class: 'wt-export' }, [anchor, message]);

  const isOpen = (): boolean => !menu.hidden;

  /** True while the button or a format has the keyboard focus, also inside a shadow root. */
  function hasFocus(): boolean {
    const active = (element.getRootNode() as Document | ShadowRoot).activeElement;
    return active !== null && element.contains(active);
  }

  function onPointerDown(event: Event): void {
    // Inside a shadow root the document only sees the host as the target; the composed
    // path still lists the real elements.
    const target = event.target as Node | null;
    if (event.composedPath().includes(element) || (target !== null && element.contains(target))) return;
    close();
  }

  function open(): void {
    if (state !== 'enabled' || busy || isOpen()) return;
    message.textContent = '';
    menu.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', onPointerDown);
    items[0].focus();
  }

  function close(): void {
    if (!isOpen()) return;
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', onPointerDown);
  }

  function toggle(): void {
    if (isOpen()) {
      close();
      button.focus();
    } else {
      open();
    }
  }

  function setBusy(value: boolean): void {
    busy = value;
    for (const [name, text] of [
      ['aria-busy', 'true'],
      // Not `disabled`: the focus must stay on the button.
      ['aria-disabled', 'true'],
      ['aria-label', pl.exportBusy],
    ] as const) {
      if (value) button.setAttribute(name, text);
      else button.removeAttribute(name);
    }
  }

  function choose(format: ExportFormat): void {
    close();
    button.focus();
    setBusy(true);
    try {
      options.onChoose(format);
    } catch {
      message.textContent = pl.exportFailed;
    } finally {
      setBusy(false);
    }
  }

  function move(step: number): void {
    const active = (element.getRootNode() as Document | ShadowRoot).activeElement;
    const at = items.findIndex((candidate) => candidate === active);
    (items[(at + step + items.length) % items.length] as HTMLButtonElement).focus();
  }

  const isActivation = (event: KeyboardEvent): boolean => event.key === 'Enter' || event.key === ' ';

  button.addEventListener('click', () => {
    if (!busy) toggle();
  });
  button.addEventListener('keydown', (event) => {
    if (busy) return;
    if (event.key === 'ArrowDown' && !isOpen()) {
      event.preventDefault();
      open();
    } else if (isActivation(event)) {
      // Handled here, so the browser's own click of these keys must not follow.
      event.preventDefault();
      toggle();
    }
  });
  menu.addEventListener('keydown', (event) => {
    const format = (event.target as HTMLElement).getAttribute('data-format') as ExportFormat | null;
    if (event.key === 'ArrowDown') move(1);
    else if (event.key === 'ArrowUp') move(-1);
    else if (event.key === 'Home') items[0].focus();
    else if (event.key === 'End') items[1].focus();
    else if (isActivation(event) && format) choose(format);
    else if (event.key === 'Tab') {
      // The focus moves on by itself.
      close();
      return;
    } else return;
    event.preventDefault();
  });
  // A space activates a button when the key comes up; both were handled on the way down.
  element.addEventListener('keyup', (event) => {
    if (event.key === ' ') event.preventDefault();
  });
  element.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !isOpen()) return;
    // Innermost first: the menu closes, the panel stays (FR-006).
    event.preventDefault();
    event.stopPropagation();
    close();
    button.focus();
  });

  return {
    element,
    close,
    setState(next) {
      const losesUse = next !== 'enabled' && state === 'enabled';
      // Asked before anything changes: a button that is switched off drops the focus.
      const focused = losesUse && hasFocus();
      if (next !== 'enabled') {
        close();
        message.textContent = '';
      }
      button.hidden = next === 'absent';
      button.disabled = next === 'disabled';
      state = next;
      if (focused) options.onFocusLost?.();
    },
  };
}
