# Implementation Plan: Worktime Panel (Jira Custom Tempo)

**Branch**: `001-worktime-panel` (spec directory; work is currently on git branch `dev`) | **Date**: 2026-11-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-worktime-panel/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

**Revision**: rewritten on 2026-11-12 for constitution v3.0.0 and spec Amendment 5: the
plugin is a standalone browser extension. It replaces the earlier plan for an Atlassian Forge
app. The plan describes what is built and in the repository. No open NEEDS CLARIFICATION
items.

## Summary

A browser extension that shows a signed-in Jira Cloud user their own logged time. On every
Jira page a launcher shows today's total; it opens a panel with one table row per ticket,
every time entry, row sums, a total, and a progress bar against the 8-hour daily norm, for
today or another period, in Polish, in a dark or light theme.

Technical approach (from [research.md](research.md)): one content script, built with Vite+,
draws the add-on inside a shadow root on Jira Cloud pages and reads the Jira REST API of the
same site with the user's existing session. Only `GET` requests, no extension permissions, no
runtime dependencies, no server.

## Technical Context

**Language/Version**: TypeScript in `strict` mode; SCSS (Dart Sass). No hand-written
JavaScript or CSS sources (constitution).

**Primary Dependencies**: runtime: none. Development only: `vite-plus` (the Vite+ toolchain),
`sass`, `typescript`, `happy-dom`, `@playwright/test`, `@types/node`. All are pinned to exact
versions in `package.json` and the lock file.

**Toolchain (mandatory)**: Vite+, the `vp` command (constitution, Technical Constraints). It
installs dependencies, serves the stand-in Jira page in development, builds the extension, runs
the unit and UI tests, and lints, formats, and type-checks. All of it is configured in
`vite.config.ts`. No other bundler, build script, test runner, linter, or formatter may be
added. Playwright stays for browser tests, because Vite+ does not cover that job.

**Storage**: none on a server. Two user settings in the `localStorage` of the Jira site
([contracts/settings-storage.md](contracts/settings-storage.md)). All Jira data is read on
demand and held in memory.

**Testing**: `vp test` (Vitest inside Vite+) for domain, Jira access, and UI logic (with
`happy-dom`); Playwright (Chromium) on a stand-in Jira page at 320 px, 1280 px, and 1920 px in
both themes; and Playwright with the real built extension loaded into Chromium against a faked
Jira Cloud address. No test needs a live Jira.

**Target Platform**: browser extension, Manifest V3, one content script on
`https://*.atlassian.net/*` (not `/wiki/*`). Tested in Chromium; intended for Chrome and Edge.
Jira Cloud only.

**Project Type**: single front-end project packaged as a browser extension.

**Performance Goals**: today's total on the launcher and today's data in the panel within 3 s
(SC-001, SC-003); a month of 200 entries on 60 tickets renders fully and stays responsive
(SC-009); theme change visible in under 1 s (SC-010).

**Constraints**: Vite+ for every development task (constitution); the shipped script at most
100 kB gzipped (Principle I; measured 12.2 kB); no extension permissions; `GET` requests to the
page's own origin only; at most 5 concurrent Jira requests; no requests while the tab is
hidden; nothing on the Jira page is changed outside the add-on's own element; layout from
320 px to 1920 px with 44 px touch targets (Principle III).

**Scale/Scope**: one user's own data; typical day 3 to 8 tickets, worst planned case 60 tickets
and 200 entries per period. One launcher, one panel, one settings popover; 54 functional
requirements.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Checked against constitution v3.0.0.

