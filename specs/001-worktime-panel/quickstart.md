# Quickstart: Worktime Panel

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

How to build, test, install, and validate the browser extension end to end.

## Prerequisites

| Need | Detail |
|------|--------|
| Vite+ (`vp`) | 1.2 or later; the mandatory toolchain of the project |
| Node.js | 22.18 or later. The project pins 22.23.5 in `.node-version`. |
| Chrome or Edge | To install the extension |
| A Jira Cloud site | Only for the manual validation at the end; you must be able to sign in and log time |

## Commands

Vite+ (`vp`) is the mandatory toolchain (constitution, Technical Constraints): use the `vp`
commands shown here.

| Command | Does | Expected result |
|---------|------|-----------------|
| `vp install` | Installs pinned dependencies | No changes to `package-lock.json` |
| `vp run dev` | Serves a stand-in Jira page with the add-on and a faked Jira at `http://127.0.0.1:5173/` | The launcher shows in the corner; "Tydzień" and then the previous arrow show the sample data (2 to 6 November 2026) |
| `vp test run` | Unit and UI tests (no Jira needed) | All pass |
| `vp check` | Format, lint, and type checks (`--fix` repairs formatting) | No findings |
| `vp run build` | Builds the extension into `dist/extension/` and checks its size | `content.js`, `manifest.json`, `icons/`, and a copy of `BrowserInstallation.md`; at most 100 kB gzipped |
| `vp run icons` | Draws `extension/icons/icon-*.png` from `scripts/icon.svg` | four PNG files (16, 32, 48, 128 px); needed only after the drawing changes |
| `vp run test:e2e` | Builds, then runs the browser tests: the stand-in page at 320 px, 1280 px, and 1920 px, and the real extension in Chromium | All pass |
| `vp run check` | All of the above: the full merge gate | All pass |
| `vp run package` | Builds and packs `dist/jira-custom-tempo-<version>.zip` | A zip with `manifest.json` at its top level |

The browser tests need Chromium once: `npx playwright install chromium`.

## Install in the browser

For testing, without a store:

1. `vp run build`
2. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge).
3. Turn on "Developer mode".
4. Choose "Load unpacked" and select the folder `dist/extension`.
5. Open your Jira Cloud site (an address under `atlassian.net`) while signed in.

After a code change: `vp run build`, then press the reload button of the extension on the
extensions page, and reload the Jira page.

For other people: `vp run package` produces the zip that browser stores (Chrome Web Store,
Edge Add-ons) accept, and that a company policy can distribute. Nothing has to be set up after
installing (FR-042).

## Test data

On a Jira Cloud site, signed in as yourself, log this time for today (start time, duration):

| Ticket | Entries |
|--------|---------|
| A, with a title longer than 150 characters | 07:00 3h 30m; 13:00 1h; 15:05 2h 25m |
| B | 10:30 45m; 17:30 1h |
| C | 11:00 1h 30m |

Also: one entry yesterday on ticket B; and, if you can, one entry by a *different* user today
on ticket A.

Expected today: three rows in the order A, B, C; row sums 6h 55m, 1h 45m, 1h 30m; total
10h 10m.

## Validation scenarios

Open any page of the Jira site while signed in.

