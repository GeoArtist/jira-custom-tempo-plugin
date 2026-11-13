# Research: Worktime Panel

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-11-12

**Revision 2026-11-12**: the requester decided to deliver the plugin as a standalone browser
extension instead of an Atlassian Forge app. R1, R2, R4, R5, R7, R8, and R11 were rewritten
for that decision; the Forge design is recorded under "Alternatives considered" in R1.

Each decision carries a status:

- **Verified**: confirmed by an automated test in this repository, or stated in a primary
  source.
- **Unverified**: not yet confirmed on a real Jira Cloud site. Each unverified point is listed
  under "Checks on a real Jira site" at the end.

## R1. Delivery form and architecture

**Decision**: a browser extension (Manifest V3) with one content script. The script runs on
Jira Cloud pages and draws the add-on on top of them. There is no background script, no popup
page, no options page, no server, and no extension permission.

**Rationale**:

- It is standalone: a person installs it in their own browser. No Jira administrator, no
  Atlassian developer account, no app registration, and no deployment are involved.
- It can draw a launcher on every Jira page, which is what the first mock-up shows and what
  the Forge platform could not do.
- A content script on a Jira page can read that site's REST API with the session the user
  already has. The add-on needs no credentials and no permission of its own.
- With no Forge bridge library the shipped script is about 12 kB gzipped instead of about
  40 kB.

**Verified** by `tests/e2e/extension.spec.ts`: the built extension is loaded into Chromium, a
page on a Jira Cloud address is opened, and the launcher, the panel, and the session-based
requests work.

**Alternatives considered**:

- *Atlassian Forge app with Custom UI* (the first implementation): hosted by Atlassian and
  installed by a site admin. Replaced because it needs a developer account, registration, and
  deployment, cannot show a launcher on every page, and its command-palette entry relied on a
  Preview module.
- *Jira Data Center add-on (.jar)*: works only on self-hosted Jira, not on Jira Cloud, and
  needs a Java build.
- *Separate web page*: needs the Jira address and an API token typed in, and a proxy server,
  because browsers block direct calls to Jira from another site.
- *Userscript*: the same idea as the extension, but it needs a userscript manager installed
  first and has no store distribution.

## R2. Where the add-on appears (User Story 5, FR-040, FR-041, FR-049)

**Decision**: on every page under `https://*.atlassian.net/*` except `/wiki/*` (Confluence),
in the top frame only. The add-on draws a launcher fixed in the bottom-right corner and a panel
fixed above it, exactly as in the mock-up. The panel has a close button; the launcher also
toggles it.

**Rationale**: `*.atlassian.net` is where Jira Cloud sites live. The match pattern is declared
in the manifest, so the browser shows the user which sites the extension can run on.

**Limits**:

- A Jira Cloud site served from a custom domain is not matched. Adding such a domain means
  adding it to the manifest.
- Other Atlassian products on the same address without Jira (for example a site with only
  Confluence) answer the profile request differently or not at all; the add-on then draws
  nothing (see R4).
- Mobile browsers mostly do not support extensions. The layout is responsive and tested at
  320 px, which covers narrow desktop windows and the mobile browsers that do support
  extensions.

## R3. Reading the current user's worklogs

**Decision**: two-step read, then filter in the client. Full request and response details are
in [contracts/jira-rest.md](contracts/jira-rest.md).

1. `GET /rest/api/3/search/jql` with
   `worklogAuthor = currentUser() AND worklogDate >= A−1 AND worklogDate <= B+1`, fields
   `summary`, to get candidate issues.
2. `GET /rest/api/3/issue/{id}/worklog?startedAfter=&startedBefore=` for each candidate, at
   most 5 at a time.
3. Keep worklogs whose `author.accountId` is the current user and whose `started` lies in the
   period, computed in the user's time zone.

**Rationale**:

- There is no Jira Cloud endpoint that returns "worklogs of user X between two dates".
  (Verified: the worklog endpoints have no author filter and no search endpoint exists.)
- JQL is used only as a candidate finder, because its worklog clauses are issue-level (any
  worklog by the user and any worklog in the range) and the time zone of `worklogDate` is not
  documented for Cloud. Padding the range by one day and filtering in the client makes the
  result independent of both.
- The search uses `GET`, not `POST`. Every request of the add-on is then a read, which matches
  FR-050 literally and needs no cross-site-request token.
- The old `/rest/api/3/search` is being removed; `/search/jql` with `nextPageToken` is the
  current endpoint. (Verified.)

**Alternatives considered**:

- *Embedded `worklog` field in search results*: would save the per-issue requests, but it is
  truncated (about 20 entries) and its shape on `/search/jql` is not documented. Rejected.
- *`/worklog/updated` plus `/worklog/list`*: filters by update time, covers all users on the
  site, and needs a persistent sync store. Rejected.

**Risks**:

- `worklogAuthor` works but is missing from the current JQL field reference. Mitigation: the
  fallback query without it, described in the contract.
