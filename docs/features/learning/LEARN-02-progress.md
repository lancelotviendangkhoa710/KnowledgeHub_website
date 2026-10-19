# LEARN-02 — Theo dõi tiến độ

**Mức:** Kỹ — dữ liệu học tập cá nhân và model hiện giới hạn theo roadmap item  
**Owner:** TEAM_MEMBER_C  
**Commit:** `p3: implement learning progress tracking`

## Luồng activity hiện có trong thiết kế

Progress tracker là 1:1 theo roadmap item (`learning_progress`), không phải tiến độ toàn cục của course. User cập nhật item trong roadmap mình sở hữu → API derive actor → Policy kiểm tra roadmap/item ownership → validate trạng thái item và progress payload đã duyệt → transaction cập nhật tracker → trả trạng thái. Guest bị từ chối.

## Chờ bạn duyệt — không mở rộng nghĩa “tiến độ khóa học”

Định nghĩa completed (%/timestamp/time spent), cho phép skipped/in_progress, tự động hoàn thành roadmap, nhiều roadmap cùng article, đồng bộ bookmark/progress, reset/reopen, enrollment/course completion. Enrollment/global course progress đã được context pack đánh dấu blocker; cần thiết kế nghiệp vụ/schema được duyệt riêng.

## Kiểm tra kỹ

- User A không đọc/cập nhật tracker của B; item ID thuộc roadmap đúng.
- Mọi status nằm trong CHECK; giá trị ngoài miền, thời gian âm/tương lai, payload spoof được từ chối theo rule được duyệt.
- Tạo đồng thời tracker 1:1 không duplicate; retry không nhân đôi thời lượng.
- Delete roadmap/item và cascade progress đúng migration; không báo success nếu record đã bị xóa.
- Cập nhật item không vô tình sửa roadmap khác có cùng article.
- Lỗi giữa nhiều bảng rollback; consistency giữa item status và tracker được định nghĩa.

## Gate/commit

- [ ] Định nghĩa progress cùng API contract được duyệt; không tự gọi là course enrollment.
- [ ] Test ownership, one-to-one, concurrency, checks/cascade, rollback.
- [ ] Tests/diff đạt.
- [ ] Commit: `p3: implement learning progress tracking`.