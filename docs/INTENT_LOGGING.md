# Intent Classification Logging - Disabled During Development

## Status

🔕 **Logowanie do Supabase WYŁĄCZONE** podczas development/testów

## Jak to działa

### Warunek włączenia logowania:
```typescript
const isProduction = process.env.NODE_ENV === 'production' 
                  && process.env.ENABLE_INTENT_LOGGING === 'true'
```

### Obecnie (development):
- `NODE_ENV` = `development` (domyślnie w Next.js dev)
- `ENABLE_INTENT_LOGGING` = nie ustawione
- **Wynik:** Logowanie WYŁĄCZONE ✅

### W produkcji (gdy będzie gotowe):
Dodaj do `.env.production`:
```bash
NODE_ENV=production
ENABLE_INTENT_LOGGING=true
```

## Dlaczego?

### Podczas testów:
- ❌ Nie chcemy zużywać limitów Supabase
- ❌ Dane testowe (wygenerowane przez AI) nie są wartościowe do uczenia
- ❌ Setki/tysiące testów = niepotrzebne zapisy

### W produkcji:
- ✅ Prawdziwe zapytania użytkowników
- ✅ Wartościowe dane do pattern extraction
- ✅ Auto-rozszerzanie słownika keywords

## Konsola

Podczas testów zobaczysz:
```
🔕 [INTENT] Skipping Supabase logging (dev/test mode)
```

## Włączenie w przyszłości

Gdy aplikacja będzie gotowa do produkcji:

1. Ustaw zmienne środowiskowe:
```bash
# .env.production
ENABLE_INTENT_LOGGING=true
```

2. Deploy do produkcji

3. Logowanie automatycznie się włączy

## Tabele Supabase

Tabele pozostają w Supabase, ale **nie są używane** do czasu włączenia:
- `intent_keywords` - gotowe do użycia
- `intent_classification_logs` - puste, czeka na produkcję

Wszystko bezpieczne! 🛡️
