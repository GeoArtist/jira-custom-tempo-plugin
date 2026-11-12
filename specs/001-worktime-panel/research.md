# Research: Worktime Panel

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-11-12

Sources are official Atlassian documentation and the published Jira Cloud OpenAPI specification
unless a line says otherwise. Each decision carries a status:

- **Verified**: stated in a primary Atlassian source.
- **Unverified**: inferred, or only reported by the community. Each unverified point has a check
  in the "Spike" list at the end, which must run before feature work starts.

## R1. App platform and architecture

**Decision**: Atlassian Forge app with Custom UI, running entirely in the browser. No Forge
functions, no resolver, no backend of any kind.

**Rationale**:

- Forge apps are hosted by Atlassian, which is what constitution Principle VI requires (no
  server operated by the project or by the user).
- `requestJira` from `@forge/bridge` calls the Jira REST API directly from Custom UI as the
  current user, so no backend is needed to read worklogs. (Verified.)
- A browser-only app uses none of the metered Forge capabilities (function time, KVS, logs), so
  it stays inside the free allowance. (Unverified in wording: the pricing page lists what is
  metered and says unlisted capabilities remain free; it does not name Custom UI hosting.)
- Custom UI is plain HTML, script, and styles, so TypeScript and SCSS without a UI framework
  are possible, as the constitution requires.

**Alternatives considered**:

- *Forge UI Kit*: renders Atlassian's own components. Rejected: the spec's layout (gradient
  progress bar, multi-line cells, colour-matched totals) cannot be built with it, and it rules
  out SCSS.
- *Atlassian Connect*: needs a server operated by the project. Rejected by Principle VI.
- *Browser extension*: could draw a floating launcher on every page. Rejected: it is not a Jira
  Cloud app, needs installation per browser per user, and breaks Principle VI.

**Open point**: a manifest with no `function` module is not explicitly documented as
deployable. Spike S1.

## R2. Where the panel appears (User Story 5, FR-040, FR-041)

**Finding**: Jira Cloud has no extension point that draws a persistent floating element on
every page. Apps can only render inside the places Jira offers. (Verified by the absence of
such a module in the Jira module index.)

