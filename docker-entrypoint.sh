#!/usr/bin/env bash
set -e

echo "→ Applying database migrations…"
npx prisma migrate deploy

# Create the owner account on first run, printing generated credentials.
if [ "${CREATE_ADMIN:-1}" = "1" ]; then
  ONLY_IF_EMPTY=1 node scripts/create-admin.mjs || true
fi

echo "→ Starting Better Status on port ${PORT:-3000}"
exec "$@"
