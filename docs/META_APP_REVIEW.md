# Meta App Review Pack

Last updated: 2026-06-04

## Current Product State

AutoPost Hub can connect Meta accounts, discover Facebook Pages and linked
Instagram Business/Creator accounts, store encrypted Page tokens, schedule posts,
publish Facebook Page posts, publish Instagram Business media posts, and show
clear reconnect/publishing errors.

Production URL:

```text
https://autopost-hub.vercel.app
```

## Meta Dashboard URLs

Use these values in the Meta app dashboard:

```text
App domain:
autopost-hub.vercel.app

Privacy policy URL:
https://autopost-hub.vercel.app/privacy

Terms URL:
https://autopost-hub.vercel.app/terms

User data deletion instructions URL:
https://autopost-hub.vercel.app/data-deletion

User data deletion callback URL:
https://autopost-hub.vercel.app/api/meta/data-deletion

Valid OAuth redirect URI:
https://autopost-hub.vercel.app/api/meta/callback
```

Local development redirect:

```text
http://localhost:3003/api/meta/callback
```

## Permissions To Request

| Permission | Why AutoPost Hub Needs It | In-App Evidence |
| --- | --- | --- |
| `pages_show_list` | Let the user choose Facebook Pages they manage. | `/channels`, Meta OAuth callback destination discovery. |
| `pages_read_engagement` | Read Page metadata and future analytics/diagnostics for connected Pages. | `/channels`, `/analytics`, `/api/meta/diagnostics`. |
| `pages_manage_posts` | Publish scheduled or immediate Facebook Page posts the user creates. | `/create`, `/queue`, `/api/scheduler/process-due-posts`, `/api/worker/process`. |
| `instagram_basic` | Discover linked Instagram Business/Creator accounts from selected Pages. | `/channels`, Instagram diagnostics. |
| `instagram_content_publish` | Publish scheduled or immediate Instagram Business media posts the user creates. | `/create`, `/queue`, Instagram publishing provider. |

Do not request permissions that are not currently implemented.

## Reviewer Test Account Requirements

Provide Meta review with a test user that can:

- Sign in to AutoPost Hub.
- Access a workspace as Owner/Admin.
- Connect a Facebook Page the tester is allowed to manage.
- Use a Facebook Page linked to an Instagram Business or Creator account.
- Upload a small safe image.
- Schedule or publish a clearly marked test post.

Use a dedicated test Page and test Instagram Business/Creator account. Do not
submit a personal production Page as the only review asset.

## Screencast Script

Record a short screen capture that shows:

1. Sign in at `https://autopost-hub.vercel.app/auth`.
2. Open `Channels`.
3. Click connect/reconnect for Facebook.
4. Complete Meta OAuth with the reviewer/test user.
5. Show discovered Facebook Page in `Channels`.
6. If Instagram is linked, show discovered Instagram Business/Creator account.
7. Open `Create`.
8. Select the connected channel.
9. Add a caption and small image.
10. Schedule or publish the test post.
11. Open `Queue` or `Published` to show lifecycle/status.
12. Open `Data Deletion Instructions` and mention the callback URL is configured.

Keep the video focused on the exact permission use. Avoid showing secrets,
private dashboards, or unrelated admin panels.

## Business Verification Reality

Meta may require Business Verification and Advanced Access before real public
users can grant publishing permissions. If verification documents are not
available yet, keep the app limited to admins/developers/testers while preparing:

- Business details and website/domain proof.
- Privacy policy, terms, and data deletion URLs.
- App icon and product description.
- Test Page/Instagram assets.
- Screencast showing each requested permission.

Without Advanced Access/App Review, real users outside app roles may not be able
to connect Pages or Instagram accounts, even if AutoPost Hub code is ready.

## Data Deletion Callback Behavior

Endpoint:

```text
POST https://autopost-hub.vercel.app/api/meta/data-deletion
```

The callback accepts Meta `signed_request`, verifies it with `META_APP_SECRET`,
hashes the app-scoped Meta user id, finds matching connected Meta accounts,
clears stored provider tokens, marks matching accounts as revoked/reconnect
required, removes imported Meta social data, records a confirmation code, and
returns:

```json
{
  "url": "https://autopost-hub.vercel.app/data-deletion/status?code=...",
  "confirmation_code": "..."
}
```

Status page:

```text
https://autopost-hub.vercel.app/data-deletion/status?code=<confirmation_code>
```

## Pre-Submission Checks

Run:

```bash
npm test
npm run lint
npm run build -- --webpack
SMOKE_BASE_URL=https://autopost-hub.vercel.app npm run smoke:auth
SMOKE_BASE_URL=https://autopost-hub.vercel.app npm run smoke:cron
```

Then manually verify:

- Full Google/GitHub login consent if those providers are public.
- Full Meta OAuth consent with a test user.
- Facebook Page appears after callback.
- Instagram Business/Creator appears only when linked to the Page.
- Test publishing does not target personal/live customer accounts.
