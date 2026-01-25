# SonarCloud vs Codacy - Szczegółowe Porównanie

**Data:** 2026-01-25  
**Projekt:** Rekwizytor (~41k linii TS/TSX)

---

## 📊 Szybkie Porównanie

| Kryterium | SonarCloud | Codacy |
|-----------|------------|--------|
| **Cena (public repo)** | ✅ Całkowicie darmowe | ✅ Darmowe (max 4 users) |
| **Cena (private repo)** | $10/miesiąc | $15/user/miesiąc |
| **Języki** | 30+ (TS, JS, Python, SQL) | 40+ (TS, JS, Python) |
| **Security** | ⭐⭐⭐⭐⭐ OWASP Top 10 | ⭐⭐⭐⭐ Podstawowe |
| **Code Smells** | ⭐⭐⭐⭐⭐ Bardzo szczegółowe | ⭐⭐⭐⭐ Dobre |
| **UI/UX** | ⭐⭐⭐ Funkcjonalne | ⭐⭐⭐⭐⭐ Piękne |
| **Integracje** | GitHub, GitLab, Bitbucket, Azure | GitHub, GitLab, Bitbucket |
| **Popularność** | ~500k projektów | ~100k projektów |
| **Firma** | SonarSource (od 2008) | Codacy (od 2012) |

---

## 🔍 SonarCloud - Co To Jest?

### Historia i Firma
- **Twórca:** SonarSource (Szwajcaria)
- **Założenie:** 2008
- **Produkt open-source:** SonarQube (self-hosted)
- **SonarCloud:** Wersja cloud (2017)
- **Używany przez:** Microsoft, NASA, IBM, Google

### Filozofia
> "Fix the Leak" - najpierw napraw nowy kod, potem stary

**Kluczowa koncepcja:** "Clean as You Code"
- Nie wymaga naprawy całego legacy code od razu
- Skupia się na nowym kodzie (New Code Period)
- Stopniowa poprawa jakości

---

## 🎯 Co Dokładnie Robi SonarCloud?

### 1. **Quality Gate** (Brama Jakości)
To główna koncepcja - zestaw reguł, które kod MUSI spełnić, żeby przejść:

```
Quality Gate: PASSED ✅
├─ Coverage on New Code: ≥ 80%
├─ Duplicated Lines on New Code: ≤ 3%
├─ Maintainability Rating on New Code: ≥ A
├─ Reliability Rating on New Code: = A
└─ Security Rating on New Code: = A
```

**Dla Twojego projektu:**
- Możesz ustawić własne progi
- Blokuje merge PR jeśli nie przejdzie
- Widoczne na GitHub jako status check

---

### 2. **Metryki - Co Mierzą?**

#### A) **Bugs** 🐛
Kod, który prawdopodobnie nie działa poprawnie.

**Przykłady dla TypeScript:**
```typescript
// ❌ Bug: Zawsze false
if (x = 5) { }  // powinno być x === 5

// ❌ Bug: Null pointer
const name = user.name.toUpperCase(); // user może być null

// ❌ Bug: Dead code
return true;
console.log("never runs"); // nigdy się nie wykona
```

**Severity:**
- 🔴 Blocker - krytyczny błąd
- 🟠 Critical - poważny problem
- 🟡 Major - istotny błąd
- 🔵 Minor - drobny problem

---

#### B) **Vulnerabilities** 🔒 (Security)
Potencjalne dziury bezpieczeństwa.

**Przykłady dla Next.js:**
```typescript
// ❌ SQL Injection
const query = `SELECT * FROM users WHERE id = ${userId}`; 

// ❌ XSS (Cross-Site Scripting)
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ❌ Hardcoded credentials
const apiKey = "sk-1234567890abcdef";

// ❌ Weak crypto
const hash = md5(password); // MD5 jest słaby
```

**OWASP Top 10 Coverage:**
- Injection
- Broken Authentication
- Sensitive Data Exposure
- XML External Entities (XXE)
- Security Misconfiguration
- Cross-Site Scripting (XSS)
- Insecure Deserialization
- Using Components with Known Vulnerabilities

---

#### C) **Code Smells** 👃
Kod, który działa, ale jest trudny w utrzymaniu.

