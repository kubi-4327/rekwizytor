# SonarCloud Setup - Checklist

**Status:** 🟡 Gotowe do uruchomienia  
**Czas:** ~30 minut  
**Data:** 2026-01-25

---

## ✅ Co Zostało Przygotowane

### Pliki utworzone:
- [x] `.github/workflows/sonarcloud.yml` - GitHub Actions workflow
- [x] `sonar-project.properties` - Konfiguracja SonarCloud
- [x] `README.md` - Zaktualizowane z badges
- [x] `.agent/sonarcloud-setup-guide.md` - Szczegółowy przewodnik
- [x] `.agent/sonarcloud-vs-codacy.md` - Porównanie narzędzi
- [x] `.agent/sonarcloud-quick-reference.md` - Szybki reference
- [x] `.agent/code-quality-analysis.md` - Analiza projektu

### Gotowe do commit:
```bash
git status
# 7 nowych plików gotowych do dodania
```

---

## 📝 Co Musisz Zrobić (Krok po Kroku)

### Krok 1: Sprawdź czy repo jest publiczne (2 min)
- [ ] Idź na: https://github.com/kubi-4327/rekwizytor
- [ ] Sprawdź czy widzisz 🔒 "Private"
- [ ] Jeśli TAK → Settings → Danger Zone → Make public
- [ ] Jeśli NIE → Super, możesz iść dalej!

**⚠️ WAŻNE:** SonarCloud free działa TYLKO dla publicznych repo!

---

### Krok 2: Zarejestruj się w SonarCloud (5 min)
- [ ] Idź na: https://sonarcloud.io
- [ ] Kliknij "Log in"
- [ ] Wybierz "Log in with GitHub"
- [ ] Autoryzuj SonarCloud (read code, write checks)
- [ ] Import organization: **kubi-4327**
- [ ] Plan: **Free** (dla public repos)

**Zapisz:** Organization key = `kubi-4327`

---

### Krok 3: Import projektu (5 min)
- [ ] W SonarCloud: "Analyze new project"
- [ ] Zaznacz: ✅ `kubi-4327/rekwizytor`
- [ ] Kliknij "Set Up"
- [ ] Wybierz: **"With GitHub Actions"** (nie Automatic!)

**Zapisz:** Project key = `kubi-4327_rekwizytor`

---

### Krok 4: Wygeneruj SONAR_TOKEN (3 min)
- [ ] W SonarCloud: Kliknij "Generate a token"
- [ ] Nazwa: `rekwizytor-github-actions`
- [ ] Typ: User Token
- [ ] Expiration: No expiration
- [ ] Kliknij "Generate"
- [ ] **SKOPIUJ TOKEN NATYCHMIAST!**

**Token wygląda tak:**
```
squ_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
```

---

### Krok 5: Dodaj token do GitHub (3 min)
- [ ] Idź na: https://github.com/kubi-4327/rekwizytor/settings/secrets/actions
- [ ] Kliknij "New repository secret"
- [ ] Name: `SONAR_TOKEN` (dokładnie tak!)
- [ ] Secret: [wklej skopiowany token]
- [ ] Kliknij "Add secret"

**Sprawdź:** Secret `SONAR_TOKEN` powinien być widoczny na liście

---

### Krok 6: Commit i push plików (5 min)

```bash
# W terminalu, w folderze projektu:

# 1. Dodaj wszystkie nowe pliki
git add .github/workflows/sonarcloud.yml
git add sonar-project.properties
git add README.md
git add .agent/

# 2. Commit
git commit -m "ci: add SonarCloud integration

- Add GitHub Actions workflow for automatic code analysis
- Configure SonarCloud project settings
- Update README with quality badges
- Add comprehensive setup documentation"

# 3. Push
git push origin main
```

---

