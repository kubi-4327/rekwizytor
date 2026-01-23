# W&B Export - Quick Start

## Co to robi?

Ten skrypt pobiera testy z PocketBase i uploaduje do Weights & Biases, gdzie możesz:
- 📊 Porównywać wyniki side-by-side
- 📈 Zobacz charts (automatic!)
- 🔍 Filter, group, analyze
- 🤝 Share dashboards

## Setup (5 min)

### 1. Zainstaluj Python dependencies
```bash
# Sprawdź Python (potrzebujesz 3.8+)
python3 --version

# Zainstaluj packages
pip3 install wandb requests python-dotenv
```

### 2. Login do W&B
```bash
wandb login
# Wklej API key z https://wandb.ai/authorize
```

### 3. Sprawdź .env.local
Upewnij się że masz:
```bash
POCKETBASE_URL=http://localhost:8090
POCKETBASE_ADMIN_EMAIL=admin@test.local
POCKETBASE_ADMIN_PASSWORD=admin123456
WANDB_API_KEY=your_key_here
WANDB_PROJECT=rekwizytor-embedding-tests
```

## Usage

### Upload wszystkich testów
```bash
python3 scripts/export_to_wandb.py
```

**Output:**
```
🚀 Exporting tests from PocketBase to W&B...

📡 Connecting to PocketBase...
✅ Connected!

📊 Fetching test runs...
✅ Found 3 tests

[1/3] Processing: google_004_g25f_#1
✅ Uploaded: google_004_g25f_#1
   Accuracy@1: 82.5%
   MRR: 0.867
   Cost: $0.0234

[2/3] Processing: openai_3large_g25f_#1
✅ Uploaded: openai_3large_g25f_#1
   Accuracy@1: 84.0%
   MRR: 0.881
   Cost: $0.0312

[3/3] Processing: openai_3small_g25f_#1
✅ Uploaded: openai_3small_g25f_#1
   Accuracy@1: 80.0%
   MRR: 0.854
   Cost: $0.0156

🎉 Done! View at: https://wandb.ai/rekwizytor-embedding-tests
```

## W&B Dashboard

### Co zobaczysz:
1. **Table** - All runs with metrics
2. **Charts** - Automatic comparisons
3. **Parallel Coordinates** - Hyperparameter analysis
4. **Scatter Plots** - Accuracy vs Cost

### Porównywanie:
1. Wybierz runs (checkboxes)
2. Kliknij "Compare"
3. Zobacz side-by-side metrics + charts

### Grouping:
- Group by: `embedding_model`
- Color by: `difficulty_mode`
- Filter: `accuracy_at_1 > 0.8`

## Troubleshooting

### "pip3: command not found"
```bash
# Install Python via Homebrew
brew install python3
```

### "wandb: command not found"
```bash
# Install wandb
pip3 install wandb
```

### "PocketBase connection failed"
```bash
# Check if PocketBase is running
curl http://localhost:8090/api/health

# Start PocketBase if needed
# (check your Docker setup)
```

### "No tests found"
Sprawdź czy masz testy w PocketBase:
```bash
curl -s http://localhost:8090/api/collections/embedding_test_runs/records | jq
```

## Next Steps

1. **Upload testy** - `python3 scripts/export_to_wandb.py`
2. **Otwórz W&B** - https://wandb.ai/your-username/rekwizytor-embedding-tests
3. **Porównaj** - Select runs → Compare
4. **Analyze** - Charts, filters, grouping

## Advanced

### Upload tylko nowych testów
Skrypt używa `run.id` jako W&B run ID, więc:
- Istniejące runs są update'owane
- Nowe runs są tworzone
- Safe to run multiple times

### Custom project name
```bash
# In .env.local
WANDB_PROJECT=my-custom-project-name
```

### Share dashboard
1. W&B dashboard → Share
2. Public link (lub invite team members)