| Principle | How this plan satisfies it | Result |
|-----------|----------------------------|--------|
| I. Minimal Footprint | No UI framework and no runtime dependency; `vp run build` measures the gzipped size and fails above 100 kB. Measured on 2026-11-12: the whole content script, styles included, is 12.2 kB gzipped. Icons are inline SVG in the script; no fonts shipped. | Pass |
| II. Minimal Dependencies | Zero runtime dependencies. Dates, time zones, and formatting use the browser's `Intl`; the zip file is written with `node:zlib`. All development versions pinned by lock file. | Pass |
| III. Responsive on Mobile and Desktop | One code base and one stylesheet; fluid from 320 px to 1920 px; the table restacks under 600 px; 44 px targets on touch devices and narrow screens; nothing depends on hover. Browser tests at 320 px, 1280 px, and 1920 px. Limit: most mobile browsers do not run extensions (spec, Assumptions). | Pass |
| IV. Modern, Consistent User Interface | All colours, spacing, type, and radii from one SCSS token file; dark and light differ only in token values; theme chosen by a switch, default dark, remembered in the browser; loading, empty, and error states defined; contrast and keyboard rules in [contracts/ui.md](contracts/ui.md), checked by browser tests. | Pass |
| V. Tested Behavior | Jira access sits behind one interface, faked in tests; unit, UI, and browser tests run with one command and no live Jira; the real built extension is tested in Chromium. | Pass |
| VI. Install-Only Setup | One self-contained extension, installed through the browser; it works on the next Jira page with defaults; no server, no account, no password, token, or address asked for. | Pass |

Technical Constraints: standalone web extension, not an app on a Jira app platform (pass);
TypeScript and SCSS only (pass); reads Jira only through the documented REST API, never from
the page's markup (pass); read-only: `GET` requests only, asserted by tests (pass); keeps to
one isolated element on the page, asserted by tests (pass); no browser permission requested,
only the Jira Cloud address pattern declared (pass); settings stored in the browser only
(pass); no data sent to third parties, no other host contacted (pass); Vite+ as the only
toolchain (pass); one-command reproducible build, `vp run build` (pass).

**Gate result**: Pass. No violations to justify.

## Open points

| # | Point | Planned | Reason |
|---|-------|---------|--------|
| D5 | Not in spec: auto-refresh pauses while the browser tab is hidden and runs once when it becomes visible again | Built as described | Avoids requests nobody sees |
| D6 | Constitution: settings are per browser. With the Jira site's `localStorage` they are also per Jira site | Built as described | The alternative needs an extension permission ([research.md](research.md) R5) |
| D7 | The "Od" / "Do" fields use the browser's own date-time control, so their date format follows the browser, not `dd-mm-yyyy` | Built as described | A custom date picker would add size and complexity |

## Risks

| Risk | Effect | Handling |
|------|--------|----------|
| Six points are unconfirmed on a real Jira Cloud site | Behaviour in Jira differs from the faked Jira | Checks X1 to X6 in [research.md](research.md); task T072 |
| `worklogAuthor` is undocumented in Jira Cloud JQL | Search could fail | Automatic fallback query without it ([contracts/jira-rest.md](contracts/jira-rest.md)) |
| JQL sees only the 1,000 most recent worklogs per issue | Time on very busy issues could be missed | Accepted limitation, stated in the README |
| Jira changes its page or its content security policy | The launcher could be hidden or unstyled | The add-on depends only on the REST API and one host element; a `<style>` fallback exists |
| Browsers allow installing from a file only in developer mode or by company policy | Ordinary users need a store listing | Publishing to a store is a separate step outside this feature |
| A Jira Cloud site on a custom domain is not matched | The add-on does not appear there | Add the domain to `extension/manifest.json` |
| The launcher covers a Jira control in the corner | A Jira button is hard to reach | The user drags the launcher elsewhere (FR-072); check X5 |

## Project Structure

### Documentation (this feature)

```text
specs/001-worktime-panel/
├── plan.md                      # This file
├── spec.md                      # Feature specification
├── research.md                  # Decisions, alternatives, checks on a real Jira site
├── data-model.md                # Entities, rules, view state
├── quickstart.md                # Build, test, install, validation scenarios
├── contracts/
│   ├── jira-rest.md             # Jira REST requests consumed, access rules, error rules
│   ├── settings-storage.md      # localStorage key, format, read and write rules
│   └── ui.md                    # Where it appears, Polish texts, formats, tokens
├── inspiration/                 # Mock-up images from the requester
├── checklists/                  # Spec quality checklist; UX requirements checklist
└── tasks.md                     # Task list, including Phase 10 (the extension)
```

