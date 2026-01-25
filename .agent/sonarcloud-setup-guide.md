# SonarCloud Setup Guide - Krok po Kroku

**Projekt:** Rekwizytor  
**GitHub:** https://github.com/kubi-4327/rekwizytor  
**Czas:** ~30 minut  
**Poziom:** Początkujący

---

## 📋 Spis Treści

1. [Przygotowanie](#1-przygotowanie-5-min)
2. [Rejestracja w SonarCloud](#2-rejestracja-w-sonarcloud-5-min)
3. [Import Projektu](#3-import-projektu-5-min)
4. [Konfiguracja Projektu](#4-konfiguracja-projektu-10-min)
5. [GitHub Actions Integration](#5-github-actions-integration-10-min)
6. [Pierwszy Scan](#6-pierwszy-scan-5-min)
7. [Analiza Wyników](#7-analiza-wyników)
8. [Dodanie Badge do README](#8-dodanie-badge-do-readme)
9. [Quality Gate Configuration](#9-quality-gate-configuration)
10. [Troubleshooting](#troubleshooting)

---

## 1. Przygotowanie (5 min)

### ✅ Checklist przed startem:

- [x] Projekt na GitHub: `kubi-4327/rekwizytor` ✅
- [ ] Repo jest **publiczne** (sprawdź w Settings)
- [ ] Masz uprawnienia admin do repo
- [ ] Projekt buduje się bez błędów (`npm run build`)

### 🔍 Sprawdź czy repo jest publiczne:

1. Idź na: https://github.com/kubi-4327/rekwizytor
2. Jeśli widzisz 🔒 "Private" → zmień na Public:
   - Settings → Danger Zone → Change visibility → Make public

**⚠️ WAŻNE:** SonarCloud jest darmowe TYLKO dla publicznych repo!

---

## 2. Rejestracja w SonarCloud (5 min)

### Krok 1: Wejdź na SonarCloud

🔗 https://sonarcloud.io

### Krok 2: Zaloguj się przez GitHub

1. Kliknij **"Log in"** (prawy górny róg)
2. Wybierz **"Log in with GitHub"**
3. Autoryzuj SonarCloud:
   - ✅ Read access to code
   - ✅ Read access to metadata
   - ✅ Write access to checks (dla PR comments)

### Krok 3: Wybierz organizację

SonarCloud zapyta: "Import organization from GitHub?"

**Opcja A - Importuj swoją organizację (POLECAM):**
```
Organization: kubi-4327
Key: kubi-4327 (auto-generated)
Plan: Free (dla public repos)
```

**Opcja B - Stwórz nową organizację:**
```
Name: rekwizytor-org
Key: rekwizytor-org
Plan: Free
```

**Wybierz Opcję A** - prostsze zarządzanie.

### Krok 4: Potwierdź plan Free

```
✅ Free plan
   - Unlimited public repositories
   - Unlimited lines of code
   - Unlimited contributors
   - All features included
```

Kliknij **"Create Organization"**

---

## 3. Import Projektu (5 min)

### Krok 1: Analyze new project

Po utworzeniu organizacji zobaczysz:

```
┌─────────────────────────────────────┐
│ Analyze new project                 │
│                                     │
│ Choose repositories to analyze:     │
│                                     │
│ [ ] kubi-4327/rekwizytor           │
│ [ ] kubi-4327/other-repo           │
│                                     │
│         [Set Up]                    │
└─────────────────────────────────────┘
```

### Krok 2: Wybierz rekwizytor

- [x] ✅ kubi-4327/rekwizytor

Kliknij **"Set Up"**

### Krok 3: Wybierz metodę analizy

SonarCloud zapyta: "How do you want to analyze your repository?"

```
┌─────────────────────────────────────────────┐
│ Choose analysis method:                     │
│                                             │
│ ○ Automatic Analysis (recommended)          │
│   SonarCloud analyzes your code            │
│   automatically after each push            │
│                                             │
│ ○ With GitHub Actions                       │
│   More control, custom configuration       │
│                                             │
│ ○ Other CI                                  │
│   Jenkins, GitLab CI, etc.                 │
└─────────────────────────────────────────────┘
```

**Wybierz:** ○ **With GitHub Actions** (więcej kontroli!)

---

## 4. Konfiguracja Projektu (10 min)

### Krok 1: Wygeneruj SONAR_TOKEN

SonarCloud pokaże instrukcje. Kluczowy krok:

1. Kliknij **"Generate a token"**
2. Nazwa tokena: `rekwizytor-github-actions`
3. Typ: **User Token**
4. Expiration: **No expiration** (lub 90 days jeśli wolisz)
5. Kliknij **"Generate"**

**⚠️ SKOPIUJ TOKEN NATYCHMIAST!** Nie będziesz go więcej widział.

```
Twój token (przykład):
squ_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
```

### Krok 2: Dodaj token do GitHub Secrets

1. Idź na: https://github.com/kubi-4327/rekwizytor/settings/secrets/actions
2. Kliknij **"New repository secret"**
3. Wypełnij:
   ```
   Name: SONAR_TOKEN
   Secret: [wklej skopiowany token]
   ```
4. Kliknij **"Add secret"**

### Krok 3: Skopiuj Project Key

SonarCloud pokaże:
```
Organization: kubi-4327
Project Key: kubi-4327_rekwizytor
```

**Zapisz sobie:** `kubi-4327_rekwizytor` (będzie potrzebny!)

---

## 5. GitHub Actions Integration (10 min)

### Krok 1: Utwórz folder dla workflows

W terminalu (w folderze projektu):

```bash
mkdir -p .github/workflows
```

### Krok 2: Utwórz plik sonarcloud.yml

Stworzę dla Ciebie gotowy plik konfiguracyjny!

**Plik:** `.github/workflows/sonarcloud.yml`

```yaml
name: SonarCloud Analysis

on:
  push:
    branches:
      - main
      - develop
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  sonarcloud:
    name: SonarCloud Scan
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          # Shallow clones should be disabled for better analysis
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint
        continue-on-error: true

      - name: SonarCloud Scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

### Krok 3: Utwórz plik sonar-project.properties

**Plik:** `sonar-project.properties` (w głównym folderze projektu)

```properties
# SonarCloud Configuration
sonar.projectKey=kubi-4327_rekwizytor
sonar.organization=kubi-4327

# Project metadata
sonar.projectName=Rekwizytor
sonar.projectVersion=0.1.0

# Source code
sonar.sources=app,components,hooks,lib,utils,middleware.ts
sonar.tests=
sonar.test.inclusions=**/*.test.ts,**/*.test.tsx,**/*.spec.ts,**/*.spec.tsx

# Exclusions
sonar.exclusions=\
  **/node_modules/**,\
  **/.next/**,\
  **/public/**,\
  **/scripts/**,\
  **/wandb/**,\
  **/pocketbase_data/**,\
  **/ollama_data/**,\
  **/*.config.ts,\
  **/*.config.js,\
  **/*.config.mjs,\
  **/migration_*.sql,\
  **/test_data_*.json,\
  **/*.tsbuildinfo

# Coverage (jeśli kiedyś dodasz testy)
# sonar.javascript.lcov.reportPaths=coverage/lcov.info

# Language
sonar.language=ts
sonar.sourceEncoding=UTF-8

# TypeScript specific
sonar.typescript.node=20
```

### Krok 4: Commit i push

```bash
git add .github/workflows/sonarcloud.yml
git add sonar-project.properties
git commit -m "ci: add SonarCloud integration"
git push origin main
```

---

## 6. Pierwszy Scan (5 min)

### Automatyczny trigger

Po push'u GitHub Actions automatycznie uruchomi scan!

### Sprawdź status:

1. Idź na: https://github.com/kubi-4327/rekwizytor/actions
2. Powinieneś zobaczyć:
   ```
   ⚙️ SonarCloud Analysis
   Running... (może trwać 2-5 minut)
   ```

### Monitoruj progress:

Kliknij na workflow → Zobacz logi:
```
✅ Checkout code
✅ Setup Node.js
✅ Install dependencies
⚙️ Run ESLint
⚙️ SonarCloud Scan
   └─ Analyzing 295 files...
   └─ Computing metrics...
   └─ Uploading results...
```

### Sprawdź wyniki:

Po zakończeniu:
1. Idź na: https://sonarcloud.io/dashboard?id=kubi-4327_rekwizytor
2. Lub kliknij link w logach GitHub Actions

---

## 7. Analiza Wyników

### Co zobaczysz:

```
┌──────────────────────────────────────────────┐
│ Rekwizytor                    Quality Gate: ? │
├──────────────────────────────────────────────┤
│                                               │
│  Reliability        Security      Maintain.  │
│      ?                 ?              ?       │
│   ? Bugs         ? Vulnerab.    ? Smells     │
│                                               │
│  Coverage          Duplications   Tech Debt  │
│    0.0%               ?%             ?        │
│                                               │
└──────────────────────────────────────────────┘
```

### Przewidywane wyniki dla Twojego projektu:

**Reliability: A-B**
- Bugs: 0-5
- Twój TypeScript strict mode pomaga!

**Security: A**
- Vulnerabilities: 0-3
- Security Hotspots: 5-15 (do review)

**Maintainability: B-C**
- Code Smells: 50-150 (normalne dla 41k linii)
- Technical Debt: 2-4 dni

**Coverage: 0%**
- Nie masz testów (jeszcze!)

**Duplications: 2-5%**
- Akceptowalne

### Kliknij na Issues:

```
┌─────────────────────────────────────────────┐
│ Issues (123)                                │
├─────────────────────────────────────────────┤
│ 🔴 Bug (2)                                  │
│ 🟠 Vulnerability (1)                        │
│ 🟡 Code Smell (120)                         │
│                                             │
│ Filter by:                                  │
│ [ ] Severity  [ ] Type  [ ] File           │
└─────────────────────────────────────────────┘
```

### Przykładowy Issue:

```
┌──────────────────────────────────────────────┐
│ 🟡 Major Code Smell                          │
│ components/search/SearchBar.tsx:42           │
├──────────────────────────────────────────────┤
│ Function has a Cognitive Complexity of 18    │
│ (threshold: 15)                              │
│                                              │
│  40 | const handleSearch = async (query) => {│
│  41 |   if (!query) return;                  │
│> 42 |   if (loading) {                       │
│  43 |     if (hasError) {                    │
│  44 |       if (retryCount < 3) {            │
│                                              │
│ Suggested fix:                               │
│ - Extract nested logic to separate functions│
│ - Use early returns                         │
│ - Consider state machine pattern            │
│                                              │
│ 📚 Why is this an issue?                     │
│ [Learn more about Cognitive Complexity]     │
└──────────────────────────────────────────────┘
```

---

## 8. Dodanie Badge do README

### Krok 1: Wygeneruj badge

1. W SonarCloud: Project → Information → Badges
2. Skopiuj markdown dla "Quality Gate"

### Krok 2: Dodaj do README.md

Otwórz `README.md` i dodaj na górze:

```markdown
# Rekwizytor

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=kubi-4327_rekwizytor&metric=alert_status)](https://sonarcloud.io/dashboard?id=kubi-4327_rekwizytor)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=kubi-4327_rekwizytor&metric=security_rating)](https://sonarcloud.io/dashboard?id=kubi-4327_rekwizytor)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=kubi-4327_rekwizytor&metric=sqale_rating)](https://sonarcloud.io/dashboard?id=kubi-4327_rekwizytor)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=kubi-4327_rekwizytor&metric=code_smells)](https://sonarcloud.io/dashboard?id=kubi-4327_rekwizytor)
[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=kubi-4327_rekwizytor&metric=ncloc)](https://sonarcloud.io/dashboard?id=kubi-4327_rekwizytor)

Aplikacja do zarządzania rekwizytami teatralnymi z AI-powered search.

## ✨ Features
...
```

### Krok 3: Commit

```bash
git add README.md
git commit -m "docs: add SonarCloud badges"
git push
```

Teraz Twoje README będzie miało żywe badge'y! 🎉

---

## 9. Quality Gate Configuration

### Domyślny Quality Gate

SonarCloud używa "Sonar way" Quality Gate:

```
Quality Gate: Sonar way
├─ Coverage on New Code: ≥ 80%
├─ Duplicated Lines on New Code: ≤ 3%
├─ Maintainability Rating on New Code: ≥ A
├─ Reliability Rating on New Code: = A
└─ Security Rating on New Code: = A
```

### Dostosuj dla swojego projektu (opcjonalnie)

**Dla projektu bez testów:**

1. SonarCloud → Project Settings → Quality Gate
2. Wybierz "Sonar way" lub stwórz własny
3. Wyłącz tymczasowo:
   - Coverage on New Code (bo nie masz testów)
4. Zostaw włączone:
   - ✅ Maintainability Rating
   - ✅ Reliability Rating
   - ✅ Security Rating

**Gdy dodasz testy:**
- Włącz z powrotem Coverage (np. ≥ 70%)

---

## 10. Pull Request Integration

### Automatyczne PR Reviews

Od teraz przy każdym Pull Request:

```
┌─────────────────────────────────────┐
│ Pull Request #123                   │
├─────────────────────────────────────┤
│ ✅ SonarCloud Quality Gate          │
│                                     │
│ Quality Gate passed                 │
│                                     │
│ New Code:                           │
│ • 0 Bugs                            │
│ • 0 Vulnerabilities                 │
│ • 2 Code Smells                     │
│                                     │
│ Coverage: 0.0%                      │
│ Duplications: 0.0%                  │
│                                     │
│ [View on SonarCloud]                │
└─────────────────────────────────────┘
```

### Komentarze inline

SonarCloud będzie dodawać komentarze do kodu:

```
📝 SonarCloud commented:
┌──────────────────────────────────────┐
│ 🟡 Major Code Smell                  │
│                                      │
│ This function has a Cognitive        │
│ Complexity of 18 (max: 15)          │
│                                      │
│ Consider refactoring to improve     │
│ maintainability.                    │
│                                      │
│ [View in SonarCloud]                │
└──────────────────────────────────────┘
```

---

## Troubleshooting

### Problem 1: "Project not found"

**Objaw:** GitHub Actions fail z błędem "Project not found"

**Rozwiązanie:**
1. Sprawdź `sonar.projectKey` w `sonar-project.properties`
2. Musi być dokładnie: `kubi-4327_rekwizytor`
3. Sprawdź w SonarCloud: Project → Information → Project Key

---

### Problem 2: "SONAR_TOKEN not found"

**Objaw:** GitHub Actions fail z błędem "SONAR_TOKEN is not set"

**Rozwiązanie:**
1. Sprawdź czy dodałeś secret: https://github.com/kubi-4327/rekwizytor/settings/secrets/actions
2. Nazwa MUSI być dokładnie: `SONAR_TOKEN`
3. Jeśli nie ma - wygeneruj nowy token w SonarCloud

---

### Problem 3: "Analysis failed"

**Objaw:** SonarCloud scan kończy się błędem

**Rozwiązanie:**
1. Sprawdź logi w GitHub Actions
2. Najczęstszy problem: błędy ESLint
3. Napraw błędy ESLint lokalnie: `npm run lint`
4. Lub dodaj `continue-on-error: true` do kroku ESLint (tymczasowo)

---

### Problem 4: "Too many issues"

**Objaw:** SonarCloud pokazuje 500+ issues

**Rozwiązanie:**
1. To normalne przy pierwszym scanie!
2. Nie panikuj - nie musisz wszystkiego naprawiać
3. Skup się na "New Code" (Quality Gate)
4. Stopniowo poprawiaj "Overall Code"

---

### Problem 5: "Quality Gate failed"

**Objaw:** PR jest blokowany przez SonarCloud

**Rozwiązanie:**
1. Kliknij "View on SonarCloud"
2. Zobacz które metryki nie przeszły
3. Napraw tylko nowy kod (nie cały projekt!)
4. Lub dostosuj Quality Gate (Settings → Quality Gate)

---

## 📊 Co Dalej?

### Tydzień 1: Zapoznanie
- [ ] Przejrzyj wszystkie Issues
- [ ] Zrozum każdą kategorię (Bugs, Vulnerabilities, Code Smells)
- [ ] Przeczytaj dokumentację dla 5 najczęstszych issues

### Tydzień 2: Quick Wins
- [ ] Napraw wszystkie Bugs (powinno być 0-5)
- [ ] Napraw wszystkie Vulnerabilities
- [ ] Napraw 10 najłatwiejszych Code Smells

### Tydzień 3: Quality Gate
- [ ] Ustaw realistyczny Quality Gate
- [ ] Upewnij się, że nowy kod przechodzi
- [ ] Dodaj pre-commit hook (opcjonalnie)

### Tydzień 4: Edukacja
- [ ] Przeczytaj o Cognitive Complexity
- [ ] Naucz się rozpoznawać Code Smells
- [ ] Zastosuj best practices w nowym kodzie

---

## 🎓 Dodatkowe Zasoby

### Dokumentacja:
- 📚 SonarCloud Docs: https://docs.sonarcloud.io/
- 📚 TypeScript Rules: https://rules.sonarsource.com/typescript/
- 📚 Cognitive Complexity: https://sonarsource.com/cognitive-complexity

### Tutoriale:
- 🎥 SonarCloud for GitHub: https://www.youtube.com/watch?v=X7gPRBe_Eo0
- 🎥 Quality Gates: https://www.youtube.com/watch?v=dKQdJQQjqnY

### Community:
- 💬 SonarSource Community: https://community.sonarsource.com/
- 💬 Stack Overflow: [sonarcloud] tag

---

## ✅ Checklist Końcowy

Po zakończeniu setup'u powinieneś mieć:

- [x] Konto SonarCloud połączone z GitHub
- [x] Projekt "rekwizytor" zaimportowany
- [x] SONAR_TOKEN w GitHub Secrets
- [x] `.github/workflows/sonarcloud.yml` utworzony
- [x] `sonar-project.properties` skonfigurowany
- [x] Pierwszy scan zakończony
- [x] Badge w README.md
- [x] Quality Gate skonfigurowany
- [x] PR integration działa

---

## 🎉 Gratulacje!

Twój projekt jest teraz monitorowany przez SonarCloud!

**Co się zmienia:**
- ✅ Każdy push → automatyczny scan
- ✅ Każdy PR → code review od SonarCloud
- ✅ Metryki jakości widoczne na GitHub
- ✅ Stopniowa poprawa jakości kodu
- ✅ Nauka best practices

**Następny krok:** Przejrzyj wyniki pierwszego scanu i zacznij naprawiać! 🚀

---

**Pytania?** Sprawdź [Troubleshooting](#troubleshooting) lub pytaj mnie! 😊
