# Instalacja wtyczki Jira Custom Tempo w przeglądarce

Wtyczka pokazuje na stronach Jiry, ile czasu masz dziś zalogowane. Instalujesz ją raz, zajmuje
to około 3 minut. Nie potrzebujesz administratora Jiry ani żadnego hasła.

Wtyczki nie ma jeszcze w sklepie z rozszerzeniami, dlatego instalujesz ją z folderu na dysku.

## Zanim zaczniesz

1. Pobierz plik `jira-custom-tempo-0.2.0.zip` (dostaniesz go od osoby, która udostępnia wtyczkę).
2. Kliknij plik prawym przyciskiem myszy i wybierz „Wyodrębnij wszystkie” (Windows) albo kliknij
   go dwukrotnie (Mac).
3. Przenieś rozpakowany folder w miejsce, z którego go nie usuniesz, na przykład do
   „Dokumentów”. Przeglądarka czyta wtyczkę z tego folderu przy każdym uruchomieniu. Jeśli
   usuniesz albo przeniesiesz folder, wtyczka przestanie działać.

## Google Chrome

1. W pasku adresu wpisz `chrome://extensions` i naciśnij Enter.
2. W prawym górnym rogu włącz „Tryb dewelopera”.
3. Kliknij „Załaduj rozpakowane”.
4. Wskaż rozpakowany folder (ten, w którym jest plik `manifest.json`) i kliknij „Wybierz folder”.
5. Na liście pojawi się „Jira Custom Tempo” z ikoną zegara.

## Microsoft Edge

1. W pasku adresu wpisz `edge://extensions` i naciśnij Enter.
2. Po lewej stronie włącz „Tryb dewelopera”.
3. Kliknij „Załaduj rozpakowane”.
4. Wskaż rozpakowany folder i kliknij „Wybierz folder”.

## Brave, Opera, Vivaldi

Te przeglądarki działają tak samo jak Chrome. Różni się tylko adres strony z rozszerzeniami:

| Przeglądarka | Adres do wpisania |
|--------------|-------------------|
| Brave | `brave://extensions` |
| Opera | `opera://extensions` |
| Vivaldi | `vivaldi://extensions` |

Dalej wykonaj kroki 2–4 z części „Google Chrome”. Wtyczka była sprawdzana w Chrome i Edge;
w tych trzech przeglądarkach powinna działać, ale nie była w nich testowana.

## Firefox

Firefox pozwala wczytać taką wtyczkę tylko tymczasowo: znika po zamknięciu przeglądarki
i trzeba ją wczytać ponownie. Wtyczka nie była testowana w Firefoksie.

1. W pasku adresu wpisz `about:debugging#/runtime/this-firefox` i naciśnij Enter.
2. Kliknij „Wczytaj tymczasowy dodatek…”.
3. W rozpakowanym folderze wskaż plik `manifest.json`.

## Safari

Safari nie jest obsługiwane.

## Jak sprawdzić, że działa

1. Otwórz swoją Jirę (adres kończy się na `atlassian.net`) i zaloguj się.
2. Jeśli Jira była już otwarta, odśwież stronę (klawisz F5).
3. W prawym dolnym rogu zobaczysz przycisk „Dziś: …” z dzisiejszą sumą czasu.
4. Kliknij go, żeby otworzyć panel z listą zgłoszeń.

## Gdy coś nie działa

| Co widzisz | Co zrobić |
|------------|-----------|
| Nie ma przycisku „Dziś: …” | Sprawdź, czy jesteś zalogowany w Jirze i czy adres kończy się na `atlassian.net`. Odśwież stronę. |
| Przy starcie przeglądarki pojawia się pytanie o rozszerzenia w trybie dewelopera | To normalne dla wtyczek instalowanych z folderu. Zostaw wtyczkę włączoną. |
| Wtyczka zniknęła z listy | Folder został usunięty albo przeniesiony. Rozpakuj plik ponownie i powtórz instalację. |
| Przycisk pokazuje „Dziś: –” | Wtyczka nie mogła pobrać danych z Jiry. Otwórz panel i kliknij „Spróbuj ponownie”. |

## Aktualizacja do nowej wersji

1. Rozpakuj nowy plik `.zip` i zastąp nim zawartość starego folderu.
2. Na stronie rozszerzeń kliknij przy wtyczce przycisk odświeżania (okrągła strzałka).
3. Odśwież stronę Jiry.

## Usunięcie

Na stronie rozszerzeń kliknij „Usuń” przy „Jira Custom Tempo”. Wtyczka niczego nie zapisuje
w Jirze, więc po usunięciu nic tam nie zostaje.