| # | Story | Do | Expect |
|---|-------|----|--------|
| 1 | US5 | Look near the bottom-right corner | The launcher shows "Dziś: 10h 10m" with a yellow dot and total; the Jira page works as before |
| 2 | US5 | Click the launcher | The panel opens above it, in the dark theme, on today |
| 3 | US1 | Look at the panel | Title `<Weekday> dd-mm-yyyy · 10h 10m`; rows A, B, C; A shows three entry lines in one row; "Suma czasu: 10h 10m" |
| 4 | US1 | Check ticket A | The other user's entry is absent; the long title wraps and nothing overflows |
| 5 | US1 | Click a ticket number | The Jira ticket opens in a new tab |
| 6 | US2 | Look at the bar | Blue-to-green up to 8h, yellow beyond; nothing is written under the bar; both totals yellow |
| 7 | US3 | Press the previous arrow on today | One row (B); title shows yesterday's weekday and date; the launcher shows yesterday's date and total |
| 8 | US3 | Click "Tydzień" | Entries show a `dd-mm` date; title shows the Monday-to-Sunday range; "Od" is Monday 00:00 and "Do" is Sunday 23:59; the bar is light gray with no fill and both totals are in the normal text colour |
| 9 | US3 | Set "Od" today 10:00 and "Do" today 12:00 | Only entries starting 10:00 to 12:00 are shown (B 10:30, C 11:00); total 2h 15m; title shows the weekday, date, and `10:00–12:00`; the bar is active |
| 10 | US3 | Set a "Do" date and time earlier than "Od" | Polish validation message; period unchanged |
| 11 | US3 | Press the previous arrow on today | Yesterday is shown |
| 12 | US4 | Log 30m on ticket C in another tab, press "Odśwież" | Row C, all totals, and the launcher grow by 30m; the old rows stayed visible under a spinner while loading |
| 13 | US4 | Gear → set 1 → "Zapisz"; log more time; wait | Panel and launcher update within 1 minute without pressing anything |
| 14 | US4 | Gear → set 0 → "Zapisz"; log more time; wait 2 minutes | No update until "Odśwież" is pressed; after a page reload the field still shows 0 |
| 15 | US4 | Go offline, press "Odśwież" | Polish error with "Spróbuj ponownie"; previous data still shown |
| 16 | US6 | Gear → flip "Tryb ciemny" off | Light theme at once; "Anuluj" returns to dark; Jira's own look does not change |
| 17 | US6 | Flip to light → "Zapisz" → reload the page | The launcher appears light straight away |
| 18 | US5 | Type digits in the interval field and in the date fields | Jira does not react (no "create" dialog, no navigation) |
| 19 | US5 | Hide with the × button, with Escape, and with the launcher | The panel disappears each time; the Jira page is unchanged |
| 20 | US5 | Go to another Jira view (board, backlog, a ticket) | The launcher stays |
| 21 | US5 | Sign out of Jira, or open the login page | The add-on shows nothing |
| 22 | all | Make the browser window narrow (about 320 to 400 px) | Launcher and panel fit; everything usable; no horizontal scrolling |
| 23 | all | Select a period with no logged time | "Brak wpisów czasu w wybranym okresie."; totals 0h 00m; empty bar |

| 24 | US3 | Look at the period box | One light frame, three rows between the two arrow buttons: "Dzień:"; then "Dzień", "Tydzień", "Miesiąc", "Rok"; then "Od:" and "Do:" |
| 25 | US3 | Click "Tydzień", then change "Od" to another day of that week | "Do" jumps to the same day 23:59; that single day is shown; the bar is active again |
| 26 | US3 | Pick a day in "Dzień:" | That whole day is shown; "Od" and "Do" show it from 00:00 to 23:59 |
| 27 | US3 | Click "Rok", then the previous arrow | 01-01 to 31-12 of this year, then of the previous year ("Rok" stays selected); the chart shows twelve months |
| 28 | US2 | Move the pointer over the progress bar | A small two-line tip: the period as in the title, and "Suma czasu:" with the total in the bar colour |
| 29 | US1 | Click each column header twice | The rows sort by that column, ascending then descending; a triangle shows the direction |
| 30 | US1 | Select a period with one or two rows | The panel keeps its height; the rows are at the top, the space below is empty, "Suma czasu:" stays at the bottom right in the colour of its value |
| 31 | US5 | Go to yesterday with the previous arrow, click the launcher twice; then press Escape and click the launcher | Yesterday is still shown each time |
| 32 | US5 | Go to yesterday, press ×, click the launcher | Today is shown |
| 33 | US5 | Move the pointer over the launcher | Its background and border change colour |
| 34 | US6 | Open the settings | A line under "Ustawienia"; the switch stands after "Tryb ciemny" with a sun and a moon, and its knob slides when clicked |
| 35 | US5 | Look at the browser's extensions page and toolbar | The extension shows the clock-and-timeline icon |

