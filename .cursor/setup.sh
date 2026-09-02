#!/usr/bin/env bash
# Cloud Agent bootstrap for the You First Lacrosse marketing + admin site.
set -euo pipefail

npm ci --no-audit --no-fund

# Seed gitignored dev placeholders so the dev server boots for UI work. Public
# marketing pages render without these; DB-backed admin/portal/schedule pages
# need real Supabase + Stripe values. Real secrets injected via Cursor Secrets
# are NOT overwritten by this file (Next.js leaves already-set env vars intact).
if [ ! -f .env.local ]; then
  cat > .env.local <<'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://placeholder-dev.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key
SUPABASE_SERVICE_ROLE_KEY=placeholder-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
EOF
  echo "==> wrote dev placeholder .env.local"
fi
