# Specification Quality Checklist: Export of the Table to a File

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-11-13
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Validation run 1 (2026-11-13): all items pass. No [NEEDS CLARIFICATION] marker was
  needed: every open point had a default that follows from "export aktualnego widoku
  tabeli" or from the specs of 001 and 002. The defaults are listed under Assumptions.
- The spec names the two file formats (CSV, XLSX), the form of the CSV text (separator,
  quotation marks, line breaks, UTF-8 with its mark), exact texts, colours, and sizes in
  pt. They are what the requester asked for and what a user sees when opening the file, as
  the specs of 001 and 002 name exact texts and colours; they name no language, framework,
  library, or API of the plugin.
- Five defaults are worth a look by the requester before planning, because each changes
  what the files contain (they can be changed with `/speckit-clarify`):
  - the label is "Eksport" (Polish), not "Export" as written in the request;
  - one line per ticket, all its entries in one field (not one line per time entry);
  - the CSV file has no total line and no name or period lines;
  - durations are texts ("6h 55m"), not numbers a spreadsheet can sum;
  - the file name carries the name without Polish diacritical marks.
- Clarification session 2026-11-13: the requester answered all five. Four defaults are
  confirmed (the label "Eksport", one line per ticket, no total line in the CSV file, the
  file name without Polish diacritical marks). One changed: in the XLSX file the sums are
  numbers shown as "6h 55m", which the spreadsheet program can add up (FR-025).
- Validation run 3 (2026-11-13), after the clarifications: all items pass.
- Checklist `export.md` resolved on 2026-11-13 (50 items): the spec gained FR-030 and
  SC-010 and exact rules where it had "about" or "enough" (keys, focus, file name, widths,
  heights, font, border, the colour of the total, the programs the files are checked in).
- Validation run 4 (2026-11-13), after that: all items pass.
- Constitution amended to 3.1.0 on 2026-11-13 at the requester's wish: the code that only
  the export uses is outside the size budget of 100 KB (FR-029, Dependencies). How the XLSX
  file is made, and with which dependency if any, is left to the plan.
- Validation run 2 (2026-11-13), after that change: all items pass.
- Items marked incomplete require spec updates before `/speckit-clarify` or `/speckit-plan`
