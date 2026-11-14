# Feature Specification: Reset Button and Two-Row Header

**Feature Branch**: `004-reset-button-toolbar`

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: "tworzymy nowy branch, na ktorym zmienimy gui i dodamy jeden button. Dodajemy button Reset - ktory bedzie resetowal ustawienia aplikaci do default (tak jak teraz dziala przycisk X) Gui zmieniamy tak, ze minimalizuj i X zostaja w najwyzszym rzedzie apki po prawje. po lewej tytul jak teraz. drugi rzad to wszystkie przyciski funkcyjne: cofnij, ponow, odswiez, reset, ustawienia i dopiero potem box z wyborem dnia"

This feature extends the worktime panel of [001-worktime-panel](../001-worktime-panel/spec.md),
[002-other-user-worktime](../002-other-user-worktime/spec.md), and
[003-table-export](../003-table-export/spec.md). Requirement numbers here are local to this
spec; requirements of the others are cited as "001 FR-…", "002 FR-…", and "003 FR-…".

It changes these lines of the earlier specs:

- The header layout of the UI contract of 001 ("Panel layout, top to bottom", item 1) is
  replaced by FR-001 to FR-008 and FR-024: the header has two rows in place of one: the
  title row and a toolbar.
- 001 FR-086 said the minimise button stands "between the settings button and the close
  button". It now stands directly before the close button, in the title row; the settings
  button is in the toolbar (FR-002, FR-004). What the minimise button does is unchanged.
- The total row (001 FR-014, FR-062) gains the name of the plugin with its version at its
  left edge (FR-023). 003 FR-001 put the export control "at the left of the total row"; in
  a window wider than 600 px it now stands in the middle of that row (FR-025).
- 001 FR-066 put the bar 24 px under the period box and its scale 24 px above the table.
  Both distances grow by 16 px (FR-024).
- The table of 002 FR-049 gains one event: "Resetuj" returns the choice to the signed-in
  user, as the close button does (FR-012).
- 002 FR-028 said the choice of another person lasts "while the panel is not closed with its
  close button". It now ends with "Resetuj" as well (FR-010, FR-012).
- 001 FR-082 said the close button forgets all steps of "Cofnij" and "Ponów". "Resetuj"
  forgets them as well (FR-011).
- The smallest height of the panel (001 FR-059) rises from 440 px to 592 px, because the
  header is one row higher and there is more room above the toolbar and around the progress
  bar (FR-008; the number followed the changes of 2026-11-14 below: 484 px, 640 px, and
  592 px at the end). Where 001 FR-075 lets the panel become lower by itself "also below
  440 px", the number is now 592 px.

## Clarifications

### Session 2026-11-14

- Q: Co dokładnie ma przywracać przycisk Reset: widok, zapisane ustawienia, czy jedno i drugie? → A: Tylko widok. Reset robi to, co dziś robi przycisk X (dzisiejszy dzień, zalogowany użytkownik, puste „Cofnij” i „Ponów”), ale panel zostaje otwarty. Zapisane ustawienia (motyw, interwał odświeżania, rozmiar panelu, pozycja launchera, zapamiętana osoba) zostają; potwierdzenie nie jest potrzebne (FR-010, FR-011, FR-013, FR-017).
- Q: Jak ma się nazywać nowy przycisk i co ma być na nim widać? → A: Ikona i napis „Resetuj”, jak przy „Odśwież”; na ekranie o szerokości 600 px i węższym sama ikona. Podpowiedź i nazwa dla czytnika ekranu to „Resetuj” (FR-007, FR-009, FR-021).
- Q: Do której strony ma być wyrównany drugi rząd z pięcioma przyciskami? → A: Na środku. Pięć przycisków stoi razem, wyśrodkowanych w szerokości nagłówka, jak wiersze boksu wyboru dnia pod nimi; tak samo na wąskim ekranie (FR-004, FR-007).
- Q: Co ma robić przycisk „Resetuj”, gdy panel już pokazuje widok startowy? → A: Jest wyłączony i wyszarzony, jak „Cofnij” bez kroków. Włącza się od razu, gdy jest co resetować: inny okres, inna osoba albo zapamiętany krok „Cofnij” lub „Ponów”. Po użyciu wyłącza się, a fokus klawiatury przechodzi na „Odśwież” (FR-015, FR-018).
- Q: Jaki znak ma mieć przycisk „Resetuj”? → A: Domek (dach, ściany, drzwi). Strzałka w kółko przeciwnie do zegara stałaby na telefonie, bez napisu, tuż obok strzałki „Odśwież” i różniłaby się tylko kierunkiem (ustalone w planie 2026-11-14, wpisane po checkliście `checklists/header.md`; FR-009).
- Q: Gdzie dokładnie otwierają się ustawienia, skoro przycisk „Ustawienia” stoi teraz na środku? → A: Bezpośrednio pod rzędem przycisków, wyśrodkowane w panelu (na ekranie do 600 px na całą szerokość panelu, jak dziś). Nigdy nie zasłaniają przycisków nagłówka i idą za nagłówkiem, gdy zmienia on wysokość (FR-005, SC-013).
- Q: Czy launcher po każdym resecie pokazuje znak oczekiwania? → A: Tylko gdy reset zmienił okres albo osobę. Gdy zapomniane zostały same kroki „Cofnij” i „Ponów”, launcher trzyma swoją sumę do końca ładowania, jak przy „Odśwież” (FR-014).
- Q: Co robi „Resetuj”, gdy nad ustawieniami jest otwarty alert z 002 albo trwa sprawdzanie osoby? → A: Działa jak „Minimalizuj” i „Zamknij” dzisiaj: ustawienia zamykają się bez zapisu, alert razem z nimi, a trwające sprawdzanie jest porzucane (FR-016).
- Q: Czy pozostałe punkty checklisty `checklists/header.md` zmieniają wymagania? → A: Tak, doprecyzowują je: miejsce i odstępy przycisków okna (FR-003, FR-004), fokus także po kliknięciu myszą (FR-018), strefa czasowa „dzisiaj” i wygląd nowego widoku (FR-010), powiększenie wykresu (FR-013), moment wyliczania stanu przycisku (FR-015), zapis wysokości panelu (FR-008), zakaz nowych kolorów i rozmiarów (FR-022), mierzalne kryteria (SC-001, SC-005, SC-006, SC-008, nowe SC-013 i SC-014) oraz lista zmienianych wymagań 001 i 002.

