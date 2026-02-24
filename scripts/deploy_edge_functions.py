#!/usr/bin/env python3
"""
Deploy Edge Functions to Supabase via Management API
Usage: python3 scripts/deploy_edge_functions.py
"""

import os
import json
import requests
import sys
from pathlib import Path

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
PROJECT_ID = SUPABASE_URL.split("//")[1].split(".")[0] if SUPABASE_URL else ""

# Edge Functions to deploy
FUNCTIONS = [
    "start-trip",
    "checkin",
    "extend",
    "ping-location",
    "test-sms",
    "sos",
    "cron-check-deadlines",
]

def get_function_code(func_name: str) -> str:
    """Read Edge Function code from file"""
    func_path = Path(f"supabase/functions/{func_name}/index.ts")
    if not func_path.exists():
        raise FileNotFoundError(f"Function code not found: {func_path}")
    return func_path.read_text()

def deploy_function(func_name: str, code: str) -> bool:
    """Deploy a single Edge Function via Supabase Management API"""
    
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        return False
    
    # Supabase Management API endpoint
    api_url = f"https://api.supabase.com/v1/projects/{PROJECT_ID}/functions"
    
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }
    
    payload = {
        "name": func_name,
        "slug": func_name,
        "body": code,
        "verify_jwt": True,
    }
    
    try:
        print(f"📦 Deploying: {func_name}...", end=" ", flush=True)
        
        # Try to create function
        response = requests.post(api_url, json=payload, headers=headers, timeout=30)
        
        if response.status_code in [200, 201]:
            print("✅ Deployed")
            return True
        elif response.status_code == 409:
            # Function already exists, try to update
            print("(updating)...", end=" ", flush=True)
            update_url = f"{api_url}/{func_name}"
            response = requests.patch(update_url, json=payload, headers=headers, timeout=30)
            if response.status_code in [200, 201]:
                print("✅ Updated")
                return True
        
        print(f"❌ Failed ({response.status_code})")
        print(f"   Response: {response.text}")
        return False
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def main():
    """Main deployment function"""
    print("🚀 SafeWalk Edge Functions Deployment")
    print("=" * 50)
    print()
    
    # Validate configuration
    if not SUPABASE_URL:
        print("❌ Error: SUPABASE_URL not set")
        print("   Set it in your environment or .env file")
        sys.exit(1)
    
    if not SUPABASE_SERVICE_ROLE_KEY:
        print("❌ Error: SUPABASE_SERVICE_ROLE_KEY not set")
        print("   Set it in your environment or .env file")
        sys.exit(1)
    
    if not PROJECT_ID:
        print("❌ Error: Could not extract PROJECT_ID from SUPABASE_URL")
        sys.exit(1)
    
    print(f"📍 Project: {PROJECT_ID}")
    print(f"🌐 URL: {SUPABASE_URL}")
    print()
    
    # Deploy each function
    deployed = 0
    failed = 0
    
    for func_name in FUNCTIONS:
        try:
            code = get_function_code(func_name)
            if deploy_function(func_name, code):
                deployed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"❌ {func_name}: {str(e)}")
            failed += 1
    
    # Summary
    print()
    print("=" * 50)
    print("📊 Deployment Summary")
    print("=" * 50)
    print(f"✅ Deployed: {deployed}/{len(FUNCTIONS)}")
    print(f"❌ Failed: {failed}/{len(FUNCTIONS)}")
    print()
    
    if failed == 0:
        print("🎉 All Edge Functions deployed successfully!")
        print()
        print("Next steps:")
        print("1. Configure CRON_SECRET in Supabase")
        print("2. Set up Cron Job for cron-check-deadlines")
        print("3. Integrate trip-service in app-context.tsx")
    else:
        print("⚠️  Some deployments failed. Check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
