# LEARN-01 — Roadmap học tập

**Mức:** Kỹ  
**Owner:** TEAM_MEMBER_C  
**Commit:** `p3: implement learning roadmaps`

## Mục tiêu và luồng activity

User tạo và quản lý roadmap thuộc chính mình. Schema: `learning_roadmaps` + `roadmap_items`; roadmap có trạng thái `active`, `completed`, `archived`, `paused`; item có vị trí unique theo roadmap, optional `article_id`. Roadmap là user-owned; owner hoặc Admin đọc/sửa theo Policy; Guest không truy cập.

User gửi yêu cầu tạo/sửa → API xác thực → Policy xác minh owner/Admin → validate tên/trạng thái/IDs/vị trí → service transaction ghi roadmap/items → trả resource riêng của owner. List/get luôn lọc ownership, không chỉ ẩn trên frontend.

## Chờ duyệt

Quota/số roadmap, auto-complete, chuyển trạng thái hợp lệ, thêm/xóa/reorder item, xử lý archived article và `article_id SET NULL`, Admin visibility, cascade delete, API. AI-generated roadmap là AI-05 riêng; không gọi AI ở chức năng CRUD cơ bản.

## Kiểm tra kỹ

- User A/B, Admin và Guest; IDOR trên roadmap/item/progress.
- ID item thuộc roadmap khác, article không published/soft-delete, link bị null hóa.
- Position trùng khi reorder đồng thời; unique `(roadmap_id, position)`; transaction tránh thứ tự nửa chừng.
- Empty/oversized roadmap, trạng thái enum/check, sửa/xóa archived.
- Không để Admin hoặc API client gán roadmap owner khác nếu policy chưa cho.
- Cross-domain article visibility/ownership: chỉ đọc contract Content; coordinate khi cần đổi schema/route của Content.

## Gate/commit

- [ ] Quy tắc CRUD/state/visibility link được duyệt.
- [ ] Test RBAC, owner isolation, position/transaction, stale article, race.
- [ ] Không thay course/material model hoặc thêm AI; diff/tests đạt.
- [ ] Commit: `p3: implement learning roadmaps`.