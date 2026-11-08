# AI-03 — Memory người dùng

**Mức:** Kỹ — dữ liệu nhạy cảm, retention và user control bắt buộc review  
**Owner:** UNASSIGNED  
**Commit dự kiến:** `ai: implement user memory management` (**prefix chờ duyệt**)

## Luồng activity cần thiết kế

AI/session phát hiện memory candidate → policy xử lý dữ liệu quyết định được giữ gì → gắn owner user và source message nếu có → user có thể xem/chỉnh/xóa/export theo chính sách đã duyệt → AI chỉ nạp memory của đúng user và trong phạm vi mục đích được cho phép. Schema `user_memories` tách khỏi conversation history; FK source message có thể SET NULL. Cơ chế extraction/vectorization chưa xác định.

## Chờ bạn duyệt

Loại dữ liệu được lưu, consent/opt-out, extraction và xác minh, visibility/edit/delete/export, retention/expiry, nhạy cảm/PII, human review (không tự thêm quy trình), source attribution, prompt injection, RAG/vector, mã hóa, backup/deletion semantics, AI provider và owner.

## Kiểm tra kỹ

- Memory A không bao giờ được truy vấn trong context user B; test cross-user cả service lẫn DB access.
- Memory sai/độc hại/đã lỗi thời không được coi là fact đã xác minh; nguồn message bị xóa vẫn xử lý đúng SET NULL.
- User opt-out/delete/soft-delete: kiểm tra mọi cache, index/vector, backup, log và derived memory theo retention đã duyệt.
- Không lưu password, payment secrets, API keys; hạn chế/minimize PII.
- User có thể kiểm tra và kiểm soát đúng phạm vi dữ liệu theo quyết định; UI hide không phải deletion.
- Race giữa xóa memory và generation/retrieval; dữ liệu không tái xuất sau xóa theo semantics đã duyệt.

## Gate/commit

- [ ] Privacy/data lifecycle/consent/accessibility được sản phẩm duyệt.
- [ ] Owner/service boundary được chỉ định; không triển khai vector/RAG chưa duyệt.
- [ ] Test isolation, erase, source link, cache/index/derived-data theo policy.
- [ ] Tests/diff đạt; prefix được thống nhất.
- [ ] Commit dự kiến: `ai: implement user memory management`.

## Implementation status (2026-11-08, V1 draft — chưa duyệt/merge)

- Đã implement backend V1 explicit-only: `UserMemory` model, `UserMemoryPolicy`, `UserMemoryService`, `UserMemoryController`, FormRequests; routes `GET/POST /api/ai/memories`, `PATCH/DELETE /api/ai/memories/{uuid}`.
- `memory_type` chỉ `preference|fact|goal`; **`instruction` bị từ chối 422** (chống stored prompt injection). Delete = tombstone `status='deleted'` (row giữ lại), list/`activeForPrompt` loại trừ.
- `activeForPrompt(User, limit=10)` chỉ trả content strings của đúng user, active + chưa hết hạn; không ids/source/system.
- Không migration (dùng bảng `user_memories` sẵn có). Tests: `backend/tests/Feature/AI/UserMemoryApiTest.php` (đã viết, **chưa chạy** — không có PHP).
- Contract: `docs/API.md` §7. Consent/retention/DSR vẫn là gate Product/Privacy (`ADR-C` NOT APPROVED).