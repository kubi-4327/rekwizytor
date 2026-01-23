# 📊 Narzędzia do analizy i wizualizacji wyników embeddings

## Przegląd

Ten dokument zawiera przegląd narzędzi do analizy 175 zaimportowanych rekordów testów embeddings z PocketBase, ze szczególnym uwzględnieniem porównania różnych API (OpenAI, Cohere, Gemini).

---

## 🎯 Top 10 rekomendowanych narzędzi

### Kategoria 1: Szybka analiza (najłatwiejsze)

#### 1. **PocketBase Admin UI** ✅ Już dostępne
- **URL:** http://localhost:8090/_/
- **Funkcje:** Sortowanie, filtrowanie, eksport CSV/JSON
- **Najlepsze dla:** Szybki przegląd surowych danych
- **Setup:** 0 min (już działający)

#### 2. **SQLite Browser** (DB Browser for SQLite)
- **Instalacja:** `brew install --cask db-browser-for-sqlite`
- **Funkcje:** SQL queries, wizualne przeglądanie, podstawowe wykresy
- **Najlepsze dla:** SQL queries, szybkie analizy
- **Setup:** 5 min

#### 3. **DataGrip / DBeaver**
- **Wersje:** DataGrip (płatne, JetBrains) lub DBeaver (darmowe)
- **Funkcje:** Potężne SQL IDE, eksport do różnych formatów
- **Najlepsze dla:** Zaawansowane SQL queries
- **Setup:** 10-15 min

---

### Kategoria 2: Wizualizacja (wykresy, dashboardy)

#### 4. **Jupyter Notebook + pandas + plotly** 🏆 Rekomendowane
- **Instalacja:**
  ```bash
  pip install jupyter pandas plotly sqlite3
  jupyter notebook
  ```
- **Przykładowy kod:**
  ```python
  import sqlite3
  import pandas as pd
  import plotly.express as px

  # Połącz z PocketBase SQLite
  conn = sqlite3.connect('./pb_data/data.db')
  df = pd.read_sql_query("SELECT * FROM embedding_test_results", conn)

  # Wykres: Similarity margin vs correct rank
  fig = px.scatter(df, x='correct_rank', y='similarity_margin', 
                   color='query_intent', hover_data=['source_group_name'],
                   title='Embedding Quality by Query Intent')
  fig.show()
  ```
- **Najlepsze dla:** Eksploracyjna analiza danych, interaktywne wykresy
- **Setup:** 30 min

#### 5. **Metabase**
- **Instalacja:** `docker run -p 3000:3000 metabase/metabase`
- **Funkcje:** GUI do tworzenia dashboardów bez kodu
- **Najlepsze dla:** Dashboardy dla zespołu/stakeholderów
- **Setup:** 2-3 h (konfiguracja dashboardów)

#### 6. **Apache Superset**
- **Typ:** Open-source BI (by Airbnb)
- **Funkcje:** Bardzo potężne dashboardy, SQL Lab
- **Najlepsze dla:** Profesjonalne dashboardy produkcyjne
- **Setup:** 3-4 h

---

### Kategoria 3: Zaawansowana analiza ML

#### 7. **Streamlit** 🏆 Rekomendowane
- **Instalacja:** `pip install streamlit`
- **Przykładowy kod:**
  ```python
  import streamlit as st
  import sqlite3
  import pandas as pd

  st.title("🔍 Embedding API Comparison")
  
  conn = sqlite3.connect('./pb_data/data.db')
  df = pd.read_sql_query("SELECT * FROM embedding_test_results", conn)
  
  # Filtry
  api = st.selectbox("Select API", df['api'].unique())
  filtered = df[df['api'] == api]
  
  # Metryki
  col1, col2, col3 = st.columns(3)
  col1.metric("Avg Rank", f"{filtered['correct_rank'].mean():.2f}")
  col2.metric("Avg Margin", f"{filtered['similarity_margin'].mean():.3f}")
  col3.metric("Total Tokens", filtered['search_tokens'].sum())
  
  # Wykresy
  st.bar_chart(filtered.groupby('query_intent')['similarity_margin'].mean())
  ```
- **Uruchomienie:** `streamlit run dashboard.py`
- **Najlepsze dla:** Custom dashboardy, szybkie prototypy
- **Setup:** 1-2 h

#### 8. **Observable** (https://observablehq.com)
- **Typ:** JavaScript notebooks w chmurze
- **Funkcje:** Bardzo ładne wizualizacje D3.js, współdzielenie
- **Najlepsze dla:** Interaktywne wizualizacje, prezentacje
- **Setup:** 2-3 h

---

### Kategoria 4: Specjalistyczne (embeddings)

