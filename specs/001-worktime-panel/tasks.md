---

description: "Task list for the Worktime Panel feature"
---

# Tasks: Worktime Panel (Jira Custom Tempo)

**Input**: Design documents from `/specs/001-worktime-panel/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (jira-rest.md, settings-storage.md, ui.md), quickstart.md

**Tests**: INCLUDED. The constitution (Principle V) requires that every behavior ships with automated tests in the same change, runnable with one command and without a live Jira. Test tasks sit next to the code they cover; a story is not done until its tests pass.

**Organization**: Tasks are grouped by user story so each story can be built, tested, and shown on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on unfinished tasks)
- **[Story]**: Which user story the task belongs to (US1 to US6)
- **MANUAL** in a description: needs a person with an Atlassian account and a Jira Cloud test site; an agent cannot complete it alone

## Path Conventions

Single front-end project at the repository root: `src/`, `tests/`, `scripts/`, `manifest.yml`. Build output in `dist/` (not committed). Source is TypeScript and SCSS only; no hand-written `.js` or `.css` files (constitution).

## Rules that apply to every task

- All visible text comes from `src/i18n/pl.ts`; exact strings and formats are in `specs/001-worktime-panel/contracts/ui.md`.
- No inline styles or scripts in HTML. Run-time values are set with `element.style.setProperty('--wt-…', value)` (research R7).
- Only `src/jira/forge-gateway.ts` may import `@forge/bridge`.
- No new dependency without a written justification added to `specs/001-worktime-panel/plan.md` (Principle II).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: A project that builds, tests, and measures its size with one command each.

- [ ] T001 Create `package.json` at the repository root: `"private": true`, `"type": "module"`, runtime dependency `@forge/bridge`; dev dependencies `typescript`, `esbuild`, `sass`, `vitest`, `happy-dom`, `@playwright/test`, `@forge/cli`, all pinned to exact versions (no `^` or `~`); scripts `build` (`node scripts/build.ts && node scripts/check-size.ts`), `test` (`vitest run`), `test:e2e` (`playwright test`), `typecheck` (`tsc --noEmit`), `check` (typecheck, test, build, test:e2e in that order). Run `npm install` to create `package-lock.json`.
- [ ] T002 [P] Create `tsconfig.json`: `strict: true`, `noUncheckedIndexedAccess: true`, `target` and `lib` ES2022 plus DOM, `module`/`moduleResolution` suitable for esbuild (`ESNext`/`Bundler`), `noEmit: true`, include `src`, `tests`, `scripts`.
- [ ] T003 [P] Replace the Python entries in `.gitignore` with `node_modules/`, `dist/`, `test-results/`, `playwright-report/`; keep the existing `.claude` entry.
- [ ] T004 Create `scripts/build.ts`: for each page in `["panel", "gadget"]` whose `src/<page>/main.ts` exists, bundle it with esbuild (minified, ES2022, one file `dist/<page>/app.js`), compile `src/styles/<page>.scss` with `sass` (compressed) to `dist/<page>/app.css`, and copy `src/<page>/index.html` to `dist/<page>/index.html`; empty `dist/` first; accept `--alias-gateway=<path>` to replace `src/jira/forge-gateway.ts` with another module (used by the browser tests) and `--out=<dir>` to change the output directory.
- [ ] T005 [P] Create `scripts/check-size.ts`: for each `dist/<page>/`, gzip `app.js` and `app.css` with `node:zlib`, print the size per file and per page in kB, and exit with code 1 when a page's total is above 100 kB (constitution Principle I).
- [ ] T006 [P] Create `vitest.config.ts`: environment `happy-dom`, include `tests/unit/**/*.test.ts` and `tests/ui/**/*.test.ts`.
- [ ] T007 [P] Create `playwright.config.ts`: test directory `tests/e2e`, Chromium only, two projects `phone` (viewport 360×740, touch) and `desktop` (viewport 1280×800), a `webServer` that runs `node scripts/build.ts --alias-gateway=tests/e2e/browser-gateway.ts --out=dist-e2e` and serves `dist-e2e/` statically on a local port. Add `dist-e2e/` to `.gitignore`.
- [ ] T008 Create `manifest.yml`: `app.runtime.name: nodejs22.x`; module `jira:globalPage` with key `worktime-panel`, title `Czas pracy`, `resource: panel`; `resources` entry `panel` with `path: dist/panel`; `permissions.scopes: [read:jira-work]`; no functions, no `external`, no `content` permissions. The app `id` is added by `forge register` (T016).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared building blocks that every user story uses.

**⚠️ CRITICAL**: No user story work can begin until T009 to T015 are complete. T016 can run alongside the stories; its results can change them (see research.md, "Spike").

- [ ] T009 [P] Create `src/jira/gateway.ts`: interface `JiraGateway` with `request(path: string, init?: { method?: 'GET' | 'POST'; body?: unknown }): Promise<{ status: number; headers: { get(name: string): string | null }; json(): Promise<unknown> }>`, `getContext(): Promise<Session & { moduleKey: string; isModal: boolean }>`, `openIssue(url: string): void`, `navigate(path: string): void`, `close(): void`; and type `Session { accountId: string; timeZone: string; siteUrl: string }` (data-model.md, Session).
- [ ] T010 Create `src/jira/forge-gateway.ts` implementing `JiraGateway` with `@forge/bridge`: `requestJira` for `request` (JSON body, `Accept` and `Content-Type` `application/json`), `view.getContext()` mapped to `Session` (`timezone` → `timeZone`), `router.open` for `openIssue`, `router.navigate` for `navigate`, `view.close` for `close`. This is the only file that imports `@forge/bridge`.
- [ ] T011 [P] Create `tests/fake-gateway.ts`: a `JiraGateway` built from a list of route handlers (`method`, path matcher, response or function), recording every request it receives; helpers to answer from JSON files in `tests/fixtures/` and to return an error status or reject; a fixed `Session` (`accountId: "me"`, `timeZone: "Europe/Warsaw"`, `siteUrl: "https://example.atlassian.net"`).
- [ ] T012 [P] Create `src/i18n/pl.ts` exporting every text from the "Texts" table of `specs/001-worktime-panel/contracts/ui.md` as typed constants, plus the seven weekday names in Monday-first order.
- [ ] T013 [P] Create `src/domain/local-date.ts` and `tests/unit/local-date.test.ts`: type `LocalDate { year; month; day }`; functions `today(timeZone, nowMs)`, `addDays`, `addMonths` (clamping the day), `weekday` (1 = Monday … 7 = Sunday), `compare`, `toInstant(date, minuteOfDay, timeZone)` → epoch ms, `fromInstant(ms, timeZone)` → `{ date, minuteOfDay }`; time-zone math with `Intl.DateTimeFormat` only (research R4). Tests cover `Europe/Warsaw` on both daylight-saving change days, a year boundary, and a leap day.
- [ ] T014 [P] Create `src/domain/format.ts` and `tests/unit/format.test.ts` with `formatDuration(seconds)` (hours unpadded, minutes two digits: `6h 55m`, `0h 45m`, `0h 00m`, `38h 30m`), `formatClock(minuteOfDay)` (`07:00`), `formatDate(date)` (`06-11-2026`), `formatDayMonth(date)` (`06-11`); values shown as logged, never rounded (FR-010).
- [ ] T015 [P] Create `src/ui/dom.ts`, `src/styles/_tokens.scss`, and `src/styles/_base.scss`: `dom.ts` has `el(tag, props, children)`, `clear(node)`, and inline-SVG icon builders (refresh, gear, close, chevron left/right); `_tokens.scss` defines every token named in contracts/ui.md ("Colour tokens") plus spacing, radius, and type scale as CSS custom properties, with one value set under `[data-theme="dark"]` and one under `[data-theme="light"]`, the five progress colours giving at least 4.5:1 contrast against `--wt-surface` in their theme; `_base.scss` has the reset, system font stack, visible focus ring using `--wt-focus`, and a `min-height: 44px` rule for interactive controls.
- [ ] T016 MANUAL: run spike checks S1 to S9 from `specs/001-worktime-panel/research.md` on a Jira Cloud development site (needs Node.js 22.23.4 or later, `npx forge login`, `npx forge register`, a build of the minimal panel, `npx forge deploy`, `npx forge install`). Write the outcome of each check, and any fallback taken, into a new "Spike results" section at the end of `specs/001-worktime-panel/research.md`, and apply fallbacks to `manifest.yml` and the affected tasks.

**Checkpoint**: Foundation ready. User stories can start.

---

## Phase 3: User Story 1 - See today's logged time per ticket (Priority: P1) 🎯 MVP

**Goal**: Opening the panel shows today's entries of the current user: one row per ticket with link, title, every entry, row sum; the title with Polish weekday, date, and total; "Suma czasu:" below the table.

**Independent Test**: With the fake gateway returning two tickets (one with two entries) for today, the page shows two rows in start-time order, the two entries inside one row, correct sums, the title `Piątek 06-11-2026 · …`, and `Suma czasu: …`; another user's worklog is absent; a 255-character title wraps with no horizontal overflow at 360 px and 1280 px.

### Implementation and tests for User Story 1

- [ ] T017 [P] [US1] Create fixtures in `tests/fixtures/`: `search-today.json` (three issues `AM-10234`, `AM-20012`, `AM-10087` with `id`, `key`, `fields.summary`; one summary 255 characters long), `search-page1.json` and `search-page2.json` (first with `nextPageToken`, second with `isLast: true`), `worklogs-<issueId>.json` for each issue matching the test data in `specs/001-worktime-panel/quickstart.md` plus one worklog by another `accountId` and one starting the day before, `worklogs-paged-1.json`/`-2.json` (`total` larger than one page), and `search-empty.json`.
- [ ] T018 [P] [US1] Create `src/domain/period.ts` with types `PeriodPoint { date: LocalDate; minuteOfDay: number }` (0 to 1439) and `Period { from; to; preset }` where `preset` is one of `today | yesterday | thisWeek | prevWeek | thisMonth | prevMonth | custom`, the function `presetPeriod('today', timeZone, nowMs)` (00:00 to 23:59 of the current day), and derived `startInstant(period, timeZone)`, `endInstant(period, timeZone)` (= `to` plus one minute), `isSingleDay`, `isWholeDays` (data-model.md, Period); add `tests/unit/period.test.ts` for these.
- [ ] T019 [P] [US1] Create `src/domain/worklog.ts` and `tests/unit/worklog.test.ts`: types `TimeEntry { id; issueId; startedMs; durationSeconds }`, `Ticket { id; key; title; url }`, `TicketRow { ticket; entries; totalSeconds }`; `parseStarted("2026-11-06T07:00:00.000+0100")` → epoch ms (offset without colon); `buildRows(tickets, worklogs, session, period)` keeping only worklogs where `author.accountId === session.accountId` and `startInstant ≤ startedMs < endInstant`, grouping by `issueId`, entries sorted by `startedMs` ascending, `totalSeconds` = sum, rows sorted by first entry's `startedMs` then by ticket key, tickets with no kept entry dropped, `url` = `{siteUrl}/browse/{key}`; `totalOf(rows)`. Tests: other author excluded, out-of-period excluded, entry crossing midnight kept on its start day with full duration, duration not a multiple of 5 minutes kept as logged, ordering.
- [ ] T020 [P] [US1] Create `src/jira/request-pool.ts` and `tests/unit/request-pool.test.ts`: run request functions with at most 5 in flight; on HTTP 429 wait at least `Retry-After` seconds (default 2 s, doubling, jitter ×0.7 to 1.3, cap 30 s), pause the whole pool, retry the same request, at most 4 attempts, then reject; accept an `AbortSignal` that stops queued work; timers injectable for tests (contracts/jira-rest.md, "Errors and limits").
- [ ] T021 [US1] Create `src/jira/worklog-loader.ts` and `tests/unit/worklog-loader.test.ts`: `loadPeriod(gateway, session, period, signal)` → `TicketRow[]`. Step 1: `POST /rest/api/3/search/jql` with body `{ jql, fields: ["summary"], maxResults: 100 }` where `jql` is `worklogAuthor = currentUser() AND worklogDate >= "<from − 1 day>" AND worklogDate <= "<to + 1 day>"` (dates `yyyy-mm-dd`), following `nextPageToken` until absent or `isLast`; on HTTP 400 repeat once without the `worklogAuthor` clause. Step 2: for each issue `GET /rest/api/3/issue/{id}/worklog?startedAfter=<startInstant − 1>&startedBefore=<endInstant + 1>&maxResults=5000` through the request pool, paging with `startAt` while `startAt + worklogs.length < total`; HTTP 404 for one issue means no entries for it; other failures reject the load. Step 3: `buildRows`. Tests cover paging in both steps, the 400 fallback, a 404 issue, a 500 failure, and the exact request paths and bodies (depends on T018, T019, T020).
- [ ] T022 [P] [US1] Create `src/ui/header.ts` and `tests/ui/header.test.ts`: renders the title line and the subtitle `Twój zalogowany czas`; `update({ period, totalSeconds, timeZone })` sets the title to `<Weekday> dd-mm-yyyy · <total>` for a whole single day (FR-012), with the total in its own `<span class="wt-total">`; exposes an actions container for buttons added by later stories.
- [ ] T023 [P] [US1] Create `src/ui/table.ts` and `tests/ui/table.test.ts`: a `<table>` with headers `Zgłoszenie`, `Tytuł`, `Czas wpisów`, `Suma`; `render(rows, period)` creates exactly one `<tr>` per ticket; the key is a link that calls `gateway.openIssue(url)`; each entry is one line `HH:MM–HH:MM · <duration>` inside the single "Czas wpisów" cell (FR-007), an entry ending on the next day shows its end time only; `Suma` per row; a total row `Suma czasu: <total>` with the value in `<span class="wt-total">`; `showLoading()`, `showEmpty()` (`Brak wpisów czasu w wybranym okresie.`, total `0h 00m`), `showError(onRetry)` (`Nie udało się pobrać danych z Jiry.` with `Spróbuj ponownie`).
- [ ] T024 [US1] Create `src/ui/controller.ts` and `tests/ui/controller.test.ts`: holds the state machine `idle | loading | ready | empty | error` from data-model.md ("View state"); `start()` reads the session from the gateway, sets the period to `today`, and loads; `load()` aborts any running load, calls `loadPeriod`, ignores results of superseded loads, then updates header and table; on failure shows the error state with retry (depends on T021, T022, T023).
- [ ] T025 [US1] Create `src/panel/index.html` (doctype, `lang="pl"`, `data-theme="dark"` on `<html>`, viewport meta, `<link rel="stylesheet" href="./app.css">`, `<div id="app">`, `<script type="module" src="./app.js">`; relative paths only) and `src/panel/main.ts` (creates the Forge gateway, builds header, table, and controller inside `#app`, calls `controller.start()`).
- [ ] T026 [US1] Create `src/styles/panel.scss` using `_tokens.scss` and `_base.scss`: a centred card with a maximum width; the table with fixed layout; the key column `white-space: nowrap`; the title column wrapping with `overflow-wrap: anywhere`; the `Suma` column right-aligned and `nowrap`; below 480 px the title stacks under the key in the first column; the table body area with a bounded height and its own vertical scroll, the total row outside that scroll area; no `100vh` and no `position: fixed` (research R8).
- [ ] T027 [US1] Create `tests/e2e/browser-gateway.ts` (a `JiraGateway` for the browser that answers from scenario data embedded in the bundle, chosen by the `?scenario=` query parameter: `today`, `empty`, `error`, `long-title`, `month`) and `tests/e2e/panel.spec.ts`: for scenarios `today` and `long-title`, in both Playwright projects, assert three rows in order, three entry lines inside the first row, `Suma czasu: 10h 10m`, `document.documentElement.scrollWidth <= clientWidth`, and that the key cell is one line high; for `empty` and `error` assert the Polish messages.

