# 🧪 Środowisko testowe - PocketBase

Proste środowisko do testowania różnych API embedingowych (Gemini, OpenAI, itp.) bez wpływu na produkcyjną bazę Supabase.

## 🎯 Po co to?

- **Bezpieczne testy** - Nie ruszasz produkcyjnej bazy
- **Szybkie eksperymenty** - Łatwy reset danych
- **Porównania API** - Testuj różne modele embedingowe
- **Izolacja** - Wszystko w Docker, łatwe do usunięcia

## 🚀 Szybki start

### 1. Uruchom PocketBase

```bash
npm run test:start
```

### 2. Zainicjalizuj dane testowe

```bash
npm run test:init
```

### 3. Otwórz PocketBase Admin

http://localhost:8090/_/

**Login:**
- Email: `admin@test.local`
- Hasło: `admin123456`

### 4. Testuj różne API

Możesz teraz testować:
- **Gemini Embeddings** (obecny system)
- **OpenAI text-embedding-3-small**
- **Cohere embed-multilingual-v3.0**
- Lub dowolne inne API

### 5. Zatrzymaj gdy skończysz

```bash
npm run test:stop
```

---

## 📦 Dostępne komendy

### Zarządzanie środowiskiem
```bash
npm run test:start   # Uruchom PocketBase
npm run test:stop    # Zatrzymaj
npm run test:clean   # Usuń wszystkie dane
```

### Zarządzanie danymi
```bash
npm run test:setup   # Utwórz kolekcje
npm run test:seed    # Dodaj dane testowe
npm run test:reset   # Wyczyść dane
npm run test:init    # Setup + Seed (wszystko naraz)
```

---

## 🔧 Struktura danych testowych

PocketBase ma kolekcję `test_items` z polami:

```typescript
{
  name: string          // "Czerwona walizka"
  description: string   // "Duża czerwona walizka vintage..."
  embedding: number[]   // [0.123, 0.456, ...] - wektory z API
  metadata: object      // { color: "red", size: "large" }
}
```

---

## 💡 Przykład użycia

### Test 1: Gemini Embeddings

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'text-embedding-004' })

// Generuj embedding
const result = await model.embedContent("czerwona walizka")
const embedding = result.embedding.values

// Zapisz do PocketBase
await fetch('http://localhost:8090/api/collections/test_items/records', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: "Czerwona walizka",
    description: "...",
    embedding: embedding
  })
})
```

### Test 2: OpenAI Embeddings

```typescript
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const response = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: "czerwona walizka",
})

const embedding = response.data[0].embedding
// Zapisz do PocketBase...
```

### Test 3: Wyszukiwanie (Cosine Similarity)

```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
  return dotProduct / (magA * magB)
}

// Pobierz wszystkie itemy z PocketBase
const items = await fetch('http://localhost:8090/api/collections/test_items/records')
  .then(r => r.json())

// Wygeneruj embedding dla zapytania
const queryEmbedding = await generateEmbedding("szukam walizki")

// Znajdź najbardziej podobne
const results = items.items.map(item => ({
  name: item.name,
  similarity: cosineSimilarity(queryEmbedding, item.embedding)
}))

results.sort((a, b) => b.similarity - a.similarity)
console.log('Top 3:', results.slice(0, 3))
```

---

## 📊 Co możesz porównać?

| Aspekt | Jak zmierzyć |
|--------|--------------|
| **Dokładność** | Precision@K, Recall@K, MRR |
| **Koszty** | Cena za 1000 embedingów |
| **Szybkość** | Czas generowania |
| **Wymiary** | 384 vs 768 vs 1536 |

---

## 🗑️ Czyszczenie

```bash
# Usuń tylko dane (zachowaj kontenery)
npm run test:reset

# Usuń wszystko (kontenery + dane)
npm run test:clean
```

---

## 💰 Koszty różnych API (orientacyjnie)

| Model | Wymiary | Cena / 1M tokenów | Przykład (1000 itemów) |
|-------|---------|-------------------|------------------------|
| Gemini text-embedding-004 | 768 | $0.00001 | ~$0.01 |
| OpenAI text-embedding-3-small | 1536 | $0.02 | ~$0.02 |
| OpenAI text-embedding-3-large | 3072 | $0.13 | ~$0.13 |
| Cohere embed-multilingual-v3 | 1024 | $0.10 | ~$0.10 |

**Wniosek:** Koszty są minimalne, więc wybieraj według jakości, nie ceny! 💯

---

## 🔗 Przydatne linki

- [PocketBase Docs](https://pocketbase.io/docs/)
- [Gemini Embeddings](https://ai.google.dev/gemini-api/docs/embeddings)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [Cohere Embeddings](https://docs.cohere.com/docs/embeddings)
