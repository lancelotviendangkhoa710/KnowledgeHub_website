# AUTH-03 — Quản lý vai trò

**Mức đặc tả:** Kỹ (bề mặt quyền cao)  
**Domain/owner:** Identity/Auth — TEAM_MEMBER_A  
**Commit hoàn tất:** `p1: implement admin role assignment`

## Mục tiêu và bất biến

Admin cấp/thu hồi role theo thao tác được cho phép. Chỉ có `admin`, `contributor`, `user`; Contributor không tự nâng quyền; User không được gán role. Quyền được enforce tại backend Policy/Gate, không dựa vào UI.

## Activity

Admin chọn user và thao tác role → API xác thực Admin → service tải target user và role hợp lệ → kiểm tra chính sách chuyển role/last-admin đã duyệt → transaction ghi quan hệ `user_roles` → audit kết quả theo chính sách đã duyệt → trả state cập nhật.

Mọi actor khác → từ chối trước mutation. Target/role không tồn tại hoặc user đã soft-delete → lỗi phù hợp, không mutation.

## Chờ bạn duyệt — chính sách đặc quyền

**Không tự quyết:** Admin cuối cùng có được tự hạ quyền/xóa không; cho phép gán nhiều role hay chỉ một; quy tắc Admin tạo/thu hồi Admin; chuyển role có yêu cầu xác nhận/MFA/audit/notification không; hành vi với tài khoản inactive/banned; phục hồi role sau soft-delete.

## Kiểm tra kỹ và test bắt buộc

- Bốn actor, target là chính mình/người khác, target soft-deleted/inactive.
- Chỉ ba role được phép; role không tồn tại hoặc role cũ bị cấm phải thất bại.
- Không có đường mass assignment, endpoint phụ, hoặc race condition vượt Policy.
- Gán trùng phải theo unique constraint, không tạo duplicate.
- Kiểm tra hai Admin thao tác đồng thời và invariant last-admin sau khi policy được duyệt.
- DB error giữa transaction không để quan hệ role một phần; mọi lần từ chối không đổi quyền.
- Audit không ghi credential/token; nếu yêu cầu audit chưa được duyệt thì phải nêu rõ thay vì tự tạo hệ thống audit.

## Gate hoàn tất

- [ ] Chính sách gán/thu hồi đã được sản phẩm duyệt.
- [ ] Ma trận actor × thao tác × target được test.
- [ ] Unique/FK/transaction và đồng thời được rà soát.
- [ ] Staged diff đúng scope; test liên quan chạy.
- [ ] Đủ điều kiện mới commit: `p1: implement admin role assignment`.