**Checkpoint**: User Story 1 works on its own: `npm run check` passes and the built panel shows today's time.

---

## Phase 4: User Story 2 - Daily norm progress at a glance (Priority: P2)

**Goal**: A progress bar from 0 to 24h with the 8h norm marked; blue-to-green up to 8h, yellow-orange-red beyond; both totals in the bar's colour.

**Independent Test**: With totals of 0h, 4h, 8h, 10h 10m, 20h, and 26h for today, the fill width, the caption, and the colour of both totals match data-model.md ("PeriodSummary").

### Implementation and tests for User Story 2

- [ ] T028 [P] [US2] Create `src/domain/summary.ts` and `tests/unit/summary.test.ts`: `summarise(rows, period)` → `PeriodSummary { totalSeconds; progressActive; normSeconds; maxSeconds; fillFraction; normReached; colour }` with `progressActive = isSingleDay(period)`, `normSeconds = 8h`, `maxSeconds = 24h`, `fillFraction = min(total, max) / max` (0 when not active), `normReached = total ≥ norm`; `colour` is `neutral` when not active or when `r = total / norm` is 0, interpolated light blue → light green for `0 < r ≤ 1`, yellow → orange (`r = 2`) → red (`r = 3`) for `1 < r ≤ 3`, red for `r > 3`; the colour is returned as a mix description (`{ from: token, to: token, ratio }`), not as a hard-coded hex value, so themes keep control of the actual colours.
- [ ] T029 [P] [US2] Extend `src/domain/format.ts` and `tests/unit/format.test.ts` with `formatCaption(summary)`: `<total> · norma 8h osiągnięta` when the norm is reached, `<total> · do normy 8h brakuje <duration>` below it, and `<total>` alone when the bar is not active (FR-020).
- [ ] T030 [US2] Create `src/ui/progress.ts` and `tests/ui/progress.test.ts`: a bar with a track, a fill for 0 to 8h, a second fill for the part beyond 8h, ticks labelled `0h 4h 8h 12h 16h 24h` with the 8h tick emphasised, and the caption; `update(summary)` sets `--wt-fill-norm` and `--wt-fill-over` (percentages) with `style.setProperty`, sets `role="progressbar"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and `aria-valuetext` (the caption); a total above 24h shows a full bar.
- [ ] T031 [US2] Add the progress styles to `src/styles/panel.scss`: the 0-to-8h fill as a gradient from `--wt-progress-blue` to `--wt-progress-green`, the beyond-8h fill as a gradient `--wt-progress-yellow` → `--wt-progress-orange` → `--wt-progress-red`, the track in `--wt-track`; a `.wt-total` rule whose colour is `color-mix()` of two tokens driven by custom properties `--wt-total-from`, `--wt-total-to`, `--wt-total-ratio`, falling back to `--wt-text` when the colour is `neutral`.
- [ ] T032 [US2] Wire the summary into `src/ui/controller.ts`, `src/ui/header.ts`, and `src/ui/table.ts`: after every load compute `summarise`, update the progress bar, and set the three `--wt-total-*` properties on both `.wt-total` elements (title and total row) so they share the bar's colour (FR-018); extend `tests/ui/controller.test.ts` for 4h, 8h, 10h 10m, and 0h.
- [ ] T033 [P] [US2] Extend `tests/e2e/browser-gateway.ts` with scenarios `h4`, `h8`, `h20` and add `tests/e2e/progress.spec.ts`: the computed colour of the title total equals that of the total row; the fill width grows with the total; the caption text matches; the bar's ARIA values are set.

**Checkpoint**: User Stories 1 and 2 work together; the day's status is readable from the bar and colour.

---

## Phase 5: User Story 3 - Review other periods (Priority: P2)

**Goal**: Six presets, previous/next arrows, and a custom range with date and time for "Od" and "Do"; title, table, and totals follow the period; the bar is inactive (light gray) for periods longer than one day.

**Independent Test**: With entries on several days, each preset, a shifted period, and a custom window `06-11-2026 08:00` to `06-11-2026 12:00` show exactly the entries starting inside the period; multi-day periods show a date on each entry, a range title, a gray bar, and neutral totals; "Od" later than "Do" is rejected with the Polish message.

### Implementation and tests for User Story 3

- [ ] T034 [P] [US3] Extend `src/domain/period.ts` and `tests/unit/period.test.ts`: `presetPeriod` for `yesterday`, `thisWeek` and `prevWeek` (Monday 00:00 to Sunday 23:59), `thisMonth` and `prevMonth` (day 1 00:00 to last day 23:59); `customPeriod(from, to)` returning a validation error when `from` is later than `to` (FR-027); `shift(period, ±1, timeZone, nowMs)`: a full week moves 7 days, a full calendar month moves one calendar month, any other range moves by the number of calendar days it spans keeping its clock times; `matchPreset(period, timeZone, nowMs)` returns the preset whose range equals the period, otherwise `custom`. Tests include month ends of different lengths, a week crossing a year boundary, and a daylight-saving change inside the period.
- [ ] T035 [P] [US3] Extend `src/domain/format.ts` and `tests/unit/format.test.ts` with `formatTitle(period, timeZone)`: `<Weekday> dd-mm-yyyy` (whole single day), `<Weekday> dd-mm-yyyy HH:MM–HH:MM` (part of a single day), `dd-mm-yyyy – dd-mm-yyyy` (whole days), `dd-mm-yyyy HH:MM – dd-mm-yyyy HH:MM` (multi-day with times); and `formatEntry(entry, period, timeZone)`: `HH:MM–HH:MM · <duration>` for a single-day period, `dd-mm HH:MM–HH:MM · <duration>` otherwise (FR-011, FR-012, FR-013).
- [ ] T036 [US3] Create `src/ui/period-bar.ts` and `tests/ui/period-bar.test.ts`: previous and next arrow buttons (accessible names `Poprzedni okres`, `Następny okres`), six preset chips with `aria-pressed` on the active one, and two `<input type="datetime-local">` fields labelled `Od` and `Do`; `update(period)` fills the fields (a preset shows first day 00:00 and last day 23:59, FR-024) and marks the active chip (none for `custom`); emits `onChange(period)` for a chip, an arrow, or a valid field edit; an invalid range shows `Początek „Od” nie może być późniejszy niż koniec „Do”.` in an `aria-live` region and keeps the previous period.
- [ ] T037 [US3] Wire the period bar into `src/ui/controller.ts` and `src/panel/main.ts`: a period change discards the previous rows, shows the loading state, and loads the new period; `header.ts` uses `formatTitle`; `table.ts` uses `formatEntry`; extend `tests/ui/controller.test.ts` for a preset change, a shift, a custom window, and a superseded load whose late result is ignored.
- [ ] T038 [US3] Add the inactive bar: in `src/ui/progress.ts` set a `wt-progress--inactive` class and `aria-hidden="true"` when `summary.progressActive` is false, show the total-only caption, and remove the ARIA progress values; in `src/styles/panel.scss` style that class as the light-gray track with no fill and no emphasised 8h tick, and style the period bar (chips wrap onto several lines on narrow screens; the two fields stack below 480 px); extend `tests/ui/progress.test.ts` (FR-019).
- [ ] T039 [P] [US3] Add fixtures `tests/fixtures/search-week.json` and worklogs spread over a week, extend `tests/e2e/browser-gateway.ts` with scenario `week`, and add `tests/e2e/periods.spec.ts`: selecting `Ten tydzień` shows dated entries, a range title, a gray bar, and totals in the normal text colour; returning to `Dziś` re-activates the bar; a custom window inside one day keeps the bar active and filters entries by start time; no horizontal overflow in either project.

**Checkpoint**: Stories 1 to 3 work together; any period can be reviewed.

---

## Phase 6: User Story 4 - Keep data fresh (Priority: P3)

**Goal**: A refresh button, automatic refresh at a configurable interval (default 5 minutes, 0 = off), and a settings pop-over opened with a gear button.

**Independent Test**: With a fake clock, data reloads every 5 minutes by default, every N minutes after saving N, and never after saving 0; "Odśwież" reloads at once and keeps old data visible while loading; a failed refresh keeps the last data and offers retry; the saved interval survives a reload of the page.

### Implementation and tests for User Story 4

- [ ] T040 [P] [US4] Create `src/domain/settings.ts` and `tests/unit/settings.test.ts`: type `UserSettings { refreshMinutes: number; theme: 'dark' | 'light' }`, defaults `{ refreshMinutes: 5, theme: 'dark' }`; `readSettings(storage)` from key `worktime.settings.v1` (JSON), falling back to both defaults on a missing key, unparsable JSON, or a storage error, and to a single field's default when that field is missing or invalid; `validateInterval(text)` accepting only whole numbers 0 to 1440 (empty, negative, fractional, non-numeric, and above 1440 rejected); `writeSettings(storage, settings)` returning `false` when storage throws (contracts/settings-storage.md).
- [ ] T041 [US4] Add the refresh and settings buttons to `src/ui/header.ts` (`Odśwież` with the refresh icon; a gear button with accessible name `Ustawienia`), and in `src/ui/controller.ts` add `refresh()`: reload the current period without clearing the rows on screen, disable `Odśwież` and show the loading indication while running, and on failure show the error message above the still-visible data (FR-029, FR-034); extend `tests/ui/controller.test.ts`.
- [ ] T042 [US4] Add auto-refresh to `src/ui/controller.ts` with an injectable timer: after every completed load start a timer of `refreshMinutes`; no timer when `refreshMinutes` is 0 (FR-032); when the active preset is relative to today, recompute the period from the current date before each automatic load; do not run while `document.hidden` and load once when the page becomes visible again if a tick was missed (plan.md delta D5); extend `tests/ui/controller.test.ts` with a fake clock for 5, 10, 0, a day rollover, and a hidden tab.
- [ ] T043 [US4] Create `src/ui/settings-popover.ts` and `tests/ui/settings-popover.test.ts`: a pop-over inside the panel card titled `Ustawienia` with a number field `Odświeżaj co … min`, the hint `0 = automatyczne odświeżanie wyłączone (domyślnie 5 min)`, and buttons `Anuluj` and `Zapisz`; `Zapisz` validates with `validateInterval`, shows `Podaj liczbę całkowitą od 0 do 1440.` on failure, otherwise writes settings and applies the new interval at once; `Anuluj`, `Escape`, or a click outside closes without saving; focus moves into the pop-over on open and back to the gear on close; if writing fails show `Nie udało się zapisać ustawień w tej przeglądarce.` and keep the new value for the session.
- [ ] T044 [US4] Wire settings into `src/panel/main.ts` (read settings before the first render and pass `refreshMinutes` to the controller) and style the header buttons and the pop-over in `src/styles/panel.scss` (pop-over positioned inside the card, not fixed to the viewport; full-width sheet below 480 px).
- [ ] T045 [P] [US4] Add `tests/e2e/refresh.spec.ts` with a `refresh-changes` scenario in `tests/e2e/browser-gateway.ts` (the second load returns one more entry): `Odśwież` updates rows and totals; the old rows stay visible during the load; saving 0 and reloading the page shows 0 in the field; the pop-over fits inside the viewport in both Playwright projects.

**Checkpoint**: Stories 1 to 4 work together; data stays current without user action.

---

## Phase 7: User Story 5 - Quick access from any Jira page (Priority: P3)

**Goal**: A dashboard gadget showing today's total in the progress colour with a button that opens the panel page; a command-palette entry with a keyboard shortcut that opens the panel as a pop-up with a close button.

**Independent Test**: The built gadget shows `Dziś: <total>` in the same colour the bar would have and `Otwórz panel` asks the gateway to navigate to the panel page; the panel built in pop-up mode shows a close button that asks the gateway to close, and the page mode shows none.

### Implementation and tests for User Story 5

- [ ] T046 [P] [US5] Create `src/gadget/index.html` and `src/gadget/main.ts`: read settings, apply the theme, load the `today` period with `loadPeriod`, show `Dziś: <total>` with the total coloured through the same `--wt-total-*` properties and `summarise` as the panel, show a button `Otwórz panel` that calls `gateway.navigate` with the panel page path, reload at the `refreshMinutes` interval (never when 0), and show the Polish loading and error texts with retry.
- [ ] T047 [P] [US5] Create `src/styles/gadget.scss`: a compact single-line layout that wraps the button below the total under 320 px, using the shared tokens and base.
- [ ] T048 [US5] Add the pop-up variant to the panel: in `src/panel/main.ts` read `isModal` from `gateway.getContext()`; in `src/ui/header.ts` add a close button (close icon, accessible name `Zamknij`) only when `isModal` is true, calling `gateway.close()`; extend `tests/ui/header.test.ts` for both modes (FR-041, FR-049).
- [ ] T049 [US5] Extend `manifest.yml`: resource `gadget` with `path: dist/gadget`; module `jira:dashboardGadget` with key `worktime-today`, title `Czas pracy: dziś`, `resource: gadget`; module `jira:command` with key `worktime-open`, title `Czas pracy: otwórz panel`, a keyboard shortcut, and `target.resource: panel` so it opens the panel as a modal. Use the exact property names from the current Forge manifest reference and the outcome of spike checks S8 and S9; if S9 failed, leave out the command module and record that in `specs/001-worktime-panel/research.md`.
- [ ] T050 [P] [US5] Add `tests/ui/gadget.test.ts` (total, colour properties, navigation call, error state, interval 0) and `tests/e2e/gadget.spec.ts` (built gadget in both Playwright projects: text, no horizontal overflow, 44 px button height); add a `?modal=1` switch to `tests/e2e/browser-gateway.ts` and assert in `tests/e2e/panel.spec.ts` that the close button exists only in modal mode.

**Checkpoint**: The panel is reachable from the Apps menu, from a dashboard, and from any Jira page.

---

## Phase 8: User Story 6 - Choose light or dark appearance (Priority: P3)

**Goal**: A switch in settings selects dark or light; dark is the default; the choice previews at once, is kept on "Zapisz", reverted otherwise, and applied from the first paint on later visits.

**Independent Test**: With empty storage the page is dark; flipping the switch changes `data-theme` at once; `Anuluj` restores it; `Zapisz` keeps it and a reload starts light with no dark frame; in both themes every text and both coloured totals meet 4.5:1 contrast.

### Implementation and tests for User Story 6

- [ ] T051 [US6] Add the theme switch to `src/ui/settings-popover.ts`: a switch labelled `Tryb ciemny` (`role="switch"`, `aria-checked`), on when the theme is dark; flipping it sets `document.documentElement.dataset.theme` immediately as a preview; `Zapisz` writes the theme together with the interval; `Anuluj`, `Escape`, or an outside click restores the theme that was active when the pop-over opened (FR-044, FR-046); extend `tests/ui/settings-popover.test.ts`.
- [ ] T052 [US6] Apply the saved theme before the first render: in `src/panel/main.ts` and `src/gadget/main.ts` call `readSettings` and set `data-theme` as the first statement, before any element is created; keep `data-theme="dark"` as the static value in both `index.html` files so an empty storage needs no script to be dark (FR-045, FR-047).
- [ ] T053 [P] [US6] Review `src/styles/_tokens.scss` light values against the mock-up `specs/001-worktime-panel/inspiration/01-panel-overview.png` and derive the dark values to keep the same layout and hierarchy; make sure both themes define every token and that no component style in `src/styles/` uses a colour, spacing, or radius value that is not a token (Principle IV).
- [ ] T054 [P] [US6] Add `tests/e2e/theme.spec.ts`: default is dark; switch preview, cancel, save, and reload behave as specified; for scenarios `h4` and `h20` in both themes compute the contrast ratio of the title total, the total row value, body text, and links against their background and assert at least 4.5:1 (FR-048); run in both Playwright projects.

**Checkpoint**: All six user stories work together.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Gates and checks that span all stories.

- [ ] T055 [P] Add `tests/e2e/a11y.spec.ts`: every interactive control in the panel and the gadget is reachable with the Tab key in a sensible order, shows a visible focus ring, and measures at least 44 × 44 CSS pixels in the `phone` project; nothing depends on hover (Principle III, Principle IV).
- [ ] T056 [P] Add scenario `month` (60 tickets, 200 entries) to `tests/e2e/browser-gateway.ts` and `tests/e2e/large-period.spec.ts`: all 60 rows are present, the table body scrolls inside itself, the total row stays visible, and rendering completes within 1 second after data arrives (SC-009).
- [ ] T057 [P] Add `tests/unit/i18n.test.ts`: every text in the "Texts" table of `specs/001-worktime-panel/contracts/ui.md` exists in `src/i18n/pl.ts` with the same wording; and a source scan asserting that no file under `src/ui/`, `src/panel/`, or `src/gadget/` contains a string literal with letters outside `pl.ts` references, class names, attribute names, and element names (FR-035).
- [ ] T058 Run `npm run check` and fix what fails; confirm `scripts/check-size.ts` reports each page at or below 100 kB gzipped and write the measured sizes into the "Constitution Check" row for Principle I in `specs/001-worktime-panel/plan.md`.
- [ ] T059 [P] Create `README.md` at the repository root: what the app does, prerequisites (Node.js 22.23.4 or later, Atlassian developer account), the commands from `specs/001-worktime-panel/quickstart.md`, how a site admin installs it from the installation link, where to find it in Jira (Apps menu, dashboard gadget, command palette), and known limits (per-browser settings, Jira native mobile apps, Jira search covering only the most recent 1,000 time entries per ticket, a few seconds of delay before new entries appear).
- [ ] T060 MANUAL: run `npx forge lint`, `npx forge deploy -e production`, and install on a clean Jira Cloud site; execute validation scenarios 1 to 17 (with 6a and 15a) from `specs/001-worktime-panel/quickstart.md` as a second, non-admin user; record the result of each scenario in a "Validation results" section at the end of `specs/001-worktime-panel/quickstart.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies. T001 first; T002, T003, T005, T006, T007 in parallel after it; T004 and T008 after T001.
- **Foundational (Phase 2)**: needs Phase 1. T009, T011 to T015 in parallel; T010 after T009. T016 needs a built minimal panel (T025) and a person; it does not block coding, but its fallbacks can change T008, T026, T040, T049.
- **User Stories (Phases 3 to 8)**: all need T009 to T015.
- **Polish (Phase 9)**: needs the stories that are in scope.

