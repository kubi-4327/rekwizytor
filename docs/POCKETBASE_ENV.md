# Zmienne środowiskowe dla PocketBase

Dodaj do pliku `.env.local`:

```bash
# PocketBase Configuration
NEXT_PUBLIC_POCKETBASE_URL=http://localhost:8090
POCKETBASE_URL=http://localhost:8090
POCKETBASE_ADMIN_EMAIL=admin@test.local
POCKETBASE_ADMIN_PASSWORD=admin123456
```

**Uwaga:** Te same zmienne dodaj też do `.env.test.example` jako dokumentację.

## Uruchomienie PocketBase

```bash
# Start PocketBase
npm run test:start

# Utwórz admina (one-time)
docker exec -it rekwizytor-pocketbase-test /usr/local/bin/pocketbase superuser upsert admin@test.local admin123456
```