**Decision** (confirmed by the requester in the spec's Clarifications, 2026-11-12):

| Need | Extension point | Status |
|------|-----------------|--------|
| The panel as a page (User Stories 1 to 4, 6; FR-049) | `jira:globalPage`: an entry in the Apps menu that opens the panel as a full page | Verified, stable |
| Today's total at a glance (FR-040) | `jira:dashboardGadget`: a compact gadget "Dziś: 10h 10m" in the progress colour, with a button that opens the panel page | Verified, stable |
| The panel from any Jira page (FR-041) | `jira:command`: a command-palette entry with a keyboard shortcut that opens the panel resource as a pop-up (modal) | Verified, but the module is in Preview |

The pop-up and the page run the same panel code. The pop-up adds a close button that calls the
bridge's `view.close()`; the page has none.

**Rationale**: the gadget and the page are generally available. The command module is the only
supported way to reach the panel from every Jira page. It is labelled Preview, so it is kept
isolated: it is one manifest entry that reuses the panel resource, and removing it leaves the
page and the gadget fully working.

Known limits of `jira:command`: Jira loads app shortcuts only after the user has opened the
command palette once; Preview modules can change with shorter notice.

**Alternatives considered**:

- *`jira:globalBackgroundScript`*: runs invisibly on Jira pages and can open a modal, but has
  no visible UI of its own, is in Preview, and its support for Custom UI is unclear. Rejected.
- *`jira:issueContext` / `jira:issueGlance`*: visible only on an issue. Rejected as the main
  entry point.

**Mobile**: the Jira iOS and Android apps show only issue-level app modules, so the panel page
is not available there. In a mobile browser the page is expected to work (Unverified, spike
S6). The layout is responsive regardless (Principle III).

## R3. Reading the current user's worklogs

**Decision**: two-step read, then filter in the client. Full request and response details are
in [contracts/jira-rest.md](contracts/jira-rest.md).

1. `POST /rest/api/3/search/jql` with
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
- The old `/rest/api/3/search` is being removed; `/search/jql` with `nextPageToken` is the
  current endpoint. (Verified.)

**Alternatives considered**:

- *Embedded `worklog` field in search results*: would save the per-issue requests, but it is
  truncated (about 20 entries) and its shape on `/search/jql` is not documented. Rejected.
- *`/worklog/updated` plus `/worklog/list`*: filters by update time, covers all users on the
  site, and needs a persistent sync store. Rejected.

**Risks**:

- `worklogAuthor` works but is missing from the current JQL field reference. Mitigation: the
  fallback query without it, described in the contract. Spike S2.
- JQL indexes only the 1,000 most recent worklogs per issue. Accepted as a known limitation.
- Rate limits (Verified): 65,000 points per hour per app across all sites, plus per-endpoint
  burst limits. A day view costs 4 to 10 requests; a full month about 62. Mitigations: 5
  concurrent requests at most, `Retry-After` handling, and no auto-refresh while the browser
  tab is hidden.

## R4. Identity, time zone, site URL

**Decision**: read `accountId`, `timezone`, and `siteUrl` from `view.getContext()` of
`@forge/bridge`. Do not call `/rest/api/3/myself`.

**Rationale**: the context already carries the three values (Verified field names). Dropping
`/myself` removes one request per start and removes the `read:jira-user` scope, leaving
`read:jira-work` as the app's only scope (constitution: smallest permission set).

Day boundaries, weekdays, and clock times are computed for `timezone` with the browser's
built-in `Intl.DateTimeFormat`. No date library is added.

**Alternative considered**: the browser's own time zone. Rejected: Jira shows worklog times in
the profile time zone, and the panel must agree with Jira.

## R5. Storing the two user settings

**Decision**: the browser's `localStorage` inside the Custom UI frame, under one key. Details
in [contracts/settings-storage.md](contracts/settings-storage.md).

**Rationale**:

- It needs no scope and no backend, so the app stays strictly read-only towards Jira.
- It is synchronous, so the saved theme is applied before the first paint (FR-047).
- The two values are small preferences; losing them falls back to working defaults.

**Trade-off, accepted by the requester (spec Clarifications; FR-033, FR-047, FR-050)**:
settings are remembered per browser, not per user account. A user on a second device sets them
once more there.

**Alternatives considered**:

| Option | Why rejected |
|--------|--------------|
| Jira user properties (`/rest/api/3/user/properties/{key}`) | Persists across devices, but writing needs the `write:jira-work` scope: a read-only time viewer would ask admins for permission to modify work items. |
| Forge key-value storage | Needs a backend function, a resolver, the `storage:app` scope, and metered usage, for two values. Conflicts with Principles II and VI. |

**Open point**: the stability of the frame's origin across deployments is not documented. If
it changes, settings reset to defaults. Spike S4. If it proves unstable, the fallback is Jira
user properties with the granular scope `write:user.property:jira`.

## R6. Language, build, and dependencies

**Decision**:

| Concern | Choice |
|---------|--------|
| Language | TypeScript, `strict` mode; styles in SCSS (constitution) |
| UI framework | none: small DOM-building functions |
| Runtime dependency | `@forge/bridge` only |
| Bundler | `esbuild` |
| Styles compiler | `sass` (Dart Sass) |
| Unit and UI tests | `vitest` with `happy-dom` |
| Responsive and theme tests | `@playwright/test`, Chromium only |
| Deploy tooling | `@forge/cli` |

All except `@forge/bridge` are development-only and never reach the shipped files.

**Dependency justification for `@forge/bridge`** (Principle II):

- *What it replaces*: nothing can replace it. It is the only supported channel from a Custom UI
  frame to Jira (`requestJira`, `view.getContext`, `router`).
- *Size cost*: about 14.6 kB gzipped when bundled whole, less after tree-shaking to the three
  functions used. That is under 15% of the 100 kB budget.
- *Why platform APIs are insufficient*: the frame is sandboxed on its own origin and cannot
  call the Jira REST API with `fetch`.

**Rationale for the tools**: `esbuild` and `sass` are each a single-purpose tool with almost no
transitive dependencies. A framework-style toolchain was rejected as heavier with no benefit
for two small pages.

**Alternatives considered**: Vite (more dependencies, same output); React or Preact (runtime
size and a dependency the UI does not need); Jest (slower, needs extra TypeScript setup).

## R7. Content security policy and dynamic colours

**Finding**: Custom UI blocks inline styles and inline scripts by default. Allowing inline
styles needs `permissions.content.styles: unsafe-inline`. (Verified.)

**Decision**: do not request `unsafe-inline`. All styles ship as one compiled stylesheet file
per page. Values computed at run time (bar fill width, progress colour) are set through the
element's style object in script (`element.style.setProperty('--wt-…', value)`), and the
stylesheet reads them as custom properties. Icons are inline SVG markup built in script.

**Rationale**: style changes made through the style object are not "inline styles" in the
sense of the policy, so no permission is needed. This keeps the permission list minimal.
(Unverified inside Forge specifically; standard browser behaviour. Spike S3.)

## R8. Layout inside the Jira frame

**Finding**: Custom UI frames size themselves to their content; `100vh` and `position: fixed`
are reported to misbehave on global pages. (Unverified, community reports.)

**Decision**: the panel is a centred card with a maximum width; the page grows with content.
The table body has a bounded height and scrolls inside itself, so the totals below it stay in
view (spec edge case "large period"). The settings popover is positioned inside the card, not
fixed to the viewport. Spike S5 confirms the behaviour.

## R9. Theme

**Decision**: the plugin owns its two themes. A `data-theme` attribute on the root element
selects one set of design-token values; both sets live in one SCSS token file. The Jira theme
is not read and `view.theme.enable()` is not called.

**Rationale**: this is exactly constitution Principle IV (user switch, default dark, no
automatic following) and spec User Story 6.

## R10. Tests without a live Jira

**Decision**: the code talks to Jira through one small interface (`JiraGateway`: `request`,
`getContext`, `navigate`). Production wires it to `@forge/bridge`; tests wire it to a fake fed
from recorded JSON fixtures.

- Unit tests (vitest): period arithmetic, time-zone day boundaries, grouping and sums, colour
  rule, formatting, settings validation, pagination, 429 handling, the fallback query.
- UI tests (vitest + happy-dom): each view state, Polish labels, table structure, settings.
- Browser tests (Playwright): the built pages with the fake gateway at 360 px and 1280 px, in
  dark and light themes: no horizontal overflow, long titles wrap, touch target size.

**Rationale**: Principle V forbids tests that need a live Jira. No official Atlassian guide for
mocking the bridge exists, so an interface owned by this project is the stable seam.

## R11. Delivery and installation

**Decision**: `forge deploy -e production`, then a sharing installation link from the Atlassian
developer console. A Jira site admin opens the link and installs. (Verified.)

**Rationale**: this is the standard Jira Cloud installation path for apps that are not on the
Marketplace, and it needs no step after installation (Principle VI, FR-042).

**Open points**:

- Whether each user sees a one-time "Allow access" prompt on first use is not confirmed. Spike
  S7. It is imposed by the platform and cannot be removed by the app.
- The Forge CLI needs Node.js 22.23.4 or later (or 24.22.1 or later). The development machine
  has 22.23.2, which is below that. Upgrade before the first `forge` command.

## Spike: checks to run before feature work

Each check runs on a real Jira Cloud development site with a minimal deployed app. A failed
check triggers the listed fallback.

| ID | Check | Fallback if it fails |
|----|-------|----------------------|
| S1 | A manifest with `jira:globalPage`, a resource, the scope `read:jira-work`, and no functions passes `forge lint` and deploys | Add an empty resolver function |
| S2 | `worklogAuthor = currentUser() AND worklogDate >= …` succeeds on `/search/jql` and returns the expected issues | Use the query without `worklogAuthor` permanently |
| S3 | Setting custom properties through the style object works without `unsafe-inline` | Add `permissions.content.styles: unsafe-inline` and record it in the plan |
| S4 | A value in `localStorage` survives a redeploy and a new browser session | Store settings in Jira user properties (R5) |
| S5 | The global page frame grows with content; inner scrolling of the table works on desktop and phone widths | Let the whole page scroll, without inner scrolling |
| S6 | The global page opens and is usable in a mobile browser | Document "desktop and tablet browsers" as supported; keep the responsive layout |
| S7 | First use by a second, non-developer account: is there a consent prompt? | Document the one-time prompt in the installation notes |
| S8 | The gadget can open the panel page with `router.navigate` using values from the context | Show the page address as a plain link |
| S9 | A `jira:command` entry opens the panel resource (Custom UI) as a modal, `view.close()` closes it, and the shortcut works once the palette has been opened | Ship without the command entry; page and gadget remain; report to the requester |
