#!/usr/bin/env python3
"""
Analyze and compare queries between tests to verify consistency

Usage:
    python3 scripts/analyze_test_queries.py
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv('.env.local')

POCKETBASE_URL = os.getenv('POCKETBASE_URL', 'http://localhost:8090')
POCKETBASE_ADMIN_EMAIL = os.getenv('POCKETBASE_ADMIN_EMAIL')
POCKETBASE_ADMIN_PASSWORD = os.getenv('POCKETBASE_ADMIN_PASSWORD')

sys.path.insert(0, os.path.dirname(__file__))
from export_to_wandb import PocketBaseClient, calculate_metrics

def analyze_queries():
    """Analyze and compare queries between tests"""
    
    print("🔍 Analyzing test queries...\n")
    
    pb = PocketBaseClient(POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD)
    
    # Get all test runs
    runs = pb.get_test_runs(limit=100)
    completed_runs = [r for r in runs if r.get('status') == 'completed' and r.get('target_query_count', 0) > 100]
    
    print(f"✅ Found {len(completed_runs)} completed tests (>100 queries)\n")
    
    # Focus on the suspicious test
    suspicious_test = next((r for r in completed_runs if 'g25f_oai3l' in r['name']), None)
    
    if not suspicious_test:
        print("❌ Could not find g25f_oai3l test")
        return
    
    print(f"🎯 Analyzing: {suspicious_test['name']}\n")
    
    # Get results for comparison
    suspicious_results = pb.get_test_results(suspicious_test['id'])
    suspicious_metrics = calculate_metrics(suspicious_results)
    
    print(f"📊 Stats:")
    print(f"- Accuracy@1: {suspicious_metrics['accuracy_at_1']*100:.1f}%")
    print(f"- Total queries: {suspicious_metrics['total_queries']}")
    print(f"- Successful: {suspicious_metrics['successful_queries']}\n")
    
    # Compare with other tests
    print("=" * 80)
    print("COMPARISON WITH OTHER TESTS")
    print("=" * 80)
    
    for run in completed_runs:
        if run['id'] == suspicious_test['id']:
            continue
            
        results = pb.get_test_results(run['id'])
        metrics = calculate_metrics(results)
        
        print(f"\n{run['name']}:")
        print(f"- Accuracy@1: {metrics['accuracy_at_1']*100:.1f}%")
        print(f"- Queries: {metrics['total_queries']}")
    
    print("\n" + "=" * 80)
    print("SAMPLE QUERIES COMPARISON")
    print("=" * 80)
    
    # Sample 20 queries from suspicious test
    print(f"\n📝 Sample queries from {suspicious_test['name']} (first 20):\n")
    
    for i, result in enumerate(suspicious_results[:20], 1):
        query = result.get('generated_query', 'N/A')
        source = result.get('source_group_name', 'N/A')
        rank = result.get('correct_rank', 0)
        
        status = "✅" if rank == 1 else "⚠️" if rank <= 5 else "❌"
        
        print(f"{i}. {status} (rank {rank}) \"{query}\"")
        print(f"   Expected: {source}")
        
        if i % 5 == 0:
            print()
    
    # Compare with another test
    print("\n" + "=" * 80)
    print("COMPARISON WITH SIMILAR TEST")
    print("=" * 80)
    
    similar_test = next((r for r in completed_runs if 'oai3l' in r['name'] and r['id'] != suspicious_test['id']), None)
    
    if similar_test:
        print(f"\n📝 Sample queries from {similar_test['name']} (first 20):\n")
        
        similar_results = pb.get_test_results(similar_test['id'])
        
        for i, result in enumerate(similar_results[:20], 1):
            query = result.get('generated_query', 'N/A')
            source = result.get('source_group_name', 'N/A')
            rank = result.get('correct_rank', 0)
            
            status = "✅" if rank == 1 else "⚠️" if rank <= 5 else "❌"
            
            print(f"{i}. {status} (rank {rank}) \"{query}\"")
            print(f"   Expected: {source}")
            
            if i % 5 == 0:
                print()
    
    print("\n" + "=" * 80)
    print("QUERY OVERLAP ANALYSIS")
    print("=" * 80)
    
    suspicious_queries = set(r.get('generated_query') for r in suspicious_results if r.get('generated_query'))
    
    print(f"\n{suspicious_test['name']}: {len(suspicious_queries)} unique queries")
    
    for run in completed_runs[:3]:
        if run['id'] == suspicious_test['id']:
            continue
        
        results = pb.get_test_results(run['id'])
        queries = set(r.get('generated_query') for r in results if r.get('generated_query'))
        
        overlap = suspicious_queries & queries
        overlap_percent = (len(overlap) / len(suspicious_queries) * 100) if suspicious_queries else 0
        
        print(f"{run['name']}: {len(queries)} unique queries")
        print(f"  Overlap: {len(overlap)} queries ({overlap_percent:.1f}%)")
    
    # Check configuration
    print("\n" + "=" * 80)
    print("CONFIGURATION VERIFICATION")
    print("=" * 80)
    
    print(f"\n{suspicious_test['name']}:")
    print(f"- Embedding Model: {suspicious_test.get('embedding_model', 'N/A')}")
    print(f"- Embedding Key: {suspicious_test.get('embedding_key', 'N/A')}")
    print(f"- Enrichment Model: {suspicious_test.get('enrichment_model', 'N/A')}")
    print(f"- Tester Model: {suspicious_test.get('tester_model', 'N/A')}")
    print(f"- Difficulty: {suspicious_test.get('difficulty_mode', 'N/A')}")
    print(f"- Dynamic Weights: {suspicious_test.get('use_dynamic_weights', False)}")
    print(f"- Weights: Identity={suspicious_test.get('mvs_weight_identity', 0)}, Physical={suspicious_test.get('mvs_weight_physical', 0)}, Context={suspicious_test.get('mvs_weight_context', 0)}")
    
    print("\n⚠️  POTENTIAL ISSUES TO CHECK:")
    print("1. Are queries actually the same difficulty?")
    print("2. Is embedding_key correct? Should be 'g25f_oai3l' or similar")
    print("3. Were groups re-embedded with this model?")
    print("4. Is this test somehow using cached/different data?")
    
    # Save detailed report
    with open('query_analysis.txt', 'w') as f:
        f.write("QUERY COMPARISON REPORT\n")
        f.write("=" * 80 + "\n\n")
        
        f.write(f"Suspicious Test: {suspicious_test['name']}\n")
        f.write(f"Accuracy@1: {suspicious_metrics['accuracy_at_1']*100:.1f}%\n\n")
        
        f.write("First 50 Queries:\n\n")
        for i, result in enumerate(suspicious_results[:50], 1):
            query = result.get('generated_query', 'N/A')
            source = result.get('source_group_name', 'N/A')
            rank = result.get('correct_rank', 0)
            f.write(f"{i}. Rank {rank}: \"{query}\" -> {source}\n")
    
    print("\n✅ Detailed report saved to: query_analysis.txt")

if __name__ == '__main__':
    try:
        analyze_queries()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
