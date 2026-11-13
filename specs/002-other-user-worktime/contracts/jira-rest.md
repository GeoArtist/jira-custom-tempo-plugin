# Contract: Jira Cloud REST API (consumed), additions for another user

**Feature**: [../spec.md](../spec.md) | **Research**: [../research.md](../research.md) (R1 to R5)

Extends [the contract of 001](../../001-worktime-panel/contracts/jira-rest.md). The access
rules there hold for every request below: `GET` only, a path on the page's own origin,
`credentials: 'same-origin'`, `Accept: application/json`, no host other than the Jira site.

Source of the request and response shapes: the official OpenAPI description of the Jira
Cloud platform REST API v3, read on 2026-11-13.

## 1. Signed-in user (changed)

`GET /rest/api/3/myself`: one more field is read.

| Field | Use |
|-------|-----|
| `displayName` | the name above the title while the signed-in user's time is shown (FR-006) |

Absent or empty: the name line is blank but keeps its place.

## 2. Find candidate issues (changed)

`GET /rest/api/3/search/jql?jql={jql}&fields=summary&maxResults=100[&nextPageToken={token}]`

`jql` depends on the selected person:

```text
# the signed-in user (as in 001)
worklogAuthor = currentUser() AND worklogDate >= "2026-11-05" AND worklogDate <= "2026-11-07"

# another person
worklogAuthor = "712020:0f3c9a1e-7b2d-4c55-9a10-2f6d8e4b1c77" AND worklogDate >= "2026-11-05" AND worklogDate <= "2026-11-07"
```

- The account ID is written in double quotes. It is used only when it matches
  `^[A-Za-z0-9:_-]{1,128}$`.
- Fallback as in 001: on HTTP 400 the request is repeated once without the `worklogAuthor`
  clause.

## 3. Worklogs of one issue (changed)

The request is unchanged. The client-side filter (authoritative) becomes:
`author.accountId == selectedPerson.accountId` and `startInstant ≤ started < endInstant`.

Day boundaries come from the signed-in user's time zone for every selected person.

## 4. Find people by name (new)

`GET /rest/api/3/user/search?query={text}&maxResults=50`

- `text` is the typed name after trimming and collapsing spaces, URL-encoded.
- Sent once per press of "Zapisz" with "Inny użytkownik" and no certain pick. Never sent
  while the user types, and never with an empty text (FR-018).
- One request, no paging: 50 users are enough to know that there are more than the 10 the
  list shows.

Read fields per user:

| Field | Use |
|-------|-----|
| `accountId` | identity of the person |
| `displayName` | matching, and the name shown (FR-008) |
| `accountType` | only `atlassian` is kept; `app`, `customer`, `unknown` are dropped |
| `active` | a user with `false` is dropped |
| `emailAddress` | second line in the list, when present and not empty; Jira sends an empty string for a hidden address (FR-030) |

`avatarUrls` is not read and no picture is requested ([research.md](../research.md) R8).

Client-side filter (authoritative): the normalised `displayName` contains the normalised
text. The result is classified by the rules in
[data-model.md](../data-model.md) ("Name matching").

Known behaviour of the endpoint: it returns active users only, matches the beginning of a
name or an e-mail address, and returns an empty list to a caller without the "Browse users
and groups" permission.

## 5. Read one person by account ID (new)

`GET /rest/api/3/user?accountId={accountId}`

Sent when "Zapisz" is pressed with the remembered person prefilled and unchanged (FR-036).
Read fields: `accountId`, `displayName`, `accountType`, `active`.

The person is found when the status is 200, `accountType` is `atlassian`, and `active` is
`true`. The display name of the answer replaces the remembered one (FR-008).

## Errors and limits (additions)

| Situation | Behaviour |
|-----------|-----------|
| Step 4: HTTP 200 with an empty list, or no user passes the filter | nobody found: the "not found" alert (FR-020) |
| Step 5: HTTP 404 or 403, or a user with `active: false` | the person cannot be shown: the "not found" alert (FR-020) |
| Steps 4 and 5: HTTP 429 | as in 001: wait `Retry-After`, retry, at most 4 attempts; then a failed check |
| Steps 4 and 5: HTTP 401, 5xx, any other status, or a network failure | failed check: "could not be checked" message, nothing saved (FR-023) |
| Steps 4 and 5: no answer after 15 seconds | the request is abandoned; failed check (FR-045) |
| The settings are closed while a check runs | the request is abandoned and its result ignored |

## Request budget (additions)

| Situation | Requests |
|-----------|----------|
| Page load | unchanged: `displayName` comes with the existing `/myself` answer |
| "Zapisz" for a colleague, unique full name | 1 (step 4), then one load of the period on screen as in 001 |
| "Zapisz" with a partial or shared name | 1 (step 4); the second "Zapisz" after a pick sends none |
| "Zapisz" with a name nobody has | 1 (step 4) |
| "Zapisz" with the remembered person unchanged | 1 (step 5), then one load of the period |
| "Zapisz" with "Obecny użytkownik", or with the person in effect unchanged | 0 |

## Known limitations of the source data (additions)

- A text from the middle of a word finds nobody: Jira's search looks from the beginning of
  a name.
- Deactivated accounts are not found ([research.md](../research.md) R2).
- Confirmed on a real Jira Cloud site on 2026-11-13 ([research.md](../research.md) X7, X8):
  Jira accepts a quoted account ID after `worklogAuthor`; the user search finds a person by
  surname alone and by full name, and ignores Polish diacritical marks in the query. The
  client-side filter therefore folds diacritics on both sides before it compares.