### Source Code (repository root)

```text
package.json
package-lock.json
tsconfig.json
vite.config.ts               # Vite+: extension build, demo mode, tests, lint, format
playwright.config.ts
.node-version
README.md

extension/                   # copied as-is into the built extension
├── manifest.json            # Manifest V3: one content script, no permissions
└── icons/                   # icon-16.png, icon-32.png, icon-48.png, icon-128.png

demo/                        # a stand-in Jira page for preview and browser tests
├── index.html
└── main.ts                  # loads the same content script with a faked Jira

scripts/
├── check-size.ts            # gzipped size of the built extension; fails above 100 kB
├── package.ts               # packs dist/extension into a .zip (node:zlib only)
├── make-icons.ts            # draws the PNG icons from icon.svg (vp run icons)
└── icon.svg                 # source drawing of the icons

src/
├── content/main.ts          # the content script: host element, shadow root, styles, mount
├── domain/                  # pure logic, no DOM, no network
│   ├── local-date.ts        # LocalDate, time-zone day boundaries (Intl)
│   ├── period.ts            # presets (days, weeks, months, years), day and custom range, shift
│   ├── worklog.ts           # TimeEntry, TicketRow: filter, group, sort, sum
│   ├── summary.ts           # PeriodSummary: bar or chart, fill, colour rule
│   ├── chart.ts             # the bar chart's buckets, zoom levels, and axis
│   ├── format.ts            # durations, dates, entry lines, title, caption
│   └── settings.ts          # UserSettings: defaults, validation, storage
├── jira/
│   ├── gateway.ts           # JiraGateway interface (request, getSession)
│   ├── session-gateway.ts   # fetch with the page's Jira session; GET only
│   ├── worklog-loader.ts    # search → per-issue worklogs, paging, fallback query
│   └── request-pool.ts      # concurrency limit, 429 back-off, cancellation
├── ui/
│   ├── app.ts               # launcher + panel, open and close, today's total
│   ├── launcher.ts          # the corner button with today's total
│   ├── controller.ts        # view state machine, auto-refresh timer, visibility
│   ├── header.ts            # title, total, refresh, settings, close
│   ├── period-bar.ts        # the period box: days row with arrows, presets row, Od/Do row
│   ├── progress.ts          # bar and ticks for one day; the chart for longer periods
│   ├── chart.ts             # the bar chart: columns, tip, zoom, selecting a bar
│   ├── table.ts             # rows, multi-line entries, total row, states
│   ├── settings-popover.ts  # interval field, theme switch, Zapisz/Anuluj
│   ├── theme.ts             # applies the dark or light token set to the root
│   └── dom.ts               # small element-building helpers, SVG icons
├── i18n/pl.ts               # every Polish text (contracts/ui.md)
├── styles/
│   ├── _tokens.scss         # design tokens, dark and light values, on .wt-root
│   ├── _base.scss
│   └── app.scss             # launcher and panel
└── types.d.ts

tests/
├── fixtures/                # recorded Jira JSON: search pages, worklogs
├── fake-gateway.ts          # JiraGateway fed from fixtures
├── unit/                    # domain/ and jira/
├── ui/                      # ui/ with happy-dom
└── e2e/                     # Playwright: the stand-in page at 320, 1280, 1920 px,
                             # and extension.spec.ts with the real built extension

dist/                        # build output, not committed
├── extension/               # content.js, manifest.json, icons/: load this in the browser
└── jira-custom-tempo-<version>.zip
```

**Structure Decision**: a single front-end project. `src/domain` holds all rules from
[data-model.md](data-model.md) with no browser or Jira dependency; `src/jira` is the only
place that knows the REST contract, and `session-gateway.ts` the only file that calls `fetch`;
`src/ui` only renders state; `src/content/main.ts` is the one entry that touches the Jira
page. `extension/` holds the static parts of the extension. The demo page loads the very same
content script with a faked Jira, so the browser tests exercise the shipped code path.

## Complexity Tracking

No constitution violations. Nothing to justify.