- JQL indexes only the 1,000 most recent worklogs per issue. Accepted as a known limitation.
- Rate limits: the requests count as the user's own browser traffic. Mitigations: 5
  concurrent requests at most, `Retry-After` handling, and no requests while the browser tab
  is hidden.
- A very long JQL would make a long `GET` address. The query has a fixed, short shape, so this
  does not arise.

## R4. Identity, time zone, site address

**Decision**: one `GET /rest/api/3/myself` when the page loads gives `accountId` and
`timeZone`. The site address is the page's own origin. If the request does not return a
signed-in user, the add-on draws nothing and sends nothing else.

**Rationale**: the profile time zone is what Jira itself uses to show worklog times, so the
panel agrees with Jira. The check also keeps the add-on silent on login pages and on pages
that are not Jira.

Day boundaries, weekdays, and clock times are computed for that zone with the browser's
built-in `Intl.DateTimeFormat`. No date library is added.

## R5. Storing the two user settings

**Decision**: the `localStorage` of the Jira site, under one namespaced key. Details in
[contracts/settings-storage.md](contracts/settings-storage.md).

**Rationale**:

- It needs no extension permission (extension storage would need the `storage` permission).
- It is synchronous, so the saved theme is applied before anything is drawn (FR-047).
- It satisfies the constitution: settings stay in the user's browser, never on a server.

**Trade-off, accepted by the requester (spec Clarifications; FR-033, FR-047, FR-050)**:
settings are per browser. With this storage they are also per Jira site: a user who works on
two Jira sites sets them once on each.

**Alternatives considered**:

| Option | Why rejected |
|--------|--------------|
| Extension storage (`chrome.storage.local`) | One set for all Jira sites, but it needs the `storage` permission, is asynchronous, and ties the code to the extension API. |
| Extension storage with sync | Would follow the user across devices through their browser account; forbidden by the constitution (settings per browser only). |
| Jira user properties | Would need the add-on to write to Jira; forbidden by FR-050 and the constitution. |

## R6. Language, build, and dependencies

**Decision**:

| Concern | Choice |
|---------|--------|
| Language | TypeScript, `strict` mode; styles in SCSS (constitution) |
| UI framework | none: small DOM-building functions |
| Runtime dependencies | none |
| Toolchain (mandatory) | Vite+: the `vp` command, package `vite-plus` |
| Install, dev server, build | `vp install`, `vp dev`, `vp build` |
| Unit and UI tests | `vp test` (Vitest inside Vite+) with `happy-dom` |
| Lint, format, type check | `vp check` |
| Styles compiler | `sass` (Dart Sass), used by Vite+ |
| Browser tests | `@playwright/test`, Chromium only |

Everything is development-only. The shipped extension contains only the project's own
compiled code.

**Vite+ is mandatory** (constitution, Technical Constraints; decided by the requester on
2026-11-12). Consequences for this project:

- One configuration file, `vite.config.ts`, holds the build, dev server, test, lint, and
  format settings.
- `vp build` produces the extension in `dist/extension/`: one classic script, `content.js`
  (library build in IIFE format, because a content script cannot be a module), plus
  `manifest.json` and the icons copied from `extension/`.
- `vp build --mode demo` and `vp dev --mode demo` build and serve a stand-in Jira page
  (`demo/index.html`) that loads the same content script with a faked Jira session. The
  browser tests and local preview use it.
- Every script in `package.json` calls `vp`; `vp run check` is the full gate.
- No second tool for a job Vite+ covers: no other bundler or build script, test runner,
  linter, or formatter. Playwright stays because Vite+ does not do browser tests.

**Rationale**: one toolchain means one configuration file, one set of commands, and one
version to keep current. With no runtime dependency there is nothing in the shipped file that
the project did not write.

**Alternatives considered**:

- *A hand-written `esbuild` build script plus stand-alone `vitest`*: the original design.
  Replaced by Vite+ on the requester's decision.
- *An extension framework (WXT, Plasmo, CRXJS)*: adds a second build layer for one content
  script and a manifest; not needed and against the single-toolchain rule.
- *React or Preact*: runtime size and a dependency the UI does not need.

## R7. Styles on a page the add-on does not own

**Decision**: the add-on draws inside a shadow root attached to one host element. Its compiled
stylesheet is imported into the script as text and attached as a constructed stylesheet
(`adoptedStyleSheets`). Values computed at run time (bar fill, progress colour) are set through
each element's style object as custom properties.

**Rationale**:

- The shadow root keeps Jira's styles out of the add-on and the add-on's styles out of Jira.
  (Verified by a browser test that adds a hostile page rule.)
- A constructed stylesheet is not an inline `<style>` element, so a strict content security
  policy on the page does not block it. (Verified in `tests/e2e/extension.spec.ts` against a
  page with `style-src 'self'`.) If a browser refuses constructed stylesheets in a content
  script, the code falls back to a `<style>` element in the shadow root.
