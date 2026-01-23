#!/usr/bin/env python3
"""Check how many groups have embeddings for each key"""

import os
import sys
from dotenv import load_dotenv

load_dotenv('.env.local')

POCKETBASE_URL = os.getenv('POCKETBASE_URL', 'http://localhost:8090')
POCKETBASE_ADMIN_EMAIL = os.getenv('POCKETBASE_ADMIN_EMAIL')
POCKETBASE_ADMIN_PASSWORD = os.getenv('POCKETBASE_ADMIN_PASSWORD')

sys.path.insert(0, os.path.dirname(__file__))
from export_to_wandb import PocketBaseClient

def check_embeddings():
    print("🔍 Checking embedding coverage...\n")
    
    pb = PocketBaseClient(POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD)
    
    # Get all groups (use internal pb client)
    import requests
    response = requests.get(
        f'{POCKETBASE_URL}/api/collections/groups/records',
        params={'perPage': 500, 'filter': 'embeddings != null'},
        headers={'Authorization': f'Bearer {pb.token}'}
    )
    response.raise_for_status()
    all_groups = response.json()['items']
    
    print(f"✅ Total groups with embeddings: {len(all_groups)}\n")
    
    # Count per key
    key_counts = {}
    
    for group in all_groups:
        embeddings = group.get('embeddings', {})
        if embeddings:
            for key in embeddings.keys():
                if key not in key_counts:
                    key_counts[key] = 0
                key_counts[key] += 1
    
    # Sort by count
    sorted_keys = sorted(key_counts.items(), key=lambda x: x[1], reverse=True)
    
    print("📊 Embedding Coverage by Key:\n")
    print(f"{'Key':<20} {'Groups':<10} {'%':<10}")
    print("-" * 40)
    
    for key, count in sorted_keys:
        percent = (count / len(all_groups) * 100)
        print(f"{key:<20} {count:<10} {percent:.1f}%")
    
    # Check specific key
    target_key = 'g25f_oai3l'
    if target_key in key_counts:
        print(f"\n⚠️  Key '{target_key}': {key_counts[target_key]} groups")
        print(f"   This is {'VERY LOW' if key_counts[target_key] < 50 else 'OK'}")
    else:
        print(f"\n❌ Key '{target_key}' NOT FOUND in any groups!")
        print(f"   Need to regenerate embeddings for this key")
    
    print(f"\n💡 Recommendation:")
    if target_key not in key_counts or key_counts[target_key] < 50:
        print(f"   1. Go to UI → Embedding Tests → Regeneration")
        print(f"   2. Create job for: enrichment=g25f, embedding=oai3l")
        print(f"   3. Wait for completion (~5-10 min)")
        print(f"   4. Re-run test")
    else:
        print(f"   Key has enough groups, test should work correctly")

if __name__ == '__main__':
    try:
        check_embeddings()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
