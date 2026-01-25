# SonarCloud - Quick Reference

## 🔗 Ważne Linki

- **Dashboard:** https://sonarcloud.io/dashboard?id=kubi-4327_rekwizytor
- **GitHub Actions:** https://github.com/kubi-4327/rekwizytor/actions
- **Dokumentacja:** https://docs.sonarcloud.io/

---

## ⚡ Komendy

```bash
# Lokalny lint (przed push)
npm run lint

# Build (sprawdź czy przechodzi)
npm run build

# Commit z konwencją
git commit -m "feat: add new feature"
git commit -m "fix: resolve bug"
git commit -m "refactor: improve code quality"
```

---

## 📊 Metryki - Co Znaczą?

### Quality Gate
✅ **Passed** - Kod OK, możesz merge'ować  
❌ **Failed** - Napraw issues przed merge

### Reliability (Niezawodność)
- **A** = 0 bugs 🎉
- **B** = 1-2 minor bugs
- **C** = 3-10 bugs
- **D/E** = Dużo bugów 😱

### Security (Bezpieczeństwo)
- **A** = 0 vulnerabilities 🔒
- **B** = 1-2 minor issues
- **C/D/E** = Poważne problemy!

### Maintainability (Utrzymywalność)
- **A** = Technical Debt ≤ 5% 🌟
- **B** = 6-10%
- **C** = 11-20%
- **D/E** = > 20% (trudny do utrzymania)

### Technical Debt
Szacowany czas na naprawę wszystkich issues:
- **< 2 dni** = Świetnie! ✨
- **2-5 dni** = Dobrze ✅
- **5-10 dni** = Do poprawy ⚠️
- **> 10 dni** = Wymaga refactoringu 🔧

---

## 🎯 Priorytet Napraw

### 1. KRYTYCZNE (natychmiast!)
🔴 **Bugs** - kod prawdopodobnie nie działa  
🔴 **Vulnerabilities** - dziury bezpieczeństwa

### 2. WAŻNE (w tym tygodniu)
🟠 **Security Hotspots** - wymagają review  
🟠 **Major Code Smells** - trudne w utrzymaniu

### 3. NICE TO HAVE (stopniowo)
🟡 **Minor Code Smells** - drobne usprawnienia  
🟡 **Duplications** - powtórzony kod

---

## 🚦 Workflow

### Przed Push
```bash
# 1. Sprawdź lokalnie
npm run lint

# 2. Napraw błędy ESLint
# (SonarCloud też je znajdzie)

# 3. Commit i push
git add .
git commit -m "feat: add feature"
git push
```

### Po Push
1. Sprawdź GitHub Actions (2-5 min)
2. Jeśli ❌ failed → zobacz logi
3. Napraw issues
4. Push ponownie

### Pull Request
1. Stwórz PR
2. Poczekaj na SonarCloud check (2-5 min)
3. Jeśli ❌ failed → kliknij "Details"
4. Napraw tylko **New Code** issues
5. Push fix
6. Merge gdy ✅ passed

---

## 🔧 Najczęstsze Issues

### "Cognitive Complexity too high"
**Problem:** Funkcja zbyt skomplikowana

**Fix:**
```typescript
// ❌ Przed (complexity: 18)
function process(data) {
  if (data) {
    if (data.valid) {
      if (data.items) {
        // ...
      }
    }
  }
}

// ✅ Po (complexity: 5)
function process(data) {
  if (!data?.valid?.items) return;
  // ...
}
```

---

### "Possible null pointer"
**Problem:** Brak sprawdzenia null/undefined

**Fix:**
```typescript
// ❌ Przed
const name = user.profile.name;

// ✅ Po
const name = user?.profile?.name ?? 'Unknown';
```

---

### "Use const instead of let"
**Problem:** Zmienna nigdy nie jest reassigned

**Fix:**
```typescript
// ❌ Przed
let count = items.length;
return count;

// ✅ Po
const count = items.length;
return count;
```

---

### "Duplicated code"
**Problem:** Ten sam kod w wielu miejscach

**Fix:**
```typescript
// ❌ Przed
// file1.tsx
const formatDate = (d) => d.toLocaleDateString('pl-PL');

// file2.tsx
const formatDate = (d) => d.toLocaleDateString('pl-PL');

// ✅ Po
// utils/dateFormatter.ts
export const formatDate = (d) => d.toLocaleDateString('pl-PL');

// file1.tsx & file2.tsx
import { formatDate } from '@/utils/dateFormatter';
```

---

## 🎓 Nauka

### Gdy zobaczysz issue:
1. **Przeczytaj opis** - SonarCloud wyjaśnia dlaczego to problem
2. **Zobacz przykład** - często jest suggested fix
3. **Kliknij "Why is this an issue?"** - link do dokumentacji
4. **Naucz się** - następnym razem unikniesz tego błędu!

### Polecane artykuły:
- [Cognitive Complexity](https://sonarsource.com/cognitive-complexity)
- [Clean Code](https://www.sonarsource.com/learn/clean-code/)
- [Security Best Practices](https://docs.sonarcloud.io/improving/security-hotspots/)

---

## 💡 Pro Tips

### 1. Skup się na New Code
Nie musisz naprawiać całego projektu od razu!  
Quality Gate sprawdza tylko **nowy kod** (ostatnie 30 dni).

### 2. Pre-commit Hook (opcjonalnie)
```bash
# Automatyczny lint przed każdym commit
npm install -D husky lint-staged
npx husky init
```

### 3. Ignoruj False Positives
Jeśli SonarCloud się myli (rzadko!):
```typescript
// sonar-disable-next-line
const result = dangerousOperation();
```

### 4. Monitoruj Trends
Dashboard → Activity → Zobacz jak jakość się zmienia w czasie

### 5. Porównuj z innymi
Sprawdź top projekty Next.js na SonarCloud - ucz się od najlepszych!

---

## 🆘 Help

### Problem z setup?
1. Sprawdź [Setup Guide](./.agent/sonarcloud-setup-guide.md)
2. Zobacz [Troubleshooting](./.agent/sonarcloud-setup-guide.md#troubleshooting)
3. Pytaj mnie! 😊

### Nie rozumiesz issue?
1. Kliknij "Why is this an issue?"
2. Przeczytaj dokumentację
3. Szukaj na Stack Overflow: `[sonarcloud] [typescript] <problem>`
4. Pytaj na SonarSource Community

---

## 📈 Cele

### Tydzień 1
- [ ] Wszystkie Bugs = 0
- [ ] Wszystkie Vulnerabilities = 0
- [ ] Quality Gate: Passed

### Miesiąc 1
- [ ] Maintainability Rating: A lub B
- [ ] Technical Debt < 3 dni
- [ ] Code Smells < 100

### Miesiąc 3
- [ ] Duplications < 3%
- [ ] Wszystkie Security Hotspots reviewed
- [ ] Dodane testy (Coverage > 50%)

---

**Powodzenia! 🚀**
