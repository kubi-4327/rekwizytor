# Automatyczne Odświeżanie Terminów Spektakli - Vercel Cron

## Przegląd

System automatycznie sprawdza strony teatrów i aktualizuje terminy spektakli raz dziennie o 3:00 UTC (4:00 czasu polskiego zimą, 5:00 latem).

## Architektura

1. **Vercel Cron** - scheduler wywoływany automatycznie przez Vercel
2. **API Route** (`/api/cron/refresh`) - endpoint obsługujący żądanie crona
3. **Server Action** (`refreshAllPerformances`) - logika scrapingu i aktualizacji

## Deployment

### 1. Dodaj zmienną środowiskową w Vercel

1. Wejdź na https://vercel.com/dashboard
2. Wybierz swój projekt
3. Przejdź do **Settings** → **Environment Variables**
4. Dodaj nową zmienną:
   - **Name**: `CRON_SECRET`
   - **Value**: Wygeneruj długi, losowy ciąg znaków (np. `openssl rand -base64 32`)
   - **Environment**: Production, Preview, Development (zaznacz wszystkie)
5. Kliknij **Save**

### 2. Deploy do Vercel

```bash
git add .
git commit -m "Add Vercel Cron for performance refresh"
git push
```

Vercel automatycznie wykryje plik `vercel.json` i skonfiguruje cron job.

### 3. Weryfikacja

Po deploymencie:

1. Wejdź w **Dashboard Vercel** → Twój projekt → **Cron Jobs**
2. Powinieneś zobaczyć: `refresh-performances-daily` zaplanowany na `0 3 * * *`

## Testowanie

### Test lokalny (ręczny)

```bash
# Ustaw zmienną środowiskową lokalnie
export CRON_SECRET="twoj-secret-z-vercel"

# Wywołaj endpoint
curl -X GET http://localhost:3000/api/cron/refresh \
  -H "Authorization: Bearer twoj-secret-z-vercel"
```

### Test na produkcji

```bash
# Pobierz CRON_SECRET z Vercel Dashboard
curl -X GET https://twoja-domena.vercel.app/api/cron/refresh \
  -H "Authorization: Bearer twoj-secret-z-vercel"
```

Powinieneś otrzymać odpowiedź JSON:

```json
{
  "success": true,
  "timestamp": "2026-02-02T03:00:00.000Z",
  "refreshed": 2,
  "details": [
    {
      "title": "Hamlet",
      "success": true,
      "added": 3
    }
  ]
}
```

## Monitorowanie

### Logi w Vercel

1. Dashboard → Twój projekt → **Logs**
2. Filtruj po `/api/cron/refresh`
3. Sprawdź logi z godziny 3:00 UTC

### Logi w kodzie

Endpoint automatycznie loguje:

- `[CRON] Starting performance refresh at [timestamp]`
- `[CRON] Performance refresh completed: { success, refreshed, totalProcessed }`
- `[CRON] Performance refresh failed: [error]` (w przypadku błędu)

## Jak to działa?

1. **Vercel Cron** wywołuje endpoint `/api/cron/refresh` codziennie o 3:00 UTC
2. Endpoint weryfikuje nagłówek `Authorization` (zabezpieczenie przed nieautoryzowanym dostępem)
3. Wywołuje funkcję `refreshAllPerformances()`, która:
   - Pobiera wszystkie spektakle z wypełnionym `source_url`
   - Dla każdego spektaklu:
     - Scrapuje stronę teatru
     - Wyciąga daty spektakli
     - Porównuje z istniejącymi datami w bazie
     - Dodaje tylko nowe terminy
4. Zwraca raport z wynikami

## Zarządzanie

### Zmiana harmonogramu

Edytuj `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/refresh",
      "schedule": "0 2 * * *" // Zmień na 2:00 UTC
    }
  ]
}
```

Następnie:

```bash
git add vercel.json
git commit -m "Update cron schedule"
git push
```

### Tymczasowe wyłączenie

Usuń lub zakomentuj wpis w `vercel.json`:

```json
{
  "crons": []
}
```

### Ręczne wywołanie

Możesz zawsze wywołać endpoint ręcznie przez curl (patrz sekcja Testowanie).

## Troubleshooting

### Problem: Cron nie wykonuje się

1. Sprawdź czy `vercel.json` jest w głównym katalogu projektu
2. Sprawdź czy deployment się powiódł (Dashboard → Deployments)
3. Sprawdź logi w Dashboard → Logs

### Problem: Endpoint zwraca 401 Unauthorized

- Sprawdź czy `CRON_SECRET` jest ustawiony w Vercel
- Upewnij się, że używasz poprawnego tokena w nagłówku `Authorization`

### Problem: Timeout

- Vercel Hobby ma limit 60 sekund
- Jeśli masz dużo spektakli, może przekroczyć czas
- Rozważ przetwarzanie w partiach lub upgrade do Pro

### Problem: Scraping nie działa

- Sprawdź logi - może strona teatru zmieniła strukturę HTML
- Sprawdź czy `source_url` w bazie jest poprawny
- Przetestuj scraping ręcznie na konkretnym URL

## Bezpieczeństwo

- Endpoint wymaga nagłówka `Authorization` z `CRON_SECRET`
- `CRON_SECRET` jest przechowywany bezpiecznie w zmiennych środowiskowych Vercel
- Tylko Vercel Cron (i Ty z poprawnym tokenem) może wywołać endpoint

## Koszty

Na planie Vercel Hobby:

- Cron Jobs: **1 zadanie dziennie = DARMOWE**
- Function Invocations: Wlicza się w miesięczny limit (100GB-Hours)
- Jedno wywołanie dziennie = znikomy koszt

## Limity Vercel Hobby

- **Częstotliwość**: Max 1 raz dziennie
- **Precyzja**: ±59 minut (może wystartować między 3:00 a 3:59)
- **Timeout**: 60 sekund
- **Liczba cronów**: 100 per projekt

Jeśli potrzebujesz więcej, rozważ upgrade do Vercel Pro lub użycie GitHub Actions.
