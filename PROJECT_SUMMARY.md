# Podsumowanie Projektu "Rekwizytor"

Poniżej znajduje się szczegółowa lista funkcjonalności, rozwiązań i zabezpieczeń wdrożonych w aplikacji. Zestawienie obejmuje pełne spektrum prac: od warstwy wizualnej, przez logikę biznesową, aż po zaawansowane integracje z AI i bezpieczeństwo.

## 1. Design i Doświadczenie Użytkownika (UX/UI)
*   **Nowoczesny Interfejs (Modern UI)**: Aplikacja została zaprojektowana w oparciu o estetykę "Dark Mode" (ciemny motyw), co jest kluczowe w warunkach pracy teatralnej (kulisy, reżyserka). Użyto palety kolorów `bg-[#1a1a1a]` oraz `bg-[#2a2a2a]` dla zapewnienia czytelności i elegancji.
*   **Animacje i Interakcje**:
    *   Wykorzystanie biblioteki `Framer Motion` do tworzenia płynnych przejść między stronami i elementami interfejsu.
    *   Animowany pasek boczny (Sidebar) z efektem "pływającego" zaznaczenia aktywnej sekcji.
*   **Responsywność (RWD)**: Interfejs dostosowuje się do urządzeń mobilnych i desktopowych. Wdrożono specjalne poprawki dla widoku "Fast Add" na telefonach, aby kluczowe przyciski nie były zasłaniane.
*   **System Ikon i Logotypów**:
    *   Zaktualizowane, spójne logotypy aplikacji w różnych formatach (favicon, pełne logo, logo z podpisem).
    *   Ujednolicony zestaw ikon (Lucide React) ułatwiający nawigację.
*   **Wielojęzyczność (i18n)**: Pełne wsparcie dla języka polskiego i angielskiego, z automatycznym wykrywaniem preferencji użytkownika.

## 2. Funkcjonalności Systemowe
*   **Zarządzanie Rekwizytami (Items)**:
    *   Pełna ewidencja przedmiotów z możliwością dodawania zdjęć i opisów.
    *   Automatyczne generowanie miniaturek dla optymalizacji ładowania.
    *   Śledzenie statusu przedmiotów (dostępny, w użyciu, naprawa itp.).
*   **Zarządzanie Spektaklami (Performances)**:
    *   Tworzenie harmonogramów i list rekwizytów dla konkretnych przedstawień.
    *   Obsługa plakatów i materiałów wizualnych spektakli.
*   **Grupy i Magazynowanie**:
    *   Hierarchiczna struktura grup (możliwość tworzenia podgrup).
    *   **Generator Etykiet PDF**: Funkcja tworzenia gotowych do druku etykiet na magazynowe pojemniki. Etykiety zawierają nazwę grupy, lokalizację oraz unikalny kod QR.
    *   Obsługa polskich znaków w PDF dzięki osadzeniu czcionki Roboto.
*   **Notatki i Listy Kontrolne**:
    *   Zaawansowany edytor tekstu (Rich Text Editor oparty o Tiptap) do tworzenia notatek rekwizytorskich.
    *   Interaktywne listy kontrolne (Checklists) do weryfikacji stanu rekwizytów przed/po spektaklu.
*   **Kosz (Trash & Recovery)**:
    *   System bezpieczeństwa danych – usunięte elementy nie znikają od razu, lecz trafiają do "Kosza", skąd można je przywrócić.

## 3. Sztuczna Inteligencja (AI) – Integracja z Google Gemini
*   **Inteligentne Wyszukiwanie (Smart Search)**:
    *   Wykorzystanie technologii "embeddings" (wektorów) do zrozumienia kontekstu zapytania. Użytkownik może wpisać "coś czerwonego do siedzenia", a AI znajdzie "czerwony fotel", nawet jeśli w nazwie nie ma tych słów.
*   **Generowanie Treści**: Wsparcie AI przy tworzeniu opisów przedmiotów i kategoryzacji.
*   **Bezpieczeństwo AI (AI Safety)**:
    *   **Ochrona przed "Prompt Injection"**: Zaimplementowano filtry wykrywające i blokujące próby manipulacji modelem AI (np. komendy typu "zignoruj swoje instrukcje i zrób X").
    *   **Sanityzacja Danych**: Wszystkie dane wysyłane do i odbierane od AI są czyszczone z potencjalnie szkodliwego kodu (np. skryptów HTML/JS).
    *   **Walidacja Schematów (Zod)**: Odpowiedzi AI są ściśle weryfikowane pod kątem struktury danych, co zapobiega awariom aplikacji w przypadku "halucynacji" modelu.

## 4. Bezpieczeństwo i Administracja
*   **System Zatwierdzania Użytkowników**:
    *   Rejestracja nie daje automatycznego dostępu. Nowy użytkownik otrzymuje status "Oczekujący".
    *   Dedykowany panel dla Administratorów do zatwierdzania lub odrzucania nowych kont.
    *   Blokada dostępu do danych dla niezatwierdzonych kont.
*   **Row Level Security (RLS)**:
    *   Zabezpieczenie na poziomie bazy danych PostgreSQL. Nawet w przypadku błędu w aplikacji, baza danych sama pilnuje, aby użytkownik nie pobrał danych, do których nie ma prawa.
    *   Polityki bezpieczeństwa uwzględniające status użytkownika (zatwierdzony/odrzucony).
*   **Zarządzanie Hasłami**:
    *   Bezpieczny proces resetowania zapomnianego hasła (z wysyłką e-mail).
    *   Możliwość zmiany hasła przez zalogowanego użytkownika.

## 5. Zaplecze Techniczne (Backend & Tech Stack)
*   **Next.js 16 & React 19**: Wykorzystanie najnowszych, stabilnych wersji frameworków, zapewniających szybkość i bezpieczeństwo.
*   **Supabase**: Kompleksowa platforma backendowa obsługująca bazę danych, autoryzację i przechowywanie plików (Storage).
*   **TypeScript**: Cały kod napisany w języku TypeScript, co drastycznie zmniejsza ryzyko błędów w działaniu aplikacji.
