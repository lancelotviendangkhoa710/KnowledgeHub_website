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