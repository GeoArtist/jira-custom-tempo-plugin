// The control "Eksport" and its menu of two formats
// (specs/003-table-export/contracts/ui.md; FR-005 to FR-009, FR-030).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { createExportMenu } from '../../src/ui/export-menu';

type Choose = (format: 'csv' | 'xlsx') => void;

function build(onChoose: Choose = vi.fn(), state: 'absent' | 'disabled' | 'enabled' = 'enabled') {
  const onFocusLost = vi.fn();
  const parentKeys = vi.fn();
  const host = document.createElement('div');
  host.addEventListener('keydown', parentKeys);
  const outside = document.createElement('button');
  const menu = createExportMenu({ onChoose, onFocusLost });
  host.append(menu.element, outside);
  document.body.appendChild(host);
  menu.setState(state);

  const button = menu.element.querySelector<HTMLButtonElement>('.wt-export__button') as HTMLButtonElement;
  const list = menu.element.querySelector<HTMLElement>('[role="menu"]') as HTMLElement;
  const items = [...list.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];
  const [csv, xlsx] = items as [HTMLButtonElement, HTMLButtonElement];
  const message = menu.element.querySelector<HTMLElement>('[role="status"]') as HTMLElement;
  const key = (target: HTMLElement, name: string, shiftKey = false) => {
    const event = new KeyboardEvent('keydown', { key: name, shiftKey, bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    return event;
  };
  const press = (target: Element) =>
    target.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, composed: true }));
  return { menu, host, outside, button, list, items, csv, xlsx, message, key, press, parentKeys, onFocusLost };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('export menu: markup', () => {
  it('is a button with a menu of two formats and a place for a message', () => {
    const { menu, button, list, csv, xlsx, message } = build();
    expect(menu.element.className).toBe('wt-export');
    // The button and its menu stand together; the message follows them.
    expect([...menu.element.children]).toEqual([button.parentElement, message]);
    expect([...(button.parentElement as HTMLElement).children]).toEqual([button, list]);
    expect(button.textContent).toBe('Eksport');
    expect(button.type).toBe('button');
    expect(button.getAttribute('aria-haspopup')).toBe('menu');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-controls')).toBe(list.id);
    expect(list.id).not.toBe('');
    expect(list.getAttribute('aria-label')).toBe('Eksport');
    expect(list.hidden).toBe(true);
    expect([csv.textContent, xlsx.textContent]).toEqual(['*.csv', '*.xlsx']);
    expect([csv.getAttribute('aria-label'), xlsx.getAttribute('aria-label')]).toEqual([
      'Eksport do pliku CSV',
      'Eksport do pliku XLSX',
    ]);
    expect(message.getAttribute('aria-live')).toBe('polite');
    expect(message.textContent).toBe('');
  });

  it('shows the button only when there is something to export', () => {
    const { menu, button } = build(vi.fn(), 'absent');
    expect(button.hidden).toBe(true);
    menu.setState('disabled');
    expect([button.hidden, button.disabled]).toEqual([false, true]);
    menu.setState('enabled');
    expect([button.hidden, button.disabled]).toEqual([false, false]);
    menu.setState('absent');
    expect(button.hidden).toBe(true);
  });
});

