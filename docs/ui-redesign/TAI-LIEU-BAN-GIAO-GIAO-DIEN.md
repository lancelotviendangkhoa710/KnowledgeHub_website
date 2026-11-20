# Tài liệu bàn giao giao diện KnowledgeHub

Tài liệu này dùng để đưa cho Claude Code khi chuyển giao diện mockup vào dự án. Mockup là nguồn tham chiếu duy nhất: file `docs/ui-redesign/mockup/index.html` trong repo (bản đã đăng trên claude.ai với tên "KnowledgeHub giao diện mới"). Mở file này bằng trình duyệt để xem, thêm `#khoa-hoc`, `#bai-hoc`... vào đường dẫn để chuyển màn hình. Logo nằm trong `docs/ui-redesign/logo/`.

## 1. Phạm vi và nguyên tắc làm việc

- Chỉ đổi giao diện. Không đổi logic, API, route, tên biến state hay dữ liệu.
- Làm từng trang một, mỗi trang một commit, kiểm tra bằng trình duyệt trước khi sang trang khác.
- Phải có đủ hai chế độ sáng và tối ở mọi trang.
- Toàn bộ chữ trên giao diện bằng tiếng Việt.
- Người giao việc là chủ task giao diện nên được phép dùng ba công cụ sau, và chỉ ba công cụ này:
  - Impeccable: cài như skill cho Claude Code (`npx impeccable install`), dùng để thiết kế và kiểm tra giao diện, không thêm vào code chạy trên web.
  - GSAP: gói `gsap` trên npm, kèm bộ hướng dẫn gsap-skills cho Claude Code. Chỉ dùng cho một khoảnh khắc chuyển động chính ở trang giới thiệu. Các trang khác dùng CSS.
  - Lenis: gói `lenis` trên npm. Chỉ bật ở trang giới thiệu, tắt khi người dùng bật giảm chuyển động. Không dùng ở trang học và các trang quản lý.
- Không dùng React Bits và 21st.dev. Hiệu ứng nổi bật của React Bits trái với phong cách phẳng của mockup, còn 21st.dev viết cho Tailwind và shadcn nên không khớp với CSS hiện tại của dự án. Nếu thấy một hiệu ứng cụ thể thật sự cần, viết lại bằng CSS theo bộ màu ở mục 3.
- Mỗi gói npm thêm vào phải có một mục ADR ngắn trong `docs/decisions/` và nằm trong một commit riêng. Đọc hướng dẫn cài đặt chính thức của từng công cụ trước khi cài vì phiên bản có thể đã thay đổi.
- Hiệu ứng chuyển động phải dùng ít và có chủ đích. Không hiện lần lượt từng thẻ, không nâng thẻ khi di chuột. Phải tôn trọng `prefers-reduced-motion`.

## 2. Quy tắc của nhóm cần tuân thủ

- Tạo nhánh từ `dev`, không làm trên `p1/AUTH-07-google-login`. Tên nhánh có tiền tố `p1/`, ví dụ `p1/UX-02-new-ui-courses`.
- Commit bắt đầu bằng `p1:`. Pull request trỏ về `dev`.
- Các trang khóa học, lộ trình, trợ lý AI thuộc phần của thành viên khác. Khi sửa phải ghi rõ trong mô tả PR.
- Không sửa file dùng chung ngoài `globals.css`, các file token và component giao diện chung. Nếu cần sửa nơi khác, hỏi trước.
- Ghi quyết định thiết kế mới vào `docs/features/UX-01-design-foundation.md` vì tài liệu này đang ghi bộ token cũ (đỏ burgundy `#8B0000` trên nền giấy `#FAF7F5`).
- AUTH-07 đã gộp vào `dev` và nhánh đã xóa trên GitHub, nên đăng nhập và tài khoản làm được bình thường. Nhớ `git fetch` và `git pull` nhánh `dev` mới nhất trước khi tạo nhánh.
- Người giao việc phụ trách toàn bộ giao diện, nên được sửa cả các trang thuộc phần của thành viên khác. Vẫn ghi rõ trong mô tả PR.

## 3. Token thiết kế

Đưa vào `globals.css` dưới dạng biến CSS. Giữ lớp ánh xạ cho các tên biến cũ để trang chưa đổi vẫn chạy.

