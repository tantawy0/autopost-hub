# ECC Project Pack

This folder contains a curated, project-local import from
`https://github.com/affaan-m/ECC`.

Imported source:
- Repository: `affaan-m/ECC`
- Commit inspected: `0f84c0e2`
- Integration date: 2026-06-03
- License: MIT, per the upstream ECC repository

## Why This Is Curated

ECC is a large cross-harness agent system with installers, MCP configs, hooks,
commands, and hundreds of skills. AutoPost Hub does not need the full global
installer inside the application repo. The imported subset is intentionally
limited to production workflows that match this project:

- backend architecture and route/service boundaries
- API design and response consistency
- safe database migration practice
- security review for auth, uploads, payments, and provider integrations
- Playwright E2E testing patterns
- frontend React/Next.js implementation patterns
- billing and finance operations guidance

Do not run the upstream ECC installer from this app repo unless a maintainer
explicitly chooses to update global Codex/Claude/Cursor harness settings.

## Imported Skills

- `skills/backend-patterns.md`
- `skills/api-design.md`
- `skills/database-migrations.md`
- `skills/security-review.md`
- `skills/e2e-testing.md`
- `skills/frontend-patterns.md`
- `skills/customer-billing-ops.md`
- `skills/finance-billing-ops.md`

## Update Process

1. Refresh the external checkout:
   `git -C "R:\my workspace\AutoPost Hub - 1\external\ECC" pull --ff-only`
2. Re-copy only the selected `SKILL.md` files into `.codex/ecc/skills/`.
3. Review diffs before committing.
4. Run `npm test`, `npm run lint`, and `npm run build -- --webpack`.
