import { describe, expect, it, vi } from 'vite-plus/test';
import { presetPeriod } from '../../src/domain/period';
import { createPeriodBar } from '../../src/ui/period-bar';
import { FIXTURE_NOW } from '../fake-gateway';

const TZ = 'Europe/Warsaw';
const today = presetPeriod('today', TZ, FIXTURE_NOW);
const week = presetPeriod('thisWeek', TZ, FIXTURE_NOW);

function build() {
  const handlers = { onPreset: vi.fn(), onShift: vi.fn(), onCustom: vi.fn() };
  const bar = createPeriodBar(handlers);
  const root = bar.element;
  const from = root.querySelector<HTMLInputElement>('#wt-from') as HTMLInputElement;
  const to = root.querySelector<HTMLInputElement>('#wt-to') as HTMLInputElement;
  const day = root.querySelector<HTMLInputElement>('#wt-day') as HTMLInputElement;
  const chip = (text: string) =>
    [...root.querySelectorAll<HTMLButtonElement>('.wt-chip')].find((c) => c.textContent === text);
  const edit = (input: HTMLInputElement, value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('change'));
  };
  const error = () => root.querySelector<HTMLElement>('.wt-field-error') as HTMLElement;
  return { bar, root, handlers, from, to, day, chip, edit, error };
}

