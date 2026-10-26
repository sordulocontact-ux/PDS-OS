#!/usr/bin/env bash
# Pre-production « Recommencer » (docs/PREPROD.md): replays every migration
# on the pre-production database, then the seed of supabase/preprod/seed.sql
# (test accounts and one project per moment of « Aller à »).
#
#   pnpm preprod:reset
#
# Reads PREPROD_DB_URL and PREPROD_PASSWORD from the environment or from
# .env.preprod.local (git-ignored). Refuses any database holding an account
# outside @preprod.pds: the production database can never be reset by it.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env.preprod.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.preprod.local
  set +a
fi
: "${PREPROD_DB_URL:?PREPROD_DB_URL manquant (.env.preprod.local)}"
: "${PREPROD_PASSWORD:?PREPROD_PASSWORD manquant (.env.preprod.local)}"
if [[ "$PREPROD_PASSWORD" == *"'"* ]]; then
  echo "PREPROD_PASSWORD ne doit pas contenir d'apostrophe (openssl rand -base64 18)." >&2
  exit 1
fi

PSQL="${PSQL:-$(command -v psql || echo /opt/homebrew/opt/libpq/bin/psql)}"

# Guard: only an empty base or one holding test accounts alone.
others=$("$PSQL" "$PREPROD_DB_URL" -tAc \
  "select count(*) from auth.users where email not like '%@preprod.pds'")
if [[ "$others" != "0" ]]; then
  echo "Refusé : cette base a $others compte(s) hors @preprod.pds. Ce n'est pas la pré-prod." >&2
  exit 1
fi

supabase db reset --db-url "$PREPROD_DB_URL" --no-seed --yes

# The password goes through stdin, never in argv (visible in ps).
{
  printf "\\set pw '%s'\n" "$PREPROD_PASSWORD"
  cat supabase/preprod/seed.sql
} | "$PSQL" "$PREPROD_DB_URL" -q -v ON_ERROR_STOP=1 >/dev/null

echo "Pré-prod remise à zéro : comptes de test et moments prêts."
