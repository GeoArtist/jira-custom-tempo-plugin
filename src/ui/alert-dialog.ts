// A small alert window of the add-on's own, drawn over the settings (002 FR-020). It is
// not a dialog of the browser: the Jira page under the add-on stays usable. While it is
// shown, the content under it is inert, so only "OK" can be reached.
import { pl } from '../i18n/pl';
import { el } from './dom';

export interface AlertDialogOptions {
  /** What the alert covers; it does not react while the alert is shown. */
  under: HTMLElement;
}

export interface AlertDialog {
  element: HTMLElement;
  isOpen(): boolean;
  /** `onClose` runs once, when the user has confirmed the alert. */
  show(text: string, onClose?: () => void): void;
  /** Closes without a confirmation by the user: `onClose` is not called. */
  close(): void;
}

const TEXT_ID = 'wt-alert-text';

export function createAlertDialog(options: AlertDialogOptions): AlertDialog {
  const text = el('p', { class: 'wt-alert__text', attrs: { id: TEXT_ID } });
  const ok = el('button', {
    class: 'wt-button wt-button--primary wt-alert__ok',
    text: pl.ok,
    attrs: { type: 'button' },
    on: { click: () => confirm() },
  });
  const box = el(
    'div',
    {
      class: 'wt-alert__box',
      attrs: { role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': TEXT_ID, 'aria-describedby': TEXT_ID },
    },
    [text, ok],
  );
  // The dimmed layer: a press on it does nothing, the alert has to be confirmed.
  const element = el('div', { class: 'wt-alert', attrs: { hidden: true } }, [box]);

  let onClose: (() => void) | null = null;

  function close(): void {
    if (element.hidden) return;
    element.hidden = true;
    options.under.removeAttribute('inert');
    onClose = null;
  }

  function confirm(): void {
    if (element.hidden) return;
    const done = onClose;
    close();
    done?.();
  }

  element.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' || event.key === 'Enter') {
      // Closes the alert only: what is under it must not see the key (002 FR-047).
      event.preventDefault();
      event.stopPropagation();
      confirm();
    } else if (event.key === 'Tab') {
      // One control: the focus stays on it.
      event.preventDefault();
    }
  });

  return {
    element,
    isOpen: () => !element.hidden,
    show(message, done) {
      text.textContent = message;
      onClose = done ?? null;
      options.under.setAttribute('inert', '');
      element.hidden = false;
      ok.focus();
    },
    close,
  };
}
