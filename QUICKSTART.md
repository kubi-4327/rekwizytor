# 🎯 Quick Start - Środowisko testowe

## 1. Uruchom Docker Desktop

Upewnij się, że Docker Desktop jest uruchomiony.

## 2. Uruchom PocketBase

```bash
npm run test:start
```

Zobaczysz:
```
✅ PocketBase uruchomiony!

📍 Dostępne serwisy:
   PocketBase Admin: http://localhost:8090/_/
   PocketBase API:   http://localhost:8090/api/

📝 Domyślne dane logowania:
   Email:    admin@test.local
   Hasło:    admin123456
```

## 3. Zainicjalizuj dane

```bash
npm run test:init
```

## 4. Otwórz PocketBase

http://localhost:8090/_/

## 5. Testuj API embedingowe

Teraz możesz testować różne API:
- Gemini (obecny)
- OpenAI
- Cohere
- Inne

Zobacz przykłady w [TESTING.md](./TESTING.md)

## 6. Zatrzymaj gdy skończysz

```bash
npm run test:stop
```

---

**Pełna dokumentacja:** [TESTING.md](./TESTING.md)
