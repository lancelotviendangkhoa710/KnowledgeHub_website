# Kế hoạch triển khai AI Agent cho KnowledgeHub

**Trạng thái:** Chủ dự án đã phê duyệt ngày 15/11/2026.
**ADR:** `docs/decisions/2026-11-15-role-scoped-ai-agent-workflows.md`.
**Nhánh:** `p3/agent-workflows`, dựa trên `origin/dev`.

## Mục tiêu và ranh giới

Dùng LangChain và LangGraph trong FastAPI AI service hiện có cho ba workflow có giới hạn. Laravel xác thực người dùng, kiểm tra role và quyền sở hữu, kiểm tra đầu ra AI và thực hiện mọi thao tác ghi database. AI service chỉ nhận dữ liệu cần cho tác vụ và token nội bộ; không nhận bearer token của User, phiên Admin hoặc thông tin kết nối database. Các chức năng chat, roadmap, content và CV hiện có tiếp tục hoạt động.

| Workflow | Vai trò | Kết quả | Điều kiện ghi dữ liệu |
| --- | --- | --- | --- |
| Khóa học từ YouTube | Contributor | Một playlist YouTube công khai do agent tìm được trở thành một course KnowledgeHub. Agent soạn bài học; Laravel tạo bản nháp rồi xuất bản bằng Content service. | Kiểm tra quyền tạo và xuất bản, playlist và toàn bộ video; ghi trong một transaction. |
| Quản trị | Admin | Đề xuất thay đổi role hoặc trạng thái tài khoản, sau đó thực hiện thao tác đã chọn. | Admin chấp nhận riêng đúng thao tác, đối tượng và tham số; kiểm tra lại role, policy, trạng thái và mật khẩu khi cần. |
| Đánh giá CV | User, Contributor hoặc Admin đối với CV của chính mình | Bản xem trước có dẫn chứng từ CV. | Tải lên không đồng nghĩa với lưu; xác nhận riêng mới lưu CV và đánh giá. Chủ sở hữu có thể xóa cả hai. |

Tạm hoãn tìm project mã nguồn mở. Không thêm database server, microservice, Redis, vector index, bộ thực thi tool tổng quát hoặc LangGraph checkpoint. Chỉ thêm migration đã rà soát vào PostgreSQL hiện có để lưu đánh giá CV, xác nhận Admin dùng một lần và hash của token xác nhận CV. Không chạy test, reset hoặc lệnh phá hủy dữ liệu trên database dùng chung hay cloud.

## Trình tự triển khai

1. **Hợp đồng API và feature flag:** Ghi ADR, request/response giữa Laravel và FastAPI. Ba cờ riêng mặc định tắt; route cũ giữ nguyên hành vi.
2. **AI service:** Ghim phiên bản LangChain/LangGraph. Tạo StateGraph ngắn với giới hạn đầu vào, schema đầu ra, timeout, danh sách thao tác cho phép và xác thực nguồn. Chỉ nhận playlist công khai gồm 2–6 video, tất cả công khai và cho phép nhúng. Xem CV, metadata YouTube và chỉ dẫn tự nhiên là dữ liệu không đáng tin cậy.
3. **Laravel:** Thêm endpoint có xác thực và giới hạn tần suất. Tái sử dụng ArticleService, ArticlePolicy, AdminUserService, UserPolicy và UserCvService. Model không được tự chọn endpoint ghi dữ liệu. Xác nhận Admin gắn với người thực hiện, đối tượng, thao tác, tham số, thời hạn và chỉ dùng một lần.
4. **Frontend:** Tạo trang theo role. Hiển thị đề xuất Admin trước bước chấp nhận riêng. CV chỉ xem trước cho đến khi User đồng ý lưu; có nút xóa. Contributor mở được course vừa xuất bản.
5. **Kiểm chứng:** Kiểm tra Guest/User/Contributor/Admin, quyền sở hữu, xác nhận giả mạo/hết hạn/dùng lại, hạ role giữa hai bước, ID video sai, prompt injection, CV xem trước không lưu, xác nhận/xóa, lỗi upstream và regression của route cũ.
6. **Phát hành:** Triển khai khi cờ đang tắt, cấu hình secret riêng, smoke test bằng tài khoản kiểm soát rồi bật từng workflow. Rollback bằng tắt cờ, không drop bảng.

## Gói công việc và phụ thuộc