### Session 2026-11-14, after the first implementation

The requester looked at the built plugin on a real Jira site and asked for four changes.

- Q: Co ma stać w lewym górnym rogu panelu? → A: Nazwa aplikacji z wersją, „Jira Custom Tempo - {wersja}”: nieduża czcionka, szara, kursywa. Stoi w jednym rzędzie z przyciskami „Minimalizuj” i „Zamknij” (FR-002, FR-023).
- Q: Gdzie w takim razie stoi tytuł? → A: Rząd niżej: nazwisko i tytuł z sumą mają własny rząd pod nazwą aplikacji i przyciskami okna, na całą szerokość nagłówka (FR-001, FR-002, FR-003).
- Q: Jak nisko mają stać przyciski „Cofnij”, „Ponów”, „Odśwież”, „Resetuj”, „Ustawienia”? → A: Rząd przycisków dostaje dodatkowy odstęp od góry, 32 px (pierwotnie podane jako 2em) (FR-024).
- Q: Ile miejsca ma mieć pasek postępu albo wykres? → A: Dodatkowe 16 px nad sobą i pod sobą (pierwotnie podane jako 1em) (FR-024).
- Q: Co te zmiany znaczą dla najmniejszej wysokości panelu? → A: Nagłówek i pasek zajmują o 106 px więcej, a widok z wykresem jest wyższy od widoku dnia. Żeby w najniższym panelu zostały widoczne wiersz tabeli i suma, najmniejsza wysokość to 640 px zamiast 484 px; zapisana wysokość od 440 do 639 px jest czytana jako 640 px (FR-008, SC-014; ustalone przy implementacji, zmierzone w przeglądarce).
- Q: Czy odstępy mają być w `em`, jak w zgłoszeniu? → A: Nie muszą; mają być zgodne z resztą panelu. Oba są wzięte ze wspólnych odstępów: 32 px (dwa razy 16 px) nad rzędem przycisków i 16 px nad i pod paskiem. Wyjątek od „żadnych nowych odstępów” przestał być potrzebny (FR-022, FR-024).

### Session 2026-11-14, after the second look at the plugin

The requester looked at the plugin again and moved three things. These answers replace the
first two of the session above; the two distances and their source stay.

- Q: Gdzie ma stać nazwa aplikacji z wersją? → A: W lewym dolnym rogu panelu, w rzędzie z sumą czasu, a nie w nagłówku. Wygląd bez zmian: nieduża czcionka, szara, kursywa (FR-023).
- Q: Gdzie stoi tytuł? → A: Z powrotem na wysokości przycisków „Minimalizuj” i „Zamknij”, jak przed poprzednią zmianą: nazwisko i tytuł po lewej, przyciski okna po prawej. Nagłówek ma znowu dwa rzędy (FR-001, FR-002, FR-003).
- Q: Gdzie stoi przycisk „Eksport”, gdy się pojawia? → A: Na środku rzędu z sumą czasu, między nazwą aplikacji a sumą (FR-025).
- Q: A na telefonie, gdzie trzy elementy nie mieszczą się obok siebie? → A: „Eksport” zostaje przy lewej krawędzi, suma przy prawej, a nazwa aplikacji stoi linię niżej, w lewym dolnym rogu (FR-023, FR-025; przyjęte przy implementacji, bo środek rzędu zajmuje suma).
- Q: Co to znaczy dla najmniejszej wysokości panelu? → A: Nagłówek jest o rząd niższy niż po poprzedniej zmianie, więc najmniejsza wysokość to 592 px zamiast 640 px; zapisana wysokość od 440 do 591 px jest czytana jako 592 px (FR-008, SC-014; zmierzone w przeglądarce).

