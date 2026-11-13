import { describe, expect, it } from 'vite-plus/test';
import { presetPeriod } from '../../src/domain/period';
import { summarise } from '../../src/domain/summary';
import type { TicketRow } from '../../src/domain/worklog';
import { barPosition, createProgress } from '../../src/ui/progress';
import { FIXTURE_NOW } from '../fake-gateway';

const TZ = 'Europe/Warsaw';
const today = presetPeriod('today', TZ, FIXTURE_NOW);
const week = presetPeriod('thisWeek', TZ, FIXTURE_NOW);
const H = 3600;

const rows = (seconds: number): TicketRow[] =>
  seconds === 0
    ? []
    : [
        {
          ticket: { id: '1', key: 'AM-1', title: '', url: '' },
          entries: [{ id: '1', issueId: '1', startedMs: FIXTURE_NOW, durationSeconds: seconds }],
          totalSeconds: seconds,
        },
      ];

function show(seconds: number, period = today) {
  const progress = createProgress();
  progress.update(summarise(rows(seconds), period), period, rows(seconds), TZ);
  const track = progress.element.querySelector<HTMLElement>('.wt-progress__track') as HTMLElement;
  const cover = progress.element.querySelector<HTMLElement>('.wt-progress__cover') as HTMLElement;
  return { progress, track, cover, fill: cover.style.getPropertyValue('--wt-fill') };
}

describe('bar scale', () => {
  it('gives the first 8 hours 60% of the width and the rest up to 24h the other 40%', () => {
    expect(barPosition(0)).toBe(0);
    expect(barPosition(4 * H)).toBe(30);
    expect(barPosition(8 * H)).toBe(60);
    expect(barPosition(16 * H)).toBe(80);
    expect(barPosition(24 * H)).toBe(100);
    expect(barPosition(30 * H)).toBe(100);
  });
});

describe('progress bar', () => {
  it('labels the scale from 0h to 24h', () => {
    const { progress } = show(0);
    expect([...progress.element.querySelectorAll('.wt-progress__label')].map((l) => l.textContent)).toEqual([
      '0h',
      '4h',
      '8h',
      '12h',
      '16h',
      '24h',
    ]);
    expect(progress.element.querySelectorAll('.wt-progress__tick--norm')).toHaveLength(1);
  });

  it('fills to the logged time and writes nothing under the bar', () => {
    expect(show(4 * H)).toMatchObject({ fill: '30%' });
    expect(show(8 * H)).toMatchObject({ fill: '60%' });
    expect(show(0)).toMatchObject({ fill: '0%' });
    const { progress } = show(4 * H);
    // Only the bar with its scale and the hover tip (and the hidden chart): no caption, no
    // word about the norm.
    expect([...progress.element.children].filter((child) => !(child as HTMLElement).hidden)).toHaveLength(1);
    expect(progress.element.textContent).not.toMatch(/norm/i);
  });

  it('shows a muted total in the tip when nothing is logged', () => {
    const total = (seconds: number) =>
      show(seconds).progress.element.querySelector('.wt-progress__tip-total') as HTMLElement;
    expect(total(0).hasAttribute('data-zero')).toBe(true);
    expect(total(4 * H).hasAttribute('data-zero')).toBe(false);
  });

  it('shows a full bar above 24 hours', () => {
    expect(show(26 * H).fill).toBe('100%');
  });

  it('exposes the value to assistive technology', () => {
    const { track } = show(10 * H + 600);
    expect(track.getAttribute('role')).toBe('progressbar');
    expect(track.getAttribute('aria-valuemin')).toBe('0');
    expect(track.getAttribute('aria-valuemax')).toBe(String(24 * H));
    expect(track.getAttribute('aria-valuenow')).toBe(String(10 * H + 600));
    expect(track.getAttribute('aria-valuetext')).toBe('10h 10m');
    expect(track.getAttribute('aria-label')).toBe('Piątek 06-11-2026');
  });

  it('gives way to the bar chart for a period longer than one day', () => {
    const { progress } = show(38 * H, week);
    const bar = progress.element.querySelector<HTMLElement>('.wt-progress__bar') as HTMLElement;
    const chart = progress.element.querySelector<HTMLElement>('.wt-chart') as HTMLElement;
    expect(progress.element.classList.contains('wt-progress--chart')).toBe(true);
    expect(bar.hidden).toBe(true);
    expect(chart.hidden).toBe(false);
    expect(chart.querySelectorAll('.wt-chart__bar')).toHaveLength(7);
  });

  it('comes back for a single day', () => {
    const progress = createProgress();
    progress.update(summarise(rows(38 * H), week), week, rows(38 * H), TZ);
    progress.update(summarise(rows(4 * H), today), today, rows(4 * H), TZ);
    expect(progress.element.classList.contains('wt-progress--chart')).toBe(false);
    expect(progress.element.querySelector<HTMLElement>('.wt-progress__bar')?.hidden).toBe(false);
    expect(progress.element.querySelector<HTMLElement>('.wt-chart')?.hidden).toBe(true);
    expect(progress.element.querySelector('.wt-progress__track')?.getAttribute('role')).toBe('progressbar');
  });
});