describe('export menu: opening and choosing', () => {
  it.each(['click', 'Enter', ' ', 'ArrowDown'])('opens on %s with the focus on the first format', (how) => {
    const { button, list, csv, key } = build();
    button.focus();
    if (how === 'click') button.click();
    else expect(key(button, how).defaultPrevented).toBe(true);
    expect(list.hidden).toBe(false);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(csv);
  });

  it('moves between the formats with the arrow keys, Home, and End, and wraps round', () => {
    const { button, csv, xlsx, key } = build();
    button.click();
    key(csv, 'ArrowDown');
    expect(document.activeElement).toBe(xlsx);
    key(xlsx, 'ArrowDown');
    expect(document.activeElement).toBe(csv);
    key(csv, 'ArrowUp');
    expect(document.activeElement).toBe(xlsx);
    key(xlsx, 'Home');
    expect(document.activeElement).toBe(csv);
    key(csv, 'End');
    expect(document.activeElement).toBe(xlsx);
  });

  it.each([
    ['a click', 'csv'],
    ['Enter', 'xlsx'],
    [' ', 'csv'],
  ] as const)(
    'chooses with %s: the menu closes, the focus returns, and the format is passed on once',
    (how, format) => {
      const onChoose = vi.fn();
      const { button, list, csv, xlsx, key } = build(onChoose);
      button.click();
      const item = format === 'csv' ? csv : xlsx;
      if (how === 'a click') item.click();
      else key(item, how);
      expect(onChoose.mock.calls).toEqual([[format]]);
      expect(list.hidden).toBe(true);
      expect(button.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(button);
    },
  );

  it('closes on a second activation of the button, with the focus on the button', () => {
    const onChoose = vi.fn();
    const { button, list } = build(onChoose);
    button.click();
    button.click();
    expect(list.hidden).toBe(true);
    expect(document.activeElement).toBe(button);
    expect(onChoose).not.toHaveBeenCalled();
  });

  it('closes on Escape without letting the key reach the panel', () => {
    const { button, list, csv, key, parentKeys } = build();
    button.click();
    const event = key(csv, 'Escape');
    expect(list.hidden).toBe(true);
    expect(document.activeElement).toBe(button);
    expect(event.defaultPrevented).toBe(true);
    expect(parentKeys).not.toHaveBeenCalled();
    // With the menu closed the key belongs to the panel again.
    key(button, 'Escape');
    expect(parentKeys).toHaveBeenCalledOnce();
  });

  it('closes on Tab and lets the focus move on', () => {
    const { button, list, csv, key } = build();
    button.click();
    expect(key(csv, 'Tab').defaultPrevented).toBe(false);
    expect(list.hidden).toBe(true);
    button.click();
    expect(key(csv, 'Tab', true).defaultPrevented).toBe(false);
    expect(list.hidden).toBe(true);
  });

  it('closes when the pointer is pressed outside, and only then', () => {
    const { button, list, csv, outside, press } = build();
    button.click();
    press(csv);
    press(button);
    expect(list.hidden).toBe(false);
    press(outside);
    expect(list.hidden).toBe(true);
  });

  it('listens to the page only while the menu is open', () => {
    const add = vi.spyOn(document, 'addEventListener');
    const remove = vi.spyOn(document, 'removeEventListener');
    const pointer = (spy: typeof add) => spy.mock.calls.filter(([type]) => type === 'pointerdown').length;
    const { button, csv, key } = build();
    expect(pointer(add)).toBe(0);
    button.click();
    expect([pointer(add), pointer(remove)]).toEqual([1, 0]);
    key(csv, 'Escape');
    expect([pointer(add), pointer(remove)]).toEqual([1, 1]);
  });

  it('does not open while disabled or absent, and a change of state closes it', () => {
    const { menu, button, list } = build();
    button.click();
    menu.setState('disabled');
    expect(list.hidden).toBe(true);
    button.click();
    expect(list.hidden).toBe(true);

    menu.setState('enabled');
    button.click();
    menu.setState('absent');
    expect(list.hidden).toBe(true);
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('can be closed from outside', () => {
    const { menu, button, list } = build();
    button.click();
    menu.close();
    expect(list.hidden).toBe(true);
  });
});

describe('export menu: making a file', () => {
  it('is busy while the file is made: switched off, announced, and still focused', () => {
    const seen: Array<Record<string, unknown>> = [];
    const onChoose = vi.fn(() => {
      seen.push({
        busy: button.getAttribute('aria-busy'),
        off: button.getAttribute('aria-disabled'),
        disabled: button.disabled,
        label: button.getAttribute('aria-label'),
        focused: document.activeElement === button,
      });
      // Activation is ignored meanwhile.
      button.click();
    });
    const { button, list, csv } = build(onChoose);
    button.click();
    csv.click();
    expect(seen).toEqual([{ busy: 'true', off: 'true', disabled: false, label: 'Tworzenie pliku…', focused: true }]);
    expect(list.hidden).toBe(true);
    expect(onChoose).toHaveBeenCalledOnce();
    // Afterwards it is an ordinary button again.
    expect([
      button.hasAttribute('aria-busy'),
      button.hasAttribute('aria-disabled'),
      button.hasAttribute('aria-label'),
    ]).toEqual([false, false, false]);
    expect(document.activeElement).toBe(button);
  });

  it('says so when the file could not be made, and stays usable', () => {
    const onChoose = vi.fn(() => {
      throw new Error('no file');
    });
    const { button, list, csv, message } = build(onChoose);
    button.click();
    csv.click();
    expect(message.textContent).toBe('Nie udało się utworzyć pliku.');
    expect(button.disabled).toBe(false);
    expect(button.hasAttribute('aria-disabled')).toBe(false);

    // The next activation clears the message and opens the menu.
    button.click();
    expect(message.textContent).toBe('');
    expect(list.hidden).toBe(false);
  });

  it('shows no message after a file was made', () => {
    const { button, xlsx, message } = build();
    button.click();
    xlsx.click();
    expect(message.textContent).toBe('');
  });
});

describe('export menu: losing its use', () => {
  const failing = () => {
    throw new Error('no file');
  };

  it.each(['disabled', 'absent'] as const)('hands the focus on when it becomes %s while focused', (next) => {
    const { menu, button, onFocusLost } = build();
    button.focus();
    menu.setState(next);
    expect(onFocusLost).toHaveBeenCalledOnce();
  });

  it('hands the focus on when a format of the open menu had it', () => {
    const { menu, button, csv, onFocusLost } = build();
    button.click();
    expect(document.activeElement).toBe(csv);
    menu.setState('disabled');
    expect(onFocusLost).toHaveBeenCalledOnce();
  });

  it('leaves the focus alone when it is elsewhere', () => {
    const { menu, outside, onFocusLost } = build();
    outside.focus();
    menu.setState('disabled');
    menu.setState('absent');
    expect(onFocusLost).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(outside);
  });

  it('does not count the making of a file, and does not bring the focus back later', () => {
    const { menu, button, csv, outside, onFocusLost } = build();
    button.click();
    csv.click();
    expect(onFocusLost).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(button);

    menu.setState('disabled');
    expect(onFocusLost).toHaveBeenCalledOnce();
    outside.focus();
    menu.setState('enabled');
    expect(document.activeElement).toBe(outside);
    expect(onFocusLost).toHaveBeenCalledOnce();
  });

  it('clears the failure message when its state changes, and keeps it while it stays enabled', () => {
    const { menu, button, csv, message } = build(failing);
    button.click();
    csv.click();
    menu.setState('enabled');
    expect(message.textContent).toBe('Nie udało się utworzyć pliku.');
    menu.setState('disabled');
    expect(message.textContent).toBe('');

    menu.setState('enabled');
    button.click();
    csv.click();
    expect(message.textContent).toBe('Nie udało się utworzyć pliku.');
    menu.setState('absent');
    expect(message.textContent).toBe('');
  });
});