### Session 2026-11-14, after the release was tagged

- Q: Jak duży ma być napis z nazwą aplikacji i wersją? → A: Jeszcze mniejszy niż 13 px, „na przykład 10 px”. Przyjęty jest najmniejszy rozmiar tekstu, jaki panel już ma, 11 px, żeby nie dodawać nowego rozmiaru (FR-022, FR-023).

## Terms

- **Panel**: the window of the plugin that opens from the launcher (001).
- **Header**: the top part of the panel, above the period box.
- **Title row**: the first row of the header: the name of the person and, under it, the
  title line with the total, and the two window buttons.
- **Window buttons**: "Minimalizuj" and "Zamknij".
- **Toolbar**: the second row of the header, with the buttons that act on the view.
- **Total row**: the row at the foot of the panel with "Suma czasu:" and the total
  (001 FR-014), the export control of 003, and now the name of the plugin.
- **Period box**: the framed box with "Dzień:", the four period buttons, and "Od:" / "Do:"
  (001 FR-055).
- **Start view**: what the panel shows when it is opened on a newly loaded Jira page: the
  period is exactly the current day, the selected person is the signed-in user, and there
  is no step for "Cofnij" and none for "Ponów". Whether the data of the day has loaded,
  is loading, or failed to load does not matter.
- **Stored settings**: what the plugin keeps in the browser between page loads: the refresh
  interval, the theme, the size of the panel, the place of the launcher, and the last other
  person (001, 002 FR-035).
- **Reset button**: the new button, named "Resetuj".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Return to the start view with one press (Priority: P1)

The user has moved away from the start view: they look at last month, or at the time of
another person, or both. They want to see their own time for today again. Today they must
press the close button and then open the panel again from the launcher. With this feature
they press "Resetuj" in the toolbar: the panel stays open and shows today for the signed-in
user, with fresh data.

**Why this priority**: This is the new behavior of the feature. It replaces a two-step
detour (close, open again) that also moves the keyboard focus out of the panel.

**Independent Test**: Open the panel, select another period, select another person in the
settings, and press "Resetuj". The panel stays open and shows today for the signed-in user;
"Cofnij", "Ponów", and "Resetuj" are disabled; the launcher shows "Dziś:" with the same
total.

**Acceptance Scenarios**:

1. **Given** the panel shows last month for the signed-in user, **When** the user presses
   "Resetuj", **Then** the panel stays open, shows the current day, and loads its data from
   Jira, with no question asked first.
2. **Given** the panel shows another person, **When** the user presses "Resetuj", **Then**
   the name in the header becomes the name of the signed-in user, the rows of the other
   person disappear at once, and today's time of the signed-in user is loaded.
3. **Given** the user has gone through several periods, so "Cofnij" is enabled, **When**
   they press "Resetuj", **Then** "Cofnij" and "Ponów" are both disabled.
4. **Given** the user has chosen the light theme, a refresh interval of 10 minutes, a larger
   panel, and another place for the launcher, **When** they press "Resetuj", **Then** all
   four stay as they were, also after the page is reloaded.
5. **Given** the panel shows another period or another person, **When** the user presses
   "Resetuj", **Then** the launcher shows "Dziś:" and the total of the signed-in user for
   today (the pending sign until it has loaded).
6. **Given** the user pressed "Resetuj" with the keyboard, **When** the view has changed,
   **Then** "Resetuj" is disabled and the keyboard focus is on "Odśwież", inside the panel.
7. **Given** the panel was reset, **When** the user presses the close button and opens the
   panel again, **Then** the result is the same start view; the close button works as before.
8. **Given** the panel was just opened on a newly loaded page, **When** the user looks at
   the toolbar, **Then** "Resetuj" is disabled and looks disabled, like "Cofnij".
9. **Given** "Resetuj" is disabled, **When** the user selects another period, saves another
   person in the settings, or goes back with "Cofnij", **Then** "Resetuj" is enabled at
   once, before the new data has loaded.
10. **Given** the panel shows last month and the settings are open with a changed interval,
    or the export menu is open, **When** the user presses "Resetuj", **Then** the settings
    close without saving the interval, the menu closes, and the panel shows today.
11. **Given** Jira cannot be reached, **When** the user presses "Resetuj" on last month,
    **Then** the panel shows the error text and "Spróbuj ponownie" for today under the name
    of the signed-in user, and "Resetuj" is disabled.

---

### User Story 2 - Header in two rows (Priority: P2)

The user opens the panel. The first row of the header reads like the title bar of a window:
the name of the person and the title with the total at the left, and only the two window
buttons at the right, "Minimalizuj" and "Zamknij". Under it, clear of the title, a row of
its own holds the buttons that act on the view, in this order: "Cofnij", "Ponów",
"Odśwież", "Resetuj", "Ustawienia". The period box follows below the toolbar. At the foot
of the panel, the total row names the plugin and its version at the left, has the export
control in the middle, and the total at the right.

