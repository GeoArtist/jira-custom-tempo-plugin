// The part of the settings that chooses whose time is shown: the two options, the name
// field, the check on save, the list of people, the alert, and the remembered person
// (specs/002-other-user-worktime/spec.md, FR-011 to FR-049).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { Person, PersonCandidate } from '../../src/domain/person';
import type { UserSettings } from '../../src/domain/settings';
import { el } from '../../src/ui/dom';
import { createSettingsPopover, type PersonChoice } from '../../src/ui/settings-popover';
import { flush } from '../fake-gateway';

const theme = () => document.documentElement.getAttribute('data-theme');

const DEFAULTS: UserSettings = {
  refreshMinutes: 5,
  theme: 'dark',
  panelHeight: null,
  panelWidth: null,
  launcher: null,
  lastPerson: null,
};
const ANNA: PersonCandidate = { accountId: 'anna-1', displayName: 'Anna Nowak', email: 'anna.nowak@example.com' };
const ANNA_TWO: PersonCandidate = { accountId: 'anna-2', displayName: 'Anna Nowak', email: 'a.nowak@example.com' };
const PIOTR: PersonCandidate = { accountId: 'piotr-1', displayName: 'Piotr Nowakowski' };
const NOT_FOUND = 'Nie znaleziono użytkownika.\nNie można zapisać ustawień.';
const CHECK_FAILED = 'Nie udało się sprawdzić użytkownika w Jirze. Ustawienia nie zostały zapisane.';

/** A look-up the test answers when it wants. */
function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}

interface Setup {
  settings?: Partial<UserSettings>;
  choice?: PersonChoice;
  found?: PersonCandidate[] | (() => Promise<PersonCandidate[]>);
  person?: Person | null | (() => Promise<Person | null>);
  stored?: boolean;
}

