# Auth and Billing Setup

Last updated: 2026-06-03

## What Is Implemented

- Email/password sign in and sign up.
- Google and GitHub buttons now call Supabase OAuth.
- Billing status API with a default Free plan.
- Stripe Checkout API for Creator, Pro, and Agency plans.
- Stripe Customer Portal API.
- Stripe webhook endpoint for subscription lifecycle updates.
- Billing checkout and portal routes require Owner/Admin workspace permission and are rate-limited.
- Workspace subscription tables with RLS select policies.
- Backend plan-limit enforcement for AI monthly requests, connected-channel OAuth starts, scheduled-post creation, and media uploads.
- Billing status usage reporting for channels, scheduled posts, AI requests, media storage, and team members.

## Supabase Google Login

1. Open Supabase Dashboard -> Authentication -> Providers -> Google.
2. Create a Google OAuth client in Google Cloud Console.
3. Add this authorized redirect URI in Google:

```text
https://<your-supabase-project>.supabase.co/auth/v1/callback
```

4. Paste Google Client ID and Client Secret into Supabase.
5. Enable the provider.

## Supabase GitHub Login

1. Open GitHub Developer Settings -> OAuth Apps -> New OAuth App.
2. Homepage URL:

```text
https://autopost-hub.vercel.app
```

3. Authorization callback URL:

```text
https://<your-supabase-project>.supabase.co/auth/v1/callback
```

4. Paste GitHub Client ID and Client Secret into Supabase Authentication -> Providers -> GitHub.
5. Enable the provider.

## Supabase Redirect URLs

Add these under Authentication -> URL Configuration:

```text
https://autopost-hub.vercel.app/auth/callback
https://autopost-hub.vercel.app/auth
http://localhost:3000/auth/callback
http://localhost:3000/auth
http://localhost:3003/auth/callback
http://localhost:3003/auth
http://127.0.0.1:3137/auth/callback
http://127.0.0.1:3137/auth
```

The app uses `/auth/callback` for Google/GitHub OAuth code exchange and `/auth`
for the sign-in form. Keep both allowed while local and production smoke tests
are in use.

## Stripe Setup

1. Create three recurring monthly Prices in Stripe:
   - Creator
   - Pro
   - Agency
2. Add the Price IDs to hosting env:

```text
STRIPE_PRICE_CREATOR=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_AGENCY=price_...
```

3. Add server-only Stripe keys:

```text
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

4. Configure webhook endpoint:

```text
https://autopost-hub.vercel.app/api/stripe/webhook
```

5. Subscribe the endpoint to:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
```

Checkout and Customer Portal actions are intentionally limited to workspace Owner/Admin roles. Editors, Analysts, and Viewers can see subscription status but cannot start checkout or manage billing.

## Free Plan Behavior

When Stripe is not configured, users can still create accounts and use the Free plan. Paid upgrade buttons remain visible but return setup-needed errors until Stripe keys and Price IDs are configured.

Plan limits are enforced server-side for AI requests, new channel OAuth connections, scheduled-post creation, and media uploads. Team-member hard enforcement should be added when invitation/member management is expanded for paid plans.
