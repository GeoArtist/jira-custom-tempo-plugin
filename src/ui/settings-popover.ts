// Settings: auto-refresh interval and the light / dark switch (FR-031, FR-032, FR-044,
// FR-046), and whose time is shown (specs/002-other-user-worktime/spec.md, FR-011 to FR-049).
import { matchPeople, normaliseName, type NameMatch, type Person, type PersonCandidate } from '../domain/person';
import { validateInterval, type Theme, type UserSettings } from '../domain/settings';
import { pl } from '../i18n/pl';
import { createAlertDialog } from './alert-dialog';
import { clear, el, icon } from './dom';
import { applyTheme } from './theme';

/** Whose time the user asks for: their own, or that of one other person. */
export type PersonChoice = { mode: 'current' } | { mode: 'other'; person: Person };

export interface SettingsPopoverOptions {
  /** The gear button: it owns the pop-over and gets the focus back on close. */
  anchor: HTMLElement;
  /** Where Escape is listened for: the add-on's root element. Defaults to the document. */
  scope?: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;
  /** The element that carries the theme: the add-on's root. Defaults to the page. */
  themeTarget?: Element;
  getSettings(): UserSettings;
  /** Whose time is shown now; the signed-in user when left out. */
  getChoice?(): PersonChoice;
  /**
   * The people Jira returns for a typed name. Rejects when Jira could not be asked. Called
   * on "save" only, never while the user types (002 FR-016).
   */
  findPeople?(text: string, signal: AbortSignal): Promise<PersonCandidate[]>;
  /** One person again, by account ID; null when they cannot be shown any more (002 FR-036). */
  getPerson?(accountId: string, signal: AbortSignal): Promise<Person | null>;
  /** Applies and stores the settings. Returns false when the browser could not store them. */
  onSave(settings: UserSettings, choice: PersonChoice): boolean;
}

export interface SettingsPopover {
  element: HTMLElement;
  isOpen(): boolean;
  open(): void;
  /** Closes without saving and restores the theme that was active on open. */
  cancel(): void;
  toggle(): void;
}

/**
 * The person the text of the name field stands for, so that "save" knows exactly who is
 * meant: the person in effect, the remembered one, or one picked from the list (002 FR-046).
 */
interface NamePick {
  person: Person;
  source: 'effect' | 'remembered' | 'list';
}

