# Feature Specification: Worktime of Another User

**Feature Branch**: `002-other-user-worktime`

**Created**: 2026-11-13

**Status**: Draft

**Input**: User description: "na nowej galezi dodamy funkcjonalnosc w sesttingsach defaultowo uzytkownik dla ktorego pobieramy dane to obecnie zalogowany user, chce dodac mozliwosc ustawienia innego uzytkownika z danej jiry poprzez wpisanie jego imienia i nazwiska. Mysle ze moglibysmy dodac ponizej trybu ciemnego, divider, potem jakis radio button, ktory bedzie ustawial "Obecny użytkownik" albo "Inny użytkownik" i jak Inny, to wtedy się pojawi input w którym będzie można wpisać imie i nazwisko. Dobrze by było, gdyby po Zapisz poszło najpierw sprawdzenie, czy w ogole taki uzytkownik jest w jira, jezeli go nie ma, to jakis alert powinien wyskoczyc, ze nie znaleziono uzytkownika i nie mozna zapisac ustawien, wtedy nastepuje powrot do okna ustawien (z zapisanymi wczesniej wpisanymi wartosciami, zeby to sie nie resetowalo). Defaultowo zawsze powinnismy po wlaczeniu pobierac Obecnego uzytkownika. Dobrze by bylo tez w tytule pluginu dodac teraz nazwe uzytkownika dla ktorego pobieramy dane, czyli nad np. Piątek 13-11-2026 0h 00m damy jakimś wyrazistm kolorem nazwe użytkownika - imie i nazwisko"

This feature extends the worktime panel of [001-worktime-panel](../001-worktime-panel/spec.md).
Requirement numbers here are local to this spec; requirements of 001 are cited as "001 FR-…".
It replaces 001 FR-001 and the 001 assumption "Only the current user's time is shown; viewing
other people's time and team reports are out of scope".

## Clarifications

### Session 2026-11-13

