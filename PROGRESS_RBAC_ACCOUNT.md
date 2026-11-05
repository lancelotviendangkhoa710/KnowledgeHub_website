# TIẾN ĐỘ THỰC HIỆN: BẢO VỆ PHÂN QUYỀN (RBAC GUARDS) & NÂNG CẤP TRANG CÁ NHÂN (KNOWLEDGEHUB)

## Giai đoạn 0: Khởi tạo Tiến trình & Watchdog
- [x] 0.1. Tạo file theo dõi tiến độ `PROGRESS_RBAC_ACCOUNT.md`
- [x] 0.2. Cấu hình & kích hoạt `watchdog_runner.py`
- [x] 0.3. Tạo nhánh Git tính năng độc lập `p1/AUTH-04-rbac-account-ui`

## Giai đoạn 1: Bắt buộc Đăng nhập khi Gắn Bookmark
- [x] 1.1. Chặn hành vi Bookmark của Khách trên `CourseCard.tsx`
- [ ] 1.2. Chặn hành vi Bookmark của Khách trên trang Chi tiết bài giảng (`/courses/[id]`)

## Giai đoạn 2: Bắt buộc Đăng nhập khi Xem Chi tiết Bài giảng (`/courses/[id]`)
- [ ] 2.1. Thiết lập Content Gate cho người dùng chưa đăng nhập
- [ ] 2.2. Đảm bảo trải nghiệm đọc liền mạch cho thành viên đã đăng nhập

## Giai đoạn 3: Phân quyền Nghiêm ngặt Trang Tạo bài giảng (`/courses/create`)
- [ ] 3.1. Tạo RBAC Guard tại trang Contributor Studio
- [ ] 3.2. Cập nhật Banner CTA Contributor trên trang danh mục (`/courses/page.tsx`)

## Giai đoạn 4: Nâng cấp Toàn diện Giao diện Trang Cá nhân (`/account`)
- [ ] 4.1. Thiết kế Thẻ Định danh & Thông tin Tổng quan (Profile Overview Card)
- [ ] 4.2. Bổ sung Khu vực Đặc quyền theo Vai trò (Role Privileges Dashboard)
- [ ] 4.3. Bổ sung Widget Thống kê Hoạt động Học tập (Quick Learning Stats)

## Giai đoạn 5: Kiểm thử, Tối ưu & Đóng gói Pull Request
- [ ] 5.1. Kiểm tra Build & Type Safety trong `frontend/`
- [ ] 5.2. Chạy kịch bản kiểm tra Guardrails dự án
- [ ] 5.3. Tạo Pull Request
