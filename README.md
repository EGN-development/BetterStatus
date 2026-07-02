<div align="center">

# Better Status <sub>by EGN</sub>

**Open-source uptime monitoring & status page.**
A self-hostable alternative to Better Stack / Statuspage / Uptime Kuma.

Built with Next.js · TypeScript · Prisma · PostgreSQL.

</div>

---

Better Status watches your services, opens & resolves incidents automatically,
collects live server metrics from a lightweight agent, and publishes a clean,
themeable public status page — all from a single self-hosted app.

## Features

- **7 monitor types** — HTTP(s), API (keyword / status assertions), Ping (ICMP),
  TCP, UDP, DNS, and Cron / heartbeat (dead-man switch). Per-monitor interval,
  timeout, retries, expected status, keyword, headers/body and alerting.
- **Automatic incidents** — monitors open and resolve incidents on their own;
  admins can also publish incidents manually with a full update timeline
  (Investigating → Identified → Monitoring → Resolved).
- **Scheduled maintenance** — plan windows; affected monitors pause and won't
  raise false incidents while maintenance is in progress.
- **Server metrics agent** — a zero-dependency shell agent that *pushes*
  CPU / memory / disk / network / load to the server. Group servers into
  **pools (clusters)** with averaged metrics and 24h graphs; per-node CPU model,
  threads, total memory, and current usage. One-line install + self-update.
- **Notifications** — Telegram, Email (SMTP), Slack, Discord, Webhook and generic
  API channels, plus per-monitor webhooks. Rich Discord/Slack embeds.
- **Subscribers** — visitors subscribe via Email or Telegram (one-time deep-link
  binding + notification-language choice). **RSS** & **Atom** incident feeds.
- **Public read API** — opt-in JSON API (`/api/v1/status`) where the admin chooses
  exactly which data is exposed, with an optional key and CORS.
- **Fully themeable** — 5 built-in themes + a custom color editor with live
  preview, uploadable logo & favicon, and RU/EN language toggle. Per-field control
  over what the public page shows.
- **Beautiful status page** — overall status, grouped services with per-day
  proportional uptime bars (24h / 7d / 30d / 90d), incident history, live
  infrastructure gauges and a subscribe widget.

## Screenshots

> _Add screenshots of the public status page and admin dashboard here._

## Quick start — Docker Compose (recommended)

```bash
git clone https://github.com/EGN-development/BetterStatus.git better-status && cd better-status
cp .env.example .env
echo "APP_SECRET=$(openssl rand -hex 32)" >> .env      # set a real secret
docker compose up -d --build
docker compose logs app | grep -A6 "admin credentials"  # your generated login
```

The app listens on `http://localhost:3000` (override with `APP_PORT`). Put nginx /
Caddy / your reverse proxy in front for TLS. On first run it applies migrations
and prints a generated admin email + password.

## Quick start — native (nginx)

On an Ubuntu/Debian host with **Node 20+** and **PostgreSQL**:

```bash
git clone https://github.com/EGN-development/BetterStatus.git better-status && cd better-status
sudo DOMAIN=status.example.com bash scripts/install.sh
```

This creates the database, builds the app, installs a `better-status` systemd
service, configures an nginx reverse proxy + Let's Encrypt, and prints the
generated admin credentials. See the top of `scripts/install.sh` for options
(`PORT`, `DATABASE_URL`, `ADMIN_EMAIL`, `SKIP_TLS`, `SKIP_NGINX`).

## Manual / development setup

```bash
npm install
npx prisma migrate deploy        # or: npx prisma migrate dev
node scripts/create-admin.mjs    # create / reset an owner login (prints password)
npm run dev                      # http://localhost:3000
```

## Configuration

| Variable            | Description                                                        |
|---------------------|-------------------------------------------------------------------|
| `DATABASE_URL`      | PostgreSQL connection string                                      |
| `APP_SECRET`        | Secret protecting `POST /api/internal/tick` and internal tokens   |
| `PUBLIC_URL`        | Public base URL (links in notifications & feeds)                  |
| `PORT`              | Port the server listens on                                        |
| `DISABLE_SCHEDULER` | `1` to disable the in-process scheduler (drive it via the tick endpoint) |
| `TELEGRAM_BOT_TOKEN`| Optional fallback bot token for Telegram subscribers              |

Branding, theme, custom colors, SMTP, the Telegram bot token, display toggles
and the public API are all configured in the **admin panel** (no redeploy needed).

## Server metrics agent

In the admin, open **Servers → Add server**, then run the shown one-liner on the
machine you want to monitor:

```bash
curl -fsSL https://status.example.com/agent/install.sh \
  | sudo BS_URL="https://status.example.com" BS_TOKEN="<token>" bash
```

It installs a systemd timer that reports every 30s. Update installed agents with:

```bash
sudo better-status-agent-update
```

Assign servers to a **pool** in the admin to get cluster-average metrics.

## Public API

Enable it in **Admin → API** and choose which sections to expose.

```bash
curl "https://status.example.com/api/v1/status"          # open
curl "https://status.example.com/api/v1/status?key=KEY"  # if a key is set
```

Returns `page`, `status`, and any enabled sections: `components` (with optional
`uptime`), `incidents`, `maintenances`, and `nodes` (server metrics). CORS is
open (`Access-Control-Allow-Origin: *`). Returns `404` when disabled, `401` on a
bad key.

## Feeds

- Incidents RSS: `/rss`
- Incidents Atom: `/atom`
- Cron/heartbeat push URL: shown per CRON monitor in the admin.

## How it works

- **Scheduler** — runs in-process via Next.js `instrumentation` (every ~15s),
  or externally via `POST /api/internal/tick`. Executes due checks, evaluates
  heartbeats, transitions maintenance windows and detects offline agents.
- **Checks** live in `src/lib/monitors/` · **notifications** in
  `src/lib/notifications.ts` · **themes** in `src/app/globals.css` +
  `src/lib/themes.ts` · **agent** in `public/agent/`.

## Tech stack

Next.js (App Router) · React · TypeScript · Tailwind CSS · Prisma · PostgreSQL ·
nodemailer. Deployed via Docker or systemd + nginx.

## License

[MIT](LICENSE) © EGN (EG Network)
