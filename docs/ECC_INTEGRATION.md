# ECC Integration

AutoPost Hub now has a curated project-local ECC pack under `.codex/ecc/`.
ECC is not a frontend/backend dependency for the app; it is a workflow and
agent-guidance system used to make future implementation passes safer and more
consistent.

## Source

- Upstream repo: `https://github.com/affaan-m/ECC`
- Local checkout: `R:\my workspace\AutoPost Hub - 1\external\ECC`
- Imported commit: `0f84c0e2`
- Imported files live in: `.codex/ecc/skills/`

## How AutoPost Hub Uses It

Use the imported ECC skills as checklists before and during implementation:

- Backend/API work: `.codex/ecc/skills/backend-patterns.md` and `api-design.md`
- Supabase migrations: `.codex/ecc/skills/database-migrations.md`
- Auth, OAuth, payments, uploads, provider tokens: `.codex/ecc/skills/security-review.md`
- Route/browser QA: `.codex/ecc/skills/e2e-testing.md`
- React/Next UI changes: `.codex/ecc/skills/frontend-patterns.md`
- Plans, Stripe, customer access: `.codex/ecc/skills/customer-billing-ops.md`
  and `finance-billing-ops.md`

## Guardrails

- Do not run the upstream ECC installer inside this repo by default.
- Do not copy the full ECC repository into AutoPost Hub.
- Do not add ECC MCP configs or global harness settings without an explicit
  setup pass.
- Keep the app's existing architecture rules in `BACKEND_ARCHITECTURE.md` as
  the source of truth when they are stricter than ECC's generic guidance.
- Always run `npm test`, `npm run lint`, and `npm run build -- --webpack`
  after code changes.

## Next Useful Slice

Use the ECC security, backend, and billing skills together for the next
production slice: Stripe checkout/webhook configuration, plan enforcement, and
customer billing portal verification.