function build(setup: Setup = {}) {
  let settings: UserSettings = { ...DEFAULTS, ...setup.settings };
  const anchor = el('button', { attrs: { type: 'button' } });
  const onSave = vi.fn((next: UserSettings, _choice: PersonChoice) => {
    settings = next;
    return setup.stored ?? true;
  });
  const findPeople = vi.fn((_text: string, _signal: AbortSignal) =>
    typeof setup.found === 'function' ? setup.found() : Promise.resolve(setup.found ?? []),
  );
  const getPerson = vi.fn((_accountId: string, _signal: AbortSignal) =>
    typeof setup.person === 'function' ? setup.person() : Promise.resolve(setup.person ?? null),
  );
  const popover = createSettingsPopover({
    anchor,
    getSettings: () => settings,
    getChoice: () => setup.choice ?? { mode: 'current' },
    findPeople,
    getPerson,
    onSave,
  });
  document.body.append(anchor, popover.element);
  const root = popover.element;
  const query = <T extends HTMLElement = HTMLElement>(selector: string) => root.querySelector<T>(selector) as T;
  const radios = [...root.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
  const [current, other] = radios as [HTMLInputElement, HTMLInputElement];
  const name = query<HTMLInputElement>('#wt-person-name');
  const interval = query<HTMLInputElement>('#wt-interval');
  const button = (text: string) =>
    [...root.querySelectorAll('button')].find((b) => b.textContent === text) as HTMLButtonElement;
  const select = (input: HTMLInputElement) => {
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const type = (text: string) => {
    name.value = text;
    name.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const errors = () => [...root.querySelectorAll<HTMLElement>('.wt-field-error')].filter((e) => !e.hidden);
  const list = () => query('.wt-people');
  const entries = () => [...root.querySelectorAll<HTMLButtonElement>('.wt-people__option')];
  const alertBox = () => query('.wt-alert');
  const alertOk = () => alertBox().querySelector('button') as HTMLButtonElement;
  /** Opens, chooses the other person, types the name, and presses the save button. */
  const saveName = async (text: string) => {
    popover.open();
    select(other);
    type(text);
    button('Zapisz').click();
    await flush();
  };
  return {
    popover,
    root,
    anchor,
    onSave,
    findPeople,
    getPerson,
    current,
    other,
    name,
    interval,
    button,
    select,
    type,
    errors,
    list,
    entries,
    alertBox,
    alertOk,
    saveName,
    query,
  };
}

beforeEach(() => {
  document.body.innerHTML = '';
  document.documentElement.setAttribute('data-theme', 'dark');
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('the two options and the name field', () => {
  it('stand below the theme row, after a second dividing line, in the order of the spec', () => {
    const { popover, query } = build();
    popover.open();
    const parts = [...query('.wt-popover__content').children].map(
      (child) => child.tagName + (child.className ? `.${child.className}` : ''),
    );
    expect(parts).toEqual([
      'H2.wt-popover__title',
      'HR.wt-divider',
      'DIV.wt-popover__row',
      'P.wt-field-error',
      'DIV.wt-popover__row',
      'HR.wt-divider',
      'DIV.wt-popover__group',
      'DIV.wt-popover__row wt-popover__row--person',
      'P.wt-field-error',
      'DIV.wt-people',
      'P.wt-field-error',
      'DIV.wt-popover__actions',
    ]);
  });

  it('are exactly two options in one named group, the one in effect selected', () => {
    const { popover, query, current, other } = build();
    popover.open();
    const group = query('[role="radiogroup"]');
    expect(group.getAttribute('aria-label')).toBe('Użytkownik');
    expect([...group.querySelectorAll('label')].map((label) => label.textContent)).toEqual([
      'Obecny użytkownik',
      'Inny użytkownik',
    ]);
    expect(current.name).toBe(other.name);
    expect([current.checked, other.checked]).toEqual([true, false]);
  });

  it('show the name field only for the other person, focused, with its text selected', () => {
    const { popover, query, current, other, name, select, type } = build();
    popover.open();
    const row = name.closest<HTMLElement>('.wt-popover__row') as HTMLElement;
    expect(row.hidden).toBe(true);

    select(other);
    expect(row.hidden).toBe(false);
    expect(query('label[for="wt-person-name"]').textContent).toBe('Imię i nazwisko');
    expect(document.activeElement).toBe(name);
    expect([
      name.getAttribute('maxlength'),
      name.getAttribute('autocomplete'),
      name.getAttribute('spellcheck'),
    ]).toEqual(['255', 'off', 'false']);

    type('Anna');
    select(current);
    expect(row.hidden).toBe(true);
    // The text is kept until the settings are closed.
    select(other);
    expect(name.value).toBe('Anna');
    expect([name.selectionStart, name.selectionEnd]).toEqual([0, 4]);
  });

  it('open on the other person, with their name in the field, when that is in effect', () => {
    const { popover, current, other, name } = build({ choice: { mode: 'other', person: ANNA } });
    popover.open();
    expect([current.checked, other.checked]).toEqual([false, true]);
    expect(name.closest<HTMLElement>('.wt-popover__row')?.hidden).toBe(false);
    expect(name.value).toBe('Anna Nowak');
  });

  it('save without asking Jira for the signed-in user', () => {
    const { popover, button, onSave, findPeople, getPerson, root } = build();
    popover.open();
    button('Zapisz').click();
    expect(onSave).toHaveBeenCalledWith(DEFAULTS, { mode: 'current' });
    expect(findPeople).not.toHaveBeenCalled();
    expect(getPerson).not.toHaveBeenCalled();
    expect(root.hidden).toBe(true);
  });

  it('go back to the signed-in user without asking Jira', () => {
    const { popover, button, select, current, onSave, findPeople } = build({
      choice: { mode: 'other', person: ANNA },
    });
    popover.open();
    select(current);
    button('Zapisz').click();
    expect(onSave).toHaveBeenCalledWith(DEFAULTS, { mode: 'current' });
    expect(findPeople).not.toHaveBeenCalled();
  });

  it('are discarded on "Anuluj"', () => {
    const { popover, button, select, other, type, onSave, current, name } = build();
    popover.open();
    select(other);
    type('Anna Nowak');
    button('Anuluj').click();
    expect(onSave).not.toHaveBeenCalled();
    popover.open();
    expect(current.checked).toBe(true);
    expect(name.value).toBe('');
  });
});

describe('checking the name on save', () => {
  it('asks Jira once and saves for the one person whose whole name was typed', async () => {
    const { saveName, findPeople, onSave, root, anchor } = build({ found: [ANNA, PIOTR] });
    await saveName(' anna  NOWAK ');

    expect(findPeople).toHaveBeenCalledTimes(1);
    expect(findPeople.mock.calls[0]?.[0]).toBe(' anna  NOWAK ');
    // The name as Jira has it, not as it was typed; only identity and name are passed on.
    expect(onSave).toHaveBeenCalledWith(DEFAULTS, {
      mode: 'other',
      person: { accountId: 'anna-1', displayName: 'Anna Nowak' },
    });
    expect(root.hidden).toBe(true);
    expect(document.activeElement).toBe(anchor);
  });

  it('finds a name typed without its Polish letters', async () => {
    const jozef = { accountId: 'jozef-1', displayName: 'Józef Śliwiński' };
    const { saveName, onSave } = build({ found: [jozef] });
    await saveName('jozef sliwinski');
    expect(onSave.mock.calls[0]?.[1]).toEqual({ mode: 'other', person: jozef });
  });

  it('saves the interval and the theme of the same visit together with the person', async () => {
    const { popover, select, other, type, interval, button, onSave, query } = build({ found: [PIOTR] });
    popover.open();
    interval.value = '10';
    query<HTMLButtonElement>('[role="switch"]').click();
    select(other);
    type('Piotr Nowakowski');
    button('Zapisz').click();
    await flush();
    expect(onSave).toHaveBeenCalledWith(
      { ...DEFAULTS, refreshMinutes: 10, theme: 'light' },
      { mode: 'other', person: { accountId: 'piotr-1', displayName: 'Piotr Nowakowski' } },
    );
  });

  it('does the same on Enter in the name field', async () => {
    const { popover, select, other, type, name, onSave } = build({ found: [PIOTR] });
    popover.open();
    select(other);
    type('piotr nowakowski');
    name.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await flush();
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('sends nothing while the user types', () => {
    const { popover, select, other, type, findPeople, getPerson } = build({ found: [ANNA] });
    popover.open();
    select(other);
    for (const text of ['A', 'An', 'Ann', 'Anna', 'Anna Nowak']) type(text);
    expect(findPeople).not.toHaveBeenCalled();
    expect(getPerson).not.toHaveBeenCalled();
  });

  it('shows that it is working and cannot be saved twice while the check runs', async () => {
    const pending = deferred<PersonCandidate[]>();
    const { popover, select, other, type, button, findPeople, current, name, onSave, root } = build({
      found: () => pending.promise,
    });
    popover.open();
    select(other);
    type('Anna Nowak');
    const save = button('Zapisz');
    save.click();

    expect(save.getAttribute('aria-disabled')).toBe('true');
    expect(save.getAttribute('aria-busy')).toBe('true');
    expect(save.getAttribute('aria-label')).toBe('Sprawdzanie…');
    expect(save.classList.contains('wt-button--busy')).toBe(true);
    expect(save.querySelector('svg')?.hasAttribute('hidden')).toBe(false);
    expect([current.disabled, other.disabled, name.readOnly]).toEqual([true, true, true]);

    save.click();
    save.click();
    expect(findPeople).toHaveBeenCalledTimes(1);

    pending.resolve([ANNA]);
    await flush();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(root.hidden).toBe(true);

    popover.open();
    expect(save.getAttribute('aria-disabled')).toBe('false');
    expect(save.hasAttribute('aria-label')).toBe(false);
    expect(save.querySelector('svg')?.hasAttribute('hidden')).toBe(true);
    expect([current.disabled, other.disabled, name.readOnly]).toEqual([false, false, false]);
  });

  it.each(['Anuluj', 'Escape', 'outside'])(
    'drops the answer when the settings are closed with %s meanwhile',
    async (how) => {
      const pending = deferred<PersonCandidate[]>();
      const { popover, select, other, type, button, findPeople, onSave, root, alertBox } = build({
        found: () => pending.promise,
      });
      popover.open();
      select(other);
      type('Anna Nowak');
      button('Zapisz').click();
      const signal = findPeople.mock.calls[0]?.[1] as AbortSignal;

      if (how === 'Anuluj') button('Anuluj').click();
      else if (how === 'Escape') document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      else document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      expect(root.hidden).toBe(true);
      expect(signal.aborted).toBe(true);

      pending.resolve([]);
      await flush();
      expect(onSave).not.toHaveBeenCalled();
      expect(alertBox().hidden).toBe(true);
    },
  );

  it('asks nothing when the person in effect is left unchanged', () => {
    const { popover, interval, button, onSave, findPeople, getPerson } = build({
      choice: { mode: 'other', person: ANNA },
      settings: { lastPerson: { accountId: 'anna-1', displayName: 'Anna Nowak' } },
    });
    popover.open();
    interval.value = '20';
    button('Zapisz').click();
    expect(findPeople).not.toHaveBeenCalled();
    expect(getPerson).not.toHaveBeenCalled();
    expect(onSave.mock.calls[0]?.[0].refreshMinutes).toBe(20);
    expect(onSave.mock.calls[0]?.[1]).toEqual({ mode: 'other', person: ANNA });
  });
});

describe('a name that is not in Jira', () => {
  it('asks for a name, and not Jira, when the field is empty', () => {
    const { popover, select, other, type, button, findPeople, onSave, errors, name, root } = build();
    popover.open();
    select(other);
    for (const text of ['', '   ']) {
      type(text);
      button('Zapisz').click();
      expect(errors().map((error) => error.textContent)).toEqual(['Podaj imię i nazwisko.']);
      expect(document.activeElement).toBe(name);
    }
    expect(findPeople).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
    expect(root.hidden).toBe(false);
  });

  it('shows the alert window and saves nothing when nobody is found', async () => {
    const { saveName, onSave, alertBox, root, query } = build({ found: [PIOTR] });
    await saveName('Jan Nieistniejący');

    expect(onSave).not.toHaveBeenCalled();
    expect(root.hidden).toBe(false);
    expect(alertBox().hidden).toBe(false);
    expect(alertBox().querySelector('[role="alertdialog"]')?.textContent).toBe(`${NOT_FOUND}OK`);
    expect(query('.wt-popover__content').hasAttribute('inert')).toBe(true);
    expect(document.activeElement?.textContent).toBe('OK');
  });

  it('returns to the settings as the user left them once the alert is confirmed', async () => {
    const { popover, select, other, type, interval, button, alertOk, alertBox, name, query, root, onSave } = build();
    popover.open();
    interval.value = '10';
    const themeSwitch = query<HTMLButtonElement>('[role="switch"]');
    themeSwitch.click();
    select(other);
    type('Jan Nieistniejący');
    button('Zapisz').click();
    await flush();

    alertOk().click();
    expect(alertBox().hidden).toBe(true);
    expect(root.hidden).toBe(false);
    expect(query('.wt-popover__content').hasAttribute('inert')).toBe(false);
    expect(other.checked).toBe(true);
    expect(name.value).toBe('Jan Nieistniejący');
    expect(interval.value).toBe('10');
    expect(themeSwitch.getAttribute('aria-checked')).toBe('false');
    expect(document.activeElement).toBe(name);
    expect([name.selectionStart, name.selectionEnd]).toEqual([0, 'Jan Nieistniejący'.length]);
    expect(onSave).not.toHaveBeenCalled();

    // Nothing of this visit was kept: closing restores the theme.
    button('Anuluj').click();
    expect(theme()).toBe('dark');
  });

  it('saves after the name is corrected', async () => {
    const answers: PersonCandidate[][] = [[], [PIOTR]];
    const { saveName, alertOk, type, button, onSave, root } = build({
      found: () => Promise.resolve(answers.shift() ?? []),
    });
    await saveName('Piotr Nowakowsky');
    alertOk().click();
    type('Piotr Nowakowski');
    button('Zapisz').click();
    await flush();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(root.hidden).toBe(true);
  });

  it('closes only the alert on Escape, and the settings on the next one', async () => {
    const { saveName, alertBox, alertOk, root } = build();
    await saveName('Jan Nieistniejący');
    alertOk().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(alertBox().hidden).toBe(true);
    expect(root.hidden).toBe(false);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(root.hidden).toBe(true);
  });

  it('keeps the alert when the user presses somewhere else, and closes it with the settings', async () => {
    const { saveName, alertBox, root, popover, onSave } = build();
    await saveName('Jan Nieistniejący');
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(alertBox().hidden).toBe(false);
    expect(root.hidden).toBe(false);

    // The panel is closed or minimised under it.
    popover.cancel();
    expect(alertBox().hidden).toBe(true);
    expect(root.hidden).toBe(true);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('says that the user could not be checked, without an alert, when Jira cannot be asked', async () => {
    let fail = true;
    const { saveName, errors, alertBox, onSave, root, name, button, findPeople, type, select, current, other } = build({
      found: () => (fail ? Promise.reject(new Error('offline')) : Promise.resolve([PIOTR])),
    });
    await saveName('Piotr Nowakowski');

    expect(errors().map((error) => error.textContent)).toEqual([CHECK_FAILED]);
    expect(alertBox().hidden).toBe(true);
    expect(onSave).not.toHaveBeenCalled();
    expect(root.hidden).toBe(false);
    expect(name.value).toBe('Piotr Nowakowski');
    expect(document.activeElement).toBe(name);

    // The message goes when the field is edited or the other option is selected.
    type('Piotr Nowakowski ');
    expect(errors()).toEqual([]);
    button('Zapisz').click();
    await flush();
    expect(errors().map((error) => error.textContent)).toEqual([CHECK_FAILED]);
    select(current);
    expect(errors()).toEqual([]);
    select(other);

    // Pressing save again asks again.
    fail = false;
    button('Zapisz').click();
    await flush();
    expect(findPeople).toHaveBeenCalledTimes(3);
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});

describe('several people fit the name', () => {
  it('are listed under the field instead of being saved, the first one focused', async () => {
    const { saveName, list, entries, onSave, root, query } = build({ found: [PIOTR, ANNA_TWO, ANNA] });
    await saveName('Nowak');

    expect(onSave).not.toHaveBeenCalled();
    expect(root.hidden).toBe(false);
    expect(list().hidden).toBe(false);
    expect(list().getAttribute('role')).toBe('group');
    expect(query(`#${list().getAttribute('aria-labelledby')}`).textContent).toBe(
      'Znaleziono kilka osób. Wybierz jedną:',
    );
    // By name, then by account ID; the address under the name when Jira shows it.
    expect(entries().map((entry) => [...entry.children].map((line) => line.textContent))).toEqual([
      ['Anna Nowak', 'anna.nowak@example.com'],
      ['Anna Nowak', 'a.nowak@example.com'],
      ['Piotr Nowakowski'],
    ]);
    expect(query('.wt-people__more').hidden).toBe(true);
    expect(document.activeElement).toBe(entries()[0]);
  });

  it('also when they share one name, or an exact name stands beside a longer one', async () => {
    const same = build({ found: [ANNA, ANNA_TWO] });
    await same.saveName('Anna Nowak');
    expect(same.entries()).toHaveLength(2);
    expect(same.onSave).not.toHaveBeenCalled();

    document.body.innerHTML = '';
    const longer = build({ found: [ANNA, { accountId: 'anna-3', displayName: 'Anna Nowakowska' }] });
    await longer.saveName('Anna Nowak');
    expect(longer.entries().map((entry) => entry.firstElementChild?.textContent)).toEqual([
      'Anna Nowak',
      'Anna Nowakowska',
    ]);
    expect(longer.onSave).not.toHaveBeenCalled();
  });

  it('shows the first 10 and asks for a more exact name when more match', async () => {
    const many = Array.from({ length: 12 }, (_, index) => ({
      accountId: `k-${index}`,
      displayName: `Jan Kowalski ${String(index).padStart(2, '0')}`,
    }));
    const { saveName, entries, query } = build({ found: many });
    await saveName('Kowalski');
    expect(entries()).toHaveLength(10);
    expect(query('.wt-people__more').hidden).toBe(false);
    expect(query('.wt-people__more').textContent).toBe(
      'Pokazano 10 pierwszych osób. Wpisz dokładniejsze imię i nazwisko.',
    );
  });

  it('writes a picked person into the field and saves for exactly that person without asking again', async () => {
    const { saveName, entries, list, name, button, onSave, findPeople, root } = build({ found: [ANNA, ANNA_TWO] });
    await saveName('anna nowak');
    entries()[1]?.click();

    expect(name.value).toBe('Anna Nowak');
    expect(list().hidden).toBe(true);
    expect(document.activeElement).toBe(button('Zapisz'));
    expect(onSave).not.toHaveBeenCalled();

    button('Zapisz').click();
    expect(findPeople).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(DEFAULTS, {
      mode: 'other',
      person: { accountId: 'anna-2', displayName: 'Anna Nowak' },
    });
    expect(root.hidden).toBe(true);
  });

  it('keeps the pick while the text still means the same name', async () => {
    const { saveName, entries, type, button, findPeople, onSave } = build({ found: [ANNA, ANNA_TWO] });
    await saveName('Anna Nowak');
    entries()[0]?.click();
    // Other spaces and another letter case are still that name.
    type('  anna   NOWAK');
    button('Zapisz').click();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(findPeople).toHaveBeenCalledTimes(1);
  });

  it('drops the pick and the list when the field is edited to another name', async () => {
    const { saveName, entries, list, type, button, findPeople, onSave } = build({ found: [ANNA, ANNA_TWO] });
    await saveName('Anna Nowak');
    type('Anna Nowa');
    expect(list().hidden).toBe(true);
    expect(entries()).toHaveLength(0);

    button('Zapisz').click();
    await flush();
    entries()[0]?.click();
    type('Anna Nowakowska');
    button('Zapisz').click();
    await flush();
    // Asked again: the pick was for another text.
    expect(findPeople).toHaveBeenCalledTimes(3);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('gives the list the room of the other rows, which come back with their values', async () => {
    const { popover, select, other, type, interval, button, entries, query, name } = build({
      found: [ANNA, ANNA_TWO],
    });
    popover.open();
    interval.value = '15';
    const themeSwitch = query<HTMLButtonElement>('[role="switch"]');
    themeSwitch.click();
    select(other);
    type('Anna Nowak');
    button('Zapisz').click();
    await flush();

    const rows = () => [
      interval.closest<HTMLElement>('.wt-popover__row') as HTMLElement,
      themeSwitch.closest<HTMLElement>('.wt-popover__row') as HTMLElement,
      query('[role="radiogroup"]'),
    ];
    // Only the title, the name field, the list, and the two buttons are left.
    expect(rows().map((row) => row.hidden)).toEqual([true, true, true]);
    expect(name.closest<HTMLElement>('.wt-popover__row')?.hidden).toBe(false);
    expect(query('.wt-popover__title').hidden).toBe(false);
    expect([button('Anuluj').hidden, button('Zapisz').hidden]).toEqual([false, false]);

    entries()[0]?.click();
    expect(rows().map((row) => row.hidden)).toEqual([false, false, false]);
    expect(interval.value).toBe('15');
    expect(themeSwitch.getAttribute('aria-checked')).toBe('false');
    expect(other.checked).toBe(true);

    // Editing the name instead of picking brings them back too.
    type('Anna');
    button('Zapisz').click();
    await flush();
    expect(rows().map((row) => row.hidden)).toEqual([true, true, true]);
    type('Ann');
    expect(rows().map((row) => row.hidden)).toEqual([false, false, false]);
  });

  it('closes the list with the settings', async () => {
    const { saveName, popover, list, entries } = build({ found: [ANNA, ANNA_TWO] });
    await saveName('Anna Nowak');
    popover.cancel();
    popover.open();
    expect(list().hidden).toBe(true);
    expect(entries()).toHaveLength(0);
  });
});

describe('the remembered person', () => {
  const remembered = { accountId: 'anna-1', displayName: 'Anna Nowak' };

  it('fills the name field in advance while the signed-in user is shown', () => {
    const { popover, select, other, current, name } = build({ settings: { lastPerson: remembered } });
    popover.open();
    // The signed-in user is still the one selected.
    expect(current.checked).toBe(true);
    select(other);
    expect(name.value).toBe('Anna Nowak');
    expect([name.selectionStart, name.selectionEnd]).toEqual([0, 10]);
  });

  it('leaves the field empty when nobody is remembered', () => {
    const { popover, select, other, name } = build();
    popover.open();
    select(other);
    expect(name.value).toBe('');
  });

  it('does not replace what the user typed when the options are switched back and forth', () => {
    const { popover, select, other, current, type, name } = build({ settings: { lastPerson: remembered } });
    popover.open();
    select(other);
    type('Piotr');
    select(current);
    select(other);
    expect(name.value).toBe('Piotr');
  });

  it('is checked by account ID, and the name Jira has now is taken', async () => {
    const { popover, select, other, button, getPerson, findPeople, onSave, root } = build({
      settings: { lastPerson: remembered },
      person: { accountId: 'anna-1', displayName: 'Anna Nowak-Kowalska' },
    });
    popover.open();
    select(other);
    button('Zapisz').click();
    await flush();

    expect(getPerson).toHaveBeenCalledTimes(1);
    expect(getPerson.mock.calls[0]?.[0]).toBe('anna-1');
    expect(findPeople).not.toHaveBeenCalled();
    expect(onSave).toHaveBeenCalledWith(
      { ...DEFAULTS, lastPerson: remembered },
      { mode: 'other', person: { accountId: 'anna-1', displayName: 'Anna Nowak-Kowalska' } },
    );
    expect(root.hidden).toBe(true);
  });

  it('gives the alert when that person cannot be shown any more', async () => {
    const { popover, select, other, button, alertBox, onSave } = build({
      settings: { lastPerson: remembered },
      person: null,
    });
    popover.open();
    select(other);
    button('Zapisz').click();
    await flush();
    expect(alertBox().hidden).toBe(false);
    expect(alertBox().textContent).toContain(NOT_FOUND);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('gives the "could not be checked" message when Jira cannot be asked', async () => {
    const { popover, select, other, button, errors, alertBox, onSave } = build({
      settings: { lastPerson: remembered },
      person: () => Promise.reject(new Error('offline')),
    });
    popover.open();
    select(other);
    button('Zapisz').click();
    await flush();
    expect(errors().map((error) => error.textContent)).toEqual([CHECK_FAILED]);
    expect(alertBox().hidden).toBe(true);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('is looked up by name once its name is edited', async () => {
    const { popover, select, other, type, button, getPerson, findPeople } = build({
      settings: { lastPerson: remembered },
      found: [PIOTR],
    });
    popover.open();
    select(other);
    type('Piotr Nowakowski');
    button('Zapisz').click();
    await flush();
    expect(getPerson).not.toHaveBeenCalled();
    expect(findPeople).toHaveBeenCalledTimes(1);
  });

  it('stays in the field as the person in effect when the browser could not store the settings', async () => {
    const { saveName, errors, root, name, button, findPeople, onSave } = build({ found: [PIOTR], stored: false });
    await saveName('piotr nowakowski');
    expect(root.hidden).toBe(false);
    expect(errors().map((error) => error.textContent)).toEqual(['Nie udało się zapisać ustawień w tej przeglądarce.']);
    expect(name.value).toBe('Piotr Nowakowski');
    // The person is in effect now: saving again does not ask Jira again.
    button('Zapisz').click();
    expect(findPeople).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(2);
  });
});
