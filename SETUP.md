# WBCO WMS -- Setup Guide

## Prerequisites
- Node.js 20+
- npm or pnpm
- Supabase project (already configured)
- Vercel account (for deployment)

---

## Local Development

### 1. Install dependencies
```bash
cd wbco-wms
npm install
```

### 2. Environment variables
`.env.local` is already written. It contains:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SHOPIFY_STORE_DOMAIN` / `SHOPIFY_ADMIN_ACCESS_TOKEN` (fill in after creating Shopify app)
- `SHIPSTATION_API_KEY` / `SHIPSTATION_API_SECRET` / `SHIPSTATION_WEBHOOK_SECRET` (fill in)

### 3. Run dev server
```bash
npm run dev
```
App will be at http://localhost:3000

---

## Database
- **Project ref:** `kxcbkmdeccmkiptcmowt`
- **Region:** East US
- Migrations in `supabase/migrations/` were applied via Supabase Management API
- All 21 tables + RLS policies + views + seed data are live

## Staff Accounts
All accounts created in Supabase Auth. See `WMS-App-Build/CREDENTIALS.md` for temp password.
- Dana (admin)
- April (picker)
- Bri (picker)
- Lauren (picker)
- Marjorie (picker)

---

## Deployment (Vercel)

1. Connect `thegrowththread/wbco-wms` repo in Vercel
2. Add all env vars from `.env.local` in Vercel project settings
3. Deploy -- Vercel auto-detects Next.js

### Supabase Auth callback URL
After deploying, add your Vercel URL to Supabase:
- Dashboard -> Authentication -> URL Configuration
- Add: `https://your-app.vercel.app/auth/callback` to Redirect URLs

---

## GitHub Repo
`https://github.com/thegrowththread/wbco-wms` (private)

---

## Key Architecture Notes
- **App Router** -- all pages in `app/`
- **RLS** -- pickers cannot see cost/price data; enforced at DB level via `get_user_role()`
- **Service role client** -- used only in API routes (`lib/supabase/server.ts -> createServiceClient()`)
- **Inventory is never negative** -- DB constraint `quantity_on_hand >= 0`
- **Available qty** = on_hand - pending (computed in `inventory_summary` view, never stored)
