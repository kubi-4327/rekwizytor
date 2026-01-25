# 🔄 Migracja danych: Supabase → PocketBase

Przewodnik krok po kroku jak przenieść dane z produkcyjnej bazy Supabase do testowego PocketBase.

## 🎯 Cel

Skopiować dane produkcyjne (items, groups, embedingi) do lokalnego PocketBase, aby móc bezpiecznie testować różne API embedingowe bez wpływu na produkcję.

---

## 📋 Wymagania

- ✅ Docker Desktop uruchomiony
- ✅ PocketBase uruchomiony (`npm run test:start`)
- ✅ Klucze API w `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `GOOGLE_AI_API_KEY` (dla Gemini)
  - `OPENAI_API_KEY` (opcjonalnie, dla OpenAI)
  - `COHERE_API_KEY` (opcjonalnie, dla Cohere)

---

## 🚀 Szybki start

### 1. Eksport z Supabase

```bash
# Eksportuj wszystkie dane
npm run export:supabase

# Lub tylko 10 itemów (test)
npx tsx scripts/export-from-supabase.ts --limit=10
```

**Co się dzieje:**
- Pobiera dane z tabel `items`, `groups`, `locations`
- Wyciąga embedingi z `groups.embeddings` (JSONB)
- Łączy dane (JOIN)
- Zapisuje do `data/supabase-export.json`

**Output:**
```
📦 Eksportowanie danych z Supabase...

✓ Pobrano 150 przedmiotów
✓ Przekształcono dane
  - Przedmiotów z embedingami: 120/150

✅ Eksport zakończony!
📁 Zapisano do: /path/to/data/supabase-export.json

📊 Statystyki:
   Wszystkich przedmiotów: 150
   Z embedingami: 120
   Bez embedingów: 30
```

### 2. Uruchom PocketBase

```bash
npm run test:start
```

### 3. Import do PocketBase

```bash
# Pierwszy import
npm run import:pocketbase

# Aktualizacja istniejących danych
npx tsx scripts/import-to-pocketbase.ts --update
```

**Co się dzieje:**
- Tworzy kolekcje `test_items` i `test_embeddings_comparison`
- Importuje dane z `data/supabase-export.json`
- Zachowuje oryginalne ID (UUID)

**Output:**
```
🚀 Import danych do PocketBase

📁 Załadowano eksport z: 19.01.2026, 18:00
   Przedmiotów: 150
   Z embedingami: 120

📦 Tworzenie kolekcji w PocketBase...
  ✓ Kolekcja "test_items" utworzona
  ✓ Kolekcja "test_embeddings_comparison" utworzona

📥 Importowanie 150 przedmiotów...
  Zaimportowano: 150/150

✅ Import zakończony!

📊 Statystyki:
   Zaimportowano: 150
   Pominięto: 0
```

### 4. Porównaj embedingi

```bash
# Porównaj z OpenAI
npm run test:compare -- --api=openai

# Porównaj z Gemini (test)
npm run test:compare -- --api=gemini --limit=10

# Porównaj z Cohere
npm run test:compare -- --api=cohere
```

**Co się dzieje:**
- Dla każdego itemu generuje embedding z wybranego API
- Porównuje z trzema embedingami Gemini (identity, physical, context)
- Oblicza cosine similarity
- Zapisuje wyniki do `test_embeddings_comparison`

**Output:**
```
🔬 Porównywanie embedingów: Gemini vs OPENAI

📊 Znaleziono 120 przedmiotów z embedingami Gemini

  Processing: Czerwona walizka
    ✓ Similarity: 87.3% (avg)
  Processing: Niebieska torba
    ✓ Similarity: 91.2% (avg)
  ...

✅ Porównanie zakończone!

📊 Statystyki:
   Przetworzono: 120
   Błędy: 0

