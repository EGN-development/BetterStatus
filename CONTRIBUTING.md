# Contributing to Better Status

Thanks for your interest in improving Better Status!

## Development

```bash
npm install
cp .env.example .env            # point DATABASE_URL at a local Postgres
npx prisma migrate dev
node scripts/create-admin.mjs   # create an owner login
npm run dev
```

- **Type-check:** `npx tsc --noEmit`
- **Lint:** `npm run lint`
- **Build:** `npm run build`

Please run the type-check and a production build before opening a PR.

## Project layout

| Path | What |
|------|------|
| `src/app` | Next.js routes — public page, admin, API routes |
| `src/lib/monitors` | Check executors, scheduler, uptime stats |
| `src/lib/notifications.ts` | Channel senders (Telegram/Email/Slack/Discord/Webhook) |
| `src/lib/telegram.ts` | Subscriber bot (webhook, binding, language) |
| `src/lib/metrics.ts` | Agent metrics aggregation |
| `src/components` | UI components (admin + public) |
| `prisma/schema.prisma` | Data model |
| `public/agent` | Server metrics agent + installer |
| `scripts` | `create-admin.mjs`, native `install.sh` |

## Guidelines

- Keep changes additive and typed; match the existing code style.
- New settings go on the `Settings` model and the admin; avoid new required env vars.
- Add a Prisma migration for any schema change (`npx prisma migrate dev --name ...`).
- Never commit secrets — `.env` is gitignored; use `.env.example` for new keys.

## Reporting issues

Open a GitHub issue with steps to reproduce, expected vs actual behavior, and
your deployment method (Docker / native) and versions.
