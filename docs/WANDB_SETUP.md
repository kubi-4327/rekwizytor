# Weights & Biases Configuration

## Setup

1. **Create W&B Account**
   - Go to https://wandb.ai/signup
   - Create account (free tier)

2. **Get API Key**
   - Go to https://wandb.ai/authorize
   - Copy your API key

3. **Add to .env.local**
   ```bash
   WANDB_API_KEY=your_api_key_here
   WANDB_PROJECT=rekwizytor-embedding-tests
   WANDB_ENTITY=your_username  # optional
   ```

## Project Structure

**Project Name:** `rekwizytor-embedding-tests`

**Run Naming Convention:**
```
{embedding_model}_{enrichment_model}_{date}
Example: gem004_g25f_2026-01-21
```

## Logged Metrics

### Config (hyperparameters)
- `embedding_model`
- `enrichment_model` 
- `tester_model`
- `target_query_count`
- `difficulty_mode`
- `mvs_weight_identity`
- `mvs_weight_physical`
- `mvs_weight_context`
- `use_dynamic_weights`

### Metrics (per query)
- `accuracy_at_1` (running average)
- `accuracy_at_5`
- `accuracy_at_10`
- `mrr` (Mean Reciprocal Rank)
- `query_count`
- `success_rate`

### Final Summary
- `final_accuracy_at_1`
- `final_accuracy_at_5`
- `final_accuracy_at_10`
- `final_mrr`
- `final_avg_rank`
- `total_search_tokens`
- `total_tester_tokens`
- `total_cost_usd`

## Dashboard Views

### 1. Model Comparison
- Bar chart: Accuracy@1 by model
- Line chart: MRR trend
- Scatter: Accuracy vs Cost

### 2. Hyperparameter Analysis
- Parallel coordinates: weights vs accuracy
- Heatmap: weight combinations

### 3. Query Analysis
- Histogram: rank distribution
- Table: failed queries

## Usage

```typescript
// In your test code
import { logTestToWandB } from '@/utils/wandb-logger'

await logTestToWandB({
  runId: testRun.id,
  config: testConfig,
  metrics: finalMetrics
})
```

## Links

- Dashboard: https://wandb.ai/{entity}/rekwizytor-embedding-tests
- Docs: https://docs.wandb.ai/
