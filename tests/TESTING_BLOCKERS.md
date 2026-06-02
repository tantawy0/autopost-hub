# Testing Blockers

- Browser E2E tests remain environment-gated because they need `E2E_RUN_BROWSER=1`, `E2E_EMAIL`, and `E2E_PASSWORD`.
- API E2E tests remain environment-gated because they need a running app via `E2E_BASE_URL` or `E2E_START_SERVER=1`.
- Provider-success publishing E2E still needs real Meta/TikTok sandbox credentials; unit coverage currently verifies terminal guards and failed-attempt transitions without external calls.
