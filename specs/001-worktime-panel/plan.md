# Implementation Plan: Worktime Panel (Jira Custom Tempo)

**Branch**: `001-worktime-panel` (spec directory; work is currently on git branch `dev`) | **Date**: 2026-11-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-worktime-panel/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

**Revision**: re-validated on 2026-11-12 against the clarified spec (51 functional
requirements, Clarifications session 2026-11-12) and constitution v2.0.0. No open
NEEDS CLARIFICATION items.

## Summary

A Jira Cloud app that shows the logged-in user their own logged time for a chosen period: one
table row per ticket with every time entry, row sums, a total, and a progress bar against the
8-hour daily norm, all in Polish, in a dark or light theme.

Technical approach (from [research.md](research.md)): an Atlassian Forge app with Custom UI
that runs entirely in the browser. It reads worklogs through the Jira REST API as the current
user, needs the single scope `read:jira-work`, has no backend, and has one runtime dependency
(`@forge/bridge`). The panel is a Jira global page; today's total is a dashboard gadget; a
command-palette entry with a keyboard shortcut opens the same panel as a pop-up from any page.

## Technical Context

**Language/Version**: TypeScript 5.x in `strict` mode; SCSS (Dart Sass). No hand-written
JavaScript or CSS sources (constitution).

**Primary Dependencies**: runtime: `@forge/bridge` only. Development only: `typescript`,
`esbuild`, `sass`, `vitest`, `happy-dom`, `@playwright/test`, `@forge/cli`. Exact versions are
pinned in the lock file when the project is initialised.

**Storage**: none on a server. Two user settings in the browser's `localStorage`
([contracts/settings-storage.md](contracts/settings-storage.md)). All Jira data is read on
demand and held in memory.

**Testing**: `vitest` for domain, Jira access, and UI logic (with `happy-dom`); Playwright
(Chromium) for layout at 360 px and 1280 px in both themes. Jira is always faked from recorded
JSON fixtures; no test needs a live site.

**Target Platform**: Jira Cloud, Atlassian Forge, Custom UI. Modules `jira:globalPage`,
`jira:dashboardGadget`, and `jira:command` (Preview). Current desktop and mobile browsers; the Jira native mobile apps do not
show global pages (platform limit).

**Project Type**: single front-end project (two small pages sharing one code base), packaged
as a Forge app.

**Performance Goals**: today's data visible within 3 s of opening (SC-001, SC-003); a month of
200 entries on 60 tickets renders fully and stays responsive (SC-009); theme change visible in
under 1 s (SC-010).

**Constraints**: compiled script and styles for first render at most 100 kB gzipped per page
(Principle I); no inline styles or scripts (no `unsafe-inline`); at most 5 concurrent Jira
requests; no auto-refresh while the tab is hidden; layout from 320 px to 1920 px with 44 px
touch targets (Principle III).

**Scale/Scope**: one user's own data; typical day 3 to 8 tickets, worst planned case 60 tickets
and 200 entries per period. Two screens (panel as page or pop-up, gadget), one settings popover, 51
functional requirements.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Checked against constitution v2.0.0.

| Principle | How this plan satisfies it | Result |
|-----------|----------------------------|--------|
| I. Minimal Footprint | No UI framework; one runtime dependency of about 15 kB gzipped; a build step measures gzipped size per page and fails above 100 kB; icons are inline SVG; no fonts shipped (system font stack). | Pass |
| II. Minimal Dependencies | Only `@forge/bridge` at run time, justified in [research.md](research.md) R6. Dates, time zones, and formatting use the browser's `Intl`; no date or utility library. All versions pinned by lock file. | Pass |
| III. Responsive on Mobile and Desktop | One code base and one stylesheet; fluid layout 320 px to 1920 px; table restacks under 480 px; 44 px targets; nothing depends on hover. Browser tests at a phone and a desktop width. | Pass |
| IV. Modern, Consistent User Interface | All colours, spacing, type, and radii from one SCSS token file exposed as custom properties; dark and light differ only in token values; theme chosen by a switch, default dark, remembered; loading, empty, and error states defined; contrast and keyboard rules in [contracts/ui.md](contracts/ui.md). | Pass |
| V. Tested Behavior | Jira access sits behind one interface, faked in tests; unit, UI, and browser tests run with one command and no live Jira; responsive tests at two viewports. | Pass |
| VI. Install-Only Setup | Forge app hosted by Atlassian; installed by a site admin from one installation link; works with defaults; no backend, no configuration, no migration. | Pass |

Technical Constraints: TypeScript and SCSS only (pass); documented extension points and APIs
only (pass; one of them, `jira:command`, is documented but labelled Preview, chosen by the
requester and isolated so it can be removed without touching the rest); smallest permission set, one read scope (pass); no data
sent to third parties, no external hosts (pass); one-command reproducible build (pass).

**Gate result (before research)**: Pass. No violations to justify.

**Re-check after Phase 1 design**: Pass. The design added no dependency, no scope, and no
backend. Two points are platform limits, not violations, and are recorded below as spec deltas
and risks.

## Spec deltas found during planning

Three earlier deltas (launcher, close button, where settings are stored) were settled by the
requester in the spec's Clarifications section on 2026-11-12; the spec and this plan now agree
on them. Two small ones remain. Until confirmed, the plan follows the "Planned" column.

