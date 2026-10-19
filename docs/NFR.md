# KnowledgeHub — Yêu cầu phi chức năng

**Trạng thái:** Đề xuất để nhóm duyệt
**Phiên bản:** 0.1
**Phạm vi:** Yêu cầu chất lượng cho nền tảng KnowledgeHub và phương pháp nghiệm thu. Đây là baseline đề xuất, không khẳng định các mục tiêu đã được đáp ứng hoặc production đã sẵn sàng.

## 1. Căn cứ và giả định

Kiến trúc mục tiêu gồm frontend Next.js/React, Laravel REST API và PostgreSQL 16/Supabase PostgreSQL. Docker Compose phục vụ phát triển. Python/FastAPI cho AI và Amazon S3 cho tệp là thành phần dự kiến, chưa triển khai. API contract chưa được định nghĩa/triển khai trong workspace; không giả định endpoint, cơ chế xác thực hay định dạng phản hồi.

Các ngưỡng tải, SLA và phục hồi dưới đây là **giả định khởi điểm cần chủ sản phẩm/nhóm duyệt**. Đo lại trên môi trường và dữ liệu gần production trước khi biến thành cam kết vận hành. Không chọn nhà cung cấp, công nghệ mới hay thay đổi kiến trúc trong tài liệu này.

## 2. Yêu cầu

### Hiệu năng và năng lực

| ID | Yêu cầu | Tiêu chí nghiệm thu |
|---|---|---|
| NFR-PERF-01 | API đọc nội dung duy trì độ trễ mục tiêu dưới tải đại diện. | Với tải ban đầu giả định 100 request đồng thời, p95 ≤ 500 ms và p99 ≤ 1.5 s; đo thời gian phía server, loại trừ độ trễ mạng client. Xác nhận tải mục tiêu trước kiểm thử nghiệm thu. |
| NFR-PERF-02 | Truy vấn danh sách có giới hạn và phân trang; không tải toàn bộ tập dữ liệu. | Kiểm thử dữ liệu đại diện chứng minh phân trang có giới hạn; truy vấn DB thường dùng đạt p95 ≤ 200 ms theo benchmark được nhóm duyệt. Kiểm tra kế hoạch truy vấn bằng `EXPLAIN ANALYZE`. |
| NFR-PERF-03 | Công việc AI không làm cạn tài nguyên hoặc chặn luồng API cốt lõi. | Khi AI service được triển khai, đo riêng thời gian chờ, thời gian xử lý và lỗi; áp dụng timeout/giới hạn tải theo contract đã duyệt. Không đặt SLA AI trước khi chốt provider và mô hình. |

### Khả dụng và phục hồi

| ID | Yêu cầu | Tiêu chí nghiệm thu |
|---|---|---|
| NFR-AVAIL-01 | Mục tiêu khả dụng ban đầu của API và frontend là 99.5% mỗi tháng, không tính bảo trì được thông báo trước. | Tính từ giám sát endpoint tổng hợp, loại trừ lỗi phía client đã định nghĩa; xác nhận SLA với nền tảng triển khai trước khi công bố. Đây chưa phải SLA hiện hành. |
| NFR-REC-01 | Có khả năng phục hồi dữ liệu và dịch vụ theo mục tiêu được duyệt. | Mục tiêu đề xuất: RPO ≤ 24 giờ, RTO ≤ 8 giờ. Xác minh cấu hình backup của nhà cung cấp và thực hiện restore drill; lưu lại thời gian, kết quả và điểm thiếu. |
| NFR-REC-02 | Bản phát hành có phương án xử lý lỗi ứng dụng và migration. | Trước phát hành, ghi artifact/release trước đó, migration ảnh hưởng dữ liệu, backup đã xác nhận và các bước rollback/forward recovery. Không rollback migration có nguy cơ mất dữ liệu khi chưa đánh giá. |

### Bảo mật và quyền riêng tư

| ID | Yêu cầu | Tiêu chí nghiệm thu |
|---|---|---|
| NFR-SEC-01 | Backend thực thi xác thực, RBAC và quyền sở hữu; không tin quyền do frontend truyền lên. | Kiểm thử Guest, User, Contributor, Admin trên từng luồng được bảo vệ; kiểm tra truy cập chéo dữ liệu và sửa/xuất bản nội dung trái quyền. Dùng Laravel Policy/Gate theo kiến trúc mục tiêu. |
| NFR-SEC-02 | Bí mật production không được đưa vào Git, bundle trình duyệt hoặc log. | Rà soát source, artifact frontend, cấu hình môi trường và log trước phát hành; không có mật khẩu DB, token bí mật, service-role key hay khóa riêng. |
| NFR-SEC-03 | Kết nối production truyền dữ liệu qua TLS; thông tin nhạy cảm không ghi log. | Xác minh TLS từ frontend đến API và từ ứng dụng đến DB theo cấu hình production; rà soát log với dữ liệu/token giả lập. |
| NFR-SEC-04 | Đầu vào được xác thực; endpoint nhạy cảm có bảo vệ chống lạm dụng theo chính sách đã duyệt. | Kiểm thử dữ liệu sai kiểu, quá kích thước, payload độc hại và request lặp. Chốt giới hạn tốc độ, lỗi và hành vi khóa/chặn trong API contract; tài liệu này không tự đặt endpoint hoặc cơ chế auth. |
| NFR-PRIV-01 | Dữ liệu hội thoại và memory AI chỉ được truy cập theo quyền người dùng; thời hạn lưu và xóa phải được duyệt trước khi bật AI. | Kiểm thử cô lập giữa hai tài khoản; theo dõi cả DB, log và backup trong kiểm thử xóa. Không bật lưu memory lâu dài nếu chưa có chính sách lưu/xóa được duyệt. |
| NFR-PRIV-02 | Chỉ thu thập và giữ dữ liệu cần cho chức năng đã duyệt. | Mỗi trường dữ liệu cá nhân có mục đích và chính sách lưu được ghi nhận; xác minh xóa/ẩn danh theo chính sách trước khi phát hành chức năng liên quan. |