### User Story Dependencies

| Story | Needs | Shared files it changes |
|-------|-------|-------------------------|
| US1 (P1) | Foundational | creates controller, header, table, panel entry, panel styles |
| US2 (P2) | US1 | controller, header, table, panel styles, format |
| US3 (P2) | US1; US2 for the inactive bar (T038) | period, format, controller, panel styles, progress |
| US4 (P3) | US1 | controller, header, panel entry, panel styles |
| US5 (P3) | US1, US2 (colour), US4 (settings) | header, panel entry, manifest |
| US6 (P3) | US4 (settings pop-over); US5 for the gadget part of T052 | settings pop-over, panel and gadget entries, tokens |

US2, US3, and US4 each touch `src/ui/controller.ts` and `src/styles/panel.scss`, so one developer should take them in order: US2 → US3 → US4. US3 without US2 is possible by leaving out T038.

### Within Each User Story

- Fixtures and domain code first, then Jira access, then UI, then wiring, then browser tests.
- A task that creates code also creates or extends its test file; the story is done when `npm run check` passes.

### Parallel Opportunities

- Phase 1: T002, T003, T005, T006, T007.
- Phase 2: T009, T011, T012, T013, T014, T015.
- US1: T017, T018, T019, T020 together; then T022 and T023 together.
- US2: T028 and T029 together; T033 alongside T032.
- US3: T034 and T035 together; T039 alongside T038.
- US5: T046 and T047 together; T050 after them.
- US6: T053 and T054 alongside T051 and T052.
- Phase 9: T055, T056, T057, T059.

