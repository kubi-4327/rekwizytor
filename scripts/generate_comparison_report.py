#!/usr/bin/env python3
"""
Generate a comparison report from PocketBase test results

Usage:
    python3 scripts/generate_comparison_report.py
"""

import os
import sys
from dotenv import load_dotenv

# Load environment
load_dotenv('.env.local')

POCKETBASE_URL = os.getenv('POCKETBASE_URL', 'http://localhost:8090')
POCKETBASE_ADMIN_EMAIL = os.getenv('POCKETBASE_ADMIN_EMAIL')
POCKETBASE_ADMIN_PASSWORD = os.getenv('POCKETBASE_ADMIN_PASSWORD')

# Import PocketBase client
sys.path.insert(0, os.path.dirname(__file__))
from export_to_wandb import (
    PocketBaseClient, 
    calculate_metrics,
    get_readable_name,
    EMBEDDING_MODELS,
    ENRICHMENT_MODELS
)

def generate_report():
    """Generate markdown comparison report"""
    
    print("📊 Generating Comparison Report...\n")
    
    # Connect to PocketBase
    pb = PocketBaseClient(POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD)
    
    # Fetch test runs
    runs = pb.get_test_runs(limit=50)
    completed_runs = [r for r in runs if r.get('status') == 'completed']
    
    print(f"✅ Found {len(completed_runs)} completed tests\n")
    
    # Calculate metrics for each
    test_data = []
    for run in completed_runs:
        results = pb.get_test_results(run['id'])
        metrics = calculate_metrics(results)
        
        # Calculate cost
        search_tokens = run.get('total_search_tokens', 0)
        tester_tokens = run.get('total_tester_tokens', 0)
        cost = (search_tokens / 1_000_000) * 0.02 + (tester_tokens / 1_000_000) * 0.15
        
        test_data.append({
            'run': run,
            'metrics': metrics,
            'cost': cost,
            'cost_per_query': cost / metrics['total_queries'] if metrics['total_queries'] > 0 else 0
        })
    
    # Sort by accuracy
    test_data.sort(key=lambda x: x['metrics']['accuracy_at_1'], reverse=True)
    
    # Generate markdown report
    report = generate_markdown_report(test_data)
    
    # Save to file
    output_file = 'comparison_report.md'
    with open(output_file, 'w') as f:
        f.write(report)
    
    print(f"✅ Report saved to: {output_file}\n")
    print("Preview:\n")
    print("=" * 80)
    print(report[:1000])
    print("=" * 80)
    
    return output_file

def generate_markdown_report(test_data):
    """Generate markdown comparison report"""
    
    md = "# Embedding Tests - Comparison Report\n\n"
    md += f"**Generated:** {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
    md += f"**Total Tests:** {len(test_data)}\n\n"
    
    # Summary table
    md += "## 📊 Summary Table\n\n"
    md += "| Rank | Name | Embedding | Enrichment | Acc@1 | Acc@5 | MRR | Cost | Cost/Q |\n"
    md += "|------|------|-----------|------------|-------|-------|-----|------|--------|\n"
    
    for i, data in enumerate(test_data, 1):
        run = data['run']
        metrics = data['metrics']
        
        # Get readable names
        emb_code = run.get('embedding_model', 'unknown')
        enr_code = run.get('enrichment_model', 'none')
        
        emb_name = get_readable_name(emb_code, 'embedding')
        enr_name = get_readable_name(enr_code, 'enrichment')
        
        # Truncate names
        emb_short = emb_name.replace('text-embedding-', '').replace('OpenAI ', 'OAI ').replace('Google ', '')[:15]
        enr_short = enr_name.replace('Gemini ', 'G').replace('GPT-', 'G')[:12]
        
        md += f"| {i} | {run['name'][:20]} | {emb_short} | {enr_short} | "
        md += f"{metrics['accuracy_at_1']*100:.1f}% | {metrics['accuracy_at_5']*100:.1f}% | "
        md += f"{metrics['mean_reciprocal_rank']:.3f} | ${data['cost']:.4f} | ${data['cost_per_query']:.6f} |\n"
    
    # Best performers
    md += "\n## 🏆 Best Performers\n\n"
    
    best_acc = max(test_data, key=lambda x: x['metrics']['accuracy_at_1'])
    best_mrr = max(test_data, key=lambda x: x['metrics']['mean_reciprocal_rank'])
    best_cost = min(test_data, key=lambda x: x['cost'])
    best_value = min(test_data, key=lambda x: x['cost_per_query'] if x['metrics']['accuracy_at_1'] > 0.5 else float('inf'))
    
    md += f"### 🎯 Best Accuracy@1\n"
    md += f"**{best_acc['run']['name']}** - {best_acc['metrics']['accuracy_at_1']*100:.1f}%\n\n"
    
    md += f"### 📈 Best MRR\n"
    md += f"**{best_mrr['run']['name']}** - {best_mrr['metrics']['mean_reciprocal_rank']:.3f}\n\n"
    
    md += f"### 💰 Lowest Cost\n"
    md += f"**{best_cost['run']['name']}** - ${best_cost['cost']:.4f}\n\n"
    
    md += f"### ⭐ Best Value (Acc/Cost)\n"
    md += f"**{best_value['run']['name']}** - {best_value['metrics']['accuracy_at_1']*100:.1f}% @ ${best_value['cost_per_query']:.6f}/query\n\n"
    
    # Detailed breakdown
    md += "## 📋 Detailed Breakdown\n\n"
    
    for i, data in enumerate(test_data, 1):
        run = data['run']
        metrics = data['metrics']
        
        emb_name = get_readable_name(run.get('embedding_model', 'unknown'), 'embedding')
        enr_name = get_readable_name(run.get('enrichment_model', 'none'), 'enrichment')
        tester_name = get_readable_name(run.get('tester_model', 'unknown'), 'tester')
        
        md += f"### {i}. {run['name']}\n\n"
        md += f"**Configuration:**\n"
        md += f"- Embedding: {emb_name}\n"
        md += f"- Enrichment: {enr_name}\n"
        md += f"- Tester: {tester_name}\n"
        md += f"- Queries: {run.get('target_query_count', 0)}\n\n"
        
        md += f"**Metrics:**\n"
        md += f"- Accuracy@1: **{metrics['accuracy_at_1']*100:.1f}%**\n"
        md += f"- Accuracy@5: {metrics['accuracy_at_5']*100:.1f}%\n"
        md += f"- Accuracy@10: {metrics['accuracy_at_10']*100:.1f}%\n"
        md += f"- MRR: {metrics['mean_reciprocal_rank']:.3f}\n"
        md += f"- Avg Rank: {metrics['average_rank']:.2f}\n"
        
        if metrics['total_queries'] > 0:
            md += f"- Success Rate: {(metrics['successful_queries']/metrics['total_queries']*100):.1f}%\n\n"
        else:
            md += f"- Success Rate: N/A\n\n"
        
        md += f"**Cost:**\n"
        md += f"- Total: ${data['cost']:.4f}\n"
        md += f"- Per Query: ${data['cost_per_query']:.6f}\n"
        md += f"- Tokens: {run.get('total_search_tokens', 0) + run.get('total_tester_tokens', 0):,}\n\n"
        
        md += "---\n\n"
    
    return md

if __name__ == '__main__':
    try:
        output_file = generate_report()
        print(f"\n✅ Open {output_file} to view full report!")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
