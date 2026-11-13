// The small button that stays on every Jira page: the total of the period the panel is on
// (today until the user selects another one), in the progress colour. Activating it opens
// the panel (FR-040). The user can drag it anywhere in the window (FR-072). While the time
// of another person is shown, their name stands before the label (002 FR-033).
import { formatDuration, formatLauncherLabel } from '../domain/format';
import type { Period } from '../domain/period';
import type { LauncherPosition } from '../domain/settings';
import type { PeriodSummary } from '../domain/summary';
import { pl } from '../i18n/pl';
import { applyTotal, el } from './dom';

export interface LauncherOptions {
  onToggle(): void;
  /**
   * The user is moving the launcher to this place. `done` is true once it has been let go:
   * that is the place to remember.
   */
  onMove(position: LauncherPosition, done: boolean): void;
}

export interface Launcher {
  element: HTMLButtonElement;
  /**
   * The name of another person, before the label; null for the signed-in user, whose
   * launcher carries no name (002 FR-033).
   */
  setPerson(name: string | null): void;
  /** The total of the period is not known yet: never the total of somebody else (002 FR-041). */
  showPending(period: Period): void;
  /** Shows the total of the period, coloured like the progress bar, with the period's label. */
  show(summary: PeriodSummary, period: Period): void;
  /** The total could not be read; the panel explains why when it is opened. */
  showError(period: Period): void;
  /** Reflects whether the panel is open. */
  setExpanded(expanded: boolean): void;
}

/** Shown in place of the total before the first load and after a failed one. */
const NO_VALUE = '–';
/** Stands between the name of another person and the label. */
const SEPARATOR = '·';
/** A press that travels less than this is a click, not a drag. */
const DRAG_THRESHOLD = 4;
/** One press of Shift + an arrow key. */
const KEY_STEP = 16;
/** The room kept between the launcher and the window edge. */
export const LAUNCHER_MARGIN = 4;

/**
 * The launcher stands in its default corner and has grown out of the window (a long name
 * in a narrow window): the nearest place wholly inside it. Null when it fits, and on a
 * page without layout.
 */
export function fitLauncher(element: HTMLElement): LauncherPosition | null {
  const view = element.ownerDocument.documentElement;
  if (view.clientWidth <= 0 || view.clientHeight <= 0) return null;
  const now = currentPosition(element);
  const inside = clampLauncher(now, element);
  return inside.right === Math.round(now.right) && inside.bottom === Math.round(now.bottom) ? null : inside;
}

/** Keeps the whole launcher inside the window. */
export function clampLauncher(position: LauncherPosition, element: HTMLElement): LauncherPosition {
  const view = element.ownerDocument.documentElement;
  const box = element.getBoundingClientRect();
  const limit = (value: number, room: number): number =>
    Math.round(Math.max(LAUNCHER_MARGIN, Math.min(value, room - LAUNCHER_MARGIN)));
  return {
    // A page without layout reports no size: then only the lower limit applies.
    right: limit(position.right, view.clientWidth > 0 ? view.clientWidth - box.width : Infinity),
    bottom: limit(position.bottom, view.clientHeight > 0 ? view.clientHeight - box.height : Infinity),
  };
}

/** Where the launcher stands now, as its distance from the window's right and bottom edges. */
function currentPosition(element: HTMLElement): LauncherPosition {
  const view = element.ownerDocument.documentElement;
  const box = element.getBoundingClientRect();
  return { right: view.clientWidth - box.right, bottom: view.clientHeight - box.bottom };
}