- No separate CSS file means no `web_accessible_resources` entry in the manifest.
- Sizes are in px: `rem` would follow the Jira page's root font size.

## R8. Layout on top of a Jira page

**Decision**: the launcher and the panel are `position: fixed` in the bottom-right corner, on
a very high stacking layer. The panel has one fixed height, `max(50svh, 640px)` (spec
Amendment 6, FR-059), and is never taller than the window: on screens 600 px and
wider the table rows scroll inside it while the header, the period controls, and the total row
stay in view; below 600 px the whole panel scrolls.

Changed by Amendment 8: the launcher is still `position: fixed`, but the user can drag it, and
the panel is placed against it with CSS anchor positioning (`anchor-name` on the launcher,
`position-anchor` and `anchor()` insets on the panel). The browser keeps the panel next to the
launcher; script stores the launcher's two offsets and decides the side (above or below,
which edge in line), because that decision has to be repeated on every move and window
resize. Alternatives considered: `position-try-fallbacks`, rejected because the browser keeps
the last side that fitted while it still fits, which left the panel away from the launcher
after the window was resized; computing the whole place in script, rejected as more code. Anchor positioning is in Chrome and
Edge from version 125; an older browser gets the panel above the launcher from the two
offsets.

**Rationale**: the add-on now draws in the Jira window itself, not inside a platform frame, so
fixed positioning is reliable. This satisfies the spec's edge case "header, period controls,
and totals stay reachable" as written; the earlier plan delta D4 is gone.

Jira has single-key keyboard shortcuts (for example `c` creates a work item). Key events from
inside the add-on are stopped at its root element, so typing a number or a date in the add-on
does not trigger them. (Verified by a browser test on the stand-in page; unverified against
Jira's own shortcut handling, see the checks below.)

## R9. Theme

**Decision**: the add-on owns its two themes. A `data-theme` attribute on the add-on's root
element selects one set of design-token values. The Jira page's theme is not read and not
changed.

**Rationale**: this is constitution Principle IV (user switch, default dark, no automatic
following) and spec User Story 6.

## R10. Tests without a live Jira

**Decision**: the code talks to Jira through one small interface (`JiraGateway`: `request`,
`getSession`). Production wires it to the page's Jira session; tests wire it to a fake fed
from recorded JSON fixtures.

- Unit tests (`vp test`): period arithmetic, time-zone day boundaries, grouping and sums,
  colour rule, formatting, settings validation, pagination, 429 handling, the fallback query,
  the session gateway.
- UI tests (`vp test` with happy-dom): the whole add-on (launcher, panel, periods, refresh,
  settings), and each component.
- Browser tests (Playwright) on the stand-in Jira page built with `vp build --mode demo`, at
  320 px, 1280 px, and 1920 px, in dark and light themes: layout, colours and contrast,
  keyboard use, style and key isolation, a large month.
- Browser tests of the real extension: `dist/extension` is loaded into Chromium and a page on
  a Jira Cloud address is opened, with the network answered by the test.

**Rationale**: Principle V forbids tests that need a live Jira. The last group still proves
the manifest, the injection, and the session requests in a real browser.

## R11. Delivery and installation

**Decision**: `vp run package` builds `dist/extension/` and packs it into
`dist/jira-custom-tempo-<version>.zip`.

| Way to install | Who | Steps after installing |
|----------------|-----|------------------------|
| Browser store (Chrome Web Store, Edge Add-ons): upload the zip once, then users click "Add" | anyone | none |
| Company policy (managed browsers) | IT | none for users |
| "Load unpacked" from `dist/extension/` with developer mode on | developers and testers | none |

**Rationale**: these are the installation paths browsers offer. After installing, the add-on
works on the next Jira page load with no configuration (Principle VI, FR-042).

**Limit to know**: Chrome and Edge do not let ordinary users install an extension from a file
outside the store, except through developer mode or company policy. Publishing to a store
needs a store developer account and a review by the store.

## Checks on a real Jira site

The automated tests cover the extension end to end against a faked Jira. These points can
only be confirmed on a real Jira Cloud site, by loading `dist/extension/` unpacked and opening
Jira while signed in:

| ID | Check | If it fails |
|----|-------|-------------|
| X1 | The launcher appears on Jira pages and shows today's total | Compare the real answers of the three endpoints with [contracts/jira-rest.md](contracts/jira-rest.md) |
| X2 | `worklogAuthor = currentUser() AND worklogDate >= …` succeeds on `/search/jql` | The built-in fallback query takes over; confirm it does |
| X3 | Jira's real content security policy does not block the add-on's styles | The `<style>` fallback applies; if that is blocked too, ship the stylesheet as an extension file |
| X4 | Typing in the add-on's fields does not trigger Jira shortcuts | Stop the key events earlier (capture phase) |
| X5 | The launcher does not cover a Jira control the user needs in the bottom-right corner | The user drags the launcher elsewhere (FR-072) |
| X6 | The add-on survives Jira's in-page navigation between views | Re-attach the host element when it is removed |