**Why this priority**: The layout gives the new button its place and separates the buttons
that hide the panel from the buttons that change what it shows. It has value only together
with a working panel, so it comes after the reset itself.

**Independent Test**: Open the panel at a desktop width and compare it with the order
above: two buttons in the first row at the right, five in the toolbar, the period box
under them; in the total row the name of the plugin, "Eksport" in the middle, and the
total. Every button does what it did before.

**Acceptance Scenarios**:

1. **Given** the panel is open, **When** the user looks at the first row, **Then** they see
   the person's name and the title with the total at the left, and "Minimalizuj" followed by
   "Zamknij" at the right, level with the name, and no other button.
2. **Given** the panel is open, **When** the user looks at the toolbar, **Then** they see
   exactly five buttons in the order "Cofnij", "Ponów", "Odśwież", "Resetuj", "Ustawienia",
   standing together in the middle of the row.
7. **Given** the panel is open, **When** the user looks at the bottom left corner, **Then**
   they see "Jira Custom Tempo - " and the version, in small, grey, slanted letters, on the
   line of the total.
8. **Given** the panel is open, **When** the user compares the distances, **Then** the
   toolbar stands clear of the title, 32 px lower than the usual gap, and the progress bar
   or chart has 16 px more room above and below than before.
9. **Given** the table has rows, **When** the user looks at the total row in a window wider
   than 600 px, **Then** "Eksport" stands in the middle of the row, between the name of the
   plugin and the total; its menu opens above it, as before.
3. **Given** the panel is open, **When** the user looks below the toolbar, **Then** the
   period box is the next element, followed by the progress bar or chart, the table, and the
   total row, as before.
4. **Given** the panel is open, **When** the user presses "Ustawienia", **Then** the
   settings open directly under the toolbar, cover no header button, and are wholly inside
   the panel.
5. **Given** the panel is open, **When** the user moves through the header with the Tab key,
   **Then** the focus goes "Minimalizuj", "Zamknij", "Cofnij", "Ponów", "Odśwież",
   "Resetuj", "Ustawienia", and then into the period box. A disabled button is skipped: on
   a newly opened panel these are "Cofnij", "Ponów", and "Resetuj".
6. **Given** the title is long (a date range and a large total, under a long name), **When**
   the panel has its smallest width, **Then** the title row still shows both window buttons
   whole, and the title does not run under them.

---

### User Story 3 - The header on a phone (Priority: P3)

The user opens the panel on a phone. The title and the two window buttons share the first
row. The five toolbar buttons stand in the second row, each large enough for a finger, and
none is cut off by the edge of the panel. In the total row "Eksport" keeps the left edge and
the total the right one; the name of the plugin stands on a line of its own below them, at
the bottom left.

**Why this priority**: The panel must work on a phone (constitution, Principle III). The
change makes the phone header simpler than it is today, where six buttons share one line.

**Independent Test**: Open the panel in a window 320 px wide with touch input. All seven
header buttons are wholly visible, each is at least 44 x 44 px, and each one works.

**Acceptance Scenarios**:

1. **Given** a window 320 px wide, **When** the panel is open, **Then** the title and the
   buttons "Minimalizuj" and "Zamknij" are in the first row, and the five toolbar buttons
   are in the second row, all wholly inside the panel.
4. **Given** a window 600 px wide or narrower, **When** the user looks at the total row,
   **Then** "Eksport" is at the left edge, the total at the right edge, and the name of the
   plugin on the line below, at the left.
2. **Given** a window 600 px wide or narrower, **When** the panel is open, **Then**
   "Odśwież" and "Resetuj" show their sign without the written label, and a screen reader
   still announces their names.
3. **Given** touch input, **When** the user presses any header button, **Then** its touch
   area is at least 44 x 44 px and does not overlap the area of its neighbour.

---

### Edge Cases

- The panel already shows the start view: "Resetuj" is disabled, also while today is still
  loading and after that load failed ("Odśwież" and "Spróbuj ponownie" load it again).
- The user is on today for the signed-in user, but came back there with "Cofnij", so
  "Ponów" is enabled: this is not the start view, and "Resetuj" is enabled; a press forgets
  the steps and loads today again.
- The user selected the current day by hand (a period button, "Dzień:", or an arrow) after
  another period: "Cofnij" is enabled, so "Resetuj" is enabled.
- A load of another period or person is running when "Resetuj" is pressed: the running load
  is given up, its result is never shown, and today is loaded for the signed-in user.
- The settings are open when "Resetuj" is pressed: they close without saving, as with
  "Anuluj". The export menu, when open, closes as well.
- A check of a person is running in the settings, or the alert of 002 is open over them,
  when "Resetuj" is pressed: the check is given up, the alert closes with the settings, and
  nothing is saved. "Minimalizuj" and "Zamknij" do the same today.