### Krok 7: Monitoruj pierwszy scan (5 min)
- [ ] Idź na: https://github.com/kubi-4327/rekwizytor/actions
- [ ] Powinieneś zobaczyć: ⚙️ "SonarCloud Analysis" (running)
- [ ] Kliknij na workflow → Zobacz logi
- [ ] Poczekaj 2-5 minut na zakończenie

**Oczekiwany wynik:**
```
✅ Checkout code
✅ Setup Node.js
✅ Install dependencies
✅ Run ESLint
✅ SonarCloud Scan
```

---

### Krok 8: Sprawdź wyniki (10 min)
- [ ] Idź na: https://sonarcloud.io/dashboard?id=kubi-4327_rekwizytor
- [ ] Zobacz Quality Gate (prawdopodobnie B lub C)
- [ ] Kliknij "Issues" → Przejrzyj znalezione problemy
- [ ] Przeczytaj 5 pierwszych issues (nauka!)

**Przewidywane wyniki:**
- Bugs: 0-5
- Vulnerabilities: 0-3
- Code Smells: 50-150
- Technical Debt: 2-4 dni

---

### Krok 9: Sprawdź badge na GitHub (1 min)
- [ ] Idź na: https://github.com/kubi-4327/rekwizytor
- [ ] Odśwież stronę (Ctrl+R / Cmd+R)
- [ ] Powinieneś zobaczyć badge'y SonarCloud na górze README

**Przykład:**
```
Quality Gate: Passed ✅
Security: A 🔒
Maintainability: B ⭐
```

---

## 🎉 Gratulacje!

Jeśli wszystkie kroki są ✅ - SonarCloud działa!

### Co się teraz dzieje automatycznie:
- ✅ Każdy push → automatyczny scan
- ✅ Każdy PR → code review od SonarCloud
- ✅ Quality Gate → blokuje merge jeśli kod jest zły
- ✅ Badge'y → aktualizują się automatycznie

---

## 📚 Następne Kroki

### Dzisiaj:
- [ ] Przejrzyj wszystkie Issues w SonarCloud
- [ ] Przeczytaj `.agent/sonarcloud-quick-reference.md`
- [ ] Zrozum każdą kategorię (Bugs, Vulnerabilities, Code Smells)

### Ten tydzień:
- [ ] Napraw wszystkie Bugs (0-5 issues)
- [ ] Napraw wszystkie Vulnerabilities (0-3 issues)
- [ ] Napraw 10 najłatwiejszych Code Smells

### Ten miesiąc:
- [ ] Quality Gate: Passed dla wszystkich PR
- [ ] Maintainability Rating: A lub B
- [ ] Technical Debt < 3 dni

---

## 🆘 Problemy?

### Workflow nie uruchomił się?
1. Sprawdź czy push dotarł do GitHub
2. Sprawdź Actions → Czy workflow jest widoczny?
3. Sprawdź czy `.github/workflows/sonarcloud.yml` jest w repo

### "SONAR_TOKEN not found"?
1. Sprawdź Settings → Secrets → Actions
2. Nazwa MUSI być dokładnie: `SONAR_TOKEN`
3. Jeśli nie ma → dodaj ponownie (Krok 5)

### "Project not found"?
1. Sprawdź `sonar-project.properties`
2. `sonar.projectKey` MUSI być: `kubi-4327_rekwizytor`
3. Sprawdź w SonarCloud: Project → Information

### Inne problemy?
- Sprawdź [Setup Guide](./.agent/sonarcloud-setup-guide.md#troubleshooting)
- Pytaj mnie! 😊

---

## 📖 Dokumentacja

Wszystkie pliki w `.agent/`:
- `sonarcloud-setup-guide.md` - Szczegółowy przewodnik (300+ linii)
- `sonarcloud-vs-codacy.md` - Porównanie narzędzi
- `sonarcloud-quick-reference.md` - Szybki reference
- `code-quality-analysis.md` - Analiza projektu

---

**Powodzenia! 🚀**

Jeśli masz pytania na KAŻDYM etapie - pytaj!
