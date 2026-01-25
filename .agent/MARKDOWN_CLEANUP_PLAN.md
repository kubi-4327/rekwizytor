# Analiza Plików Markdown - Cleanup Plan

**Data:** 2026-01-25  
**Cel:** Uporządkowanie projektu przed publikacją

---

## 📊 Inwentaryzacja Plików .md

### Główny folder (27 plików):

#### ✅ ZACHOWAĆ (ważne dla projektu):

1. **README.md** ✨
   - Główny opis projektu
   - **AKCJA:** Zachować (właśnie zaktualizowane)

2. **QUICKSTART.md**
   - Quick start guide
   - **AKCJA:** Sprawdź czy aktualny, ewentualnie zaktualizuj

3. **PROJECT_SUMMARY.md**
   - Podsumowanie funkcjonalności
   - **AKCJA:** Zachować (dobre dla portfolio)

---

#### 🗑️ DO USUNIĘCIA (legacy/zbędne):

4. **LEARNING.md**
   - Notatki z nauki (już w .gitignore!)
   - **AKCJA:** ❌ USUŃ (jest w .gitignore ale commitowany wcześniej)

5. **MIGRATION.md**
   - Stare notatki o migracji
   - **AKCJA:** ❓ Sprawdź czy aktualne, może przenieść do docs/

6. **REFACTOR_PLAN.md**
   - Stary plan refactoringu
   - **AKCJA:** ❌ USUŃ (prawdopodobnie nieaktualny)

7. **TESTING.md**
   - Dokumentacja testów
   - **AKCJA:** ✅ Zachować lub przenieść do docs/

8. **TEST_README.md**
   - Readme dla testów
   - **AKCJA:** ❌ USUŃ lub połącz z TESTING.md

9. **comparison_report.md**
   - Raport porównania (embedding tests?)
   - **AKCJA:** ❌ USUŃ lub przenieść do docs/

10. **email_templates.md**
    - Szablony emaili
    - **AKCJA:** ✅ Przenieść do docs/

11. **full_test_data.md**
    - Dane testowe
    - **AKCJA:** ❌ USUŃ (wrażliwe? niepotrzebne w repo)

12. **search-quality-report.md**
    - Raport jakości wyszukiwania
    - **AKCJA:** ❌ USUŃ lub przenieść do docs/

---

#### 📁 Folder .agent/ (9 plików):

13. **future-features.md** ✅
    - Lista przyszłych funkcji
    - **AKCJA:** Zachować

14. **SONARCLOUD_CHECKLIST.md** ✅
    - Checklist setup SonarCloud
    - **AKCJA:** Zachować (właśnie utworzone)

15. **SECURITY_CHECKLIST.md** ✅
    - Checklist bezpieczeństwa
    - **AKCJA:** Zachować (właśnie utworzone)

16. **PUBLICATION_SUMMARY.md** ✅
    - Podsumowanie publikacji
    - **AKCJA:** Zachować (właśnie utworzone)

17. **sonarcloud-setup-guide.md** ✅
    - Przewodnik SonarCloud
    - **AKCJA:** Zachować (właśnie utworzone)

18. **sonarcloud-vs-codacy.md** ✅
    - Porównanie narzędzi
    - **AKCJA:** Zachować (właśnie utworzone)

19. **sonarcloud-quick-reference.md** ✅
    - Quick reference SonarCloud
    - **AKCJA:** Zachować (właśnie utworzone)

20. **code-quality-analysis.md** ✅
    - Analiza jakości kodu
    - **AKCJA:** Zachować (właśnie utworzone)

21. **ai-integration-plan.md** ❓
    - Plan integracji AI
    - **AKCJA:** Sprawdź czy aktualny

---

#### 📁 Folder docs/ (7 plików):

22. **ANALYSIS_TOOLS.md**
    - Narzędzia analizy
    - **AKCJA:** ✅ Zachować

23. **ENV_VARIABLES.md**
    - Dokumentacja zmiennych środowiskowych
    - **AKCJA:** ✅ Zachować (przydatne!)

24. **INTENT_LOGGING.md**
    - Logowanie intencji
    - **AKCJA:** ✅ Zachować

25. **POCKETBASE_ENV.md**
    - Konfiguracja PocketBase
    - **AKCJA:** ✅ Zachować

26. **TESTING_ARCHITECTURE.md**
    - Architektura testów
    - **AKCJA:** ✅ Zachować

27. **WANDB_EXPORT.md**
    - Eksport do W&B
    - **AKCJA:** ✅ Zachować

28. **WANDB_SETUP.md**
    - Setup W&B
    - **AKCJA:** ✅ Zachować

---

## 🎯 Rekomendowany Plan Działania

### Faza 1: Usuń zbędne pliki

```bash
# Pliki do usunięcia (legacy/niepotrzebne):
git rm LEARNING.md              # Już w .gitignore
git rm REFACTOR_PLAN.md         # Stary plan, nieaktualny
git rm TEST_README.md           # Duplikat TESTING.md
git rm full_test_data.md        # Dane testowe, niepotrzebne
git rm comparison_report.md     # Stary raport
git rm search-quality-report.md # Stary raport
```

### Faza 2: Przenieś do docs/

```bash
# Pliki do przeniesienia (organizacja):
git mv MIGRATION.md docs/
git mv TESTING.md docs/
git mv email_templates.md docs/
```

