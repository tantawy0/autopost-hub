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
5. Configure the app with test users that own or manage eligible Facebook Pages.
6. Confirm the test Pages are linked to Instagram Business accounts when testing
   Instagram publishing.
7. Request or enable these permissions for testers:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `instagram_basic`
   - `instagram_content_publish`

If Meta shows **URL Blocked**, the redirect URI above is missing or not an exact
match. If Meta shows **Invalid Scopes**, the app is missing the Facebook
Login/Pages/Instagram use cases or those permissions have not been enabled for
the app/tester yet. While the app is in development mode, only app admins,
developers, or testers can grant unreviewed permissions; public users require
Advanced Access/App Review.

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
