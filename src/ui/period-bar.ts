// Period selection in one framed box (FR-021 to FR-027, FR-055 to FR-057): three rows (one
// day, the presets, the "Od" / "Do" date-time range) between two tall buttons that move to
// the previous and the next period.
import { formatInputValue, formatIsoDate, parseInputValue } from '../domain/format';
import { isSameDate } from '../domain/local-date';
import {
  customPeriod,
  dayPeriod,
  isSingleDay,
  isWholeDays,
  PANEL_PRESETS,
  periodKind,
  PRESET_KIND,
  type PanelPreset,
  type Period,
  type PeriodPoint,
  type PresetName,
} from '../domain/period';
import { pl } from '../i18n/pl';
import { el, icon } from './dom';

export interface PeriodBarOptions {
  onPreset(preset: PresetName): void;
  onShift(direction: -1 | 1): void;
  onCustom(period: Period): void;
}

export interface PeriodBar {
  element: HTMLElement;
  update(period: Period): void;
}

const END_OF_DAY = 1439;

export function createPeriodBar(options: PeriodBarOptions): PeriodBar {
  const chips = new Map<PanelPreset, HTMLButtonElement>();
  const chip = (name: PanelPreset): HTMLButtonElement => {
    const button = el('button', {
      class: 'wt-chip',
      text: pl.presets[name],
      attrs: { type: 'button', 'aria-pressed': 'false' },
      on: { click: () => options.onPreset(name) },
    });
    chips.set(name, button);
    return button;
  };

  const arrow = (direction: -1 | 1): HTMLButtonElement =>
    el(
      'button',
      {
        class: 'wt-period__step',
        attrs: { type: 'button', 'aria-label': direction < 0 ? pl.previousPeriod : pl.nextPeriod },
        on: { click: () => options.onShift(direction) },
      },
      [icon(direction < 0 ? 'chevronLeft' : 'chevronRight')],
    );

  const dayInput = el('input', { class: 'wt-input', attrs: { type: 'date', id: 'wt-day' } });
  const fromInput = el('input', { class: 'wt-input', attrs: { type: 'datetime-local', id: 'wt-from' } });
  const toInput = el('input', { class: 'wt-input', attrs: { type: 'datetime-local', id: 'wt-to' } });
  const error = el('p', { class: 'wt-field-error', attrs: { role: 'alert', hidden: true } });

  let current: Period | null = null;

  function fill(period: Period): void {
    fromInput.value = formatInputValue(period.from.date, period.from.minuteOfDay);
    toInput.value = formatInputValue(period.to.date, period.to.minuteOfDay);
    // The day field names a day only when the period is exactly that whole day.
    dayInput.value = isSingleDay(period) && isWholeDays(period) ? formatIsoDate(period.from.date) : '';
  }

  function apply(from: PeriodPoint, to: PeriodPoint): void {
    const period = customPeriod(from, to);
    if (!period) {
      // "Od" later than "Do": explain, and keep the previous period (FR-027).
      error.textContent = pl.rangeInvalid;
      error.hidden = false;
      if (current) fill(current);
      return;
    }
    error.hidden = true;
    options.onCustom(period);
  }

  function onFromEdited(): void {
    const from = parseInputValue(fromInput.value);
    let to = parseInputValue(toInput.value);
    // An incomplete field is not a range yet; wait for the user to finish typing.
    if (!from || !to) return;
    // "Do" follows "Od" to the same day, so picking a start shows that one day (FR-056).
    if (!isSameDate(from.date, to.date)) to = { date: from.date, minuteOfDay: to.minuteOfDay };
    if (to.minuteOfDay < from.minuteOfDay) to = { date: from.date, minuteOfDay: END_OF_DAY };
    toInput.value = formatInputValue(to.date, to.minuteOfDay);
    apply(from, to);
  }

  function onToEdited(): void {
    const from = parseInputValue(fromInput.value);
    const to = parseInputValue(toInput.value);
    if (!from || !to) return;
    apply(from, to);
  }

  function onDayEdited(): void {
    const day = parseInputValue(`${dayInput.value}T00:00`);
    if (!day) return;
    error.hidden = true;
    options.onCustom(dayPeriod(day.date));
  }

  fromInput.addEventListener('change', onFromEdited);
  toInput.addEventListener('change', onToEdited);
  dayInput.addEventListener('change', onDayEdited);

  const field = (id: string, label: string, input: HTMLInputElement): HTMLLabelElement =>
    el('label', { class: 'wt-field', attrs: { for: id } }, [el('span', { text: label }), input]);

  const body = el('div', { class: 'wt-period__body' }, [
    el('div', { class: 'wt-period__row wt-period__days' }, [field('wt-day', pl.day, dayInput)]),
    el('div', { class: 'wt-period__row wt-period__presets' }, PANEL_PRESETS.map(chip)),
    el('div', { class: 'wt-period__row wt-period__range' }, [
      field('wt-from', pl.from, fromInput),
      field('wt-to', pl.to, toInput),
    ]),
    error,
  ]);
  // The steps stand at the two ends of the box, as tall as its three rows (FR-084).
  const element = el('section', { class: 'wt-period' }, [arrow(-1), body, arrow(1)]);

  return {
    element,
    update(period) {
      // A message about a rejected range stays until the next successful change.
      if (current && current !== period) error.hidden = true;
      current = period;
      fill(period);
      // Like radio buttons: the kind of the period stays selected while the arrows move it
      // to another day, week, month, or year (FR-085).
      const kind = periodKind(period);
      for (const [name, button] of chips) {
        const active = PRESET_KIND[name] === kind;
        button.setAttribute('aria-pressed', String(active));
        button.classList.toggle('wt-chip--active', active);
      }
    },
  };
}