- The panel is minimised on a view that is not the start view and opened again: "Resetuj"
  is enabled as before; minimising changes nothing.
- The user is on today with no steps and another person, and saves "Obecny użytkownik" in
  the settings: the view is the start view again without a press on "Resetuj", and the
  button is disabled.
- In a narrow window the title wraps to three lines: the window buttons keep their place,
  and the toolbar and everything below it move down.
- The load of today fails after "Resetuj": the panel shows the error text and "Spróbuj
  ponownie" as after any failed load (001); the name is the signed-in user's, and the
  launcher shows the error for today.
- The calendar day changed while the panel was open on yesterday's "today": an automatic
  refresh moves the view to the new day by itself (001), and "Resetuj" stays disabled. After
  "Odśwież" by hand the period on screen is still yesterday, which is not the current day,
  so "Resetuj" is enabled; a press shows the day that is the current day at the moment of
  the press. The state is worked out at every change of the view and at every load.
- The table was sorted by a column: the order stays after "Resetuj", as it stays after the
  close button.
- "Resetuj" is pressed several times quickly: the first press disables the button, so the
  others do nothing; one load of today is made.
- The panel has its smallest height: the added row must not push the last table row or the
  total row out of sight (FR-008).
- "Cofnij" cannot bring back the view from before the reset: the steps are forgotten, as
  after the close button.

## Requirements *(mandatory)*

### Functional Requirements

**Layout of the header**

- **FR-001**: The header MUST have two rows, at every window width. The first is the title
  row, the second is the toolbar. The period box MUST be the first element below the
  toolbar. Everything below the period box keeps its order and, but for FR-023 to FR-025,
  its look.
- **FR-002**: The title row MUST hold, at the left, the name of the person (002 FR-006) and
  under it the title with the total (001 FR-012, FR-013), unchanged in text, colour, and
  size. At the right it MUST hold exactly two buttons: "Minimalizuj", then "Zamknij". Both
  keep their sign, their name, and their meaning (001 FR-041, FR-064, FR-086). The name of
  the person starts level with the top of the window buttons; nothing of the header stands
  above it.
- **FR-003**: The two window buttons MUST stay at the top right corner of the panel at every
  window width and for every title: aligned to the top of the title row, at the distances
  from the top and the right edge of the panel that the header has today (16 px and 20 px;
  12 px and 12 px in a window 600 px wide or narrower). A title or a name too long for the
  room at the left MUST NOT move them, cover them, or run under them. The title wraps onto
  further lines inside its room; the name stays on one line, is cut with an ellipsis, and
  stays readable as a whole as today (002 FR-009). When the title takes more lines, the
  toolbar and everything below it move down by those lines; nothing else changes its place.
- **FR-004**: The toolbar MUST hold exactly five buttons in this order, from the left:
  "Cofnij", "Ponów", "Odśwież", "Resetuj", "Ustawienia". The first three and the last keep
  their sign, their name, their states, and their meaning (001 FR-029, FR-031, FR-082;
  003 FR-030). The five buttons MUST stand together, 8 px apart (the gap the header buttons
  have today), centred in the width of the header, like the rows of the period box below
  them; they do not go to the edges of the header.
- **FR-005**: The settings MUST open directly under the toolbar and MUST NOT cover any
  header button, for every title and name. In a window wider than 600 px they are centred in
  the width of the panel, so they stand under the centred toolbar with the settings button
  above them; in a window 600 px wide or narrower they take the width of the panel less the
  side margins they have today. They MUST be wholly inside the panel at every panel size
  from the smallest to the largest. When the height of the header changes while they are
  open (a load ends and the title wraps differently, the window changes size), they MUST
  follow it.
- **FR-006**: The keyboard order MUST follow the reading order: the two window buttons, then
  the five toolbar buttons from left to right, then the period box. On opening, the focus
  goes where it goes today, to the close button, the second of the two window buttons; Shift
  and Tab from there reach "Minimalizuj". This is intended: the close button is what a user
  who opened the panel by mistake needs first. The rule for a control that lost its use
  (003 FR-030: to "Cofnij", else to "Odśwież") is unchanged.
- **FR-007**: In a window 600 px wide or narrower (the width of the window, as in 001), the
  title and the two window buttons MUST share the first row, and the five toolbar buttons
  MUST stand in the second row, centred as in a wider window. "Odśwież" and "Resetuj" MUST
  then show only their sign; their names stay available to assistive technology. In a wider
  window both show their labels, also with touch input. Every header button MUST be wholly
  inside the panel down to a window width of 320 px, and with touch input MUST have a touch
  area of at least 44 x 44 px at every window width.
