<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read
`specs/001-social-saas-transformation/plan.md`.
<!-- SPECKIT END -->

<!-- ECC PROJECT PACK START -->
## ECC Workflow Pack

This repo uses a curated, project-local ECC pack in `.codex/ecc/`.
Before backend, security, billing, migration, E2E, or frontend implementation
passes, consult the matching imported ECC skill as a checklist:

- Backend and service boundaries: `.codex/ecc/skills/backend-patterns.md`
- API contracts and response behavior: `.codex/ecc/skills/api-design.md`
- Supabase/schema migrations: `.codex/ecc/skills/database-migrations.md`
- Auth, OAuth, uploads, provider tokens, and payments: `.codex/ecc/skills/security-review.md`
- Playwright route and interaction QA: `.codex/ecc/skills/e2e-testing.md`
- React/Next.js UI changes: `.codex/ecc/skills/frontend-patterns.md`
- Billing/customer plan operations: `.codex/ecc/skills/customer-billing-ops.md`
  and `.codex/ecc/skills/finance-billing-ops.md`

Project-specific rules in `BACKEND_ARCHITECTURE.md`, `PROJECT_MAP.md`, and
`IMPLEMENTATION_STATUS.md` remain the source of truth when they are stricter
than the generic ECC guidance. Do not run the upstream ECC installer or add
global MCP/harness settings without an explicit setup request.
<!-- ECC PROJECT PACK END -->
