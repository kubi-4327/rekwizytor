#!/usr/bin/env python3
"""
Export all test data to JSON for detailed analysis

Usage:
    python3 scripts/export_to_json.py
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
from export_to_wandb import PocketBaseClient, calculate_metrics

def export_to_json():
    """Export all test data to JSON"""
    
    print("📦 Exporting all test data to JSON...\n")
    
    pb = PocketBaseClient(POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD)
    
    # Get all test runs
    runs = pb.get_test_runs(limit=100)
    print(f"✅ Found {len(runs)} test runs\n")
    
    # Build complete data structure
    export_data = {
        "metadata": {
            "exported_at": __import__('datetime').datetime.now().isoformat(),
            "total_runs": len(runs),
            "pocketbase_url": POCKETBASE_URL
        },
        "test_runs": []
    }
    
    for i, run in enumerate(runs, 1):
        print(f"Processing {i}/{len(runs)}: {run['name']}")
        
        # Get results for this run
        results = pb.get_test_results(run['id'])
        
        # Calculate metrics
        metrics = calculate_metrics(results)
        
        # Calculate cost
        search_tokens = run.get('total_search_tokens', 0)
        tester_tokens = run.get('total_tester_tokens', 0)
        total_tokens = search_tokens + tester_tokens
        cost = (search_tokens / 1_000_000) * 0.02 + (tester_tokens / 1_000_000) * 0.15
        
        # Build run data
        run_data = {
            # Basic info
            "id": run['id'],
            "name": run['name'],
            "status": run.get('status'),
            "created": run.get('created'),
            "updated": run.get('updated'),
            
            # Configuration
            "config": {
                "embedding_model": run.get('embedding_model'),
                "embedding_key": run.get('embedding_key'),
                "enrichment_model": run.get('enrichment_model'),
                "tester_model": run.get('tester_model'),
                "tester_temperature": run.get('tester_temperature'),
                "difficulty_mode": run.get('difficulty_mode'),
                "target_query_count": run.get('target_query_count'),
                "completed_query_count": run.get('completed_query_count'),
                "use_sample_groups": run.get('use_sample_groups'),
                "use_dynamic_weights": run.get('use_dynamic_weights'),
                "weights": {
                    "identity": run.get('mvs_weight_identity'),
                    "physical": run.get('mvs_weight_physical'),
                    "context": run.get('mvs_weight_context')
                }
            },
            
            # Metrics
            "metrics": {
                "accuracy_at_1": metrics['accuracy_at_1'],
                "accuracy_at_5": metrics['accuracy_at_5'],
                "accuracy_at_10": metrics['accuracy_at_10'],
                "mean_reciprocal_rank": metrics['mean_reciprocal_rank'],
                "average_rank": metrics['average_rank'],
                "total_queries": metrics['total_queries'],
                "successful_queries": metrics['successful_queries'],
                "success_rate": metrics['successful_queries'] / metrics['total_queries'] if metrics['total_queries'] > 0 else 0
            },
            
            # Cost
            "cost": {
                "search_tokens": search_tokens,
                "tester_tokens": tester_tokens,
                "total_tokens": total_tokens,
                "total_cost_usd": cost,
                "cost_per_query": cost / metrics['total_queries'] if metrics['total_queries'] > 0 else 0
            },
            
            # All results
            "results": []
        }
        
        # Add all query results
        for result in results:
            result_data = {
                "id": result.get('id'),
                "query": result.get('generated_query'),
                "source_group_id": result.get('source_group_id'),
                "source_group_name": result.get('source_group_name'),
                "correct_rank": result.get('correct_rank'),
                "query_intent": result.get('query_intent'),
                "search_tokens": result.get('search_tokens'),
                "tester_tokens": result.get('tester_tokens'),
                "similarity_margin": result.get('similarity_margin'),
                "applied_weights": result.get('applied_weights'),
                "top_results": result.get('top_results', [])[:10],  # Top 10 results
                "created": result.get('created')
            }
            run_data["results"].append(result_data)
        
        export_data["test_runs"].append(run_data)
    
    # Save to JSON
    output_file = 'test_data_export.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(export_data, f, indent=2, ensure_ascii=False)
    
    # Also save compact version
    compact_file = 'test_data_export_compact.json'
    with open(compact_file, 'w', encoding='utf-8') as f:
        json.dump(export_data, f, ensure_ascii=False)
    
    print(f"\n✅ Export complete!")
    print(f"\n📄 Files created:")
    print(f"   - {output_file} ({os.path.getsize(output_file):,} bytes) - Pretty formatted")
    print(f"   - {compact_file} ({os.path.getsize(compact_file):,} bytes) - Compact")
    
    print(f"\n📊 Summary:")
    print(f"   - Total runs: {len(export_data['test_runs'])}")
    print(f"   - Total results: {sum(len(run['results']) for run in export_data['test_runs'])}")
    
    print(f"\n💡 You can now:")
    print(f"   1. Open in JSON viewer/editor")
    print(f"   2. Import to data analysis tools (Python, R, Excel)")
    print(f"   3. Query with jq: jq '.test_runs[] | select(.metrics.accuracy_at_1 > 0.7)' {output_file}")
    print(f"   4. Load in Jupyter notebook for detailed analysis")

if __name__ == '__main__':
    try:
        export_to_json()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
