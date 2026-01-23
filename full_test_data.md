# Embedding Tests - Complete Data Export

**Generated:** 2026-01-21 22:46:52

**Total Valid Test Runs:** 9
**Excluded Invalid Tests:** 1

---

## 📊 Quick Summary

| # | Name | Status | Embedding | Enrichment | Queries | Acc@1 | MRR | Cost |
|---|------|--------|-----------|------------|---------|-------|-----|------|
| 1 | gpt5n_gem004_gpt4o_mwM_#1 | completed | Unknown Embeddi | No Enrichmen | 100 | 0.0% | 0.000 | $0.0038 |
| 2 | g25fl_gem004_gpt4o_mwM_#1 | completed | Unknown Embeddi | No Enrichmen | 100 | 0.0% | 0.000 | $0.0038 |
| 3 | g25f_gem004_gpt4o_mwM_#1 | completed | Unknown Embeddi | No Enrichmen | 200 | 38.0% | 0.493 | $0.0076 |
| 4 | gpt5n_gem004_gpt4o_mwM_#1 | completed | Unknown Embeddi | No Enrichmen | 200 | 35.5% | 0.445 | $0.0076 |
| 5 | gpt5n_oai3l_gpt4o_mwM_#1 | completed | Unknown Embeddi | No Enrichmen | 200 | 59.0% | 0.715 | $0.0076 |
| 6 | gpt5n_oai3s_gpt4o_mwM_#1 | completed | Unknown Embeddi | No Enrichmen | 200 | 57.0% | 0.709 | $0.0076 |
| 7 | g25f_oai3s_gpt4o_mwM_#1 | completed | Unknown Embeddi | No Enrichmen | 200 | 54.0% | 0.684 | $0.0076 |
| 8 | g25fl_oai3s_gpt4o_mwM_#1 | completed | Unknown Embeddi | No Enrichmen | 10 | 50.0% | 0.725 | $0.0004 |
| 9 | g25f_oai3l_gpt4o_mwM_#2 | completed | Unknown Embeddi | No Enrichmen | 200 | 76.5% | 0.836 | $0.0076 |

---

## 📋 Detailed Test Data

### Test 1: gpt5n_gem004_gpt4o_mwM_#1

**Configuration:**
- ID: `xy57zx64p9vlz4l`
- Status: completed
- Embedding: Unknown Embedding Model
- Embedding Code: `unknown`
- Enrichment: No Enrichment
- Enrichment Code: ``
- Tester: gpt-4o-mini
- Tester Code: `gpt-4o-mini`
- Target Queries: 100
- Completed Queries: 99
- Difficulty: medium
- Dynamic Weights: False
- Created: unknown

**Weights:**
- Identity: 0.4
- Physical: 0.3
- Context: 0.3

**Metrics:**
- Accuracy@1: **0.00%**
- Accuracy@5: 0.00%
- Accuracy@10: 0.00%
- Mean Reciprocal Rank: 0.0000
- Average Rank: 0.00
- Total Queries: 0
- Successful Queries: 0
- Success Rate: N/A

**Cost Analysis:**
- Search Tokens: 5,576
- Tester Tokens: 24,623
- Total Tokens: 30,199
- Total Cost: $0.0038
- Cost per Query: N/A

---

### Test 2: g25fl_gem004_gpt4o_mwM_#1

**Configuration:**
- ID: `74njf9gp9v1zoky`
- Status: completed
- Embedding: Unknown Embedding Model
- Embedding Code: `unknown`
- Enrichment: No Enrichment
- Enrichment Code: ``
- Tester: gpt-4o-mini
- Tester Code: `gpt-4o-mini`
- Target Queries: 100
- Completed Queries: 75
- Difficulty: medium
- Dynamic Weights: False
- Created: unknown

**Weights:**
- Identity: 0.4
- Physical: 0.3
- Context: 0.3

**Metrics:**
- Accuracy@1: **0.00%**
- Accuracy@5: 0.00%
- Accuracy@10: 0.00%
- Mean Reciprocal Rank: 0.0000
- Average Rank: 0.00
- Total Queries: 0
- Successful Queries: 0
- Success Rate: N/A

**Cost Analysis:**
- Search Tokens: 4,213
- Tester Tokens: 24,490
- Total Tokens: 28,703
- Total Cost: $0.0038
- Cost per Query: N/A

