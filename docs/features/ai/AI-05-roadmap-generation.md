# AI-05 — Tạo roadmap bằng AI

**Mức:** Kỹ; AI tác động kế hoạch học tập và tạo dữ liệu  
**Owner:** TEAM_MEMBER_C (AI generation và Learning integration)
**Commit dự kiến:** `ai: implement AI roadmap generation` (**prefix chờ duyệt**)

## Luồng activity đề xuất

Người dùng gửi mục tiêu/trình độ/thời lượng và job posting tùy chọn → Laravel xác thực → gửi dữ liệu cùng tối đa 100 cặp ID/title từ catalog published được allowlist sang FastAPI → AI tạo draft 4-12 bước không gắn article ID → người dùng review/confirm → Learning lưu roadmap và các mục theo thứ tự trong transaction. Catalog chỉ là dữ liệu đọc; AI không được phép sửa catalog. Không lưu kết quả model trước khi người dùng xác nhận.

## Đã thống nhất cho AI-05

- AI dùng service FastAPI riêng; DeepSeek API key chỉ đặt ở service này.
- Preview dùng goal, level, thời lượng và job posting tùy chọn; người học xem bản nháp và xác nhận trước khi lưu.
- Laravel chỉ gửi danh sách catalog published gồm id/title được allowlist; AI không có công cụ ghi catalog.
- Người dùng thường giới hạn 10 preview/phút; admin không bị application limiter.

## Còn hoãn lại

Premium subscription gate, retention policy, moderation policy, đánh giá chất lượng/latency/chi phí ở quy mô production, quota ngoài giới hạn 10 preview/phút, và idempotency bền vững (cần migration Learning được duyệt).

## Kiểm tra kỹ

- Model bịa article ID, gợi ý draft/archived/soft-deleted, duplicate/reordered items, chu trình prerequisites.
- User chỉ tạo roadmap cho mình; output không gắn roadmap owner khác.
- Timeout/retry không tạo roadmap duplicate; lỗi persist sau khi model trả lời không làm UI báo thành công giả.
- Prompt injection từ user/content; bảo vệ secrets và không gửi dữ liệu vượt mục đích.
- Rate/cost abuse, input oversized, output oversized, malformed JSON, latency.
- AI sai/chưa có content phù hợp: thể hiện limitation, không phát minh resource.
- AI domain sở hữu generation; Learning domain sở hữu persisted roadmap. Thay schema/routes Learning cần coordination, không duplicate model/domain.

## Gate/commit

- [ ] Owner AI, TEAM_MEMBER_C và sản phẩm duyệt contract, consent, confirm, entitlement, quota.
- [ ] Test malformed/untrusted output, authorization, valid IDs/state, DAG, retry/idempotency, timeout.
- [ ] Đánh giá chất lượng, cost/latency và privacy trước release.
- [ ] Tests/diff đạt; thống nhất prefix.
- [ ] Commit dự kiến: `ai: implement AI roadmap generation`.

## Cấu hình runtime và luồng xác nhận

Build `ai-service/Dockerfile` thành dịch vụ FastAPI riêng. Đặt `DEEPSEEK_API_KEY`
và `AI_SERVICE_TOKEN` trên dịch vụ này; Laravel cần `AI_SERVICE_URL` và cùng
`AI_SERVICE_TOKEN`. `AI_MODEL` là tùy chọn, mặc định `deepseek-flash`. API
DeepSeek tính phí theo token. Chạy
Compose cục bộ bằng cách đặt hai secret rồi dùng `docker compose --profile ai
up`. Không đưa credential vào source control. Việc tạo dịch vụ Render do người
vận hành thực hiện; thay đổi này không tạo hoặc deploy tài nguyên Render.

Khi nâng cấp từ Gemini sang DeepSeek, cập nhật hoặc xóa mọi giá trị `AI_MODEL`
cũ trong file `.env` và Environment của Render. Service chỉ gửi model có tiền tố
`deepseek-`; nếu nhận override thuộc provider khác, nó dùng `deepseek-flash`.

Người học xem bản nháp và xác nhận trước khi Learning lưu roadmap cùng các mục
theo thứ tự trong một transaction. CRUD Learning, tiến độ (LEARN-02) và
prerequisite (LEARN-03) vẫn giữ vai trò nguồn dữ liệu chuẩn. Schema hiện chưa có
idempotency marker bền vững; gửi lại request xác nhận có thể tạo roadmap trùng
cho đến khi migration Learning được duyệt.
