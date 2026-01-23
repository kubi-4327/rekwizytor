#!/usr/bin/env python3
"""
Export Embedding Tests from PocketBase to Weights & Biases

This script fetches test runs and results from PocketBase and uploads them
to W&B for visualization and comparison.

Requirements:
    pip install wandb requests python-dotenv

Usage:
    python scripts/export_to_wandb.py
    
    # Or upload specific test
    python scripts/export_to_wandb.py --test-id abc123
"""

import os
import sys
import json
import requests
from datetime import datetime
from dotenv import load_dotenv
import wandb

# Load environment variables
load_dotenv('.env.local')

POCKETBASE_URL = os.getenv('POCKETBASE_URL', 'http://localhost:8090')
POCKETBASE_ADMIN_EMAIL = os.getenv('POCKETBASE_ADMIN_EMAIL')
POCKETBASE_ADMIN_PASSWORD = os.getenv('POCKETBASE_ADMIN_PASSWORD')
WANDB_PROJECT = os.getenv('WANDB_PROJECT', 'rekwizytor-embedding-tests')

# Model name mappings for human-readable config
EMBEDDING_MODELS = {
    'gem004': 'Google text-embedding-004',
    'oai3l': 'OpenAI text-embedding-3-large',
    'oai3s': 'OpenAI text-embedding-3-small',
    'voy3': 'Voyage AI 3',
    'voy35': 'Voyage AI 3.5',
    'unknown': 'Unknown Embedding Model'
}

ENRICHMENT_MODELS = {
    'g25f': 'Gemini 2.5 Flash',
    'g25fl': 'Gemini 2.5 Flash Lite',
    'g25p': 'Gemini 2.5 Pro',
    'gpt5n': 'GPT-5 Nano',
    'gpt4m': 'GPT-4o Mini',
    'gpt4o': 'GPT-4o',
    'none': 'No Enrichment',
    '': 'No Enrichment'
}

TESTER_MODELS = {
    'gpt4o': 'GPT-4o',
    'gpt4m': 'GPT-4o Mini',
    'g25f': 'Gemini 2.5 Flash',
    'unknown': 'Unknown Tester Model'
}

def get_readable_name(code, model_type):
    """Convert model code to human-readable name"""
    mappings = {
        'embedding': EMBEDDING_MODELS,
        'enrichment': ENRICHMENT_MODELS,
        'tester': TESTER_MODELS
    }
    return mappings.get(model_type, {}).get(code, code)


class PocketBaseClient:
    """Simple PocketBase client for fetching test data"""
    
    def __init__(self, url, email, password):
        self.url = url
        self.token = None
        self._authenticate(email, password)
    
    def _authenticate(self, email, password):
        """Authenticate as admin"""
        response = requests.post(
            f'{self.url}/api/collections/_superusers/auth-with-password',
            json={'identity': email, 'password': password}
        )
        response.raise_for_status()
        self.token = response.json()['token']
    
    def _headers(self):
        return {'Authorization': f'Bearer {self.token}'}
    
    def get_test_runs(self, limit=100):
        """Fetch test runs"""
        response = requests.get(
            f'{self.url}/api/collections/embedding_test_runs/records',
            params={'perPage': limit},  # Removed sort due to PocketBase API issue
            headers=self._headers()
        )
        response.raise_for_status()
        return response.json()['items']
    
    def get_test_results(self, run_id):
        """Fetch results for a specific run"""
        response = requests.get(
            f'{self.url}/api/collections/embedding_test_results/records',
            params={'filter': f'run_id="{run_id}"', 'perPage': 1000},
            headers=self._headers()
        )
        response.raise_for_status()
        return response.json()['items']


def generate_ai_insights(run_data, metrics, total_cost):
    """Generate AI insights using OpenAI"""
    if not os.getenv('OPENAI_API_KEY'):
        return None
    
    try:
        from openai import OpenAI
        
        # Get human-readable names
        embedding = get_readable_name(run_data.get('embedding_model', 'unknown'), 'embedding')
        enrichment = get_readable_name(run_data.get('enrichment_model', 'none'), 'enrichment')
        tester = get_readable_name(run_data.get('tester_model', 'unknown'), 'tester')
        
        prompt = f"""Analyze this embedding test result concisely (max 150 words):

Configuration:
- Embedding Model: {embedding}
- Enrichment: {enrichment}
- Tester: {tester}
- Queries: {run_data.get('target_query_count', 0)}

Results:
- Accuracy@1: {metrics['accuracy_at_1']*100:.1f}%
- Accuracy@5: {metrics['accuracy_at_5']*100:.1f}%
- MRR: {metrics['mean_reciprocal_rank']:.3f}
- Success Rate: {(metrics['successful_queries']/metrics['total_queries']*100):.1f}%
- Total Cost: ${total_cost:.4f}
- Cost per Query: ${total_cost/metrics['total_queries']:.6f}

Provide:
1. Performance rating (Excellent/Good/Fair/Poor)
2. Cost-efficiency assessment
3. One-line recommendation

Be direct and actionable."""
        
        client = OpenAI()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=200
        )
        
        return response.choices[0].message.content.strip()
    
    except Exception as e:
        print(f'      ⚠️  AI analysis failed: {e}')
        return None