### Chế độ sáng

| Biến | Giá trị | Công dụng |
|---|---|---|
| --bg | #F3F5FA | nền trang |
| --surface | #FFFFFF | thẻ, bảng |
| --surface-2 | #E9EDF6 | nền phụ, ô nhập |
| --line | #DCE1EC | đường viền |
| --ink | #101214 | chữ chính |
| --ink-2 | #4A5162 | chữ phụ |
| --ink-3 | #737B8E | chữ mờ |
| --brand | #2443E0 | màu thương hiệu, liên kết |
| --brand-soft | #E3E8FF | nền nhấn nhẹ |
| --hero | #1F3ACF | khối hero |
| --hero-deep | #172A9C | phần tối của hero |
| --mark | #FFD84A | điểm nhấn vàng |
| --mark-ink | #3A2E00 | chữ trên nền vàng |
| --btn / --btn-ink | #101214 / #FFFFFF | nút chính |
| --ok | #168A5B | thành công |
| --danger | #C9372C | lỗi |

### Chế độ tối

| Biến | Giá trị |
|---|---|
| --bg | #0C0E14 |
| --surface | #151821 |
| --surface-2 | #1E222E |
| --line | #2A2F3D |
| --ink | #ECEEF5 |
| --ink-2 | #B3B9C9 |
| --ink-3 | #8088A0 |
| --brand | #93A5FF |
| --brand-soft | #1B2350 |
| --hero | #1B2FA6 |
| --hero-deep | #111C6B |
| --mark, --mark-ink | giữ nguyên |
| --btn / --btn-ink | #ECEEF5 / #101214 |
| --ok | #4FD1A0 |
| --danger | #FF8478 |

### Màu theo chủ đề khóa học

Hệ thống #3D5AFE, Lập trình #FFCB3D, Dữ liệu #22B07D, Nghề nghiệp #FF7A59. Dùng cho ảnh bìa dạng hình khối và nhãn chủ đề.

### Chữ, bo góc, bóng

- Tiêu đề: Plus Jakarta Sans. Nội dung: Roboto. Mã nguồn: JetBrains Mono. Cỡ chữ nội dung 15px, dòng 1.6.
- Bo góc thẻ 10px, nút dạng viên thuốc (999px). Không dùng bo góc lớn hơn cho thẻ.
- Bóng chỉ dùng một mức (`--shadow`), không đổ bóng khi di chuột.
- Chiều cao thanh đầu trang 64px.

### Cách chuyển sáng tối

- Mặc định theo hệ điều hành bằng `prefers-color-scheme`.
- Nút chuyển ghi `data-theme="light"` hoặc `"dark"` lên thẻ `html`, lưu `localStorage` với khóa `kh-theme`.
- Trong Next.js cần một đoạn script nhỏ trong `<head>` đọc khóa này trước khi vẽ trang để không bị nháy sai màu.

## 4. Những thứ không được làm

Đây là các điểm người dùng đã loại vì trông giống giao diện do AI tạo ra:

- Không dùng vạch màu bên cạnh thẻ hoặc dưới tiêu đề.
- Không bo góc lớn, không thẻ nổi lên khi di chuột, không hiện lần lượt từng thẻ bằng hiệu ứng.
- Không dùng gradient làm trang trí.
- Không dùng chữ in hoa nhỏ phía trên mỗi tiêu đề, không đánh số 01, 02, 03 khi nội dung không phải một chuỗi bước.
- Giữ biểu tượng và nhãn thật, không dùng emoji làm biểu tượng.

## 5. Logo

Dùng phương án C. Biểu tượng là một nút gốc nối với hai nhánh, nút giữa màu vàng `#FFD84A`, vẽ bằng SVG (symbol `logo` trong mockup). Các file logo đã gửi riêng: bản sáng, bản tối, bản ngang. Bản ngang đang dùng chữ nên cần đổi chữ thành đường vẽ trước khi đưa vào dự án để không phụ thuộc phông.

## 6. Thứ tự làm các trang

Mỗi dòng ứng với một màn hình trong mockup (mở bằng đường dẫn `#tên-màn-hình`).

