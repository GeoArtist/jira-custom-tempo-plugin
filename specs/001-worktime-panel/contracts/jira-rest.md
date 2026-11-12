# Contract: Jira Cloud REST API (consumed)

**Feature**: [../spec.md](../spec.md) | **Research**: [../research.md](../research.md) (R3, R4)

The app consumes the Jira Cloud platform REST API v3 as the current user, through
`requestJira` of `@forge/bridge`. It exposes no API of its own. This file fixes exactly which
requests the app sends and which response fields it reads, so tests can mock them and reviewers
can check the permission set.

All requests are read-only. The app never writes to Jira.

## Scopes

| Scope | Needed for |
|-------|-----------|
| `read:jira-work` | issue search, issue worklogs |

This is the complete list. Adding any scope requires a plan change (constitution: smallest
permission set).

## Values taken from the host context, not from REST

`view.getContext()` supplies `accountId`, `timezone` (IANA name), and `siteUrl`. The app does
not call `/rest/api/3/myself`.

## 1. Find candidate issues

`POST /rest/api/3/search/jql`

Request body:

```json
{
  "jql": "worklogAuthor = currentUser() AND worklogDate >= \"2026-11-05\" AND worklogDate <= \"2026-11-07\"",
  "fields": ["summary"],
  "maxResults": 100
}
```

- The two dates are the period's `from` minus one day and `to` plus one day. The padding covers
  the time zone in which Jira evaluates `worklogDate`, which is not documented for Cloud.
- Pagination: repeat with `nextPageToken` from the previous response until it is absent or
  `isLast` is `true`. The response has no `total`.

Read fields per issue: `id`, `key`, `fields.summary`.

The result is a superset of what is displayed. JQL matches an issue when any worklog is by the
user and any worklog is in the range; the exact filtering happens in step 2.

Fallback: if this request fails with HTTP 400, the app repeats it once with the
`worklogAuthor` clause removed (`worklogDate` clauses only). Step 2 still filters by author, so
the displayed result is the same; only more issues are scanned.

## 2. Worklogs of one issue

`GET /rest/api/3/issue/{issueId}/worklog?startedAfter={ms}&startedBefore={ms}&maxResults=5000`

- `startedAfter` = `period.startInstant − 1`, `startedBefore` = `period.endInstant + 1` (epoch
  milliseconds). Inclusivity of `startedBefore` is not documented, so the window is widened by
  1 ms on each side and narrowed again in the client.
- Pagination: if `startAt + worklogs.length < total`, repeat with `startAt`.
- Sent for every issue from step 1, at most 5 requests in flight at a time.

Read fields per worklog:

| Field | Use |
|-------|-----|
| `id` | identity |
| `issueId` | grouping |
| `author.accountId` | keep only the current user's worklogs (FR-001) |
| `started` | start instant; format `2026-11-06T07:00:00.000+0100` (offset without colon) |
| `timeSpentSeconds` | duration |

Client-side filter (authoritative): `author.accountId == context.accountId` and
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

For the scale in SC-009 (60 issues, 200 worklogs in a month):

| Step | Requests |
|------|----------|
| search | 1 to 2 |
| worklogs | 60 |
| **Total** | **61 to 62** |

A single-day load for a typical day (3 to 8 issues) is 4 to 10 requests.

## Known limitations of the source data

- `worklogAuthor` works in Jira Cloud but is absent from the current JQL field reference. The
  fallback above removes the dependency on it.
- JQL indexes only the 1,000 most recent worklogs of an issue. Time logged on an issue with
  more worklogs than that, outside the most recent 1,000, can be missed.
- Search is eventually consistent: a worklog saved seconds ago can be missing from one refresh
  and appear on the next.