---

### Test 3: g25f_gem004_gpt4o_mwM_#1

**Configuration:**
- ID: `8i56osp5nvb19hj`
- Status: completed
- Embedding: Unknown Embedding Model
- Embedding Code: `unknown`
- Enrichment: No Enrichment
- Enrichment Code: ``
- Tester: gpt-4o-mini
- Tester Code: `gpt-4o-mini`
- Target Queries: 200
- Completed Queries: 200
- Difficulty: medium
- Dynamic Weights: False
- Created: unknown

**Weights:**
- Identity: 0.4
- Physical: 0.3
- Context: 0.3

**Metrics:**
- Accuracy@1: **38.00%**
- Accuracy@5: 62.00%
- Accuracy@10: 72.50%
- Mean Reciprocal Rank: 0.4930
- Average Rank: 5.42
- Total Queries: 200
- Successful Queries: 179
- Success Rate: 89.50%

**Cost Analysis:**
- Search Tokens: 11,181
- Tester Tokens: 49,043
- Total Tokens: 60,224
- Total Cost: $0.0076
- Cost per Query: $0.000038

**Sample Results (first 10 queries):**

| # | Query | Source | Rank | Top Result | Similarity |
|---|-------|--------|------|------------|------------|
| 1 | produkty z tkanin... | materiałowe | 18 | żelazka | 0.592 |
| 2 | do zapalania ognia... | zapalniczki | 1 | zapalniczki | 0.529 |
| 3 | przechowywanie drobiazgów... | koszyki wiklinowe | 7 | talerze | 0.607 |
| 4 | czytanie i nauka... | książki | 3 | gazety inne | 0.583 |
| 5 | prasowanie ubrań... | żelazka | 2 | talerze | 0.561 |
| 6 | przedmioty różne... | nieznane / różne | 4 | prezenty | 0.616 |
| 7 | sprzęt zdrowotny... | medyczne | 1 | medyczne | 0.570 |
| 8 | substytut naturalnych pokarmów... | jedzenie sztuczne | 3 | owoce sztuczne | 0.559 |
| 9 | odbiór sygnału audio... | radia | 1 | radia | 0.586 |
| 10 | planowanie wydarzeń... | Scenariusze | 3 | jedzenie sztuczne | 0.564 |

**Failed Queries (55):**
1. "produkty z tkanin" (expected: materiałowe)
2. "opakowania na napoje" (expected: butelki po winie)
3. "przechowywanie płynów" (expected: butelki inne)
4. "druk na papierze" (expected: CZARNO NA BIAŁYM)
5. "przechowywanie płynów" (expected: butelki inne)
...and 50 more

---

### Test 4: gpt5n_gem004_gpt4o_mwM_#1

**Configuration:**
- ID: `m15htdhmb02zkd2`
- Status: completed
- Embedding: Unknown Embedding Model
- Embedding Code: `unknown`
- Enrichment: No Enrichment
- Enrichment Code: ``
- Tester: gpt-4o-mini
- Tester Code: `gpt-4o-mini`
- Target Queries: 200
- Completed Queries: 200
- Difficulty: medium
- Dynamic Weights: False
- Created: unknown

**Weights:**
- Identity: 0.4
- Physical: 0.3
- Context: 0.3

**Metrics:**
- Accuracy@1: **35.50%**
- Accuracy@5: 51.50%
- Accuracy@10: 66.50%
- Mean Reciprocal Rank: 0.4448
- Average Rank: 4.79
- Total Queries: 200
- Successful Queries: 157
- Success Rate: 78.50%

**Cost Analysis:**
- Search Tokens: 11,188
- Tester Tokens: 49,438
- Total Tokens: 60,626
- Total Cost: $0.0076
- Cost per Query: $0.000038

**Sample Results (first 10 queries):**

