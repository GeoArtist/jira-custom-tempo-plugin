# Quickstart: Worktime of Another User

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

How to run and validate this feature. Building, installing the extension, and the commands
are those of [001 quickstart](../001-worktime-panel/quickstart.md); only what differs is
written here.

## Prerequisites

As in 001. For the manual validation on a real Jira Cloud site you also need:

- a colleague on the same site who logged time on tickets you can view, and whose name you
  know as Jira shows it;
- the "Browse users and groups" permission (most users have it).

## Commands

| Command | Does | Expected result |
|---------|------|-----------------|
| `vp run dev` | Serves the stand-in Jira page at `http://127.0.0.1:5173/` | Your name above the title; the people of "Test data" can be chosen in the settings |
| `vp test run` | Unit and UI tests | All pass, including the new files under `tests/unit` and `tests/ui` |
| `vp run test:e2e` | Browser tests on the stand-in page and with the built extension | All pass, including `tests/e2e/person.spec.ts` |
| `vp run check` | The full merge gate (format, lint, types, tests, build, size, browser tests) | All pass; the content script stays under 100 kB gzipped |

On Windows, run the commands from a path with an upper-case drive letter (for example
`cd /E/...` in Git Bash); otherwise the unit test files are not found.

## Test data

The stand-in page (`vp run dev`, scenario `today`) knows these people:

| Name | Account | Notes |
|------|---------|-------|
| Jan Kowalski | the signed-in user | the 10h 10m of 6 November 2026 from 001 |
| Anna Nowak | active, e-mail visible | 6h 00m on 6 November 2026 on two tickets |
| Anna Nowak | active, a second person of the same name, other e-mail | no time logged |
| Piotr Nowakowski | active | 1h 30m on 6 November 2026 |
| Józef Śliwiński | active, e-mail hidden (empty) | no time logged |
| Marta Zielińska | deactivated | must never be offered |
| Worklog Bot | an app account | must never be offered |

The exact account IDs and worklogs are defined once in `tests/e2e/browser-gateway.ts` and
reused by the fixtures under `tests/fixtures/`.

## Validation scenarios

Each can be done on the stand-in page; V1 to V8 are also covered by automated tests.

| ID | Steps | Expected | Spec |
|----|-------|----------|------|
| V1 | Open the panel | "Jan Kowalski" above the title in the name colour; the launcher shows no name | US1; FR-006, FR-007 |
| V2 | Settings → "Inny użytkownik" → type `piotr nowakowski` → "Zapisz" | Settings close; the rows shown before are cleared at once; "Piotr Nowakowski" above the title; table and totals show 1h 30m; the launcher reads "Piotr Nowakowski · Dziś: 1h 30m"; back and forward are disabled | US2; FR-003, FR-004, FR-033 |
| V3 | In V2, change the period, press "Odśwież" | The data stays Piotr's | US2 scenario 4 |
| V4 | Settings → "Inny użytkownik" → `Jan Nieistniejący`, set the interval to 10 → "Zapisz" | Alert window with "Nie znaleziono użytkownika. Nie można zapisać ustawień." and "OK"; after "OK" the settings are open with the name, the option, and 10 in the interval; the panel shows the previous person; a reload shows the old interval | US3; FR-020 to FR-022 |
| V5 | Settings → "Inny użytkownik" → `Anna Nowak` → "Zapisz" | No alert; a list with two "Anna Nowak" with different e-mail addresses and "Piotr Nowakowski" is not in it; pick the first → the name is in the field; "Zapisz" → her 6h 00m | US3 scenarios 7, 9; FR-026, FR-031 |
| V6 | Settings → "Inny użytkownik" → `Nowak` → "Zapisz" | A list with both "Anna Nowak" and "Piotr Nowakowski" | US3 scenario 8 |
| V7 | With another person shown: minimise and open; then press the close button and open | After minimise: still that person, the launcher kept the name. After close: Jan Kowalski, today, no name on the launcher | US4; FR-028 |
| V8 | With another person shown: reload the page; open the settings; select "Inny użytkownik" | After the reload: Jan Kowalski. The field already holds the last person's name; "Zapisz" shows that person without typing | US4 scenarios 4, 7; FR-032, FR-035, FR-036 |
| V9 | Settings → "Inny użytkownik" → `Marta Zielińska` → "Zapisz" | The "not found" alert: a deactivated account is not offered | Edge Cases |
| V10 | Settings → "Inny użytkownik" → empty field → "Zapisz"; then `Worklog Bot` → "Zapisz" | First: "Podaj imię i nazwisko.", no request sent. Second: the "not found" alert | FR-018; Assumptions |
| V11 | Stand-in page with `?scenario=people-offline`, type any name → "Zapisz" | "Nie udało się sprawdzić użytkownika w Jirze. Ustawienia nie zostały zapisane." under the field; no alert window; nothing saved | FR-023 |
| V12 | Repeat V1, V2, V4, V5 at 320 px width and in the light theme | Nothing overflows; the page does not scroll sideways; the name and the alert are readable | FR-015; SC-006, SC-007 |
| V13 | Settings → "Inny użytkownik" → `jozef sliwinski` → "Zapisz" | Found without Polish letters; "Józef Śliwiński" above the title; the empty state, 0h 00m | FR-017; US2 scenario 17 |

## Checks on a real Jira site

After `vp run build` and loading `dist/extension/` unpacked, do V2, V4, V5 or V6, V7, and V8
with a real colleague, then go through checks X7 to X11 in [research.md](research.md).
Compare the colleague's total for one day with what Jira shows in their worklogs (SC-003).

## Release check

The quality gates of the constitution, as in 001, plus for this feature:

1. `vp run check` passes.
2. The changed screens (header, launcher, settings with the list, alert window) are looked at
   at 320 px and 1280 px in both themes.
3. The network panel of the browser shows only `GET` requests to the Jira site while V2 to
   V9 are done on a real site.