| 36 | US5 | Look at the launcher on a Jira page that has Jira's own button in the corner | The launcher stands to the left of it; nothing overlaps |
| 37 | US5 | Go to yesterday, then select "Tydzień", then minimise | The launcher shows yesterday's date with its total, then "Zakres:" with the week's total, and keeps it while minimised |
| 38 | US5 | Press × and look at the launcher | "Dziś:" with today's total again |
| 39 | all | Select a period with no logged time | "0h 00m" is gray in the title, in the whole "Suma czasu:" row, and on the launcher with its dot |
| 40 | all | Move the pointer over buttons and presets, then over the selected preset | Each gets a tinted background and a blue border; the selected one turns from filled to outlined |
| 41 | US2 | Look under the progress bar and at the header | No text under the bar, nothing about the norm, no subtitle; the bar stands midway between the period box and the table |
| 42 | US6 | Open the settings in the dark and in the light theme | The knob of the switch is blue and sits flush at the right (dark) and at the left (light) |
| 43 | US3 | Look at the period box | All three rows are centred; the arrows stand right next to the days |
| 44 | all | Drag the top edge of the panel up and down, reload the page, double-click the edge | The height follows the pointer, not below one visible row; it is kept after the reload; the double click returns to half of the window |

| 45 | US5 | Look at the launcher next to Jira's own corner button | Their middles are at the same height |
| 46 | US5 | Open the panel | Its bottom edge is just above the launcher and its right edge in line with the launcher's |
| 47 | US5 | Drag the launcher to the middle of the window, then click it | It follows the pointer and the panel moves with it; the drag itself does not open or close the panel; the click does |
| 48 | US5 | Drag the launcher to the top of the window with the panel open | The panel goes below the launcher, hanging from its bottom-right corner; the height grip is now on the panel's bottom edge |
| 49 | US5 | Drag the launcher to the bottom-left corner | The panel stands above it with the left edges in line; the width grip is now on the right edge |
| 50 | US5 | Reload the page | The launcher is where it was left |
| 51 | US5 | Focus the launcher, press Shift with an arrow key | It moves one step that way |
| 52 | US5 | Minimise the panel with the launcher and look at the launcher | No blinking text cursor in it |
| 53 | all | Drag the panel's left edge, then its top-left corner; reload; double-click the corner | The width follows, not below 640 px; the corner changes both; the size is kept after the reload; the double click returns to 800 px by half of the window |
| 54 | all | Make the panel as narrow as it goes | Ticket numbers, entry times, and sums stay on one line each; the period box keeps three rows |
| 55 | US3 | Look at the period box; go to another day and back to today | No "Dziś", "Przedwczoraj", or "Poprzedni …" buttons; today comes back with the "Dzień:" field, the next arrow, or × and the launcher |
| 56 | US6 | Open the settings in the dark theme | The moon is in the middle of the blue knob |
| 57 | US6 | Open the settings and move the pointer over "Odświeżaj co" and over "min" | No explanation is written under the field; the tooltip "0 = automatyczne odświeżanie wyłączone (domyślnie 5 min)" appears |
| 58 | US5 | Make the panel as tall as it goes, then drag the launcher to the middle of the window, to each corner, and to each edge | The panel and the launcher are always wholly inside the window and never cover each other; in the middle the panel gets lower by itself and scrolls; back in a corner it has the chosen height again |
| 59 | US5 | Put the launcher at the top left, open the panel, make the browser window narrow, then wide again; do the same with its height | The panel stays attached to the launcher the whole time; when the window is wide again the panel is back in line with the launcher's edge |
| 60 | US3 | Select "Tydzień" | A bar chart stands where the progress bar was: seven bars that do not touch, days under them, hours at the side, a dashed line at 8h; the panel keeps its size |
| 61 | US3 | Compare the bars with the days in the table | Each bar is as tall as the time of its day; a day up to 8h is blue to green, a longer one yellow to red; an empty day has no bar |
| 62 | US3 | Move the pointer over a bar, then over an empty day | The bar gets brighter and a tip shows the day and "Suma czasu:" with its total; the empty day shows 0h 00m |
| 63 | US3 | Select "Miesiąc", then "Rok" | A bar per day of the month; then twelve bars, one per month, with "Przybliż" and "Oddal" at the right |
| 64 | US3 | Press "Przybliż" on the year, scroll the chart, press "Oddal" | 365 bars of days that scroll sideways around the same part of the year; then twelve months again |
| 65 | US3 | Hold Ctrl and turn the mouse wheel over a month | The chart zooms to days with that month under the pointer |
| 66 | US3 | Set "Od:" and "Do:" three years apart | A bar per year; zooming in shows months, then days |
| 67 | US3 | Focus the chart with Tab, press the arrow keys, then plus and minus | The tip walks through the bars; plus and minus zoom |
| 68 | US3 | Go back to a single day | The progress bar is back |
| 69 | US3 | Select "Rok" and click the bar of a month, with the browser's network tab open | The chart shows the days of that month, "Od:" and "Do:" its first and last day, the table only its entries; at once, with no spinner and no request to Jira |
| 70 | US3 | Click the bar of a day in that month | The title names that day, the progress bar is back, the table shows only that day's entries; again no request |
| 71 | US3 | Click the bar of a day without time | The message "Brak wpisów czasu w wybranym okresie." for that day, total 0h 00m |
| 72 | US3 | After a click on a bar press "Odśwież" | The period stays; Jira is asked for it |
| 73 | US3 | Focus the chart with Tab, choose a bar with the arrows, press Enter | The same as a click on that bar |
| 79 | US3 | Look at the period box, then press its left and right button | A round button with an arrow right beside the rows at each side (not at the ends of the frame), at the middle of the three rows; they move to the previous and the next period and react to the pointer |
| 80 | US3 | Open the panel; press the previous arrow three times; press "Dzień" | "Dzień" is selected from the start and stays selected on every day; the press returns to today |
| 81 | US3 | Press "Miesiąc", the previous arrow twice, then "Miesiąc" again | "Miesiąc" stays selected on each month; the press returns to the current month |
| 82 | US3 | Press "Rok", then "Tydzień", then "Dzień", with the network tab open; then "Dzień" once more | The week and the day appear at once with no request; the second press on "Dzień" asks Jira |
| 83 | US3 | Set "Od:" and "Do:" to three days | No button is selected |
| 84 | US5 | Go to another period, press the button with the low line between the gear and × | The panel disappears; the launcher keeps that period; a click on the launcher shows the same period, with "Cofnij" still enabled |
| 74 | US3 | Open the panel and look at the buttons before "Odśwież" | "Cofnij" and "Ponów" (curved arrows) are both pale and do not react to the pointer |
| 75 | US3 | Select "Rok", click a month, click a day; then press "Cofnij" three times, with the network tab open | The month, the year, and today come back in turn, at once, with no request; "Cofnij" is disabled at the end and "Ponów" is not |
| 76 | US3 | Press "Ponów" twice, then press the previous arrow | The year and the month return; after that the button "Ponów" is disabled |
| 77 | US3 | Press the previous arrow twelve times, then "Cofnij" until it is disabled | Ten steps back, not twelve |
| 78 | US3 | Move the pointer over "Cofnij" while it is enabled; minimise and reopen the panel; close it with × and reopen | It reacts like "Odśwież"; the steps survive minimising; after × both buttons are disabled |

## Release check (constitution quality gates)

1. `vp run check` passes.
2. The size report shows the extension at or below 100 kB gzipped.
3. No new dependency without a written justification in the plan.
4. `dist/extension` is loaded into a clean browser profile, a Jira Cloud site is opened while
   signed in, and scenarios 1 to 68 pass with no step after installing.

References: requests in [contracts/jira-rest.md](contracts/jira-rest.md); texts and formats in
[contracts/ui.md](contracts/ui.md); settings in
[contracts/settings-storage.md](contracts/settings-storage.md); rules in
[data-model.md](data-model.md); open checks on a real site in [research.md](research.md).
