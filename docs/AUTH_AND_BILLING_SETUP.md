# Auth and Billing Setup

Last updated: 2026-06-03

## What Is Implemented

- Email/password sign in and sign up.
- Google and GitHub buttons now call Supabase OAuth.
- Billing status API with a default Free plan.
- Stripe Checkout API for Creator, Pro, and Agency plans.
- Stripe Customer Portal API.
- Stripe webhook endpoint for subscription lifecycle updates.
- Workspace subscription tables with RLS select policies.

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
https://autopost-hub.vercel.app/auth
http://localhost:3000/auth
http://localhost:3003/auth
```

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

## Free Plan Behavior

When Stripe is not configured, users can still create accounts and use the Free plan. Paid upgrade buttons remain visible but return setup-needed errors until Stripe keys and Price IDs are configured.
