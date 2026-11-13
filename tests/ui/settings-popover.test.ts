import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { UserSettings } from '../../src/domain/settings';
import { el } from '../../src/ui/dom';
import { createSettingsPopover } from '../../src/ui/settings-popover';

const theme = () => document.documentElement.getAttribute('data-theme');

function build(
  initial: UserSettings = {
    refreshMinutes: 5,
    theme: 'dark',
    panelHeight: null,
    panelWidth: null,
    launcher: null,
    lastPerson: null,
  },
  stored = true,
) {
  let settings = initial;
  const anchor = el('button', { attrs: { type: 'button' } });
  const onSave = vi.fn((next: UserSettings) => {
    settings = next;
    return stored;
  });
  const popover = createSettingsPopover({ anchor, getSettings: () => settings, onSave });
  document.body.append(anchor, popover.element);
  const root = popover.element;
  const interval = root.querySelector<HTMLInputElement>('#wt-interval') as HTMLInputElement;
  const themeSwitch = root.querySelector<HTMLButtonElement>('[role="switch"]') as HTMLButtonElement;
  const button = (text: string) => [...root.querySelectorAll('button')].find((b) => b.textContent === text);
  const errors = () => [...root.querySelectorAll<HTMLElement>('.wt-field-error')].filter((e) => !e.hidden);
  return { popover, root, anchor, onSave, interval, themeSwitch, button, errors };
}

beforeEach(() => {
  document.body.innerHTML = '';
  document.documentElement.setAttribute('data-theme', 'dark');
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('settings pop-over', () => {
  it('is closed at first and opens with the current values', () => {
    const { popover, root, interval, themeSwitch, anchor } = build({
      refreshMinutes: 10,
      theme: 'dark',
      panelHeight: 500,
      panelWidth: null,
      launcher: null,
      lastPerson: null,
    });
    expect(root.hidden).toBe(true);
    popover.open();
    expect(root.hidden).toBe(false);
    expect(anchor.getAttribute('aria-expanded')).toBe('true');
    expect(root.querySelector('h2')?.textContent).toBe('Ustawienia');
    expect(interval.value).toBe('10');
    expect(themeSwitch.getAttribute('aria-checked')).toBe('true');
    expect(root.textContent).toContain('0 = automatyczne odświeżanie wyłączone (domyślnie 5 min)');
    // The explanation is a tooltip of the row and the description of the field, not a line of text.
    expect(root.querySelector('.wt-hint')).toBeNull();
    expect(interval.closest<HTMLElement>('.wt-popover__row')?.title).toContain('0 = ');
    expect(interval.getAttribute('aria-describedby')).toBe('wt-interval-hint');
    expect(root.querySelector('label[for="wt-theme"]')?.textContent).toBe('Tryb ciemny');
    expect(document.activeElement).toBe(interval);
  });

  it('saves a valid interval, closes, and returns the focus to the gear', () => {
    const { popover, root, interval, button, onSave, anchor } = build();
    popover.open();
    interval.value = '15';
    button('Zapisz')?.click();
    expect(onSave).toHaveBeenCalledWith(
      {
        refreshMinutes: 15,
        theme: 'dark',
        panelHeight: null,
        panelWidth: null,
        launcher: null,
        lastPerson: null,
      },
      { mode: 'current' },
    );
    expect(root.hidden).toBe(true);
    expect(document.activeElement).toBe(anchor);
  });

  it('accepts 0, which turns auto-refresh off', () => {
    const { popover, interval, button, onSave } = build();
    popover.open();
    interval.value = '0';
    button('Zapisz')?.click();
    expect(onSave).toHaveBeenCalledWith(
      {
        refreshMinutes: 0,
        theme: 'dark',
        panelHeight: null,
        panelWidth: null,
        launcher: null,
        lastPerson: null,
      },
      { mode: 'current' },
    );
  });

  it.each(['', '-1', '2.5', '1441', 'abc'])('rejects the interval "%s" and stays open', (value) => {
    const { popover, root, interval, button, onSave, errors } = build();
    popover.open();
    interval.value = value;
    button('Zapisz')?.click();
    expect(onSave).not.toHaveBeenCalled();
    expect(root.hidden).toBe(false);
    expect(errors().map((e) => e.textContent)).toEqual(['Podaj liczbę całkowitą od 0 do 1440.']);
  });

  it('does not save on "Anuluj", Escape, or a click outside', () => {
    const { popover, root, interval, button, onSave } = build();

    popover.open();
    interval.value = '30';
    button('Anuluj')?.click();
    expect(root.hidden).toBe(true);

    popover.open();
    expect(interval.value).toBe('5');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(root.hidden).toBe(true);

    popover.open();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(root.hidden).toBe(true);

    expect(onSave).not.toHaveBeenCalled();
  });

  it('stays open when the click is inside it', () => {
    const { popover, root, interval } = build();
    popover.open();
    interval.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(root.hidden).toBe(false);
  });

  it('previews the theme at once when the switch is flipped', () => {
    const { popover, themeSwitch } = build();
    popover.open();
    themeSwitch.click();
    expect(theme()).toBe('light');
    expect(themeSwitch.getAttribute('aria-checked')).toBe('false');
    themeSwitch.click();
    expect(theme()).toBe('dark');
  });

  it('restores the previous theme when closed without saving', () => {
    const { popover, themeSwitch, button } = build();
    popover.open();
    themeSwitch.click();
    button('Anuluj')?.click();
    expect(theme()).toBe('dark');

    popover.open();
    themeSwitch.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(theme()).toBe('dark');
  });

  it('keeps the previewed theme on "Zapisz"', () => {
    const { popover, themeSwitch, button, onSave } = build();
    popover.open();
    themeSwitch.click();
    button('Zapisz')?.click();
    expect(onSave).toHaveBeenCalledWith(
      {
        refreshMinutes: 5,
        theme: 'light',
        panelHeight: null,
        panelWidth: null,
        launcher: null,
        lastPerson: null,
      },
      { mode: 'current' },
    );
    expect(theme()).toBe('light');

    popover.open();
    expect(themeSwitch.getAttribute('aria-checked')).toBe('false');
  });

  it('tells the user when the browser could not store the settings', () => {
    const { popover, root, button, errors, themeSwitch } = build(
      { refreshMinutes: 5, theme: 'dark', panelHeight: null, panelWidth: null, launcher: null, lastPerson: null },
      false,
    );
    popover.open();
    themeSwitch.click();
    button('Zapisz')?.click();
    expect(root.hidden).toBe(false);
    expect(errors().map((e) => e.textContent)).toEqual(['Nie udało się zapisać ustawień w tej przeglądarce.']);
    // The choice still applies for this session.
    button('Anuluj')?.click();
    expect(theme()).toBe('light');
  });

  it('toggles from the gear', () => {
    const { popover, root } = build();
    popover.toggle();
    expect(popover.isOpen()).toBe(true);
    popover.toggle();
    expect(root.hidden).toBe(true);
  });
});
