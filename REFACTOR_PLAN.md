# Plan Przebudowy Aplikacji Rekwizytor

Dokument ten zawiera szczegółowy plan zmian funkcjonalnych i architektonicznych aplikacji, zgodnie z wytycznymi użytkownika.

## 1. Live View (Widok Sceniczny)

**Cel:** Uproszczenie widoku i zmiana źródła danych na notatki sceniczne oraz dodanie etapu przygotowawczego.

*   **Zmiana źródła danych:**
    *   W widoku Live (`/performances/[id]/live`) nie pobieramy już poszczególnych rekwizytów (starą metodą relacji obiektowej), lecz **elementy z checklisty notatki**.
    *   Wyświetlamy bulletpointy, które użytkownik może "odhaczać" w trakcie spektaklu.
*   **Sekcja "Przed spektaklem":**
    *   W edycji spektaklu/notatki dodać dedykowaną, ustrukturyzowaną sekcję "Przed spektaklem" (lista zadań: przygotować, sprawdzić, włączyć).
*   **Zachowanie Live View dla sekcji "Przed spektaklem":**
    *   Wyświetlane jako pierwszy etap (przed Aktem 1).
    *   **Brak timera** – czas nie jest liczony.
    *   **Brak ostrzeżenia** o rozpoczęciu (czerwony ekran/alerty wyłączone dla tego etapu).
*   **Interfejs:**
    *   Dodać wyraźne miejsce na **nazwę sceny** (tytuł) w widoku Live.

## 2. Przebudowa Zarządzania Przedmiotami (Uproszczona Lista Rekwizytów)

**Cel:** Odejście od "Magazynu" poszczególnych sztuk na rzecz prostej listy tekstowej (checkpoint) przypisanej do spektaklu.

*   **Globalny Magazyn Items (OUT):**
    *   Usuwamy sekcję `/items` oraz globalne dodawanie pojedynczych przedmiotów do magazynu.
    *   Usuwamy relację "Magazyn Globalny" <-> "Spektakl".
*   **Nowa Lista Rekwizytów Spektaklu (IN):**
    *   Tworzymy prostą listę rekwizytów dla każdego spektaklu (Tabela `performance_props` lub podobna).
    *   **Struktura:** Prosta nazwa tekstowa (np. "Czerwony kubek", "Stary pistolet") + status checkboxa.
    *   **Cel:** Używana przy powracaniu do spektaklu ("Czy mamy wszystko?"), przy zakupach oraz generowaniu PDF.
*   **Formularze dodawania:**
    *   Szybki "Bulk Insert": Pole tekstowe pozwalające wpisać wiele przedmiotów (jeden pod drugim) i dodać je naraz.
    *   Intuicyjne usuwanie/odhaczanie.
*   **Zarządzanie Grupami:**
    *   Nadal wykorzystujemy Grupy do ogólnej kategoryzacji (np. Szybkie dodawanie grup przez AI Vision), ale nie łączymy ich sztywno z pojedynczymi przedmiotami w bazie.

## 3. Generator Etykiet (Standalone)

**Cel:** Proste narzędzie do druku etykiet, niezależne od bazy danych.

*   **Nowy moduł:** `/tools/label-generator` (lub podobny).
*   **Formularz (niezależny od DB):**
    *   Pola tekstowe (Tytuł, Opis, Uwagi).
    *   Wybór rozmiaru papieru: **A6, A5, A4**.
    *   Konfiguracja powtórzeń:
        *   "Ile razy powtórzyć etykietę".
        *   Opcja "Wypełnij całą stronę".
*   **Generowanie:**
    *   Generowanie PDF po stronie klienta lub lekkie API, bez pobierania danych z bazy.

## 4. Search & AI Assistant

**Cel:** "Odtłuszczenie" wyszukiwarki i zmiana paradygmatu AI.

*   **Search Bar:**
    *   Usunięcie mechanizmów AI ("Smart Search", "Hybrid Search") z głównego paska wyszukiwania. Pozostawienie szybkiego wyszukiwania tekstowego (FTS).
*   **Nowa koncepcja asystenta:**
    *   AI przesunięte na "daleki plan" jako zarządca/asystent (MCP/Agent).

## Kolejność Wdrażania

1.  **Refactor Items (Simplification):**
    *   Transformacja tabeli `items` -> `performance_props` (lokalna lista tekstowa dla spektaklu).
    *   Usunięcie globalnego widoku `/items`.
    *   Stworzenie formularza "Szybkiego dodawania listy" (multiline text -> lista items).
2.  **Live View & Notes:**
    *   Dostosowanie Live View do pobierania danych z nowej listy/notatek.
    *   Dodać sekcję "Przed spektaklem".
3.  **Generator Etykiet:** Niezależne narzędzie.
4.  **Search & AI Clean up.**
