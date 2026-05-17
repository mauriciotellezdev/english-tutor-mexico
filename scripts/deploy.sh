#!/bin/bash
set -e

echo "========================================="
echo "  Add → Commit → Push → Deploy"
echo "========================================="

# Load Cloudflare credentials
if [ -f worker/.env ]; then
  export CLOUDFLARE_ACCOUNT_ID=$(grep CLOUDFLARE_ACCOUNT_ID worker/.env | cut -d= -f2)
  export CLOUDFLARE_API_TOKEN=$(grep CLOUDFLARE_API_TOKEN worker/.env | cut -d= -f2)
fi

# 1. Add + Commit
echo ""
echo "📦 Staging changes..."
git add -A

echo "📝 Committing..."
git commit -m "deploy: $(date '+%Y-%m-%d %H:%M')" || echo "  (nothing new to commit)"

# 2. Push
echo ""
echo "🚀 Pushing to remote..."
git push

# 3. Build + Deploy Pages
echo ""
echo "🔨 Building Astro site..."
bun run build

echo "📄 Deploying Pages site..."
npx wrangler pages deploy --project-name english-tutor-mexico --branch main dist --commit-dirty=true

# 4. Deploy Worker
echo ""
echo "⚡ Deploying Worker..."
cd worker
npx wrangler deploy

echo ""
echo "========================================="
echo "  ✅ Done! Pages + Worker deployed."
echo "========================================="
