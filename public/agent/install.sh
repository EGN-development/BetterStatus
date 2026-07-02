#!/usr/bin/env bash
# Better Status — agent installer / updater.
#
# Install:
#   curl -fsSL https://status.example.com/agent/install.sh | sudo BS_URL="https://status.example.com" BS_TOKEN="<token>" bash
#
# Update an already-installed agent (reuses saved config):
#   curl -fsSL https://status.example.com/agent/install.sh | sudo bash
#   # or simply:  sudo better-status-agent-update
set -euo pipefail

CONF=/etc/better-status-agent.env
BIN=/usr/local/bin/better-status-agent.sh
UPDATER=/usr/local/bin/better-status-agent-update
INTERVAL="${BS_INTERVAL:-30}"

# Update mode: pull saved config when BS_URL/BS_TOKEN are not provided.
if { [ -z "${BS_URL:-}" ] || [ -z "${BS_TOKEN:-}" ]; } && [ -f "$CONF" ]; then
  echo "→ Update mode: using existing $CONF"
  . "$CONF"
fi

BS_URL="${BS_URL:-}"
BS_TOKEN="${BS_TOKEN:-}"

if [ -z "$BS_URL" ] || [ -z "$BS_TOKEN" ]; then
  echo "ERROR: BS_URL and BS_TOKEN must be set (first install)." >&2
  echo "Example: sudo BS_URL=https://status.example.com BS_TOKEN=xxxx bash install.sh" >&2
  exit 1
fi
[ "$(id -u)" -eq 0 ] || { echo "ERROR: run as root (use sudo)." >&2; exit 1; }

echo "→ Downloading agent…"
curl -fsSL "$BS_URL/agent/better-status-agent.sh" -o "$BIN"
chmod +x "$BIN"

echo "→ Writing config to $CONF"
cat > "$CONF" <<EOF
BS_URL="$BS_URL"
BS_TOKEN="$BS_TOKEN"
EOF
chmod 600 "$CONF"

# install a convenience updater command
cat > "$UPDATER" <<EOF
#!/usr/bin/env bash
exec curl -fsSL "$BS_URL/agent/install.sh" | bash
EOF
chmod +x "$UPDATER"

if command -v systemctl >/dev/null 2>&1; then
  echo "→ Installing systemd service + timer (every ${INTERVAL}s)"
  cat > /etc/systemd/system/better-status-agent.service <<EOF
[Unit]
Description=Better Status metrics agent
After=network-online.target

[Service]
Type=oneshot
EnvironmentFile=$CONF
ExecStart=$BIN
EOF
  cat > /etc/systemd/system/better-status-agent.timer <<EOF
[Unit]
Description=Run Better Status agent every ${INTERVAL}s

[Timer]
OnBootSec=15
OnUnitActiveSec=${INTERVAL}
AccuracySec=1s

[Install]
WantedBy=timers.target
EOF
  systemctl daemon-reload
  systemctl enable --now better-status-agent.timer
  systemctl start better-status-agent.service || true
  echo "✓ Installed/updated. Run 'sudo better-status-agent-update' to update later."
else
  echo "systemd not found — installing a cron entry instead."
  ( crontab -l 2>/dev/null | grep -v better-status-agent; echo "* * * * * $BIN >/dev/null 2>&1" ) | crontab -
  "$BIN" || true
  echo "✓ Installed/updated via cron."
fi
