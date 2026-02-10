#!/bin/bash
set -euo pipefail

# --- ⚙️ CONFIGURATION ---
PROJECT_ID="nextjs-development-staging"
REGION="us-east1"
SERVICE_NAME="dockbloxx-dev-staging"

# --- 🌍 PUBLIC VARIABLES ---
NEXT_PUBLIC_APP_URL="https://dockbloxx-dev-staging-616437017506.us-east1.run.app""
NEXT_PUBLIC_BACKEND_URL="https://dockbloxx.mystagingwebsite.com"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_51QsxN9GbwNBR3bzrVFHrDH6mBJXPf1KrLQf6GhvRKJWLY1qGN2z8LrjD8YzKQfVJGvXZQKJvMz5Kv1234567890"

# --- 🚀 EXECUTION ---
echo "=================================================="
echo "🤖 Stark Deployment Agent: Initiating Sequence"
echo "   Project: $PROJECT_ID"
echo "   Region:  $REGION"
echo "   Service: $SERVICE_NAME"
echo "=================================================="

# 1. Ensure we are looking at the right project
gcloud config set project "$PROJECT_ID" --quiet

# 2. Submit the build
echo "🚀 Submitting Cloud Build..."
gcloud builds submit \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --config cloudbuild.yaml \
  --substitutions _REGION="$REGION",_SERVICE_NAME="$SERVICE_NAME",_NEXT_PUBLIC_APP_URL="$NEXT_PUBLIC_APP_URL",_NEXT_PUBLIC_BACKEND_URL="$NEXT_PUBLIC_BACKEND_URL",_NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"

echo "=================================================="
echo "✅ Deployment Sequence Complete."
echo "   Next: Set invoker policy for domain:cyberizegroup.com"
echo "   Then: Update NEXT_PUBLIC_APP_URL with the real URL and redeploy"
echo "=================================================="
