// The launcher's own behaviour around the name of another person (002 FR-033, FR-034, FR-041).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { presetPeriod } from '../../src/domain/period';
import { summarise } from '../../src/domain/summary';
import type { TicketRow } from '../../src/domain/worklog';
import { createLauncher, fitLauncher } from '../../src/ui/launcher';
import { FIXTURE_NOW } from '../fake-gateway';

const TZ = 'Europe/Warsaw';
const today = presetPeriod('today', TZ, FIXTURE_NOW);
const week = presetPeriod('thisWeek', TZ, FIXTURE_NOW);

const rows = (seconds: number): TicketRow[] => [
  {
    ticket: { id: '1', key: 'AM-1', title: '', url: '' },
    entries: [{ id: '1', issueId: '1', startedMs: FIXTURE_NOW, durationSeconds: seconds }],
    totalSeconds: seconds,
  },
];

function build() {
  const launcher = createLauncher({ onToggle: vi.fn(), onMove: vi.fn() });
  document.body.appendChild(launcher.element);
  const part = (name: string) => launcher.element.querySelector<HTMLElement>(`.wt-launcher__${name}`) as HTMLElement;
  return { launcher, element: launcher.element, part };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('launcher and the selected person', () => {
  it('carries no name for the signed-in user', () => {
    const { launcher, element, part } = build();
    launcher.show(summarise(rows(6 * 3600), today), today);
    expect(element.textContent).toBe('Dziś: 6h 00m');
    expect(part('person').hidden).toBe(true);
    expect(part('sep').hidden).toBe(true);
    expect(element.hasAttribute('title')).toBe(false);
  });

  it('shows the name of another person before the label, then a middle dot', () => {
    const { launcher, element, part } = build();
    launcher.setPerson('Anna Nowak');
    launcher.show(summarise(rows(6 * 3600), today), today);

    expect(element.textContent).toBe('Anna Nowak · Dziś: 6h 00m');
    const order = [...element.children].map((child) => child.className);
    expect(order).toEqual([
      'wt-launcher__dot',
      'wt-launcher__person',
      'wt-launcher__sep',
      'wt-launcher__label',
      'wt-total',
    ]);
    expect(part('person').hidden).toBe(false);
    // The dot between them is decoration for a screen reader.
    expect(part('sep').getAttribute('aria-hidden')).toBe('true');
    // The whole name, for when it is cut with an ellipsis.
    expect(element.getAttribute('title')).toBe('Anna Nowak');
  });

  it('reads as before again when the signed-in user is back', () => {
    const { launcher, element, part } = build();
    launcher.setPerson('Anna Nowak');
    launcher.show(summarise(rows(3600), today), today);
    launcher.setPerson(null);
    expect(element.textContent).toBe('Dziś: 1h 00m');
    expect(part('person').hidden).toBe(true);
    expect(part('person').textContent).toBe('');
    expect(element.hasAttribute('title')).toBe(false);
  });

  it('shows a dash, never an older total, while the total is not known', () => {
    const { launcher, element } = build();
    launcher.show(summarise(rows(10 * 3600), today), today);
    expect(element.style.getPropertyValue('--wt-total-from')).not.toBe('');

    launcher.setPerson('Anna Nowak');
    launcher.showPending(today);
    expect(element.textContent).toBe('Anna Nowak · Dziś: –');
    // No colour of the progress bar either: it belonged to the total before.
    expect(element.style.getPropertyValue('--wt-total-from')).toBe('');
    expect(element.hasAttribute('data-zero')).toBe(false);

    launcher.showPending(week);
    expect(element.textContent).toBe('Anna Nowak · Zakres: –');
  });

  it('explains a failed load in the tip and gives the name back to it afterwards', () => {
    const { launcher, element } = build();
    launcher.setPerson('Anna Nowak');
    launcher.showError(today);
    expect(element.textContent).toBe('Anna Nowak · Dziś: –');
    expect(element.getAttribute('title')).toBe('Nie udało się pobrać danych z Jiry.');

    launcher.show(summarise(rows(3600), today), today);
    expect(element.getAttribute('title')).toBe('Anna Nowak');

    launcher.showError(today);
    launcher.showPending(today);
    expect(element.getAttribute('title')).toBe('Anna Nowak');
  });

  it('needs no new place on a page without layout', () => {
    const { element } = build();
    expect(fitLauncher(element)).toBeNull();
  });
});
