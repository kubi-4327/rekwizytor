# Plan Integracji AI w Rekwizytorium

**Data utworzenia:** 2024-11-24  
**Status:** Do implementacji  
**Priorytet:** Wysoki

---

## 🎯 Cel

Dodanie inteligentnych funkcji AI do aplikacji Rekwizytorium:
1. **Fast Add z AI** - automatyczna analiza zdjęć rekwizytów
2. **Smart Search** - inteligentne wyszukiwanie semantyczne z kontekstem

---

## 💰 Analiza Kosztów

### Wybrane API: **Google Gemini 1.5 Flash**

**Dlaczego Gemini?**
- ✅ Najtańsze rozwiązanie na rynku
- ✅ Darmowy Free Tier (1500 zapytań/dzień)
- ✅ Świetna jakość rozpoznawania obrazów
- ✅ Szybkie (~1-2s na zapytanie)

### Szacowane koszty miesięczne:

| Funkcja | Użycie | Koszt |
|---------|--------|-------|
| **Fast Add** (analiza zdjęć) | 1000 zdjęć | ~$0.02-0.08 |
| **Smart Search** (wyszukiwanie) | 1000 zapytań | ~$0.02-0.05 |
| **Embeddings** (generowanie) | 1000 przedmiotów | ~$0 (Free Tier) |
| **RAZEM miesięcznie** | Intensywne użycie | **~$0.10-0.15** |

**Wniosek:** Praktycznie darmowe przy normalnym użytkowaniu dzięki Free Tier.

---

## 🏗️ Architektura Rozwiązania

### 1. Fast Add z AI (Analiza Zdjęć)

**Przepływ:**
```
1. Użytkownik robi zdjęcie rekwizytu
   ↓
2. Kompresja obrazu do 1024px (oszczędność kosztów + szybkość)
   ↓
3. Upload do Supabase Storage
   ↓
4. Gemini Vision analizuje zdjęcie:
   - Nazwa przedmiotu
   - Szczegółowy opis (materiał, kolor, styl, epoka)
   - Sugerowane tagi
   - Ocena stanu
   - Confidence score (0-1)
   ↓
5. Walidacja confidence (odrzucenie złych zdjęć)
   ↓
6. Generowanie embeddingu z pełnego opisu
   ↓
7. Zapis do bazy jako "draft"
   ↓
8. Użytkownik weryfikuje/edytuje w widoku Review
```

**Obsługa trudnych przypadków:**
- **Bałagan w tle:** AI skupia się na głównym przedmiocie (prompt)
- **Wiele przedmiotów:** AI wykrywa wszystkie, użytkownik wybiera
- **Złe zdjęcie:** Odrzucenie jeśli confidence < 0.7

---

### 2. Smart Search (Inteligentne Wyszukiwanie)

**Podejście hybrydowe: Embeddings + AI Agent**

#### Faza A: Przygotowanie (jednorazowe)
```sql
-- Dodanie kolumny embedding do tabeli items
ALTER TABLE items ADD COLUMN embedding vector(768);

-- Indeks dla szybkiego wyszukiwania
CREATE INDEX ON items USING ivfflat (embedding vector_cosine_ops);

-- Funkcja wyszukiwania podobieństwa
CREATE FUNCTION match_items(query_embedding, threshold, count)
```

#### Faza B: Wyszukiwanie (przy każdym zapytaniu)
```
1. Użytkownik wpisuje: "walizka do sztuki z lat 90"
   ↓
2. Generowanie embeddingu zapytania
   ↓
3. Supabase znajduje TOP 20 kandydatów (cosine similarity)
   ↓
4. AI Agent analizuje kandydatów z pełnym kontekstem:
   - Opisy tekstowe
   - Zdjęcia (jeśli dostępne)
   - Lokalizacje
   ↓
5. AI wybiera 3-5 najlepszych dopasowań
   ↓
6. AI wyjaśnia DLACZEGO każdy przedmiot pasuje lub nie
```

**Przykładowa odpowiedź:**
> **Znalazłem 3 walizki pasujące do lat 90:**
> 
> 1. ✅ **Walizka brązowa vintage** (Strych, sekcja B)  
>    Styl retro z lat 70-80, idealny do lat 90
> 
> 2. ⚠️ **Walizka czarna skórzana** (Magazyn A)  
>    Elegancka, może być za nowoczesna
> 
> 3. ❌ **Walizka plastikowa** (Biuro)  
>    Zbyt nowoczesna (lata 2000+)

---

## 📋 Plan Implementacji

### Krok 1: Przygotowanie środowiska
- [ ] Utworzenie konta Google AI Studio
- [ ] Pobranie klucza API Gemini
- [ ] Dodanie `GEMINI_API_KEY` do `.env.local`
- [ ] Instalacja pakietu: `npm install @google/generative-ai`

### Krok 2: Migracja bazy danych
- [ ] Włączenie rozszerzenia `pgvector` w Supabase
- [ ] Dodanie kolumny `embedding vector(768)` do tabeli `items`
- [ ] Utworzenie indeksu IVFFLAT
- [ ] Utworzenie funkcji `match_items()`

### Krok 3: Utilities
- [ ] `utils/gemini.ts` - klient Gemini AI
- [ ] `utils/embeddings.ts` - generowanie embeddingów
- [ ] `utils/image-processing.ts` - kompresja zdjęć

### Krok 4: Fast Add
- [ ] Aktualizacja `app/actions/fast-mode.ts`:
  - Kompresja zdjęć przed uploadem
  - Wywołanie Gemini Vision API
  - Walidacja confidence score
  - Generowanie embeddingu