---

## Parallel Example: User Story 1

```text
# After Phase 2, start together (four different files, no dependencies between them):
Task: "T017 Create fixtures in tests/fixtures/"
Task: "T018 Create src/domain/period.ts with the today preset and tests/unit/period.test.ts"
Task: "T019 Create src/domain/worklog.ts and tests/unit/worklog.test.ts"
Task: "T020 Create src/jira/request-pool.ts and tests/unit/request-pool.test.ts"

# Then T021 (needs T018 to T020), and in parallel with it:
Task: "T022 Create src/ui/header.ts and tests/ui/header.test.ts"
Task: "T023 Create src/ui/table.ts and tests/ui/table.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup (T001 to T008).
2. Phase 2: Foundational (T009 to T015).
3. Phase 3: User Story 1 (T017 to T027).
4. **Stop and validate**: `npm run check`; then T016 (spike) on a real site, which also proves the MVP inside Jira.
5. The MVP already answers "how much did I log today, and on what?".

### Incremental Delivery

1. Setup + Foundational → project builds and tests.
2. US1 → today's table (MVP).
3. US2 → progress bar and colours.
4. US3 → other periods and custom ranges.
5. US4 → refresh, auto-refresh, settings.
6. US5 → gadget and pop-up.
7. US6 → light theme switch.
8. Polish → accessibility, large data, size gate, README, release validation (T060).

Each step leaves a working, tested panel.

---

## Notes

- Two tasks are MANUAL (T016, T060): they need an Atlassian account, `forge login`, and a Jira Cloud site. Everything else can be done and verified locally.
- Node.js on the development machine is 22.23.2; the Forge CLI needs 22.23.4 or later. Local build and tests are not affected; T016 and T060 are.
- Plan deltas D4 (table scrolls inside itself) and D5 (no auto-refresh in a hidden tab) are built in T026 and T042. If the requester rejects either, change those two tasks.
- `specs/001-worktime-panel/checklists/ux.md` has 36 unchecked review items. `/speckit-implement` reads checklist state as a gate and will ask before proceeding while they are unchecked.
- Commit after each task or logical group; stop at any checkpoint to validate a story on its own.
