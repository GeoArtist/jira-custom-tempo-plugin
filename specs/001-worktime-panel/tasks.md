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

Single front-end project at the repository root: `src/`, `tests/`, `scripts/`, `manifest.yml`, `vite.config.ts`. Build output in `dist/` (not committed). Source is TypeScript and SCSS only; no hand-written `.js` or `.css` files (constitution).

## Rules that apply to every task

- All visible text comes from `src/i18n/pl.ts`; exact strings and formats are in `specs/001-worktime-panel/contracts/ui.md`.
- No inline styles or scripts in HTML. Run-time values are set with `element.style.setProperty('--wt-…', value)` (research R7).
- Only `src/jira/forge-gateway.ts` may import `@forge/bridge`.
- Vite+ (`vp`) is mandatory for installing, the dev server, the build, unit and UI tests, lint, format, and type checks; no second tool for any of these jobs may be added (constitution v2.2.0, Technical Constraints). Run tasks as `vp run <task>` or a built-in `vp` command.
- No new dependency without a written justification added to `specs/001-worktime-panel/plan.md` (Principle II).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: A project that builds, tests, and measures its size with one command each.

- [X] T001 Create `package.json` at the repository root: `"private": true`, `"type": "module"`, runtime dependency `@forge/bridge`; dev dependencies `vite-plus` (with `vite` aliased to the Vite+ core, as `vp migrate` sets it), `sass`, `typescript`, `happy-dom`, `@playwright/test`, `@types/node`, all pinned to exact versions (no `^` or `~`); scripts that all run through Vite+: `dev` (`vp dev --mode demo`), `build` (`vp build --mode panel && vp build --mode gadget && node scripts/check-size.ts`), `build:demo` (`vp build --mode demo-panel && vp build --mode demo-gadget`), `preview` (`npm run build:demo && vp preview --mode demo`), `lint` (`vp check`), `test` (`vp test run`), `test:e2e` (`playwright test`), `check` (`vp check && vp test run && npm run build && playwright test`). Run `vp install` to create `package-lock.json`. No other bundler, test runner, linter, or formatter may be added (constitution). The Forge CLI is not a dev dependency (it is large and needs Node.js 22.23.4 or later); it is run on demand with `vp env exec --node 22.23.5 npx @forge/cli`. Pin Node.js with `vp env pin 22 --target node-version`.
- [X] T002 [P] Create `tsconfig.json`: `strict: true`, `noUncheckedIndexedAccess: true`, `target` and `lib` ES2022 plus DOM, `module`/`moduleResolution` suitable for a bundler (`ESNext`/`Bundler`), `noEmit: true`, include `src`, `tests`, `scripts`, and the root `*.config.ts` files. Type checking runs through `vp check`.
- [X] T003 [P] Replace the Python entries in `.gitignore` with `node_modules/`, `dist/`, `test-results/`, `playwright-report/`; keep the existing `.claude` entry.
- [X] T004 Create `vite.config.ts` (the single Vite+ configuration; replaces a custom build script): `defineConfig` from `vite-plus` taking `mode`; modes `panel` and `gadget` build one page each with `root` `src/<page>` into `dist/<page>`; modes `demo-panel` and `demo-gadget` build into `dist-e2e/<page>` with `src/jira/forge-gateway` aliased to `tests/e2e/browser-gateway.ts`; mode `demo` serves both pages from `root` `src` for `vp dev` and `vp preview`; `base: './'` (Forge needs relative asset links), `publicDir: false`, `build.target: 'es2022'`, `build.emptyOutDir: true`, `build.modulePreload: false`, `build.assetsInlineLimit: 0` (no inline scripts or styles); `server` on `127.0.0.1:5173`, `preview` on `127.0.0.1:4173` with `strictPort`; `fmt` (`singleQuote`, `printWidth: 120`, ignoring `specs/`, `.specify/`, `.claude/`, Markdown, and `tests/fixtures/`) and `lint` (type-aware, with the `vite-plus/prefer-vite-plus-imports` rule). Each `src/<page>/index.html` links `../styles/<page>.scss` and loads `./main.ts` as a module script; Vite+ compiles both.
- [X] T005 [P] Create `scripts/check-size.ts`: for each `dist/<page>/`, gzip every `.js` and `.css` file below it (Vite+ writes them to `dist/<page>/assets/`) with `node:zlib`, print the size per file and per page in kB, and exit with code 1 when a page's total is above 100 kB (constitution Principle I) or when there is nothing to measure.
- [X] T006 [P] Configure the unit and UI tests in the `test` section of `vite.config.ts` (no separate test-runner config): environment `happy-dom`, include `tests/unit/**/*.test.ts` and `tests/ui/**/*.test.ts`. Test files import `describe`, `it`, `expect`, and `vi` from `vite-plus/test`. Run with `vp test run`.
- [X] T007 [P] Create `playwright.config.ts`: test directory `tests/e2e`, Chromium only, three projects `phone` (viewport 320×640, touch), `desktop` (viewport 1280×800), and `wide` (viewport 1920×1080; layout specs only), time zone `Europe/Warsaw`, and a `webServer` with the command `npm run preview` (Vite+ builds the demo pages into `dist-e2e/` and serves them with `vp preview --mode demo` on `http://127.0.0.1:4173`). Add `dist-e2e/` to `.gitignore`.
- [X] T008 Create `manifest.yml`: `app.runtime.name: nodejs22.x`; module `jira:globalPage` with key `worktime-panel`, title `Czas pracy`, `resource: panel`; `resources` entry `panel` with `path: dist/panel`; `permissions.scopes: [read:jira-work]`; no functions, no `external`, no `content` permissions. The app `id` is added by `forge register` (T016).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared building blocks that every user story uses.

**⚠️ CRITICAL**: No user story work can begin until T009 to T015 are complete. T016 can run alongside the stories; its results can change them (see research.md, "Spike").