def calculate_metrics(results):
    """Calculate test metrics from results"""
    if not results:
        return {
            'accuracy_at_1': 0,
            'accuracy_at_5': 0,
            'accuracy_at_10': 0,
            'mean_reciprocal_rank': 0,
            'average_rank': 0,
            'total_queries': 0,
            'successful_queries': 0
        }
    
    total = len(results)
    valid_results = [r for r in results if r.get('correct_rank') and r['correct_rank'] > 0]
    successful = len(valid_results)
    
    acc_at_1 = sum(1 for r in valid_results if r['correct_rank'] == 1) / total
    acc_at_5 = sum(1 for r in valid_results if r['correct_rank'] <= 5) / total
    acc_at_10 = sum(1 for r in valid_results if r['correct_rank'] <= 10) / total
    
    mrr = sum(1 / r['correct_rank'] for r in valid_results) / total
    avg_rank = sum(r['correct_rank'] for r in valid_results) / successful if successful > 0 else 0
    
    return {
        'accuracy_at_1': acc_at_1,
        'accuracy_at_5': acc_at_5,
        'accuracy_at_10': acc_at_10,
        'mean_reciprocal_rank': mrr,
        'average_rank': avg_rank,
        'total_queries': total,
        'successful_queries': successful
    }


def upload_to_wandb(run_data, results):
    """Upload test run to W&B"""
    
    # Calculate metrics
    metrics = calculate_metrics(results)
    
    # Calculate cost
    total_tokens = run_data.get('total_search_tokens', 0) + run_data.get('total_tester_tokens', 0)
    search_cost = (run_data.get('total_search_tokens', 0) / 1_000_000) * 0.02
    tester_cost = (run_data.get('total_tester_tokens', 0) / 1_000_000) * 0.15
    total_cost = search_cost + tester_cost
    
    # Get human-readable names
    embedding_code = run_data.get('embedding_model') or 'unknown'
    enrichment_code = run_data.get('enrichment_model') or 'none'
    tester_code = run_data.get('tester_model') or 'unknown'
    
    embedding_name = get_readable_name(embedding_code, 'embedding')
    enrichment_name = get_readable_name(enrichment_code, 'enrichment')
    tester_name = get_readable_name(tester_code, 'tester')
    
    # Initialize W&B run
    run = wandb.init(
        project=WANDB_PROJECT,
        name=run_data['name'],
        id=run_data['id'],
        config={
            # Codes (for filtering/grouping)
            'embedding_model_code': embedding_code,
            'enrichment_model_code': enrichment_code,
            'tester_model_code': tester_code,
            
            # Human-readable names
            'embedding_model': embedding_name,
            'enrichment_model': enrichment_name,
            'tester_model': tester_name,
            
            # Other config
            'target_query_count': run_data.get('target_query_count', 0),
            'difficulty_mode': run_data.get('difficulty_mode') or 'medium',
            'mvs_weight_identity': run_data.get('mvs_weight_identity', 0),
            'mvs_weight_physical': run_data.get('mvs_weight_physical', 0),
            'mvs_weight_context': run_data.get('mvs_weight_context', 0),
            'use_dynamic_weights': run_data.get('use_dynamic_weights', False)
        },
        tags=[
            tag for tag in [
                embedding_code,
                enrichment_code,
                run_data.get('difficulty_mode') or 'medium',
                run_data.get('status') or 'completed'
            ] if tag  # Filter out any None/empty values
        ]
    )
    
    # Log final summary
    wandb.summary.update({
        # Accuracy metrics
        'accuracy_at_1': metrics['accuracy_at_1'],
        'accuracy_at_5': metrics['accuracy_at_5'],
        'accuracy_at_10': metrics['accuracy_at_10'],
        'mean_reciprocal_rank': metrics['mean_reciprocal_rank'],
        'average_rank': metrics['average_rank'],
        
        # Success rate
        'success_rate': metrics['successful_queries'] / metrics['total_queries'] if metrics['total_queries'] > 0 else 0,
        'total_queries': metrics['total_queries'],
        'successful_queries': metrics['successful_queries'],
        
        # Token usage
        'total_search_tokens': run_data.get('total_search_tokens', 0),
        'total_tester_tokens': run_data.get('total_tester_tokens', 0),
        'total_tokens': total_tokens,
        
        # Cost
        'total_cost_usd': total_cost,
        'cost_per_query': total_cost / metrics['total_queries'] if metrics['total_queries'] > 0 else 0
    })
    
    # Create results table
    if results:
        table_data = []
        for r in results[:100]:  # Limit to first 100 for performance
            table_data.append([
                r.get('query_text', ''),
                r.get('source_group_name', ''),
                r.get('correct_rank', 0),
                r.get('top_results', [{}])[0].get('name', '') if r.get('top_results') else '',
                r.get('top_results', [{}])[0].get('similarity', 0) if r.get('top_results') else 0
            ])
        
        table = wandb.Table(
            columns=['query', 'source_group', 'rank', 'top_result', 'similarity'],
            data=table_data
        )
        wandb.log({'query_results': table})
    
    # Generate AI insights
    print('      🤖 Generating AI insights...')
    insights = generate_ai_insights(run_data, metrics, total_cost)
    
    if insights:
        # Add to summary
        wandb.summary['ai_insights'] = insights
        
        # Save as artifact
        try:
            artifact = wandb.Artifact(f'analysis-{run_data["id"][:8]}', type='analysis')
            with artifact.new_file('insights.md') as f:
                f.write(f"# AI Analysis: {run_data['name']}\n\n")
                f.write(f"**Embedding:** {embedding_name}\n")
                f.write(f"**Enrichment:** {enrichment_name}\n")
                f.write(f"**Tester:** {tester_name}\n\n")
                f.write("## Metrics\n\n")
                f.write(f"- Accuracy@1: {metrics['accuracy_at_1']*100:.1f}%\n")
                f.write(f"- MRR: {metrics['mean_reciprocal_rank']:.3f}\n")
                f.write(f"- Cost: ${total_cost:.4f}\n\n")
                f.write("## AI Insights\n\n")
                f.write(insights)
            wandb.log_artifact(artifact)
            print('      ✅ AI insights saved')
        except Exception as e:
            print(f'      ⚠️  Failed to save artifact: {e}')
    
    # Finish run
    wandb.finish()
    
    print(f"✅ Uploaded: {run_data['name']}")
    print(f"   📊 {embedding_name}")
    print(f"   🔧 Enrichment: {enrichment_name}")
    print(f"   Accuracy@1: {metrics['accuracy_at_1']*100:.1f}%")
    print(f"   MRR: {metrics['mean_reciprocal_rank']:.3f}")
    print(f"   Cost: ${total_cost:.4f}")
    if insights:
        # Print first line of insights
        first_line = insights.split('\n')[0][:80]
        print(f"   💡 {first_line}...")


