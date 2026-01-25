# ✅ Checklist Bezpieczeństwa - PRZED Publikacją Repo

**Data:** 2026-01-25  
**Repo:** kubi-4327/rekwizytor  
**Status:** 🟡 Do sprawdzenia

---

## 🔍 Automatyczne Sprawdzenie

### 1. .gitignore - ✅ OK!
```
✅ .env* - wszystkie pliki .env są ignorowane
✅ node_modules - ignorowane
✅ .next - ignorowane
✅ pocketbase_data - ignorowane
```

### 2. Historia Git - ✅ OK!
```
✅ Brak .env.local w historii
✅ Brak .env w historii
```

### 3. Hardcoded Secrets - ✅ OK!
```
✅ Brak "sk-" w kodzie (API keys)
```

---

## 📋 Ręczne Sprawdzenie (MUSISZ TO ZROBIĆ!)

### Krok 1: Sprawdź pliki testowe

**Masz duże pliki JSON:**
```bash
test_data_export.json (1.9 MB)
test_data_export_compact.json (1.1 MB)
migration_vectors.sql (1.3 MB)
```

**SPRAWDŹ czy zawierają:**
- [ ] Prawdziwe emaile użytkowników?
- [ ] Prawdziwe hasła (nawet zahashowane)?
- [ ] Prawdziwe dane osobowe?
- [ ] Prawdziwe dane biznesowe?

**Jak sprawdzić:**
```bash
# Otwórz i przejrzyj:
head -50 test_data_export.json
head -50 test_data_export_compact.json
head -50 migration_vectors.sql

# Szukaj wrażliwych danych:
grep -i "email" test_data_export.json | head -5
grep -i "password" test_data_export.json | head -5
grep -i "@" test_data_export.json | head -5
```

**Jeśli zawierają prawdziwe dane:**
```bash
# Dodaj do .gitignore:
echo "test_data_export*.json" >> .gitignore
echo "migration_vectors.sql" >> .gitignore

# Usuń z repo (jeśli już commitowane):
git rm --cached test_data_export.json
git rm --cached test_data_export_compact.json
git rm --cached migration_vectors.sql
git commit -m "chore: remove sensitive test data from repo"
```

---

### Krok 2: Sprawdź .env.example

**Upewnij się że NIE zawiera prawdziwych wartości:**

```bash
cat .env.example
```

**Powinno być:**
```bash
# ✅ DOBRZE - przykładowe wartości
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# ❌ ŹLE - prawdziwe wartości
NEXT_PUBLIC_SUPABASE_URL=https://rjxcpqxhkbfhedhhxbau.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### Krok 3: Sprawdź czy nie ma wrażliwych komentarzy

```bash
# Szukaj TODO z wrażliwymi info:
grep -r "TODO.*password" .
grep -r "TODO.*secret" .
grep -r "FIXME.*hack" .

# Szukaj komentarzy z credentials:
grep -r "// password:" .
grep -r "// token:" .
```

---

### Krok 4: Sprawdź pliki w supabase/

```bash
ls -la supabase/

# Sprawdź czy nie ma:
# - Dumpów produkcyjnej bazy
# - Prawdziwych migration z danymi
# - Backup files
```

---

### Krok 5: Sprawdź scripts/

```bash
ls -la scripts/

# Sprawdź czy skrypty nie zawierają:
# - Hardcoded credentials
# - Prawdziwych API keys
# - Connection strings z hasłami
```

---

## 🛡️ Rekomendowane Dodatki do .gitignore

**Dodaj te linie dla bezpieczeństwa:**

```bash
# Dodaj do .gitignore:
cat >> .gitignore << 'EOF'

# Test data (może zawierać wrażliwe dane)
test_data_export*.json
migration_vectors.sql
*_backup.sql
*_dump.sql

# Wandb (może zawierać dane eksperymentów)
wandb/

# Ollama data (może zawierać modele)
ollama_data/