| Thứ tự | Màn hình mockup | Trang trong dự án (cần xác nhận lại đường dẫn thật) | Ghi chú |
|---|---|---|---|
| 0 | khung chung | SiteHeader, SiteFooter, Navbar, nút sáng tối, globals.css | làm trước, mọi trang dùng |
| 1 | khoa-hoc | danh sách và chi tiết khóa học | phần của thành viên khác, ghi vào PR |
| 2 | trang-chu | trang giới thiệu (landing) | tiêu đề lớn là "KnowledgeHub" |
| 3 | bai-hoc | trang học | |
| 4 | lo-trinh, lo-trinh-cua-toi | lộ trình | |
| 5 | tro-ly | trợ lý AI | ẩn chân trang ở màn hình này. Tin nhắn tối đa 8000 ký tự. Ghi nhớ có loại (Sở thích, Thông tin, Mục tiêu) và ngày hết hạn tùy chọn |
| 6 | da-luu | đã lưu | |
| 7 | studio | danh sách khóa học của contributor | mỗi dòng có Xem, Phiên bản mới, Lịch sử; bản nháp có thêm Xuất bản, bản đã xuất bản có thêm Lưu trữ. Không có nút Sửa |
| 8 | soan-khoa-hoc | `courses/create` (hơn 3000 dòng) | chia thành component nhỏ khi làm, xem mục 7 |
| 9 | lich-su-phien-ban | `courses/[id]/versions` | xem mục 7 |
| 10 | quan-tri | `admin/users`, `admin/categories`, `admin/tags` | giữ ba đường dẫn riêng, dùng chung một thanh tab ở đầu trang. Xem mục 7B |
| 11 | dang-nhap, tai-khoan | đăng nhập, tài khoản | AUTH-07 đã gộp, giữ nguyên chức năng đăng nhập Google. Bảng hoạt động học tập trong tài khoản xem mục 7A. Đăng ký có xác thực email và CAPTCHA, xem mục 7C |
| 12 | quen-mat-khau, dat-lai-mat-khau, xac-thuc-email, thu-email | `/forgot-password`, `/reset-password`, `/verify-email`, thư tự động | màn mới của luồng xác thực, xem mục 7C |

## 7. Hai màn soạn khóa học và lịch sử phiên bản

Giữ nguyên toàn bộ chức năng hiện có, chỉ đổi giao diện.

Soạn khóa học (`#soan-khoa-hoc`):
- Ba chế độ xem: chia đôi, chỉ soạn, chỉ xem. Trên điện thoại xếp thành một cột.
- Thông báo khôi phục bản nháp tự lưu, có nút Khôi phục và Bỏ bản nháp.
- Thông tin khóa học: tên (5 đến 120 ký tự), đường dẫn tự tạo từ tên và có nút khóa hoặc sửa tay, danh mục, thẻ dạng chip nhập bằng Enter.
- Thanh công cụ: H2, H3, in đậm, in nghiêng, gạch ngang, danh sách, trích dẫn, đường kẻ, khối code nhiều ngôn ngữ, ghi chú (lưu ý, mẹo, cảnh báo), chèn video YouTube bằng hộp thoại.
- Xem trước dùng cùng kiểu chữ với trang học. Trong dự án, giữ nguyên bộ hiển thị markdown hiện có, chỉ đổi kiểu dáng.
- Khóa học mới bắt đầu trống: không có thẻ mặc định, không có nội dung mẫu, khung xem trước chỉ hiện câu hướng dẫn. Dòng báo lỗi (thiếu thẻ, tên chưa hợp lệ) chỉ chuyển đỏ sau khi người dùng đã chạm vào ô rồi rời đi, hoặc sau khi bấm Xuất bản.
- Nút có chữ thì không thêm biểu tượng (nhóm chế độ xem, thanh công cụ, đường dẫn). Biểu tượng chỉ dùng cho nút không có chữ hoặc khi mang thông tin thật, như dấu tích trong bảng kiểm tra và biểu tượng play ở nút Video YouTube.
- Bảng kiểm tra trước khi xuất bản có 4 điều kiện: tên hợp lệ, đã chọn danh mục, có ít nhất 1 thẻ, nội dung từ 50 từ. Nút Xuất bản luôn bấm được. Khi còn thiếu điều kiện, hiện hộp xác nhận liệt kê điều kiện chưa đạt với hai nút Quay lại chỉnh sửa và Vẫn xuất bản; đủ điều kiện thì xuất bản ngay.

