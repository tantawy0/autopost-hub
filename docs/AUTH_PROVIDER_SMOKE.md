# Production Auth Provider Smoke

Last updated: 2026-06-04

## Purpose

This smoke verifies that production sign-in is wired end to end without exposing
secrets:

- `/auth` renders the copied SignIn UI.
- Signed-out protected routes redirect to `/auth?next=...`.
- `/auth/callback` handles provider errors safely.
- Google and GitHub buttons start Supabase OAuth and leave the app for the
  expected provider.
- Optional email/password login reaches the authenticated app shell.

## Smoke Command

Production:

```bash
SMOKE_BASE_URL=https://autopost-hub.vercel.app npm run smoke:auth
```

Local production server:

```bash
npm run build -- --webpack
npm run start -- --port 3137
SMOKE_BASE_URL=http://127.0.0.1:3137 npm run smoke:auth
```

Optional credential-backed email login:

```bash
SMOKE_EMAIL_LOGIN=1 SMOKE_BASE_URL=https://autopost-hub.vercel.app npm run smoke:auth
```

When `SMOKE_EMAIL_LOGIN=1`, the script reads `SMOKE_E2E_EMAIL` /
`SMOKE_E2E_PASSWORD` or `E2E_EMAIL` / `E2E_PASSWORD`. It never prints those
values.

## Supabase Dashboard Checklist

Open Supabase Dashboard -> Authentication.

### URL Configuration

Set Site URL:

```text
https://autopost-hub.vercel.app
```

Add Redirect URLs:

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

### Google Provider

Supabase:

- Enable Google provider.
- Paste Google OAuth Client ID.
- Paste Google OAuth Client Secret.

Google Cloud OAuth client:

- Application type: Web application.
- Authorized JavaScript origin:

```text
https://autopost-hub.vercel.app
```

- Authorized redirect URI:

```text
https://<your-supabase-project>.supabase.co/auth/v1/callback
```

If the Google OAuth app is in testing mode, add the test user emails under the
OAuth consent screen.

### GitHub Provider

Supabase:

- Enable GitHub provider.
- Paste GitHub OAuth Client ID.
- Paste GitHub OAuth Client Secret.

GitHub OAuth App:

- Homepage URL:

```text
https://autopost-hub.vercel.app
```

- Authorization callback URL:

```text
https://<your-supabase-project>.supabase.co/auth/v1/callback
```

### Security Settings

- Enable leaked-password protection.
- Keep email confirmation enabled unless intentionally disabled for a private
  staging environment.
- Confirm JWT expiry and refresh-token settings match the app's risk profile.
- Never put provider secrets in Vercel `NEXT_PUBLIC_*` variables.

## Pass Criteria

The smoke should report:

- `public health endpoint`: `ok: true`
- `protected route preserves auth next redirect`: `ok: true`
- `auth callback renders provider errors safely`: `ok: true`
- `google OAuth starts`: `ok: true`
- `github OAuth starts`: `ok: true`

If a provider check returns to `/auth/callback?error=...`, the Supabase provider
or upstream OAuth app configuration is still incomplete.

## Latest Smoke Notes

Local production smoke against the current build passed.

Production smoke against `https://autopost-hub.vercel.app` currently shows:

- Google OAuth starts.
- GitHub OAuth starts.
- Public health endpoint works.
- Protected route redirect and `/auth/callback` safe-error rendering need the
  latest auth callback build deployed.

After deploying the current branch, rerun:

```bash
SMOKE_BASE_URL=https://autopost-hub.vercel.app npm run smoke:auth
```
