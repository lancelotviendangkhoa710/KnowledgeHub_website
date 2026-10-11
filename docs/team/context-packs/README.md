# Context Packs

Use one pack per task. Paste the selected prompt after the filled task specification from `docs/team/TASK_TEMPLATE.md`.

Available packs: `foundation`, `identity-auth`, `content`, `learning`, `ai-companion`, `payment`.

Order:

1. Assign feature ID, owner, domain, branch, allowed paths.
2. Add approved API/schema decisions to task spec.
3. Paste the matching pack into the coding agent.
4. Agent must report scope before edits.
5. Run `./scripts/test-guardrails.ps1` before PR.

Packs do not approve architecture decisions. Missing auth, API, storage, AI, payment, or course-schema decisions require `STATUS: BLOCKED`.