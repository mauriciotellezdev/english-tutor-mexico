#!/bin/bash
set -e

echo "🔨 Building Astro site..."
bun run build

echo "📄 Deploying Pages site..."
npx wrangler pages deploy --project-name english-tutor-mexico --branch main dist --commit-dirty=true

echo "⚡ Deploying Worker..."
cd worker
npx wrangler deploy

echo "✅ Done! Both Pages and Worker deployed."
