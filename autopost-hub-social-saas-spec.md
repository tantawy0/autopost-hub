# AutoPost Hub — Social Publishing SaaS Transformation Spec

## Project Vision

Transform AutoPost Hub into a production-grade social media scheduling SaaS inspired by high-quality social media SaaS dashboards.

The platform should feel premium, polished, scalable, smooth, and animation-rich while maintaining clean architecture and safe Supabase + Meta integrations.

Reference:
High-quality social publishing SaaS products and modern AI-first dashboards.

UI Goal:
- social publishing workflow
- Premium dark SaaS UI
- Smooth Framer Motion animations
- Clean spacing and typography
- Production-ready dashboard
- Mobile responsive
- Fast and modern UX

---

# Tech Stack

## Frontend
- Next.js App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- lucide-react
- Sonner

## Backend
- Supabase
- Supabase Auth
- Supabase Storage
- Supabase PostgreSQL
- Meta Graph API

---

# Required UI/UX Skill

Use:
https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git

Apply its:
- spacing system
- layout principles
- premium component styling
- dashboard patterns
- animation philosophy
- UX polish

---

# Existing Project State

Already implemented:

- Authentication
- Protected routes
- Dashboard
- Drafts
- Scheduled posts
- Published posts
- Calendar page
- Channels page
- Supabase Auth
- Supabase Storage uploads
- RLS enabled
- post-images bucket
- publish scheduler prototype
- LoadingButton component
- Sonner installed
- Meta App created
- OAuth redirect configured

Environment variables already exist:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=
```

---

# Critical Rules

## DO NOT

- Do NOT reset database
- Do NOT remove RLS
- Do NOT expose secrets to frontend
- Do NOT break auth
- Do NOT delete current features
- Do NOT use alert()
- Do NOT hardcode credentials
- Do NOT rewrite app unnecessarily

## MUST

- Use reusable components
- Use loading states
- Use Sonner toasts
- Use Framer Motion
- Use TypeScript-safe code
- Use incremental architecture
- Keep project scalable
- Keep Supabase secure

---

# Product Goals

## Primary Goal

Build a social publishing SaaS where users can:

- Connect social accounts
- Create posts
- Upload media
- Schedule posts
- Manage drafts
- View published posts
- Use calendar scheduling
- Manage channels
- Auto publish content
- Use OAuth social integrations

---

# Dashboard Requirements

Create a professional social publishing dashboard.

## Features

- Overview analytics cards
- Scheduled queue
- Recent published posts
- Connected channel summary
- Quick actions
- Empty states
- Animated cards
- Responsive layout

## Cards

- Total Posts
- Draft Posts
- Scheduled Posts
- Published Posts
- Connected Channels

## UX

- Framer Motion animations
- Hover effects
- Smooth transitions
- Skeleton loaders
- Empty state illustrations

---

# Create Post / Composer

Create a professional composer inspired by AutoPost Hub.

## Features

- Caption editor
- First comment field
- Media upload
- Media preview
- Platform selector
- Schedule date/time
- Save Draft
- Schedule Post
- Back to Dashboard button

## Validation

Validate:
- caption
- platform selection
- schedule date
- uploaded media

## UX

- LoadingButton
- Sonner toasts
- Drag/drop upload
- Smooth animations

## Storage

Upload media to:
- Supabase Storage
- post-images bucket

---

# Calendar

Replace localStorage completely.

## Requirements

Use Supabase data only.

Show:
- Scheduled posts
- Platform badges
- Schedule times
- Edit buttons

## Features

- Calendar view
- List view
- Filters
- Responsive layout
- Empty states

---

# Drafts

Replace localStorage completely.

## Features

- Show drafts from Supabase
- Edit draft
- Delete draft
- Schedule later
- Better UI

---

# Published Page

## Features

- Show published posts
- Sort by published_at descending
- Show media previews
- Show platforms
- Show caption
- Show first comment

## Database

Use:
published_at timestamptz

---

# Channels Page

Build a real social publishing channels management system.

## Platforms

- Instagram
- Facebook
- TikTok placeholder

## Features

- Connected state
- Disconnected state
- Connect buttons
- Disconnect buttons
- Animated cards
- OAuth integration

---

# Meta OAuth Integration

Implement real Meta OAuth structure.

## API Routes

Create:

/api/meta/login
/api/meta/callback

## Requirements

### /api/meta/login

- Redirect to Meta OAuth

### /api/meta/callback

- Exchange code for access token
- Store tokens securely
- Save connected accounts in Supabase

## Security

- NEVER expose META_APP_SECRET
- OAuth exchange must happen server-side

---

# Meta Dashboard Already Configured

Already done manually:

- Meta App created
- Facebook Login added
- OAuth Redirect URI configured:
  http://localhost:3000/api/meta/callback

---

# Remaining Meta Integration Requirements

Prepare architecture for:

## Instagram Graph API

Support:
- Instagram Business accounts
- Publishing posts
- Getting profile data

## Facebook Pages API

Support:
- Publishing to pages
- Page listing
- Page access tokens

## TikTok

Prepare placeholder architecture only.

---

# Connected Accounts Database

Create or confirm table:

connected_accounts

## Fields

- id
- user_id
- platform
- account_name
- account_id
- page_id
- instagram_business_account_id
- access_token
- refresh_token
- token_expires_at
- status
- created_at
- updated_at

---

# RLS Policies

Users must only access their own accounts.

Required:
- SELECT
- INSERT
- UPDATE
- DELETE

All filtered by:
auth.uid() = user_id

---

# Publishing Architecture

Create scalable publishing architecture.

## Required Functions

- publishPost(postId)
- processDuePosts()
- publishToFacebook()
- publishToInstagram()
- publishToTikTok()

---

# Scheduler

Prepare production-ready scheduler structure.

## Options

- Vercel Cron
- Supabase Edge Functions
- API scheduler route

## Logic

Find:
status = 'Scheduled'
AND scheduled_for <= now()

Then:
- publish
- update status
- set published_at

---

# Publishing Status Logic

## On Success

status = 'Published'
published_at = now()

## On Failure

status = 'Failed'
error_message = ...

Never fail silently.

---

# UI/UX Requirements

## Use Framer Motion For

- Page transitions
- Sidebar animations
- Card hover effects
- Empty states
- Loading states

## Styling Goals

Make the product feel like:
- AutoPost Hub
- Linear
- Vercel
- Modern SaaS

---

# Notifications

Replace ALL alert() with Sonner toasts.

---

# Loading States

Every async action must have:
- spinner
- disabled state
- loading label

---

# Security

## Secrets

Keep ONLY server-side:
- META_APP_SECRET
- OAuth token exchange

## Frontend

Never expose secrets.

---

# Testing Requirements

Verify:

- Login works
- Register works
- Logout works
- Protected routes work
- Upload works
- Drafts work
- Scheduling works
- Calendar works
- Published works
- OAuth works
- Dashboard counts work
- RLS isolation works

---

# Build Requirements

Verify:

npm run dev

and if possible:

npm run build

---

# Deliverables

## Required Output

- Updated code
- SQL migrations
- OAuth routes
- UI improvements
- Scheduler architecture
- Summary of changes
- Remaining manual Meta steps
- Test checklist
