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

## Mô tả

(làm gì, vì sao)

## Màn hình liên quan

(tên màn trong mockup, liên kết hoặc id `#s-...`)

## Ảnh màn hình

(trước và sau, sáng và tối nếu có đổi giao diện)

## Danh sách kiểm tra

- [ ] Đã đối chiếu với mockup
- [ ] Chạy đúng ở 1360px và 390px, sáng và tối, không tràn ngang
- [ ] Không màu hex hoặc rgb, không style nội tuyến cho màu và khoảng cách
- [ ] Không còn chữ tiếng Anh hiển thị cho người dùng
- [ ] Dùng lại thành phần có sẵn (Select, ConfirmDialog, Pagination...)
- [ ] Lint, typecheck, build đều qua

## Chỗ khác mockup

(nêu lý do, hoặc ghi "không có")

## File dùng chung bị sửa

(globals.css, components/ui, SiteHeader... hoặc ghi "không có")

## Chưa kiểm tra

(nêu rõ, hoặc ghi "không có")