- [ ] Aktualizacja `components/items/FastAddForm.tsx`:
  - Feedback dla użytkownika (progress)
  - Obsługa błędów (złe zdjęcie)

### Krok 5: Smart Search
- [ ] `app/actions/smart-search.ts`:
  - Generowanie embeddingu zapytania
  - Wywołanie `match_items()`
  - AI Agent z kontekstem
- [ ] `components/items/SmartSearchBar.tsx`:
  - Input z sugestiami
  - Wyświetlanie odpowiedzi AI
  - Linki do znalezionych przedmiotów

### Krok 6: Migracja istniejących danych
- [ ] Skrypt do generowania embeddingów dla istniejących przedmiotów
- [ ] Opcjonalnie: Re-analiza zdjęć AI (jeśli są)

### Krok 7: Testy i optymalizacja
- [ ] Test Fast Add z różnymi typami zdjęć
- [ ] Test Smart Search z różnymi zapytaniami
- [ ] Monitoring kosztów API
- [ ] Optymalizacja promptów

---

## 🔧 Kluczowe Pliki do Utworzenia/Modyfikacji

### Nowe pliki:
```
utils/
  ├── gemini.ts              # Klient Gemini AI
  ├── embeddings.ts          # Generowanie embeddingów
  └── image-processing.ts    # Kompresja zdjęć

app/actions/
  └── smart-search.ts        # Inteligentne wyszukiwanie

components/items/
  └── SmartSearchBar.tsx     # UI dla Smart Search

supabase/migrations/
  └── YYYYMMDD_add_embeddings.sql  # Migracja pgvector
```

### Modyfikowane pliki:
```
app/actions/fast-mode.ts           # Dodanie AI Vision
components/items/FastAddForm.tsx   # UI improvements
components/items/ItemsList.tsx     # Integracja Smart Search
.env.local                         # GEMINI_API_KEY
```

---

## 📊 Metryki Sukcesu

### Fast Add:
- ✅ >90% confidence score dla dobrych zdjęć
- ✅ <3s czas przetwarzania na zdjęcie
- ✅ <5% odrzuconych zdjęć (złe oświetlenie/ostrość)

### Smart Search:
- ✅ >80% trafność dla zapytań kontekstowych ("lata 90", "elegancki")
- ✅ <1s czas wyszukiwania
- ✅ Użytkownik znajduje przedmiot w <3 krokach

### Koszty:
- ✅ <$1/miesiąc przy normalnym użytkowaniu
- ✅ <$5/miesiąc przy intensywnym użytkowaniu

---

## 🚨 Potencjalne Problemy i Rozwiązania

### Problem 1: Przekroczenie Free Tier
**Rozwiązanie:** 
- Monitoring użycia w Google AI Studio
- Alert przy 80% limitu
- Fallback na prostsze wyszukiwanie tekstowe

### Problem 2: Złe rozpoznanie przedmiotów
**Rozwiązanie:**
- Walidacja confidence score
- Możliwość edycji przez użytkownika
- Feedback loop (użytkownik poprawia → AI uczy się)

### Problem 3: Wolne generowanie embeddingów
**Rozwiązanie:**
- Batch processing (100 przedmiotów naraz)
- Background job (Supabase Edge Functions)
- Cache embeddingów

### Problem 4: Brak zdjęć dla starych przedmiotów
**Rozwiązanie:**
- Smart Search działa też bez zdjęć (tylko tekst)
- Stopniowe dodawanie zdjęć przy okazji użycia
- Opcjonalna kampania "Zrób zdjęcia wszystkiemu"

---

## 🎓 Dokumentacja dla Użytkownika

### Fast Add - Najlepsze Praktyki:
1. **Dobre oświetlenie** - naturalne światło lub lampa
2. **Zbliżenie** - przedmiot powinien zajmować >50% kadru
3. **Wyraźne tło** - unikaj nadmiernego bałaganu
4. **Ostrość** - poczekaj na autofocus

### Smart Search - Przykłady:
- ❌ "walizka" → Za ogólne
- ✅ "walizka vintage do lat 90" → Kontekst epoki
- ✅ "elegancka walizka skórzana" → Kontekst stylu
- ✅ "coś do pisania retro" → Semantyczne

---

## 📅 Timeline

| Etap | Czas | Status |
|------|------|--------|
| Krok 1-2: Setup + Migracja | 1 dzień | ⏳ Pending |
| Krok 3-4: Fast Add | 2 dni | ⏳ Pending |
| Krok 5: Smart Search | 2 dni | ⏳ Pending |
| Krok 6: Migracja danych | 1 dzień | ⏳ Pending |
| Krok 7: Testy | 1 dzień | ⏳ Pending |
| **RAZEM** | **~7 dni** | |

---

## 🔗 Przydatne Linki

- [Google AI Studio](https://aistudio.google.com/app/apikey) - Klucz API
- [Gemini API Docs](https://ai.google.dev/gemini-api/docs) - Dokumentacja
- [Supabase pgvector](https://supabase.com/docs/guides/ai/vector-columns) - Vector search
- [Gemini Pricing](https://ai.google.dev/pricing) - Cennik

---

## ✅ Checklist przed startem

- [ ] Klucz API Gemini pobrany
- [ ] `.env.local` skonfigurowany
- [ ] Backup bazy danych wykonany
- [ ] Plan testowania przygotowany
- [ ] Użytkownik poinformowany o nowych funkcjach

---

**Ostatnia aktualizacja:** 2024-11-24  
**Autor:** AI Assistant + Kuba
