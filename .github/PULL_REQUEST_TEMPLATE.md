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

## Nếu PR có đổi giao diện

- Màn hình liên quan: (tên màn hoặc id `#s-...` trong mockup)
- Ảnh màn hình: (trước và sau, sáng và tối)
- [ ] Đã đối chiếu với mockup, chỗ khác mockup đã nêu lý do bên dưới
- [ ] Chạy đúng ở 1360px và 390px, sáng và tối, không tràn ngang
- [ ] Không mã màu hex hoặc rgb, không style nội tuyến cho màu và khoảng cách
- [ ] Không còn chữ tiếng Anh hiển thị cho người dùng
- [ ] Dùng lại thành phần có sẵn
- Chỗ khác mockup: (nêu lý do, hoặc "không có")

## Blockers / Follow-ups

`None`
