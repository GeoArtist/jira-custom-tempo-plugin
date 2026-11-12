# Quickstart: Worktime Panel

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

How to build, test, deploy, and validate the feature end to end. The commands below are the
ones the implementation must provide; they do not exist until the tasks are done.

## Prerequisites

| Need | Detail |
|------|--------|
| Node.js | 22.23.4 or later (or 24.22.1 or later). The Forge CLI refuses older versions. |
| Atlassian developer account | Free; needed for `forge login` and the developer console |
| Jira Cloud test site | A free development site with time tracking enabled |
| Test data | See "Test data" below |

## Commands

| Command | Does | Expected result |
|---------|------|-----------------|
| `npm ci` | Installs pinned dependencies | No changes to `package-lock.json` |
| `npm test` | Unit and UI tests (no Jira needed) | All pass |
| `npm run build` | Compiles TypeScript and SCSS into `dist/panel` and `dist/gadget`, then checks size | Build succeeds; each page reports at most 100 kB gzipped |
| `npm run test:e2e` | Browser tests of the built pages with faked Jira, at 360 px and 1280 px, dark and light | All pass |
| `npm run check` | Type check, tests, build, size check, browser tests: the full merge gate | All pass |
| `npx forge lint` | Validates `manifest.yml` | No errors |

## Deploy and install

```text
npx forge login
npx forge register                 # first time only: creates the app id
npm run build
npx forge deploy -e production
npx forge install -e production -s <your-site>.atlassian.net -p Jira
```

For other sites: Atlassian developer console → the app → Distribution → enable sharing → copy
the installation link. A site admin opens the link and installs. Nothing else is required
(FR-042).

After a change to scopes or modules: `npx forge install --upgrade`.

Local iteration: `npx forge tunnel` serves the local `dist/` to the installed app; rebuild and
reload the Jira page.

## Test data

On the test site, as the test user, log this time for today (start time, duration):

| Ticket | Entries |
|--------|---------|
| A, with a title longer than 150 characters | 07:00 3h 30m; 13:00 1h; 15:05 2h 25m |
| B | 10:30 45m; 17:30 1h |
| C | 11:00 1h 30m |

Also: one entry yesterday on ticket B; one entry by a *different* user today on ticket A.

Expected today: three rows in the order A, B, C; row sums 6h 55m, 1h 45m, 1h 30m; total
10h 10m.

## Validation scenarios

Open the panel from Jira's Apps menu → "Czas pracy".

| # | Story | Do | Expect |
|---|-------|----|--------|
| 1 | US1 | Open the panel | Dark theme; title `<Weekday> dd-mm-yyyy · 10h 10m`; rows A, B, C; A shows three entry lines in one row; "Suma czasu: 10h 10m" |
| 2 | US1 | Check ticket A | The other user's entry is absent; the long title wraps and nothing overflows |
| 3 | US1 | Click a ticket number | The Jira ticket opens |
| 4 | US2 | Look at the bar | Blue-to-green up to 8h, yellow beyond, caption "10h 10m · norma 8h osiągnięta"; both totals yellow |
| 5 | US3 | Click "Wczoraj" | One row (B); title shows yesterday's weekday and date |
| 6 | US3 | Click "Ten tydzień" | Entries show a `dd-mm` date; title shows the Monday-to-Sunday range; "Od" is Monday 00:00 and "Do" is Sunday 23:59; the bar is light gray with no fill and both totals are in the normal text colour |
| 6a | US3 | Set "Od" today 10:00 and "Do" today 12:00 | Only entries starting 10:00 to 12:00 are shown (B 10:30, C 11:00); total 2h 15m; title shows the weekday, date, and `10:00–12:00`; the bar is active |
| 7 | US3 | Set an "Od" date and time later than "Do" | Polish validation message; period unchanged |
| 8 | US3 | Press the previous arrow on "Dziś" | Yesterday is shown |
| 9 | US4 | Log 30m on ticket C in another tab, press "Odśwież" | Row C and all totals grow by 30m; the old data stayed visible while loading |
| 10 | US4 | Gear → set 1 → "Zapisz"; log more time; wait | Data updates within 1 minute without pressing anything |
| 11 | US4 | Gear → set 0 → "Zapisz"; log more time; wait 2 minutes | No update until "Odśwież" is pressed; after a page reload the field still shows 0 |
| 12 | US4 | Go offline, press "Odśwież" | Polish error with "Spróbuj ponownie"; previous data still shown |
| 13 | US6 | Gear → flip "Tryb ciemny" off | Light theme at once; "Anuluj" returns to dark |
| 14 | US6 | Flip to light → "Zapisz" → reload the page | Still light, with no dark flash on load |
| 15 | US5 | Add the gadget "Czas pracy: dziś" to a dashboard | Shows "Dziś: <total>" in the bar's colour; "Otwórz panel" opens the panel page |
| 15a | US5 | On any Jira page open the command palette and choose "Czas pracy: otwórz panel"; then try the keyboard shortcut | The panel opens as a pop-up with a close button; closing returns to the unchanged Jira page; the page opened from the Apps menu has no close button |
| 16 | all | Open the panel in a phone-width browser (360 px) | Everything usable; no horizontal scrolling |
| 17 | all | Select a period with no logged time | "Brak wpisów czasu w wybranym okresie."; totals 0h 00m; empty bar |

## Release check (constitution quality gates)

1. `npm run check` passes.
2. The size report shows each page at or below 100 kB gzipped.
3. No new dependency without a written justification in the plan.
4. Scenarios 1 to 17 (including 6a and 15a) pass on a clean Jira Cloud site after a fresh install, with a second,
   non-admin user, and with no step after installation.

References: requests and scopes in [contracts/jira-rest.md](contracts/jira-rest.md); texts and
formats in [contracts/ui.md](contracts/ui.md); settings in
[contracts/settings-storage.md](contracts/settings-storage.md); rules in
[data-model.md](data-model.md).
