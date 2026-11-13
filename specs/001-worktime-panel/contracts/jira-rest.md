# Contract: Jira Cloud REST API (consumed)

**Feature**: [../spec.md](../spec.md) | **Research**: [../research.md](../research.md) (R3, R4)

The add-on is a browser extension. Its content script runs inside a Jira Cloud page and reads
the Jira Cloud platform REST API v3 of that same site, with the session the user already has in
the browser. It exposes no API of its own. This file fixes exactly which requests the add-on
sends and which response fields it reads, so tests can mock them and reviewers can check what
it touches.

Since feature 002 the same three requests also read the time of another person, named by
account ID, and three more requests look people up. They are described in
[the contract of 002](../../002-other-user-worktime/contracts/jira-rest.md); the access rules
below hold for them too.

## Access

| Aspect | Rule |
|--------|------|
| Method | `GET` only. The add-on never sends `POST`, `PUT`, or `DELETE` (FR-050). |
| Address | A path on the page's own origin, for example `/rest/api/3/myself`. Never another host. |
| Credentials | None held by the add-on. Requests are sent with `credentials: 'same-origin'`, so the browser attaches the user's Jira session. |
| Header | `Accept: application/json` |
| What the user can see | Exactly what they can see in Jira themselves; the add-on has no access of its own. |

Because every request is a same-origin `GET`, no cross-site-request token is needed and no
extension permission is involved.

## 1. Signed-in user

`GET /rest/api/3/myself`

Read fields:

| Field | Use |
|-------|-----|
| `accountId` | keep only this user's worklogs (FR-001), unless another person is selected (see below) |
| `timeZone` | IANA zone for day boundaries and displayed times (FR-026); when absent, the browser's own time zone |

Sent once when the page loads. Any status other than 200, or an answer without `accountId`,
means nobody is signed in to Jira on this page: the add-on draws nothing and sends nothing
else.

The site address used for ticket links is the page's own origin.

## 2. Find candidate issues

`GET /rest/api/3/search/jql?jql={jql}&fields=summary&maxResults=100[&nextPageToken={token}]`

`jql` (URL-encoded):

```text
worklogAuthor = currentUser() AND worklogDate >= "2026-11-05" AND worklogDate <= "2026-11-07"
```

- The two dates are the period's `from` minus one day and `to` plus one day. The padding covers
  the time zone in which Jira evaluates `worklogDate`, which is not documented for Cloud.
- Pagination: repeat with `nextPageToken` from the previous response until it is absent or
  `isLast` is `true`. The response has no `total`.

Read fields per issue: `id`, `key`, `fields.summary`.

The result is a superset of what is displayed. JQL matches an issue when any worklog is by the
user and any worklog is in the range; the exact filtering happens in step 3.

Fallback: if this request fails with HTTP 400, the add-on repeats it once with the
`worklogAuthor` clause removed (`worklogDate` clauses only). Step 3 still filters by author, so
the displayed result is the same; only more issues are scanned.

## 3. Worklogs of one issue

`GET /rest/api/3/issue/{issueId}/worklog?startedAfter={ms}&startedBefore={ms}&maxResults=5000&startAt={n}`

- `startedAfter` = `period.startInstant − 1`, `startedBefore` = `period.endInstant + 1` (epoch
  milliseconds). Inclusivity of `startedBefore` is not documented, so the window is widened by
  1 ms on each side and narrowed again in the client.
- Pagination: the first request uses `startAt=0`; while `startAt + worklogs.length < total`,
  repeat with the next `startAt`.
- Sent for every issue from step 2, at most 5 requests in flight at a time.

Read fields per worklog:

| Field | Use |
|-------|-----|
| `id` | identity |
| `issueId` | grouping |
| `author.accountId` | keep only the worklogs of the selected person: the signed-in user by default (FR-001, 002 FR-002) |
| `started` | start instant; format `2026-11-06T07:00:00.000+0100` (offset with or without colon, or `Z`) |
| `timeSpentSeconds` | duration |

Client-side filter (authoritative): `author.accountId == session.accountId` and
`startInstant ≤ started < endInstant`.

HTTP 404 for a single issue (issue no longer visible, spec edge case) is not an error: that
issue contributes no entries.

## Errors and limits

| Situation | Behaviour |
|-----------|-----------|
| HTTP 429 | Wait at least `Retry-After` seconds, pause all in-flight work, retry the same request; at most 4 attempts with doubling delay and jitter. Then fail the load. |
| HTTP 401 / 403 on search | Fail the load: Polish error state, last data kept, retry offered (FR-037). |
| HTTP 5xx or network failure | Same as above. |
| HTTP 404 on one issue's worklogs | That issue is skipped; the load succeeds. |
| A newer load started meanwhile | The older load's remaining requests are abandoned and its result ignored. |

## Request budget

| Situation | Requests |
|-----------|----------|
| Page load (launcher, today) | 1 (`/myself`) + 1 search + one per ticket worked on today |
| Panel opened on a typical day (3 to 8 tickets) | 4 to 9 |
| A month with 60 tickets and 200 worklogs (SC-009) | 61 to 62 |

While the open panel shows today, the launcher takes its total from the panel's load instead of
asking again. Nothing is requested while the browser tab is hidden.

## Known limitations of the source data

- `worklogAuthor` works in Jira Cloud but is absent from the current JQL field reference. The
  fallback above removes the dependency on it.
- JQL indexes only the 1,000 most recent worklogs of an issue. Time logged on an issue with
  more worklogs than that, outside the most recent 1,000, can be missed.
- Search is eventually consistent: a worklog saved seconds ago can be missing from one refresh
  and appear on the next.
