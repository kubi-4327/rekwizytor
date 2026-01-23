#!/usr/bin/env python3
"""Quick test of AI insights generation"""

import os
import sys
from dotenv import load_dotenv

load_dotenv('.env.local')

# Add parent to path
sys.path.insert(0, '/Users/kubapelka/rekwizytor/scripts')

# Import the function
exec(open('/Users/kubapelka/rekwizytor/scripts/export_to_wandb.py').read())

# Test data
run_data = {
    'id': 'test123',
    'name': 'Test Run',
    'embedding_model': 'oai3l',
    'enrichment_model': 'g25f',
    'tester_model': 'gpt4m',
    'target_query_count': 200
}

metrics = {
    'accuracy_at_1': 0.90,
    'accuracy_at_5': 0.95,
    'mean_reciprocal_rank': 0.92,
    'successful_queries': 198,
    'total_queries': 200
}

total_cost = 0.0075

print("🤖 Testing AI Insights Generation...\n")
print(f"Embedding: {get_readable_name('oai3l', 'embedding')}")
print(f"Enrichment: {get_readable_name('g25f', 'enrichment')}")
print(f"Tester: {get_readable_name('gpt4m', 'tester')}\n")

insights = generate_ai_insights(run_data, metrics, total_cost)

if insights:
    print("✅ Insights generated:\n")
    print(insights)
else:
    print("❌ No insights generated")
