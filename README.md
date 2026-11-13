# Jira Custom Tempo

A browser extension that shows you your own logged work time on Jira Cloud. The interface is
in Polish.

On every Jira page a small button in the bottom-right corner shows today's total ("Dziś:
10h 10m"). Clicking it opens a panel with one row per ticket, every time entry, the sum per
ticket, and the total. For a single day the panel also shows a progress bar against the
8-hour norm; for a longer period, a bar chart of the days, months, or years.

## What you get

- **Launcher**: today's total on every Jira page, coloured like the progress bar. When you
  select another period in the panel it shows that one: a date, or "Zakres:" for a range.
  Drag it anywhere in the window; it remembers its place.
- **Panel**: any single day ("Dzień:"), the buttons "Dzień", "Tydzień", "Miesiąc", "Rok" for
  the current day, week, month, and year, round arrow buttons at both sides that move to the
  previous and next one, and a custom range with date and time. The table sorts by any column. Minimising the panel with the launcher or the minimise button keeps the
  selected period; the close button starts again on today. The panel hangs on the launcher:
  above it, or below it when the launcher is near the top. Drag its edges or its corner to set
  its height and width.
- **Chart**: a period longer than one day shows one bar per day (up to 31 days), per month,
  or per year (more than 24 months), in the colours of the progress bar. Point at a bar for
  its date and total. Zoom in with the buttons, the plus key, or Ctrl and the mouse wheel to
  see single days. Click a bar to see only its month or day; that uses the data already
  loaded and does not ask Jira again.
- **Back and forward**: "Cofnij" and "Ponów" beside "Odśwież" return to the views you were
  on, up to 10 steps back, without asking Jira again.
- **Refresh**: "Odśwież" reloads the data. Auto-refresh runs every 5 minutes by default.
- **Settings** (gear): the auto-refresh interval in minutes (0 turns it off) and the dark /
  light switch (default dark).

## How it works

- One content script that runs on `https://*.atlassian.net/*` (not on `/wiki/`).
- It reads the Jira REST API of the site you have open, with the Jira session you already have
  in the browser. It never asks for a password, a token, or an address.
- It only reads: every request is a `GET`. It asks the browser for no permissions.
- It draws inside its own isolated element, so it does not change Jira's look, and Jira does
  not change its look.
- No runtime dependencies and no UI framework. The whole script is about 20 kB gzipped.
- Source is TypeScript and SCSS. The toolchain is Vite+ (`vp`), which is mandatory for this
  project.

## Install in Chrome or Edge

1. `vp install`
2. `vp run build`
3. Open `chrome://extensions` or `edge://extensions` and turn on "Developer mode".
4. Choose "Load unpacked" and select the folder `dist/extension`.
5. Open your Jira Cloud site while signed in. The launcher appears in the bottom-right corner.

For people who only use the extension there is a short Polish guide, per browser, in
[BrowserInstallation.md](BrowserInstallation.md). Every build copies it into `dist/extension`,
so it is also inside the zip file.

After a code change: `vp run build`, press the extension's reload button on the extensions
page, and reload the Jira page.

To hand the extension to others, `vp run package` creates
`dist/jira-custom-tempo-<version>.zip`. That file can be uploaded to the Chrome Web Store or
Edge Add-ons, or distributed by a company browser policy. Browsers do not let ordinary users
install an extension from a file in any other way.

## Requirements

| Need | Version |
|------|---------|
| [Vite+](https://viteplus.dev) (`vp`) | 1.2 or later |
| Node.js | 22.18 or later (the project pins 22.23.5 in `.node-version`) |
| Chrome or Edge | A current version |

## Commands

| Command | Does |
|---------|------|
| `vp install` | Installs the pinned dependencies |
| `vp run dev` | Serves a stand-in Jira page with the add-on and a faked Jira at `http://127.0.0.1:5173/`. The sample data is dated 2 to 6 November 2026, so click "Tydzień" and then the previous arrow. |
| `vp test run` | Unit and UI tests. No Jira needed. |
| `vp check` | Format, lint, and type checks (`vp check --fix` repairs formatting) |
| `vp run build` | Builds `dist/extension` (with a copy of `BrowserInstallation.md`) and fails if it is over 100 kB gzipped |
| `vp run test:e2e` | Browser tests: the stand-in page at 320 px, 1280 px, and 1920 px, and the real extension loaded into Chromium |
| `vp run check` | All of the above: the full gate before a merge |
| `vp run package` | Builds and packs the zip file |

The browser tests need Chromium once: `npx playwright install chromium`.

## Status

The code, the automated tests, and the size check are complete. The tests load the real built
extension into Chromium and run it against a faked Jira Cloud address.

It has not yet been tried on a real Jira Cloud site. That is the one open step: checks X1 to
X6 in `specs/001-worktime-panel/research.md` and the walkthrough in
`specs/001-worktime-panel/quickstart.md`.

## Known limits

- Jira Cloud only, on addresses under `atlassian.net`. A site on a custom domain needs that
  domain added to `extension/manifest.json`.
- Tested in Chromium (Chrome, Edge). Firefox is not tested.
- Most mobile browsers do not support extensions.
- Settings are stored per browser and per Jira site.
- The launcher starts in the bottom-right corner and can cover a small part of the Jira page;
  drag it elsewhere.
- The panel follows the launcher through CSS anchor positioning (Chrome and Edge 125 or
  later). An older browser shows the panel above the launcher only.
- Jira search covers only the 1,000 most recent time entries of a ticket. Older entries on
  very busy tickets can be missed.
- A time entry saved a few seconds ago can be missing from one refresh and appear on the next.
- The "Od:" and "Do:" fields use the browser's own date-time control, so they follow the
  browser's date format.

## Project documents

Everything about the feature is in `specs/001-worktime-panel/`: `spec.md` (requirements),
`plan.md` (design), `research.md` (decisions and open checks), `data-model.md`, `contracts/`,
`quickstart.md`, and `tasks.md`. Project rules are in `.specify/memory/constitution.md`.