- **FR-008**: The added row and distances MUST NOT break the rules for the size of the
  panel (001 FR-059, FR-061, FR-075): at its smallest height the panel still shows the
  header, the period box, the progress bar or the chart, at least one table row, and the
  total row without scrolling, on screens 600 px and wider (below that the whole panel
  scrolls, as in 001). For this the smallest height of the panel MUST be 592 px in place of
  440 px; the view with the chart, which is higher than the view of one day, decides the
  number. A stored height from 440 px to 591 px MUST be read as 592 px, with no step by the
  user; every other stored value keeps its meaning. Reading does not rewrite the stored
  value: it is stored as 592 px or more with the next change of a setting or of the size.
  In a window with no room for 592 px the panel still becomes lower by itself and scrolls
  as a whole (001 FR-075); this is the case in a window lower than about 690 px.

**The reset button**

- **FR-009**: The toolbar MUST have a button named "Resetuj", between "Odśwież" and
  "Ustawienia". It shows a sign and the written label "Resetuj", as "Odśwież" shows its
  label. Its sign MUST be the outline of a house (a roof, walls, and a door), the common
  sign for a start view, drawn like the other signs of the header. It has no arrow and no
  curved line, so it cannot be taken for the sign of "Odśwież" or of "Cofnij", also on a
  narrow screen where the signs stand without labels. Its tooltip and its accessible name
  are "Resetuj".
- **FR-010**: Pressing "Resetuj" MUST bring the panel to the start view and keep it open:
  the period becomes the current day, the selected person becomes the signed-in user, and
  the data of that day is loaded from Jira and shown with the usual loading indication. The
  current day is the day in the user's local time zone at the moment of the press
  (001 FR-026). In everything this spec does not name (where the table and the panel are
  scrolled to, the loading indication, what assistive technology is told about the load)
  the new view MUST appear exactly as today's view appears on the first opening of the
  panel on a newly loaded page.
- **FR-011**: "Resetuj" MUST forget exactly what the close button forgets (001 FR-049,
  FR-082; 002 FR-028) and nothing more: the selected period, the selected other person, and
  the steps of "Cofnij" and "Ponów". After it, both history buttons are disabled.
- **FR-012**: When another person was shown, their rows, chart, and totals MUST disappear at
  once with the press, together with the change of the name; nothing of the other person
  may be shown under the name of the signed-in user (002 FR-003, FR-004).
- **FR-013**: "Resetuj" MUST NOT change any stored setting: the refresh interval, the theme,
  the size of the panel, the place of the launcher, and the remembered last other person
  stay as they are. It MUST NOT change the sort order of the table. The zoom of the chart
  needs no rule: the start view is a single day and has no chart, and a period chosen
  afterwards starts without zoom, as after every change of period (001 FR-078).
- **FR-014**: After "Resetuj" the launcher MUST show the period of the panel: "Dziś:" with
  the total of the signed-in user (001 FR-040). When the press changed the period or the
  person, the launcher MUST show the pending sign until that total has loaded, so that it
  never shows a total of the period or the person that was left under "Dziś:"
  (002 FR-041). When only the steps of "Cofnij" and "Ponów" were forgotten, it keeps the
  total it shows until the new load replaces it, as during "Odśwież".
- **FR-015**: "Resetuj" MUST be enabled exactly when the panel is not on the start view,
  that is when at least one of these holds: the period on screen is not exactly the current
  day; the selected person is not the signed-in user; "Cofnij" or "Ponów" has a step to go
  to. Otherwise it MUST be disabled and look disabled exactly like "Cofnij" and "Ponów"
  with nowhere to go (001 FR-082): faded, no reaction to the pointer, skipped by the Tab
  key, and announced to assistive technology as unavailable in the same way as those two.
  The state MUST be worked out at every change of the view (the period, the person, the
  steps) and at the start of every load, and MUST change at once then, not when the data
  has loaded; a running or failed load does not change it. Between midnight and the next of
  these moments it may still be the state of the day before (Edge Cases). A press during a
  load gives that load up: its result is never shown. Automatic refresh continues with the
  stored interval, counted from the new load.
- **FR-016**: A press on "Resetuj" MUST close the settings without saving when they are
  open, as "Anuluj" does: a check of a person that is still running is given up
  (002 FR-016), and an alert of 002 that is open over the settings closes with them. It
  MUST close the export menu when it is open. Hiding the panel does the same today, so this
  is nothing "Resetuj" forgets beyond FR-011. While the alert is open the header buttons
  can be pressed, as today; "Resetuj" is carried out like "Minimalizuj" and "Zamknij".
- **FR-017**: "Resetuj" MUST NOT ask for a confirmation: it removes nothing that is stored.
- **FR-018**: A press on "Resetuj" leads to the start view, so the button becomes disabled
  with it. When the button holds the focus at that moment, however it got it (keyboard,
  mouse, or touch), the focus MUST move to "Odśwież" and MUST NOT leave the panel
  ("Odśwież" can hold the focus also while the load runs, 003 FR-030). After a press with
  the mouse or by touch no focus ring needs to appear; that follows the browser's own rule.
  The same holds whenever "Resetuj" becomes disabled while it holds the focus, for example
  when an automatic refresh after midnight moves the view to the new day. While enabled,
  the button MUST be operable by mouse, touch, and keyboard (Enter and Space), show a
  visible focus state, and react to the pointer like the other header buttons
  (001 FR-065).