| Gói | Sản phẩm bàn giao | Phụ thuộc | Hoàn thành khi |
| --- | --- | --- | --- |
| WP0: quyết định và contract | ADR, API contract, ma trận quyền và riêng tư | Chủ dự án phê duyệt | Laravel, AI service, frontend và tài liệu khớp nhau. |
| WP1: agent runtime | Dependency, ba graph, xác thực YouTube, log an toàn | WP0 | Test Python đạt; đầu ra bịa không vượt schema. |
| WP2: Laravel | Route, policy/service, migration bổ sung, xác nhận dùng một lần, dọn dữ liệu hết hạn | WP0–1 | Test phân quyền và ownership đạt; mọi thao tác ghi chống dùng lại. |
| WP3: frontend | Trang Contributor, Admin và CV; chấp nhận, đồng ý lưu và xóa | Contract WP2 | Build đạt; lối vào đúng role. |
| WP4: tích hợp | Đồng bộ `origin/dev`, hòa giải Studio, rà soát bảo mật | WP1–3 | Diff sạch, guardrails đạt, không lộ secret trong file. |
| WP5: staging | Migration tiến lên, phương án khôi phục, smoke test thật, benchmark | WP4 | Đạt mọi cổng nghiệm thu trước khi bật cờ. |

Tính đến 16/11/2026, code WP0–3 đã có trên `p3/agent-workflows`. WP4 đã hoàn thành: nhánh đồng bộ với `origin/dev`, liên kết course AI nằm trong Studio mới, frontend build và guardrails đạt. Feature test Laravel của WP2 đã chuyển sang migration tiến lên trong transaction và đạt 9 test/58 assertion trên `test-db` cô lập; sau test không còn bảng thử nghiệm. AI service đạt 53 test. WP5 có bộ đo kiểm và hướng dẫn; chủ dự án đã cấu hình YouTube API key và migration tiến lên từng chạy thành công trên `test-db` cô lập. Chưa có staging riêng hoặc benchmark thật; Docker daemon hiện tạm ngừng, cờ production vẫn tắt và chưa chạy migration trên dữ liệu dùng chung.

## Kiểm thử và migration an toàn

1. Rà soát migration bổ sung, phương án backup/khôi phục và kết nối đích. Test không được tự áp dụng migration lên database dùng chung.
2. Không chạy Feature test đang dùng `RefreshDatabase` dưới giới hạn không reset. Chuyển suite mới sang thiết lập schema tiến lên và rollback bằng transaction trên Compose `test-db`; xác minh guard kết nối trong bootstrap trước khi chạy.
3. Chạy Python unit test, kiểm tra cú pháp và route PHP, frontend build, `git diff --check` và guardrails; các bước này không cần reset database.
4. Nếu bản ghi kiểm tra Compose trước đó có thể được người khác xem, xoay các credential cục bộ đã xuất hiện. Không chép secret vào repository hoặc log.
5. Sau khi tích hợp đạt, chạy migration tiến lên đã rà soát ở staging. Kiểm tra lúc cờ tắt; sau đó bật riêng CV, course Contributor và thao tác Admin. Nếu một cổng không đạt, giữ cờ tắt; rollback bằng tắt cờ.

## Benchmark và tiêu chí nghiệm thu

Mỗi workflow cần 20 yêu cầu đại diện ở môi trường không phải production. Ghi p50/p95 latency đầu cuối, tỷ lệ thành công/lỗi, token đầu vào/đầu ra, chi phí provider, quota YouTube và đánh giá thủ công độ chính xác. Bao gồm CV và metadata chứa prompt injection, thao tác/ID bịa và hạ role giữa chừng. Chỉ so sánh CV với lời gọi AI cũ nếu đầu vào/đầu ra tương đương; course và Admin mới không có baseline tương ứng.

- **Phân quyền:** Không có ghi trái quyền, đọc dữ liệu người khác hoặc thay đổi Admin chưa được chấp nhận. Backend từ chối thao tác bịa; không có SQL, shell hay HTTP tool tùy ý.
- **Course:** Mọi video thuộc đúng playlist nguồn đã xác thực, giữ đủ thứ tự; article và phiên bản xuất bản thuộc Contributor yêu cầu. Lỗi xuất bản không để lại course dở dang.
- **CV:** Xem trước không tạo row `user_cvs` hoặc Storage object. Chỉ xác nhận của chủ sở hữu mới lưu; xóa loại bỏ CV và đánh giá.
- **Độ tin cậy:** Lỗi provider, YouTube và Storage trả thông báo an toàn trong thời gian giới hạn. Xác nhận dùng lại không lặp thao tác. Luồng chat/roadmap/content cũ vẫn qua regression test.
- **Đo lường:** Có báo cáo p50/p95, model calls, token, quota, tỷ lệ lỗi và chi phí mỗi lần thành công trước khi bật diện rộng.

## Sở hữu và rà soát

Công việc trải qua AI Companion, Content, Identity/Auth và frontend; chủ dự án đã cho phép toàn bộ phạm vi. Giữ thay đổi trong file đúng domain, chỉ thêm migration mới, rà soát diff và chia thành PR nhỏ trước khi merge vào `dev`. Bật production và chạy migration cần quy trình triển khai/khôi phục được người vận hành rà soát; công việc hiện tại không thực hiện các bước đó trên dữ liệu dùng chung.
