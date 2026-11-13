# Demo trên máy cá nhân

Đây là cấu hình demo LAN tạm thời dùng Docker Compose development, không phải
cấu hình production. Máy host cần Docker Desktop, truy cập Supabase và AI
provider; không cần VPS. Dữ liệu Supabase được dùng chung với cả nhóm.

1. Làm theo [DEV_CHEATSHEET.md](DEV_CHEATSHEET.md), dùng tài khoản demo riêng;
   giữ `backend/.env` và mật khẩu ngoài Git. Đặt `APP_DEBUG=false` trước demo.
2. Chạy `docker compose up -d`, kiểm tra `docker compose ps` và mở
   http://localhost:3000. Kiểm tra API và AI health như trong cheatsheet.
3. Kết nối máy host và thiết bị người xem vào cùng mạng tin cậy. Chạy `ipconfig`
   trên Windows để tìm địa chỉ IPv4 của máy host; trên thiết bị kia mở cổng
   `3000` tại địa chỉ đó. Cho phép cổng này qua firewall nếu cần. Trình duyệt
   gọi `/api` cùng origin, frontend chuyển tiếp tới backend trong Docker.
4. Thử đăng nhập, xem nội dung và AI với tài khoản được cấp. Thao tác tạo, sửa
   hay xóa sẽ thay đổi dữ liệu chung; chỉ dùng dữ liệu demo đã được nhóm đồng ý.
5. Sau demo chạy `docker compose stop`. Không xóa volumes để xử lý lỗi.

Đường LAN, trải nghiệm đăng nhập từ thiết bị khác và cuộc gọi AI thật chưa được
kiểm thử trong phiên này. HTTP trên LAN không mã hóa; chỉ dùng mạng tin cậy,
không mở cổng ra Internet. Nếu cần public demo, nhóm cần thiết kế HTTPS và
kiểm soát truy cập trước khi triển khai.