- **FR-019**: When the load after "Resetuj" fails, the panel MUST show the error state of
  001 with "Spróbuj ponownie" for today and the signed-in user; the reset itself is not
  taken back, and "Resetuj" stays disabled. "Spróbuj ponownie" and "Odśwież" load the day
  again, as after any failed load.

**Unchanged behavior**

- **FR-020**: The close button MUST keep its full meaning: it hides the panel and forgets
  what FR-011 lists. "Minimalizuj", the launcher, and the Escape key keep minimising without
  forgetting anything.
- **FR-021**: The one new text, "Resetuj", MUST be in Polish like every other text of the
  plugin (001 FR-035). No other text changes.
- **FR-022**: Both themes MUST show the new header with the colours of the theme, as they
  show the rest of the panel. The header MUST NOT bring in a colour, a size, or a breakpoint
  that the panel does not use already, and every distance comes from the shared spacings
  of the panel. The one number that changes is the smallest height of the panel (FR-008).
- **FR-023**: The total row MUST show, at its left edge, the text "Jira Custom Tempo - "
  followed by the version of the installed plugin, for example "Jira Custom Tempo - 0.5.0":
  the bottom left corner of the panel. It MUST be written in the smallest text size of the
  panel (11 px), in the muted grey of the theme, slanted, and not bold; it MUST stay on one
  line and be cut with an ellipsis when the row is too narrow for it. In a window wider
  than 600 px it stands on the line of the export control and of the total; in a window
  600 px wide or narrower it stands on a line of its own below them. It is there in every
  state of the table, also while there is nothing to export. It is not a heading and not a
  control. The version MUST be the one the browser shows for the extension; the two cannot
  differ.
- **FR-024**: The toolbar MUST stand 32 px lower than the usual gap under the title, so
  that it is clear of the title. The part of the panel with the progress bar or the chart
  MUST have 16 px of free room more above it and below it, the same at both sides, so the
  bar stays midway between the period box and the table (001 FR-066). Both distances MUST
  come from the shared spacings of the panel (16 px, and twice 16 px), like every other
  distance in it.
- **FR-025**: In a window wider than 600 px the export control of 003 MUST stand in the
  middle of the total row, between the name of the plugin and the total: the middle of its
  button is the middle of the row. The total keeps the right edge (001 FR-062). A name or a
  total that needs more than its half of the row takes the room from the middle, and the
  control then stands between the two without overlapping either. The menu still opens
  above the button and stays inside the panel (003 FR-005); the message that a file could
  not be made still stands beside the button, or under it when it does not fit, and does
  not move the total (003 FR-009). In a window 600 px wide or narrower the control keeps
  the left edge of the row, as in 003 FR-001. The states of the control (003 FR-002,
  FR-003) and the height of the row are unchanged.

### Key Entities

- **Start view**: a period that is exactly the current day, the signed-in user as the
  selected person, and no step for "Cofnij" or "Ponów" (as in Terms). It is what a newly loaded page, the close
  button, and "Resetuj" all lead to.
- **Stored settings**: the refresh interval, the theme, the panel size, the launcher place,
  and the last other person. No part of this feature writes to them.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From any view that is not the start view, a user reaches today's own time
  with 1 press, with the panel open. Before this feature it took 2 presses and the panel
  closed in between.
- **SC-002**: In 100% of presses on "Resetuj", the panel afterwards shows the current day,
  the name of the signed-in user, and disabled "Cofnij", "Ponów", and "Resetuj".
- **SC-011**: "Resetuj" is enabled in 100% of views that are not the start view and
  disabled in 100% of cases where the panel is on the start view; the user never sees an
  enabled "Resetuj" whose press would change nothing.
- **SC-012**: After "Resetuj" is activated with the keyboard, the focus is inside the panel
  in 100% of cases; the next press of Tab goes to "Ustawienia".
- **SC-003**: In 100% of presses on "Resetuj", every stored setting has the same value after
  the press, and after a page reload, as before the press.
- **SC-004**: After "Resetuj" from another person's view, 0 rows, bars, or totals of that
  person are visible at any moment under the signed-in user's name.
- **SC-005**: After "Resetuj" the plugin sends exactly the requests of 1 load of today for
  the signed-in user, the same as on the first opening of the panel on a newly loaded page,
  and 0 further requests for the period or the person that was left.
- **SC-006**: At every window width from 320 px to 1920 px, in both themes, all 7 header
  buttons are wholly visible, and the first row holds exactly 2 buttons and the toolbar
  exactly 5 (checked at 320 px, 600 px, 1280 px, and 1920 px).
- **SC-007**: With touch input, 7 of 7 header buttons have a touch area of at least
  44 x 44 px.
- **SC-008**: The window buttons are at the same place of the panel for every title and
  name, including the longest: at the same window width, their position differs by 0 px
  between a one-day title and a date-range title, and between a short and the longest name.
