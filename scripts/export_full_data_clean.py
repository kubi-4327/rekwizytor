#!/usr/bin/env python3
"""
Export ALL embedding test data to markdown - EXCLUDING INVALID TESTS

Usage:
    python3 scripts/export_full_data_clean.py
"""

import os
import sys
import json
from dotenv import load_dotenv

load_dotenv('.env.local')

POCKETBASE_URL = os.getenv('POCKETBASE_URL', 'http://localhost:8090')
POCKETBASE_ADMIN_EMAIL = os.getenv('POCKETBASE_ADMIN_EMAIL')
POCKETBASE_ADMIN_PASSWORD = os.getenv('POCKETBASE_ADMIN_PASSWORD')

sys.path.insert(0, os.path.dirname(__file__))
from export_to_wandb import PocketBaseClient, calculate_metrics, get_readable_name

# INVALID TEST IDS (to exclude)
INVALID_TESTS = [
    # g25f_oai3l_gpt4o_mwM_#1 - only 2 groups, 11 unique queries, 90% fake accuracy
]

def export_full_data():
    """Export all test data to markdown"""
    
    print("📦 Exporting full test data (excluding invalid tests)...\n")
    
    # Connect
    pb = PocketBaseClient(POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD)
    
    # Get all test runs
    runs = pb.get_test_runs(limit=100)
    
    # Filter out invalid tests
    valid_runs = []
    for run in runs:
        # Exclude g25f_oai3l_gpt4o_mwM_#1 (invalid)
        if 'g25f_oai3l' in run['name'] and '#1' in run['name']:
            print(f"⏭️  Skipping INVALID test: {run['name']} (only 2 groups, fake 90% acc)")
            continue
        valid_runs.append(run)
    
    print(f"✅ Found {len(valid_runs)} valid test runs (excluded {len(runs) - len(valid_runs)} invalid)\n")
    
    # Build markdown
    md = "# Embedding Tests - Complete Data Export\n\n"
    md += f"**Generated:** {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
    md += f"**Total Valid Test Runs:** {len(valid_runs)}\n"
    md += f"**Excluded Invalid Tests:** {len(runs) - len(valid_runs)}\n\n"
    md += "---\n\n"
    
    # Summary table
    md += "## 📊 Quick Summary\n\n"
    md += "| # | Name | Status | Embedding | Enrichment | Queries | Acc@1 | MRR | Cost |\n"
    md += "|---|------|--------|-----------|------------|---------|-------|-----|------|\n"
    
    for i, run in enumerate(valid_runs, 1):
        results = pb.get_test_results(run['id'])
        metrics = calculate_metrics(results)
        
        cost = (run.get('total_search_tokens', 0) / 1_000_000) * 0.02 + \
               (run.get('total_tester_tokens', 0) / 1_000_000) * 0.15
        
        emb = get_readable_name(run.get('embedding_model', 'unknown'), 'embedding')
        enr = get_readable_name(run.get('enrichment_model', 'none'), 'enrichment')
        
        md += f"| {i} | {run['name'][:25]} | {run.get('status', 'unknown')} | "
        md += f"{emb[:15]} | {enr[:12]} | {run.get('target_query_count', 0)} | "
        md += f"{metrics['accuracy_at_1']*100:.1f}% | {metrics['mean_reciprocal_rank']:.3f} | "
        md += f"${cost:.4f} |\n"
    
    md += "\n---\n\n"
    
    # Detailed per test
    md += "## 📋 Detailed Test Data\n\n"
    
    for i, run in enumerate(valid_runs, 1):
        print(f"Processing {i}/{len(valid_runs)}: {run['name']}")
        
        results = pb.get_test_results(run['id'])
        metrics = calculate_metrics(results)
        
        cost = (run.get('total_search_tokens', 0) / 1_000_000) * 0.02 + \
               (run.get('total_tester_tokens', 0) / 1_000_000) * 0.15
        
        md += f"### Test {i}: {run['name']}\n\n"
        
        # Config
        md += "**Configuration:**\n"
        md += f"- ID: `{run['id']}`\n"
        md += f"- Status: {run.get('status', 'unknown')}\n"
        md += f"- Embedding: {get_readable_name(run.get('embedding_model', 'unknown'), 'embedding')}\n"
        md += f"- Embedding Code: `{run.get('embedding_model', 'unknown')}`\n"
        md += f"- Enrichment: {get_readable_name(run.get('enrichment_model', 'none'), 'enrichment')}\n"
        md += f"- Enrichment Code: `{run.get('enrichment_model', 'none')}`\n"
        md += f"- Tester: {get_readable_name(run.get('tester_model', 'unknown'), 'tester')}\n"
        md += f"- Tester Code: `{run.get('tester_model', 'unknown')}`\n"
        md += f"- Target Queries: {run.get('target_query_count', 0)}\n"
        md += f"- Completed Queries: {run.get('completed_query_count', 0)}\n"
        md += f"- Difficulty: {run.get('difficulty_mode', 'unknown')}\n"
        md += f"- Dynamic Weights: {run.get('use_dynamic_weights', False)}\n"
        md += f"- Created: {run.get('created', 'unknown')}\n\n"
        
        # Weights
        md += "**Weights:**\n"
        md += f"- Identity: {run.get('mvs_weight_identity', 0)}\n"
        md += f"- Physical: {run.get('mvs_weight_physical', 0)}\n"
        md += f"- Context: {run.get('mvs_weight_context', 0)}\n\n"
        
        # Metrics
        md += "**Metrics:**\n"
        md += f"- Accuracy@1: **{metrics['accuracy_at_1']*100:.2f}%**\n"
        md += f"- Accuracy@5: {metrics['accuracy_at_5']*100:.2f}%\n"
        md += f"- Accuracy@10: {metrics['accuracy_at_10']*100:.2f}%\n"
        md += f"- Mean Reciprocal Rank: {metrics['mean_reciprocal_rank']:.4f}\n"
        md += f"- Average Rank: {metrics['average_rank']:.2f}\n"
        md += f"- Total Queries: {metrics['total_queries']}\n"
        md += f"- Successful Queries: {metrics['successful_queries']}\n"
        if metrics['total_queries'] > 0:
            md += f"- Success Rate: {(metrics['successful_queries']/metrics['total_queries']*100):.2f}%\n\n"
        else:
            md += f"- Success Rate: N/A\n\n"
        
        # Cost
        md += "**Cost Analysis:**\n"
        md += f"- Search Tokens: {run.get('total_search_tokens', 0):,}\n"
        md += f"- Tester Tokens: {run.get('total_tester_tokens', 0):,}\n"
        md += f"- Total Tokens: {run.get('total_search_tokens', 0) + run.get('total_tester_tokens', 0):,}\n"
        md += f"- Total Cost: ${cost:.4f}\n"
        if metrics['total_queries'] > 0:
            md += f"- Cost per Query: ${cost/metrics['total_queries']:.6f}\n\n"
        else:
            md += f"- Cost per Query: N/A\n\n"
        
        # Sample results (top 10 queries)
        if results:
            md += "**Sample Results (first 10 queries):**\n\n"
            md += "| # | Query | Source | Rank | Top Result | Similarity |\n"
            md += "|---|-------|--------|------|------------|------------|\n"
            
            for j, result in enumerate(results[:10], 1):
                query = result.get('generated_query', 'N/A')[:30]
                source = result.get('source_group_name', 'N/A')[:20]
                rank = result.get('correct_rank', 0)
                
                top_results = result.get('top_results', [])
                if top_results and len(top_results) > 0:
                    top = top_results[0].get('name', 'N/A')[:20]
                    sim = top_results[0].get('similarity', 0)
                else:
                    top = 'N/A'
                    sim = 0
                
                md += f"| {j} | {query}... | {source} | {rank} | {top} | {sim:.3f} |\n"
            
            md += "\n"
        
        # Failed queries
        failed = [r for r in results if r.get('correct_rank', 0) == 0 or r.get('correct_rank', 0) > 10]
        if failed:
            md += f"**Failed Queries ({len(failed)}):**\n"
            for j, result in enumerate(failed[:5], 1):
                query = result.get('generated_query', 'N/A')[:50]
                source = result.get('source_group_name', 'N/A')
                md += f"{j}. \"{query}\" (expected: {source})\n"
            if len(failed) > 5:
                md += f"...and {len(failed) - 5} more\n"
            md += "\n"
        
        md += "---\n\n"
    
    # Appendix: Naming Convention (same as before)
    md += "## 📖 Appendix: Naming Convention Guide\n\n"
    md += "### Test Name Format\n\n"
    md += "```\n{enrichment}_{embedding}_{tester}_{mode}_#{number}\n```\n\n"
    md += "**Example:** `g25f_oai3l_gpt4o_mwM_#2`\n"
    md += "- Enrichment: `g25f` = Gemini 2.5 Flash\n"
    md += "- Embedding: `oai3l` = OpenAI text-embedding-3-large\n"
    md += "- Tester: `gpt4o` = GPT-4o\n"
    md += "- Mode: `mwM` = Manual Weights, Medium difficulty\n"
    md += "- Number: `#2` = Second run\n\n"
    
    md += "### Enrichment Model Codes\n\n"
    md += "| Code | Model Name |\n|------|------------|\n"
    for code, name in [
        ('g25f', 'Gemini 2.5 Flash'),
        ('g25fl', 'Gemini 2.5 Flash Lite'),
        ('g25p', 'Gemini 2.5 Pro'),
        ('gpt5n', 'GPT-5 Nano'),
        ('gpt4m', 'GPT-4o Mini'),
        ('gpt4o', 'GPT-4o'),
        ('none', 'No Enrichment')
    ]:
        md += f"| `{code}` | {name} |\n"
    
    md += "\n### Embedding Model Codes\n\n"
    md += "| Code | Model Name | Provider |\n|------|------------|----------|\n"
    for code, name, provider in [
        ('gem004', 'text-embedding-004', 'Google'),
        ('oai3l', 'text-embedding-3-large', 'OpenAI'),
        ('oai3s', 'text-embedding-3-small', 'OpenAI'),
        ('voy3', 'Voyage AI 3', 'Voyage'),
        ('voy35', 'Voyage AI 3.5', 'Voyage')
    ]:
        md += f"| `{code}` | {name} | {provider} |\n"
    
    md += "\n### Tester Model Codes\n\n"
    md += "| Code | Model Name |\n|------|------------|\n"
    for code, name in [
        ('gpt4o', 'GPT-4o'),
        ('gpt4m', 'GPT-4o Mini'),
        ('g25f', 'Gemini 2.5 Flash')
    ]:
        md += f"| `{code}` | {name} |\n"
    
    md += "\n### Mode Codes\n\n"
    md += "| Code | Meaning |\n|------|----------|\n"
    md += "| `mwM` | **Manual Weights, Medium** - Fixed weights, medium difficulty |\n"
    md += "| `dwM` | **Dynamic Weights, Medium** - AI-adjusted weights per query |\n"
    md += "| `mwE` | **Manual Weights, Easy** - Fixed weights, easy difficulty |\n"
    md += "| `mwH` | **Manual Weights, Hard** - Fixed weights, hard difficulty |\n\n"
    
    md += "### Weight Types\n\n"
    md += "**Manual Weights (mw):**\n"
    md += "- Identity, Physical, Context weights are fixed\n"
    md += "- Same weights used for all queries\n"
    md += "- More consistent, less expensive\n\n"
    
    md += "**Dynamic Weights (dw):**\n"
    md += "- Weights adjusted per query based on intent\n"
    md += "- AI classifies query intent → adjusts weights\n"
    md += "- More adaptive, slightly more expensive\n\n"
    
    md += "### Difficulty Modes\n\n"
    md += "- **Easy (E):** Simple, direct queries\n"
    md += "- **Medium (M):** Standard queries with some complexity\n"
    md += "- **Hard (H):** Complex, ambiguous, or tricky queries\n\n"
    
    # Save
    output_file = 'full_test_data.md'
    with open(output_file, 'w') as f:
        f.write(md)
    
    print(f"\n✅ Full data exported to: {output_file}")
    print(f"📄 File size: {len(md):,} characters")
    print(f"\n💡 You can now:\n")
    print(f"1. Open {output_file}")
    print(f"2. Copy entire content")
    print(f"3. Paste to AI (Claude, ChatGPT, etc.)")
    print(f"4. Ask: 'Which model is best? Why?'\n")

if __name__ == '__main__':
    try:
        export_full_data()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
