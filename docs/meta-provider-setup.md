# Meta Provider Setup

AutoPost Hub publishes live content only to eligible Facebook Pages and Instagram
Business accounts for this release. TikTok remains a visible placeholder.

## Required Meta Dashboard Settings

1. Create or open a Meta app with Facebook Login enabled.
2. In **Facebook Login > Settings**, turn on **Client OAuth Login** and
   **Web OAuth Login**.
3. Add the exact environment-specific OAuth redirect URI to **Valid OAuth Redirect URIs**:

   ```text
   http://localhost:3003/api/meta/callback
   https://autopost-hub.vercel.app/api/meta/callback
   ```

4. In the app's Basic settings, add `autopost-hub.vercel.app` to App Domains and
   use `https://autopost-hub.vercel.app/privacy`,
   `https://autopost-hub.vercel.app/terms`, and
   `https://autopost-hub.vercel.app/data-deletion` for the public policy links.
5. Configure **User Data Deletion** with:

   ```text
   https://autopost-hub.vercel.app/api/meta/data-deletion
   ```

6. In the Instagram product settings, configure:

   ```text
   OAuth redirect URI:
   https://autopost-hub.vercel.app/api/instagram/callback

   Webhook callback URL:
   https://autopost-hub.vercel.app/api/instagram/webhook

   Deauthorize callback URL:
   https://autopost-hub.vercel.app/api/instagram/deauthorize

   Data deletion callback URL:
   https://autopost-hub.vercel.app/api/instagram/data-deletion
   ```

7. Configure the app with real dedicated test users that own or manage eligible Facebook Pages.
8. Confirm the test Pages are linked to Instagram Business accounts when testing
   Instagram publishing.
9. Request or enable only the permissions currently implemented and shown in the review screencast:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `instagram_basic`
   - `instagram_content_publish`
   - `instagram_business_basic`
   - `instagram_business_content_publish`

If Meta shows **URL Blocked**, the redirect URI above is missing or not an exact
match. If Meta shows **Invalid Scopes**, the app is missing the Facebook
Login/Pages/Instagram use cases or those permissions have not been enabled for
the app/tester yet. While the app is in development mode, only app admins,
developers, or testers can grant unreviewed permissions; public users require
Advanced Access/App Review.

Before App Review, make at least one successful API call for every requested
advanced permission within the last 30 days, and record a 1080p screencast that
shows a user granting and using each requested permission. Do not use fake
Facebook accounts in reviewer instructions.

## Required Environment Variables

```bash
META_APP_ID=...
META_APP_SECRET=...
META_REDIRECT_URI=http://localhost:3003/api/meta/callback
META_GRAPH_VERSION=v25.0
META_SCOPES=pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish
NEXT_PUBLIC_APP_URL=http://localhost:3003
CRON_SECRET=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Provider secrets must stay server-side and must not be exposed in browser code,
query strings, screenshots, or user-visible error messages.

## Built-In Diagnostics

Authenticated operators can call `GET /api/meta/diagnostics` with a Supabase bearer token
to verify non-secret setup state:

- configured redirect URI vs. the current app callback URL
- required publishing scopes vs. `META_SCOPES`
- connected Facebook/Instagram destination readiness
- whether connected Facebook Pages appear to have linked Instagram Business/Creator accounts

Use `GET /api/meta/diagnostics?live=1` only during staging smoke tests. It checks the
current Meta Graph connection for linked Instagram accounts using stored encrypted Page
tokens, and returns only safe booleans/counts.

## App Review Pack

Use `docs/META_APP_REVIEW.md` as the submission checklist for permission
justifications, screencast script, policy URLs, data deletion callback behavior,
and manual reviewer test account requirements.