- **SC-013**: With the longest title and name, at window widths of 320 px and 1280 px and at
  the smallest and the largest panel size, the settings are wholly inside the panel and
  cover 0 of the 7 header buttons.
- **SC-015**: In 100% of openings the total row shows "Jira Custom Tempo - " with the
  version of the installed plugin at its left edge, on one line, with a contrast of at
  least 4.5 to 1 against the panel in both themes, also while the table is empty.
- **SC-016**: The toolbar starts 40 px below the title row (32 px and the gap of 8 px), and
  the part with the bar or the chart stands 16 px from the period box and 16 px from the
  table, at 320 px and at 1280 px.
- **SC-017**: At 1280 px the middle of the export button is within 1 px of the middle of
  the total row, for a short and for a long total; at 320 px the button is at the left edge
  of the row and does not overlap the total.
- **SC-014**: At the smallest height, 592 px, in a window 600 px wide or wider, the header,
  the period box, 1 table row of one or two lines (at least 46 px under the column
  headers, as before), and the total row are visible without scrolling the panel. A
  stored height of 440 px gives a panel 592 px high, with no message and no step by the
  user. The same holds for the view with the chart (a week, a month, a year).
- **SC-009**: Every action that worked from the header before (back, forward, refresh,
  settings, minimise, close) gives the same result as before: 0 differences in what each of
  the 6 buttons does, checked at one phone width and one desktop width.
- **SC-010**: A user can reach and activate each of the 7 header buttons with the keyboard
  alone, in the order of FR-006, whenever the button is enabled.

## Assumptions

- "Reset do default, tak jak teraz działa przycisk X" means the view, not the stored
  settings (confirmed by the requester on 2026-11-14). Today the close button returns the
  plugin to the current day and to the signed-in user and forgets the steps of "Cofnij" and
  "Ponów"; it does not touch the refresh interval, the theme, the size of the panel, the
  place of the launcher, or the remembered person. "Resetuj" does the same without hiding
  the panel. A reset of the stored settings to their factory values is out of scope.
- The close button keeps what it does today. The request says "minimalizuj i X zostają";
  it does not ask to change them.
- The button is named "Resetuj", not "Reset": every text of the plugin is Polish, and the
  other buttons are imperatives ("Cofnij", "Ponów", "Odśwież", "Minimalizuj", "Zamknij").
  It shows a written label beside its sign, like "Odśwież", because its sign is new to the
  user; on narrow screens it shows the sign only. (Both confirmed by the requester on
  2026-11-14.)
- The toolbar is centred in the header, at every width (chosen by the requester on
  2026-11-14; the request fixed the sides of the first row only). The settings therefore
  open under the middle of the header, no longer at its right edge (FR-005).
- "Resetuj" needs no confirmation and is not taken back by "Cofnij": the close button
  behaves the same way, and one press on a period button brings the user back.
- The sort order of the table is not part of the start view. FR-013 fixes this for
  "Resetuj" by itself; it agrees with 001, where the sort order is not part of a view
  (001 FR-083) and stays when the period changes (UI contract of 001).
- On a phone the title and the two window buttons fit in one row, because two buttons take
  the room of six no longer. The earlier rule "at 600 px and narrower the buttons stand on
  a line of their own under the title" now holds for the toolbar only.
- On a phone the total row has no room for three parts side by side: a total such as "Suma
  czasu: 1234h 00m" reaches past the middle of the row. The export control therefore keeps
  the left edge there, as in 003, and the name of the plugin takes a line below.
- The version shown is the version of the package the plugin is built from. The build and
  a test keep it equal to the version in the manifest, which is what the browser shows.
- The name of the plugin with its version is the name of a product and a number; it is not
  translated.
- The two distances of FR-024 were first given by the requester as 2em and 1em. On
  2026-11-14 the requester said they need not be in em and should agree with the rest of
  the panel; they are the nearest shared spacings, 32 px and 16 px.
- A smallest height of 592 px means that in a window lower than about 690 px the panel is
  lower than its content and scrolls as a whole, as 001 FR-075 allows. Before this feature
  that happened in a window lower than about 540 px.
- The feature adds no data to the browser storage and sends no new kind of request to Jira:
  the load after "Resetuj" is the load of today that the plugin already makes.
- The feature needs no new dependency and stays inside the size budget of the constitution
  (Principle I). The shipped script is expected to grow by less than 1 kB gzipped; the
  size check of the build is the gate.
- A disabled button is exempt from the contrast rule of the constitution (Principle IV), as
  WCAG 2.1 exempts inactive controls. "Cofnij" and "Ponów" with nowhere to go are faded in
  the same way today.
- A larger text size set in the browser is not a case of its own in this spec. Browser zoom
  makes the window narrower in CSS pixels and is covered by the widths down to 320 px.
- The change of the smallest height is the only effect on a user of the earlier version: no
  other stored value changes its meaning (FR-008).