def main():
    """Main function"""
    print("🚀 Exporting tests from PocketBase to W&B...\n")
    
    # Check env vars
    if not all([POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD]):
        print("❌ Missing PocketBase credentials in .env.local")
        sys.exit(1)
    
    # Connect to PocketBase
    print(f"📡 Connecting to PocketBase at {POCKETBASE_URL}...")
    pb = PocketBaseClient(POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD)
    print("✅ Connected!\n")
    
    # Fetch test runs
    print("📊 Fetching test runs...")
    runs = pb.get_test_runs()
    print(f"✅ Found {len(runs)} tests\n")
    
    # Upload each run to W&B
    for i, run in enumerate(runs, 1):
        print(f"[{i}/{len(runs)}] Processing: {run['name']}")
        
        # Skip if not completed
        if run.get('status') != 'completed':
            print(f"   ⏭️  Skipped (status: {run.get('status')})\n")
            continue
        
        # Fetch results
        results = pb.get_test_results(run['id'])
        
        # Upload to W&B
        try:
            upload_to_wandb(run, results)
        except Exception as e:
            print(f"   ❌ Failed: {e}")
        
        print()
    
    print(f"\n🎉 Done! View at: https://wandb.ai/{WANDB_PROJECT}")


if __name__ == '__main__':
    main()
