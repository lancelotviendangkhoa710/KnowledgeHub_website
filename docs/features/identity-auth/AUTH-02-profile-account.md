# AUTH-02 — Hồ sơ và tài khoản

**Mức đặc tả:** Vừa  
**Domain/owner:** Identity/Auth — TEAM_MEMBER_A  
**Commit hoàn tất:** `p1: implement profile and account management`

## Mục tiêu/phạm vi

Cho người dùng xem và cập nhật thông tin hồ sơ được phép của chính mình. Admin có thể quản lý user theo RBAC. Các trường hồ sơ, thao tác nhạy cảm và quy trình vô hiệu hóa/xóa chưa được định nghĩa đầy đủ.

## Đã quyết định / chưa quyết định

- `users` là dữ liệu nhận diện; account soft-delete được áp dụng theo convention.
- Admin quản lý users/roles; người dùng không tự cấp role cho mình.
- **Chờ duyệt:** trường profile, quyền sửa email/password, xác minh lại, xóa tài khoản, xử lý session và dữ liệu phụ thuộc khi account bị xóa/vô hiệu hóa, thông báo/audit.

## Activity

User → frontend: mở hồ sơ → frontend gọi API đã duyệt → backend xác thực và giới hạn truy vấn vào user hiện tại → service đọc user chưa xóa mềm → trả projection được phép → frontend hiển thị.

Khi cập nhật: backend validate allowlist trường → Policy kiểm tra actor/ownership → transaction cập nhật → trả projection mới. Admin action chỉ áp dụng sau khi rule riêng được duyệt.

## Kiểm tra kỹ

- Không tin `user_id` do client gửi để chọn hồ sơ sở hữu; derive từ identity đã xác thực, ngoại trừ thao tác Admin được phân quyền rõ.
- Không cho User đổi role, status đặc quyền, ID, timestamp, hoặc trường nội bộ qua mass assignment.
- User khác không đọc/sửa hồ sơ cá nhân; Guest không cập nhật.
- Email trùng, record soft-delete, input rỗng/quá dài, dữ liệu cũ khi cập nhật đồng thời.
- Vô hiệu hóa/xóa phải kiểm tra FK RESTRICT và dữ liệu hội thoại/payment; không hard-delete hay cascade tùy tiện.

## Acceptance criteria

- Actor chỉ nhận đúng tập trường đã duyệt của chính mình.
- User không sửa được trường nhạy cảm hoặc hồ sơ người khác.
- Từ chối không làm đổi DB; response/log không lộ mật khẩu hay secret.
- Tất cả xử lý xóa/vô hiệu hóa tuân FK và chính sách lưu dữ liệu đã duyệt.

## Gate hoàn tất và commit

- [ ] Given User sửa hồ sơ của người khác hoặc gửi role/status trong payload; When cập nhật; Then từ chối và DB không đổi.
- [ ] Given Guest; When sửa hồ sơ; Then không được phép.
- [ ] Given email trùng hoặc target soft-deleted; When cập nhật; Then xử lý theo policy đã duyệt, không lộ dữ liệu.
- [ ] Danh sách trường, quyền sửa và hành vi account lifecycle đã được duyệt.
- [ ] Test ownership, mass assignment, dữ liệu trùng/xóa mềm và lỗi DB.
- [ ] Staged diff đúng scope; test liên quan đã chạy.
- [ ] Đủ điều kiện mới commit: `p1: implement profile and account management`.