| # | Query | Source | Rank | Top Result | Similarity |
|---|-------|--------|------|------------|------------|
| 1 | przechowywanie i organizacja... | koszyki wiklinowe | 0 | segregatory | 0.625 |
| 2 | przytulanki dla dzieci... | pluszowe maskotki | 1 | pluszowe maskotki | 0.660 |
| 3 | czytanie i nauka... | książki | 1 | książki | 0.575 |
| 4 | dekoracja wnętrz... | owoce sztuczne | 8 | lampiony | 0.675 |
| 5 | Przechowywanie i transport... | Pudła kartonowe | 0 | medyczne | 0.557 |
| 6 | film komediowy grozy... | BEETLEJUICE | 0 | gazety kolorowe | 0.547 |
| 7 | ochrona twarzy zdrowie... | maski | 0 | medyczne | 0.579 |
| 8 | budowa, meble, podłogi... | deski | 9 | gospodarstwo domowe | 0.669 |
| 9 | materiał budowlany drewniany... | deski | 11 | owoce sztuczne | 0.637 |
| 10 | tkaniny do szycia... | materiałowe | 0 | butelki inne | 0.626 |

**Failed Queries (67):**
1. "przechowywanie i organizacja" (expected: koszyki wiklinowe)
2. "Przechowywanie i transport" (expected: Pudła kartonowe)
3. "film komediowy grozy" (expected: BEETLEJUICE)
4. "ochrona twarzy zdrowie" (expected: maski)
5. "materiał budowlany drewniany" (expected: deski)
...and 62 more

---

### Test 5: gpt5n_oai3l_gpt4o_mwM_#1

**Configuration:**
- ID: `zfpnf90g1ympcey`
- Status: completed
- Embedding: Unknown Embedding Model
- Embedding Code: `unknown`
- Enrichment: No Enrichment
- Enrichment Code: ``
- Tester: gpt-4o-mini
- Tester Code: `gpt-4o-mini`
- Target Queries: 200
- Completed Queries: 200
- Difficulty: medium
- Dynamic Weights: False
- Created: unknown

**Weights:**
- Identity: 0.4
- Physical: 0.3
- Context: 0.3

**Metrics:**
- Accuracy@1: **59.00%**
- Accuracy@5: 89.00%
- Accuracy@10: 94.00%
- Mean Reciprocal Rank: 0.7146
- Average Rank: 2.61
- Total Queries: 200
- Successful Queries: 198
- Success Rate: 99.00%

**Cost Analysis:**
- Search Tokens: 11,229
- Tester Tokens: 49,430
- Total Tokens: 60,659
- Total Cost: $0.0076
- Cost per Query: $0.000038

**Sample Results (first 10 queries):**

| # | Query | Source | Rank | Top Result | Similarity |
|---|-------|--------|------|------------|------------|
| 1 | czytanie i nauka... | książki | 1 | książki | 0.463 |
| 2 | kontrastujący wzór graficzny... | CZARNO NA BIAŁYM | 7 | MISJA: ROZRYWKA! 29. | 0.425 |
| 3 | Pojemniki na napoje... | kufle | 3 | butelki po piwie | 0.444 |
| 4 | pisanie tekstów mechaniczne... | maszyny do pisania | 1 | maszyny do pisania | 0.545 |
| 5 | planowanie wydarzeń... | Scenariusze | 2 | MISJA: ROZRYWKA! 29. | 0.412 |
| 6 | naczynia do piwa... | kufle | 1 | kufle | 0.574 |
| 7 | przechowywanie drobiazgów... | koszyki wiklinowe | 10 | butelki inne | 0.490 |
| 8 | nauka geografii, dekoracja wnę... | globusy | 1 | globusy | 0.520 |
| 9 | wszystko i nic... | nieznane / różne | 14 | gospodarstwo domowe | 0.431 |
| 10 | sterowanie telewizorem... | piloty do tv | 1 | piloty do tv | 0.486 |

**Failed Queries (12):**
1. "wszystko i nic" (expected: nieznane / różne)
2. "przechowywanie przedmiotów" (expected: koszyki wiklinowe)
3. "przechowywanie przedmiotów" (expected: torby)
4. "rozrywka sceniczna" (expected: CABARET)
5. "rozrywka i występy" (expected: CABARET)
...and 7 more

---

### Test 6: gpt5n_oai3s_gpt4o_mwM_#1

**Configuration:**
- ID: `rabl385lnxouvw9`
- Status: completed
- Embedding: Unknown Embedding Model
- Embedding Code: `unknown`
- Enrichment: No Enrichment
- Enrichment Code: ``
- Tester: gpt-4o-mini
- Tester Code: `gpt-4o-mini`
- Target Queries: 200
- Completed Queries: 200
- Difficulty: medium
- Dynamic Weights: False
- Created: unknown