#### 9. **Embedding Projector** (TensorFlow)
- **URL:** https://projector.tensorflow.org/
- **Funkcje:** Wizualizacja high-dimensional data, 3D scatter, PCA, t-SNE, UMAP
- **Najlepsze dla:** Wizualizacja samych embeddings w przestrzeni 3D
- **Setup:** 1-2 h (przygotowanie danych)

#### 10. **Weights & Biases (W&B)** 🏆 Najbardziej zaawansowane

---

## 🚀 Weights & Biases - Szczegółowy przewodnik

### Co to jest?
**W&B** to platforma do śledzenia eksperymentów ML - "Git dla machine learning". Automatycznie loguje, porównuje i wizualizuje Twoje eksperymenty.

### Dlaczego dla embeddings?
- Porównanie różnych API (OpenAI vs Cohere vs Gemini)
- Śledzenie konfiguracji (weights, temperature, difficulty)
- Automatyczne wykresy i dashboardy
- Historia wszystkich testów

---

### Kluczowe funkcje

#### 1. Experiment Tracking
```python
import wandb

# Rozpocznij śledzenie
wandb.init(
    project="embedding-api-comparison",
    config={
        "embedding_model": "text-embedding-3-large",
        "api": "openai",
        "mvs_weight_identity": 0.4,
        "mvs_weight_physical": 0.3,
        "mvs_weight_context": 0.3,
        "difficulty_mode": "medium"
    }
)

# W&B automatycznie śledzi
for test in test_results:
    wandb.log({
        "correct_rank": test.correct_rank,
        "similarity_margin": test.similarity_margin,
        "search_tokens": test.search_tokens,
        "query_intent": test.query_intent
    })

wandb.finish()
```

#### 2. Automatic Charts & Dashboards
W&B **automatycznie** tworzy:
- Parallel coordinates (porównanie konfiguracji)
- Scatter plots (margin vs rank)
- Histogramy (rozkład wyników)
- Time series (postęp w czasie)

#### 3. Run Comparison Table
| Run | API | Model | Avg Rank | Margin | Tokens | Cost |
|-----|-----|-------|----------|--------|--------|------|
| 1 | OpenAI | ada-002 | 2.1 | 0.045 | 12k | $0.02 |
| 2 | OpenAI | 3-large | **1.4** | **0.082** | 18k | $0.08 |
| 3 | Cohere | embed-v3 | 1.9 | 0.067 | 15k | $0.04 |
| 4 | Gemini | 1.5-pro | 2.3 | 0.059 | 20k | $0.10 |

**Funkcje:** Sortowanie, filtrowanie, grupowanie

#### 4. Hyperparameter Sweep (automatyczne testowanie)
```python
sweep_config = {
    'method': 'grid',
    'metric': {'name': 'avg_correct_rank', 'goal': 'minimize'},
    'parameters': {
        'api': {'values': ['openai', 'cohere', 'gemini']},
        'mvs_weight_identity': {'values': [0.3, 0.4, 0.5]},
        'mvs_weight_physical': {'values': [0.2, 0.3, 0.4]},
    }
}

sweep_id = wandb.sweep(sweep_config, project="embeddings")
wandb.agent(sweep_id, function=run_embedding_test)
```
**Rezultat:** Automatyczne testowanie 27 kombinacji i znalezienie najlepszej!

#### 5. Artifacts (wersjonowanie embeddings)
```python
# Zapisz embeddings
artifact = wandb.Artifact('embeddings-v1', type='dataset')
artifact.add_file('embeddings.json')
wandb.log_artifact(artifact)

# Użyj później
artifact = wandb.use_artifact('embeddings-v1:latest')
artifact.download()
```

---

### 💰 Pricing W&B

**Free tier** (wystarczający dla Ciebie):
- ✅ Unlimited runs
- ✅ 100 GB storage
- ✅ 1 team member
- ✅ 7 dni historii runs (potem archiwum)

**Paid ($50/msc):**
- Team collaboration
- Unlimited history
- Priority support

---

### 🔧 Setup W&B dla Twojego projektu

#### Instalacja
```bash
pip install wandb
wandb login  # API key z wandb.ai
```

#### Integracja ze skryptem
```typescript
// scripts/compare-embeddings-wandb.ts
import wandb from '@wandb/sdk'

async function compareWithWandb(api: string) {
  // Init W&B run
  const run = await wandb.init({
    project: 'rekwizytor-embeddings',
    config: {
      api: api,
      embedding_model: getModelName(api),
      test_count: 100
    }
  })

  // Pobierz wyniki z PocketBase
  const results = await pb.collection('embedding_test_results')
    .getFullList({ filter: `api="${api}"` })

  // Oblicz metryki
  const metrics = calculateMetrics(results)

  // Log do W&B
  await wandb.log({
    avg_correct_rank: metrics.avgRank,
    avg_similarity_margin: metrics.avgMargin,
    total_tokens: metrics.totalTokens,
    cost_estimate: metrics.cost
  })

  // Log każdy wynik indywidualnie
  for (const result of results) {
    await wandb.log({
      correct_rank: result.correct_rank,
      similarity_margin: result.similarity_margin,
      query_intent: result.query_intent
    })
  }

  await run.finish()
}
```