**Przykłady:**
```typescript
// ❌ Zbyt długa funkcja (>50 linii)
function processData() {
  // 200 linii kodu...
}

// ❌ Zbyt wiele parametrów
function createUser(name, email, age, address, phone, city, zip, country) {}

// ❌ Duplikacja kodu
const a = x + y + z;
const b = x + y + z; // powtórzenie

// ❌ Zbyt głęboka zagnieżdżenie
if (a) {
  if (b) {
    if (c) {
      if (d) { // 4 poziomy!
        // kod
      }
    }
  }
}

// ❌ Magic numbers
setTimeout(() => {}, 86400000); // co to za liczba?
// ✅ Lepiej:
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
setTimeout(() => {}, ONE_DAY_MS);
```

---

#### D) **Technical Debt** ⏱️
Szacowany czas potrzebny na naprawę wszystkich problemów.

**Jak liczą:**
- Code Smell: 5 min - 1h (zależnie od severity)
- Bug: 10 min - 2h
- Vulnerability: 30 min - 4h

**Dla projektu 40k linii:**
- Typowy dług: **2-10 dni** pracy
- Dobry projekt: **< 5 dni**
- Świetny projekt: **< 2 dni**

---

#### E) **Maintainability Rating** (A-E)
Jak łatwo będzie utrzymywać kod.

**Skala:**
- **A:** Technical Debt ≤ 5% wielkości kodu (ŚWIETNIE!)
- **B:** 6-10% (Dobrze)
- **C:** 11-20% (Średnio)
- **D:** 21-50% (Źle)
- **E:** > 50% (Katastrofa)

**Dla Twojego projektu (41k linii):**
- Rating A: ≤ 2050 linii do naprawy
- Rating B: 2050-4100 linii
- Rating C: 4100-8200 linii

---

#### F) **Duplications** 📋
Powtórzony kod.

**Przykład:**
```typescript
// components/UserCard.tsx
const formatDate = (date: Date) => {
  return date.toLocaleDateString('pl-PL');
}

// components/EventCard.tsx
const formatDate = (date: Date) => {  // DUPLIKACJA!
  return date.toLocaleDateString('pl-PL');
}

// ✅ Lepiej: utils/dateFormatter.ts
export const formatDate = (date: Date) => {
  return date.toLocaleDateString('pl-PL');
}
```

**Metryka:**
- % zduplikowanych linii
- Bloki kodu (min. 6 linii)

---

### 3. **New Code vs Overall Code**

**Kluczowa różnica SonarCloud:**

```
┌─────────────────────────────────────┐
│  Overall Code (cały projekt)        │
│  Rating: C (legacy, nie wymaga fix) │
│                                      │
│  ┌───────────────────────────────┐  │
│  │ New Code (ostatnie 30 dni)    │  │
│  │ Rating: A (MUSI być dobre!)   │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

**Dlaczego to genialne:**
- Nie musisz naprawiać 40k linii legacy code
- Skupiasz się na nowym kodzie
- Stopniowa poprawa jakości
- Realistyczne dla prawdziwych projektów

---

### 4. **Jak Wygląda Raport?**

#### Dashboard:
```
┌──────────────────────────────────────────────┐
│ Rekwizytor                    Quality Gate: A │
├──────────────────────────────────────────────┤
│                                               │
│  Reliability        Security      Maintain.  │
│      A                 A              B       │
│   0 Bugs         0 Vulnerab.    45 Smells    │
│                                               │
│  Coverage          Duplications   Tech Debt  │
│    0.0%               2.3%         3d 4h     │
│                                               │
├──────────────────────────────────────────────┤
│ New Code (Last 30 days)                      │
│  +1,234 lines  │  A  │  0 issues             │
└──────────────────────────────────────────────┘
```

#### Szczegóły Issue:
```
┌──────────────────────────────────────────────┐
│ 🔴 Critical Bug                               │
│ components/search/SearchBar.tsx:42           │
├──────────────────────────────────────────────┤
│ Possible null pointer dereference            │
│                                               │
│  40 | const handleSearch = (query: string) => {
│  41 |   const results = searchItems(query);
│> 42 |   setResults(results.data.items);  ❌
│  43 | };                                       │
│                                               │
│ 'results.data' might be undefined            │
│                                               │
│ ✅ Suggested fix:                             │
│   setResults(results?.data?.items ?? []);    │
│                                               │
│ 📚 Learn more: [SonarSource Rule S2259]      │
└──────────────────────────────────────────────┘
```

---

## 🎨 Codacy - Co To Jest?

### Historia i Firma
- **Twórca:** Codacy (Portugalia/USA)
- **Założenie:** 2012
- **Filozofia:** "Automated code reviews"
- **Używany przez:** Spotify, Samsung, Trivago

### Filozofia
> "Beautiful code quality" - piękne dashboardy i proste UI

---

## 🎯 Co Robi Codacy?

### 1. **Code Patterns**
Podobne do SonarCloud, ale:
- Mniej szczegółowe opisy
- Prostsze kategorie
- Ładniejsze UI

### 2. **Metryki**
```
Grade: A-F (jak w szkole)
├─ Issues: liczba problemów
├─ Complexity: cyklomatyczna złożoność
├─ Duplication: % duplikacji
└─ Coverage: % pokrycia testami
```

### 3. **Code Patterns (Reguły)**
- ~200 wzorców dla TypeScript
- Można włączać/wyłączać
- Mniej szczegółowe niż SonarCloud

---

## ⚔️ Bezpośrednie Porównanie

### 1. **Security (Bezpieczeństwo)**

**SonarCloud:**
- ✅ OWASP Top 10
- ✅ CWE Top 25
- ✅ SANS Top 25
- ✅ Taint analysis (śledzi przepływ danych)
- ✅ Secrets detection (wykrywa API keys)

**Codacy:**
- ✅ Podstawowe security patterns
- ❌ Brak taint analysis
- ✅ Secrets detection (przez integrację)

**Przykład:**
```typescript
// SonarCloud wykryje:
const userId = req.query.id; // untrusted input
const query = `SELECT * FROM users WHERE id = ${userId}`;
// 🔴 SQL Injection vulnerability (taint analysis)

