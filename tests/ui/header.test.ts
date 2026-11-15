import { describe, expect, it, vi } from 'vite-plus/test';
import { customPeriod, presetPeriod, type Period } from '../../src/domain/period';
import { summarise } from '../../src/domain/summary';
import type { TicketRow } from '../../src/domain/worklog';
import { createHeader } from '../../src/ui/header';
import { FIXTURE_NOW } from '../fake-gateway';

const TZ = 'Europe/Warsaw';
const today = presetPeriod('today', TZ, FIXTURE_NOW);

const rows = (seconds: number): TicketRow[] => [
  {
    ticket: { id: '1', key: 'AM-1', title: '', url: '' },
    entries: [{ id: '1', issueId: '1', startedMs: FIXTURE_NOW, durationSeconds: seconds }],
    totalSeconds: seconds,
  },
];

function build() {
  const handlers = {
    onBack: vi.fn(),
    onForward: vi.fn(),
    onRefresh: vi.fn(),
    onReset: vi.fn(),
    onSettings: vi.fn(),
    onMinimise: vi.fn(),
    onClose: vi.fn(),
  };
  const header = createHeader(handlers);
  return { header, handlers };
}

const byLabel = (root: HTMLElement, label: string) => root.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`);
/** The names of the buttons under `selector`, in document order. */
const names = (root: HTMLElement, selector: string) =>
  [...root.querySelectorAll(selector)].map((button) => button.getAttribute('aria-label') ?? button.textContent);

describe('header', () => {
  it('has the two window buttons in the title row', () => {
    const { header, handlers } = build();
    // Two rows: the title row and the toolbar (004 FR-001).
    expect([...header.element.children].map((child) => child.className)).toEqual([
      'wt-header__bar',
      'wt-header__tools',
    ]);
    const bar = header.element.querySelector('.wt-header__bar') as HTMLElement;
    expect([...bar.children].map((child) => child.className)).toEqual(['wt-header__text', 'wt-header__window']);
    // The name of the add-on is not here: it stands in the total row (004 FR-023).
    expect(header.element.querySelector('.wt-app')).toBeNull();
    expect(names(header.element, '.wt-header__window button')).toEqual(['Minimalizuj', 'Zamknij']);
    expect(header.element.querySelector('.wt-header__actions')).toBeNull();
    const minimise = byLabel(header.element, 'Minimalizuj') as HTMLButtonElement;
    expect(minimise.title).toBe('Minimalizuj');
    minimise.click();
    expect(handlers.onMinimise).toHaveBeenCalledTimes(1);
    expect(handlers.onClose).not.toHaveBeenCalled();
  });

  it('has back and forward before refresh, switched off until there is somewhere to go', () => {
    const { header, handlers } = build();
    expect(names(header.element, '.wt-header__tools button').slice(0, 3)).toEqual(['Cofnij', 'Ponów', 'Odśwież']);
    const back = byLabel(header.element, 'Cofnij') as HTMLButtonElement;
    const forward = byLabel(header.element, 'Ponów') as HTMLButtonElement;
    expect([back.disabled, forward.disabled, back.title, forward.title]).toEqual([true, true, 'Cofnij', 'Ponów']);

    header.setHistory(true, false);
    expect([back.disabled, forward.disabled]).toEqual([false, true]);
    back.click();
    forward.click();
    expect(handlers.onBack).toHaveBeenCalledTimes(1);
    expect(handlers.onForward).not.toHaveBeenCalled();

    // The keyboard does not lose its place when the button under it is switched off.
    document.body.appendChild(header.element);
    back.focus();
    header.setHistory(false, true);
    expect(document.activeElement).toBe(forward);
    header.element.remove();
  });

  it('shows the Polish weekday, the date, and the total', () => {
    const { header } = build();
    header.update(today, summarise(rows(6 * 3600), today));
    expect(header.element.querySelector('.wt-title')?.textContent).toBe('Piątek 06-11-2026 · 6h 00m');
    // The name line and the title: there is no line of text under them.
    expect(header.element.querySelector('.wt-header__text')?.children).toHaveLength(2);
  });

  it('mutes a total of zero and shows a pending total without a colour', () => {
    const { header } = build();
    const total = header.element.querySelector('.wt-total') as HTMLElement;
    header.update(today, summarise(rows(0), today));
    expect(total.textContent).toBe('0h 00m');
    expect(total.hasAttribute('data-zero')).toBe(true);
    header.update(today, summarise(rows(3600), today));
    expect(total.hasAttribute('data-zero')).toBe(false);
    header.update(today, null);
    expect(total.textContent).toBe('…');
    expect(total.hasAttribute('data-zero')).toBe(false);
  });

  it('shows the times for part of a day and the range for several days', () => {
    const { header } = build();
    const window = customPeriod(
      { date: today.from.date, minuteOfDay: 480 },
      { date: today.from.date, minuteOfDay: 720 },
    ) as Period;
    header.update(window, summarise([], window));
    expect(header.element.querySelector('.wt-title__text')?.textContent).toBe('Piątek 06-11-2026 08:00–12:00');

    const week = presetPeriod('thisWeek', TZ, FIXTURE_NOW);
    header.update(week, summarise([], week));
    expect(header.element.querySelector('.wt-title__text')?.textContent).toBe('02-11-2026 – 08-11-2026');
  });

  it('colours the total like the bar on a single day and not on a longer period', () => {
    const { header } = build();
    const total = header.element.querySelector<HTMLElement>('.wt-total') as HTMLElement;
    header.update(today, summarise(rows(4 * 3600), today));
    expect(total.style.getPropertyValue('--wt-total-from')).toBe('var(--wt-tone-red)');
    expect(total.style.getPropertyValue('--wt-total-to')).toBe('var(--wt-tone-yellow)');
    expect(total.style.getPropertyValue('--wt-total-pct')).toBe('100%');

    const week = presetPeriod('thisWeek', TZ, FIXTURE_NOW);
    header.update(week, summarise(rows(4 * 3600), week));
    expect(total.style.getPropertyValue('--wt-total-from')).toBe('');
  });

  it('has refresh and settings buttons that call their handlers', () => {
    const { header, handlers } = build();
    const refresh = [...header.element.querySelectorAll('button')].find((b) => b.textContent === 'Odśwież');
    refresh?.click();
    byLabel(header.element, 'Ustawienia')?.click();
    expect(handlers.onRefresh).toHaveBeenCalledOnce();
    expect(handlers.onSettings).toHaveBeenCalledOnce();
  });

  it('switches refresh off while a load is running, without taking it out of the keyboard order', () => {
    const { header, handlers } = build();
    document.body.appendChild(header.element);
    const refresh = [...header.element.querySelectorAll('button')].find(
      (b) => b.textContent === 'Odśwież',
    ) as HTMLButtonElement;
    refresh.focus();

    header.setBusy(true);
    expect(refresh.getAttribute('aria-disabled')).toBe('true');
    expect(refresh.getAttribute('aria-busy')).toBe('true');
    // Not `disabled`: the focus stays where it is (003 FR-030).
    expect(refresh.disabled).toBe(false);
    expect(document.activeElement).toBe(refresh);
    refresh.click();
    expect(handlers.onRefresh).not.toHaveBeenCalled();

    header.setBusy(false);
    expect(refresh.hasAttribute('aria-disabled')).toBe(false);
    expect(refresh.getAttribute('aria-busy')).toBe('false');
    expect(document.activeElement).toBe(refresh);
    refresh.click();
    expect(handlers.onRefresh).toHaveBeenCalledOnce();
    header.element.remove();
  });

  it('takes the focus from a control that lost its use: back, or refresh when back is off', () => {
    const { header } = build();
    document.body.appendChild(header.element);
    const back = byLabel(header.element, 'Cofnij') as HTMLButtonElement;
    const refresh = [...header.element.querySelectorAll('button')].find(
      (b) => b.textContent === 'Odśwież',
    ) as HTMLButtonElement;

    // The first view: nothing to go back to.
    header.focusFallback();
    expect(document.activeElement).toBe(refresh);

    // Also while a load runs.
    header.setBusy(true);
    (byLabel(header.element, 'Zamknij') as HTMLButtonElement).focus();
    header.focusFallback();
    expect(document.activeElement).toBe(refresh);

    header.setHistory(true, false);
    header.focusFallback();
    expect(document.activeElement).toBe(back);
    header.element.remove();
  });

  it('has a close button that calls its handler and takes the focus when the panel opens', () => {
    const { header, handlers } = build();
    document.body.appendChild(header.element);
    const close = byLabel(header.element, 'Zamknij');
    close?.click();
    expect(handlers.onClose).toHaveBeenCalledOnce();
    header.focus();
    expect(document.activeElement).toBe(close);
    header.element.remove();
  });

  it('names the person on a line of its own above the title', () => {
    const { header } = build();
    const text = header.element.querySelector('.wt-header__text') as HTMLElement;
    const person = text.querySelector('.wt-person') as HTMLElement;
    const title = text.querySelector('h1') as HTMLElement;

    // A sibling before the heading, not a part of it.
    expect([...text.children]).toEqual([person, title]);
    expect(title.contains(person)).toBe(false);
    expect(person.tagName).toBe('P');

    header.setPerson('Jan Kowalski');
    expect(person.textContent).toBe('Jan Kowalski');
    // The whole name is the tip, for when the line is cut short.
    expect(person.title).toBe('Jan Kowalski');

    header.update(today, summarise(rows(3600), today));
    expect(person.textContent).toBe('Jan Kowalski');
    expect(title.textContent).toBe('Piątek 06-11-2026 · 1h 00m');
  });

  it('keeps the name line in place when there is no name', () => {
    const { header } = build();
    header.setPerson('Anna Nowak');
    header.setPerson('');
    const person = header.element.querySelector('.wt-person') as HTMLElement;
    expect(person.isConnected || header.element.contains(person)).toBe(true);
    expect(person.textContent).toBe('');
    expect(person.hasAttribute('title')).toBe(false);
    expect(person.hidden).toBe(false);
  });

  it('leaves the action buttons as they were', () => {
    const { header } = build();
    header.setPerson('Maksymilian Aleksander Konstanty Brzeczyszczykiewicz-Wolski');
    expect(names(header.element, '.wt-header__window button')).toEqual(['Minimalizuj', 'Zamknij']);
    expect(names(header.element, '.wt-header__tools button')).toEqual([
      'Cofnij',
      'Ponów',
      'Odśwież',
      'Resetuj',
      'Ustawienia',
    ]);
  });

  it('has its buttons in the reading order', () => {
    const { header } = build();
    // The order of the elements is the order of the Tab key (004 FR-006).
    expect(names(header.element, 'button')).toEqual([
      'Minimalizuj',
      'Zamknij',
      'Cofnij',
      'Ponów',
      'Odśwież',
      'Resetuj',
      'Ustawienia',
    ]);
  });
});

describe('the reset button (spec 004)', () => {
  const byText = (root: HTMLElement, text: string) =>
    [...root.querySelectorAll('button')].find((button) => button.textContent === text) as HTMLButtonElement;

  it('has a sign and a label', () => {
    const { header } = build();
    const reset = byText(header.element, 'Resetuj');
    expect(reset.className).toBe('wt-button wt-button--reset');
    expect(reset.type).toBe('button');
    expect(reset.querySelectorAll('svg.wt-icon')).toHaveLength(1);
    expect([...reset.querySelectorAll('span')].map((span) => span.textContent)).toEqual(['Resetuj']);
    // The name comes from the label, as for refresh; the tip repeats it (FR-009).
    expect(reset.hasAttribute('aria-label')).toBe(false);
    expect(reset.title).toBe('Resetuj');
  });

  it('is switched off until there is something to reset', () => {
    const { header, handlers } = build();
    const reset = byText(header.element, 'Resetuj');
    expect(reset.disabled).toBe(true);
    reset.click();
    expect(handlers.onReset).not.toHaveBeenCalled();

    header.setResettable(true);
    expect(reset.disabled).toBe(false);
    reset.click();
    expect(handlers.onReset).toHaveBeenCalledOnce();

    header.setResettable(false);
    expect(reset.disabled).toBe(true);
  });

  it('hands the focus to refresh when it is switched off under it', () => {
    for (const busy of [false, true]) {
      const { header } = build();
      document.body.appendChild(header.element);
      const reset = byText(header.element, 'Resetuj');
      const refresh = byText(header.element, 'Odśwież');
      header.setResettable(true);
      // Refresh can hold the focus also while a load runs (003 FR-030).
      header.setBusy(busy);
      reset.focus();
      expect(document.activeElement).toBe(reset);

      header.setResettable(false);
      expect(document.activeElement).toBe(refresh);
      header.element.remove();
    }
  });

  it('leaves the focus alone when it is elsewhere, and when nothing changes', () => {
    const { header } = build();
    document.body.appendChild(header.element);
    const reset = byText(header.element, 'Resetuj');
    const close = byLabel(header.element, 'Zamknij') as HTMLButtonElement;
    header.setResettable(true);
    close.focus();
    header.setResettable(false);
    expect(document.activeElement).toBe(close);
    header.setResettable(false);
    expect([reset.disabled, document.activeElement === close]).toEqual([true, true]);

    header.setResettable(true);
    reset.focus();
    header.setResettable(true);
    expect([reset.disabled, document.activeElement === reset]).toEqual([false, true]);
    header.element.remove();
  });
});
