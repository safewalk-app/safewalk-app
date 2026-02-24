#!/bin/bash

# Script: Deploy all Edge Functions to Supabase
# Purpose: Automate deployment of 7 Edge Functions
# Usage: bash scripts/deploy-edge-functions.sh

set -e

echo "🚀 SafeWalk Edge Functions Deployment"
echo "======================================"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install it with:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "app.config.ts" ]; then
    echo "❌ Error: app.config.ts not found. Please run this script from the project root."
    exit 1
fi

# List of Edge Functions to deploy
FUNCTIONS=(
    "start-trip"
    "checkin"
    "extend"
    "ping-location"
    "test-sms"
    "sos"
    "cron-check-deadlines"
)

# Deploy each function
DEPLOYED=0
FAILED=0

for func in "${FUNCTIONS[@]}"; do
    echo "📦 Deploying: $func"
    
    if supabase functions deploy "$func" --project-ref $(grep -o 'project_id[^}]*' .env.local 2>/dev/null || echo "your-project-id"); then
        echo "✅ $func deployed successfully"
        ((DEPLOYED++))
    else
        echo "❌ $func deployment failed"
        ((FAILED++))
    fi
    echo ""
done

# Summary
echo "======================================"
echo "📊 Deployment Summary"
echo "======================================"
echo "✅ Deployed: $DEPLOYED"
echo "❌ Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 All Edge Functions deployed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Configure CRON_SECRET in Supabase"
    echo "2. Set up Cron Job for cron-check-deadlines"
    echo "3. Integrate trip-service in app-context.tsx"
else
    echo "⚠️  Some deployments failed. Check the errors above."
    exit 1
fi
