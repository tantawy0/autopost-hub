# AutoPost Hub

AutoPost Hub is a Next.js social media scheduling dashboard for creating,
drafting, scheduling, publishing, and reviewing posts across connected channels.
The app uses Supabase for authentication, post/channel data, and image storage.
This feature branch upgrades the prototype into a social publishing SaaS workflow
with typed post lifecycle state, connected-account records, per-destination
publishing attempts, Meta OAuth route handlers, and a scheduler endpoint.

## Stack

- Next.js 16 App Router
- React 19 and TypeScript
- Tailwind CSS 4
- Supabase JS
- lucide-react icons
- Sonner notifications
- Framer Motion-ready UI foundation
- Playwright E2E tests

## Getting Started

Install dependencies:

```bash
npm install
```

Create `.env.local` with the Supabase and provider values:

```bash
NEXT_PUBLIC_SUPABASE_URL=replace-with-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=replace-with-supabase-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3001
META_APP_ID=replace-with-meta-app-id
META_APP_SECRET=replace-with-meta-app-secret
META_REDIRECT_URI=http://localhost:3001/api/meta/callback
CRON_SECRET=replace-with-cron-secret
SUPABASE_SERVICE_ROLE_KEY=replace-with-supabase-service-role-key
```

Apply the Supabase migration in `supabase/migrations/` and confirm the
`post-images` bucket exists before testing upload and publishing flows.

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) when port 3000 is already occupied.

## Quality Gates

Run these before handing off a change:

```bash
npm run lint
npm run build
npm run test:e2e
```

By default, Playwright specs are environment-gated so local runs do not require
browser binaries or live provider credentials. For local full browser/API
coverage, generate a safe Supabase-backed E2E user and run:

```bash
npm run setup:e2e
npm run test:e2e
```

`setup:e2e` writes only E2E credentials to `.env.local`, which must stay ignored
by git. Provider-success publishing tests still require safe Meta/TikTok sandbox
accounts and explicit provider credentials.

Changes that touch routing, rendering, metadata, or Next.js config must consult
the relevant guide under `node_modules/next/dist/docs/` first. Changes that touch
Supabase schema, storage, Row Level Security, or environment variables must
update setup and verification notes in the same change.

## Project Governance

Feature work is governed by `.specify/memory/constitution.md`. Specs, plans, and
tasks must preserve authenticated user ownership, scheduling state integrity,
explicit platform integration boundaries, and independently verifiable user
journeys.
