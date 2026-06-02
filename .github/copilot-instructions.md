<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read:
- `specs/001-social-saas-transformation/plan.md` (implementation plan)
- `.specify/memory/constitution.md` (project governance)
<!-- SPECKIT END -->

# Custom Commands

## /specify.constitution

Update or review the AutoPost Hub project constitution at `.specify/memory/constitution.md`.

**What it does**:
1. Loads the existing constitution template
2. Collects user input for principles and governance rules  
3. Validates all placeholder tokens are replaced
4. Propagates changes to dependent templates (plan, spec, tasks)
5. Generates a sync impact report
6. Updates affected documentation

**Prerequisites**: Git must be initialized and the repository must have an active branch.
