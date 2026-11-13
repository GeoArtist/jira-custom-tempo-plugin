// Draws the extension's PNG icons from scripts/icon.svg. Run with `vp run icons` after
// the drawing changes; the PNG files are committed, so a normal build does not need this.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const SIZES = [16, 32, 48, 128];

const svg = await readFile(resolve('scripts/icon.svg'), 'utf8');
const source = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

const browser = await chromium.launch();
try {
  for (const size of SIZES) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}img{display:block}</style>` +
        `<img src="${source}" width="${size}" height="${size}">`,
    );
    const png = await page.screenshot({ omitBackground: true, type: 'png' });
    await writeFile(resolve(`extension/icons/icon-${size}.png`), png);
    await page.close();
    console.log(`extension/icons/icon-${size}.png`);
  }
} finally {
  await browser.close();
}
