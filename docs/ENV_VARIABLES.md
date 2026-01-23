# Environment Variables Guide

## File Structure

```
.env.example      # Template with comments (commit to git)
.env.local        # Your actual values (NEVER commit!)
.env.production   # Production values (deploy only)
```

## Syntax Rules

### Comments
```bash
# This is a comment
# Comments must start with #
# Inline comments are NOT supported:
API_KEY=abc123  # This will break!
```

### Sections
```bash
# ============================================
# SECTION HEADER
# ============================================

# Subsection
# --------------------------------------------
```

### Variables
```bash
# Simple value
API_KEY=your_key_here

# URL
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Multi-word (no spaces!)
NEXT_PUBLIC_APP_NAME=MyApp  # ✅ Good
NEXT_PUBLIC_APP_NAME=My App # ❌ Bad (space breaks it)

# Empty value (optional)
OPTIONAL_KEY=

# Boolean
ENABLE_FEATURE=true
```

## Best Practices

### 1. Group Related Variables
```bash
# ============================================
# DATABASE
# ============================================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mydb

# ============================================
# EMAIL
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
```

### 2. Add Descriptions
```bash
# Google API Key
# Get from: https://console.cloud.google.com
# Used for: Maps, Analytics
GOOGLE_API_KEY=your_key
```

### 3. Mark Required vs Optional
```bash
# REQUIRED - App won't start without this
DATABASE_URL=postgresql://...

# OPTIONAL - Graceful fallback if missing
ANALYTICS_KEY=
```

### 4. Include Example Values
```bash
# Format: https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co
```

## Common Mistakes

### ❌ Spaces around =
```bash
API_KEY = value  # WRONG
API_KEY=value    # CORRECT
```

### ❌ Quotes (usually not needed)
```bash
API_KEY="value"  # Works but unnecessary
API_KEY=value    # Preferred
```

### ❌ Inline comments
```bash
API_KEY=value # comment  # WRONG - comment becomes part of value!
# Comment here
API_KEY=value            # CORRECT
```

### ❌ Multiline values
```bash
# WRONG - .env doesn't support multiline
LONG_VALUE=line1
line2

# CORRECT - use escape or single line
LONG_VALUE=line1\\nline2
```

## Security

### Never Commit Secrets
```bash
# .gitignore should include:
.env.local
.env*.local
.env.production
```

### Use .env.example
```bash
# Commit this template:
API_KEY=your_key_here

# Users copy to .env.local:
cp .env.example .env.local
# Then fill in real values
```

## Loading in Next.js

### Automatic Loading
Next.js automatically loads:
- `.env.local` (all environments)
- `.env.development` (development only)
- `.env.production` (production only)

### Access in Code
```typescript
// Client-side (must start with NEXT_PUBLIC_)
const url = process.env.NEXT_PUBLIC_API_URL

// Server-side (any name)
const secret = process.env.SECRET_KEY
```

## Your Current Setup

Based on your project, you should have:

```bash
# ============================================
# CORE
# ============================================
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
GOOGLE_GENERATIVE_AI_API_KEY=...

# ============================================
# POCKETBASE (Embedding Tests)
# ============================================
NEXT_PUBLIC_POCKETBASE_URL=http://localhost:8090
POCKETBASE_ADMIN_EMAIL=admin@test.local
POCKETBASE_ADMIN_PASSWORD=admin123456

# ============================================
# OPTIONAL AI SERVICES
# ============================================
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
MISTRAL_API_KEY=...
VOYAGE_API_KEY=...

# ============================================
# OPTIONAL TOOLS
# ============================================
WANDB_API_KEY=...
WANDB_PROJECT=rekwizytor-embedding-tests
```

## Validation

Create a script to validate required env vars:

```typescript
// scripts/check-env.ts
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'GOOGLE_GENERATIVE_AI_API_KEY'
]

required.forEach(key => {
  if (!process.env[key]) {
    console.error(`❌ Missing: ${key}`)
    process.exit(1)
  }
})

console.log('✅ All required env vars present')
```