- [X] T009 [P] Create `src/jira/gateway.ts`: interface `JiraGateway` with `request(path: string, init?: { method?: 'GET' | 'POST'; body?: unknown }): Promise<{ status: number; headers: { get(name: string): string | null }; json(): Promise<unknown> }>`, `getContext(): Promise<HostContext>` where `HostContext` is `Session & { moduleKey: string; isModal: boolean; panelPath: string | null }`, `openIssue(url: string): void`, `navigate(path: string): void`, `close(): void`; and type `Session { accountId: string; timeZone: string; siteUrl: string }` (data-model.md, Session).
- [X] T010 Create `src/jira/forge-gateway.ts` implementing `JiraGateway` with `@forge/bridge`: `requestJira` for `request` (JSON body, `Accept` and `Content-Type` `application/json`), `view.getContext()` mapped to `HostContext` (`timezone` → `timeZone`; `isModal` is true when `moduleKey` is `worktime-open`; `panelPath` is `/jira/apps/<appId>/<environmentId>` with both ids parsed from the context's `localId`, which has the form `ari:cloud:ecosystem::extension/<appId>/<environmentId>/static/<moduleKey>`, or `null` when it cannot be parsed), `router.open` for `openIssue`, `router.navigate` for `navigate`, `view.close` for `close`. This is the only file that imports `@forge/bridge`.
- [X] T011 [P] Create `tests/fake-gateway.ts`: a `JiraGateway` built from a list of route handlers (`method`, path matcher, response or function), recording every request it receives; helpers to answer from JSON files in `tests/fixtures/` and to return an error status or reject; a fixed `Session` (`accountId: "me"`, `timeZone: "Europe/Warsaw"`, `siteUrl: "https://example.atlassian.net"`).
- [X] T012 [P] Create `src/i18n/pl.ts` exporting every text from the "Texts" table of `specs/001-worktime-panel/contracts/ui.md` as typed constants, plus the seven weekday names in Monday-first order.
- [X] T013 [P] Create `src/domain/local-date.ts` and `tests/unit/local-date.test.ts`: type `LocalDate { year; month; day }`; functions `today(timeZone, nowMs)`, `addDays`, `addMonths` (clamping the day), `weekday` (1 = Monday … 7 = Sunday), `compare`, `toInstant(date, minuteOfDay, timeZone)` → epoch ms, `fromInstant(ms, timeZone)` → `{ date, minuteOfDay }`; time-zone math with `Intl.DateTimeFormat` only (research R4). Tests cover `Europe/Warsaw` on both daylight-saving change days, a year boundary, and a leap day.
- [X] T014 [P] Create `src/domain/format.ts` and `tests/unit/format.test.ts` with `formatDuration(seconds)` (hours unpadded, minutes two digits: `6h 55m`, `0h 45m`, `0h 00m`, `38h 30m`), `formatClock(minuteOfDay)` (`07:00`), `formatDate(date)` (`06-11-2026`), `formatDayMonth(date)` (`06-11`); values shown as logged, never rounded (FR-010).
- [X] T015 [P] Create `src/ui/dom.ts`, `src/styles/_tokens.scss`, and `src/styles/_base.scss`: `dom.ts` has `el(tag, props, children)`, `clear(node)`, and inline-SVG icon builders (refresh, gear, close, chevron left/right); `_tokens.scss` defines every token named in contracts/ui.md ("Colour tokens") plus spacing, radius, and type scale as CSS custom properties, with one value set under `[data-theme="dark"]` and one under `[data-theme="light"]`, the five progress colours giving at least 4.5:1 contrast against `--wt-surface` in their theme; `_base.scss` has the reset, system font stack, visible focus ring using `--wt-focus`, and a `min-height: 44px` rule for interactive controls.
- [X] T016 SUPERSEDED (the Forge platform checks no longer apply; see Phase 10 and research.md, "Checks on a real Jira site"). Original text: MANUAL: run spike checks S1 to S9 from `specs/001-worktime-panel/research.md` on a Jira Cloud development site (needs Node.js 22.23.4 or later, `npx forge login`, `npx forge register`, a build of the minimal panel, `npx forge deploy`, `npx forge install`). Write the outcome of each check, and any fallback taken, into a new "Spike results" section at the end of `specs/001-worktime-panel/research.md`, and apply fallbacks to `manifest.yml` and the affected tasks.

**Checkpoint**: Foundation ready. User stories can start.

---

## Phase 3: User Story 1 - See today's logged time per ticket (Priority: P1) 🎯 MVP

**Goal**: Opening the panel shows today's entries of the current user: one row per ticket with link, title, every entry, row sum; the title with Polish weekday, date, and total; "Suma czasu:" below the table.

**Independent Test**: With the fake gateway returning two tickets (one with two entries) for today, the page shows two rows in start-time order, the two entries inside one row, correct sums, the title `Piątek 06-11-2026 · …`, and `Suma czasu: …`; another user's worklog is absent; a 255-character title wraps with no horizontal overflow at 320 px, 1280 px, and 1920 px.

### Implementation and tests for User Story 1

- [X] T017 [P] [US1] Create fixtures in `tests/fixtures/`: `search-today.json` (three issues `AM-10234`, `AM-20012`, `AM-10087` with `id`, `key`, `fields.summary`; one summary 255 characters long), `search-page1.json` and `search-page2.json` (first with `nextPageToken`, second with `isLast: true`), `worklogs-<issueId>.json` for each issue matching the test data in `specs/001-worktime-panel/quickstart.md` plus one worklog by another `accountId` and one starting the day before, `worklogs-paged-1.json`/`-2.json` (`total` larger than one page), and `search-empty.json`.
- [X] T018 [P] [US1] Create `src/domain/period.ts` with types `PeriodPoint { date: LocalDate; minuteOfDay: number }` (0 to 1439) and `Period { from; to; preset }` where `preset` is one of `today | yesterday | thisWeek | prevWeek | thisMonth | prevMonth | custom`, the function `presetPeriod('today', timeZone, nowMs)` (00:00 to 23:59 of the current day), and derived `startInstant(period, timeZone)`, `endInstant(period, timeZone)` (= `to` plus one minute), `isSingleDay`, `isWholeDays` (data-model.md, Period); add `tests/unit/period.test.ts` for these.
- [X] T019 [P] [US1] Create `src/domain/worklog.ts` and `tests/unit/worklog.test.ts`: types `TimeEntry { id; issueId; startedMs; durationSeconds }`, `Ticket { id; key; title; url }`, `TicketRow { ticket; entries; totalSeconds }`; `parseStarted("2026-11-06T07:00:00.000+0100")` → epoch ms (offset without colon); `buildRows(tickets, worklogs, session, period)` keeping only worklogs where `author.accountId === session.accountId` and `startInstant ≤ startedMs < endInstant`, grouping by `issueId`, entries sorted by `startedMs` ascending, `totalSeconds` = sum, rows sorted by first entry's `startedMs` then by ticket key, tickets with no kept entry dropped, `url` = `{siteUrl}/browse/{key}`; `totalOf(rows)`. Tests: other author excluded, out-of-period excluded, entry crossing midnight kept on its start day with full duration, duration not a multiple of 5 minutes kept as logged, ordering.
- [X] T020 [P] [US1] Create `src/jira/request-pool.ts` and `tests/unit/request-pool.test.ts`: run request functions with at most 5 in flight; on HTTP 429 wait at least `Retry-After` seconds (default 2 s, doubling, jitter ×0.7 to 1.3, cap 30 s), pause the whole pool, retry the same request, at most 4 attempts, then reject; accept an `AbortSignal` that stops queued work; timers injectable for tests (contracts/jira-rest.md, "Errors and limits").
- [X] T021 [US1] Create `src/jira/worklog-loader.ts` and `tests/unit/worklog-loader.test.ts`: `loadPeriod(gateway, session, period, signal)` → `TicketRow[]`. Step 1: `POST /rest/api/3/search/jql` with body `{ jql, fields: ["summary"], maxResults: 100 }` where `jql` is `worklogAuthor = currentUser() AND worklogDate >= "<from − 1 day>" AND worklogDate <= "<to + 1 day>"` (dates `yyyy-mm-dd`), following `nextPageToken` until absent or `isLast`; on HTTP 400 repeat once without the `worklogAuthor` clause. Step 2: for each issue `GET /rest/api/3/issue/{id}/worklog?startedAfter=<startInstant − 1>&startedBefore=<endInstant + 1>&maxResults=5000` through the request pool, paging with `startAt` while `startAt + worklogs.length < total`; HTTP 404 for one issue means no entries for it; other failures reject the load. Step 3: `buildRows`. Tests cover paging in both steps, the 400 fallback, a 404 issue, a 500 failure, and the exact request paths and bodies (depends on T018, T019, T020).
- [X] T022 [P] [US1] Create `src/ui/header.ts` and `tests/ui/header.test.ts`: renders the title line and the subtitle `Twój zalogowany czas`; `update({ period, totalSeconds, timeZone })` sets the title to `<Weekday> dd-mm-yyyy · <total>` for a whole single day (FR-012), with the total in its own `<span class="wt-total">`; exposes an actions container for buttons added by later stories.
- [X] T023 [P] [US1] Create `src/ui/table.ts` and `tests/ui/table.test.ts`: a `<table>` with headers `Zgłoszenie`, `Tytuł`, `Czas wpisów`, `Suma`; `render(rows, period)` creates exactly one `<tr>` per ticket; the key is a link that calls `gateway.openIssue(url)`; each entry is one line `HH:MM–HH:MM · <duration>` inside the single "Czas wpisów" cell (FR-007), an entry ending on the next day shows its end time only; `Suma` per row; a total row `Suma czasu: <total>` with the value in `<span class="wt-total">`; `showLoading()`, `showEmpty()` (`Brak wpisów czasu w wybranym okresie.`, total `0h 00m`), `showError(onRetry)` (`Nie udało się pobrać danych z Jiry.` with `Spróbuj ponownie`).
- [X] T024 [US1] Create `src/ui/controller.ts` and `tests/ui/controller.test.ts`: holds the state machine `idle | loading | ready | empty | error` from data-model.md ("View state"); `start()` reads the session from the gateway, sets the period to `today`, and loads; `load()` aborts any running load, calls `loadPeriod`, ignores results of superseded loads, then updates header and table; on failure shows the error state with retry (depends on T021, T022, T023).
- [X] T025 [US1] Create `src/panel/index.html` (doctype, `lang="pl"`, `data-theme="dark"` on `<html>`, viewport meta, `<link rel="stylesheet" href="./app.css">`, `<div id="app">`, `<script type="module" src="./app.js">`; relative paths only) and `src/panel/main.ts` (creates the Forge gateway, builds header, table, and controller inside `#app`, calls `controller.start()`).
- [X] T026 [US1] Create `src/styles/panel.scss` using `_tokens.scss` and `_base.scss`: a centred card with a maximum width; the table with fixed layout; the key column `white-space: nowrap`; the title column wrapping with `overflow-wrap: anywhere`; the `Suma` column right-aligned and `nowrap`; below 480 px the title stacks under the key in the first column; the table body area with a bounded height and its own vertical scroll, the total row outside that scroll area; no `100vh` and no `position: fixed` (research R8).
- [X] T027 [US1] Create `tests/e2e/browser-gateway.ts` (a `JiraGateway` for the browser that answers from scenario data embedded in the bundle, chosen by the `?scenario=` query parameter: `today`, `empty`, `error`, `long-title`, `month`) and `tests/e2e/panel.spec.ts`: for scenarios `today` and `long-title`, in both Playwright projects, assert three rows in order, three entry lines inside the first row, `Suma czasu: 10h 10m`, `document.documentElement.scrollWidth <= clientWidth`, and that the key cell is one line high; for `empty` and `error` assert the Polish messages.

**Checkpoint**: User Story 1 works on its own: `vp run check` passes and the built panel shows today's time.

---

## Phase 4: User Story 2 - Daily norm progress at a glance (Priority: P2)

**Goal**: A progress bar from 0 to 24h with the 8h norm marked; blue-to-green up to 8h, yellow-orange-red beyond; both totals in the bar's colour.

**Independent Test**: With totals of 0h, 4h, 8h, 10h 10m, 20h, and 26h for today, the fill width, the caption, and the colour of both totals match data-model.md ("PeriodSummary").

### Implementation and tests for User Story 2

- [X] T028 [P] [US2] Create `src/domain/summary.ts` and `tests/unit/summary.test.ts`: `summarise(rows, period)` → `PeriodSummary { totalSeconds; progressActive; normSeconds; maxSeconds; fillFraction; normReached; colour }` with `progressActive = isSingleDay(period)`, `normSeconds = 8h`, `maxSeconds = 24h`, `fillFraction = min(total, max) / max` (0 when not active), `normReached = total ≥ norm`; `colour` is `neutral` when not active or when `r = total / norm` is 0, interpolated light blue → light green for `0 < r ≤ 1`, yellow → orange (`r = 2`) → red (`r = 3`) for `1 < r ≤ 3`, red for `r > 3`; the colour is returned as a mix description (`{ from: token, to: token, ratio }`), not as a hard-coded hex value, so themes keep control of the actual colours.
- [X] T029 [P] [US2] Extend `src/domain/format.ts` and `tests/unit/format.test.ts` with `formatCaption(summary)`: `<total> · norma 8h osiągnięta` when the norm is reached, `<total> · do normy 8h brakuje <duration>` below it, and `<total>` alone when the bar is not active (FR-020).
- [X] T030 [US2] Create `src/ui/progress.ts` and `tests/ui/progress.test.ts`: a bar with a track, a fill for 0 to 8h, a second fill for the part beyond 8h, ticks labelled `0h 4h 8h 12h 16h 24h` with the 8h tick emphasised, and the caption; `update(summary)` sets `--wt-fill-norm` and `--wt-fill-over` (percentages) with `style.setProperty`, sets `role="progressbar"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and `aria-valuetext` (the caption); a total above 24h shows a full bar.
- [X] T031 [US2] Add the progress styles to `src/styles/panel.scss`: the 0-to-8h fill as a gradient from `--wt-progress-blue` to `--wt-progress-green`, the beyond-8h fill as a gradient `--wt-progress-yellow` → `--wt-progress-orange` → `--wt-progress-red`, the track in `--wt-track`; a `.wt-total` rule whose colour is `color-mix()` of two tokens driven by custom properties `--wt-total-from`, `--wt-total-to`, `--wt-total-ratio`, falling back to `--wt-text` when the colour is `neutral`.
- [X] T032 [US2] Wire the summary into `src/ui/controller.ts`, `src/ui/header.ts`, and `src/ui/table.ts`: after every load compute `summarise`, update the progress bar, and set the three `--wt-total-*` properties on both `.wt-total` elements (title and total row) so they share the bar's colour (FR-018); extend `tests/ui/controller.test.ts` for 4h, 8h, 10h 10m, and 0h.
- [X] T033 [P] [US2] Extend `tests/e2e/browser-gateway.ts` with scenarios `h4`, `h8`, `h20` and add `tests/e2e/progress.spec.ts`: the computed colour of the title total equals that of the total row; the fill width grows with the total; the caption text matches; the bar's ARIA values are set.

**Checkpoint**: User Stories 1 and 2 work together; the day's status is readable from the bar and colour.

---

## Phase 5: User Story 3 - Review other periods (Priority: P2)

**Goal**: Six presets, previous/next arrows, and a custom range with date and time for "Od" and "Do"; title, table, and totals follow the period; the bar is inactive (light gray) for periods longer than one day.

**Independent Test**: With entries on several days, each preset, a shifted period, and a custom window `06-11-2026 08:00` to `06-11-2026 12:00` show exactly the entries starting inside the period; multi-day periods show a date on each entry, a range title, a gray bar, and neutral totals; "Od" later than "Do" is rejected with the Polish message.

### Implementation and tests for User Story 3

- [X] T034 [P] [US3] Extend `src/domain/period.ts` and `tests/unit/period.test.ts`: `presetPeriod` for `yesterday`, `thisWeek` and `prevWeek` (Monday 00:00 to Sunday 23:59), `thisMonth` and `prevMonth` (day 1 00:00 to last day 23:59); `customPeriod(from, to)` returning a validation error when `from` is later than `to` (FR-027); `shift(period, ±1, timeZone, nowMs)`: a full week moves 7 days, a full calendar month moves one calendar month, any other range moves by the number of calendar days it spans keeping its clock times; `matchPreset(period, timeZone, nowMs)` returns the preset whose range equals the period, otherwise `custom`. Tests include month ends of different lengths, a week crossing a year boundary, and a daylight-saving change inside the period.
- [X] T035 [P] [US3] Extend `src/domain/format.ts` and `tests/unit/format.test.ts` with `formatTitle(period, timeZone)`: `<Weekday> dd-mm-yyyy` (whole single day), `<Weekday> dd-mm-yyyy HH:MM–HH:MM` (part of a single day), `dd-mm-yyyy – dd-mm-yyyy` (whole days), `dd-mm-yyyy HH:MM – dd-mm-yyyy HH:MM` (multi-day with times); and `formatEntry(entry, period, timeZone)`: `HH:MM–HH:MM · <duration>` for a single-day period, `dd-mm HH:MM–HH:MM · <duration>` otherwise (FR-011, FR-012, FR-013).
- [X] T036 [US3] Create `src/ui/period-bar.ts` and `tests/ui/period-bar.test.ts`: previous and next arrow buttons (accessible names `Poprzedni okres`, `Następny okres`), six preset chips with `aria-pressed` on the active one, and two `<input type="datetime-local">` fields labelled `Od` and `Do`; `update(period)` fills the fields (a preset shows first day 00:00 and last day 23:59, FR-024) and marks the active chip (none for `custom`); emits `onChange(period)` for a chip, an arrow, or a valid field edit; an invalid range shows `Początek „Od” nie może być późniejszy niż koniec „Do”.` in an `aria-live` region and keeps the previous period.
- [X] T037 [US3] Wire the period bar into `src/ui/controller.ts` and `src/panel/main.ts`: a period change discards the previous rows, shows the loading state, and loads the new period; `header.ts` uses `formatTitle`; `table.ts` uses `formatEntry`; extend `tests/ui/controller.test.ts` for a preset change, a shift, a custom window, and a superseded load whose late result is ignored.
- [X] T038 [US3] Add the inactive bar: in `src/ui/progress.ts` set a `wt-progress--inactive` class and `aria-hidden="true"` when `summary.progressActive` is false, show the total-only caption, and remove the ARIA progress values; in `src/styles/panel.scss` style that class as the light-gray track with no fill and no emphasised 8h tick, and style the period bar (chips wrap onto several lines on narrow screens; the two fields stack below 480 px); extend `tests/ui/progress.test.ts` (FR-019).
- [X] T039 [P] [US3] Add fixtures `tests/fixtures/search-week.json` and worklogs spread over a week, extend `tests/e2e/browser-gateway.ts` with scenario `week`, and add `tests/e2e/periods.spec.ts`: selecting `Ten tydzień` shows dated entries, a range title, a gray bar, and totals in the normal text colour; returning to `Dziś` re-activates the bar; a custom window inside one day keeps the bar active and filters entries by start time; no horizontal overflow in either project.

**Checkpoint**: Stories 1 to 3 work together; any period can be reviewed.

---

## Phase 6: User Story 4 - Keep data fresh (Priority: P3)

**Goal**: A refresh button, automatic refresh at a configurable interval (default 5 minutes, 0 = off), and a settings pop-over opened with a gear button.

**Independent Test**: With a fake clock, data reloads every 5 minutes by default, every N minutes after saving N, and never after saving 0; "Odśwież" reloads at once and keeps old data visible while loading; a failed refresh keeps the last data and offers retry; the saved interval survives a reload of the page.

### Implementation and tests for User Story 4

- [X] T040 [P] [US4] Create `src/domain/settings.ts` and `tests/unit/settings.test.ts`: type `UserSettings { refreshMinutes: number; theme: 'dark' | 'light' }`, defaults `{ refreshMinutes: 5, theme: 'dark' }`; `readSettings(storage)` from key `worktime.settings.v1` (JSON), falling back to both defaults on a missing key, unparsable JSON, or a storage error, and to a single field's default when that field is missing or invalid; `validateInterval(text)` accepting only whole numbers 0 to 1440 (empty, negative, fractional, non-numeric, and above 1440 rejected); `writeSettings(storage, settings)` returning `false` when storage throws (contracts/settings-storage.md).
- [X] T041 [US4] Add the refresh and settings buttons to `src/ui/header.ts` (`Odśwież` with the refresh icon; a gear button with accessible name `Ustawienia`), and in `src/ui/controller.ts` add `refresh()`: reload the current period without clearing the rows on screen, disable `Odśwież` and show the loading indication while running, and on failure show the error message above the still-visible data (FR-029, FR-034); extend `tests/ui/controller.test.ts`.
- [X] T042 [US4] Add auto-refresh to `src/ui/controller.ts` with an injectable timer: after every completed load start a timer of `refreshMinutes`; no timer when `refreshMinutes` is 0 (FR-032); when the active preset is relative to today, recompute the period from the current date before each automatic load; do not run while `document.hidden` and load once when the page becomes visible again if a tick was missed (plan.md delta D5); extend `tests/ui/controller.test.ts` with a fake clock for 5, 10, 0, a day rollover, and a hidden tab.
- [X] T043 [US4] Create `src/ui/settings-popover.ts` and `tests/ui/settings-popover.test.ts`: a pop-over inside the panel card titled `Ustawienia` with a number field `Odświeżaj co … min`, the hint `0 = automatyczne odświeżanie wyłączone (domyślnie 5 min)`, and buttons `Anuluj` and `Zapisz`; `Zapisz` validates with `validateInterval`, shows `Podaj liczbę całkowitą od 0 do 1440.` on failure, otherwise writes settings and applies the new interval at once; `Anuluj`, `Escape`, or a click outside closes without saving; focus moves into the pop-over on open and back to the gear on close; if writing fails show `Nie udało się zapisać ustawień w tej przeglądarce.` and keep the new value for the session.
- [X] T044 [US4] Wire settings into `src/panel/main.ts` (read settings before the first render and pass `refreshMinutes` to the controller) and style the header buttons and the pop-over in `src/styles/panel.scss` (pop-over positioned inside the card, not fixed to the viewport; full-width sheet below 480 px).
- [X] T045 [P] [US4] Add `tests/e2e/refresh.spec.ts` with a `refresh-changes` scenario in `tests/e2e/browser-gateway.ts` (the second load returns one more entry): `Odśwież` updates rows and totals; the old rows stay visible during the load; saving 0 and reloading the page shows 0 in the field; the pop-over fits inside the viewport in both Playwright projects.

**Checkpoint**: Stories 1 to 4 work together; data stays current without user action.

---

## Phase 7: User Story 5 - Quick access from any Jira page (Priority: P3)

**Goal**: A dashboard gadget showing today's total in the progress colour with a button that opens the panel page; a command-palette entry with a keyboard shortcut that opens the panel as a pop-up with a close button.

**Independent Test**: The built gadget shows `Dziś: <total>` in the same colour the bar would have and `Otwórz panel` asks the gateway to navigate to the panel page; the panel built in pop-up mode shows a close button that asks the gateway to close, and the page mode shows none.

### Implementation and tests for User Story 5

- [X] T046 [P] [US5] Create `src/gadget/index.html` and `src/gadget/main.ts`: read settings, apply the theme, load the `today` period with `loadPeriod`, show `Dziś: <total>` with the total coloured through the same `--wt-total-*` properties and `summarise` as the panel, show a button `Otwórz panel` that calls `gateway.navigate(context.panelPath)` and is not rendered when `panelPath` is `null`, reload at the `refreshMinutes` interval (never when 0), and show the Polish loading and error texts with retry.
- [X] T047 [P] [US5] Create `src/styles/gadget.scss`: a compact single-line layout that wraps the button below the total under 320 px, using the shared tokens and base.
- [X] T048 [US5] Add the pop-up variant to the panel: in `src/panel/main.ts` read `isModal` from `gateway.getContext()`; in `src/ui/header.ts` add a close button (close icon, accessible name `Zamknij`) only when `isModal` is true, calling `gateway.close()`; extend `tests/ui/header.test.ts` for both modes (FR-041, FR-049).
- [X] T049 [US5] Extend `manifest.yml`: resource `gadget` with `path: dist/gadget`; module `jira:dashboardGadget` with key `worktime-today`, title `Czas pracy: dziś`, `resource: gadget`; module `jira:command` with key `worktime-open`, title `Czas pracy: otwórz panel`, a keyboard shortcut, and `target.resource: panel` so it opens the panel as a modal. Use the exact property names from the current Forge manifest reference and the outcome of spike checks S8 and S9; if S9 failed, leave out the command module and record that in `specs/001-worktime-panel/research.md`.
- [X] T050 [P] [US5] Add `tests/ui/gadget.test.ts` (total, colour properties, navigation call, error state, interval 0) and `tests/e2e/gadget.spec.ts` (built gadget in both Playwright projects: text, no horizontal overflow, 44 px button height); add a `?modal=1` switch to `tests/e2e/browser-gateway.ts` and assert in `tests/e2e/panel.spec.ts` that the close button exists only in modal mode.

**Checkpoint**: The panel is reachable from the Apps menu, from a dashboard, and from any Jira page.

---

## Phase 8: User Story 6 - Choose light or dark appearance (Priority: P3)

**Goal**: A switch in settings selects dark or light; dark is the default; the choice previews at once, is kept on "Zapisz", reverted otherwise, and applied from the first paint on later visits.

**Independent Test**: With empty storage the page is dark; flipping the switch changes `data-theme` at once; `Anuluj` restores it; `Zapisz` keeps it and a reload starts light with no dark frame; in both themes every text and both coloured totals meet 4.5:1 contrast.

### Implementation and tests for User Story 6

- [X] T051 [US6] Add the theme switch to `src/ui/settings-popover.ts`: a switch labelled `Tryb ciemny` (`role="switch"`, `aria-checked`), on when the theme is dark; flipping it sets `document.documentElement.dataset.theme` immediately as a preview; `Zapisz` writes the theme together with the interval; `Anuluj`, `Escape`, or an outside click restores the theme that was active when the pop-over opened (FR-044, FR-046); extend `tests/ui/settings-popover.test.ts`.
- [X] T052 [US6] Apply the saved theme before anything is rendered: create `src/theme-init.ts`, which calls `readSettings` and sets `data-theme` on `<html>`, and import it as the first statement of `src/panel/main.ts` and `src/gadget/main.ts`; the pages carry no static `data-theme`, and `src/styles/_base.scss` paints the page background only under `html[data-theme]`, so nothing is painted in the wrong theme before the script runs and an empty storage results in dark (FR-045, FR-047).
- [X] T053 [P] [US6] Review `src/styles/_tokens.scss` light values against the mock-up `specs/001-worktime-panel/inspiration/01-panel-overview.png` and derive the dark values to keep the same layout and hierarchy; make sure both themes define every token and that no component style in `src/styles/` uses a colour, spacing, or radius value that is not a token (Principle IV).
- [X] T054 [P] [US6] Add `tests/e2e/theme.spec.ts`: default is dark; switch preview, cancel, save, and reload behave as specified; for scenarios `h4` and `h20` in both themes compute the contrast ratio of the title total, the total row value, body text, and links against their background and assert at least 4.5:1 (FR-048); run in both Playwright projects.

**Checkpoint**: All six user stories work together.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Gates and checks that span all stories.

- [X] T055 [P] Add `tests/e2e/a11y.spec.ts`: every interactive control in the panel and the gadget is reachable with the Tab key in a sensible order, shows a visible focus ring, and measures at least 44 × 44 CSS pixels in the `phone` project; nothing depends on hover (Principle III, Principle IV).
- [X] T056 [P] Add scenario `month` (60 tickets, 200 entries) to `tests/e2e/browser-gateway.ts` and `tests/e2e/large-period.spec.ts`: all 60 rows are present, the table body scrolls inside itself, the total row stays visible, and rendering completes within 1 second after data arrives (SC-009).
- [X] T057 [P] Add `tests/unit/i18n.test.ts`: every text in the "Texts" table of `specs/001-worktime-panel/contracts/ui.md` exists in `src/i18n/pl.ts` with the same wording; and a source scan asserting that no `.ts` or `.html` file under `src/` other than `src/i18n/pl.ts` contains a Polish diacritic (ą ć ę ł ń ó ś ź ż), as a proxy for user-visible text written outside the text module (FR-035).
- [X] T058 Run `vp run check` and fix what fails; confirm `scripts/check-size.ts` reports each page at or below 100 kB gzipped and write the measured sizes into the "Constitution Check" row for Principle I in `specs/001-worktime-panel/plan.md`.
- [X] T059 [P] Create `README.md` at the repository root: what the app does, prerequisites (Node.js 22.23.4 or later, Atlassian developer account), the commands from `specs/001-worktime-panel/quickstart.md`, how a site admin installs it from the installation link, where to find it in Jira (Apps menu, dashboard gadget, command palette), and known limits (per-browser settings, Jira native mobile apps, Jira search covering only the most recent 1,000 time entries per ticket, a few seconds of delay before new entries appear).
- [X] T060 SUPERSEDED by T072 (Forge deployment no longer exists). Original text: MANUAL: run `npx forge lint`, `npx forge deploy -e production`, and install on a clean Jira Cloud site; execute validation scenarios 1 to 17 (with 6a and 15a) from `specs/001-worktime-panel/quickstart.md` as a second, non-admin user; record the result of each scenario in a "Validation results" section at the end of `specs/001-worktime-panel/quickstart.md`.

---

## Phase 10: Standalone browser extension (replaces the Forge app)

**Purpose**: Deliver the plugin as a browser extension, by the requester's decision of 2026-11-12 (constitution v3.0.0). The domain logic, the Jira loading, and the UI components from Phases 1 to 9 are kept; the Forge delivery is removed.

**What this supersedes**: the Forge parts of T008 (`manifest.yml`), T009 and T010 (Forge gateway, host context), T025 (page entry and HTML), T046 to T050 (gadget, pop-up variant, Forge modules), and the theme bootstrap of T052. Their files no longer exist.

- [X] T061 Change `src/jira/gateway.ts` to `JiraGateway { request(path): Promise<GatewayResponse>; getSession(): Promise<Session> }` (GET only) and create `src/jira/session-gateway.ts` with `tests/unit/session-gateway.test.ts`: `request` calls `fetch(path, { method: 'GET', credentials: 'same-origin', headers: { Accept: 'application/json' } })`; `getSession` reads `GET /rest/api/3/myself` and returns `accountId`, `timeZone` (the browser's zone when absent), and `siteUrl` = `location.origin`; it rejects when the status is not 200 or `accountId` is missing. Delete `src/jira/forge-gateway.ts` and remove the `@forge/bridge` dependency.
- [X] T062 Change the issue search in `src/jira/worklog-loader.ts` from POST to `GET /rest/api/3/search/jql?jql=…&fields=summary&maxResults=100[&nextPageToken=…]` and update `tests/unit/worklog-loader.test.ts` and `tests/fake-gateway.ts` (routes by path, query parsed from the path).
- [X] T063 [P] Create `src/ui/launcher.ts`: a button with a coloured dot, the label `Dziś:`, and today's total; `show(summary)`, `showError()` (a dash, with the Polish error text as tooltip), `setExpanded()`.
- [X] T064 Create `src/ui/app.ts` with `tests/ui/app.test.ts` (replaces `src/ui/panel.ts`, `src/ui/gadget.ts`, and their tests): `mountApp(container, gateway, deps)` reads the session (resolving with `null` and drawing nothing when nobody is signed in), builds a `.wt-root` element carrying the theme, the hidden panel, and the launcher; loads today's total for the launcher on mount and at the auto-refresh interval; `open()` shows the panel on the `today` preset and moves the focus into it; `close()`, the close button, and Escape hide it and return the focus to the launcher; while the open panel shows today the launcher takes its total from the panel's load; nothing is requested while the tab is hidden; `keydown`, `keyup`, and `keypress` are stopped at the root so Jira's shortcuts do not fire.
- [X] T065 Adapt the components: `src/ui/header.ts` always has the close button and a `focus()` method; `src/ui/table.ts` renders ticket numbers as plain links (`target="_blank"`, `rel="noopener noreferrer"`); `src/ui/controller.ts` takes a `Session`, has `setActive(active)` (no auto-refresh while the panel is closed) and an `onLoaded(period, summary)` callback; `src/ui/settings-popover.ts` takes `scope` and `themeTarget` and uses the event's composed path to tell inside from outside; `src/ui/theme.ts` applies the theme to a given element. Update `tests/ui/header.test.ts` and `tests/ui/table.test.ts`.
- [X] T066 Rework the styles into `src/styles/app.scss`, `_tokens.scss`, `_base.scss`: tokens on `.wt-root` instead of the page root; `:host { all: initial }`; all sizes in px; the panel `position: fixed` above the launcher with `max-height` bound to the window, rows scrolling inside it from 600 px up and the whole panel scrolling below; the launcher as a fixed pill in the bottom-right corner. Delete `src/styles/gadget.scss`.
- [X] T067 Create `src/content/main.ts` (the content script): create the host element `#jira-custom-tempo` once, attach an open shadow root, attach the compiled stylesheet (imported as text with `?inline`) through `adoptedStyleSheets` with a `<style>` fallback, and call `mountApp`. Add `src/types.d.ts` for the `?inline` import. Delete `src/panel/`, `src/gadget/`, and `src/theme-init.ts`.
- [X] T068 Create `extension/manifest.json` (Manifest V3, no permissions, one content script on `https://*.atlassian.net/*` excluding `/wiki/*`, top frame only, `run_at: document_idle`, icons) and the icons `extension/icons/icon-16.png`, `icon-48.png`, `icon-128.png` drawn from `scripts/icon.svg`. Delete `manifest.yml`.
- [X] T069 Rewrite `vite.config.ts` for the extension: `vp build` makes `dist/extension/content.js` (library build, IIFE) and copies `extension/` next to it; mode `demo` builds and serves `demo/index.html`, a stand-in Jira page that loads the same content script with `src/jira/session-gateway` aliased to `tests/e2e/browser-gateway.ts`. Update the `package.json` scripts (`dev`, `build`, `build:demo`, `preview`, `package`, `test:e2e`, `check`). Create `demo/index.html` and `demo/main.ts`.
- [X] T070 [P] Create `scripts/package.ts`: pack `dist/extension/` into `dist/jira-custom-tempo-<version>.zip` using `node:zlib` only (no dependency), with a fixed timestamp so the archive is reproducible; run by `vp run package`.
- [X] T071 Rewrite the browser tests for the overlay: `tests/e2e/helpers.ts`, `panel.spec.ts`, `launcher.spec.ts` (replaces `gadget.spec.ts`; corner position, colour, signed-out, key isolation, style isolation), `progress.spec.ts`, `periods.spec.ts`, `refresh.spec.ts`, `theme.spec.ts`, `a11y.spec.ts`, `large-period.spec.ts`; and add `tests/e2e/extension.spec.ts` in its own Playwright project, which loads the built `dist/extension` into Chromium, answers a Jira Cloud address from the test, and checks injection, the session requests (GET only), the signed-out case, and that Confluence pages are left alone.
- [ ] T072 MANUAL: load `dist/extension/` unpacked in Chrome or Edge, open a Jira Cloud site while signed in, and run checks X1 to X6 from `specs/001-worktime-panel/research.md` and the validation scenarios in `specs/001-worktime-panel/quickstart.md`; record the results in a "Validation results" section at the end of `quickstart.md`.

**Checkpoint**: `vp run check` passes: format, lint, types, unit and UI tests, build with size check, and browser tests including the real extension.

---

## Phase 11: Usability changes of Amendment 6

**Purpose**: The twelve changes and the icon requested on 2026-11-12 after the first use (spec Amendment 6, FR-055 to FR-067). Each task changes code and its tests together.

- [X] T073 [US3] Extend `src/domain/period.ts` and `tests/unit/period.test.ts`: presets `dayBeforeYesterday`, `thisYear`, `prevYear`; the lists `DAY_PRESETS` and `RANGE_PRESETS`; `dayPeriod(date)`; `shift` moves a full calendar year by one year. Add the texts `Przedwczoraj`, `Ten rok`, `Poprzedni rok`, `Dzień:`, and the two sort hints to `src/i18n/pl.ts` (FR-022, FR-025, FR-057).
- [X] T074 [US3] Rebuild `src/ui/period-bar.ts` and `tests/ui/period-bar.test.ts` as one framed box of three rows (days with the arrows and the `#wt-day` date input; longer presets; "Od"/"Do"); a change of "Od" moves "Do" to the same day, to 23:59 when it would be earlier; a change of "Do" to earlier than "Od" is rejected (FR-055, FR-056, FR-057, FR-027).
- [X] T075 [US2] Change `src/ui/progress.ts` and `tests/ui/progress.test.ts`: `update(summary, period)`; a hover tip of two lines (period, "Suma czasu:" with the coloured total), hidden from assistive technology; in `src/styles/app.scss` the space around the bar is 2.5 times the former one and the inactive bar with its scale has 25% opacity (FR-058, FR-066, FR-019).
- [X] T076 [US1] Change `src/ui/table.ts` and `tests/ui/table.test.ts`: column headers are buttons that sort (`sortRows`, `aria-sort`, order kept across renders); `showLoading()` shows a spinner over `.wt-table-area` and keeps the rows; the total-row label is right-aligned with its value and takes its colour (FR-060, FR-062, FR-063).
- [X] T077 [US4] Change `src/ui/controller.ts` and `src/ui/header.ts`: a change of period keeps the old rows on screen until the new ones arrive and shows `…` as the title total meanwhile; a failed load of a new period removes the old rows; `resume()` reloads the kept period and lets a preset follow the calendar (FR-060, FR-064).
- [X] T078 [US5] Change `src/ui/app.ts` and `tests/ui/app.test.ts`: `minimise()` (launcher, Escape) keeps the period, `close()` (close button) makes the next opening start on today; `open()` chooses between the two (FR-049, FR-064).
- [X] T079 [US6] Change `src/ui/settings-popover.ts`, `src/ui/dom.ts` (icons `sun`, `moon`), `src/styles/_tokens.scss` (five `--wt-switch-*` tokens in both themes), and `src/styles/app.scss`: a divider under the title; the theme switch as a sun-and-moon pill with a sliding knob, directly after its label (FR-044).
- [X] T080 Change `src/styles/app.scss` and `_tokens.scss`: the panel is 800 px wide with the fixed height `max(50svh, 640px)` limited by the window; `.wt-table-area` takes the remaining height with the table at its top; the launcher has a hover colour (FR-059, FR-061, FR-065).
- [X] T081 [P] Replace `scripts/icon.svg` with the requester's drawing; create `scripts/make-icons.ts` and the script `icons` in `package.json`; regenerate `extension/icons/icon-16.png`, `icon-48.png`, `icon-128.png` and add `icon-32.png`; list the 32 px icon in `extension/manifest.json`; give `demo/index.html` the icon as its favicon (FR-067).
- [X] T082 Update the browser tests: `tests/e2e/periods.spec.ts` (day before yesterday, "Od" moves "Do", the day field, years), `progress.spec.ts`, `a11y.spec.ts`, and the new `tests/e2e/layout.spec.ts` (fixed height, total row, sorting, progress tip, launcher hover, minimise and close, settings layout).
- [X] T083 [P] Create `BrowserInstallation.md` in the repository root: a short Polish guide for non-technical users on installing the extension in Chrome, Edge, Brave, Opera, and Vivaldi, and what to expect in Firefox and Safari; link it from `README.md`.
- [ ] T084 MANUAL: repeat T072 with scenarios 24 to 35 of `specs/001-worktime-panel/quickstart.md` on a real Jira Cloud site.

**Checkpoint**: `vp run check` passes.

---

## Phase 12: Changes of Amendment 7

**Purpose**: The nine changes requested on 2026-11-12 after trying the extension on a real Jira site (spec Amendment 7; FR-020, FR-040, FR-044, FR-055, FR-059, FR-065, FR-066, FR-068 to FR-070).

- [X] T085 Add `panelHeight` (integer 440 to 4000, or `null`) to `src/domain/settings.ts` with `MIN_PANEL_HEIGHT`, and extend `tests/unit/settings.test.ts`; create `src/ui/resize.ts` (a `role="separator"` grip on the panel's top edge: pointer drag, arrow keys, Home and double click for the default) and wire it in `src/ui/app.ts` so the height is applied on mount and stored on change; the settings pop-over keeps the stored height on "Zapisz" (FR-059).
- [X] T086 [US5] Move the launcher 88 px from the right edge (`--wt-launcher-right` in `src/styles/_tokens.scss`) (FR-069).
- [X] T087 [US5] Make the launcher follow the panel's period: `formatLauncherLabel` in `src/domain/format.ts` (`Dziś:`, a date, `Zakres:`), `show(summary, period)` in `src/ui/launcher.ts`, `onFailed` in `src/ui/controller.ts`, and in `src/ui/app.ts` the launcher takes every load of the panel, refreshes the kept period while minimised, and returns to today after the close button (FR-040).
- [X] T088 Add hover colours: the `hover` mixin in `src/styles/_base.scss`, used by `.wt-button`, `.wt-chip`, `.wt-launcher`, `.wt-switch`; the inverted hover of `.wt-chip--active` and `.wt-button--primary`; the token `--wt-hover` (FR-065).
- [X] T089 [US2] Remove the caption under the progress bar and every text about the norm (`formatCaption`, `pl.normReached`, `pl.normMissing`), centre the bar between the period box and the table, and remove the subtitle from `src/ui/header.ts` and `pl.subtitle` (FR-020, FR-066, FR-070).
- [X] T090 Show a total of zero muted: `applyTotal` in `src/ui/dom.ts` sets `data-zero`; used by the header, the total row, the progress tip, and the launcher (FR-068).
- [X] T091 [US6] Rebuild the theme switch in `src/styles/app.scss`: an accent-coloured knob with the same gap to the border on every side, the active icon in `--wt-on-accent`; remove the tokens `--wt-switch-knob` and `--wt-switch-icon-active` (FR-044).
- [X] T092 [US3] Centre and pack the three rows of the period box (FR-055).
- [X] T093 Update the tests: `tests/ui/app.test.ts` (launcher label, minimised refresh, panel height), `header.test.ts`, `progress.test.ts`, `settings-popover.test.ts`, `tests/unit/format.test.ts`; `tests/e2e/layout.spec.ts` (height drag, hover, zero, centred rows, switch gaps, launcher label), `launcher.spec.ts`, `periods.spec.ts`, `progress.spec.ts`, `theme.spec.ts`; and in `tests/e2e/extension.spec.ts` a check on the real built extension that minimising with the launcher keeps the period until the close button.
- [ ] T094 MANUAL: repeat T072 with scenarios 36 to 44 of `specs/001-worktime-panel/quickstart.md` on a real Jira Cloud site; in particular confirm that minimising with the launcher keeps the period there (reported as resetting on 2026-11-12; not reproduced in the automated run against the built extension).

**Checkpoint**: `vp run check` passes.

---

## Phase 13: Changes of Amendment 8

**Purpose**: The seven changes requested on 2026-11-12 after the second try on a real Jira site (spec Amendment 8; FR-022, FR-031, FR-044, FR-055, FR-059, FR-069, FR-071 to FR-074).

- [X] T095 Add `panelWidth` (integer 640 to 4000, or `null`) and `launcher` (`{ right, bottom }` or `null`) to `src/domain/settings.ts` with `MIN_PANEL_WIDTH`, `PanelSize`, `LauncherPosition`, and extend `tests/unit/settings.test.ts` (FR-071, FR-072).
- [X] T096 Rewrite `src/ui/resize.ts` as `createResizeHandles`: three grips (height, width, corner) on the panel's free edges, found from the launcher's place and named on the panel as `data-free-block` and `data-free-inline`; pointer drag limited to the window, arrow keys, Home and double click for the default; wire it in `src/ui/app.ts` (FR-059, FR-071).
- [X] T097 [US5] Make the launcher movable in `src/ui/launcher.ts`: pointer drag with a 4 px threshold and immediate pointer capture, the click after a drag ignored, Shift with the arrow keys, `clampLauncher`; in `src/ui/app.ts` set `--wt-launcher-right` and `--wt-launcher-bottom` on the root, store the place, and keep it inside the window on a window resize (FR-072).
- [X] T098 [US5] Hang the panel on the launcher in `src/styles/app.scss`: `anchor-name` on the launcher, `position-anchor`, `anchor()` insets, `position-try-fallbacks` (`flip-block`, `flip-inline`, both, and three `@position-try` rules for small windows), a fallback from the two offsets for browsers without anchor positioning; the launcher comes before the panel in the root; default place 88 px from the right, middle 48 px above the bottom (`--wt-launcher-bottom`, `--wt-panel-gap`, `--wt-panel-min-width` in `src/styles/_tokens.scss`) (FR-069, FR-072).
- [X] T099 [US5] No text cursor and no text selection in the launcher: `caret-color: transparent`, `user-select: none` (FR-074).
- [X] T100 [US3] Reduce the period box in `src/ui/period-bar.ts` and `src/domain/period.ts` (`PANEL_PRESETS`): the first row is the arrows around "Dzień:", the second row "Wczoraj", "Ten tydzień", "Ten miesiąc", "Ten rok"; remove the unused preset texts from `src/i18n/pl.ts` and write the range labels as `Od:` and `Do:` (FR-022, FR-055).
- [X] T101 [US6] Centre the icons of the theme switch on the knob's two places and shift the moon optically (FR-044); move the explanation of the interval from a line of text to the tooltip of its row and the description of the field in `src/ui/settings-popover.ts` (FR-073).
- [X] T102 Update the tests: `tests/ui/app.test.ts` (panel width, corner, launcher drag, keyboard move, stored place), `period-bar.test.ts`, `settings-popover.test.ts`; `tests/e2e/layout.spec.ts` (width and corner drag with the no-wrap check, the panel hanging on the dragged launcher with both fallbacks, no text cursor, the centred icons, the tooltip), `launcher.spec.ts` (level with Jira's button), `periods.spec.ts`, `theme.spec.ts`, `large-period.spec.ts`, `extension.spec.ts`; the helper `selectDay` in `tests/e2e/helpers.ts`.
- [X] T104 [US5] Keep the panel and the launcher inside the window together in `src/styles/app.scss`: the panel's height is limited to the larger of `--wt-room-above` and `--wt-room-below`, both worked out from the launcher's offsets; the fallback that pinned the panel over the launcher is removed; the launcher has one fixed height; a panel lower than its content scrolls and its table part keeps 140 px; the drag limit in `src/ui/resize.ts` matches the 16 px edge. Test in `tests/e2e/layout.spec.ts`: the launcher dragged to 25 places in two window sizes with an oversized panel (FR-075).
- [X] T105 [US5] Choose the panel's side of the launcher in script instead of with `position-try-fallbacks`: `place()` in `src/ui/resize.ts` sets `data-place-block` and `data-place-inline` on the panel, `sync()` runs on open, on every launcher move, on a window resize, and after a size change; `src/styles/app.scss` turns the names into `anchor()` insets and drops the `@position-try` rules. Test in `tests/e2e/layout.spec.ts`: the window made narrow, wide, low, and high again with the launcher at the top left (FR-075).
- [ ] T103 MANUAL: repeat T072 with scenarios 45 to 59 of `specs/001-worktime-panel/quickstart.md` on a real Jira Cloud site; in particular confirm that the launcher stands level with Jira's corner button and that no text cursor blinks in it after minimising (reported on 2026-11-12; not reproduced in the automated run).

**Checkpoint**: `vp run check` passes.

---

## Phase 14: The bar chart of Amendment 9

**Purpose**: A bar chart in place of the progress bar for periods longer than one day, requested on 2026-11-13 (spec Amendment 9; FR-019, FR-076 to FR-079).

- [X] T106 [US3] Create `src/domain/chart.ts` and `tests/unit/chart.test.ts`: `autoGranularity` (day up to 31 days, month up to 24 months, year beyond), `zoomLevels`, `buildChart` (one bucket per day, month, or year, entries by their start day in the user's time zone, colour by the day's total or the average per working day), `chartScale` (round hours, at most four steps); export `colourFor` from `src/domain/summary.ts`; add `formatBucket` and `formatBucketLabel` to `src/domain/format.ts` (FR-076, FR-077, FR-079).
- [X] T107 [US3] Create `src/ui/chart.ts` and `tests/ui/chart.test.ts`: axis, grid lines and the norm line, one column per bucket with its bar and label, the tip for the column under the pointer or chosen with the arrow keys, zoom with two buttons, the plus and minus keys, and Ctrl with the wheel, keeping the part in view; labels thinned out by the measured width; the zoom kept on a refresh of the same period (FR-076, FR-078, FR-079).
- [X] T108 [US3] Show the chart in place of the bar: `src/ui/progress.ts` takes the rows and the time zone and switches between the bar and the chart (`wt-progress--chart`), `src/ui/controller.ts` passes them; remove the faded inactive bar (FR-019).
- [X] T109 [US3] Style the chart in `src/styles/app.scss`: columns 2 px apart, bars in `--wt-progress-*` colours at 75% opacity and 100% under the pointer, the tip, the zoom buttons, the plot height from the panel's (`container-type: size` on the panel), the table part's lowest height 124 px; add the icons `plus` and `minus` to `src/ui/dom.ts` and the texts `Wykres czasu`, `Przybliż`, `Oddal` to `src/i18n/pl.ts` (FR-076, FR-079).
- [X] T110 Update the tests: `tests/ui/progress.test.ts` and `tests/ui/app.test.ts` (the chart instead of the gray bar), `tests/e2e/periods.spec.ts`; new `tests/e2e/chart.spec.ts` (a week by days, bars apart, colours, hover strength and tip, a year by months, zoom to days with scrolling, keyboard, Ctrl with the wheel, no zoom inside one month, both themes).
- [ ] T111 MANUAL: repeat T072 with scenarios 60 to 68 of `specs/001-worktime-panel/quickstart.md` on a real Jira Cloud site, with a year of real entries.

**Checkpoint**: `vp run check` passes.

---

## Phase 15: Selecting a bar, Amendment 10

**Purpose**: A click on a bar of the chart shows only its year, month, or day, from the data already loaded, requested on 2026-11-13 (spec Amendment 10; FR-080, FR-081).

- [X] T112 [US3] Add `contains` and `slicePeriod` to `src/domain/period.ts` and `filterRows` to `src/domain/worklog.ts` (the entries that start inside a period, tickets without any left out, rows ordered as after a load); test them in `tests/unit/chart.test.ts` (FR-080, FR-081).
- [X] T113 [US3] `src/ui/chart.ts`: `onSelect` with the bar's part of the period on a click and on Enter or Space for the chosen bar; pass it through `src/ui/progress.ts`; pointer cursor on the columns in `src/styles/app.scss`; `tests/ui/chart.test.ts` (FR-080).
- [X] T114 [US3] `src/ui/controller.ts`: keep the last load with its period; `selectPart` serves a period inside it without a request, cancels a load on its way, and otherwise loads; wire it in `src/ui/app.ts`; `tests/ui/app.test.ts` (a day from the loaded week, an empty day, no request, refresh asks Jira) (FR-081).
- [X] T115 [US3] `tests/e2e/chart.spec.ts`: a year, a click on a month, a click on a day, the fields, the table, and no request to the fake Jira.
- [ ] T116 MANUAL: repeat T072 with scenarios 69 to 73 of `specs/001-worktime-panel/quickstart.md` on a real Jira Cloud site.

**Checkpoint**: `vp run check` passes.

---

## Phase 16: Back and forward, Amendment 11

**Purpose**: Two header buttons that return to the previous view and to the one the user came back from, up to 10 steps, from remembered data, requested on 2026-11-13 (spec Amendment 11; FR-082, FR-083).

- [X] T117 [US3] `src/ui/controller.ts`: the list of views with their rows and the position; a step on every change of period by the user (not on a refresh, the same period, or a preset following the calendar), at most 10 back; `back` and `forward` show a loaded view without a request and load one that never loaded; `start` empties the list (FR-082, FR-083).
- [X] T118 [US3] `src/ui/header.ts`: the buttons "Cofnij" and "Ponów" before "Odśwież", `setHistory`, the focus kept when a button is switched off; icons `undo` and `redo` in `src/ui/dom.ts`; texts in `src/i18n/pl.ts`; `src/ui/app.ts` wires them and starts again after the close button (FR-082).
- [X] T119 [US3] Styles: the disabled look of the two buttons in `src/styles/_base.scss`; the header wraps at 600 px and narrower in `src/styles/app.scss`.
- [X] T120 Tests: `tests/ui/header.test.ts` (order, disabled, focus), `tests/ui/app.test.ts` (back and forward without requests, a new step drops the forward views, ten steps, close forgets, a failed view loads again), `tests/e2e/chart.spec.ts` (year, month, day, and back and forward through them without a request).
- [ ] T121 MANUAL: repeat T072 with scenarios 74 to 78 of `specs/001-worktime-panel/quickstart.md` on a real Jira Cloud site.

**Checkpoint**: `vp run check` passes.

---

## Phase 17: The installation guide in the build

**Purpose**: `BrowserInstallation.md` is always copied into `dist/extension`, requested on 2026-11-13.

- [X] T122 `vite.config.ts`: a build plugin that emits `BrowserInstallation.md` into the extension build (not the demo build); the build fails when the guide is missing. `tests/e2e/extension.spec.ts` checks the copy. `README.md`, `plan.md`, and `quickstart.md` name it.

---

## Phase 18: The period steps, Amendment 12

**Purpose**: The previous and next arrows move beside the three rows of the period box, as round buttons at the middle of their height, requested on 2026-11-13 (spec Amendment 12; FR-055, FR-084).

- [X] T123 [US3] `src/ui/period-bar.ts`: the box holds the previous step, a body with the three rows, and the next step (`wt-period__step`, `wt-period__body`); `src/styles/app.scss`: a three-column grid, the group as wide as its widest row and centred, the steps as circles at the middle of the rows and the hover of the other buttons, side by side above the rows at 600 px and narrower; update `tests/ui/period-bar.test.ts`, `tests/e2e/periods.spec.ts`, `tests/e2e/layout.spec.ts` (FR-084).

---

## Phase 19: The period buttons, Amendment 13

**Purpose**: "Dzień", "Tydzień", "Miesiąc", "Rok" for the current day, week, month, and year, selected like radio buttons by the kind of period, requested on 2026-11-13 (spec Amendment 13; FR-022, FR-085).

- [X] T124 [US3] `src/domain/period.ts`: `PanelPreset` is `today`, `thisWeek`, `thisMonth`, `thisYear`; add `PeriodKind`, `PRESET_KIND`, and `periodKind`; `src/i18n/pl.ts`: the four names; `src/ui/period-bar.ts`: the selected button follows the kind of the period (FR-022, FR-085).
- [X] T125 [US3] `src/ui/controller.ts`: `selectPreset` loads the period when it is already on screen and otherwise serves it from the kept load when it lies inside it (FR-085).
- [X] T126 Update the tests to the new names and behaviour (`tests/ui/period-bar.test.ts`, `tests/ui/app.test.ts`, and the browser tests that used "Wczoraj"); update `README.md`, `contracts/ui.md`, `data-model.md`, `quickstart.md`.
- [ ] T127 MANUAL: repeat T072 with scenarios 79 to 83 of `specs/001-worktime-panel/quickstart.md` on a real Jira Cloud site.

---

## Phase 20: The minimise button, Amendment 14

**Purpose**: A header button that hides the panel like the launcher does, requested on 2026-11-13 (spec Amendment 14; FR-086).

- [X] T128 [US5] `src/ui/header.ts`: the button "Minimalizuj" between settings and close with `onMinimise`; the icon `minimise` in `src/ui/dom.ts`; the text in `src/i18n/pl.ts`; `src/ui/app.ts` wires it to the same function as the launcher; tests in `tests/ui/header.test.ts`, `tests/ui/app.test.ts`, `tests/e2e/layout.spec.ts`; `contracts/ui.md`, `quickstart.md` scenario 84, `README.md` (FR-086).

---

## Phase 21: Pictures in the README

**Purpose**: The README shows what the extension looks like and can do, requested on 2026-11-13.

- [X] T129 `scripts/screenshots.ts` and the script `screenshots` in `package.json`: serve the built stand-in page, open it in Chromium on 6 November 2026 with the Polish browser language, and save the launcher, a day, a week, a year, a month, the settings, and the light appearance into `docs/screenshots/`; the scenario `showcase` in `tests/e2e/browser-gateway.ts` (a year of plausible entries, the same on every run); a "Screenshots" section in `README.md`.

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
- A task that creates code also creates or extends its test file; the story is done when `vp run check` passes.

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
4. **Stop and validate**: `vp run check`; then T016 (spike) on a real site, which also proves the MVP inside Jira.
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

- Revised 2026-11-12 after `/speckit-analyze`: findings U1, G1, I1, U2, and U4 were folded into T004, T007, T009, T010, T046, and T052; T001 no longer installs the Forge CLI; T057 uses an automatable check.
- Changed 2026-11-12 after implementation, by the requester's decision: Vite+ (`vp`) is the mandatory toolchain (constitution v2.2.0). T001, T002, T004 to T007, T052, and T058 were first built with an `esbuild` script, `scripts/serve.ts`, and `vitest.config.ts`; their descriptions above now state the Vite+ setup that replaced them and is in the repository.
- Changed 2026-11-12, by the requester's decision: the plugin is a standalone browser extension (constitution v3.0.0). Phase 10 records the conversion; tasks that only served the Forge delivery are superseded and their files are gone.
- Changed 2026-11-12, by the requester's decision: twelve usability changes and the icon (spec Amendment 6). Phase 11 records them. They change behaviour that earlier tasks describe: T034 and T064 (the panel no longer always opens on today), T023 and T026 (the table is not emptied while loading; the panel has a fixed height), T035 (period bar layout), T051 (theme switch look).
- Changed 2026-11-12, by the requester's decision: nine further changes (spec Amendment 7). Phase 12 records them. They replace parts of Phase 11: the fixed panel height and the spacing of T075 and T080, the launcher that always showed today (T063, T064), the caption of T030 and T075, and the look of the switch in T079.
- Changed 2026-11-12, by the requester's decision: seven further changes (spec Amendment 8). Phase 13 records them. They replace parts of earlier phases: the presets of T073, the single height grip of T085, the fixed launcher place of T086, and the centred rows of T092 now hold fewer buttons.
- Changed 2026-11-13, by the requester's decision: the bar chart (spec Amendment 9). Phase 14 records it. It replaces the faded inactive bar of T077.
- Changed 2026-11-13, by the requester's decision: selecting a bar of the chart (spec Amendment 10). Phase 15 records it.
- Changed 2026-11-13, by the requester's decision: back and forward through the views (spec Amendment 11). Phase 16 records it.
- Changed 2026-11-13, by the requester's decision: the period arrows beside the rows and the buttons "Dzień", "Tydzień", "Miesiąc", "Rok" (spec Amendments 12 and 13). Phases 18 and 19 record them.
- Eight tasks are MANUAL (T072, T084, T094, T103, T111, T116, T121, T127). Earlier manual tasks (T016, T060): they need an Atlassian account, `forge login`, and a Jira Cloud site. Everything else can be done and verified locally.
- Node.js on the development machine is 22.23.2; the Forge CLI needs 22.23.4 or later. Local build and tests are not affected; T016 and T060 are.
- Plan deltas D4 (table scrolls inside itself) and D5 (no auto-refresh in a hidden tab) are built in T026 and T042. If the requester rejects either, change those two tasks.
- `specs/001-worktime-panel/checklists/ux.md` has 36 unchecked review items. `/speckit-implement` reads checklist state as a gate and will ask before proceeding while they are unchecked.
- Commit after each task or logical group; stop at any checkpoint to validate a story on its own.
