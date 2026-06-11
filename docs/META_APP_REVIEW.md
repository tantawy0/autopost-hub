# Meta App Review Pack

Last updated: 2026-06-11

Sources:

- https://developers.facebook.com/docs/resp-plat-initiatives/appreview/
- https://developers.facebook.com/docs/resp-plat-initiatives/appreview/tutorial#common-mistakes%2F

## Meta Review Rules To Follow

- Submit only when the production app is accessible and the reviewed flows are complete.
- Request only permissions/features that are already implemented and currently used.
- Record screen video for every requested permission/feature. Missing permission evidence means that permission will not be approved.
- Make at least one successful API call for each requested advanced permission within 30 days before submission.
- Give reviewers working access instructions for the production site, the reviewer account, and the exact test assets.
- Do not use or provide fake Facebook accounts. Use a real dedicated test user or Meta-approved reviewer/test asset.
- Keep the app in Development mode until App Review is complete. Switching to Live too early can block even app-role users from unapproved permissions.
- App Review now includes data-access-renewal style checks: allowed usage, data handling, data protection, and reviewer instructions.
- Privacy Policy, Terms, app icon, app category, app purpose, contact email, data deletion instructions, and callback URLs must be configured before submission.

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

Facebook Login OAuth redirect URI:
https://autopost-hub.vercel.app/api/meta/callback

Instagram Login OAuth redirect URI:
https://autopost-hub.vercel.app/api/instagram/callback

Instagram Webhook callback URL:
https://autopost-hub.vercel.app/api/instagram/webhook

Instagram Deauthorize callback URL:
https://autopost-hub.vercel.app/api/instagram/deauthorize

Instagram Data Deletion callback URL:
https://autopost-hub.vercel.app/api/instagram/data-deletion
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
| `instagram_business_basic` | Standalone Instagram Login can identify the connected professional Instagram account. | `/channels`, `/api/instagram/login`, `/api/instagram/callback`. |
| `instagram_business_content_publish` | Standalone Instagram Login can publish user-created/scheduled media posts where Meta grants this flow. | `/create`, `/queue`, Instagram publishing provider. |

Do not request permissions that are not currently implemented.

## Reviewer Test Account Requirements

Provide Meta review with a real dedicated test user that can:

- Sign in to AutoPost Hub.
- Access a workspace as Owner/Admin.
- Connect a Facebook Page the tester is allowed to manage.
- Use a Facebook Page linked to an Instagram Business or Creator account.
- Connect a standalone Instagram Business/Creator account if requesting Instagram Login permissions.
- Upload a small safe image.
- Schedule or publish a clearly marked test post.

Use a dedicated test Page and test Instagram Business/Creator account. Do not
submit a personal production Page as the only review asset. Do not create or
submit fake Facebook accounts.

## Screencast Script

Record a 2-4 minute 1080p screen capture that shows:

1. Sign in at `https://autopost-hub.vercel.app/auth`.
2. Open `Channels`.
3. Click connect/reconnect for Facebook Pages.
4. Complete Meta OAuth with the reviewer/test user and grant Page permissions.
5. Show discovered Facebook Page in `Channels`.
6. If Instagram is linked, show discovered Instagram Business/Creator account.
7. If requesting standalone Instagram Login permissions, click Instagram connect, show the Instagram OAuth screen, and return to AutoPost Hub.
8. Open `Create`.
9. Select the connected channel.
10. Add a caption and small image.
11. Schedule or publish the test post to the dedicated test asset only.
12. Open `Queue` or `Published` to show lifecycle/status.
13. Open `Privacy`, `Terms`, and `Data Deletion Instructions`.

Keep the video focused on the exact permission use. Avoid showing secrets,
private dashboards, or unrelated admin panels.

Recording requirements:

- Prefer English UI labels and English reviewer notes.
- Record only the app window or a full-screen browser window.
- Use 1080p or better, reduce monitor width to 1440px or less, enlarge the cursor, and use mouse clicks instead of keyboard shortcuts where possible.
- Add visual annotations/tooltips if a button or step is not obvious.
- Do not include audio; Meta reviewers do not rely on it.

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
POST https://autopost-hub.vercel.app/api/instagram/data-deletion
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
- Instagram Business/Creator appears when linked to the Page or connected through Instagram Login.
- The screencast demonstrates every requested permission in this submission.
- Every requested permission has had at least one successful API call in the last 30 days.
- Test publishing does not target personal/live customer accounts.
