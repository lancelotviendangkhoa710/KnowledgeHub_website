# AI-02 — Lịch sử tin nhắn

**Mức:** Kỹ; dữ liệu riêng tư và tính nhất quán cao  
**Owner:** UNASSIGNED  
**Commit dự kiến:** `ai: implement message history` (**prefix chờ duyệt**)

## Luồng activity

User yêu cầu history → backend xác thực → xác minh quyền hội thoại thuộc user → query `messages` theo conversation, thứ tự và pagination ổn định → không trả message thuộc hội thoại khác → trả history đã được lọc/redact theo policy được duyệt. Tin nhắn mới từ companion có thể cần nhiều bước: persist user message → gọi AI service → persist assistant reply; thứ tự và trạng thái lỗi chưa được chốt.

## Chờ duyệt

Vai trò `user`/`assistant`/system/tool, schema payload, token/size limits, ordering, pagination, edit/delete, stream/async, retry/idempotency, partial-failure state, retention/export, prompt-injection handling, nội dung log và Laravel↔AI contract.

## Kiểm tra kỹ

- IDOR conversation ID; pagination/count/snippet không làm lộ nội dung riêng tư.
- Message mồ côi/soft-delete và FK cascade khi xóa conversation theo migration.
- Race giữa nhiều lượt message; thứ tự ổn định, retry không tạo response duplicate ngoài ý muốn.
- User message ghi được nhưng AI timeout: biểu diễn pending/failed/retry phải theo state machine được duyệt.
- Không trả internal system prompt, provider metadata, API keys hay dữ liệu user khác.
- Nội dung độc hại/PII trong input và log: privacy policy chưa được định nghĩa.

## Gate/commit

- [ ] Owner, message state machine, retention, service contract được duyệt.
- [ ] Tests isolation, ordering/pagination, duplicate/retry, partial failure, redaction.
- [ ] Không ghi dở/duplicate không kiểm soát; diff/tests đạt.
- [ ] Sau khi thống nhất prefix: `ai: implement message history`.

## Implementation status (2026-11-08, V1 draft — chưa duyệt/merge)

- Đã implement backend V1: `Message` model, `MessageService`, `AIChatService`, `MessageController`, `SendMessageRequest`; routes `GET/POST /api/ai/conversations/{uuid}/messages`; FastAPI `POST /v1/chat`.
- History: cursor `before_id` trên `(created_at,id)`, limit 1–100 (default 30), trả oldest-first + `meta {has_more,next_before_id}`.
- Send: sync, **đã được duyệt bật ngày 2026-11-08**; `services.ai.chat_enabled` default **true** (set `AI_CHAT_ENABLED=false` để tắt). Gọi AI trước, chỉ persist user+assistant trong một transaction khi thành công (không partial rows); context ≤19 message + memory active ≤10; idempotency best-effort bằng `client_message_id` (chưa có unique constraint — cần M1).
- Rate limit 20 send/phút/user; lỗi map 502/503/504; 503 kèm `code:"chat_disabled"` khi flag tắt.
- Tests: `MessageHistoryTest`, `MessageSendTest` (đã viết, **chưa chạy** — không có PHP). AI service: `ai-service/tests/test_main.py` **đã chạy 19/19 pass** (gồm chat).
- Contract: `docs/API.md` §7. Bật chat trong production vẫn bị gate bởi NFR-PRIV-01 + ADR-C (DeepSeek subprocessor/retention).