| # | Spec says | Planned | Reason |
|---|-----------|---------|--------|
| D4 | Edge case: header and period controls stay reachable in a large period | The table scrolls inside itself with the totals below it in view; the header scrolls with the page | Fixed positioning is unreliable inside the Jira frame ([research.md](research.md) R8) |
| D5 | Not in spec | Auto-refresh pauses while the browser tab is hidden and runs once when it becomes visible again | Protects the app's shared hourly request quota |

## Risks

| Risk | Effect | Handling |
|------|--------|----------|
| Nine platform assumptions are unverified | Design changes late | Spike S1 to S9 in [research.md](research.md) runs as the first task, each with a ready fallback |
| `worklogAuthor` is undocumented in Jira Cloud JQL | Search could fail | Automatic fallback query without it ([contracts/jira-rest.md](contracts/jira-rest.md)) |
| JQL sees only the 1,000 most recent worklogs per issue | Time on very busy issues could be missed | Accepted limitation, stated in the user notes |
| App-wide request quota (65,000 points per hour across all sites) | Refreshes fail with HTTP 429 under heavy use | 5 concurrent requests, `Retry-After` handling, no refresh in hidden tabs |
| `jira:command` is a Preview module | Atlassian can change or withdraw it; shortcuts load only after the command palette was opened once | One isolated manifest entry reusing the panel; page and gadget do not depend on it |
| Users may see a one-time "Allow access" prompt | One extra click on first use | Platform behaviour; documented if confirmed (S7) |
| Jira native mobile apps do not show the page | No panel in the native apps | Platform limit; mobile browser use is covered by the responsive layout |
| Forge CLI needs Node.js 22.23.4 or later; the machine has 22.23.2 | `forge` commands refuse to run | Upgrade Node.js before the first `forge` command ([quickstart.md](quickstart.md)) |

## Project Structure

### Documentation (this feature)

```text
specs/001-worktime-panel/
├── plan.md                      # This file
├── spec.md                      # Feature specification
├── research.md                  # Phase 0: decisions, alternatives, spike list
├── data-model.md                # Phase 1: entities, rules, view state
├── quickstart.md                # Phase 1: build, test, deploy, validation scenarios
├── contracts/
│   ├── jira-rest.md             # Jira REST requests consumed, scopes, error rules
│   ├── settings-storage.md      # localStorage key, format, read and write rules
│   └── ui.md                    # Entry points, Polish texts, formats, tokens
├── inspiration/                 # Mock-up images from the requester
├── checklists/requirements.md   # Spec quality checklist
└── tasks.md                     # Phase 2 output (/speckit-tasks; not created here)
```

### Source Code (repository root)

```text
manifest.yml                 # Forge app: page, gadget, command; resources; scope read:jira-work
package.json
package-lock.json
tsconfig.json
scripts/
├── build.ts                 # esbuild + sass → dist/panel, dist/gadget
└── check-size.ts            # gzipped size per page; fails above 100 kB

src/
├── domain/                  # pure logic, no DOM, no network
│   ├── local-date.ts        # LocalDate, time-zone day boundaries (Intl)
│   ├── period.ts            # presets, custom date-time range, shift
│   ├── worklog.ts           # TimeEntry, TicketRow: filter, group, sort, sum
│   ├── summary.ts           # PeriodSummary: active or inactive bar, fill, colour rule
│   ├── format.ts            # durations, dates, entry lines, title, caption
│   └── settings.ts          # UserSettings: defaults, validation, storage
├── jira/
│   ├── gateway.ts           # JiraGateway interface (request, getContext, navigate)
│   ├── forge-gateway.ts     # the only file importing @forge/bridge
│   ├── worklog-loader.ts    # search → per-issue worklogs, paging, fallback query
│   └── request-pool.ts      # concurrency limit, 429 back-off, cancellation
├── ui/
│   ├── dom.ts               # small element-building helpers, SVG icons
│   ├── controller.ts        # view state machine, auto-refresh timer, visibility
│   ├── header.ts            # title, total, refresh, settings, close (pop-up only)
│   ├── period-bar.ts        # arrows, preset chips, Od/Do date-time inputs
│   ├── progress.ts          # bar, ticks, caption
│   ├── table.ts             # rows, multi-line entries, total row, states
│   └── settings-popover.ts  # interval field, theme switch, Zapisz/Anuluj
├── i18n/pl.ts               # every Polish text (contracts/ui.md)
├── styles/
│   ├── _tokens.scss         # design tokens, dark and light values
│   ├── _base.scss
│   ├── panel.scss
│   └── gadget.scss
├── panel/
│   ├── index.html
│   └── main.ts              # entry of the global page and of the pop-up
└── gadget/
    ├── index.html
    └── main.ts              # entry of the dashboard gadget

tests/
├── fixtures/                # recorded Jira JSON: search pages, worklogs, errors
├── fake-gateway.ts          # JiraGateway fed from fixtures
├── unit/                    # domain/ and jira/
├── ui/                      # ui/ with happy-dom
└── e2e/                     # Playwright: 360 px and 1280 px, dark and light

dist/                        # build output, not committed
├── panel/                   # index.html + one script + one stylesheet
└── gadget/
```

**Structure Decision**: a single front-end project. `src/domain` holds all rules from
[data-model.md](data-model.md) with no browser or Jira dependency; `src/jira` is the only
place that knows the REST contract; `src/ui` only renders state. The panel and the gadget are
two entry files that reuse the same domain, Jira, and style code, and build into two Forge
resources. Only `src/jira/forge-gateway.ts` imports `@forge/bridge`, which keeps every other
file testable without it.

## Complexity Tracking

No constitution violations. Nothing to justify.