- Q: Jak ma wyglądać alert „nie znaleziono użytkownika" po kliknięciu „Zapisz"? → A: Własne okienko pluginu nad ustawieniami z tekstem i przyciskiem „OK"; po „OK" lub Escape użytkownik wraca do ustawień z wpisanymi wartościami.
- Q: Czy launcher ma pokazywać nazwisko, gdy oglądasz czas innej osoby? → A: Tylko dla innej osoby: launcher pokazuje jej imię i nazwisko przed sumą (np. „Anna Nowak · Dziś: 6h 00m"), w kolorze nazwy nad tytułem; dla zalogowanego użytkownika launcher zostaje bez zmian.
- Q: Czy po powrocie do „Obecny użytkownik" plugin ma pamiętać ostatnio wpisane nazwisko? → A: Tak, jedną ostatnią osobę: po wybraniu „Inny użytkownik" pole jest już wypełnione ostatnio zapisanym nazwiskiem (zapamiętanym w przeglądarce); start nadal zawsze na „Obecny użytkownik".
- Q: Czy konto dezaktywowane w Jirze ma być znajdowane, a jego czas pokazywany? → A: Nie. Wyszukiwane są tylko aktywne konta; konto dezaktywowane daje alert „nie znaleziono użytkownika" (zmienione 2026-11-13 po planie: wyszukiwarka użytkowników Jiry zwraca tylko aktywne konta).
- Q: Czy lista pasujących osób ma pokazywać zdjęcia? → A: Nie. Lista pokazuje imię i nazwisko oraz adres e-mail, gdy Jira go udostępnia (ustalone 2026-11-13 po planie: adresy zdjęć prowadzą poza otwartą Jirę, a wtyczka łączy się tylko z nią).
- Q: Czy po nieudanym sprawdzeniu nazwiska nie zapisuje się nic z tej wizyty w ustawieniach, także zmieniony interwał i motyw? → A: Tak, nic się nie zapisuje (potwierdzone założenie; FR-021).
- Q: Co widać w tabeli po zmianie osoby, zanim przyjdą dane nowej osoby? → A: Dane poprzedniej osoby muszą zostać wyczyszczone od razu; pod nowym nazwiskiem nigdy nie stoją cudze wiersze (ustalone 2026-11-13 po checkliście `checklists/ux.md`; FR-003, FR-004, FR-040, FR-041).
- Q: Co pokazało sprawdzenie na prawdziwej Jirze (T010, 2026-11-13)? → A: Jira znajduje osobę po samym nazwisku i po pełnym imieniu i nazwisku, także wpisanym bez polskich znaków; zapytanie o czas osoby wskazanej przez jej identyfikator działa; adres e-mail sprawdzonej osoby jest ukryty (Jira zwraca pusty tekst). Wniosek: dopasowanie nazw pomija polskie znaki diakrytyczne tak jak Jira (FR-017), a wpis listy bez widocznego adresu pokazuje samo imię i nazwisko (FR-030).
- Q: Co się okazało przy implementacji (2026-11-13)? → A: W najniższym panelu (440 px) lista osób nie mieściła się pod pozostałymi wierszami ustawień. Ustalenie: gdy lista jest widoczna, wiersz interwału, wiersz trybu ciemnego i dwie opcje chowają się, zachowując wartości, i wracają po zamknięciu listy; okno ustawień nigdy nie jest wyższe niż miejsce pod nagłówkiem panelu, a przyciski „Anuluj" i „Zapisz" zostają widoczne (FR-030, FR-044).
- Q: Jaki kolor ma mieć imię i nazwisko nad tytułem? → A: `#ff6c00` (pomarańczowy; trzecia wersja z 2026-11-13, po fiolecie i `#f51be3`). W trybie ciemnym dokładnie ten kolor (kontrast 6,1:1); w trybie jasnym jego ciemniejszy odcień `#b84e00` (5,1:1), bo sam `#ff6c00` ma na białym tle tylko 2,8:1, a konstytucja wymaga 4,5:1. Kolor jest bliski pomarańczowemu z paska postępu (suma czasu między 8 a 16 godzin), co jest świadomym wyborem (FR-007).
- Q: Jak ma być złożony tekst alertu? → A: W dwóch liniach: „Nie znaleziono użytkownika." w pierwszej, „Nie można zapisać ustawień." w drugiej (2026-11-13; FR-020, FR-029).
- Q: Czy specyfikacja ma zawierać wszystko, co jest w `contracts/ui.md` i `data-model.md`? → A: Tak. Specyfikacja jest pełnym źródłem: kolejność elementów ustawień, teksty, kolory, reguły dopasowania nazw, stany i przejścia są zapisane tutaj; oba dokumenty tylko je powtarzają w formie dla wykonawcy (ustalone 2026-11-13).

## Terms

- **Full name**: the name a person carries in Jira, written exactly as Jira has it. "Name",
  "first and last name", and the Polish label "Imię i nazwisko" all mean the full name.
- **Selected person**: the person whose logged time the plugin shows.
- **Signed-in user**: the person signed in to Jira in this browser.
- **Another person**: a selected person who is not the signed-in user.
- **Remembered person**: the one other person saved last, kept in the browser.
- **Pick**: a person attached to the text of the name field, so that "Zapisz" knows exactly
  who is meant (FR-046).
- **Name check**: the look-up of a person in Jira that "Zapisz" makes for "Inny użytkownik".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See whose time is shown (Priority: P1)

The panel names the person whose logged time it shows. Above the title line (for example
"Piątek 13-11-2026 0h 00m") stands that person's full name in a distinct colour. Until the
user chooses someone else, it is the name of the person signed in to Jira.

**Why this priority**: Once the panel can show another person's time, the name is the only
thing that keeps the user from taking someone else's hours for their own. It is useful by
itself and it is the base the other stories build on.

**Independent Test**: Open the panel while signed in to Jira as "Jan Kowalski" and confirm
"Jan Kowalski" stands above the title line in a colour different from the title.

**Acceptance Scenarios**:

1. **Given** the user is signed in as "Jan Kowalski" and has never changed the settings,
   **When** they open the panel, **Then** "Jan Kowalski" is shown above the title line, in
   the name colour of FR-007, and the title line below it is unchanged.
2. **Given** the panel shows a period of any kind (a day, a week, a custom range), **When**
   the user looks at the header, **Then** the name stands above the title in every case.
3. **Given** a person with a very long name, **When** the panel is at its narrowest width,
   **Then** the name is on one line, cut with an ellipsis, with the full name as its tip,
   and the header buttons are where they were.
4. **Given** either appearance (dark or light), **When** the name is shown, **Then** its
   contrast against the panel is at least 4.5:1 and its colour differs from the title text.

---

### User Story 2 - Show the logged time of another person (Priority: P1)

The user opens the settings. Below the "Tryb ciemny" switch there is a dividing line and a
choice of two options: "Obecny użytkownik" and "Inny użytkownik". Choosing "Inny użytkownik"
reveals a field for a full name. The user types a colleague's name and presses "Zapisz". The
plugin checks that this person exists in the Jira site; when they do, the settings close and
the panel shows that person's logged time, with their name above the title.

**Why this priority**: This is the feature that was asked for: checking a colleague's logged
time without leaving the panel.

**Independent Test**: With time logged in Jira by a second person, choose "Inny użytkownik",
type that person's name, save, and confirm that the name, the table, and the totals are
that person's and match what they logged.

**Acceptance Scenarios**:

1. **Given** the settings are open, **When** the user looks below "Tryb ciemny", **Then**
   they see a dividing line and the two options, with "Obecny użytkownik" selected and no
   name field.
2. **Given** the settings are open, **When** the user selects "Inny użytkownik", **Then** a
   field labelled "Imię i nazwisko" appears and takes the focus; **When** they select
   "Obecny użytkownik" again, **Then** the field disappears.
3. **Given** "Inny użytkownik" is selected and "Anna Nowak" is typed, and Anna Nowak exists
   in this Jira site, **When** the user presses "Zapisz", **Then** the settings close, "Anna
   Nowak" stands above the title, and the table, the chart or progress bar, the totals, and
   the launcher show Anna Nowak's time for the period on screen.
4. **Given** the panel shows Anna Nowak's time, **When** the user changes the period,
   refreshes, or waits for auto-refresh, **Then** the data stays Anna Nowak's.
5. **Given** the name is typed as "anna  nowak " (other letter case, extra spaces), **When**
   the user presses "Zapisz", **Then** Anna Nowak is found, and the name above the title is
   written as Jira has it: "Anna Nowak".
6. **Given** the panel shows Anna Nowak's time, **When** the user opens the settings,
   **Then** "Inny użytkownik" is selected and the field holds "Anna Nowak".
7. **Given** the panel shows Anna Nowak's time, **When** the user selects "Obecny
   użytkownik" and presses "Zapisz", **Then** the panel shows the signed-in user's own time
   and name again.
8. **Given** the user changed the option or the name, **When** they press "Anuluj" or close
   the settings another way, **Then** nothing changes: the panel shows the same person as
   before.
9. **Given** the check is running after "Zapisz", **When** the user looks at the settings,
   **Then** "Zapisz" is disabled and shows the spinner of the refresh button, and the two
   options and the field cannot be changed.
10. **Given** the panel shows Anna Nowak's time for today with 6h 00m logged, **When** the
    user looks at the launcher, **Then** it reads "Anna Nowak · Dziś: 6h 00m" with the name
    in the colour of the name above the title; **When** the panel shows the signed-in
    user's time, **Then** the launcher shows no name, as before this feature.
11. **Given** the table shows the signed-in user's rows, **When** "Zapisz" succeeds for Anna
    Nowak, **Then** at the same moment the name becomes "Anna Nowak", the rows of the
    signed-in user are gone, the total reads "…", and only the loading state is in the
    table area until Anna Nowak's data has arrived.
12. **Given** the panel shows Anna Nowak's time, **When** the user opens the settings, types
    "Piotr Nowakowski" in place of her name, and presses "Zapisz", **Then** the panel
    changes from Anna Nowak to Piotr Nowakowski in the same way: her rows are cleared first.
13. **Given** the user went through several periods, **When** the selected person changes,
    **Then** "Cofnij" and "Ponów" are disabled, and the period, the sort order, and the
    size of the panel are as before.
14. **Given** the panel shows Anna Nowak's time and is minimised, **When** the auto-refresh
    interval passes, **Then** the launcher still shows her name and her refreshed total.
15. **Given** another person with a name of 40 characters is shown, **When** the user looks
    at the launcher, **Then** the name is cut with an ellipsis, the label and the total are
    whole, everything is on one line, and the launcher is wholly inside the window.
16. **Given** a user without a pointer, **When** they use the keyboard alone, **Then** they
    can open the settings, select "Inny użytkownik", type a name, press Enter to save, and
    reach every new control, each with a visible focus.
17. **Given** a colleague named "Józef Śliwiński" exists, **When** the user types "jozef
    sliwinski", without Polish letters, and presses "Zapisz", **Then** that person is
    found, and the name above the title is written as Jira has it: "Józef Śliwiński".

---

### User Story 3 - A name that is not in Jira (Priority: P2)

The user types a name that no person in the Jira site has and presses "Zapisz". An alert
tells them that the user was not found and that the settings cannot be saved. Nothing is
saved. The user is back in the settings, with everything exactly as they left it, and can
correct the name. A name that fits several people gives a list to pick from instead.

**Why this priority**: Without the check, a typing mistake would give an empty panel that
looks like "this person logged nothing". It protects Story 2 but Story 2 works without it
for correct names.

**Independent Test**: Choose "Inny użytkownik", type a name that does not exist, also change
the refresh interval, press "Zapisz", and confirm the alert, that the panel still shows the
previous person and the previous interval is in effect, and that the settings still hold the
typed name and the changed interval.

**Acceptance Scenarios**:

1. **Given** "Inny użytkownik" is selected and "Jan Nieistniejący" is typed, and no such
   person exists in this Jira site, **When** the user presses "Zapisz", **Then** an alert
   window says "Nie znaleziono użytkownika. Nie można zapisać ustawień." and has one
   button, "OK".
2. **Given** that alert is shown as a small window over the settings, **When** the user
   presses its "OK" button or Escape, **Then** only the alert closes and the settings are
   still open, "Inny użytkownik" is still selected, the field still holds "Jan Nieistniejący"
   and has the focus, and the refresh interval and the appearance switch hold the values
   the user set before pressing "Zapisz".
3. **Given** that alert was shown, **When** the user looks at the panel, **Then** it still
   shows the person it showed before, with that person's rows, and none of the settings
   changed in this visit to the settings has been saved.
4. **Given** that alert was shown, **When** the user corrects the name to an existing person
   and presses "Zapisz", **Then** the settings are saved as in Story 2 and the alert is gone.
5. **Given** "Inny użytkownik" is selected and the field is empty or holds only spaces,
   **When** the user presses "Zapisz", **Then** "Podaj imię i nazwisko." is shown under the
   field, nothing is saved, and no check is sent to Jira.
6. **Given** Jira cannot be reached while the name is checked, **When** the check fails,
   **Then** "Nie udało się sprawdzić użytkownika w Jirze. Ustawienia nie zostały zapisane."
   is shown under the field, no alert window appears, nothing is saved, and the settings
   stay open with their values; **When** the user presses "Zapisz" again, **Then** the
   name is checked again.
7. **Given** two people named "Anna Nowak" exist in this Jira site, **When** the user types
   "Anna Nowak" and presses "Zapisz", **Then** nothing is saved yet and a list of both
   appears under the field, each with their e-mail address where Jira shows it; **When**
   the user picks one and presses "Zapisz", **Then** the settings are saved for that person.
8. **Given** the user types only "Nowak" and three people in Jira have a name with a word
   that begins so, **When** they press "Zapisz", **Then** the list shows those three people
   in alphabetical order; picking one writes that person's full name into the field and
   moves the focus to "Zapisz".
9. **Given** the user picked a person from the list, **When** they change the text of the
   field, **Then** the pick is dropped and the next "Zapisz" checks the name again.
10. **Given** more than 10 people match the typed text, **When** the list is shown, **Then**
    it holds the first 10 in alphabetical order and the line "Pokazano 10 pierwszych osób.
    Wpisz dokładniejsze imię i nazwisko." under them.
11. **Given** "Anna Nowak" and "Anna Nowakowska" both exist, **When** the user types "Anna
    Nowak" and presses "Zapisz", **Then** the list shows both; the first is not taken by
    itself.
12. **Given** the remembered person no longer exists in Jira or was deactivated, **When**
    the user presses "Zapisz" with that name unchanged in the field, **Then** the "not
    found" alert is shown and nothing is saved.
13. **Given** the alert window is shown, **When** the user clicks anywhere else in the
    settings or presses Tab, **Then** nothing in the settings reacts and the focus stays in
    the alert.

---

### User Story 4 - Start on the signed-in user (Priority: P2)

Whenever the plugin starts, it shows the time of the person signed in to Jira. A user who
looked at a colleague's time does not find the colleague's hours in their own panel later by
surprise.

**Why this priority**: It keeps the default safe and predictable. Story 2 delivers its value
without it, but with it nobody mistakes another person's total for their own.

**Independent Test**: Choose another person, save, then start the plugin again and confirm
it shows the signed-in user.

**Acceptance Scenarios**:

1. **Given** a newly loaded Jira page, **When** the plugin starts, **Then**
   it shows the signed-in user's time and name, and the settings show "Obecny użytkownik".
2. **Given** the panel shows another person's time, **When** the user presses the close
   button of the panel and opens the panel again, **Then** it shows the signed-in user's
   time and name, on today, and the settings show "Obecny użytkownik".
3. **Given** the panel shows another person's time, **When** the user minimises the panel
   (minimise button, launcher, or Escape) and opens it again, **Then** it still shows that
   person, and the launcher showed that person's name and total in between.
4. **Given** the panel shows another person's time, **When** the Jira page is reloaded, or
   the tab is closed and Jira is opened again, **Then** the plugin shows the signed-in
   user's time and name, and the settings show "Obecny użytkownik".
5. **Given** two Jira tabs are open and another person is chosen in one, **When** the user
   looks at the other tab, **Then** it still shows the person it showed before.
6. **Given** the plugin returned to the signed-in user, **When** the user looks at the other
   settings (refresh interval, appearance, panel size, launcher place), **Then** they are
   as saved; only the choice of person went back to its default.
7. **Given** the user saved "Anna Nowak" earlier and the plugin has returned to the
   signed-in user, **When** they open the settings and select "Inny użytkownik", **Then**
   the field already holds "Anna Nowak", selected; **When** they press "Zapisz", **Then**
   the panel shows Anna Nowak's time without the name being typed again.
8. **Given** no other person was ever saved in this browser, **When** the user selects
   "Inny użytkownik", **Then** the field is empty.
9. **Given** the panel shows another person's rows, **When** the user presses the close
   button, **Then** the launcher shows no name and, until the signed-in user's total for
   today has loaded, no total of the other person.

---

### Edge Cases

- The typed name is the signed-in user's own name: it is accepted and the panel shows their
  own time; the settings keep "Inny użytkownik" selected; the launcher shows no name; the
  remembered person is not changed (FR-035).
- The other person logged nothing in the period: the normal empty state is shown under their
  name, with totals of 0h 00m.
- The other person logged time on tickets the signed-in user may not see: those entries are
  not shown and not summed, as in 001.
- The signed-in user may not look up other people in this Jira site: the check finds nobody
  and the "not found" alert is shown. One message for both cases is intended: the plugin
  cannot tell them apart.
- The person's account is deactivated in Jira: they are not found and the "not found"
  alert is shown, also when they are the remembered person.
- The selected person is deactivated, or the signed-in user loses the right to see their
  time, while that person is shown: the plugin keeps the person selected and shows what
  Jira returns on the next load, an empty state or the error state. It does not return to
  the signed-in user by itself.
- The person changes their name in Jira while their time is shown: the panel keeps showing
  the same person under the name it has; the name is renewed the next time that person is
  checked (FR-036).
- The remembered person changed their name in Jira: the field shows the stored name;
  "Zapisz" with it unchanged finds them by their identity, shows the new name above the
  title, and stores the new name.
- The name holds Polish letters, a hyphen, or more than two words ("Anna Maria
  Nowak-Kowalska"): it is matched as a whole.
- The name is typed without Polish letters ("Zolc" for "Żółć"), or with them where Jira
  has none: the person is found; the name shown is written as Jira has it.
- Jira sends an empty e-mail address for a person who hides it: the entry of the list
  shows the name alone, as for a person with no address at all.
- The typed text holds quotation marks, a percent sign, or other symbols: they are taken as
  written and have no special meaning; a text nobody's name contains gives the "not found"
  alert.
- The user presses "Anuluj", presses Escape, or clicks outside the settings while the check
  runs: the settings close, nothing is saved, and the result of the check is ignored.
- The check has no answer after 15 seconds: it counts as a check that could not be made
  (FR-023, FR-045).
- The browser cannot store the settings after a successful check: the person still changes
  on this page; the settings stay open with the notice of 001 that they could not be saved;
  nothing is remembered (FR-024).
- Loading the other person's data fails after a successful save: the normal error state with
  retry is shown under their name, with no rows of the previous person.
- Two Jira tabs save different people: the remembered person is the one saved last; a tab
  already open keeps the one it read when its page loaded, until it saves one itself.
- The stored remembered person cannot be read or is damaged: nothing is remembered; the
  other settings keep their values.
- The session in Jira ends while another person is shown: the plugin behaves as in 001 for
  a signed-out user.
- The other person works in another time zone: days are cut by the signed-in user's time
  zone, as everything else in the panel.
- The panel is closed or minimised while the alert window or the list is shown: the alert,
  the list, and the settings close without saving.

## Requirements *(mandatory)*

Requirement numbers are identifiers, not an order: FR-030 and higher were added by the
clarifications and stand in the group they belong to.

A few rules are stated in more than one requirement on purpose, each time from the side of
the part they concern; they say the same thing. Where a reader finds a difference, the
leading statement wins: FR-003 for what is cleared at a change of person (also behind
FR-004, FR-040, FR-041), FR-049 for when the choice changes (also behind FR-027, FR-028,
FR-032), and FR-013 for what the name field holds on opening (also behind FR-036).

### Functional Requirements

**Whose time is shown**

- **FR-001**: The plugin MUST show the time entries of exactly one person at a time: the
  selected person. By default the selected person is the user signed in to Jira. (Replaces
  001 FR-001.)
- **FR-002**: Everything the panel and the launcher show MUST belong to the selected person:
  the table, the row sums, the totals, the progress bar, the bar chart, the tips, and the
  launcher's total. Wherever 001 says "the current user's entries", the selected person's
  entries are meant. A time entry belongs to the selected person when Jira names that
  person, by their identity, as its author.
- **FR-003**: Changing the selected person MUST keep the period on screen and load it for
  the new person. At the moment of the change, before any data of the new person has
  arrived, everything that belongs to the previous person MUST be removed from the screen:
  the rows of the table, the row sums, the fill of the progress bar or the bars of the
  chart; the totals in the title and below the table show "…". The table area then shows
  only the loading state. This is different from a change of period in 001 (001 FR-060),
  where the rows loaded before stay under the spinner: that rule does not apply to a change
  of person. It holds for every change: from the signed-in user to another person, from one
  other person to a second, back to the signed-in user with "Zapisz", and back with the
  close button.
- **FR-004**: After the selected person changes, data loaded for the previous person MUST
  NOT be shown under the new person's name at any moment: views remembered for "Cofnij" and
  "Ponów" and data kept for the bars and period buttons (001 FR-081 to FR-085) are
  forgotten. "Cofnij" and "Ponów" MUST be disabled until the user takes a new step.
- **FR-005**: The plugin stays read-only: it MUST NOT create, change, or delete anything in
  Jira for either person.
- **FR-037**: A change of person MUST keep the period, the sort order of the table, the
  zoom of the chart, the size of the panel, and the place of the launcher.
- **FR-038**: Every later load MUST be for the selected person: a change of period, the
  arrows, the fields, a bar of the chart, "Odśwież", auto-refresh while the panel is open,
  and the launcher's refresh while the panel is minimised (001 FR-040).
- **FR-039**: When the load for the new person fails, the error state with the retry action
  MUST be shown under the new person's name, without rows of the previous person.

**Name in the header**

- **FR-006**: The header MUST show the full name of the selected person on a line of its
  own directly above the title line, for the signed-in user and for another person alike.
  The line is not part of the title; its text is smaller than the title (13 px) and of
  medium weight.
- **FR-007**: The name MUST be in one colour for every person: an orange, `#ff6c00` in the
  dark appearance and its darker shade `#b84e00` in the light one (`#ff6c00` itself reaches
  only 2.8:1 on the white of the light appearance). It MUST differ from the title text, the
  muted text, and the link colour, and its contrast against the panel's background MUST be
  at least 4.5:1 in both appearances. It is close to the red-to-yellow colours a total takes
  below 4 hours (001 Amendment 15; before, to the orange of 8 to 16 hours); the name is told
  from a total by its place (a line of its own above the title), its smaller size, and its
  text.
- **FR-008**: The name MUST be written as Jira has it, not as the user typed it.
- **FR-009**: A name too long for the header MUST be shown on one line and cut with an
  ellipsis; the full name MUST be available as a tip. The header buttons MUST keep their
  place and size. In a window too narrow for the title beside the buttons, the name line and
  the title stand together on the line above the buttons that the title already has in 001.
- **FR-010**: The name line MUST always keep its place, also when it is empty, so the header
  does not jump. It is empty only when Jira gives no name for the signed-in user.
- **FR-040**: The name in the header MUST change at the same moment as the table is emptied
  for the new person (FR-003), never before and never after.

**Name on the launcher**

- **FR-033**: While the selected person is not the signed-in user, the launcher MUST show
  that person's full name before its label and total (for example "Anna Nowak · Dziś:
  6h 00m"), in the colour of the name in the header (FR-007), then a middle dot with a
  space on each side in the muted colour. The label, the total, and the dot keep the rules
  of 001 (001 FR-040, FR-068). While the selected person is the signed-in user, the launcher
  MUST look exactly as in 001, without a name. A person chosen by typing the signed-in
  user's own name counts as the signed-in user here. The launcher's accessible name is its
  visible text.
- **FR-034**: The name on the launcher MUST be limited to the width of 24 characters and cut
  with an ellipsis beyond it, with the full name as the launcher's tip; the label and the
  total MUST always stay whole. The launcher MUST stay on one line at every supported width
  and wholly inside the window and clear of the panel (001 FR-072, FR-075); its place is
  corrected again whenever the name appears or disappears.
- **FR-041**: From a change of person until that person's total has loaded, and after a
  failed load, the launcher MUST show "–" in place of the total, as 001 does before the
  first load, with the new person's name (or no name for the signed-in user). It MUST NOT
  show the previous person's total at any moment.

**Settings**

- **FR-011**: The settings MUST show, below the "Tryb ciemny" row, a dividing line and then
  a choice of exactly one of two options labelled "Obecny użytkownik" and "Inny użytkownik".
  The parts of the settings stand in this order, top to bottom: the title "Ustawienia"; a
  dividing line; the interval row and its message; the "Tryb ciemny" row; a dividing line;
  the two options; the name row; the message of the name field; the list of people; the
  notice that the settings could not be saved (001); the buttons "Anuluj" and "Zapisz".
  The name row, its message, and the list are present only when they have something to show.
- **FR-012**: A single-line field for the full name, labelled "Imię i nazwisko", MUST be
  visible only while "Inny użytkownik" is selected. Selecting "Inny użytkownik" MUST move
  the focus into it and select its text. Selecting "Obecny użytkownik" hides the field, its
  message, and the list; the text is kept until the settings are closed. The field takes at
  most 255 characters of any kind, and the browser's own suggestions and spelling marks are
  off in it.
- **FR-013**: On opening, the settings MUST show the option in effect. The field is filled
  once, on opening: with the name of the person in effect when that is another person;
  otherwise with the remembered person's name; otherwise it is empty. Switching between the
  two options afterwards does not change the text.
- **FR-014**: The choice and the name MUST take effect only through "Zapisz". "Anuluj",
  Escape, and closing the settings another way MUST discard them, like the other settings.
- **FR-015**: Every new control (the two options, the field, the entries of the list, the
  "OK" of the alert) MUST be operable by keyboard and by touch, MUST show a visible focus,
  and MUST be at least 44 x 44 px on touch devices and narrow screens. The arrow keys move
  between the two options. Nothing new depends on hover.
- **FR-042**: Enter in the name field MUST do what "Zapisz" does.
- **FR-043**: The new parts MUST be named for assistive technology: the two options are one
  group named "Użytkownik"; the field is named by its label; the messages under the field
  are announced when they appear; "Zapisz" is announced as busy, with "Sprawdzanie…", while
  a check runs; the list is a group named by its heading line; the alert is announced with
  its text.
- **FR-044**: At every supported width (320 px to 1920 px) the settings MUST stay inside the
  window without horizontal scrolling of the page. The settings are never taller than the room the panel has under its header. The list is at
  most 220 px high (about five entries) and gets lower, down to one entry, when the panel has
  less room; a longer list scrolls
  inside them while "Anuluj" and "Zapisz" stay visible; a text longer than the field
  scrolls inside the field; the text of the alert wraps.

**Checking the name on "Zapisz"**

- **FR-016**: When "Zapisz" is pressed with "Inny użytkownik" selected, the plugin MUST
  first check in the Jira site the user is on whether the person exists, and MUST save
  nothing before the check has succeeded. A check MUST send at most one request to Jira.
  Nothing is sent to Jira while the user types.
- **FR-017**: The typed text and the full names are compared after both are made alike:
  spaces at the ends removed, every run of spaces made one space, letter case ignored, and Polish diacritical marks
  ignored (ą = a, ć = c, ę = e, ł = l, ń = n, ó = o, ś = s, ź = ż = z), as Jira's own search
  ignores them. The
  people considered are those with an active account whom Jira's own search of people
  returns for the text; app accounts, automation accounts, and customer accounts are left
  out. A person matches when their full name contains the text. A person MUST be found by
  their whole full name, by the beginning of it, and by the beginning of any word of it (a
  surname alone). A text from the middle of a word is not
  required to find anybody. The text is taken as written: no character in it has a special
  meaning.
- **FR-018**: When "Inny użytkownik" is selected and the field holds no character other
  than spaces, "Zapisz" MUST show "Podaj imię i nazwisko." under the field, move the focus
  into the field, save nothing, and send no check. One character is enough for a check.
- **FR-019**: While the check runs, "Zapisz" MUST be disabled and show the spinner of the
  refresh button, and the two options and the field MUST NOT be changeable. "Anuluj",
  Escape, and a click outside the settings close the settings and discard the result.
- **FR-045**: A check without an answer after 15 seconds MUST count as a check that could
  not be made (FR-023).
- **FR-026**: A check by name has one of four results:

  | Result | When | What follows |
  |--------|------|--------------|
  | found | exactly one person matches and their full name equals the typed text | FR-024 |
  | several | at least one person matches, in every other case: several people, or one person matched only by a part of their name | the list (FR-030); nothing is saved |
  | not found | nobody matches | the alert (FR-020); nothing is saved |
  | could not be checked | Jira gave no usable answer | the message of FR-023; nothing is saved |

  A full name typed exactly still gives the list when another person's longer name contains
  it ("Anna Nowak" and "Anna Nowakowska"): the second person is never hidden without a word.
- **FR-030**: The list stands under the name field, after the line "Znaleziono kilka osób.
  Wybierz jedną:". Each entry is one button with the person's full name and, under it,
  their e-mail address where Jira lets the signed-in user see it; without a visible address
  the entry shows the name alone. No pictures are shown. The entries are in alphabetical
  order of the full name by Polish rules, people of the same name in an order that is the
  same every time. The list MUST show at most 10 people, the first 10 in that order; when
  more match, the line "Pokazano 10 pierwszych osób. Wpisz dokładniejsze imię i nazwisko."
  stands under them. When the list appears, the focus MUST move to its first entry. While the list is shown,
  the interval row, the "Tryb ciemny" row, the dividing line before the two options, and
  the two options step aside, so that the list has room also in the lowest panel; only the
  title, the name field, the list, and the two buttons are shown. What stepped aside keeps
  its values and comes back as soon as the list is closed (a pick, an edited name, or the
  settings closed).
- **FR-031**: Picking a person (a click, a tap, Enter, or Space on an entry) MUST write
  their full name into the field, close the list, and move the focus to "Zapisz"; the next
  "Zapisz" saves the settings for exactly that person without asking again. Changing the
  text of the field MUST close the list and the message under the field, and MUST drop the
  pick as soon as the text, made alike as in FR-017, no longer equals the picked person's
  name. While the list is open the other values of the settings stay as entered.
- **FR-046**: What "Zapisz" checks depends on the pick:

  | The field holds | Check |
  |-----------------|-------|
  | a person picked from the list in this visit | none (FR-031) |
  | the person in effect, unchanged | none; the person does not change and nothing is loaded again |
  | the remembered person, filled in on opening and unchanged | that person by their identity (FR-036) |
  | any other text | by name (FR-017, FR-026) |

- **FR-020**: When no person is found, the plugin MUST show an alert with the text "Nie
  znaleziono użytkownika. Nie można zapisać ustawień." and one button, "OK". The text
  stands on two lines: "Nie znaleziono użytkownika." on the first and "Nie można zapisać
  ustawień." on the second. The alert MUST
  be a small window of the plugin's own, centred over the settings, at most 280 px wide and never wider than the settings, on a dimmed layer that
  covers the settings and nothing else. It MUST NOT be a dialog of the browser, and the Jira
  page MUST stay usable. While it is shown, the settings under it MUST NOT react to the
  pointer or the keyboard and are hidden from screen readers; the focus MUST be on "OK" and
  stay in the alert; the alert MUST be announced to screen readers. "OK", Enter, and Escape
  MUST close the alert only, not the settings. A click elsewhere does not close it.
- **FR-021**: After a failed check, none of the settings changed in this visit MUST be saved
  or take effect (person, refresh interval, appearance); the panel keeps showing the person
  it showed before, with that person's data. The appearance preview of 001 (001 FR-046)
  stays as the user set it while the settings remain open; it is not saved, and "Anuluj"
  restores the appearance as before.
- **FR-022**: After a failed check, once the alert is closed, the settings MUST be open with
  every value exactly as the user left it: the selected option, the typed name, the refresh
  interval, and the appearance switch. The focus MUST return to the name field, with its
  text selected.
- **FR-023**: When the check could not be made (Jira unreachable, session ended, no answer
  in time), the plugin MUST show "Nie udało się sprawdzić użytkownika w Jirze. Ustawienia
  nie zostały zapisane." under the name field, without an alert window, and MUST treat the
  settings as in FR-021 and FR-022. The message stays until the field is edited, the other
  option is selected, or "Zapisz" is pressed again; pressing "Zapisz" again repeats the
  check.
- **FR-024**: When the check succeeds, all settings of this visit MUST be saved together,
  the settings MUST close, and the selected person MUST change (FR-003). When the browser
  cannot store the settings, the person and the other new values still take effect on this
  page, the settings stay open with the notice of 001 ("Nie udało się zapisać ustawień w
  tej przeglądarce."), and nothing is remembered.
- **FR-025**: When "Zapisz" is pressed with "Obecny użytkownik" selected, no check is made
  and the settings are saved as in 001. If another person was shown, the selected person
  changes to the signed-in user (FR-003).
- **FR-047**: Escape closes one thing at a time, innermost first: the alert window when it
  is shown; otherwise the settings, without saving (001); otherwise it minimises the panel
  (001 FR-064). Closing or minimising the panel while the alert or the list is shown closes
  them and the settings without saving.

**Default and the life of the choice**

- **FR-027**: On every newly loaded Jira page the selected person MUST be the signed-in
  user, with no step required from the user.
- **FR-028**: The choice of another person MUST last only while the Jira page stays loaded
  and the panel is not closed with its close button. The close button MUST return the
  plugin to the signed-in user, together with the return to today (001 FR-049); the launcher
  then shows the signed-in user's total for today (FR-041 until it has loaded). Minimising
  (minimise button, launcher, Escape) MUST keep the chosen person, as it keeps the period
  (001 FR-064, FR-086). Since 004 the choice ends with the reset button "Resetuj" as well,
  in the same way and with the panel open (004 FR-010, FR-012).
- **FR-032**: The choice of another person MUST NOT be remembered between page loads: after
  a reload of the page, a closed tab, or a new start of the browser, the plugin starts on
  the signed-in user. It is not shared between tabs. The other settings (refresh interval,
  appearance, panel size, launcher place) MUST stay as saved; "Zapisz" keeps storing them
  as in 001.
- **FR-049**: The choice changes only as this table says:

  | From | Event | To | What happens |
  |------|-------|----|--------------|
  | (start) | a Jira page loads | signed-in user | their name in the header; the launcher loads their total for today |
  | signed-in user | "Zapisz" with "Inny użytkownik", person P found | P | P is remembered; FR-003, FR-004 |
  | P | "Zapisz" with another name, person Q found | Q | Q is remembered; FR-003, FR-004 |
  | P | "Zapisz" with P unchanged | P | no check, no new load; the other settings are saved |
  | P | "Zapisz" with "Obecny użytkownik" | signed-in user | FR-003, FR-004; P stays remembered |
  | P | minimise (button, launcher, Escape) | P | nothing is forgotten |
  | P | close button | signed-in user | with the return to today; FR-003, FR-041 |
  | P | "Resetuj" (004) | signed-in user | with the return to today; the panel stays open; 004 FR-010, FR-012 |
  | any | "Anuluj", Escape in the settings, the list, the alert, a check that could not be made | unchanged | nothing is saved |
  | any | page reload, new tab, browser start | signed-in user | the choice is not stored |

- **FR-035**: The plugin MUST remember the last other person: every "Zapisz" that succeeds
  with "Inny użytkownik" for a person other than the signed-in user stores that one person
  (their full name as Jira has it and their identity) in the browser, with the other user
  settings, replacing the one stored before. "Zapisz" with "Obecny użytkownik", and a check
  that finds the signed-in user themself, leave the remembered person as it was. It is kept
  across page loads, tabs, and browser starts, and is not changed by resizing the panel or
  moving the launcher. It MUST NOT change which person the plugin starts on (FR-027). A
  stored value that cannot be read, or that lacks the identity or the name, counts as
  nothing remembered. The plugin offers no control to forget the remembered person: it is
  replaced by saving another one, or removed with the site's data in the browser.
- **FR-036**: When the plugin is showing the signed-in user, the name field holds the
  remembered person's name from the opening of the settings (FR-013); with nothing
  remembered it is empty. The remembered person counts as picked: "Zapisz" with the name
  unchanged takes exactly that person, without the list, after checking by their identity
  that they still exist in Jira with an active account. The name Jira returns then replaces
  the stored one (FR-008). A person who no longer exists or was deactivated gives the "not
  found" alert (FR-020). A changed name is checked as any typed name.

**Presentation**

- **FR-029**: All new texts MUST be in Polish, exactly these:

  | Element | Text |
  |---------|------|
  | Group of the two options (name for assistive technology) | `Użytkownik` |
  | Option 1 | `Obecny użytkownik` |
  | Option 2 | `Inny użytkownik` |
  | Label of the name field | `Imię i nazwisko` |
  | Empty name (FR-018) | `Podaj imię i nazwisko.` |
  | Alert, nobody found (FR-020); `\n` is the line break between its two lines | `Nie znaleziono użytkownika.\nNie można zapisać ustawień.` |
  | Button of the alert | `OK` |
  | Check could not be made (FR-023) | `Nie udało się sprawdzić użytkownika w Jirze. Ustawienia nie zostały zapisane.` |
  | "Zapisz" while checking (text for assistive technology) | `Sprawdzanie…` |
  | Line above the list (FR-030) | `Znaleziono kilka osób. Wybierz jedną:` |
  | More than 10 matches (FR-030) | `Pokazano 10 pierwszych osób. Wpisz dokładniejsze imię i nazwisko.` |

- **FR-048**: The feature adds two colours, defined for both appearances like every other
  colour of the plugin (001 FR-043): the name colour of FR-007, and the dimmed layer under
  the alert (black at 55% in the dark appearance, the dark text colour at 35% in the light
  one). The messages under the name field use the existing colour of error messages. The three
  sizes this feature adds (the width of 24 characters for the name on the launcher, 280 px
  for the alert, 220 px for the list) are defined once, like the other sizes of the
  plugin, and are not repeated in single parts.

### Key Entities

- **Person**: someone of the Jira site whose logged time can be shown. Has an identity
  given by Jira and a full name. Two people are the same when their identity is the same;
  a name is not an identity, because two people can share it.
- **Person in the list**: a person offered for picking. Has, beyond identity and full name,
  an e-mail address when Jira shows it. Exists only while the list is open.
- **Selected person (wybrany użytkownik)**: the person whose logged time the plugin shows.
  Either the signed-in user or another person of the same Jira site.
- **Signed-in user (obecny użytkownik)**: the person signed in to Jira in this browser. The
  default selected person. Their own permissions decide what the plugin can see. Their name
  comes from Jira with the sign-in check the plugin already makes.
- **Person choice**: one of "Obecny użytkownik" or "Inny użytkownik" and the person in
  effect. Set in the settings, but unlike the user settings of 001 it is not stored: it
  lives as long as the selected period does (FR-049). The choice can be "Inny użytkownik"
  with the signed-in user as the person, when the user typed their own name.
- **Remembered person**: the one other person saved last (identity and full name), kept in
  the browser with the user settings of 001. It only fills the name field in advance; it
  never decides whose time the plugin shows on start.
- **Name check**: the look-up of a person in the Jira site, by name or by identity, with
  one of the results of FR-026: found, several, not found, could not be checked.
- **Loaded data**: every load of a period, every remembered view, and every total belongs
  to exactly one person, the one selected when it was loaded.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user switches the panel to a colleague's logged time in at most 4 actions
  when the name is unique (gear, "Inny użytkownik", type the name, "Zapisz") and at most 6
  when a person has to be picked from the list (the same, then the pick and "Zapisz"), and
  sees the colleague's data within 5 seconds of the last "Zapisz". The time holds for a
  single day with up to 8 tickets, on a connection where a request to Jira is answered
  within 1 second.
- **SC-002**: The name above the title is always the name of the person whose entries are
  in the table. This is checked at these moments, in 100% of cases: right after a "Zapisz"
  that changed the person, while the new person's data loads, after it has loaded, after a
  failed load, after the close button, after minimising and opening, and after an
  auto-refresh. At none of them is a row or a total of another person on screen.
- **SC-003**: For any period, every row sum and the total shown for another person match the
  time that person logged in Jira on tickets the signed-in user can see, to the minute.
- **SC-004**: A name that does not exist in Jira is rejected in 100% of cases: the alert is
  shown within 3 seconds on a connection where a request to Jira is answered within
  1 second, no setting is saved, and every value the user entered is still in the settings.
- **SC-005**: On 100% of newly loaded Jira pages, and after every use of the close button,
  the plugin shows the signed-in user's own time, exactly as before this feature, with
  their own name above the title.
- **SC-006**: Whose time is on screen can be read at a glance: the name is the first line
  of the header, visible without scrolling, hovering, or opening anything, in the name
  colour at a contrast of at least 4.5:1 in both appearances; and with the panel hidden,
  the launcher carries the name whenever it is not the user's own.
- **SC-007**: The settings with the new choice, the name field, a list of 10 people, and
  the alert are fully usable at window widths from 320 px to 1920 px without horizontal
  scrolling of the page, by keyboard alone and by touch.
- **SC-008**: A name check sends at most one request to Jira, and typing sends none, in
  100% of cases.

## Assumptions

- "Imię i nazwisko" is the name a person carries in Jira (their display name). The plugin
  looks people up by that name only, not by e-mail or login.
- A full name that exactly one person carries is accepted at once (ignoring letter case and
  extra spaces). A part of a name ("Nowak"), or a name shared by several people, gives a
  list to pick from (decided by the requester on 2026-11-13).
- The choice of another person is temporary, like the selected period: the close button, a
  reload of the page, and closing the tab return to the signed-in user; minimising does not
  (decided by the requester on 2026-11-13). "Defaultowo zawsze po włączeniu" is therefore
  read as: every newly loaded Jira page starts on the signed-in user.
- Because the choice is not stored, each Jira tab has its own.
- One last other person is remembered in the browser, only to fill the name field in
  advance (decided by the requester on 2026-11-13). It is shared by all Jira tabs of that
  browser, like the other settings. A browser where it cannot be stored or read behaves as
  if nothing was remembered.
- The remembered name is one colleague's name and identity, nothing about their time. It
  can be seen in the settings field by anyone who uses the same browser profile; this is
  accepted. It is sent nowhere.
- Only people with an active account are looked up; app accounts, automation accounts,
  and deactivated accounts are not offered (decided by the requester on 2026-11-13).
- The list of matching people shows no pictures: Jira keeps them on other addresses than
  the Jira site, and the plugin talks to the Jira site only. Two people of the same name
  whose e-mail addresses are both hidden look the same in the list (decided by the
  requester on 2026-11-13).
- What the signed-in user can see of another person's logged time is decided by Jira's own
  permissions. The plugin adds no access of its own and no extra permission check.
- The "alert" is a small window of the plugin with an "OK" button, not a dialog of the
  browser, so the Jira page under it is not blocked and the look stays consistent in both
  appearances (decided by the requester on 2026-11-13). The messages for an empty field
  and for a check that could not be made (FR-018, FR-023) stay in the settings, under the
  field, without a window to close.
- "Nie można zapisać ustawień" is read as: nothing from this visit to the settings is saved,
  also not a changed interval or appearance. The appearance preview stays as the user set
  it while the settings remain open.
- The name above the title is shown always, also for the signed-in user, so the header looks
  the same in both cases.
- The name has one colour for everyone, an orange chosen by the requester on 2026-11-13
  (`#ff6c00`); the light appearance uses a darker shade of it so that the contrast rule of
  the constitution holds. The first version of this spec kept the name clear of the progress
  colours; the requester's colour is near one of them, and that is accepted (FR-007). The plugin's accent
  blue is a background colour for buttons and is too dark as text in the dark appearance.
  The colour does not tell the signed-in user from another person; the launcher and the
  settings do.
- The launcher shows the selected person's total. For another person it also carries their
  name, so a minimised panel cannot be taken for the user's own hours; for the signed-in
  user it is unchanged (decided by the requester on 2026-11-13).
- The name and the label on the launcher are separated by a middle dot ("·").
- The table is emptied at a change of person, although 001 keeps old rows under the spinner
  at a change of period: rows of one person under the name of another are worse than an
  empty table for a moment (decided by the requester on 2026-11-13).
- The limit of 15 seconds for a check is chosen so that a hanging request does not leave
  "Zapisz" disabled without end; a normal check answers within a second.
- Day and week boundaries follow the signed-in user's time zone for every person.
- Showing several people at once, team totals, and a list of several recently viewed people are out
  of scope.
- A control to forget the remembered person is out of scope.
- Logging or correcting time for another person is out of scope; the plugin stays read-only.

**Dependencies**

- The worktime panel of 001 (settings, header, launcher, loading and error states). The
  requirements of 001 cited here exist there with the meaning used here: FR-001 (replaced),
  FR-040, FR-043, FR-046, FR-049, FR-060, FR-064, FR-068, FR-072, FR-075, FR-081 to FR-086.
- The Jira site lets the signed-in user look up other people by name and read the time they
  logged on tickets the signed-in user can view.
- Confirmed on a real Jira Cloud site on 2026-11-13 (plan, checks X7 and X8; tasks T010):
  - Jira's search of people finds a colleague by surname alone and by full name, also when
    the text is typed without Polish letters. FR-017 promises exactly that.
  - Jira accepts a query for the time of a person named by their identity. The wider query
    that 001 has as a fallback stays as a safety net; with it a long period would load more
    slowly.
  - Colleagues' e-mail addresses are hidden on that site: in the list an address stands only
    under the user's own entry (seen again through the installed extension, tasks T057). The
    list shows names only for colleagues, and two of the same name cannot be told apart in
    it (Assumptions). The requester accepts this.
- The project constitution (`.specify/memory/constitution.md`) applies. Settings stay in the
  user's browser; the plugin talks only to the Jira site the user has open.
