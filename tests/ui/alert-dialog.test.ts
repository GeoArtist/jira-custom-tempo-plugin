// The alert window over the settings (002 FR-020).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { createAlertDialog } from '../../src/ui/alert-dialog';
import { el } from '../../src/ui/dom';

const TEXT = 'Nie znaleziono użytkownika. Nie można zapisać ustawień.';

function build() {
  const field = el('input', { attrs: { type: 'text' } });
  const under = el('div', {}, [field]);
  const alert = createAlertDialog({ under });
  const host = el('div', {}, [under, alert.element]);
  document.body.appendChild(host);
  const box = alert.element.querySelector<HTMLElement>('[role="alertdialog"]') as HTMLElement;
  const ok = alert.element.querySelector<HTMLButtonElement>('button') as HTMLButtonElement;
  const key = (name: string, target: HTMLElement = ok) => {
    const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    return event;
  };
  return { alert, under, field, host, box, ok, key };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('alert window', () => {
  it('is hidden until it is shown', () => {
    const { alert, under } = build();
    expect(alert.isOpen()).toBe(false);
    expect(alert.element.hidden).toBe(true);
    expect(under.hasAttribute('inert')).toBe(false);
  });

  it('shows the text and one "OK" button, and takes the focus', () => {
    const { alert, box, ok } = build();
    alert.show(TEXT);

    expect(alert.isOpen()).toBe(true);
    expect(box.getAttribute('aria-modal')).toBe('true');
    const described = box.getAttribute('aria-describedby') as string;
    expect(alert.element.querySelector(`#${described}`)?.textContent).toBe(TEXT);
    expect(box.getAttribute('aria-labelledby')).toBe(described);
    expect([...alert.element.querySelectorAll('button')].map((button) => button.textContent)).toEqual(['OK']);
    expect(document.activeElement).toBe(ok);
  });

  it('makes what is under it inert while it is shown', () => {
    const { alert, under, ok } = build();
    alert.show(TEXT);
    expect(under.hasAttribute('inert')).toBe(true);
    ok.click();
    expect(under.hasAttribute('inert')).toBe(false);
  });

  it.each(['click', 'Enter', 'Escape'])('closes on %s and tells the caller once', (how) => {
    const { alert, ok, key } = build();
    const onClose = vi.fn();
    alert.show(TEXT, onClose);
    if (how === 'click') ok.click();
    else key(how);
    expect(alert.isOpen()).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);

    // Nothing more to close.
    ok.click();
    key('Escape');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps Escape and Enter to itself: what is under it does not see them', () => {
    const { alert, host, key } = build();
    const seen = vi.fn();
    host.addEventListener('keydown', seen);
    alert.show(TEXT);
    const escape = key('Escape');
    expect(seen).not.toHaveBeenCalled();
    expect(escape.defaultPrevented).toBe(true);

    alert.show(TEXT);
    key('Enter');
    expect(seen).not.toHaveBeenCalled();
  });

  it('does not close on a press on the dimmed layer', () => {
    const { alert } = build();
    const onClose = vi.fn();
    alert.show(TEXT, onClose);
    alert.element.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    alert.element.click();
    expect(alert.isOpen()).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps the focus on "OK" when Tab is pressed', () => {
    const { alert, ok, key } = build();
    alert.show(TEXT);
    expect(key('Tab').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(ok);
  });

  it('can be closed from outside without telling the caller', () => {
    const { alert, under } = build();
    const onClose = vi.fn();
    alert.show(TEXT, onClose);
    alert.close();
    expect(alert.isOpen()).toBe(false);
    expect(under.hasAttribute('inert')).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
  });
});