#### Workflow
```bash
# 1. Test OpenAI
npm run test:compare -- --api=openai
# → Auto-log do W&B

# 2. Test Cohere
npm run test:compare -- --api=cohere
# → Kolejny run w W&B

# 3. Test Gemini
npm run test:compare -- --api=gemini
# → Trzeci run

# 4. Otwórz dashboard
open https://wandb.ai/yourteam/rekwizytor-embeddings
# → Porównaj wszystkie runy!
```

---

### 📊 Co zobaczysz w W&B Dashboard

#### Overview Tab
- Liczba runs: 24
- Najlepszy model: OpenAI text-embedding-3-large
- Średni koszt: $0.05/test
- Czas wykonania: 2.5h

#### Charts Tab (automatyczne)
- **Parallel Coordinates:** Zależności między weights a wynikami
- **Scatter:** Similarity margin vs tokens
- **Bar:** Porównanie API
- **Line:** Postęp w czasie

#### System Metrics (automatyczne)
- CPU usage
- Memory
- GPU (jeśli używasz)
- Network I/O

---

### ⚡ W&B vs Alternatywy

| Feature | W&B | MLflow | TensorBoard | Metabase |
|---------|-----|--------|-------------|----------|
| **Setup** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Cloud hosting** | ✅ Free | ❌ | ❌ | ❌ |
| **Auto charts** | ✅ Mnóstwo | ⚠️ Podstawowe | ⚠️ Podstawowe | ❌ |
| **Hyperparameter sweep** | ✅ | ✅ | ❌ | ❌ |
| **Collaboration** | ✅ | ⚠️ | ❌ | ✅ |
| **Embedding-specific** | ✅ | ❌ | ✅ | ❌ |
| **Koszt** | 🆓 Free tier | 🆓 | 🆓 | 🆓 |

---

## 🎯 Moja rekomendacja - Plan działania

### Faza 1: Quick Start (dzisiaj, 2-3h)
1. **Jupyter Notebook** - eksploracyjna analiza
   - Podstawowe statystyki
   - Pierwsze wykresy
   - Identyfikacja wzorców

### Faza 2: Dashboard (tydzień 1, 4-6h)
2. **Streamlit** lub **Metabase** - dashboard
   - Comparison view (API vs API)
   - Trend analysis
   - Cost calculator

### Faza 3: Advanced (tydzień 2+)
3. **W&B** - długoterminowe śledzenie
   - Nowe testy z różnymi API
   - Hyperparameter tuning
   - Team collaboration

### Faza 4: Prezentacja (gdy potrzeba)
4. **Observable** lub **Embedding Projector**
   - Piękne wizualizacje dla stakeholderów
   - 3D projection embeddings

---

## 📁 Struktura plików projektu

```
rekwizytor/
├── analysis/
│   ├── notebooks/
│   │   ├── 01_exploratory_analysis.ipynb
│   │   ├── 02_api_comparison.ipynb
│   │   └── 03_cost_analysis.ipynb
│   ├── dashboards/
│   │   ├── streamlit_app.py
│   │   └── metabase_config.json
│   └── wandb/
│       ├── wandb_integration.ts
│       └── sweep_config.yaml
└── data/
    └── supabase-export.json
```

---

## 🔗 Przydatne linki

### Dokumentacja
- **W&B:** https://docs.wandb.ai/
- **Streamlit:** https://docs.streamlit.io/
- **Plotly:** https://plotly.com/python/
- **Metabase:** https://www.metabase.com/docs/

### Tutorials
- **W&B Quickstart:** https://docs.wandb.ai/quickstart
- **Streamlit for ML:** https://streamlit.io/gallery
- **Embedding Projector:** https://projector.tensorflow.org/

### Community
- **W&B Discord:** https://wandb.ai/community
- **Streamlit Forum:** https://discuss.streamlit.io/

---

## 💡 Następne kroki

1. ✅ **Dane gotowe** - 175 rekordów w PocketBase
2. ⏭️ **Wybór narzędzia** - polecam start z Jupyter/Streamlit
3. ⏭️ **Pierwsza analiza** - porównanie 3 API
4. ⏭️ **Dashboard setup** - dla zespołu
5. ⏭️ **W&B integration** - długoterminowe śledzenie

---

**Utworzono:** 2026-01-21  
**Autor:** Migracja Supabase → PocketBase  
**Status:** Gotowe do użycia

Powodzenia w analizie! 🚀