export function createLauncher(options: LauncherOptions): Launcher {
  const total = el('span', { class: 'wt-total', text: NO_VALUE });
  const label = el('span', { class: 'wt-launcher__label', text: `${pl.launcherLabel} ` });
  // Both are empty and hidden for the signed-in user, so the launcher reads as before.
  const person = el('span', { class: 'wt-launcher__person', attrs: { hidden: true } });
  const separator = el('span', { class: 'wt-launcher__sep', attrs: { hidden: true, 'aria-hidden': 'true' } });
  const element = el(
    'button',
    {
      class: 'wt-launcher',
      attrs: { type: 'button', 'aria-expanded': 'false', 'aria-haspopup': 'dialog' },
      on: {
        click: () => {
          // The click that ends a drag is not a request to open the panel.
          if (dragged) dragged = false;
          else options.onToggle();
        },
      },
    },
    [el('span', { class: 'wt-launcher__dot', attrs: { 'aria-hidden': 'true' } }), person, separator, label, total],
  );
  element.setAttribute('aria-description', pl.launcherMove);

  let dragged = false;
  let personName: string | null = null;
  let failed = false;

  /** The tip: why there is no total, else the whole name behind an ellipsis (002 FR-034). */
  function showTip(): void {
    if (failed) element.setAttribute('title', pl.error);
    else if (personName) element.setAttribute('title', personName);
    else element.removeAttribute('title');
  }
  let drag: { pointerId: number; x: number; y: number; start: LauncherPosition; moving: boolean } | null = null;

  const moveTo = (position: LauncherPosition, done: boolean): void =>
    options.onMove(clampLauncher(position, element), done);

  element.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    dragged = false;
    drag = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      start: currentPosition(element),
      moving: false,
    };
    // Captured at once: a fast pointer leaves the launcher before its first move arrives.
    element.setPointerCapture?.(event.pointerId);
  });
  element.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moving) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      drag.moving = true;
      element.classList.add('wt-launcher--dragging');
    }
    moveTo({ right: drag.start.right - dx, bottom: drag.start.bottom - dy }, false);
  });
  const endDrag = (event: PointerEvent): void => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const { moving, start, x, y } = drag;
    drag = null;
    if (!moving) return;
    dragged = event.type === 'pointerup';
    element.classList.remove('wt-launcher--dragging');
    moveTo({ right: start.right - (event.clientX - x), bottom: start.bottom - (event.clientY - y) }, true);
  };
  element.addEventListener('pointerup', endDrag);
  element.addEventListener('pointercancel', endDrag);

  // Without a pointer: Shift and an arrow key move the launcher one step.
  element.addEventListener('keydown', (event) => {
    if (!event.shiftKey) return;
    const steps: Partial<Record<string, [number, number]>> = {
      ArrowLeft: [KEY_STEP, 0],
      ArrowRight: [-KEY_STEP, 0],
      ArrowUp: [0, KEY_STEP],
      ArrowDown: [0, -KEY_STEP],
    };
    const step = steps[event.key];
    if (!step) return;
    const from = currentPosition(element);
    moveTo({ right: from.right + step[0], bottom: from.bottom + step[1] }, true);
    event.preventDefault();
  });

  return {
    element,
    setPerson(name) {
      personName = name;
      // The trailing spaces make the text of the button read as one sentence.
      person.textContent = name ? `${name} ` : '';
      separator.textContent = name ? `${SEPARATOR} ` : '';
      person.hidden = !name;
      separator.hidden = !name;
      showTip();
    },
    showPending(period) {
      label.textContent = `${formatLauncherLabel(period)} `;
      total.textContent = NO_VALUE;
      applyTotal(element, null);
      failed = false;
      showTip();
    },
    show(summary, period) {
      label.textContent = `${formatLauncherLabel(period)} `;
      total.textContent = formatDuration(summary.totalSeconds);
      // Set on the button so that the dot and the total share one colour.
      applyTotal(element, summary);
      failed = false;
      showTip();
    },
    showError(period) {
      label.textContent = `${formatLauncherLabel(period)} `;
      total.textContent = NO_VALUE;
      applyTotal(element, null);
      failed = true;
      showTip();
    },
    setExpanded(expanded) {
      element.setAttribute('aria-expanded', String(expanded));
    },
  };
}