**Weights:**
- Identity: 0.4
- Physical: 0.3
- Context: 0.3

**Metrics:**
- Accuracy@1: **57.00%**
- Accuracy@5: 87.50%
- Accuracy@10: 92.50%
- Mean Reciprocal Rank: 0.7094
- Average Rank: 2.30
- Total Queries: 200
- Successful Queries: 191
- Success Rate: 95.50%

**Cost Analysis:**
- Search Tokens: 11,203
- Tester Tokens: 49,251
- Total Tokens: 60,454
- Total Cost: $0.0076
- Cost per Query: $0.000038

**Sample Results (first 10 queries):**

| # | Query | Source | Rank | Top Result | Similarity |
|---|-------|--------|------|------------|------------|
| 1 | Naczynia do piwa... | kufle | 1 | kufle | 0.528 |
| 2 | przechowywanie przedmiotów... | torby | 16 | segregatory | 0.414 |
| 3 | informacje z zagranicy... | gazety zagraniczne | 1 | gazety zagraniczne | 0.429 |
| 4 | amunicja dla wilków... | Zapas Wilczy księżyc | 1 | Zapas Wilczy księżyc | 0.371 |
| 5 | Sylwester 2024 wydarzenie... | MISJA: ROZRYWKA! 29. | 1 | MISJA: ROZRYWKA! 29. | 0.444 |
| 6 | przechowywanie drobiazgów... | koszyki wiklinowe | 1 | koszyki wiklinowe | 0.378 |
| 7 | rekwizyty do sztuk teatralnych... | broń sceniczna | 5 | maski | 0.477 |
| 8 | informacje i aktualności... | gazety inne | 1 | gazety inne | 0.456 |
| 9 | informacje z innych krajów... | gazety zagraniczne | 2 | gazety inne | 0.451 |
| 10 | strzyżenie włosów męskich... | brzytwy | 1 | brzytwy | 0.424 |

**Failed Queries (15):**
1. "przechowywanie przedmiotów" (expected: torby)
2. "zapasy dla wilka" (expected: Zapas Wilczy księżyc)
3. "przenoszenie rzeczy osobistych" (expected: plecaki)
4. "dekoracja artystyczna wnętrz" (expected: CZARNO NA BIAŁYM)
5. "przechowywanie przedmiotów" (expected: torby)
...and 10 more

---

### Test 7: g25f_oai3s_gpt4o_mwM_#1

**Configuration:**
- ID: `jsq7qx1irj5xvwr`
- Status: completed
- Embedding: Unknown Embedding Model
- Embedding Code: `unknown`
- Enrichment: No Enrichment
- Enrichment Code: ``
- Tester: gpt-4o-mini
- Tester Code: `gpt-4o-mini`
- Target Queries: 200
- Completed Queries: 200
- Difficulty: medium
- Dynamic Weights: False
- Created: unknown

**Weights:**
- Identity: 0.4
- Physical: 0.3
- Context: 0.3

**Metrics:**
- Accuracy@1: **54.00%**
- Accuracy@5: 91.50%
- Accuracy@10: 94.50%
- Mean Reciprocal Rank: 0.6840
- Average Rank: 2.29
- Total Queries: 200
- Successful Queries: 195
- Success Rate: 97.50%

**Cost Analysis:**
- Search Tokens: 11,204
- Tester Tokens: 49,232
- Total Tokens: 60,436
- Total Cost: $0.0076
- Cost per Query: $0.000038

**Sample Results (first 10 queries):**

| # | Query | Source | Rank | Top Result | Similarity |
|---|-------|--------|------|------------|------------|
| 1 | dekoracja wnętrz... | owoce sztuczne | 4 | Kwiaty | 0.478 |
| 2 | źródło wiedzy... | książki | 7 | gazety zagraniczne | 0.333 |
| 3 | opakowanie dla pizzy... | pudełka na pizze | 1 | pudełka na pizze | 0.510 |
| 4 | Dekoracja i prezentacja... | Kwiaty | 1 | Kwiaty | 0.496 |
| 5 | opakowania na napoje... | butelki po piwie | 3 | Pudła kartonowe | 0.527 |
| 6 | naczynia do serwowania... | talerze | 1 | talerze | 0.522 |
| 7 | dekoracja wnętrz domu... | owoce sztuczne | 4 | Kwiaty | 0.473 |
| 8 | sztuka, dekoracja wnętrz... | obrazy | 1 | obrazy | 0.526 |
| 9 | przechowywanie rzeczy... | torby | 5 | Pudła kartonowe | 0.472 |
| 10 | naczynia do piwa... | kufle | 1 | kufle | 0.538 |