Lịch sử phiên bản (`#lich-su-phien-ban`):
- Danh sách phiên bản mới nhất ở trên, có nhãn Đang xuất bản và Mới nhất. Tên người tạo chỉ hiện tên, không hiện email.
- Hai chế độ: Xem (nội dung dạng văn bản thuần, không hiển thị HTML) và So sánh (chọn phiên bản gốc, phiên bản so sánh, đổi chỗ, so với bản trước).
- So sánh theo từng dòng, có số dòng cũ và mới, dấu cộng và trừ kèm nhãn cho trình đọc màn hình (không chỉ dựa vào màu), thay đổi tiêu đề hiện riêng, các dòng không đổi được gấp lại và mở ra được. Khi thay đổi quá lớn, hiện thông báo kết quả chỉ là gần đúng như logic hiện tại.
- Ô chọn Xem thử trạng thái chỉ có trong mockup để xem các trường hợp: tác giả, người đọc (chỉ thấy bản đang xuất bản), chưa đăng nhập, không có quyền, không tìm thấy, lỗi tải. Không đưa ô này vào dự án. Quy tắc hiển thị theo quyền giữ nguyên như code hiện tại.

## 7A. Bảng hoạt động học tập (màn tai-khoan)

Đây là chức năng mới, cần backend. Mockup nằm ở đầu màn `#tai-khoan`. Nhắc nhóm trước khi làm vì có đụng tới cơ sở dữ liệu.

Hiển thị:
- Lưới ngày kiểu lịch hoạt động: mỗi ô một ngày, mỗi cột một tuần, hàng đầu là Thứ hai. Nhãn tháng Th1 đến Th12, nhãn hàng T2, T4, T6.
- Thang 5 mức màu theo token `--brand` pha với `--surface-2`: 0 hoạt động, 1 đến 2, 3 đến 4, 5 đến 6, từ 7. Không dùng màu xanh lá. Ngày hôm nay có viền `--mark`.
- Số liệu phía trên: tổng hoạt động, số ngày có học, chuỗi ngày hiện tại, chuỗi ngày dài nhất.
- Chuyển khoảng thời gian: 12 tháng qua, năm hiện tại, năm trước.
- Rê chuột hoặc focus vào ô hiện ngày và số hoạt động. Bấm vào ô hiện danh sách hoạt động của ngày đó theo giờ, kèm loại: Hoàn thành bài học, Xem xong video, Nộp bài tập.
- Di chuyển giữa các ô bằng phím mũi tên. Mỗi ô có nhãn đọc được cho trình đọc màn hình, không chỉ dựa vào màu.
- Trạng thái người mới: lưới trống, có dòng gợi ý và nút dẫn tới danh sách khóa học.
- Điện thoại: lưới cuộn ngang và tự cuộn tới tuần mới nhất.
- Ô Xem thử trạng thái chỉ có trong mockup, không đưa vào dự án.

Quy tắc dữ liệu cần chốt với nhóm trước khi code:
- Mỗi hành động được tính 1 điểm vào ngày diễn ra. Một bài có thể sinh hơn một hoạt động (xem xong video và hoàn thành bài). Nếu muốn mỗi bài chỉ 1 điểm thì gộp lại trước khi ghi.
- Ngày tính theo giờ Việt Nam (UTC+7).
- Cần bảng ghi hoạt động (người dùng, loại, khóa học, bài học, thời điểm). Chỉ chủ tài khoản được xem hoạt động của mình. Kiểm tra lại bài đã hoàn thành trước đó để không ghi trùng. Theo quy tắc nhóm, cách làm này cần migration, ghi rõ trong PR.
- Không thêm thư viện biểu đồ. Lưới vẽ bằng HTML và CSS thuần như mockup.

## 7B. Màn quản trị (người dùng, danh mục, thẻ)

