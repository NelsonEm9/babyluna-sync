# BabyLuna Sync

A shared, realtime daily-care checklist for two parents — feeding, sleep,
diapers, tummy time, bath, and medicine. Built on Next.js (App Router) +
Supabase (Postgres, Auth, Realtime), styled from the "Day Rail" direction of
the BabyLuna Sync design export.

## Stack

- Next.js 16 (App Router, TypeScript, Turbopack)
- Tailwind CSS v4, themed with the design's actual tokens (`src/app/globals.css`)
- Supabase: Postgres + Auth (email/password) + Realtime
- Deployed to Vercel (Hobby/free tier compatible)

## 1. Create a Supabase project

1. Create a new project at [supabase.com/dashboard](https://supabase.com/dashboard) — use a **new** project, not one already running another app.
2. In **Database → Extensions**, enable `pg_cron` (needed for the daily reset; see below). If your plan doesn't expose this toggle, ask Supabase support to enable it — the migration will fail on the `create extension pg_cron` line without it.
3. Run the migrations in `supabase/migrations/` (in order) against the project (SQL Editor, or `supabase db push` with the CLI, or via the Supabase MCP `apply_migration`).
4. In **Authentication → Providers**, email/password should already be on. If you want the smoothest two-person setup, consider turning off "Confirm email" for this small project — the app still works with confirmation on, it just adds a "check your email" step between signup and onboarding.

## 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in your project's URL and anon key (Project Settings → API).

```bash
cp .env.local.example .env.local
```

`SUPABASE_SERVICE_ROLE_KEY` isn't used by the app today (every query runs as the signed-in user, under RLS) — it's there for a future admin script (e.g. a Web Push sender) and should never be sent to the browser.

## 3. Run it

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`, sign up, then either create a household or join one with an invite link from Settings.

## How task scheduling works

Recurring tasks aren't scheduled at a fixed clock time — each template just
configures an interval (e.g. "every 3h") or specific weekdays (e.g. bath on
Mon/Wed/Sat). There is always exactly one open occurrence per active
template; logging it computes and inserts the next one, rolling forward
continuously rather than being regenerated in a daily batch. A household's
daily reset time only archives completed items out of the visible list once
the next cycle starts — it never disturbs an already-ticking countdown.

A `pg_cron` job inside Postgres (`babyluna-occurrence-sweep`, every 15
minutes) calls `sweep_missing_occurrences()` as a backstop, giving any
template without an open occurrence one (new templates, reactivated ones, or
a rare missed roll-forward). "Sync tasks" in Settings calls the equivalent
`resync_household_tasks()` RPC directly. Neither path touches a Vercel
serverless function, so there's no Edge/Node runtime concern here.

## Notifications

In-app only for now, driven by the same Supabase Realtime subscriptions used
for dashboard/task sync (no polling). Full Web Push (service worker + VAPID
keys + a subscription table) is a real chunk of scope beyond that, so it's
deferred — when it's added, the send route must run on the **Node runtime**
(`export const runtime = "nodejs"`), since the `web-push` package depends on
Node's `crypto` module and isn't Edge-compatible.

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Add the same environment variables from `.env.local` in the Vercel project settings.
3. Deploy — no `vercel.json` or cron config needed, since the reset runs inside Supabase.

## Regenerating types

`src/lib/database.types.ts` is hand-written to match the migration. Once the
project is linked with the Supabase CLI or MCP, regenerate it with
`generate_typescript_types` (or `supabase gen types typescript`) and replace
the file wholesale.