describe('period bar', () => {
  it('offers three rows: the day with the arrows, the presets, and the range', () => {
    const { root } = build();
    const texts = (selector: string) => [...root.querySelectorAll(selector)].map((c) => c.textContent);
    const rows = [...root.querySelectorAll('.wt-period__row')];
    expect(rows).toHaveLength(3);
    expect(texts('.wt-period__days .wt-chip:not(.wt-chip--arrow)')).toEqual([]);
    expect(texts('.wt-period__presets .wt-chip')).toEqual(['Wczoraj', 'Ten tydzień', 'Ten miesiąc', 'Ten rok']);
    // The arrows open and close the row of the day.
    const days = rows[0] as Element;
    expect(days.firstElementChild?.getAttribute('aria-label')).toBe('Poprzedni okres');
    expect(days.lastElementChild?.getAttribute('aria-label')).toBe('Następny okres');
    expect(root.querySelector('label[for="wt-day"]')?.textContent).toBe('Dzień:');
    expect(root.querySelector<HTMLInputElement>('#wt-day')?.type).toBe('date');
    expect(root.querySelector('[aria-label="Poprzedni okres"]')).not.toBeNull();
    expect(root.querySelector('[aria-label="Następny okres"]')).not.toBeNull();
    expect(root.querySelector('label[for="wt-from"]')?.textContent).toBe('Od:');
    expect(root.querySelector('label[for="wt-to"]')?.textContent).toBe('Do:');
  });

  it('marks the active preset and fills "Od" 00:00 and "Do" 23:59', () => {
    const { bar, root, chip, from, to, day } = build();
    bar.update(today);
    // Today has no button: the day field names it.
    expect(root.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);
    expect(day.value).toBe('2026-11-06');
    expect(chip('Wczoraj')?.getAttribute('aria-pressed')).toBe('false');
    expect(from.value).toBe('2026-11-06T00:00');
    expect(to.value).toBe('2026-11-06T23:59');

    bar.update(week);
    expect(day.value).toBe('');
    expect(chip('Ten tydzień')?.getAttribute('aria-pressed')).toBe('true');
    expect(from.value).toBe('2026-11-02T00:00');
    expect(to.value).toBe('2026-11-08T23:59');
  });

  it('highlights no preset for a custom range', () => {
    const { bar, root } = build();
    bar.update({ ...today, preset: 'custom' });
    expect(root.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);
  });

  it('reports a preset click and arrow clicks', () => {
    const { root, chip, handlers } = build();
    chip('Wczoraj')?.click();
    root.querySelector<HTMLButtonElement>('[aria-label="Poprzedni okres"]')?.click();
    root.querySelector<HTMLButtonElement>('[aria-label="Następny okres"]')?.click();
    expect(handlers.onPreset).toHaveBeenCalledWith('yesterday');
    expect(handlers.onShift.mock.calls).toEqual([[-1], [1]]);
  });

  it('reports a custom range with date and time', () => {
    const { bar, from, to, edit, handlers } = build();
    bar.update(today);
    edit(from, '2026-11-06T08:00');
    edit(to, '2026-11-06T12:00');
    expect(handlers.onCustom).toHaveBeenLastCalledWith({
      from: { date: { year: 2026, month: 11, day: 6 }, minuteOfDay: 480 },
      to: { date: { year: 2026, month: 11, day: 6 }, minuteOfDay: 720 },
      preset: 'custom',
    });
  });

  it('moves "Do" to the day of "Od" when "Od" is changed to another day', () => {
    const { bar, from, to, edit, error, handlers } = build();
    bar.update(week);
    edit(from, '2026-11-04T00:00');
    expect(to.value).toBe('2026-11-04T23:59');
    expect(handlers.onCustom).toHaveBeenLastCalledWith({
      from: { date: { year: 2026, month: 11, day: 4 }, minuteOfDay: 0 },
      to: { date: { year: 2026, month: 11, day: 4 }, minuteOfDay: 1439 },
      preset: 'custom',
    });

    // Also when the new "Od" is later than "Do": no message, "Do" follows.
    bar.update(today);
    edit(from, '2026-11-09T08:00');
    expect(to.value).toBe('2026-11-09T23:59');
    expect(error().hidden).toBe(true);
  });

  it('moves "Do" to the end of the day when "Od" passes it on the same day', () => {
    const { bar, from, to, edit, handlers } = build();
    bar.update(today);
    edit(to, '2026-11-06T12:00');
    edit(from, '2026-11-06T14:00');
    expect(to.value).toBe('2026-11-06T23:59');
    expect(handlers.onCustom).toHaveBeenLastCalledWith({
      from: { date: { year: 2026, month: 11, day: 6 }, minuteOfDay: 840 },
      to: { date: { year: 2026, month: 11, day: 6 }, minuteOfDay: 1439 },
      preset: 'custom',
    });
  });

  it('selects one whole day with the day field and shows it there', () => {
    const { bar, day, edit, handlers } = build();
    bar.update(today);
    expect(day.value).toBe('2026-11-06');
    edit(day, '2026-10-15');
    expect(handlers.onCustom).toHaveBeenLastCalledWith({
      from: { date: { year: 2026, month: 10, day: 15 }, minuteOfDay: 0 },
      to: { date: { year: 2026, month: 10, day: 15 }, minuteOfDay: 1439 },
      preset: 'custom',
    });

    // A week, or a part of a day, is not one whole day: the field is empty.
    bar.update(week);
    expect(day.value).toBe('');
    bar.update({ ...today, to: { ...today.to, minuteOfDay: 720 }, preset: 'custom' });
    expect(day.value).toBe('');
  });

  it('rejects "Do" earlier than "Od" with a Polish message and keeps the previous period', () => {
    const { bar, from, to, edit, error, handlers } = build();
    bar.update(today);
    edit(to, '2026-11-05T08:00');
    expect(handlers.onCustom).not.toHaveBeenCalled();
    expect(error().hidden).toBe(false);
    expect(error().textContent).toBe('Początek „Od” nie może być późniejszy niż koniec „Do”.');
    expect(from.value).toBe('2026-11-06T00:00');
    expect(to.value).toBe('2026-11-06T23:59');
  });

  it('clears the message once a valid period is shown', () => {
    const { bar, to, edit, error } = build();
    bar.update(today);
    edit(to, '2026-11-05T08:00');
    expect(error().hidden).toBe(false);
    bar.update(week);
    expect(error().hidden).toBe(true);
  });

  it('waits while a field is incomplete', () => {
    const { bar, from, edit, error, handlers } = build();
    bar.update(today);
    edit(from, '');
    expect(handlers.onCustom).not.toHaveBeenCalled();
    expect(error().hidden).toBe(true);
  });
});