Giữ nguyên toàn bộ chức năng và quy tắc hiện có, chỉ đổi giao diện và chữ. Mockup `#quan-tri` đặt ba phần trên một trang bằng ba tab; trong dự án giữ ba đường dẫn riêng (`/admin/users`, `/admin/categories`, `/admin/tags`) và đặt cùng một thanh tab (các liên kết, trang hiện tại có `aria-current="page"`) ở đầu mỗi trang. Thanh tab là thành phần dùng chung.

Người dùng:
- Bốn trạng thái: Hoạt động, Chờ duyệt, Ngưng hoạt động, Bị khóa. Ba vai trò: Người học, Người viết, Quản trị viên (mỗi tài khoản một vai trò, đổi vai trò sẽ đăng xuất người đó).
- Dòng của chính người đang đăng nhập chỉ hiện "Bạn", không đổi được vai trò hay trạng thái. Tài khoản chờ duyệt có nút Kích hoạt. Tài khoản chờ duyệt hoặc bị khóa hiện vai trò dạng chữ.
- Đổi vai trò từ hoặc sang quản trị viên cần nhập mật khẩu của người đang thao tác (API cũng kiểm tra), hiện ngay phía trên bảng.
- Bộ lọc: tìm theo tên hoặc email, trạng thái, vai trò, ngày tham gia (bất kỳ lúc nào, 1, 7, 30 ngày qua). Mới tham gia nhất ở trên, không có ô sắp xếp. Có phân trang.
- Mockup gộp tên và email vào một cột; không đổi dữ liệu.

Danh mục:
- Cây danh mục: tên, đường dẫn, số khóa học, số danh mục con. Nút Danh mục mới, Tải lại, Sửa, Xóa.
- Khung nhập (tạo và sửa) gồm tên, đường dẫn tùy chọn, danh mục cha. Giữ nguyên các kiểm tra hợp lệ và thông báo lỗi theo từng ô như code hiện tại.
- Xóa mở hộp xác nhận; khi danh mục còn khóa học hoặc danh mục con thì hiện cảnh báo máy chủ sẽ từ chối.

Thẻ:
- Chỉ có tạo và xem, không có xóa. Khi gõ tên hiện đường dẫn sẽ được tạo, báo nếu trùng với thẻ có sẵn (không phân biệt hoa thường, dấu, khoảng trắng, dấu câu).
- Danh sách xếp theo chữ cái, có ô lọc theo tên hoặc đường dẫn, dòng "Hiển thị n trên m thẻ", bảng Tên, Đường dẫn, Khóa học.

Trạng thái chung của mỗi phần: đang tải, không có dữ liệu, lỗi tải kèm nút Thử lại, chưa đăng nhập, không có quyền quản trị. Ô Xem thử trạng thái ở đầu mockup chỉ dùng cho mockup, không đưa vào dự án.

## 7C. Xác thực: đăng ký có thư xác thực, quên mật khẩu, CAPTCHA

Các màn này là chức năng mới, cần ADR và PR riêng ở phần backend trước khi code giao diện. Mockup có bốn màn mới (`quen-mat-khau`, `dat-lai-mat-khau`, `xac-thuc-email`, `thu-email`) và các trạng thái mới trong màn `dang-nhap`. Ô Xem thử trạng thái ở đầu mỗi màn chỉ dùng cho mockup, không đưa vào dự án.

Quyết định đã chốt:
- Người đăng ký bằng email và mật khẩu phải xác thực email. Xác thực xong, tài khoản tự chuyển từ Chờ duyệt sang Hoạt động, không còn bước quản trị viên duyệt. Quản trị viên vẫn đổi được trạng thái ở trang Quản trị.
- Đăng ký bằng Google cho phép thêm tên miền gmail.com bên cạnh email trường.
- Thư gửi bằng Brevo ở bản triển khai và Mailpit ở máy lập trình.
- CAPTCHA dùng Cloudflare Turnstile.

