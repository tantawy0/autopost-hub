# Meta App Review Submission Text

Use this as copy/paste source in the Meta dashboard. Adjust only the reviewer
test account details and screencast link.

## App Summary

AutoPost Hub is an AI social media scheduling workspace for creators and small
teams. Users connect their own Facebook Pages and Instagram Business/Creator
accounts, create or upload content, schedule posts, and publish only to channels
they explicitly select. The product stores provider tokens encrypted on the
server, shows publishing status, supports reconnect warnings, and lets users
disconnect channels or request data deletion.

## Reviewer Instructions

1. Go to `https://autopost-hub.vercel.app/auth`.
2. Sign in with the reviewer test account provided in the App Review notes.
3. Open `Channels`.
4. Click connect/reconnect for Facebook or Instagram.
5. Complete Meta OAuth with a user that manages the test Facebook Page.
6. Confirm AutoPost Hub displays the connected Facebook Page.
7. If the Page has a linked Instagram Business/Creator account, confirm AutoPost
   Hub displays the Instagram account.
8. Open `Create`, select the connected channel, add a short caption and a safe
   image, then schedule or publish the test post.
9. Open `Queue` or `Published` to verify publishing lifecycle status.
10. Open `https://autopost-hub.vercel.app/data-deletion` to review deletion
    instructions.

## pages_show_list

AutoPost Hub needs `pages_show_list` so a signed-in user can view and select the
Facebook Pages they are authorized to manage. The app uses this permission after
Meta OAuth to discover eligible Pages, show them on the `Channels` page, and let
the user choose where scheduled posts should publish. AutoPost Hub does not show
Pages from users who are not signed in and does not publish without explicit
user selection.

## pages_read_engagement

AutoPost Hub needs `pages_read_engagement` to read connected Page metadata and
support diagnostics, publishing readiness checks, and analytics foundations for
the user's own connected Pages. This helps the product explain whether a Page is
ready for publishing, whether it has a linked Instagram account, and whether the
connection needs re-authentication. The data is used only inside the user's
workspace.

## pages_manage_posts

AutoPost Hub needs `pages_manage_posts` to publish posts that the user creates,
schedules, or explicitly sends to a Facebook Page they manage. The user writes
the caption, selects the Page, uploads media when applicable, and chooses
schedule or publish. The app records destination-level publishing attempts and
shows success/failure status. AutoPost Hub does not post to Pages the user has
not connected.

## instagram_basic

AutoPost Hub needs `instagram_basic` to discover Instagram Business/Creator
accounts linked to the user's Facebook Pages and show those eligible accounts in
the `Channels` page. This permission is required to identify which Instagram
account can be used for publishing through Meta. If no eligible Instagram
Business/Creator account is linked to a Page, the app shows a clear setup error
instead of pretending publishing is available.

## instagram_content_publish

AutoPost Hub needs `instagram_content_publish` to publish user-created and
scheduled media posts to the user's connected Instagram Business/Creator account.
The user selects the Instagram account, provides the caption/media, and chooses
schedule or publish. The app validates media before publishing and records
publishing outcomes. AutoPost Hub does not publish Instagram content without the
user creating or scheduling that content.

## Data Deletion

User instructions:

```text
https://autopost-hub.vercel.app/data-deletion
```

Callback:

```text
https://autopost-hub.vercel.app/api/meta/data-deletion
```

When Meta sends a signed data deletion request, AutoPost Hub verifies the signed
request with the Meta app secret, hashes the Meta user id, disconnects matching
Facebook/Instagram connected accounts, clears stored provider tokens, removes
imported Meta social data, records a confirmation code, and returns a status URL.

## Screencast Notes

The screencast should show only:

- Login.
- Channels connection.
- Meta OAuth consent.
- Connected Facebook Page/Instagram account appearing.
- Creating a test post.
- Scheduling or publishing the test post.
- Queue/Published status.
- Data deletion page.

Do not show `.env.local`, Meta app secret, Supabase service role key, API keys,
billing dashboards, or private user data.
