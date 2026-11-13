// Title line with the total, and the action buttons: back, forward, refresh, settings,
// minimise, close (FR-012, FR-013, FR-029, FR-031, FR-041, FR-082, FR-086).
import { formatDuration, formatTitle } from '../domain/format';
import type { Period } from '../domain/period';
import type { PeriodSummary } from '../domain/summary';
import { pl } from '../i18n/pl';
import { applyTotal, el, icon } from './dom';

export interface HeaderOptions {
  onBack(): void;
  onForward(): void;
  onRefresh(): void;
  onSettings(): void;
  /** Hide the panel and keep everything as it is, like a click on the launcher (FR-086). */
  onMinimise(): void;
  onClose(): void;
}

export interface Header {
  element: HTMLElement;
  settingsButton: HTMLButtonElement;
  /** A null summary: the period is still loading, so its total is not known yet. */
  update(period: Period, summary: PeriodSummary | null): void;
  /** Disables the refresh button and shows the loading indication while a load runs. */
  setBusy(busy: boolean): void;
  /** Which of the back and forward buttons have somewhere to go (FR-082). */
  setHistory(canGoBack: boolean, canGoForward: boolean): void;
  /** Moves the keyboard focus into the panel when it opens. */
  focus(): void;
}

/** Shown in place of the total while a newly selected period is loading. */
const PENDING = '…';

export function createHeader(options: HeaderOptions): Header {
  const titleText = el('span', { class: 'wt-title__text' });
  const total = el('span', { class: 'wt-total' });
  const title = el('h1', { class: 'wt-title' }, [
    titleText,
    el('span', { class: 'wt-title__sep', text: ' · ' }),
    total,
  ]);

  const historyButton = (name: 'undo' | 'redo', label: string, onClick: () => void): HTMLButtonElement => {
    const button = el(
      'button',
      {
        class: 'wt-button wt-button--icon wt-button--history',
        attrs: { type: 'button', 'aria-label': label, disabled: true },
        on: { click: onClick },
      },
      [icon(name)],
    );
    button.title = label;
    return button;
  };
  const backButton = historyButton('undo', pl.back, () => options.onBack());
  const forwardButton = historyButton('redo', pl.forward, () => options.onForward());

  const refreshButton = el(
    'button',
    { class: 'wt-button', attrs: { type: 'button' }, on: { click: () => options.onRefresh() } },
    [icon('refresh'), el('span', { text: pl.refresh })],
  );
  const settingsButton = el(
    'button',
    {
      class: 'wt-button wt-button--icon',
      attrs: { type: 'button', 'aria-label': pl.settings, 'aria-haspopup': 'dialog', 'aria-expanded': 'false' },
      on: { click: () => options.onSettings() },
    },
    [icon('gear')],
  );
  const minimiseButton = el(
    'button',
    {
      class: 'wt-button wt-button--icon',
      attrs: { type: 'button', 'aria-label': pl.minimise },
      on: { click: () => options.onMinimise() },
    },
    [icon('minimise')],
  );
  minimiseButton.title = pl.minimise;
  const closeButton = el(
    'button',
    {
      class: 'wt-button wt-button--icon',
      attrs: { type: 'button', 'aria-label': pl.close },
      on: { click: () => options.onClose() },
    },
    [icon('close')],
  );

  const element = el('header', { class: 'wt-header' }, [
    el('div', { class: 'wt-header__text' }, [title]),
    el('div', { class: 'wt-header__actions' }, [
      backButton,
      forwardButton,
      refreshButton,
      settingsButton,
      minimiseButton,
      closeButton,
    ]),
  ]);

  return {
    element,
    settingsButton,
    update(period, summary) {
      titleText.textContent = formatTitle(period);
      total.textContent = summary ? formatDuration(summary.totalSeconds) : PENDING;
      applyTotal(total, summary);
    },
    focus() {
      closeButton.focus();
    },
    setHistory(canGoBack, canGoForward) {
      // A button that is switched off under the keyboard would lose the focus to the page.
      const focused = [backButton, forwardButton].find(
        (button) => button === (button.getRootNode() as Document | ShadowRoot).activeElement,
      );
      backButton.disabled = !canGoBack;
      forwardButton.disabled = !canGoForward;
      if (focused?.disabled) (focused === backButton ? forwardButton : backButton).focus();
    },
    setBusy(busy) {
      refreshButton.disabled = busy;
      refreshButton.classList.toggle('wt-button--busy', busy);
      refreshButton.setAttribute('aria-busy', String(busy));
    },
  };
}
