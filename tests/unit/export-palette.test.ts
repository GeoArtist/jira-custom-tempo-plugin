// The colours of the XLSX file are those of the light appearance: one set of values, kept
// equal to the design tokens by this test (specs/003-table-export/research.md, R4).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';
import type { PeriodSummary, ProgressTone } from '../../src/domain/summary';
import { argb, mix, PALETTE, totalColour } from '../../src/export/palette';

const tokens = readFileSync(resolve(__dirname, '..', '..', 'src', 'styles', '_tokens.scss'), 'utf8');
const lightBlock = tokens.slice(tokens.indexOf(".wt-root[data-theme='light'] {"));
const darkBlock = tokens.slice(
  tokens.indexOf(".wt-root[data-theme='dark'] {"),
  tokens.indexOf(".wt-root[data-theme='light'] {"),
);

/** The value of a custom property in a block of the token file. */
function token(block: string, name: string): string {
  const match = new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(block);
  if (!match) throw new Error(`no token ${name}`);
  return (match[1] as string).toLowerCase();
}

function luminance(hex: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((at) => {
    const channel = Number.parseInt(hex.slice(at, at + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

const summary = (totalSeconds: number, colour: PeriodSummary['colour']): PeriodSummary => ({
  totalSeconds,
  progressActive: colour !== null,
  normSeconds: 8 * 3600,
  maxSeconds: 24 * 3600,
  fillFraction: 0,
  normReached: false,
  colour,
});

const TONES: ProgressTone[] = ['red', 'yellow', 'green', 'blue', 'violet'];

describe('palette of the sheet', () => {
  it('equals the tokens of the light appearance', () => {
    expect(PALETTE.text).toBe(token(lightBlock, '--wt-text'));
    expect(PALETTE.muted).toBe(token(lightBlock, '--wt-text-muted'));
    expect(PALETTE.link).toBe(token(lightBlock, '--wt-link'));
    expect(PALETTE.name).toBe(token(lightBlock, '--wt-person'));
    expect(PALETTE.headerFill).toBe(token(lightBlock, '--wt-accent'));
    expect(PALETTE.headerText).toBe(token(lightBlock, '--wt-on-accent'));
    for (const tone of TONES) expect(PALETTE.tones[tone]).toBe(token(lightBlock, `--wt-tone-${tone}`));
  });

  it('takes its border from the one value that is not a light token', () => {
    expect(PALETTE.border).toBe('#9aa3b2');
    expect(PALETTE.border).toBe(token(darkBlock, '--wt-text-muted'));
  });

  it('mixes two colours channel by channel', () => {
    expect(mix('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mix('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mix('#0a6199', '#146c43', 0.5)).toBe('#0f676e');
    expect(mix('#102030', '#302010', 0.25)).toBe('#182028');
  });

  it('gives a total the colour it has on screen', () => {
    expect(totalColour(summary(0, null))).toBe(PALETTE.muted);
    // A period longer than one day.
    expect(totalColour(summary(3600, null))).toBe(PALETTE.text);
    expect(totalColour(summary(60, { from: 'red', to: 'yellow', ratio: 0 }))).toBe(PALETTE.tones.red);
    expect(totalColour(summary(8 * 3600, { from: 'yellow', to: 'green', ratio: 1 }))).toBe(PALETTE.tones.green);
    expect(totalColour(summary(12 * 3600, { from: 'green', to: 'blue', ratio: 0.5 }))).toBe(
      mix(PALETTE.tones.green, PALETTE.tones.blue, 0.5),
    );
  });

  it('is readable on a white sheet: every text has a contrast of at least 4.5:1', () => {
    const white = '#ffffff';
    for (const colour of [
      PALETTE.text,
      PALETTE.muted,
      PALETTE.link,
      PALETTE.name,
      ...TONES.map((t) => PALETTE.tones[t]),
    ]) {
      expect(contrast(colour, white), colour).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(PALETTE.headerText, PALETTE.headerFill)).toBeGreaterThanOrEqual(4.5);
    // The mixes a total can take: red to yellow, yellow to green, green to blue, blue to violet.
    for (const [from, to] of [
      ['red', 'yellow'],
      ['yellow', 'green'],
      ['green', 'blue'],
      ['blue', 'violet'],
    ] as const) {
      for (const ratio of [0, 0.25, 0.5, 0.75, 1]) {
        const colour = mix(PALETTE.tones[from], PALETTE.tones[to], ratio);
        expect(contrast(colour, white), `${from}-${to} ${ratio}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('writes a colour as the file wants it', () => {
    expect(argb('#172033')).toBe('FF172033');
    expect(argb('#0c66e4')).toBe('FF0C66E4');
  });
});
