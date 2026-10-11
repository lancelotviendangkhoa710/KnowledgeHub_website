## Task

- ID:
- Owner/domain:
- Branch:

## Scope

- [ ] One coherent task only.
- [ ] Every changed file is authorized by the task specification.
- [ ] No protected/shared file changed without explicit coordination.
- [ ] No architecture or dependency change.

## API / Database

- API: `<none | METHOD path; docs/API.md updated>`
- Database: `<none | new migration path; docs updated after approval>`
- Shared files: `<none | path and reason>`

## Authorization

| Actor | Expected result |
|---|---|
| Guest | |
| User | |
| Contributor | |
| Admin | |

## Validation

- [ ] Feature tests: `<command + result>`
- [ ] `./scripts/test-guardrails.ps1`: pass
- [ ] `git diff --check`: pass
- [ ] No `.env`, credentials, debug code, or edited existing migration.

## Blockers / Follow-ups

`None`