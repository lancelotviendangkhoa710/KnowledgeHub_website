# CONTENT-03 — Tags

**Mức:** Kỹ  
**Owner:** TEAM_MEMBER_B  
**Commit:** `p2: implement content tags`

## Mục tiêu và activity

Gắn tags toàn cục vào nội dung theo `tags` + `article_tags`. Contributor cập nhật tags trên nội dung mình sở hữu; quyền quản lý tags toàn cục **chờ duyệt**. Backend xác thực → authorize article → validate tag IDs/name/slug → service đồng bộ quan hệ trong transaction → trả tags; reader chỉ thấy tags gắn với nội dung khả kiến.

## Kiểm tra kỹ

- Tag ID/name trùng, slug unique, case/Unicode normalization và race tạo đồng thời.
- Gắn lặp không tạo duplicate; bỏ tag không xóa nhầm tag global đang dùng.
- Batch chứa ID không tồn tại: quyết định atomic all-or-nothing (đề xuất kiểm thử atomic; chưa coi là contract).
- Không cho Contributor chỉnh tags của article người khác; User/Guest không mutation.
- Draft/archived article không rò ra qua endpoint tra tag; article soft-delete không xuất hiện.
- Tag xóa khi đang được sử dụng: policy chưa rõ, không tự cascade/xóa tag.

## Chờ duyệt

Ai tạo/quản trị tag, cho phép tạo tag ngay khi gắn hay chỉ chọn tag có sẵn, chuẩn hóa/merge trùng, xóa/ẩn tag, lọc/pagination, API contract.

## Gate hoàn tất và commit

- [ ] Given gắn tag lặp; When gửi lại request; Then quan hệ không nhân đôi.
- [ ] Given article không khả kiến hoặc không thuộc actor; When đọc/ghi tags; Then không lộ dữ liệu và không mutate.
- [ ] Given batch có ID sai/trùng đồng thời; When sync tags; Then kết quả tuân atomicity/uniqueness đã duyệt.
- [ ] Policy vòng đời tag được duyệt; unique/atomic/ownership/visibility đã test.
- [ ] DB và response không thay đổi khi input batch sai hoặc không đủ quyền.
- [ ] Staged diff và test đã rà soát.
- [ ] Commit: `p2: implement content tags`.