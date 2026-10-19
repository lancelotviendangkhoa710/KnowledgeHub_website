# AI-05 — Tạo roadmap bằng AI

**Mức:** Kỹ; AI tác động kế hoạch học tập và tạo dữ liệu  
**Owner:** UNASSIGNED; phối hợp TEAM_MEMBER_C bắt buộc  
**Commit dự kiến:** `ai: implement AI roadmap generation` (**prefix chờ duyệt**)

## Luồng activity đề xuất

User gửi mục tiêu/trình độ/giới hạn → xác thực và authorize User → chỉ dùng input được phép + catalog nội dung published/khả kiến → AI service tạo draft các bước có thể map tới article hợp lệ → validate IDs, thứ tự, độ dài, prerequisite DAG ở backend → trình user review/confirm → chỉ sau xác nhận mới tạo `learning_roadmaps`/`roadmap_items` trong transaction → trả roadmap. Không ghi kết quả thô của model vào DB như dữ liệu hợp lệ.

## Chờ duyệt

Input/user profile, model/provider, prompt/service contract, roadmap autosave hay confirm, chất lượng/giải thích, số bước, duplicate/re-generation, chi phí/rate limit, invalid model output, premium subscription gate, retention, moderation, quyền sửa nội dung catalog, route/schema owner.

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