**Failed Queries (11):**
1. "przechowywanie przedmiotów" (expected: torby)
2. "recykling, dekoracje, przechowywanie" (expected: butelki po winie)
3. "kolorowe oświetlenie dekoracyjne" (expected: CURIE - TRZY KOLORY)
4. "przechowywanie przedmiotów" (expected: torby)
5. "przechowywanie płynów" (expected: butelki inne)
...and 6 more

---

### Test 8: g25fl_oai3s_gpt4o_mwM_#1

**Configuration:**
- ID: `082yxq5zd70xkdt`
- Status: completed
- Embedding: Unknown Embedding Model
- Embedding Code: `unknown`
- Enrichment: No Enrichment
- Enrichment Code: ``
- Tester: gpt-4o-mini
- Tester Code: `gpt-4o-mini`
- Target Queries: 10
- Completed Queries: 10
- Difficulty: medium
- Dynamic Weights: False
- Created: unknown

**Weights:**
- Identity: 0.4
- Physical: 0.3
- Context: 0.3

**Metrics:**
- Accuracy@1: **50.00%**
- Accuracy@5: 100.00%
- Accuracy@10: 100.00%
- Mean Reciprocal Rank: 0.7250
- Average Rank: 1.70
- Total Queries: 10
- Successful Queries: 10
- Success Rate: 100.00%

**Cost Analysis:**
- Search Tokens: 561
- Tester Tokens: 2,447
- Total Tokens: 3,008
- Total Cost: $0.0004
- Cost per Query: $0.000038

**Sample Results (first 10 queries):**

| # | Query | Source | Rank | Top Result | Similarity |
|---|-------|--------|------|------------|------------|
| 1 | przechowywanie dokumentów... | segregatory | 1 | segregatory | 0.467 |
| 2 | oświetlenie dekoracyjne na zew... | lampiony | 2 | lampy | 0.434 |
| 3 | miejsce występów artystycznych... | CABARET | 2 | obrazy | 0.490 |
| 4 | źródło światła... | lampy | 1 | lampy | 0.420 |
| 5 | zarządzanie domem... | gospodarstwo domowe | 1 | gospodarstwo domowe | 0.439 |
| 6 | odbiór dźwięku audio... | radia | 2 | płyty winylowe | 0.413 |
| 7 | tworzenie dokumentów tekstowyc... | maszyny do pisania | 4 | papiery | 0.454 |
| 8 | film o duchach... | BEETLEJUICE | 2 | broń sceniczna | 0.390 |
| 9 | film komediowy grozy... | BEETLEJUICE | 1 | BEETLEJUICE | 0.414 |
| 10 | pisanie tekstów ręcznych... | maszyny do pisania | 1 | maszyny do pisania | 0.456 |

---

### Test 9: g25f_oai3l_gpt4o_mwM_#2

**Configuration:**
- ID: `f5084yoqk16pry2`
- Status: completed
- Embedding: Unknown Embedding Model
- Embedding Code: `unknown`
- Enrichment: No Enrichment
- Enrichment Code: ``
- Tester: gpt-4o-mini
- Tester Code: `gpt-4o-mini`
- Target Queries: 200
- Completed Queries: 200
- Difficulty: medium
- Dynamic Weights: False
- Created: unknown

**Weights:**
- Identity: 0.4
- Physical: 0.3
- Context: 0.3

**Metrics:**
- Accuracy@1: **76.50%**
- Accuracy@5: 93.00%
- Accuracy@10: 96.00%
- Mean Reciprocal Rank: 0.8357
- Average Rank: 1.81
- Total Queries: 200
- Successful Queries: 197
- Success Rate: 98.50%

