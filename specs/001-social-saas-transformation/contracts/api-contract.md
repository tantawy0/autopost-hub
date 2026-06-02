# API Contract: Social Publishing SaaS Transformation

## Principles

- All route handlers that mutate user-owned data must authenticate the caller and
  verify ownership of the target records.
- Provider secrets and tokens must never be returned to browser clients.
- Responses must be safe DTOs: only fields required by the UI are returned.
- Error responses must include a user-safe `message` and optional stable `code`.

## GET /api/meta/login

Starts provider authorization.

**Query Parameters**
- `platform`: `facebook` or `instagram`
- `returnTo`: optional app path to return to after connection

**Success**
- `302` redirect to provider authorization URL

**Failure**
- `400` for unsupported platform
- `401` for unauthenticated user
- `500` for provider configuration error

**Security**
- Must generate and persist a state value tied to the authenticated user.
- Must not expose provider secret in URL or response body.

## GET /api/meta/callback

Handles provider authorization callback, exchanges code server-side, stores
eligible Facebook Page and Instagram Business account destinations, and returns
the user to Channels.

**Query Parameters**
- `code`: provider authorization code
- `state`: state value created by `/api/meta/login`
- `error`: optional provider error

**Success**
- `302` redirect to `/channels?connected=meta`

**Failure**
- `302` redirect to `/channels?error=<safe-code>`
- No provider token or raw provider error details in query string

**Stored Outcome**
- One or more Connected Account records for eligible destinations
- Expired/revoked/unauthorized destinations marked with reconnect requirement

## POST /api/scheduler/process-due-posts

Processes due scheduled posts. Intended for Vercel Cron, manual admin smoke
tests, or future external schedulers.

**Headers**
- `Authorization: Bearer <CRON_SECRET>` or equivalent secret header

**Request Body**
```json
{
  "limit": 25,
  "dryRun": false
}
```

**Success Response**
```json
{
  "processed": 3,
  "published": 1,
  "partiallyPublished": 1,
  "failed": 1,
  "skipped": 0
}
```

**Failure**
- `401` when scheduler secret is missing or invalid
- `429` when processing limit is exceeded
- `500` for unexpected processing failure with safe message

**Behavior**
- Select only `Scheduled` posts with `scheduled_for <= now`.
- Skip terminal posts.
- Create or update per-destination Publishing Attempts.
- Set overall post status after destination attempts complete.

## POST /api/posts/{postId}/publish-now

Publishes a user-owned scheduled or draft post immediately after validation.

**Path Parameters**
- `postId`: post UUID

**Request Body**
```json
{
  "destinationAccountIds": ["uuid"],
  "validateOnly": false
}
```

**Success Response**
```json
{
  "postId": "uuid",
  "status": "Published",
  "attempts": [
    {
      "destinationAccountId": "uuid",
      "platform": "Facebook",
      "status": "Succeeded",
      "message": "Published"
    }
  ]
}
```

**Failure**
- `400` for unsupported media/destination combination
- `401` for unauthenticated user
- `403` when post or destination is not owned by the user
- `409` when account is expired/revoked/unauthorized or post is terminal

## POST /api/channels/{connectedAccountId}/disconnect

Disconnects a user-owned connected account and removes it from selectable
destinations.

**Path Parameters**
- `connectedAccountId`: connected account UUID

**Success Response**
```json
{
  "connectedAccountId": "uuid",
  "status": "Disconnected"
}
```

**Failure**
- `401` for unauthenticated user
- `403` for account not owned by user
- `404` for unknown account

**Behavior**
- Existing scheduled posts that reference the account must show the missing
  destination state and require user action before publishing.

## Client Data Contracts

### Dashboard Summary DTO

```json
{
  "counts": {
    "totalPosts": 12,
    "draftPosts": 2,
    "scheduledPosts": 6,
    "publishedPosts": 3,
    "partiallyPublishedPosts": 1,
    "failedPosts": 0,
    "connectedChannels": 2
  },
  "scheduledQueue": [],
  "recentPublished": [],
  "connectedChannels": []
}
```

### Connected Destination DTO

```json
{
  "id": "uuid",
  "platform": "Instagram",
  "accountName": "Brand IG",
  "status": "Connected",
  "reconnectRequired": false,
  "publishCapable": true
}
```

### Post Card DTO

```json
{
  "id": "uuid",
  "caption": "string",
  "firstComment": "string",
  "media": [],
  "platforms": ["Facebook", "Instagram"],
  "status": "Scheduled",
  "scheduledFor": "2026-05-22T12:00:00.000Z",
  "publishedAt": null,
  "failureSummary": null
}
```
