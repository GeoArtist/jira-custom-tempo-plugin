// Every user-visible text of the app. No other source file may contain Polish text.
// Wording is fixed by specs/001-worktime-panel/contracts/ui.md and, for the texts about
// the selected person, by specs/002-other-user-worktime/spec.md (FR-029).

export const pl = {
  back: 'Cofnij',
  forward: 'Ponów',
  refresh: 'Odśwież',
  settings: 'Ustawienia',
  minimise: 'Minimalizuj',
  close: 'Zamknij',
  previousPeriod: 'Poprzedni okres',
  nextPeriod: 'Następny okres',

  presets: {
    today: 'Dzień',
    thisWeek: 'Tydzień',
    thisMonth: 'Miesiąc',
    thisYear: 'Rok',
  },

  day: 'Dzień:',

  from: 'Od:',
  to: 'Do:',

  columns: {
    ticket: 'Zgłoszenie',
    title: 'Tytuł',
    entries: 'Czas wpisów',
    sum: 'Suma',
  },
  total: 'Suma czasu:',

  loading: 'Ładowanie…',
  empty: 'Brak wpisów czasu w wybranym okresie.',
  error: 'Nie udało się pobrać danych z Jiry.',
  retry: 'Spróbuj ponownie',
  rangeInvalid: 'Początek „Od” nie może być późniejszy niż koniec „Do”.',

  intervalLabel: 'Odświeżaj co',
  intervalUnit: 'min',
  intervalHint: '0 = automatyczne odświeżanie wyłączone (domyślnie 5 min)',
  intervalInvalid: 'Podaj liczbę całkowitą od 0 do 1440.',
  darkMode: 'Tryb ciemny',
  sortAscending: 'sortuj rosnąco',
  sortDescending: 'sortuj malejąco',
  cancel: 'Anuluj',
  save: 'Zapisz',
  settingsNotSaved: 'Nie udało się zapisać ustawień w tej przeglądarce.',

  personGroup: 'Użytkownik',
  personCurrent: 'Obecny użytkownik',
  personOther: 'Inny użytkownik',
  personName: 'Imię i nazwisko',
  personNameRequired: 'Podaj imię i nazwisko.',
  personNotFound: 'Nie znaleziono użytkownika.\nNie można zapisać ustawień.',
  ok: 'OK',
  personCheckFailed: 'Nie udało się sprawdzić użytkownika w Jirze. Ustawienia nie zostały zapisane.',
  personChecking: 'Sprawdzanie…',
  personChoose: 'Znaleziono kilka osób. Wybierz jedną:',
  personTooMany: 'Pokazano 10 pierwszych osób. Wpisz dokładniejsze imię i nazwisko.',

  launcherLabel: 'Dziś:',
  launcherRange: 'Zakres:',
  chart: 'Wykres czasu',
  zoomIn: 'Przybliż',
  zoomOut: 'Oddal',
  resize: 'Zmień wysokość okna',
  resizeWidth: 'Zmień szerokość okna',
  resizeBoth: 'Zmień rozmiar okna',
  launcherMove: 'Przeciągnij, aby przenieść (Shift + strzałki)',
} as const;

/** Weekday names, Monday first (index 0 = Monday). */
export const weekdays = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'] as const;