💡 Zobacz wyniki w PocketBase: http://localhost:8090/_/
```

---

## 📊 Analiza wyników

### Otwórz PocketBase Admin

http://localhost:8090/_/

**Login:**
- Email: `admin@test.local`
- Hasło: `admin123456`

### Kolekcja: test_items

Zawiera wszystkie zaimportowane przedmioty z trzema embedingami Gemini:
- `gemini_embedding_identity` (768 dim)
- `gemini_embedding_physical` (768 dim)
- `gemini_embedding_context` (768 dim)

### Kolekcja: test_embeddings_comparison

Zawiera wyniki porównań:
- `similarity_identity` - podobieństwo do embedding_identity
- `similarity_physical` - podobieństwo do embedding_physical
- `similarity_context` - podobieństwo do embedding_context
- `similarity_average` - średnia z trzech

**Przykładowe zapytanie:**
```sql
-- Sortuj po średnim podobieństwie
SELECT * FROM test_embeddings_comparison 
ORDER BY similarity_average DESC
```

---

## 🔬 Przykłady użycia

### Test 1: Małe próbki (szybko)

```bash
# Export 10 itemów
npx tsx scripts/export-from-supabase.ts --limit=10

# Import
npm run import:pocketbase

# Porównaj z OpenAI
npm run test:compare -- --api=openai --limit=10
```

### Test 2: Pełna migracja

```bash
# Export wszystkich danych
npm run export:supabase

# Import
npm run import:pocketbase

# Porównaj z różnymi API
npm run test:compare -- --api=openai
npm run test:compare -- --api=cohere
```

### Test 3: Aktualizacja danych

```bash
# Odśwież export
npm run export:supabase

# Zaktualizuj PocketBase
npx tsx scripts/import-to-pocketbase.ts --update
```

---

## 🧹 Czyszczenie

### Usuń tylko dane z PocketBase

```bash
npm run test:reset
```

### Usuń wszystko (kontenery + dane)

```bash
npm run test:clean
```

### Usuń plik eksportu

```bash
rm data/supabase-export.json
```

---

## 🐛 Rozwiązywanie problemów

### Błąd: "PocketBase nie jest uruchomiony"

```bash
npm run test:start
```

### Błąd: "Nie znaleziono pliku eksportu"

```bash
npm run export:supabase
```

### Błąd: "Missing Supabase credentials"

Sprawdź `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

### Błąd: "OPENAI_API_KEY not found"

Dodaj do `.env.local`:
```env
OPENAI_API_KEY=sk-xxx...
```

---

## 📈 Metryki do analizy

Po porównaniu embedingów możesz analizować:

### 1. Średnie podobieństwo

```sql
SELECT 
  test_api_name,
  AVG(similarity_average) as avg_similarity,
  MIN(similarity_average) as min_similarity,
  MAX(similarity_average) as max_similarity
FROM test_embeddings_comparison
GROUP BY test_api_name
```

### 2. Który embedding Gemini jest najbardziej podobny?

```sql
SELECT 
  item_name,
  CASE 
    WHEN similarity_identity > similarity_physical 
      AND similarity_identity > similarity_context THEN 'identity'
    WHEN similarity_physical > similarity_context THEN 'physical'
    ELSE 'context'
  END as best_match
FROM test_embeddings_comparison
```

### 3. Najlepsze i najgorsze dopasowania

```sql
-- Najlepsze
SELECT item_name, similarity_average 
FROM test_embeddings_comparison 
ORDER BY similarity_average DESC 
LIMIT 10

-- Najgorsze
SELECT item_name, similarity_average 
FROM test_embeddings_comparison 
ORDER BY similarity_average ASC 
LIMIT 10
```

---

## 💡 Wskazówki

- **Zacznij od małej próbki** (`--limit=10`) aby przetestować workflow
- **Rate limiting** - skrypt ma wbudowane opóźnienia (100ms między requestami)
- **Koszty** - pamiętaj że każde wywołanie API kosztuje (choć niewiele)
- **Backup** - folder `data/` jest w gitignore, ale możesz go skopiować

---

**Potrzebujesz pomocy?** Zobacz [TESTING.md](./TESTING.md) lub [TEST_README.md](./TEST_README.md)
