# Feature Specification: Export of the Table to a File

**Feature Branch**: `003-table-export`

**Created**: 2026-11-13

**Status**: Draft

**Input**: User description: "robimy nowy feature -> jezeli tabela z praca zawiera jakies dane, to robimy na dole z lewej strony combobox "Export" w ktorym do wyboru dropdown beda *.csv i *.xlsx Czyli export aktualnego widoku tabeli do pliku csc albo xlsx. W przypadku csv tradycyjny format, naglowek, separator średnik, wiersz w nowej linii. W przypadku xlsx zadbaj o wyglad, czyli naglolwek niech bedzie mial background, zadbaj o prawidlowa szerokosc kolumn tak zeby bylo analogicznie jak w pluginie, zadbaj o kolory, dodaj border pamietaj o suma czasu na dole. nad naglowkiem mozesz dac jeszcze wiersze z pelnym tytulem imie nazwisko, zakres dat i suma czasu. Pliki nazywaj {imie}_{nazwisko}_{zakres_dat}_tempo_report.{format}"

This feature extends the worktime panel of [001-worktime-panel](../001-worktime-panel/spec.md)
and of [002-other-user-worktime](../002-other-user-worktime/spec.md). Requirement numbers here
are local to this spec; requirements of the other two are cited as "001 FR-…" and "002 FR-…".
It changes no requirement of 001 or 002; it adds a control to the total row of 001 FR-014.
One line of the UI contract of 001 is narrowed by FR-030: "Odśwież" is still switched off
while a load runs, but it can hold the keyboard focus.

**Amended by 004-reset-button-toolbar (2026-11-14)**: FR-001 puts the control at the left
edge of the total row. In a window wider than 600 px it now stands in the middle of that
row, between the name of the plugin, which 004 adds at the left edge, and the total
([spec 004](../004-reset-button-toolbar/spec.md), FR-023, FR-025). In a window 600 px wide
or narrower it keeps the left edge. Everything else about the control is unchanged.

## Clarifications

### Session 2026-11-13

