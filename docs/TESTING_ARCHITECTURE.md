# 🏗️ Architektura testowa - Embedding & Search

```
┌─────────────────────────────────────────────────────────────┐
│                    ŚRODOWISKO TESTOWE                        │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐
│   Docker Host    │         │  Twoja Aplikacja │
│                  │         │                  │
│  ┌────────────┐  │         │  ┌────────────┐  │
│  │ PocketBase │◄─┼─────────┼──┤  Test      │  │
│  │ :8090      │  │  HTTP   │  │  Scripts   │  │
│  └────────────┘  │         │  └────────────┘  │
│                  │         │                  │
│  ┌────────────┐  │         │  ┌────────────┐  │
│  │  Ollama    │◄─┼─────────┼──┤ Embedding  │  │
│  │ :11434     │  │  HTTP   │  │ Generator  │  │
│  └────────────┘  │         │  └────────────┘  │
└──────────────────┘         └──────────────────┘
        │                            │
        │                            │
        ▼                            ▼
┌──────────────────┐         ┌──────────────────┐
│  Persistent      │         │  Test Results    │
│  Volumes         │         │  & Metrics       │
│                  │         │                  │
│  • pocketbase_   │         │  • Precision@K   │
│    data/         │         │  • Recall@K      │
│  • ollama_data/  │         │  • MRR           │
└──────────────────┘         └──────────────────┘
```

## 🔄 Workflow testowy

```
1. START
   │
   ├─► npm run test:start
   │   └─► Docker Compose uruchamia PocketBase + Ollama
   │
2. SETUP
   │
   ├─► npm run test:init
   │   ├─► Tworzy kolekcje w PocketBase
   │   └─► Seeduje dane testowe
   │
3. DOWNLOAD MODEL
   │
   ├─► docker exec -it rekwizytor-ollama ollama pull nomic-embed-text
   │   └─► Pobiera model embedingowy (384 wymiary)
   │
4. RUN TESTS
   │
   ├─► npm run test:embeddings
   │   ├─► Generuje embedingi dla wszystkich itemów
   │   ├─► Wykonuje zapytania testowe
   │   ├─► Oblicza podobieństwa (cosine similarity)
   │   └─► Wyświetla wyniki i metryki
   │
5. ANALYZE
   │
   ├─► Porównaj z obecnym systemem (Gemini)
   ├─► Oceń jakość wyników
   └─► Zmierz wydajność
   │
6. CLEANUP
   │
   ├─► npm run test:reset  (usuń dane)
   └─► npm run test:stop   (zatrzymaj kontenery)
```

## 📊 Porównanie systemów

| Aspekt | Gemini (obecny) | Ollama (test) |
|--------|----------------|---------------|
| **Wymiary** | 768 | 384 |
| **Koszt** | $0.00001/1K | Darmowy |
| **Latencja** | ~200ms | ~50ms (lokalnie) |
| **Offline** | ❌ | ✅ |
| **Prywatność** | Dane w chmurze | Dane lokalnie |

## 🎯 Cele testów

### 1. Jakość wyszukiwania
- [ ] Precision@1 > 90%
- [ ] Precision@5 > 80%
- [ ] MRR > 0.85

### 2. Wydajność
- [ ] Generowanie < 100ms/item
- [ ] Wyszukiwanie < 50ms
- [ ] Batch processing > 100 items/s

### 3. Skalowalność
- [ ] Test z 1000 itemów
- [ ] Test z 10000 itemów
- [ ] Zużycie pamięci < 2GB

## 🔬 Przykładowe testy

### Test 1: Dokładność wyszukiwania
```typescript
Query: "czerwona walizka vintage"
Expected: "Czerwona walizka" (rank 1)
Actual: ?
```

### Test 2: Wyszukiwanie semantyczne
```typescript
Query: "potrzebuję czegoś do podróży"
Expected: ["Czerwona walizka", "Niebieska torba"]
Actual: ?
```

### Test 3: Wyszukiwanie po atrybutach
```typescript
Query: "meble drewniane"
Expected: "Krzesło drewniane" (rank 1)
Actual: ?
```