// Codacy wykryje:
const apiKey = "sk-1234567890"; 
// 🟡 Hardcoded secret
```

**Werdykt:** SonarCloud wygrywa (głębsza analiza)

---

### 2. **Code Smells (Jakość Kodu)**

**SonarCloud:**
- ~400 reguł dla TypeScript
- Bardzo szczegółowe opisy
- Sugestie naprawy
- Linki do dokumentacji

**Codacy:**
- ~200 reguł dla TypeScript
- Krótsze opisy
- Mniej sugestii

**Przykład:**
```typescript
// Zbyt długa funkcja
function processUserData(user: User) {
  // 150 linii kodu...
}
```

**SonarCloud:**
```
🟡 Major Code Smell
Function has a Cognitive Complexity of 42 (threshold: 15)

Cognitive Complexity is a measure of how hard the control 
flow of a function is to understand. Functions with high 
Cognitive Complexity will be difficult to maintain.

Suggested actions:
1. Extract helper functions
2. Use early returns
3. Simplify nested conditions

See more: https://sonarsource.com/cognitive-complexity
```

**Codacy:**
```
⚠️ Complex Method
This method is too complex (complexity: 42)

Consider refactoring.
```

**Werdykt:** SonarCloud wygrywa (bardziej edukacyjne)

---

### 3. **UI/UX (Interfejs)**

**SonarCloud:**
- Funkcjonalny, ale "korporacyjny"
- Dużo danych, może przytłaczać
- Wymaga nauki

**Codacy:**
- 🎨 Piękny, nowoczesny design
- Intuicyjny
- Przyjemny w użyciu
- Lepsze wykresy

**Werdykt:** Codacy wygrywa (ładniejsze)

---

### 4. **GitHub Integration**

**SonarCloud:**
```
┌─────────────────────────────────┐
│ Pull Request #123               │
├─────────────────────────────────┤
│ ✅ SonarCloud Quality Gate      │
│                                 │
│ New Code: A                     │
│ • 0 Bugs                        │
│ • 0 Vulnerabilities             │
│ • 3 Code Smells                 │
│                                 │
│ Coverage: 85.2% (+2.1%)         │
│ Duplications: 1.2% (-0.3%)      │
│                                 │
│ [View Details on SonarCloud]    │
└─────────────────────────────────┘
```

**Codacy:**
```
┌─────────────────────────────────┐
│ Pull Request #123               │
├─────────────────────────────────┤
│ ✅ Codacy                        │
│                                 │
│ Grade: A                        │
│ • 2 new issues                  │
│ • Coverage: 85.2%               │
│                                 │
│ [View Details on Codacy]        │
└─────────────────────────────────┘
```

**Werdykt:** Remis (obie dobre)

---

### 5. **Dokumentacja i Wsparcie**

**SonarCloud:**
- ✅ Doskonała dokumentacja
- ✅ Aktywne community forum
- ✅ Regularne webinary
- ✅ Szczegółowe rule descriptions

**Codacy:**
- ✅ Dobra dokumentacja
- ⚠️ Mniejsze community
- ✅ Support chat (płatny plan)

**Werdykt:** SonarCloud wygrywa

---

### 6. **Dla Twojego Projektu (Next.js + TypeScript)**

**SonarCloud:**
- ✅ Świetne wsparcie dla Next.js
- ✅ Rozumie React hooks
- ✅ Wykrywa problemy z useEffect
- ✅ Analizuje SQL (Supabase queries)
- ✅ Sprawdza Python (Twoje skrypty!)

**Codacy:**
- ✅ Dobre wsparcie dla React
- ⚠️ Mniej specyficznych reguł dla Next.js
- ❌ Słabsza analiza SQL
- ✅ Sprawdza Python

**Werdykt:** SonarCloud wygrywa (lepiej dla Twojego stacku)

---

## 💰 Koszty (Przyszłość)

### Jeśli kiedyś będziesz chciał private repo:

**SonarCloud:**
```
$10/miesiąc
├─ Unlimited projects
├─ Unlimited users
├─ Unlimited LOC (lines of code)
└─ Wszystkie features
```

**Codacy:**
```
$15/user/miesiąc
├─ Dla 1 osoby: $15/miesiąc
├─ Dla 4 osób: $60/miesiąc
├─ Unlimited projects
└─ Wszystkie features
```

**Dla solo developera:** SonarCloud tańsze ($10 vs $15)  
**Dla zespołu 4 osoby:** SonarCloud DUŻO tańsze ($10 vs $60)

---

## 🏆 Ostateczny Werdykt

### Wybierz **SonarCloud** jeśli:
- ✅ Chcesz najlepszego security
- ✅ Zależy Ci na edukacji (szczegółowe opisy)
- ✅ Planujesz pracę w zespole
- ✅ Chcesz "industry standard"
- ✅ Masz Next.js + TypeScript + SQL
- ✅ Chcesz analizować Python scripts

### Wybierz **Codacy** jeśli:
- ✅ Zależy Ci na pięknym UI
- ✅ Chcesz prostsze narzędzie
- ✅ Pracujesz solo (max 4 osoby)
- ✅ Nie potrzebujesz głębokiej analizy security
- ✅ Chcesz szybki setup

---

## 🎯 Dla Twojego Projektu "Rekwizytor"

### Dlaczego SonarCloud:

1. **Security jest ważne** - masz Supabase, auth, SQL queries
2. **Uczysz się** - szczegółowe opisy nauczą Cię best practices
3. **Portfolio** - "SonarCloud Quality Gate: A" brzmi profesjonalnie
4. **Skalowalność** - jeśli projekt urośnie, nie musisz migrować
5. **Python scripts** - analizuje też Twoje skrypty testowe
6. **Darmowe na zawsze** - dla public repo

### Co dostaniesz:
```
✅ Analiza 41k linii kodu
✅ ~50-100 code smells (do naprawy)
✅ Security check (OWASP Top 10)
✅ Badge na GitHub README
✅ Automatyczne PR reviews
✅ Technical debt tracking
✅ Edukacja (każdy issue = mini-lekcja)
```

---

## 📚 Następne Kroki

### 1. Eksploracja (15 min)
- Wejdź na [sonarcloud.io](https://sonarcloud.io)
- Kliknij "Analyze your code for free"
- Zobacz przykładowe projekty (np. React, Next.js)

### 2. Setup (30 min)
- Połącz z GitHub
- Import projektu "rekwizytor"
- Pierwszy scan

### 3. Analiza (1h)
- Przejrzyj wyniki
- Zrozum każdą kategorię
- Zaplanuj naprawy

### 4. Integracja (30 min)
- Dodaj do GitHub Actions
- Ustaw Quality Gate
- Dodaj badge do README

---

## 🤔 Pytania?

Chcesz, żebym:
- [ ] Pokazał przykładowy raport SonarCloud dla podobnego projektu?
- [ ] Przygotował krok-po-kroku setup guide?
- [ ] Wyjaśnił konkretną metrykę bardziej szczegółowo?
- [ ] Porównał z jeszcze innymi narzędziami (DeepSource, CodeClimate)?

**Albo po prostu:** "OK, przekonałeś mnie, robimy SonarCloud - pokaż jak to skonfigurować!" 🚀