- Q: Czy czasy w pliku XLSX (kolumna „Suma" i suma całkowita) mają być tekstem „6h 55m", czy liczbą, którą arkusz potrafi sumować? → A: Liczbą: w XLSX komórki „Suma" i suma w wierszu sumy są liczbami pokazanymi jako „6h 55m", więc arkusz je sumuje; „Czas wpisów" i cały plik CSV zostają tekstem (FR-021, FR-025, FR-027).
- Q: Czy plik ma mieć jeden wiersz na zgłoszenie (jak tabela w pluginie), czy jeden wiersz na każdy wpis czasu? → A: Jeden wiersz na zgłoszenie w obu plikach; wszystkie wpisy zgłoszenia w jednej komórce: w XLSX jeden pod drugim, w CSV po przecinku i spacji (FR-011, FR-014, FR-021).
- Q: Czy plik CSV ma kończyć się wierszem „Suma czasu" z sumą całkowitą? → A: Nie. CSV to nagłówek i wiersze zgłoszeń, bez wiersza sumy i bez wierszy tytułowych; suma i tytuł są tylko w XLSX (FR-013).
- Q: Czy nazwa pliku ma zachować polskie znaki z imienia i nazwiska, czy zamienić je na litery bez ogonków? → A: Bez polskich znaków, wielkość liter zachowana: `Jozef_Sliwinski_13-11-2026_tempo_report.xlsx`; w środku pliku XLSX nazwisko zostaje z polskimi literami (FR-017, FR-020).
- Q: Czy przycisk ma mieć napis „Eksport" (po polsku), czy „Export" (jak w zgłoszeniu)? → A: „Eksport"; każdy widoczny tekst wtyczki jest po polsku (001 FR-035, FR-028).
- Q: FR-014 mówiło „wiersz tabeli to zawsze jedna linia pliku"; co dokładnie ma znaczyć? → A: Jeden wiersz to jedno zgłoszenie: jeden rekord i jedna linia tekstu, niezależnie od liczby wpisów. Wpisy zgłoszenia stoją w jednym polu po przecinku i spacji i nie zaczynają nowej linii; tekst pliku łamie się tylko między zgłoszeniami. Tytuł jest zawsze jedną linią: tabulator i znak nowej linii w tytule stają się spacją (ustalone 2026-11-13 po checkliście `checklists/export.md`; FR-011, FR-013, FR-014).
- Q: Czy ochrona przed formułami ma objąć tytuł, w którym przed `=`, `+`, `-`, `@` stoi spacja lub tabulator? → A: Tak. Liczy się pierwszy znak, który nie jest białym znakiem; apostrof staje na samym początku pola (FR-015, FR-027).
- Q: Gdzie ma trafić fokus klawiatury, gdy przycisk „Eksport" zostaje wyłączony albo znika, a miał fokus (np. zaczyna się odświeżanie)? → A: Na przycisk „Cofnij" w nagłówku; gdy „Cofnij" jest wyłączony, na „Odśwież". Żeby to było możliwe także w czasie ładowania, „Odśwież" w tym czasie wygląda i działa jak wyłączony, ale może trzymać fokus (FR-030).
- Q: Co zrobić, gdy imię i nazwisko jest za długie na nazwę pliku? → A: Nie ucinać. Gdy część z imieniem i nazwiskiem ma ponad 100 znaków, w nazwie pliku zostaje samo nazwisko (ostatnie słowo); gdy i ono ma ponad 100 znaków, nazwa pliku zaczyna się od zakresu dat (FR-017).
- Q: Jaki tekst słyszy czytnik ekranu, gdy plik jest tworzony? → A: „Tworzenie pliku…" (FR-009, FR-028).
- Q: W jakich programach plik XLSX ma się otwierać bez ostrzeżenia? → A: Microsoft Excel, Google Sheets i LibreOffice Calc, w wersjach aktualnych w dniu wydania; plik CSV jest sprawdzany w Excelu z polskimi ustawieniami regionalnymi (FR-016, FR-026, SC-003, SC-004).
- Q: Czy pozostałe punkty checklisty `checklists/export.md` zmieniają wymagania? → A: Tak, doprecyzowują je: klawisze menu i fokus po zamknięciu (FR-006, FR-007), stany przycisku (FR-002, FR-003, FR-009), reguły nazwy pliku (FR-017, FR-018), dokładne szerokości, wysokości, czcionka, obramowanie i kolor sumy w XLSX (FR-021 do FR-025).

Requirement numbers are identifiers, not an order: FR-030 was added by the checklist and
stands with the requirements of the control, after FR-009.

## Terms

- **Table**: the table of tickets of 001 FR-002, with the columns "Zgłoszenie", "Tytuł",
  "Czas wpisów", and "Suma".
- **Total row**: the row below the table with "Suma czasu:" and the total (001 FR-014).
- **View**: what the table shows at one moment: the rows on screen, in the order on screen,
  for the period on screen and the selected person (002 FR-001).
- **Export control**: the new control labelled "Eksport" in the total row.
- **Export menu**: the list of the two file formats that the export control opens.
- **Report file**: the file the plugin makes from the view, in one of two formats: CSV (text
  with separators) or XLSX (a spreadsheet with formatting).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Save the table as a CSV file (Priority: P1)

The table shows logged time. At the left of the total row, on the line of "Suma czasu:",
there is a control "Eksport". The user presses it, sees two choices, "*.csv" and "*.xlsx",
and chooses "*.csv". The browser saves a file named after the person and the period, for
example `Jan_Kowalski_13-11-2026_tempo_report.csv`. The file holds a header line and one line
for each row of the table, with the columns separated by semicolons.

**Why this priority**: A CSV file is the smallest export that is useful by itself: it opens
in every spreadsheet program and can be pasted into a time report. It also delivers the
control and the file name that the second format reuses.

**Independent Test**: With time logged on three tickets today, press "Eksport", choose
"*.csv", open the saved file in a text editor and in a spreadsheet program, and compare the
name of the file, the header, and every line with the table on screen.

**Acceptance Scenarios**:

1. **Given** the table shows at least one row, **When** the user looks at the total row,
   **Then** the control "Eksport" stands at its left edge and "Suma czasu:" with the total
   stands at its right edge, as before.
2. **Given** the control is shown, **When** the user activates it, **Then** a menu opens
   above it with exactly two choices, "*.csv" first and "*.xlsx" second.
3. **Given** the menu is open and the panel shows Jan Kowalski's time for Friday
   13-11-2026, **When** the user chooses "*.csv", **Then** the menu closes, the focus is
   back on "Eksport", and the browser saves `Jan_Kowalski_13-11-2026_tempo_report.csv`.
4. **Given** that file, **When** it is opened as text, **Then** its first line is
   `Zgłoszenie;Tytuł;Czas wpisów;Suma`, it has one more line for each row of the table and
   no other lines, and each line has four fields separated by semicolons.
5. **Given** the table is sorted by "Suma", descending, **When** the user exports, **Then**
   the lines of the file are in that same order.
6. **Given** a ticket with two entries, shown as "07:00–10:30 · 3h 30m" and
   "11:00–12:00 · 1h 00m", **When** the file is made, **Then** the third field of that
   ticket's line is `07:00–10:30 · 3h 30m, 11:00–12:00 · 1h 00m`: both entries in one field
   of one line.
7. **Given** a ticket titled `Raport; wersja "B"`, **When** the file is made, **Then** the
   field is written as `"Raport; wersja ""B"""`, and a spreadsheet program shows the title
   whole in the second column.
8. **Given** the period 01-11-2026 – 30-11-2026, **When** the user exports, **Then** the
   file is named `Jan_Kowalski_01-11-2026_30-11-2026_tempo_report.csv` and each entry in it
   carries its date, as on screen (`06-11 07:00–10:30 · 3h 30m`).
9. **Given** the file is opened by a double click in Microsoft Excel with Polish regional
   settings, **When** the user looks at it, **Then** the four columns are split without any import
   step and the Polish letters are right.
10. **Given** the panel shows the time of another person, Józef Śliwiński, **When** the
    user exports, **Then** the file is named `Jozef_Sliwinski_…_tempo_report.csv` and holds
    that person's rows.
11. **Given** a user without a pointer, **When** they use the keyboard alone, **Then** they
    can reach "Eksport", open the menu, move between the two choices with the arrow keys,
    choose one with Enter, and close the menu with Escape without closing the panel.
12. **Given** a ticket with five entries, **When** the file is opened as text, **Then**
    that ticket is one line of the file with all five entries in its third field; the
    file has exactly one line for the header and one for each ticket.
13. **Given** tickets titled `=1+1` and ` -5 dni` (a space first), **When** the file is
    made, **Then** their fields are written `'=1+1` and `' -5 dni`, and a spreadsheet
    program shows both as text.
14. **Given** a ticket whose title holds a tab or a line break, **When** either file is
    made, **Then** the title is one line with a space in that place.

---

### User Story 2 - Save the table as a formatted XLSX file (Priority: P2)

The user chooses "*.xlsx" in the export menu. The browser saves a spreadsheet that looks
like the table of the plugin: above the table stand the full name of the person, the
period, and the total; the header row has a coloured background; the columns have the
proportions of the panel; the cells have borders; the colours are those of the plugin; and
the last row is "Suma czasu:" with the total.

**Why this priority**: This is the file a user hands on or prints: a report that needs no
further work. It builds on the control and the file name of Story 1.

**Independent Test**: With time logged on three tickets, one of them with two entries and
one with a long title, export "*.xlsx", open the file in a spreadsheet program, and check
the three title rows, the header row, each ticket row, the total row, the widths, the
borders, and the colours against the layout of FR-020 to FR-027.

**Acceptance Scenarios**:

1. **Given** the panel shows Jan Kowalski's time for Friday 13-11-2026 with a total of
   6h 55m, **When** the user chooses "*.xlsx", **Then** the browser saves
   `Jan_Kowalski_13-11-2026_tempo_report.xlsx`.
2. **Given** that file is opened, **When** the user looks at its top, **Then** row 1 reads
   "Jan Kowalski", row 2 "Piątek 13-11-2026", row 3 "Suma czasu: 6h 55m", row 4 is empty,
   and row 5 is the header "Zgłoszenie", "Tytuł", "Czas wpisów", "Suma".
3. **Given** the header row, **When** the user looks at it, **Then** its four cells have a
   filled background, bold text that is readable on it, and a border.
4. **Given** the ticket rows, **When** the user looks at them, **Then** there is one row
   for each row of the table, in the order on screen; the ticket number is a link that
   opens the ticket; the title wraps inside its cell; the entries of a ticket stand one
   below the other inside one cell; the sum is at the right of its cell.
5. **Given** the last row of the table, **When** the user looks under it, **Then** the
   next row reads "Suma czasu:" in the third column and the total in the fourth, in bold,
   and the total equals the total on screen.
6. **Given** the file at 100% zoom, **When** the user looks at the columns, **Then** no
   ticket number, entry line, or sum is cut or wrapped, the "Tytuł" column is the widest,
   and nothing has to be widened by hand to read the sheet.
7. **Given** the table from the header row to the total row, **When** the user looks at
   it, **Then** every cell has a thin border on all four sides.
8. **Given** a single day with a total of 6h 55m shown in a progress colour on screen,
   **When** the file is opened, **Then** the total in row 3 and in the total row has the
   same colour meaning, in a shade readable on white; **Given** a period longer than one
   day, **Then** both are in the normal text colour.
9. **Given** the plugin is in the dark appearance, **When** the user exports, **Then** the
   file looks the same as one exported in the light appearance: dark text on a white sheet.
10. **Given** the file, **When** it is opened in Microsoft Excel, in LibreOffice Calc, and
    in Google Sheets, **Then** each opens it without a warning or a repair message.
11. **Given** a ticket titled `=1+1`, **When** the file is opened, **Then** the cell shows
    the text `=1+1`, not the number 2.
12. **Given** three ticket rows with the sums 3h 30m, 2h 00m, and 1h 25m, **When** the user
    selects the three "Suma" cells or adds them up with the program's sum function,
    **Then** the program gives 6h 55m, the value of the total row; each cell still reads
    as on screen ("3h 30m").
13. **Given** a month with a total of 38h 30m, **When** the file is opened, **Then** the
    total row reads "38h 30m", not a time of day.

---

### User Story 3 - The export is offered only when there is something to export (Priority: P2)

The control "Eksport" is present only while the table holds rows. With an empty period, an
error, or before the first load there is no control. While data is loading the control
cannot be used, so a file never holds rows of one period under the name of another.

**Why this priority**: It keeps the file honest: what is saved is what the user sees. The
two formats work without it for a loaded table, but with it no wrong or empty file can be
made.

**Independent Test**: Go through a period with entries, a period without entries, a load
that fails, a slow load of a new period, and a change of person, and confirm at each
moment whether the control is present and usable as FR-002 to FR-004 say.

**Acceptance Scenarios**:

1. **Given** a period in which nothing was logged, **When** the empty state is shown,
   **Then** there is no export control, and the total row has the same height as with it.
2. **Given** the first load after the page opened has not finished, **When** the user
   looks at the total row, **Then** there is no export control.
3. **Given** the table shows rows and the user selects another period, **When** the
   spinner covers the rows of the previous period, **Then** the control is disabled; once
   the new rows are shown it is enabled again.
4. **Given** the export menu is open, **When** a load starts (refresh, auto-refresh, a
   change of period), **Then** the menu closes and no file is made.
5. **Given** a load failed and the table shows the error state without rows, **When** the
   user looks at the total row, **Then** there is no export control.
6. **Given** a refresh failed and the rows of the last load are still on screen with the
   error message, **When** the user exports, **Then** the file holds those rows.
7. **Given** the person changes (002 FR-003) and the table is emptied, **When** the user
   looks at the total row, **Then** there is no export control until rows of the new
   person are shown.
8. **Given** the file cannot be made or saved, **When** the user chose a format, **Then**
   "Nie udało się utworzyć pliku." is shown beside the control, no file is saved, and the
   table stays as it was.
9. **Given** the export menu is open, **When** the user presses Escape, clicks outside the
   menu, or minimises or closes the panel, **Then** the menu closes and no file is made.
10. **Given** the keyboard focus is on "Eksport" or on a choice of its menu, **When** an
    automatic refresh starts, **Then** the control is disabled and the focus is on
    "Cofnij"; **Given** "Cofnij" is disabled (the first view, nothing to go back to),
    **Then** the focus is on "Odśwież", which shows its loading sign and does nothing when
    activated. When the rows are back, the focus has not moved again.
11. **Given** the focus is in the "Od:" field, **When** an automatic refresh starts,
    **Then** the focus stays where it is.
12. **Given** the message "Nie udało się utworzyć pliku." is shown, **When** the user
    activates "Eksport" again, **Then** the message is gone and the menu is open.
13. **Given** a file is being made, **When** a screen reader reads the control, **Then**
    it is announced as busy with "Tworzenie pliku…".

---

### Edge Cases

- A title holds a semicolon or a quotation mark: in the CSV file the field is put in
  quotation marks and each quotation mark inside it is doubled (FR-013); in the XLSX file
  the title is in one cell.
- A title holds a tab, a line break, or another control character: the tab and the line
  break become one space and the others are removed, in both formats, so a ticket is
  always one line of the CSV file (FR-011, FR-014).
- A ticket has no title: its field or cell is empty (FR-011).
- A title starts with `=`, `+`, `-`, or `@`, also after spaces or a tab: a spreadsheet
  program must show it as text and never run it as a formula, in both formats (FR-015,
  FR-027).
- A logged value is not a whole minute: each sum holds the minutes the screen shows, and
  the rows of the XLSX file may add up to a little less than its total (FR-025).
- A very long title (255 characters): whole in the CSV file; wrapped inside its cell in the
  XLSX file, with the row tall enough to show it.
- A ticket with many entries (20): one field in the CSV file; one cell with 20 lines in the
  XLSX file, with the row tall enough to show them all.
- A year with several hundred tickets: every row on screen is in the file; the table has no
  pages, so neither has the file.
- A period that covers part of a day (08:00–12:00): the file name and row 2 of the XLSX
  file carry the times (FR-018, FR-021).
- A period that touches two years: entries carry day and month without the year, as on
  screen; this is accepted, the period is named in the file name and in the XLSX title.
- The full name has three words, a hyphen, or Polish letters ("Anna Maria Nowak-Kowalska",
  "Józef Śliwiński"): see FR-017.
- Jira gives no name for the signed-in user (002 FR-010), or the name consists only of
  characters a file name may not hold: the file name starts with the date range; row 1 of
  the XLSX file is empty in the first case and holds the name as it is in the second.
- The full name is very long (a name may have up to 255 characters): above 100 characters
  the file name carries the surname alone, and when that is above 100 characters too, only
  the date range (FR-017). The XLSX file holds the full name whole in row 1.
- The full name is one word of more than 100 characters: the file name starts with the
  date range.
- The same view is exported twice: the browser's own rule for a file that already exists
  applies (for example " (1)" added by the browser); the plugin does not change the name.
- An auto-refresh starts while the menu is open: the menu closes and no file is made
  (FR-003). One that starts after a format was chosen changes nothing in the file: the
  file is made at once from the rows on screen at the choice.
- The control or its menu has the focus when a load starts or the table is emptied: the
  focus moves to the header (FR-030).
- More than 500 rows: the file is still made whole; the 2 seconds of SC-001 are promised
  up to 500 rows only. There is no limit of rows.
- Tickets the signed-in user may not see are not on screen (001) and so not in the file.
- The total is 0h 00m although rows are on screen (entries shorter than a minute): the
  total in the XLSX file is in the muted colour, as on screen (001 FR-068).
- The window is 320 px wide: the control and "Suma czasu:" with the total stay on one
  line, and the menu stays inside the window.
- The panel is at its lowest height: the menu opens upward over the table and is wholly
  inside the panel.
- The browser asks where to save, or blocks downloads: the browser's own behaviour applies;
  when the plugin can tell that no file was made, it shows the message of FR-009.
- A phone browser: the file is saved through the browser's own download, as on a desktop.

## Requirements *(mandatory)*

### Functional Requirements

**The export control**

- **FR-001**: The total row MUST carry a control labelled "Eksport" at its left edge, on
  the same line as "Suma czasu:" and the total, which keep their place at the right edge
  (001 FR-062). This holds at every supported width, also in the narrow layout in which
  the rows of the table are drawn as cards: the total row is the same row there. At 320 px
  the control, "Suma czasu:", and a total of up to "999h 59m" fit on one line; nothing
  gives way. The total row MUST have the same height with and without the control, so the
  panel does not jump when the control appears or disappears.
- **FR-002**: The control MUST be present exactly while the table shows at least one row.
  It MUST NOT be present before the first load has finished, in the empty state, in the
  error state without rows, or while the table is emptied for a change of person
  (002 FR-003). A view shown from data already loaded, without a load (a bar of the chart,
  "Cofnij" and "Ponów", a period button; 001 FR-081, FR-083, FR-085), has the control
  enabled at once and exports that view.
- **FR-003**: While a load is running (the spinner of 001 FR-060 covers the table) the
  control MUST be present but disabled, and MUST look disabled in the way "Cofnij" and
  "Ponów" do when they have nowhere to go (001 FR-082). A load that starts while the
  export menu is open MUST close the menu.
- **FR-004**: After a failed refresh that leaves the rows of the last load on screen under
  the error message, the control MUST be enabled and export those rows.
- **FR-005**: Activating the control MUST open the export menu with exactly two choices in
  this order: "*.csv" and "*.xlsx". The menu MUST always open above the control, whether
  the panel hangs above or below the launcher, and stay wholly inside the panel and the
  window at every supported width (320 px to 1920 px) and at the lowest panel height; it
  may cover the lowest rows of the table. Choosing one MUST close the menu, return the
  focus to the control, and start the export in that format. No format is preselected and
  none is remembered: every export begins with the choice.
- **FR-006**: The menu MUST close without an export on Escape, on a click or tap outside
  it, on a second activation of the control, when the panel is minimised or closed, and
  when a load starts. After Escape and after a second activation the focus MUST be on the
  control; after a click or tap outside, the focus is where that click put it. Escape
  closes one thing at a time, innermost first (002 FR-047): the export menu comes before
  the panel.
- **FR-007**: The control and the two choices MUST be operable by mouse, by touch, and by
  keyboard alone, with these keys and no others:

  | Where | Key | Result |
  |-------|-----|--------|
  | the control, menu closed | Enter, Space, Arrow Down | the menu opens with the focus on the first choice |
  | the menu | Arrow Down, Arrow Up | the next, the previous choice; from the last to the first and back |
  | the menu | Home, End | the first, the last choice |
  | the menu | Enter, Space | chooses (FR-005) |
  | the menu | Escape | closes it (FR-006) |
  | the menu | Tab, Shift+Tab | closes it; the focus moves on as it would from the control |

  Each MUST show a visible focus, MUST be at least 44 x 44 px on touch devices and narrow
  screens, and MUST react to the pointer like the other buttons of the panel (001 FR-065).
  Nothing depends on hover.
- **FR-008**: The control MUST be named for assistive technology by its label and MUST
  announce whether its menu is open. The menu is named "Eksport", like the control. The
  choices are named "Eksport do pliku CSV" and "Eksport do pliku XLSX"; their visible
  texts stay "*.csv" and "*.xlsx".
- **FR-009**: While a file is being made the control MUST be switched off and announced
  as busy, with "Tworzenie pliku…" for assistive technology: it ignores activation and is
  announced as unavailable, but, like "Odśwież" during a load (FR-030), it is not taken
  out of the keyboard order, so it keeps the focus. No second file can be asked for
  meanwhile: one choice makes exactly one file. When the file cannot be made or saved, the
  plugin MUST show "Nie udało się utworzyć pliku." in the colour of error messages,
  announced to assistive technology; no file is saved, the table stays as it was, and the
  control is enabled again at once, so the user can try again. The message stands beside
  the control when it fits on the line of the total (as at 1280 px), and under the control
  when it does not (as at 320 px); it never moves or cuts the total. It disappears at the
  next activation of the control, when a load starts, and when the rows are replaced or
  removed; a change of the sort order leaves it. A successful export shows no message of
  the plugin, on purpose: the file is made at once, and the browser shows its own download.
- **FR-030**: When the control becomes disabled or disappears while it, or a choice of its
  menu, has the keyboard focus (a load starts, also an automatic refresh; the table is
  emptied), the focus MUST move to the "Cofnij" button of the header, so that it is not
  lost to the Jira page. When "Cofnij" is disabled, it moves to "Odśwież". For this,
  "Odśwież" MUST be able to hold the keyboard focus while a load runs: it keeps the look
  of a disabled button and its loading sign, is announced as unavailable and busy, and
  does nothing when activated, as before, but the focus can stand on it and stays on it
  when the load starts and ends. The focus does not return to the control by itself when
  the load ends. When the focus is anywhere else, nothing moves. The short time a file is
  being made (FR-009) is not such a case: the focus stays on the control.
- **FR-010**: The control and the menu MUST follow the dark and the light appearance and
  use only the colours, sizes, and spacing the plugin already defines (001 FR-043).

**What is exported**

- **FR-011**: A report file MUST hold exactly the view at the moment the format was
  chosen: every row on screen and no other, in the order on screen (001 FR-063), for the
  period on screen (also a part selected on the chart, 001 FR-080) and the selected person
  (002 FR-001). Each row has the four columns of the table and reads as on screen: the
  ticket number, the title, the entries (with their dates when the period is longer than
  one day, 001 FR-011), and the sum (001 FR-010); in the XLSX file the sum is a number
  shown as that text (FR-025). A title is always written as one line: a tab or a line
  break in it becomes one space, and other control characters are removed. A ticket
  without a title gives an empty field or cell.
- **FR-012**: Making a file MUST NOT send any request to Jira and MUST NOT send any data
  anywhere else: the file is made in the user's browser from what is already loaded. The
  feature MUST NOT require the user to grant the extension a new permission.

**CSV file**

- **FR-013**: The CSV file MUST be plain text in this form:
  - The first line is the header: `Zgłoszenie;Tytuł;Czas wpisów;Suma`.
  - Each following line is one ticket (FR-014); nothing stands after the last ticket (no
    title lines, no total line).
  - Fields are separated by a semicolon. Each line, also the last, ends with a line break
    (carriage return and line feed).
  - A field that holds a semicolon or a quotation mark is put in quotation marks, and each
    quotation mark inside it is doubled. Other fields are written without quotation marks.
    No field holds a line break (FR-011, FR-014); one that did would be put in quotation
    marks in the same way.
- **FR-014**: Each ticket, that is each row of the table, MUST be exactly one record and
  one line of text of the file, however many entries it has. The entries of a ticket are
  written in one field, in the order on screen, separated by a comma and a space; they
  never start a new line. The text of the file is broken only between tickets.
- **FR-015**: A field whose first character that is not white space (a space, a no-break
  space, a tab) is `=`, `+`, `-`, or `@` MUST be written with an apostrophe as its very
  first character, before that white space, so that a spreadsheet program does not run it
  as a formula. The rule holds for every field; in practice only a title can meet it. The
  apostrophe is added first; then the quotation rule of FR-013 is applied.
- **FR-016**: The file MUST open with a double click in Microsoft Excel on Windows with
  Polish regional settings (list separator: semicolon) with the four columns split and the
  Polish letters, the dash, and the middle dot of the entries shown right, without an
  import step. For this the text is stored as UTF-8 and starts with the byte order mark
  (the three bytes EF BB BF).

**File name**

- **FR-017**: The file MUST be named `{name}_{range}_tempo_report.{format}`, where
  `{format}` is `csv` or `xlsx`, in small letters. `{name}` is the full name of the
  selected person as Jira has it, changed in this order:
  1. Diacritical marks are removed: every letter that is a base letter with marks loses
     the marks (ą → a, ć → c, ę → e, ń → n, ó → o, ś → s, ź → z, ż → z, and likewise é, ü,
     č), and ł becomes l; capitals alike. Letters that are not a base letter with marks
     (ß, ø, đ) and letters of other alphabets stay as they are.
  2. Characters a file name may not hold (`\ / : * ? " < > |` and control characters) are
     removed. A hyphen and a dot inside the name stay.
  3. White space at the ends is removed, and every run of white space becomes one
     underscore.
  4. Dots and underscores at the start and at the end are removed.
  5. A result longer than 100 characters is too long. Then the surname alone is taken,
     without the first names: the last word of the result (what follows its last
     underscore), for example `Nowak-Kowalska_13-11-2026_tempo_report.csv`. When the
     surname alone is longer than 100 characters too, the name is left out. A name is
     never cut in the middle of a word.

  Letter case stays. When no name is known, when nothing is left of it after these steps,
  or when it is left out by step 5, the file name starts with `{range}`.
- **FR-018**: `{range}` names the period on screen with dates as `dd-mm-yyyy`, the same
  dates and times the title of the panel shows (in the signed-in user's time zone, as
  everything in the panel). A period counts as whole days by the rule the title uses to
  leave the times out (001 FR-012, FR-013): it starts at 00:00 and ends at 23:59.

  | Period | `{range}` | Example of the whole name |
  |--------|-----------|---------------------------|
  | one whole day | the date | `Jan_Kowalski_13-11-2026_tempo_report.csv` |
  | several whole days | first date, underscore, last date | `Jan_Kowalski_01-11-2026_30-11-2026_tempo_report.xlsx` |
  | any other period | each end as date, underscore, time as `HHMM`; both ends always | `Jan_Kowalski_13-11-2026_0800_13-11-2026_1200_tempo_report.csv` |

- **FR-019**: Both formats of the same view MUST get the same name up to the ending.

**XLSX file**

- **FR-020**: The XLSX file MUST hold one sheet named "Raport" with these rows, top to
  bottom, in the columns A to D:

  | Row | Content |
  |-----|---------|
  | 1 | the full name of the selected person, as Jira has it (with its Polish letters) |
  | 2 | the period exactly as the title of the panel names it, without the total (001 FR-012, FR-013) |
  | 3 | "Suma czasu:" followed by the total of the period |
  | 4 | empty |
  | 5 | the header: "Zgłoszenie", "Tytuł", "Czas wpisów", "Suma" |
  | 6 and on | one row for each row of the table |
  | after the last ticket row | the total row: "Suma czasu:" in column C, the total in column D |

  Rows 1 to 3 each span the four columns as one cell, so a long name or period is not cut.
  When no name is known, row 1 is there, empty, with its height: the other rows keep their
  numbers.
- **FR-021**: The cells MUST look like this:

  | Part | Look |
  |------|------|
  | Row 1 (name) | bold, 14 pt, the name colour |
  | Row 2 (period) | bold, 12 pt, the text colour |
  | Row 3 (total) | bold, 12 pt, the colour of the total (FR-024) |
  | Header row | bold white text on a filled background in the accent colour; text at the left, "Suma" at the right |
  | "Zgłoszenie" cells | the ticket number in bold in the link colour, as a link that opens the ticket (the address the panel uses, 001 FR-004); never wrapped. A ticket without a usable address keeps the look and has no link |
  | "Tytuł" cells | the text colour; the text wraps inside the cell |
  | "Czas wpisów" cells | the muted colour; one entry per line inside the cell; no line wraps |
  | "Suma" cells | a number shown as on screen (FR-025); the text colour; at the right of the cell; never wrapped |
  | Total row | bold; "Suma czasu:" at the right of column C, the total at the right of column D, both in the colour of the total (FR-024); columns A and B empty |

  Text stands at the top of its cell, as in the panel. The font is Calibri, 11 pt where
  the table above gives no size; a program without that font shows its own replacement.
- **FR-022**: Every cell from the header row to the total row, in all four columns, MUST
  have a border on all four sides in the border colour: one solid line of the thinnest
  line style the format has. Rows 1 to 4 have no border.
- **FR-023**: The column widths, in the character widths the format counts in, MUST start
  from 14, 47, 24, and 11 for "Zgłoszenie", "Tytuł", "Czas wpisów", and "Suma": the
  proportions of the panel's table at its default width (about 15 : 49 : 25 : 11). Then:
  - "Zgłoszenie", "Czas wpisów", and "Suma" are each widened to the longest text of their
    column plus 2 characters, when that is more (a ticket number, an entry line with its
    date, a sum, the header, "Suma czasu:" and the total of the total row), so nothing in
    them is cut or wrapped.
  - "Tytuł" stays the widest: at least 10 characters wider than the widest of the other
    three.

  Each row MUST have a height set in the file, tall enough for all its lines without the
  user resizing anything: 15 pt for each line. The lines of a ticket row are the larger of
  the number of its entries and the lines its title needs, counted as the length of the
  title divided by 90% of the width of "Tytuł", rounded up; at least 1.
- **FR-024**: The colours of the file MUST be the same whichever appearance the plugin is
  in. They are the colours of the light appearance, because a sheet is white:

  | Use | Colour |
  |-----|--------|
  | Text | `#172033` |
  | Muted text (entries; a total of 0h 00m) | `#5a6475` |
  | Ticket number (link) | `#0b5cd7` |
  | Name of the person (002 FR-007) | `#b84e00` |
  | Header background / header text | `#0c66e4` / `#ffffff` |
  | Border | `#9aa3b2` |
  | Total of a single day | the progress colour of its value (below) |
  | Total of a longer period | the text colour (001 FR-019) |

  The progress colour of a single day's total follows 001 FR-016 to FR-018, with the text
  shades of the light appearance: blue `#0a6199`, green `#146c43`, yellow `#7a5200`,
  orange `#a34100`, red `#b3261e`. From 0 to 8 hours it goes from blue to green, from 8 to
  16 hours from yellow to orange, from 16 to 24 hours from orange to red, and it is red
  above. Between two shades each of red, green, and blue is taken in proportion to how far
  the total is through its 8 hours, and rounded.

  Every text MUST have a contrast of at least 4.5:1 against its background.
- **FR-025**: The sum of each ticket row (column D) and the total in the total row (column
  D) MUST be numbers: durations the spreadsheet program can add up, compare, and sort,
  shown exactly as on screen ("6h 55m", also above 24 hours: "38h 30m"). Each holds the
  whole minutes shown on screen. With logged values of whole minutes (001 FR-010) the sums
  of the ticket rows add up to the total of the total row. Where a logged value is not a
  whole minute, each cell still holds what the screen shows, and the rows may add up to
  less than the total, by less than a minute for each row. The total is written as a
  value, not as a formula. Everything else MUST be text as shown on screen: the entries
  ("07:00–10:30 · 3h 30m") and the total in row 3, which stands in one cell with its label.
- **FR-026**: The file MUST open without a warning or a repair message in Microsoft Excel,
  in LibreOffice Calc, and in Google Sheets, each in the version current at the release.
- **FR-027**: No cell may hold a formula. Every cell other than the sums of FR-025 MUST
  hold plain text: a text that starts with `=`, `+`, `-`, or `@`, also after white space,
  is shown as written and is never run as a formula. No apostrophe is added in this
  format.

**Presentation**

- **FR-028**: All new texts MUST be in Polish, exactly these:

  | Element | Text |
  |---------|------|
  | Export control, and the name of its menu for assistive technology | `Eksport` |
  | Choice 1 (visible / for assistive technology) | `*.csv` / `Eksport do pliku CSV` |
  | Choice 2 (visible / for assistive technology) | `*.xlsx` / `Eksport do pliku XLSX` |
  | The control while a file is being made (text for assistive technology, FR-009) | `Tworzenie pliku…` |
  | File could not be made (FR-009) | `Nie udało się utworzyć pliku.` |
  | Name of the sheet (FR-020) | `Raport` |

  The column headers and "Suma czasu:" in the files are the texts of 001 (001 FR-002,
  FR-014). The file name is not a text of the interface: its fixed part `tempo_report` is
  as the requester gave it.
- **FR-029**: The code that only the export uses (what makes the two files and hands them
  to the browser) has no size limit (constitution 3.1.0, Principle I, decided by the
  requester on 2026-11-13). The rest of the plugin, with the export control and its menu,
  MUST stay within its size budget, and the size of the export code MUST be reported on
  every build. The dependency rule of the constitution still holds.

### Key Entities

- **View**: the rows on screen with their order, the period, and the selected person. The
  only source of a report file.
- **Exported row**: one ticket of the view: ticket number, address of the ticket, title,
  the lines of its entries, and its sum, each as the text shown on screen; the sum also as
  its number of whole minutes (for the XLSX file, FR-025).
- **Report file**: a file made from one view, in one format. Has a name (FR-017) and a
  content (FR-013 or FR-020). It is made in the browser and kept nowhere by the plugin.
- **Report heading** (XLSX only): the full name of the selected person, the period as the
  title names it, and the total of the period.
- **Export format**: one of two, CSV or XLSX. Chosen for every export; not a setting.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user gets a file of the table on screen in 2 actions (the control, the
  format), and the browser has the file within 2 seconds of the choice for a table of up
  to 500 rows, measured in the project's automated browser test from the choice to the
  start of the download.
- **SC-002**: In 100% of exports the file holds the same rows as the screen: the same
  number, the same order, and the same text read in every cell (a title as one line,
  FR-011); in the XLSX file the total
  equals the total on screen to the minute, and the "Suma" cells added up by the
  spreadsheet program give that total.
- **SC-003**: A CSV file opens with a double click in Microsoft Excel on Windows with
  Polish regional settings with four columns and correct Polish letters, with no import
  step, in 100% of cases, also for titles with semicolons and quotation marks; and every
  ticket is exactly one line of the file.
- **SC-004**: An XLSX file opens without a warning in Microsoft Excel, LibreOffice Calc,
  and Google Sheets, and at 100% zoom with the font of the file no ticket number, entry
  line, or sum is cut or wrapped; a user reads the whole sheet without changing a width or
  a height. The widths and heights written in the file are those of FR-023, which is
  checked from the file itself.
- **SC-010**: SC-003 and SC-004 need the real programs: the requester checks them by hand
  before every release that changes the export, with the files of the validation guide,
  and the date and result are written down with the plan's research. Everything else in
  this list is checked automatically.
- **SC-005**: In 100% of exports the file is named `{name}_{range}_tempo_report.{format}`
  as FR-017 and FR-018 say, for a single day, a range of days, a period with times, a name
  with Polish letters, and a missing name.
- **SC-006**: The control is never offered when the table has no rows, and no file is ever
  made while a load is running: checked in the empty state, the error state, the first
  load, a change of period, and a change of person.
- **SC-007**: No text in either file is run as a formula by a spreadsheet program, for
  titles that start with `=`, `+`, `-`, or `@`.
- **SC-008**: The control and the menu are fully usable at window widths from 320 px to
  1920 px, by keyboard alone and by touch, in both appearances.
- **SC-009**: Making a file sends 0 requests, to Jira or anywhere else.

## Assumptions

- "Na dole z lewej strony" is read as the left edge of the total row below the table, on
  the line of "Suma czasu:". The table area above it is not changed.
- The label is "Eksport", not "Export": every visible text of the plugin is Polish
  (001 FR-035; confirmed by the requester on 2026-11-13). The choices keep the form the
  requester gave, "*.csv" and "*.xlsx".
- "Combobox z dropdown" is read as a button that opens a short menu of two formats. A
  choice starts the export at once; there is no separate confirming button.
- "Export aktualnego widoku tabeli" is read as: the rows on screen, in the sort order on
  screen, one line or row per ticket as in the table, with all entries of a ticket in one
  field or cell (confirmed by the requester on 2026-11-13). A file with one line per time
  entry is out of scope, in both formats.
- The CSV file is a data file: a header and the rows, without the total and without the
  name and period (they are in the file name). The total row was asked for the XLSX file
  (confirmed by the requester on 2026-11-13).
- Entries in one CSV field are separated by a comma and a space, so that a ticket stays
  one line of the file, as "wiersz w nowej linii" asks (confirmed by the requester on
  2026-11-13). An entry text is made by the plugin from digits, a colon, a dash, a middle
  dot, "h", "m", and spaces; it never holds a comma, so the separator cannot be mistaken.
- A Jira title is one line. A tab or a line break in it would come from an import only;
  it is turned into a space so that the rule "one ticket, one line" always holds.
- The widths and heights of the XLSX file are sized for its own font (Calibri 11 pt) at
  100% zoom. A program that replaces the font, or a user who zooms, may see a title wrap
  on one line more or less; the heights are set on the tall side for that reason.
- The file holds only what is on screen, which Jira's own permissions already let the
  signed-in user see, also for another person (002). The export adds no access. Once
  saved, the file is the user's own; the plugin keeps no copy and cannot take it back.
- The CSV file is written so that the spreadsheet programs common in Poland open it
  directly: a semicolon as separator, Windows line breaks, UTF-8 with its mark.
- In the XLSX file the sums are numbers shown as on screen ("6h 55m"), so the user can add
  up chosen rows (decided by the requester on 2026-11-13). The entries stay text, and the
  CSV file is text throughout: it gets no column of minutes.
- The XLSX file uses the colours of the light appearance in every case: a spreadsheet is a
  white page, also when printed. The header background is the plugin's accent blue with
  white text, because the header background of the light panel is nearly white and would
  not be seen as a background on a sheet. The border is a mid grey that is visible on
  white, also in print.
- The header texts in the files are written as "Zgłoszenie", "Tytuł", "Czas wpisów",
  "Suma"; the panel shows them in capitals only as a matter of style.
- The file name carries the name without Polish diacritical marks and with underscores, so
  it works in every file system, mail program, and archive (confirmed by the requester on
  2026-11-13). Inside the XLSX file the name
  keeps its Polish letters. Dates in the file name use `dd-mm-yyyy`, the format of the
  panel.
- For the signed-in user the name is the one Jira gives with the sign-in check (002); for
  another person it is that person's name. `{imie}_{nazwisko}` is therefore the whole full
  name, also when it has more than two words.
- The surname is taken to be the last word of the full name, which is how names are
  written in the requester's Jira ("Jan Kowalski"). It is used only when the full name is
  too long for a file name (decided by the requester on 2026-11-13); a site that writes
  the surname first would get the first name there.
- "Odśwież" is switched off while a load runs, as before, but no longer loses the keyboard
  focus: without that it could not take the focus from the export control at the very
  moment a load starts (decided by the requester on 2026-11-13: "Cofnij", otherwise
  "Odśwież"). A user who starts a refresh from the keyboard keeps the focus too.
- An apostrophe before a CSV field that starts with `=`, `+`, `-`, or `@` changes that
  text slightly; this is the usual protection and is accepted, because ticket titles are
  written by other people.
- The export needs no new setting; nothing about it is stored in the browser.
- Printing settings of the sheet (page size, repeated header), a frozen header row,
  filters, a chart, and several sheets are out of scope.
- Other formats (PDF, JSON, copying to the clipboard) are out of scope.
- An export of data that is not on screen (another period, several people) is out of scope.

**Dependencies**

- The table, the total row, the sort order, and the title of 001: FR-002 to FR-014, FR-018,
  FR-019, FR-035, FR-043, FR-060, FR-062, FR-063, FR-068, FR-080.
- The selected person and their name of 002: FR-001, FR-003, FR-007, FR-010, FR-047.
- The header buttons "Cofnij" (001 FR-082) and "Odśwież" of 001, which take the focus by
  FR-030; the disabled look of "Cofnij" and "Ponów" (FR-003); the pointer look of 001
  FR-065; the memory views of 001 FR-081,
  FR-083, FR-085.
- The browser lets a page save a file under a given name. Where it does not (downloads
  blocked by the browser or by a company policy), no file appears; the plugin shows the
  message of FR-009 only when it can tell, and otherwise the browser's own notice is all
  the user sees.
- The project constitution (`.specify/memory/constitution.md`, version 3.1.0) applies. It
  was amended for this feature on 2026-11-13: the code that only the export uses is outside
  the size budget of 100 KB and is measured apart (Principle I). Two of its rules still
  shape this feature and are to be answered in the plan: a runtime dependency needs a
  written justification (Principle II), and the extension asks for the smallest set of
  browser permissions (Technical Constraints). The files are made in the browser; nothing
  is sent to a server.