### Toàn vẹn, mở rộng và bảo trì

| ID | Yêu cầu | Tiêu chí nghiệm thu |
|---|---|---|
| NFR-DATA-01 | Dữ liệu tuân thủ ràng buộc và không để lại trạng thái ghi dở khi thao tác nhiều bước thất bại. | Kiểm thử FK, CHECK, quy tắc xóa/soft delete và rollback; thao tác nhiều bước phải có transaction phù hợp. Không sửa migration cũ; schema change tuân thủ quy trình duyệt hiện hành. |
| NFR-PAY-01 | Khi thanh toán được triển khai, xử lý webhook an toàn khi giao nhận lặp hoặc lỗi tạm thời. | Kiểm thử sự kiện lặp, retry và đối soát; không lưu số thẻ hoặc bí mật thanh toán. Provider, idempotency contract và entitlement cần quyết định riêng trước triển khai. |
| NFR-SCALE-01 | Ứng dụng có thể chạy nhiều instance mà không phụ thuộc trạng thái cục bộ của một instance. | Kiểm thử session/cache/job theo thiết kế được duyệt trước khi scale ngang; production không dựa vào tệp upload trên filesystem cục bộ. S3 chỉ áp dụng sau khi được tích hợp/duyệt. |
| NFR-MAINT-01 | Mỗi thay đổi API có contract, kiểm thử và đánh giá tương thích trước khi phát hành. | Endpoint chỉ được đánh dấu implemented sau khi kiểm thử contract; breaking change cần phê duyệt và kế hoạch chuyển đổi. Không tự bổ sung contract trong tài liệu này. |
| NFR-MAINT-02 | Quy trình local tái lập được từ checkout sạch bằng công cụ đã có trong dự án. | Làm theo hướng dẫn Docker Compose/SETUP; xác nhận khởi động, migration và health check trên môi trường local. Không coi bootstrap runtime là bằng chứng backend source đã được quản lý phiên bản. |

### Quan sát và trải nghiệm

| ID | Yêu cầu | Tiêu chí nghiệm thu |
|---|---|---|
| NFR-OBS-01 | Có khả năng truy vết lỗi và sức khỏe dịch vụ mà không làm lộ dữ liệu nhạy cảm. | Log có timestamp, mức độ và request/correlation ID khi có hỗ trợ; theo dõi tối thiểu lỗi 5xx, latency p95 và tình trạng DB. Không log token, mật khẩu, khóa hoặc nội dung nhạy cảm. |
| NFR-OBS-02 | Sự cố production có người nhận biết và hướng dẫn ứng phó. | Trước production, xác định người nhận cảnh báo, ngưỡng cảnh báo, kênh liên hệ và runbook; kiểm thử ít nhất một cảnh báo tổng hợp. Công cụ chưa được chỉ định ở đây. |
| NFR-UX-01 | Luồng học tập cốt lõi dùng được trên desktop và mobile; hỗ trợ truy cập cho người dùng khuyết tật. | Mục tiêu đề xuất WCAG 2.2 AA cho luồng trọng yếu; kiểm thử bàn phím, focus, nhãn biểu mẫu, tương phản và trình đọc màn hình. Nhóm duyệt browser/device matrix trước nghiệm thu. |

## 3. Phương pháp xác minh

- **Tải/hiệu năng:** benchmark lặp lại với dữ liệu đại diện; lưu cấu hình, concurrency, p50/p95/p99, throughput, tỷ lệ lỗi và tài nguyên DB.
- **Bảo mật/quyền:** kiểm thử tự động theo bốn actor và ownership; rà soát cấu hình/log/artifact trước phát hành.
- **Phục hồi:** xác minh backup, diễn tập restore; ghi RPO/RTO thực đo và đối chiếu mục tiêu đã duyệt.
- **Dữ liệu:** kiểm thử ràng buộc, transaction, migration trên PostgreSQL tương thích; dùng `EXPLAIN ANALYZE` cho truy vấn trọng yếu.
- **Accessibility:** kiểm tra tự động kết hợp kiểm thử thủ công bằng bàn phím và trình đọc màn hình.
- Chỉ báo cáo đạt khi lệnh/kiểm thử thực sự chạy; mục tiêu chưa đo không được ghi là đã đáp ứng.

## 4. Quyết định còn cần duyệt

1. Tải đồng thời, quy mô dữ liệu và tập luồng dùng để benchmark.
2. SLA/khả dụng, RPO/RTO và thời gian bảo trì.
3. Cơ chế xác thực, giới hạn tốc độ và chi tiết API contract.
4. Thời hạn lưu/xóa dữ liệu cá nhân và AI; phạm vi dữ liệu trong backup.
5. Browser/device matrix và mức WCAG áp dụng.
6. Mục tiêu vận hành, cảnh báo và trách nhiệm trực production.

## 5. Giới hạn phạm vi

Tài liệu chỉ ghi yêu cầu chất lượng và cách nghiệm thu. Không thay thế ADR, API contract, chính sách riêng tư, quyết định provider hoặc runbook triển khai; không thay đổi kiến trúc hay tuyên bố thành phần dự kiến đã được triển khai.