# Temporary files
*.tmp
*.temp
.DS_Store
EOF
```

---

## ✅ Ostateczna Checklist

**PRZED kliknięciem "Make public":**

- [ ] Sprawdziłem `test_data_export.json` - nie ma wrażliwych danych
- [ ] Sprawdziłem `.env.example` - tylko przykładowe wartości
- [ ] Sprawdziłem `.env.local` - NIE jest w repo (git status)
- [ ] Sprawdziłem historię git - brak sekretów
- [ ] Sprawdziłem komentarze w kodzie - brak wrażliwych info
- [ ] Zaktualizowałem `.gitignore` - wszystkie wrażliwe pliki
- [ ] Sprawdziłem `supabase/` - brak dumpów produkcyjnych
- [ ] Sprawdziłem `scripts/` - brak hardcoded credentials
- [ ] Przeczytałem README - nie ma wrażliwych info

---

## 🚨 Co Zrobić Jeśli Znajdziesz Sekrety?

### Jeśli sekrety są TYLKO w .env.local:
✅ OK - ten plik jest w .gitignore i nie trafi do repo

### Jeśli sekrety są w COMMITACH:
❌ MUSISZ je usunąć z historii!

**Opcja 1 - Prosty sposób (jeśli mało commitów):**
```bash
# Usuń plik z historii
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.local" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (UWAGA: nadpisuje historię!)
git push origin --force --all
```

**Opcja 2 - BFG Repo Cleaner (polecam!):**
```bash
# Instalacja
brew install bfg

# Usuń plik z historii
bfg --delete-files .env.local

# Cleanup
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push
git push origin --force --all
```

**Opcja 3 - Zmień wszystkie sekrety:**
Jeśli sekrety wyciekły:
1. Zmień hasła w Supabase
2. Wygeneruj nowe API keys
3. Zaktualizuj `.env.local`
4. Usuń plik z historii (Opcja 1 lub 2)

---

## 🎯 Po Publikacji - Dodatkowe Zabezpieczenia

### 1. GitHub Security Features

**Włącz w Settings → Security:**
- [ ] Dependabot alerts (automatyczne!)
- [ ] Dependabot security updates
- [ ] Code scanning (GitHub Advanced Security)
- [ ] Secret scanning (automatyczne dla public!)

### 2. Branch Protection

**Settings → Branches → Add rule:**
```
Branch name pattern: main
☑ Require pull request reviews
☑ Require status checks (SonarCloud)
☑ Require branches to be up to date
```

### 3. Monitoring

**GitHub będzie automatycznie skanować:**
- ✅ Secrets (API keys, tokens)
- ✅ Vulnerabilities w dependencies
- ✅ Security issues w kodzie

**Jeśli coś znajdzie → dostaniesz email!**

---

## 💡 Best Practices

### DO:
✅ Używaj zmiennych środowiskowych (`.env.local`)
✅ Commituj `.env.example` (bez prawdziwych wartości)
✅ Używaj GitHub Secrets dla CI/CD
✅ Regularnie aktualizuj dependencies
✅ Monitoruj security alerts

### DON'T:
❌ Nigdy nie commituj `.env.local`
❌ Nigdy nie hardcode API keys w kodzie
❌ Nigdy nie commituj dumpów bazy danych
❌ Nigdy nie commituj prawdziwych danych użytkowników
❌ Nigdy nie ignoruj security alerts

---

## 📞 Gotowy do Publikacji?

**Jeśli wszystkie checkboxy są ✅:**

1. Idź na: https://github.com/kubi-4327/rekwizytor/settings
2. Scroll → Danger Zone → Change visibility
3. Make public
4. Potwierdź wpisując nazwę repo

**Jeśli masz wątpliwości:**
- Pytaj mnie!
- Lepiej dmuchać na zimne 😊

---

**Status:** 
- 🟢 Gotowy do publikacji (wszystkie ✅)
- 🟡 Wymaga sprawdzenia (niektóre [ ])
- 🔴 NIE publikuj (znaleziono sekrety!)