type CheckResult = NameMatch | { kind: 'failed' };

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

  // ------------------------------------------------------------ whose time is shown

  const option = (value: 'current' | 'other', text: string) => {
    const input = el('input', {
      class: 'wt-radio__input',
      attrs: { type: 'radio', name: 'wt-person-mode', value },
      on: { change: () => selectMode(value) },
    });
    // The input covers the whole label, so the whole line is the target; the mark is drawn.
    const mark = el('span', { class: 'wt-radio__mark', attrs: { 'aria-hidden': 'true' } });
    return { input, label: el('label', { class: 'wt-radio' }, [input, mark, el('span', { text })]) };
  };
  const current = option('current', pl.personCurrent);
  const other = option('other', pl.personOther);
  const modeGroup = el(
    'div',
    { class: 'wt-popover__group', attrs: { role: 'radiogroup', 'aria-label': pl.personGroup } },
    [current.label, other.label],
  );

  const name = el('input', {
    class: 'wt-input wt-input--name',
    attrs: { type: 'text', id: 'wt-person-name', maxlength: '255', autocomplete: 'off', spellcheck: 'false' },
  });
  const nameRow = el('div', { class: 'wt-popover__row wt-popover__row--person', attrs: { hidden: true } }, [
    el('label', { text: pl.personName, attrs: { for: 'wt-person-name' } }),
    name,
  ]);
  const nameMessage = el('p', { class: 'wt-field-error', attrs: { role: 'alert', hidden: true } });

  const peopleList = el('ul', { class: 'wt-people__list' });
  const peopleMore = el('p', { class: 'wt-people__more', text: pl.personTooMany, attrs: { hidden: true } });
  const people = el(
    'div',
    { class: 'wt-people', attrs: { role: 'group', 'aria-labelledby': 'wt-people-title', hidden: true } },
    [
      el('p', { class: 'wt-people__title', text: pl.personChoose, attrs: { id: 'wt-people-title' } }),
      peopleList,
      peopleMore,
    ],
  );

  const notice = el('p', { class: 'wt-field-error', attrs: { role: 'alert', hidden: true } });

  // Shown only while a check runs: the spinner of the refresh button.
  const saveIcon = icon('refresh');
  saveIcon.setAttribute('hidden', '');
  const saveButton = el(
    'button',
    { class: 'wt-button wt-button--primary', attrs: { type: 'button' }, on: { click: () => save() } },
    [saveIcon, el('span', { text: pl.save })],
  );

  const themeRow = el('div', { class: 'wt-popover__row' }, [
    el('label', { text: pl.darkMode, attrs: { for: 'wt-theme' } }),
    themeSwitch,
  ]);
  const personDivider = el('hr', { class: 'wt-divider' });
  // While the list of people is shown, these step aside so the list has room in a low
  // panel; they keep their values and come back with the list gone (002 FR-030).
  const aside = [intervalRow, themeRow, personDivider, modeGroup];

  // Everything of the settings; it is made inert while the alert window stands over it.
  const content = el('div', { class: 'wt-popover__content' }, [
    el('h2', { class: 'wt-popover__title', text: pl.settings, attrs: { id: 'wt-settings-title' } }),
    el('hr', { class: 'wt-divider' }),
    intervalRow,
    intervalError,
    themeRow,
    personDivider,
    modeGroup,
    nameRow,
    nameMessage,
    people,
    notice,
    el('div', { class: 'wt-popover__actions' }, [
      el('button', { class: 'wt-button', text: pl.cancel, attrs: { type: 'button' }, on: { click: () => cancel() } }),
      saveButton,
    ]),
  ]);
  const alert = createAlertDialog({ under: content });

  const element = el(
    'div',
    { class: 'wt-popover', attrs: { role: 'dialog', 'aria-labelledby': 'wt-settings-title', hidden: true } },
    [content, alert.element],
  );

  const scope = options.scope ?? document;
  const themeTarget = options.themeTarget ?? document.documentElement;

  /** The theme to return to when the pop-over is closed without saving. */
  let themeOnOpen: Theme = 'dark';
  let previewTheme: Theme = 'dark';
  let mode: 'current' | 'other' = 'current';
  let pick: NamePick | null = null;
  /** The check that runs; null when none does. A newer or cancelled one makes it stale. */
  let check: AbortController | null = null;

  function showTheme(theme: Theme): void {
    previewTheme = theme;
    themeSwitch.setAttribute('aria-checked', String(theme === 'dark'));
    // The switch previews at once; only "Zapisz" keeps the choice (FR-046).
    applyTheme(theme, themeTarget);
  }

  function showNameMessage(text: string | null): void {
    nameMessage.textContent = text ?? '';
    nameMessage.hidden = text === null;
  }

  function hidePeople(): void {
    people.hidden = true;
    clear(peopleList);
    for (const part of aside) part.hidden = false;
  }

  /** While a check runs nothing of the choice can be changed and "save" cannot be used again. */
  function setBusy(busy: boolean): void {
    saveButton.classList.toggle('wt-button--busy', busy);
    // Not `disabled`: a disabled button under the keyboard would lose the focus to the page.
    saveButton.setAttribute('aria-disabled', String(busy));
    saveButton.setAttribute('aria-busy', String(busy));
    if (busy) {
      saveButton.setAttribute('aria-label', pl.personChecking);
      saveIcon.removeAttribute('hidden');
    } else {
      saveButton.removeAttribute('aria-label');
      saveIcon.setAttribute('hidden', '');
    }
    current.input.disabled = busy;
    other.input.disabled = busy;
    name.readOnly = busy;
  }

  function selectMode(next: 'current' | 'other'): void {
    mode = next;
    current.input.checked = next === 'current';
    other.input.checked = next === 'other';
    nameRow.hidden = next !== 'other';
    if (next === 'other') {
      // The text is selected, so typing replaces a name that was filled in (002 FR-012).
      name.focus();
      name.select();
    } else {
      showNameMessage(null);
      hidePeople();
    }
  }

  function showPeople(candidates: PersonCandidate[], more: boolean): void {
    clear(peopleList);
    for (const candidate of candidates) {
      const button = el(
        'button',
        { class: 'wt-people__option', attrs: { type: 'button' }, on: { click: () => choose(candidate) } },
        [
          el('span', { class: 'wt-people__name', text: candidate.displayName }),
          // Without a visible address the entry is the name alone (002 FR-030).
          candidate.email ? el('span', { class: 'wt-people__email', text: candidate.email }) : null,
        ],
      );
      peopleList.appendChild(el('li', {}, [button]));
    }
    peopleMore.hidden = !more;
    for (const part of aside) part.hidden = true;
    people.hidden = false;
    peopleList.querySelector('button')?.focus();
  }

  function choose(candidate: PersonCandidate): void {
    pick = { person: { accountId: candidate.accountId, displayName: candidate.displayName }, source: 'list' };
    name.value = candidate.displayName;
    hidePeople();
    saveButton.focus();
  }

  function stopCheck(): void {
    check?.abort();
    check = null;
    setBusy(false);
  }

  function close(): void {
    stopCheck();
    alert.close();
    hidePeople();
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

  /** Everything is certain: applies and stores the settings of this visit together (002 FR-024). */
  function commit(refreshMinutes: number, choice: PersonChoice): void {
    const stored = options.onSave({ ...options.getSettings(), refreshMinutes, theme: previewTheme }, choice);
    if (!stored) {
      // The new values stay in effect for this session; tell the user they will not last.
      themeOnOpen = previewTheme;
      if (choice.mode === 'other') {
        pick = { person: choice.person, source: 'effect' };
        name.value = choice.person.displayName;
      }
      notice.textContent = pl.settingsNotSaved;
      notice.hidden = false;
      return;
    }
    close();
  }

  /** Asks Jira who is meant. Nothing is saved before the answer is certain (002 FR-016). */
  async function lookUp(text: string, remembered: Person | null): Promise<CheckResult | null> {
    const abort = new AbortController();
    check = abort;
    setBusy(true);
    let result: CheckResult;
    try {
      if (remembered) {
        // Known by account ID: no search by name and no list (002 FR-036).
        const person = (await options.getPerson?.(remembered.accountId, abort.signal)) ?? null;
        result = person ? { kind: 'found', person } : { kind: 'notFound' };
      } else {
        result = matchPeople((await options.findPeople?.(text, abort.signal)) ?? [], text);
      }
    } catch {
      result = { kind: 'failed' };
    }
    // Closed meanwhile: this answer is not wanted any more.
    if (check !== abort) return null;
    check = null;
    setBusy(false);
    return result;
  }

  function save(): void {
    if (check) return;
    const refreshMinutes = validateInterval(interval.value);
    if (refreshMinutes === null) {
      intervalError.textContent = pl.intervalInvalid;
      intervalError.hidden = false;
      interval.focus();
      return;
    }
    intervalError.hidden = true;
    notice.hidden = true;

    if (mode === 'current') {
      commit(refreshMinutes, { mode: 'current' });
      return;
    }

    const text = name.value;
    if (normaliseName(text) === '') {
      hidePeople();
      showNameMessage(pl.personNameRequired);
      name.focus();
      return;
    }
    // Picked from the list a moment ago, or the person already shown: nothing to ask.
    if (pick && pick.source !== 'remembered') {
      commit(refreshMinutes, { mode: 'other', person: pick.person });
      return;
    }

    showNameMessage(null);
    hidePeople();
    void lookUp(text, pick?.person ?? null).then((result) => {
      if (!result || element.hidden) return;
      switch (result.kind) {
        case 'found':
          commit(refreshMinutes, {
            mode: 'other',
            person: { accountId: result.person.accountId, displayName: result.person.displayName },
          });
          break;
        case 'several':
          showPeople(result.people, result.more);
          break;
        case 'empty':
        case 'notFound':
          alert.show(pl.personNotFound, () => {
            name.focus();
            name.select();
          });
          break;
        case 'failed':
          showNameMessage(pl.personCheckFailed);
          name.focus();
          break;
      }
    });
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') cancel();
  }

  function onPointerDown(event: Event): void {
    // The alert has to be confirmed: a press elsewhere closes nothing (002 FR-020).
    if (alert.isOpen()) return;
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
    const choice: PersonChoice = options.getChoice?.() ?? { mode: 'current' };
    themeOnOpen = settings.theme;
    interval.value = String(settings.refreshMinutes);
    intervalError.hidden = true;
    notice.hidden = true;
    showTheme(settings.theme);

    // The name field is filled once, here: the person shown, else the remembered one,
    // else nothing (002 FR-013). Switching between the options later keeps the text.
    if (choice.mode === 'other') pick = { person: choice.person, source: 'effect' };
    else if (settings.lastPerson) pick = { person: settings.lastPerson, source: 'remembered' };
    else pick = null;
    name.value = pick?.person.displayName ?? '';
    mode = choice.mode;
    current.input.checked = mode === 'current';
    other.input.checked = mode === 'other';
    nameRow.hidden = mode !== 'other';
    showNameMessage(null);
    hidePeople();
    setBusy(false);

    element.hidden = false;
    options.anchor.setAttribute('aria-expanded', 'true');
    scope.addEventListener('keydown', onKeydown as EventListener);
    document.addEventListener('pointerdown', onPointerDown);
    interval.focus();
  }

  themeSwitch.addEventListener('click', () => showTheme(previewTheme === 'dark' ? 'light' : 'dark'));
  name.addEventListener('input', () => {
    // A changed text makes what was said about the old one untrue (002 FR-031).
    showNameMessage(null);
    hidePeople();
    if (pick && normaliseName(name.value) !== normaliseName(pick.person.displayName)) pick = null;
  });
  name.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      save();
    }
  });

  return {
    element,
    isOpen: () => !element.hidden,
    open,
    cancel,
    toggle: () => (element.hidden ? open() : cancel()),
  };
}