Các màn:
- Đăng ký (`/register`): thêm ô CAPTCHA. Gửi xong thì chuyển sang trạng thái Kiểm tra hộp thư và chưa đăng nhập. Nút Gửi lại thư chờ 60 giây giữa hai lần bấm.
- Đăng nhập (`/login`): thêm liên kết Quên mật khẩu cạnh nhãn mật khẩu. Tài khoản chưa xác thực email thấy thông báo kèm nút Gửi lại thư xác thực. CAPTCHA chỉ hiện khi máy chủ báo đã nhập sai nhiều lần. Thử quá nhiều lần thì khóa tạm và báo đợi 15 phút.
- Quên mật khẩu (`/forgot-password`): ô email và CAPTCHA. Luôn hiện cùng một thông báo dù email có đăng ký hay không, để không lộ tài khoản nào tồn tại. Có nút Gửi lại thư chờ 60 giây.
- Đặt lại mật khẩu (`/reset-password`): mở từ liên kết trong thư, có mật khẩu mới và nhập lại, ít nhất 8 ký tự. Gợi ý chỉ chuyển đỏ sau khi rời ô hoặc sau khi bấm Đổi mật khẩu. Thành công thì nói rõ các thiết bị khác đã bị đăng xuất. Liên kết hết hạn hoặc đã dùng thì có nút Yêu cầu liên kết mới.
- Xác thực email (`/verify-email`): mở từ liên kết trong thư, có bốn trạng thái: đang xác thực, thành công, liên kết hết hạn (nhập email và CAPTCHA để nhận thư mới), đã xác thực trước đó. Thư mới cũng dùng thông báo không lộ tài khoản.

CAPTCHA: ô Turnstile do Cloudflare vẽ, mockup chỉ đặt ô giữ chỗ nét đứt, giống cách làm với nút Google. Dùng chủ đề tự động theo giao diện sáng tối và ngôn ngữ tiếng Việt, rộng 300px, cao 65px. Nút gửi vẫn bấm được; nếu chưa có mã xác nhận thì hiện thông báo Chưa xác nhận CAPTCHA ở đầu biểu mẫu.

Thư tự động (màn `thu-email`) có ba mẫu: xác thực email, đặt lại mật khẩu, tài khoản Google không có mật khẩu riêng. Liên kết trong thư có hiệu lực 60 phút và chỉ dùng một lần. Thư dùng màu cố định của chế độ sáng và kiểu dáng viết trực tiếp trong thẻ, vì Gmail và Outlook không đọc biến CSS. Đây là ngoại lệ duy nhất của quy tắc cấm mã màu cứng. Tên thương hiệu là chữ, không dùng ảnh logo, nút là liên kết có nền.

## 8. Trang chưa có mockup

Áp dụng cho mọi trang chưa có trong mockup. Các trang người dùng, danh mục, thẻ và xác thực đã có mockup (mục 7B và 7C); nếu còn trang quản trị khác (contributor, phân quyền) thì áp dụng mục này.

- Chỉ dùng token và component đã làm ở các bước trước. Bảng, biểu mẫu, hộp thoại, nhãn trạng thái làm giống màn Studio và Quản trị trong mockup.
- Không thêm kiểu mới, màu mới hay hiệu ứng mới.
- Trạng thái trống, đang tải, lỗi dùng cách thể hiện đã có trong mockup.
- Đưa người giao việc xem trước khi commit.

## 9. Quy tắc bắt buộc: mockup trước khi code

Khi làm một chức năng mới hoặc một màn hình mới, phải làm mockup HTML trước bằng Claude Fable hoặc Claude trên ứng dụng desktop, được người giao việc duyệt, rồi mới code vào dự án. Mockup mới được thêm vào `docs/ui-redesign/mockup/index.html` theo cùng cách đặt tên màn hình, dùng đúng token ở mục 3 và có cả chế độ sáng và tối. Claude Code không tự làm mockup cho màn hình mới và không code màn hình mới khi chưa có mockup đã duyệt.

## 10. Việc chưa chốt

- Ba điểm thiết kế chưa quyết: dải vàng "Chưa biết bắt đầu từ đâu?", chữ mờ lớn ở đầu trang khóa học, ảnh bìa dạng hình khối thay cho ảnh thật.

## 11. Cách kiểm tra mỗi trang

1. Chạy `docker compose up`, mở `http://localhost:3000`.
2. So với mockup ở cả chế độ sáng và tối, ở chiều rộng máy tính và điện thoại.
3. Kiểm tra bàn phím có viền focus nhìn thấy, tương phản chữ đạt chuẩn, vẫn dùng được khi bật giảm chuyển động.
4. Chạy lint và build của frontend trước khi commit.
