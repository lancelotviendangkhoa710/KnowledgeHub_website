# CLAUDE.md

Quy tắc chung cho mọi agent nằm trong AGENTS.md. Đọc file đó trước.

@AGENTS.md

## Làm lại giao diện (ui-redesign)

Khi làm bất kỳ việc nào liên quan đến giao diện frontend, đọc `docs/ui-redesign/TAI-LIEU-BAN-GIAO-GIAO-DIEN.md` trước, rồi mở `docs/ui-redesign/mockup/index.html` bằng trình duyệt để so sánh. Thêm `#khoa-hoc`, `#bai-hoc`... vào đường dẫn để xem từng màn hình, có cả chế độ sáng và tối. Logo nằm trong `docs/ui-redesign/logo/`.

Khi làm chức năng mới hoặc màn hình mới, không tự code. Phải có mockup đã duyệt trong `docs/ui-redesign/mockup/index.html` trước, làm bằng Claude Fable hoặc Claude trên ứng dụng desktop (xem mục 9 của tài liệu bàn giao).

## Quy tắc giao diện

- Nguồn chuẩn của giao diện là `docs/ui-redesign/mockup/index.html` (mỗi màn có id `#s-tên-màn`) và `docs/ui-redesign/TAI-LIEU-BAN-GIAO-GIAO-DIEN.md`. Làm màn nào thì mở đúng màn đó trong mockup và bám theo. Chưa có mockup cho màn mới thì dừng và báo người giao việc để làm mockup trước, không tự nghĩ giao diện.
- Chỉ dùng token trong `frontend/src/app/globals.css` (màu, khoảng cách, bo góc, font). Không viết mã màu hex hoặc rgb, không dùng style nội tuyến cho màu hay khoảng cách. Thiếu token thì thêm vào `globals.css` cho cả sáng và tối và nêu trong PR.
- Dùng CSS module cho từng màn. Class của CSS module có mã băm, nên trong TSX phải viết `styles.tenClass`.
- Mọi chữ hiển thị cho người dùng bằng tiếng Việt, kể cả placeholder, aria-label, thông báo lỗi và thông báo thành công. Chỉ giữ tiếng Anh cho tên riêng kỹ thuật.
- Dùng lại thành phần có sẵn: `components/ui/Select` và `DatePicker`; `ConfirmDialog` nằm ở `components/content/admin/`. Phân trang chưa có thành phần dùng chung, tạm theo mẫu ở màn Đã lưu, không tự viết kiểu mới. Trong bảng có cuộn ngang, dùng Select với portal để danh sách không bị cắt.
- Nút đã có chữ thì không thêm biểu tượng. Biểu tượng chỉ dùng cho nút không có chữ hoặc khi mang thông tin thật. Không dùng viền trái dày làm điểm nhấn, không nền gradient, không bóng đổ nhiều lớp.
- Giữ nguyên logic và API khi chỉ đổi giao diện. Trang dài hơn khoảng 400 dòng thì tách thành thành phần nhỏ.
- Mỗi màn phải chạy đúng ở 1360px và 390px, chế độ sáng và tối, không tràn ngang, có focus nhìn thấy, một h1, mọi ô nhập có nhãn.
- Việc ngoài giao diện (API, cơ sở dữ liệu, cấu hình) không làm lẫn trong PR giao diện.
