# CONTENT-04 — Bookmarks

**Mức:** Kỹ; Content sở hữu bảng, Learning là consumer cần phối hợp  
**Owner:** TEAM_MEMBER_B; phối hợp TEAM_MEMBER_C nếu Learning tích hợp  
**Commit:** `p2: implement content bookmarks`

## Luồng activity

User/Contributor/Admin đã đăng nhập mở nội dung khả kiến → chọn bookmark → API derives user ID từ identity (không tin user_id client) → authorize bản ghi public/được phép → tạo quan hệ `bookmarks` (composite uniqueness) → trả state. Bỏ bookmark chỉ xóa quan hệ của chính user. Guest không tạo/xem bookmark cá nhân.

## Kiểm tra kỹ

- Actor × sở hữu; user A không đọc/xóa bookmark user B.
- Bookmark lại cùng article, đồng thời hai request, xóa bookmark lặp; không duplicate/500 không cần thiết.
- Article không tồn tại, soft-delete, draft/archived: không tạo quan hệ hay lộ nội dung.
- User soft-delete theo FK cascade; xác minh migration thực tế.
- Pagination thứ tự ổn định và lọc article public/soft-delete khi liệt kê.
- **Ranh giới:** Learning không được tự sửa controller/model/domain Content; coordination với TEAM_MEMBER_B và định nghĩa hợp đồng consumer.

## Chờ duyệt

Bookmark có cho Contributor/Admin cùng cách dùng User không; bookmark archived content giữ hay gỡ; response khi toggle lặp; sắp xếp danh sách; API.

## Gate/commit

- [ ] API và visibility đã khớp quyết định.
- [ ] Ownership, idempotency, race, FK, soft-delete và trạng thái article đã test.
- [ ] Phối hợp cross-domain nếu có Learning.
- [ ] Stage đúng scope; tests chạy.
- [ ] Commit: `p2: implement content bookmarks`.