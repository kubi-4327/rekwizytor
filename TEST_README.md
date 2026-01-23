# 🧪 Środowisko testowe - Przegląd

## 📚 Dokumentacja

- **[QUICKSTART.md](./QUICKSTART.md)** - Szybki start (2 minuty)
- **[TESTING.md](./TESTING.md)** - Pełna dokumentacja z przykładami

## 🚀 Podstawowe komendy

```bash
# Uruchom PocketBase
npm run test:start

# Zainicjalizuj dane testowe
npm run test:init

# Zatrzymaj
npm run test:stop
```

## 🎯 Po co to?

Bezpieczne środowisko do testowania różnych API embedingowych:
- ✅ **Gemini** (obecny system)
- ✅ **OpenAI** (text-embedding-3-small/large)
- ✅ **Cohere** (embed-multilingual-v3)
- ✅ Dowolne inne API

Wszystko bez wpływu na produkcyjną bazę Supabase!

## 📦 Co zostało przygotowane?

- ✅ Docker Compose z PocketBase
- ✅ Skrypty zarządzania (start/stop/clean)
- ✅ Helper do zarządzania danymi
- ✅ Przykładowe dane testowe
- ✅ Dokumentacja z przykładami kodu

## 💰 Koszty są minimalne

| API | Cena / 1M tokenów | 1000 itemów |
|-----|-------------------|-------------|
| Gemini | $0.00001 | ~$0.01 |
| OpenAI small | $0.02 | ~$0.02 |
| OpenAI large | $0.13 | ~$0.13 |

**Wniosek:** Wybieraj według jakości, nie ceny! 💯

---

**Gotowy?** Przeczytaj [QUICKSTART.md](./QUICKSTART.md) aby zacząć!