### Faza 3: Zaktualizuj QUICKSTART.md

Sprawdź czy jest aktualny i ewentualnie zaktualizuj.

### Faza 4: Dodaj do .gitignore (na przyszłość)

```bash
# Dodaj do .gitignore:
*_report.md
*_test_data.md
comparison_*.md
```

---

## 📝 Co z .env.example?

### ❌ NIE usuwaj!

**.env.example to STANDARD w projektach!**

**Dlaczego jest potrzebny:**

1. **Dokumentacja** - pokazuje jakie zmienne są wymagane
2. **Onboarding** - nowy developer wie co skonfigurować
3. **CI/CD** - systemy CI wiedzą jakie sekrety dodać
4. **Best practice** - każdy projekt powinien go mieć

**Przykład użycia:**
```bash
# Nowy developer klonuje repo:
git clone https://github.com/kubi-4327/rekwizytor.git
cd rekwizytor

# Kopiuje przykład:
cp .env.example .env.local

# Wypełnia prawdziwymi wartościami:
nano .env.local
# NEXT_PUBLIC_SUPABASE_URL=https://rjxcpqxhkbfhedhhxbau.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# Gotowe!
npm install
npm run dev
```

**Bez .env.example:**
- ❌ Developer nie wie jakie zmienne ustawić
- ❌ Musi szukać w kodzie
- ❌ Może coś pominąć
- ❌ Nieprofesjonalne

**Z .env.example:**
- ✅ Wszystko jasne
- ✅ Szybki setup
- ✅ Profesjonalne
- ✅ Standard w branży

---

## 🎨 Struktura Po Cleanup

```
rekwizytor/
├── README.md                    # Główny opis
├── QUICKSTART.md                # Quick start
├── PROJECT_SUMMARY.md           # Podsumowanie
├── .env.example                 # ✅ ZACHOWAĆ!
│
├── .agent/                      # Dokumentacja agenta
│   ├── future-features.md
│   ├── SONARCLOUD_CHECKLIST.md
│   ├── SECURITY_CHECKLIST.md
│   ├── PUBLICATION_SUMMARY.md
│   ├── sonarcloud-setup-guide.md
│   ├── sonarcloud-vs-codacy.md
│   ├── sonarcloud-quick-reference.md
│   ├── code-quality-analysis.md
│   └── ai-integration-plan.md   # Sprawdź czy aktualny
│
└── docs/                        # Dokumentacja techniczna
    ├── MIGRATION.md             # Przeniesione
    ├── TESTING.md               # Przeniesione
    ├── email_templates.md       # Przeniesione
    ├── ANALYSIS_TOOLS.md
    ├── ENV_VARIABLES.md
    ├── INTENT_LOGGING.md
    ├── POCKETBASE_ENV.md
    ├── TESTING_ARCHITECTURE.md
    ├── WANDB_EXPORT.md
    └── WANDB_SETUP.md
```

---

## ✅ Gotowe Komendy Do Wykonania

### Opcja A - Agresywny cleanup (polecam):

```bash
# 1. Usuń zbędne pliki
git rm LEARNING.md REFACTOR_PLAN.md TEST_README.md full_test_data.md comparison_report.md search-quality-report.md

# 2. Przenieś do docs/
git mv MIGRATION.md docs/
git mv TESTING.md docs/
git mv email_templates.md docs/

# 3. Commit
git commit -m "chore: cleanup markdown files

- Remove outdated documentation (LEARNING, REFACTOR_PLAN, etc.)
- Move technical docs to docs/ folder
- Organize project structure for public release"
```

### Opcja B - Ostrożny cleanup:

```bash
# 1. Usuń tylko oczywiste
git rm LEARNING.md REFACTOR_PLAN.md TEST_README.md full_test_data.md

# 2. Zostaw raporty (może przydatne)
# comparison_report.md, search-quality-report.md

# 3. Przenieś do docs/
git mv MIGRATION.md docs/
git mv TESTING.md docs/

# 4. Commit
git commit -m "chore: remove outdated documentation files"
```

---

## 🤔 Pytania Do Ciebie

Przed wykonaniem cleanup:

1. **MIGRATION.md** - czy to aktualna dokumentacja migracji?
2. **comparison_report.md** - czy chcesz zachować dla historii?
3. **search-quality-report.md** - czy to ważne dla projektu?
4. **.agent/ai-integration-plan.md** - czy to aktualny plan?

---

## 💡 Moja Rekomendacja

**Wykonaj Opcję A (agresywny cleanup):**

**Dlaczego:**
- Projekt będzie publiczny - lepiej czysto
- Stare pliki mylą (REFACTOR_PLAN, TEST_README)
- docs/ to lepsze miejsce na tech docs
- Możesz zawsze wrócić do historii git

**Ale zachowaj:**
- ✅ .env.example (STANDARD!)
- ✅ PROJECT_SUMMARY.md (portfolio)
- ✅ QUICKSTART.md (onboarding)
- ✅ Wszystko w .agent/ (świeże)
- ✅ Wszystko w docs/ (tech docs)

---

**Co wybierasz?**
- A) Agresywny cleanup (usuń wszystko zbędne)
- B) Ostrożny cleanup (usuń tylko oczywiste)
- C) Pokaż mi zawartość [konkretnego pliku] przed decyzją
- D) Niestandardowy plan (powiedz co zostawić/usunąć)