**Cost Analysis:**
- Search Tokens: 11,181
- Tester Tokens: 49,332
- Total Tokens: 60,513
- Total Cost: $0.0076
- Cost per Query: $0.000038

**Sample Results (first 10 queries):**

| # | Query | Source | Rank | Top Result | Similarity |
|---|-------|--------|------|------------|------------|
| 1 | Dekoracja i prezentacja... | Kwiaty | 7 | jedzenie sztuczne | 0.499 |
| 2 | impreza sylwestrowa na żywo... | MISJA: ROZRYWKA! 29. | 2 | MISJA: ROZRYWKA! 29. | 0.583 |
| 3 | tworzenie tekstów, pisanie dok... | maszyny do pisania | 2 | papiery | 0.524 |
| 4 | materiały do pisania... | papiery | 1 | papiery | 0.575 |
| 5 | naczynia do serwowania... | talerze | 1 | talerze | 0.602 |
| 6 | Zapas do gry RPG... | Zapas Wilczy księżyc | 1 | Zapas Wilczy księżyc | 0.379 |
| 7 | prasowanie ubrań... | żelazka | 1 | żelazka | 0.507 |
| 8 | komunikacja z innymi... | telefony | 1 | telefony | 0.419 |
| 9 | nauka geografii, dekoracja wnę... | globusy | 1 | globusy | 0.498 |
| 10 | prasowanie ubrań... | żelazka | 1 | żelazka | 0.507 |

**Failed Queries (8):**
1. "przechowywanie drobiazgów" (expected: koszyki wiklinowe)
2. "przechowywanie drobiazgów" (expected: koszyki wiklinowe)
3. "rozrywka sceniczna" (expected: CABARET)
4. "przedmiot do ulepszania" (expected: Zapas Wilczy księżyc)
5. "kolorowe akcesoria biurowe" (expected: CURIE - TRZY KOLORY)
...and 3 more

---

## 📖 Appendix: Naming Convention Guide

### Test Name Format

```
{enrichment}_{embedding}_{tester}_{mode}_#{number}
```

**Example:** `g25f_oai3l_gpt4o_mwM_#2`
- Enrichment: `g25f` = Gemini 2.5 Flash
- Embedding: `oai3l` = OpenAI text-embedding-3-large
- Tester: `gpt4o` = GPT-4o
- Mode: `mwM` = Manual Weights, Medium difficulty
- Number: `#2` = Second run

### Enrichment Model Codes

| Code | Model Name |
|------|------------|
| `g25f` | Gemini 2.5 Flash |
| `g25fl` | Gemini 2.5 Flash Lite |
| `g25p` | Gemini 2.5 Pro |
| `gpt5n` | GPT-5 Nano |
| `gpt4m` | GPT-4o Mini |
| `gpt4o` | GPT-4o |
| `none` | No Enrichment |

### Embedding Model Codes

| Code | Model Name | Provider |
|------|------------|----------|
| `gem004` | text-embedding-004 | Google |
| `oai3l` | text-embedding-3-large | OpenAI |
| `oai3s` | text-embedding-3-small | OpenAI |
| `voy3` | Voyage AI 3 | Voyage |
| `voy35` | Voyage AI 3.5 | Voyage |

### Tester Model Codes

| Code | Model Name |
|------|------------|
| `gpt4o` | GPT-4o |
| `gpt4m` | GPT-4o Mini |
| `g25f` | Gemini 2.5 Flash |

### Mode Codes

| Code | Meaning |
|------|----------|
| `mwM` | **Manual Weights, Medium** - Fixed weights, medium difficulty |
| `dwM` | **Dynamic Weights, Medium** - AI-adjusted weights per query |
| `mwE` | **Manual Weights, Easy** - Fixed weights, easy difficulty |
| `mwH` | **Manual Weights, Hard** - Fixed weights, hard difficulty |

### Weight Types

**Manual Weights (mw):**
- Identity, Physical, Context weights are fixed
- Same weights used for all queries
- More consistent, less expensive

**Dynamic Weights (dw):**
- Weights adjusted per query based on intent
- AI classifies query intent → adjusts weights
- More adaptive, slightly more expensive

### Difficulty Modes

- **Easy (E):** Simple, direct queries
- **Medium (M):** Standard queries with some complexity
- **Hard (H):** Complex, ambiguous, or tricky queries

