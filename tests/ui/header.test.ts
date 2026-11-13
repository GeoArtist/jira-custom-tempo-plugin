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
    onSettings: vi.fn(),
    onMinimise: vi.fn(),
    onClose: vi.fn(),
  };
  const header = createHeader(handlers);
  return { header, handlers };
}

const byLabel = (root: HTMLElement, label: string) => root.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`);

describe('header', () => {
  it('has a minimise button between settings and close', () => {
    const { header, handlers } = build();
    const labels = [...header.element.querySelectorAll('.wt-header__actions button')].map(
      (button) => button.getAttribute('aria-label') ?? button.textContent,
    );
    expect(labels.slice(-3)).toEqual(['Ustawienia', 'Minimalizuj', 'Zamknij']);
    const minimise = byLabel(header.element, 'Minimalizuj') as HTMLButtonElement;
    expect(minimise.title).toBe('Minimalizuj');
    minimise.click();
    expect(handlers.onMinimise).toHaveBeenCalledTimes(1);
    expect(handlers.onClose).not.toHaveBeenCalled();
  });

  it('has back and forward before refresh, switched off until there is somewhere to go', () => {
    const { header, handlers } = build();
    const labels = [...header.element.querySelectorAll('.wt-header__actions button')].map(
      (button) => button.getAttribute('aria-label') ?? button.textContent,
    );
    expect(labels.slice(0, 3)).toEqual(['Cofnij', 'Ponów', 'Odśwież']);
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
    expect(total.style.getPropertyValue('--wt-total-from')).toBe('var(--wt-tone-blue)');
    expect(total.style.getPropertyValue('--wt-total-to')).toBe('var(--wt-tone-green)');
    expect(total.style.getPropertyValue('--wt-total-pct')).toBe('50%');

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

  it('disables refresh while a load is running', () => {
    const { header } = build();
    const refresh = [...header.element.querySelectorAll('button')].find((b) => b.textContent === 'Odśwież');
    header.setBusy(true);
    expect(refresh?.disabled).toBe(true);
    expect(refresh?.getAttribute('aria-busy')).toBe('true');
    header.setBusy(false);
    expect(refresh?.disabled).toBe(false);
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
    const labels = [...header.element.querySelectorAll('.wt-header__actions button')].map(
      (button) => button.getAttribute('aria-label') ?? button.textContent,
    );
    expect(labels).toEqual(['Cofnij', 'Ponów', 'Odśwież', 'Ustawienia', 'Minimalizuj', 'Zamknij']);
  });
});
