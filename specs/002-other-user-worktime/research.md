# Research: Worktime of Another User

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-11-13

Builds on [001 research](../001-worktime-panel/research.md); decisions there (extension form,
shadow root, storage in the Jira site's `localStorage`, Vite+, tests without a live Jira) are
unchanged and not repeated.

Each decision carries a status:

- **Verified**: stated in a primary source or confirmed by code in this repository. The
  primary source for Jira is the official OpenAPI description of the Jira Cloud platform
  REST API v3 (`https://dac-static.atlassian.com/cloud/jira/platform/swagger-v3.v3.json`),
  read on 2026-11-13.
- **Unverified**: not yet confirmed on a real Jira Cloud site. Each such point is listed
  under "Checks on a real Jira site" at the end.

## R1. Finding a person by name (FR-016, FR-017, FR-026)

**Decision**: `GET /rest/api/3/user/search?query={text}&maxResults=50`, once per press of
"Zapisz", never while typing. The answer is narrowed in the client: only accounts of type
`atlassian` (people), and only those whose display name contains the typed text after both
are normalised (trimmed, inner spaces collapsed, lower-cased).

**Rationale**:

- It is the documented way to find users by name and returns what the feature needs:
  `accountId`, `displayName`, `accountType`, `active`, and `emailAddress` where the person's
  privacy settings allow it.
- A caller without the "Browse users and groups" permission gets an empty list, not an
  error. That is exactly the spec's edge case: the check finds nobody.
- Jira also matches the text against e-mail addresses. The client filter on the display name
  removes those hits, because the spec looks people up by name only.
- The user search endpoints share one rate limit for the whole Jira site. One request per
  "Zapisz" keeps the add-on far from it; a suggestion list while typing would not.

**Verified** in the OpenAPI description: parameters, the empty result without the
permission, the returned fields, HTTP 429 with `Retry-After`.

**Confirmed on a real Jira Cloud site on 2026-11-13 (check X8)**: a colleague was found by
surname alone and by full name. The surname was typed without its Polish letter and Jira
still returned the person, so Jira ignores diacritical marks. The client filter has to do
the same, or it would throw away a person Jira found: `normalise` folds diacritics (spec
FR-017). `emailAddress` came back as an empty string: the address is hidden, and an empty
string is treated as no address.

**Limits (Verified, same source)**:

- Jira matches the text against the *beginning* of a name ("can match the prefix of the
  attribute's value"). A text from the middle of a word ("owak") finds nobody. The spec
  says so (FR-017).
- The request returns **active users only**. See R2.

**Alternatives considered**:

- *`GET /rest/api/3/user/picker`*: built for pickers, but its answer carries an HTML string
  and one avatar address instead of plain fields, and without the permission it still
  returns exact-name matches, which gives two different behaviours to explain.
- *Search while typing (autocomplete)*: more requests against the shared rate limit, and the
  requester chose a check on "Zapisz" with a list only when needed.
- *`GET /rest/api/3/user/assignable/search`*: needs a project or issue; a person who cannot
  be assigned there would be missing.

## R2. Deactivated accounts (spec Edge Cases, FR-036)

**Decision**: deactivated accounts are not found. The name search of R1 is the only
look-up by name; it returns active users only. A user in its answer with `active: false`
is dropped as well, so the rule does not depend on Jira's behaviour.

**Decided by the requester on 2026-11-13**, after this research showed the cost of the
alternative. The spec was amended (Clarifications, Edge Cases, FR-017, FR-036).

**Rationale**: one small request per check, no cache of Jira data, and the "not found"
alert always comes after a single request (SC-004).

**Alternative considered**: when R1 finds nobody, read the site's user directory with
`GET /rest/api/3/users/search` (the one documented operation that returns inactive
users, up to 1000 per request) and match in the client. Rejected: every typing mistake
would download the directory, up to 10 requests on a large site, and the reduced
directory would have to be kept in memory.

## R3. Checking the remembered person again (FR-036)

**Decision**: `GET /rest/api/3/user?accountId={id}`. HTTP 200 with `active: true` gives the person with their
current display name; `active: false`, HTTP 404 and 403 mean "not found" and lead to
the alert of FR-020; any other failure is a failed check (FR-023).

**Rationale**: the remembered person is known by account ID, so no name search and no list
are needed, and a changed display name is picked up at the same time (FR-008).

**Verified** in the OpenAPI description (statuses 200, 403, 404; the `User` fields).

A person picked from the list in the same visit is not checked again: Jira returned them a
moment ago (FR-031). The person already in effect, left unchanged, is not checked either:
nothing changes.

## R4. Reading another person's worklogs (FR-001 to FR-003)

**Decision**: the loader of 001 gets the author as a parameter.

- JQL for the signed-in user stays `worklogAuthor = currentUser() AND …`.
- JQL for another person is `worklogAuthor = "{accountId}" AND …`, the account ID in double
  quotes.
- The fallback of 001 stays: on HTTP 400 the query is repeated without the author clause.
- The authoritative filter stays in the client: `author.accountId` equals the selected
  person's account ID.
- Day boundaries use the signed-in user's time zone for everyone (spec, Assumptions).

**Rationale**: one code path for both cases; the client filter makes the result correct
even if Jira rejects the author clause, at the cost of scanning more issues.

**Verified** on a real Jira Cloud site on 2026-11-13 (check X7): Jira accepts a quoted
account ID after `worklogAuthor` and answers HTTP 200 with the person's issues, paged with
`nextPageToken` as for the signed-in user.
The account ID is validated against `^[A-Za-z0-9:_-]{1,128}$` before it is placed in the
query, so a damaged stored value cannot change the query.

What the user sees of another person's time is what Jira lets them read: worklogs on issues
they can view. Issues they cannot view are missing from the search; a worklog with restricted
visibility is missing from the issue's worklog list. The add-on adds no check of its own.

## R5. The signed-in user's name (FR-006, FR-010)

**Decision**: read `displayName` from the `GET /rest/api/3/myself` answer the add-on
already fetches; no new request. `Session` gains `displayName`.

**Verified**: `/myself` returns the `User` object, which has `displayName`. The add-on
draws nothing before this answer arrives, so the name is known at the first paint and the
header line never appears empty (FR-010 holds by construction). An absent or empty
`displayName` leaves the line blank but in place.

## R6. Where the choice and the remembered person live (FR-027, FR-028, FR-032, FR-035)

**Decision**:

- The person in effect is plain state of the running content script, next to
  `startOnToday`. It is never stored. A new page load, a new tab, and a new browser start
  begin on the signed-in user without any code for it.
- The close button resets it together with the period.
- The remembered person is one more field, `lastPerson`, of the stored settings object under
  the existing key `worktime.settings.v1`.

**Rationale**: the field is additive. The read rules of 001 already say that a missing or
invalid field falls back to its default, so the format version stays `v1` and no migration
is needed. Settings written by this version are read by the previous one (it ignores unknown
fields).

**Consequence**: the stored value now holds one person's display name and account ID. This
is data the Jira page itself already has; it stays in the browser and is sent nowhere. The
storage contract is updated to say so.

**Alternative considered**: `sessionStorage` for the person in effect, to keep it across a
reload of the same tab. Rejected: the requester decided that a reload returns to the
signed-in user.

## R7. The alert window (FR-020, FR-022)

**Decision**: a small element of the add-on's own, drawn over the settings pop-over, with
`role="alertdialog"`, the message, and one "OK" button. While it is shown the content of the
settings carries the `inert` attribute; the focus is on "OK"; "OK", Enter, and Escape close
it and move the focus to the name field.

**Rationale**:

- The requester chose an alert of the plugin with an "OK" button over a message in the
  settings.
- `inert` makes the settings under the alert unreachable by pointer, keyboard, and screen
  reader without a focus trap written by hand. Chrome and Edge have had it since
  version 102, older than the anchor positioning the panel already relies on.

**Alternatives considered**:

- *`<dialog>` with `showModal()`*: makes the whole document inert, including the Jira page.
  The add-on must not change the behaviour of the page outside its own element
  (constitution, Technical Constraints; 001 FR-052).
- *`window.alert()`*: blocks the whole tab and cannot follow the add-on's theme; ruled out
  by FR-020.

## R8. Telling two people of the same name apart (FR-030)

**Decision**: each entry of the list shows the display name and, on a second line, the
e-mail address when Jira returns it. No pictures are loaded. Decided by the requester on
2026-11-13 (plan, Open points, D1).

**Rationale**: the addresses in `avatarUrls` point to other hosts than the Jira site: an
Atlassian avatar service and, for people without an uploaded picture, Gravatar. Loading them
from the add-on would contact a host that is not the Jira site the user has open, which the
constitution forbids ("the only system it talks to is the Jira site the user has open";
"User and Jira data MUST NOT be sent to any third party"). The e-mail address comes inside
the answer of the same Jira request.

**Limit**: two people with the same name whose e-mail addresses are both hidden cannot be
told apart in the list.

**Alternative considered**: load the pictures after an amendment of the constitution.
Rejected by the requester.

## R9. Name line in the header and on the launcher (FR-006 to FR-009, FR-033, FR-034)

**Decision**:

- Header: a line of its own above the `h1` title, in a new colour token `--wt-person`,
  one line, cut with an ellipsis by CSS, the full name as the element's tip.
- Launcher: a name element before the label, shown only for another person, in the same
  token, limited to `24ch` with an ellipsis; then a middle dot; then label and total as now.
- A new token because the accent colour is tuned as a background for buttons, not as text:
  `#2563eb` on the dark surface does not reach the 4.5:1 contrast the constitution requires.
  Values, changed twice on 2026-11-13 to the colour the requester chose, last to orange:
  dark `#ff6c00` (6.1:1 on the dark surface `#171b23`, 5.4:1 on the raised surface), light
  `#b84e00` (5.1:1 on white, 4.8:1 on the raised surface; `#ff6c00` itself would reach only
  2.8:1 there), both computed with the WCAG formula. A new browser test reads the two colours
  from the drawn page and asserts at least 4.5:1.

**Rationale**: the colour differs from the title (`--wt-text`), the muted text, the links
(`--wt-link`, blue), and the five progress tones, so the name cannot be read as a total or
as a ticket link.

## R10. Emptying the table when the person changes (FR-003, FR-004, SC-002)

**Decision**: on a change of person the controller drops everything it holds for the
previous one (rows on screen, the last load, the views of back and forward) before the new
load starts, and the table shows only the loading state.

**Rationale**: 001 keeps the old rows under the spinner while a new period loads. With the
name already changed in the header, those rows would stand under the wrong name; SC-002 does
not allow that at any moment.

## R11. Tests (constitution, Principle V)

**Decision**: the same three layers as 001.

- Unit (`vp test`): name normalisation and matching, the stored `lastPerson`, the query for
  another person, the people look-up with its failure cases.
- UI with `happy-dom`: the settings flow (options, field, busy state, alert, list, cancel
  during a check), the header line, the launcher name, the app-level life of the choice
  (save, minimise, close, new mount).
- Browser (Playwright): the stand-in page gains a small user directory and a second
  person's worklogs; scenarios at 320 px and 1280 px in both themes; the built extension
  test asserts that only `GET` requests to the page's own origin are sent, including the new
  ones.

No test needs a live Jira.

## Checks on a real Jira site

Added to X1 to X6 of 001. X7 and X8 are done first in a plain browser tab, before the name
check is built (tasks.md T010), because they decide how the query and the matching are
written; all five are done at the end through the extension (tasks.md T057). That is done with `dist/extension/` loaded unpacked, signed in to
a Jira Cloud site where a colleague has logged time.

| ID | Check | If it fails |
|----|-------|-------------|
| X7 | `worklogAuthor = "{accountId}" AND worklogDate >= …` succeeds on `/search/jql` | The built-in fallback query takes over; confirm it does and that the result is the colleague's time only |
| X8 | `/user/search?query=` finds a colleague by surname alone and by full name, with Polish letters in any letter case | Send the first word only and filter in the client |
| X9 | 2026-11-13 | Verified through the installed extension (T057): the colleague's time is shown, and the total of one day matches their worklogs in Jira to the minute (SC-003). |
| X10 | 2026-11-13 | Checked through the installed extension (T057): in the list of people an e-mail address is shown only under the requester's own entry; colleagues hide theirs (Jira sends an empty string). The list shows names only for them, which the requester accepts. |
| X11 | | Not checked: it needs an account without the "Browse users and groups" permission. The behaviour is covered by automated tests only (an empty answer gives the "not found" alert). |

### Results

| ID | Date | Result |
|----|------|--------|
| X7 | 2026-11-13 | Verified in a browser tab (tasks.md T010): HTTP 200 with issues for `worklogAuthor = "{accountId}"`. Through the installed extension (T057) a colleague's time loaded and matched Jira; whether the query with the author or the fallback answered was not looked at in the network panel. |
| X8 | 2026-11-13 | Verified in a browser tab (T010) and through the installed extension (T057): a surname alone and a full name find the colleague, also typed without the Polish letter of the name. A query in lower-case letters was not reported separately. No fallback needed. |
| X9 | | Open (T057). |
| X10 | 2026-11-13 | Seen in the answers of X8: `emailAddress` is an empty string for the colleague checked. The list shows the name alone for such a person. To confirm for more people in T057. |
| X11 | | Open (T057). |

Also seen by the requester through the installed extension on 2026-11-13 (T057): a correct
name shows the colleague's data and a name nobody has shows the alert "within a few
seconds"; both were judged to be inside the limits of SC-001 (5 seconds) and SC-004
(3 seconds), without a stopwatch.
