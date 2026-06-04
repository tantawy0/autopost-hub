# Testing Blockers

- Browser E2E is now locally activatable with `npm run setup:e2e` followed by `npm run test:e2e`.
- API E2E is now locally activatable with `E2E_START_SERVER=1` or an explicit `E2E_BASE_URL`.
- Provider-success publishing E2E still needs real Meta/TikTok sandbox credentials; unit coverage currently verifies terminal guards and failed-attempt transitions without external calls.
