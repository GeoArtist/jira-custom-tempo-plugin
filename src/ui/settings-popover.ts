// Settings: auto-refresh interval and the light / dark switch (FR-031, FR-032, FR-044, FR-046).
import { validateInterval, type Theme, type UserSettings } from '../domain/settings';
import { pl } from '../i18n/pl';
import { el, icon } from './dom';
import { applyTheme } from './theme';

export interface SettingsPopoverOptions {
  /** The gear button: it owns the pop-over and gets the focus back on close. */
  anchor: HTMLElement;
  /** Where Escape is listened for: the add-on's root element. Defaults to the document. */
  scope?: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;
  /** The element that carries the theme: the add-on's root. Defaults to the page. */
  themeTarget?: Element;
  getSettings(): UserSettings;
  /** Applies and stores the settings. Returns false when the browser could not store them. */
  onSave(settings: UserSettings): boolean;
}

export interface SettingsPopover {
  element: HTMLElement;
  isOpen(): boolean;
  open(): void;
  /** Closes without saving and restores the theme that was active on open. */
  cancel(): void;
  toggle(): void;
}

export function createSettingsPopover(options: SettingsPopoverOptions): SettingsPopover {
  const interval = el('input', {
    class: 'wt-input wt-input--number',
    attrs: {
      type: 'number',
      id: 'wt-interval',
      min: '0',
      max: '1440',
      step: '1',
      inputmode: 'numeric',
      'aria-describedby': 'wt-interval-hint',
    },
  });
  // The explanation shows when the pointer is over the row (FR-073); screen readers get it
  // as the field's description.
  const intervalRow = el('div', { class: 'wt-popover__row' }, [
    el('label', { text: pl.intervalLabel, attrs: { for: 'wt-interval' } }),
    interval,
    el('span', { text: pl.intervalUnit }),
    el('span', { class: 'wt-visually-hidden', text: pl.intervalHint, attrs: { id: 'wt-interval-hint' } }),
  ]);
  intervalRow.title = pl.intervalHint;
  const intervalError = el('p', { class: 'wt-field-error', attrs: { role: 'alert', hidden: true } });
  // Sun on the left, moon on the right; the knob slides under the active one.
  const themeSwitch = el(
    'button',
    { class: 'wt-switch', attrs: { type: 'button', role: 'switch', id: 'wt-theme', 'aria-checked': 'true' } },
    [
      el('span', { class: 'wt-switch__knob' }),
      el('span', { class: 'wt-switch__icon wt-switch__icon--sun' }, [icon('sun')]),
      el('span', { class: 'wt-switch__icon wt-switch__icon--moon' }, [icon('moon')]),
    ],
  );
  const notice = el('p', { class: 'wt-field-error', attrs: { role: 'alert', hidden: true } });

  const element = el(
    'div',
    { class: 'wt-popover', attrs: { role: 'dialog', 'aria-labelledby': 'wt-settings-title', hidden: true } },
    [
      el('h2', { class: 'wt-popover__title', text: pl.settings, attrs: { id: 'wt-settings-title' } }),
      el('hr', { class: 'wt-divider' }),
      intervalRow,
      intervalError,
      el('div', { class: 'wt-popover__row' }, [
        el('label', { text: pl.darkMode, attrs: { for: 'wt-theme' } }),
        themeSwitch,
      ]),
      notice,
      el('div', { class: 'wt-popover__actions' }, [
        el('button', { class: 'wt-button', text: pl.cancel, attrs: { type: 'button' }, on: { click: () => cancel() } }),
        el('button', {
          class: 'wt-button wt-button--primary',
          text: pl.save,
          attrs: { type: 'button' },
          on: { click: () => save() },
        }),
      ]),
    ],
  );

  const scope = options.scope ?? document;
  const themeTarget = options.themeTarget ?? document.documentElement;

  /** The theme to return to when the pop-over is closed without saving. */
  let themeOnOpen: Theme = 'dark';
  let previewTheme: Theme = 'dark';

  function showTheme(theme: Theme): void {
    previewTheme = theme;
    themeSwitch.setAttribute('aria-checked', String(theme === 'dark'));
    // The switch previews at once; only "Zapisz" keeps the choice (FR-046).
    applyTheme(theme, themeTarget);
  }

  function close(): void {
    element.hidden = true;
    options.anchor.setAttribute('aria-expanded', 'false');
    scope.removeEventListener('keydown', onKeydown as EventListener);
    document.removeEventListener('pointerdown', onPointerDown);
    options.anchor.focus();
  }

  function cancel(): void {
    if (element.hidden) return;
    applyTheme(themeOnOpen, themeTarget);
    close();
  }

  function save(): void {
    const refreshMinutes = validateInterval(interval.value);
    if (refreshMinutes === null) {
      intervalError.textContent = pl.intervalInvalid;
      intervalError.hidden = false;
      interval.focus();
      return;
    }
    const stored = options.onSave({ ...options.getSettings(), refreshMinutes, theme: previewTheme });
    if (!stored) {
      // The new values stay in effect for this session; tell the user they will not last.
      themeOnOpen = previewTheme;
      notice.textContent = pl.settingsNotSaved;
      notice.hidden = false;
      return;
    }
    close();
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') cancel();
  }

  function onPointerDown(event: Event): void {
    // Inside a shadow root the document only sees the host as the target; the composed
    // path still lists the real elements.
    const path = event.composedPath();
    const target = event.target as Node | null;
    const inside = (node: Node): boolean => path.includes(node) || (target !== null && node.contains(target));
    if (inside(element) || inside(options.anchor)) return;
    cancel();
  }

  function open(): void {
    const settings = options.getSettings();
    themeOnOpen = settings.theme;
    interval.value = String(settings.refreshMinutes);
    intervalError.hidden = true;
    notice.hidden = true;
    showTheme(settings.theme);
    element.hidden = false;
    options.anchor.setAttribute('aria-expanded', 'true');
    scope.addEventListener('keydown', onKeydown as EventListener);
    document.addEventListener('pointerdown', onPointerDown);
    interval.focus();
  }

  themeSwitch.addEventListener('click', () => showTheme(previewTheme === 'dark' ? 'light' : 'dark'));

  return {
    element,
    isOpen: () => !element.hidden,
    open,
    cancel,
    toggle: () => (element.hidden ? open() : cancel()),
  };
}
