# AUTH-01 — Đăng ký, đăng nhập, đăng xuất

**Mức đặc tả:** Vừa  
**Domain/owner:** Identity/Auth — TEAM_MEMBER_A  
**Commit hoàn tất:** `p1: implement registration login and logout`

## Mục tiêu và phạm vi

Cho Guest tạo tài khoản, xác thực để vào trạng thái đã đăng nhập, và kết thúc phiên đã xác thực. Hồ sơ, đổi email/mật khẩu, khôi phục tài khoản và xác minh email nằm ngoài đặc tả này trừ khi được duyệt riêng.

## Điều đã quyết định

- Role hợp lệ duy nhất: `user`, `contributor`, `admin`; đăng ký công khai không tự nâng quyền.
- Context pack Auth ghi đăng ký mặc định tạo user `pending`, sau xác minh mới thành `active`.
- Mật khẩu phải được hash. Không tiết lộ chi tiết giúp phân biệt email/tài khoản tồn tại khi đăng nhập thất bại.
- AUTH-01 đã có route, controller, service và contract được ghi nhận trong `docs/API.md`.

## Quyết định baseline

AUTH-01 dùng Laravel Sanctum personal access tokens. Frontend gửi bearer token,
logout thu hồi token hiện tại, và token chỉ xuất hiện trong response login.
Registration tạo `pending` + role `user`; email verification thật nằm ngoài
scope nên tài khoản `pending` không được login. Email được normalize lowercase.
Login dùng thông báo credential chung cho sai mật khẩu và tài khoản không active.

## Actor và thành phần

- Guest: đăng ký hoặc đăng nhập.
- User đã xác thực: đăng xuất phiên của chính mình.
- Frontend Next.js → Laravel API (khi API được triển khai) → Auth service/Policy → User và role tables → PostgreSQL.
- Cơ chế credential/session cụ thể chưa được chọn. Không coi frontend là nơi enforcement quyền.

## Luồng activity chính

**Đăng ký:** Guest gửi dữ liệu đăng ký → frontend gửi API → backend validate → tạo user theo trạng thái đăng ký đã duyệt và role `user` duy nhất trong transaction cần thiết → bắt đầu bước xác minh đã duyệt → trả kết quả đã định nghĩa.

**Đăng nhập:** Guest gửi credential → backend kiểm tra định dạng, áp dụng giới hạn nếu được duyệt, tìm user đang hoạt động theo chính sách soft-delete → xác minh hash → đánh giá trạng thái tài khoản/xác minh → tạo session hoặc credential theo cơ chế đã duyệt → frontend chuyển sang trạng thái xác thực.

**Đăng xuất:** user yêu cầu kết thúc phiên → backend thu hồi/hủy đúng credential phiên → frontend xóa trạng thái credential theo cơ chế đã duyệt → request bảo vệ tiếp theo không được coi là đã xác thực bằng credential cũ.

## Lỗi cần xử lý

- Input thiếu/sai: từ chối; không tạo user/phiên.
- Email trùng theo quy tắc uniqueness DB: không tạo bản ghi thứ hai; response đăng ký không tiết lộ thông tin nhạy cảm ngoài chính sách đã duyệt.
- Sai credential hoặc tài khoản không được phép đăng nhập: lỗi không phân biệt thông tin credential hợp lệ nếu chưa có quyết định khác.
- Tài khoản soft-deleted/banned/inactive/chưa xác minh: không cấp phiên; thông điệp cụ thể **chờ duyệt**.
- DB/xác minh thất bại: không trả trạng thái thành công giả; không để user/role ghi dở.
- Guest gọi logout: không làm lộ credential hoặc ảnh hưởng phiên khác.
- Logout lặp: kết quả không làm sống lại credential; tính idempotent phụ thuộc cơ chế đã chọn.

## Checklist kiểm thử

- Đăng ký hợp lệ tạo đúng một user với role `user`, không tạo `admin`/`contributor`.
- Email trùng, dữ liệu sai, DB lỗi: không phát sinh user/role dở.
- Credential sai và user không được phép đăng nhập: không cấp phiên, không lộ credential.
- Credential sau logout không truy cập endpoint yêu cầu xác thực.
- Đăng xuất không hủy phiên người dùng khác; kiểm tra gọi lặp.
- Password trong DB không phải plaintext; credential/secret không xuất hiện trong log/response.

## Gate triển khai

Contract đã được ghi tại `docs/API.md`; Sanctum là package đã được chọn trong
baseline của task. Kiểm tra migration/index email và trạng thái thực tế trước
khi chạy test; không giả định schema nhất quán chỉ dựa trên docs.

## Hoàn tất và commit

- [x] Luồng đăng ký/đăng nhập/đăng xuất khớp quyết định được duyệt.
- [x] Test input sai, trạng thái tài khoản, thu hồi credential, lỗi ghi.
- [x] Rà soát không lộ secret; staged diff chỉ chứa file task.
- [x] Test liên quan chạy và kết quả được ghi.
- [ ] Đủ điều kiện mới commit đúng message: `p1: implement registration login and logout`.
