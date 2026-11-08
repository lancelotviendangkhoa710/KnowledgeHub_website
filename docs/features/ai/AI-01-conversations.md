# AI-01 — Quản lý hội thoại

**Mức:** Kỹ  
**Owner:** UNASSIGNED — phải gán owner trước implementation  
**Commit dự kiến:** `ai: implement conversation management` (**chờ chọn branch-prefix convention**)

## Mục tiêu và ranh giới

Hội thoại thuộc một user. Laravel/PostgreSQL là platform hiện tại; AI service Python/FastAPI là service riêng trong kiến trúc dự kiến, chưa được triển khai. Contract giữa hai service, authentication nội bộ và nơi điều phối chưa có quyết định phê duyệt. Không giả định service boundary đã tồn tại.

## Luồng activity nghiệp vụ đề xuất để review

User mở danh sách hội thoại → auth → backend lọc đúng `user_id` → trả metadata được phép.

User tạo hội thoại → auth → tạo owner=current user → chỉ owner/Admin theo policy đã duyệt đọc/đổi/đóng hội thoại → dữ liệu riêng tư không xuất hiện trong listing/search của user khác. Xóa/đóng **chờ retention policy**; FK user delete hiện RESTRICT.

## Chờ duyệt

Conversation title/state, tạo tự động hay chủ động, archive/delete semantics, Admin access, pagination/retention/export, Laravel↔FastAPI contract, auth service-to-service, retry/correlation ID, log redaction, owner và API.

## Kiểm tra kỹ

- IDOR mọi CRUD/list/count; user A không đọc hội thoại/message của B.
- User soft-delete: FK RESTRICT; không hard-delete cascade để “sửa lỗi”.
- Concurrent create/update/archive và retry tạo trùng.
- Không đưa prompt/private content/credential vào log không được bảo vệ.
- AI service lỗi/time out: state hội thoại không bị dở; semantics retry chưa chốt.

## Gate/commit

- [ ] Gán owner, contract giữa service và retention/privacy được duyệt.
- [ ] Test tenant/owner isolation, FK, race/retry, redaction.
- [ ] Tests/diff đạt; thống nhất commit prefix trước khi tạo nhánh.
- [ ] Commit dự kiến, sau khi thống nhất: `ai: implement conversation management`.

## Implementation status (2026-11-08, V1 draft — chưa duyệt/merge)

- Đã implement backend V1: `Conversation` model, `ConversationPolicy`, `ConversationService`, `ConversationController`, FormRequests; routes `GET/POST /api/ai/conversations`, `GET/PATCH/DELETE /api/ai/conversations/{uuid}`.
- Owner-only; **Admin không đọc conversation của user khác** trong V1 (privacy gate). List phân trang 20, mới nhất trước; foreign/unknown → 404.
- Không migration (dùng bảng `conversations` sẵn có trong `2026_01_01_000007`).
- Tests: `backend/tests/Feature/AI/ConversationApiTest.php` (đã viết, **chưa chạy** — môi trường không có PHP runtime).
- Contract: `docs/API.md` §7 (AI Companion V1). Quyết định owner/retention vẫn là gate: `reviews/proposals/ADR-A|B|C` (NOT APPROVED).