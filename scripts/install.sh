#!/usr/bin/env bash
###############################################################################
# Better Status — native quick installer (Ubuntu/Debian).
#
# Sets up: PostgreSQL database, .env, dependencies, build, a systemd service,
# an nginx reverse proxy and (optionally) a Let's Encrypt certificate.
# Generates a random admin password and prints the credentials at the end.
#
# Usage (from the project directory):
#   sudo DOMAIN=status.example.com bash scripts/install.sh
#
# Optional env:
#   PORT=4319                 app port (internal)
#   DATABASE_URL=...          use an existing database instead of creating one
#   ADMIN_EMAIL=admin@local   owner email
#   SKIP_TLS=1                don't run certbot
#   SKIP_NGINX=1              don't configure nginx (e.g. another proxy is used)
###############################################################################
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-4319}"
DOMAIN="${DOMAIN:-}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@local}"
SERVICE=better-status

log() { echo -e "\n\033[1;36m→ $*\033[0m"; }
die() { echo -e "\033[1;31mERROR: $*\033[0m" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Run as root (sudo)."
command -v node >/dev/null || die "Node.js 20+ is required. Install it first."
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
[ "$NODE_MAJOR" -ge 20 ] || die "Node.js 20+ required (found $(node -v))."

cd "$APP_DIR"

# ---- database ----
if [ -z "${DATABASE_URL:-}" ]; then
  command -v psql >/dev/null || die "PostgreSQL not found. Install it or pass DATABASE_URL."
  DB_NAME="better_status"
  DB_USER="bstatus"
  DB_PASS="$(openssl rand -hex 16)"
  log "Creating PostgreSQL database '$DB_NAME' and role '$DB_USER'…"
  sudo -u postgres psql <<SQL || true
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='$DB_USER') THEN
    CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASS' CREATEDB;
  ELSE
    ALTER ROLE $DB_USER PASSWORD '$DB_PASS' CREATEDB;
  END IF;
END \$\$;
SQL
  sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 \
    || sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
  DATABASE_URL="postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME?schema=public"
fi

# ---- env ----
log "Writing .env"
APP_SECRET="$(openssl rand -hex 32)"
PUBLIC_URL="${PUBLIC_URL:-${DOMAIN:+https://$DOMAIN}}"
PUBLIC_URL="${PUBLIC_URL:-http://localhost:$PORT}"
cat > "$APP_DIR/.env" <<EOF
DATABASE_URL="$DATABASE_URL"
APP_SECRET="$APP_SECRET"
PUBLIC_URL="$PUBLIC_URL"
PORT=$PORT
EOF

# ---- build ----
log "Installing dependencies"
npm ci
log "Generating Prisma client & applying migrations"
npx prisma generate
npx prisma migrate deploy
log "Building"
npm run build

# ---- admin ----
log "Creating admin account"
ADMIN_OUTPUT="$(ADMIN_EMAIL="$ADMIN_EMAIL" ONLY_IF_EMPTY=1 node scripts/create-admin.mjs || true)"
echo "$ADMIN_OUTPUT"

# ---- systemd ----
log "Installing systemd service: $SERVICE"
cat > /etc/systemd/system/$SERVICE.service <<EOF
[Unit]
Description=Better Status
After=network-online.target postgresql.service

[Service]
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env
ExecStart=$(command -v npm) run start
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now $SERVICE
sleep 2
systemctl is-active --quiet $SERVICE && echo "  service is running" || echo "  WARNING: service not active — check: journalctl -u $SERVICE"

# ---- nginx ----
if [ -z "${SKIP_NGINX:-}" ] && [ -n "$DOMAIN" ] && command -v nginx >/dev/null; then
  log "Configuring nginx for $DOMAIN"
  cat > /etc/nginx/sites-available/$SERVICE.conf <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF
  ln -sf /etc/nginx/sites-available/$SERVICE.conf /etc/nginx/sites-enabled/$SERVICE.conf
  nginx -t && systemctl reload nginx

  if [ -z "${SKIP_TLS:-}" ] && command -v certbot >/dev/null; then
    log "Requesting Let's Encrypt certificate"
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$ADMIN_EMAIL" --redirect || \
      echo "  certbot failed — you can run it manually later."
  fi
fi

echo -e "\n\033[1;32m✓ Better Status is installed.\033[0m"
echo "  URL:     $PUBLIC_URL"
echo "  Service: systemctl status $SERVICE"
echo "$ADMIN_OUTPUT" | grep -E "Email:|Password:" || echo "  (admin already existed — use your existing credentials)"
