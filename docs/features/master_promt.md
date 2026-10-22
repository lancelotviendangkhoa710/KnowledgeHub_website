- dùng ít nhất là opus 5 or gpt 6 luna reasioning high trở lên để chạy promt này
promt :

# TASK: Phân tích codebase và tạo bộ tài liệu đặc tả kỹ thuật để triển khai 3 chức năng Learning

## 1. Vai trò và mục tiêu

Bạn là Senior Software Engineer, Software Architect và Business Analyst chịu trách nhiệm chuyển yêu cầu chức năng thành tài liệu đặc tả kỹ thuật có thể dùng trực tiếp để triển khai phần mềm.

Tôi cần triển khai 3 chức năng được mô tả trong:

`@/docs/features/learning`

Nhiệm vụ của bạn là phân tích yêu cầu, khảo sát codebase hiện tại và tạo bộ tài liệu đặc tả đủ chính xác để một coding model có năng lực suy luận hạn chế vẫn có thể triển khai từng chức năng mà không phải tự thiết kế lại nghiệp vụ hoặc tự đoán kiến trúc.

**Đây là nhiệm vụ phân tích và viết tài liệu, KHÔNG phải nhiệm vụ triển khai code.**

Không viết hoặc sửa code ứng dụng. Không tự ý thêm dependency, thay đổi schema, chạy migration hoặc chỉnh sửa những file không thuộc tài liệu đặc tả.

## 2. Nguyên tắc bắt buộc

### 2.1. Đọc yêu cầu và khảo sát codebase trước khi thiết kế

Trước khi viết tài liệu:

1. Tìm và đọc toàn bộ tài liệu liên quan đến 3 chức năng trong `@/docs/features/learning`. Xác định chính xác tên của từng chức năng; không giả định tên hoặc số lượng file tương ứng với số lượng chức năng.
2. Đọc các tài liệu liên quan như README, tài liệu kiến trúc, quy ước coding, API documentation và database schema nếu tồn tại.
3. Khảo sát source code hiện có để xác định:
   - Công nghệ, framework và cấu trúc dự án.
   - Cách định nghĩa route, page, component, service, hook, state management và API client.
   - Cách xác thực người dùng, phân quyền và kiểm tra quyền sở hữu dữ liệu.
   - Data model, schema, quan hệ dữ liệu, migration và quy tắc truy vấn.
   - Cách xử lý loading, error, validation, logging và thông báo cho người dùng.
   - Các module có chức năng tương tự có thể tái sử dụng.
   - Những thành phần hiện có sẽ bị tác động khi triển khai ba chức năng.
4. Đọc code của các module liên quan trực tiếp, không chỉ nhìn tên thư mục hoặc tên file.
5. Ghi nhận đường dẫn file và các symbol quan trọng để người triển khai có thể tìm đến đúng vị trí trong codebase.

Không được đưa ra thiết kế tách rời kiến trúc thực tế nếu không có lý do rõ ràng.

### 2.2. Phân biệt thông tin có căn cứ và giả định

Mọi quyết định thiết kế phải thuộc một trong các nhóm:

- **CONFIRMED:** Được xác nhận bởi yêu cầu, source code, schema hoặc tài liệu hiện tại.
- **ASSUMPTION:** Giả định cần thiết để xây dựng phương án nhưng chưa được xác nhận.
- **OPEN QUESTION:** Vấn đề cần người phụ trách dự án quyết định.
- **RECOMMENDATION:** Đề xuất cải thiện, chưa phải yêu cầu bắt buộc.

Không biến giả định thành sự thật. Khi thiếu thông tin, hãy chọn phương án tương thích nhất với codebase nếu có đủ căn cứ và ghi rõ giả định. Nếu vấn đề ảnh hưởng lớn đến nghiệp vụ, bảo mật, cấu trúc dữ liệu hoặc tính đúng đắn, phải đánh dấu là câu hỏi chưa được giải quyết.

Không tự phát minh API, bảng dữ liệu, business rule hoặc hành vi giao diện rồi mô tả chúng như những thứ đã tồn tại.

### 2.3. Ưu tiên thiết kế có tính nhất quán

Tuân theo thứ tự ưu tiên:

1. Yêu cầu nghiệp vụ đã được xác nhận.
2. Kiến trúc và contract hiện có của dự án.
3. Coding conventions và các pattern đã được áp dụng.
4. Phương án đơn giản nhất đáp ứng yêu cầu.
5. Các cải tiến tùy chọn.

Không xây dựng thêm abstraction, service, bảng dữ liệu hoặc dependency chỉ vì cho rằng kiến trúc đó hiện đại hơn.

## 3. Phân tích quan hệ giữa ba chức năng

Trước khi đặc tả riêng từng chức năng, lập bản đồ phụ thuộc của cả ba.

Xác định:

- Chức năng nào độc lập, chức năng nào phụ thuộc vào chức năng khác.
- Thành phần UI, API, service hoặc data model nào được dùng chung.
- Các business rule có thể bị trùng lặp hoặc mâu thuẫn.
- Thứ tự triển khai hợp lý và những điều kiện tiên quyết.
- Những thay đổi ở chức năng này có thể ảnh hưởng đến chức năng khác.
- Những quyết định kiến trúc cần thống nhất trước khi bắt đầu code.

Nếu chưa đủ thông tin để kết luận có quan hệ phụ thuộc, ghi rõ điều đó. Không mặc định rằng cả ba chức năng có thể triển khai hoàn toàn độc lập.

## 4. Cấu trúc file đầu ra

Tạo các file Markdown sau, sử dụng slug phù hợp với tên chức năng thực tế:

- `docs/specs/learning/00-overview.md`
- `docs/specs/learning/01-<feature-a>.md`
- `docs/specs/learning/02-<feature-b>.md`
- `docs/specs/learning/03-<feature-c>.md`

Đây là các tài liệu mới. Không ghi đè tài liệu yêu cầu nguồn.

Nếu số lượng chức năng thực tế không phải ba, hãy báo cáo sự không khớp trước khi tạo bộ tài liệu; không tự bỏ sót hoặc tự gộp chức năng.

Dùng tiếng Việt để mô tả nghiệp vụ. Giữ nguyên tên class, function, file, API, field, bảng dữ liệu và thuật ngữ kỹ thuật theo codebase.

## 5. Nội dung bắt buộc của 00-overview.md

### 5.1. Mục tiêu và phạm vi

- Tổng quan ba chức năng.
- Bối cảnh nghiệp vụ và mục tiêu người dùng.
- Những gì nằm trong và ngoài phạm vi triển khai.
- Danh sách tài liệu yêu cầu nguồn đã đọc.
- Trạng thái xác minh của những thông tin quan trọng.

### 5.2. Kiến trúc hiện tại liên quan đến Learning

Mô tả ngắn gọn kiến trúc thực tế, kèm đường dẫn file tham chiếu.

Ví dụ các lớp có thể tồn tại:

`UI → API Client → Backend Route/Controller → Service → Data Access Layer → Database`

Đây chỉ là ví dụ. Phải dùng kiến trúc thực tế của dự án, không áp đặt mô hình này nếu codebase hoạt động khác.

Nêu rõ:

- Thành phần hiện có nên tái sử dụng.
- Component, service, hook, route, model hoặc schema có khả năng cần thay đổi.
- Convention cần giữ nguyên.
- Các giới hạn kỹ thuật cần biết trước khi triển khai.

### 5.3. Ma trận phụ thuộc

Lập bảng gồm:

| Chức năng | Phụ thuộc | Thành phần dùng chung | Thứ tự triển khai | Rủi ro tích hợp |
|---|---|---|---|---|

### 5.4. Quyết định kiến trúc chung

Ghi nhận các quyết định ảnh hưởng nhiều chức năng, chẳng hạn:

- Quy ước xác thực và phân quyền.
- Cách chuẩn hóa response và error.
- Cách quản lý trạng thái UI.
- Cách xử lý dữ liệu hoặc transaction nếu có liên quan.
- Nguyên tắc tái sử dụng component và service.

Chỉ đưa vào các quyết định thật sự cần thiết cho dự án. Không biến đề xuất tùy chọn thành yêu cầu bắt buộc.

### 5.5. Danh sách vấn đề chưa giải quyết

Tổng hợp các ASSUMPTION và OPEN QUESTION có ảnh hưởng tới việc triển khai. Ghi rõ mức độ ảnh hưởng và chức năng liên quan.

## 6. Nội dung bắt buộc của từng tài liệu đặc tả chức năng

Mỗi file đặc tả phải đủ độc lập để một model chỉ cần đọc file đó cùng những file nguồn được trỏ tới là có thể bắt đầu triển khai.

### 6.1. Metadata và mô tả chức năng

Bao gồm:

- Tên chức năng và mã định danh, ví dụ `LRN-001`.
- Mục tiêu nghiệp vụ.
- Người dùng hoặc actor liên quan.
- Vấn đề cần giải quyết.
- Phạm vi IN SCOPE.
- Phạm vi OUT OF SCOPE.
- Tiền điều kiện.
- Điều kiện cần đạt sau khi hoàn thành.
- Tài liệu nguồn và các file code liên quan.

### 6.2. Quy tắc nghiệp vụ

Liệt kê business rule bằng ID ổn định, ví dụ `BR-001`, `BR-002`.

Mỗi rule phải mô tả rõ:

- Điều kiện áp dụng.
- Quyết định hoặc hành vi bắt buộc.
- Kết quả mong đợi.
- Trường hợp ngoại lệ.
- Nguồn chứng minh hoặc trạng thái xác nhận.

Nếu có các trạng thái nghiệp vụ, xác định:

- Ý nghĩa mỗi trạng thái.
- Điều kiện chuyển trạng thái.
- Ai được phép thực hiện chuyển đổi.
- Các chuyển đổi không hợp lệ.
- Hệ thống xử lý thế nào khi trạng thái hiện tại không cho phép hành động.

Không suy ra business rule chỉ từ tên nút hoặc tên field nếu chưa có đủ căn cứ.

### 6.3. Luồng hoạt động chi tiết

Đây là phần quan trọng nhất.

Mô tả từng luồng bằng các bước được đánh số. Không dừng ở mô tả như “người dùng nhập dữ liệu, hệ thống lưu dữ liệu”.

Với mỗi luồng, phải xác định:

1. Actor khởi tạo hành động.
2. Trạng thái ban đầu của giao diện và dữ liệu.
3. Hành động cụ thể của người dùng hoặc hệ thống.
4. Điều kiện được kiểm tra tại frontend.
5. Request hoặc lời gọi nội bộ được thực hiện.
6. Kiểm tra xác thực, phân quyền và business rule tại backend nếu có.
7. Các bước xử lý dữ liệu theo đúng kiến trúc thực tế.
8. Tương tác với database hoặc dịch vụ phụ thuộc.
9. Điều kiện thành công và response tương ứng.
10. Thay đổi trạng thái UI và dữ liệu hiển thị.
11. Các nhánh lỗi, nhánh điều kiện và hành vi phục hồi.
12. Trạng thái cuối cùng và các side effect.

Đặc tả ít nhất các luồng có căn cứ trong yêu cầu, bao gồm:

- Luồng thành công chính (happy path).
- Luồng dữ liệu đầu vào không hợp lệ.
- Luồng người dùng không đủ quyền hoặc không đủ điều kiện.
- Luồng dữ liệu không tồn tại hoặc đã thay đổi.
- Luồng backend hoặc dịch vụ phụ thuộc lỗi.
- Luồng người dùng hủy, quay lại hoặc thử lại nếu chức năng hỗ trợ.
- Luồng gửi yêu cầu trùng lặp hoặc thao tác lặp lại khi có liên quan.
- Các nhánh điều kiện đặc thù của nghiệp vụ.

Không tạo luồng giả định không liên quan chỉ để làm tài liệu dài hơn.

### 6.4. Sơ đồ luồng

Sử dụng Mermaid để thể hiện trực quan những luồng quan trọng:

- `flowchart`: Luồng hoạt động, decision, điều kiện, nhánh thành công/thất bại.
- `sequenceDiagram`: Tương tác theo thời gian giữa actor, UI, API, service, database và hệ thống ngoài nếu có.
- `stateDiagram-v2`: Vòng đời hoặc state machine khi chức năng có trạng thái.
- `erDiagram`: Khi cần làm rõ quan hệ giữa các entity hoặc thay đổi dữ liệu.

Không bắt buộc dùng tất cả sơ đồ cho mọi chức năng. Chọn đúng loại theo vấn đề thực tế.

Mỗi sơ đồ phải thống nhất với mô tả bằng văn bản. Không vẽ các thành phần kiến trúc chưa được xác nhận như thể chúng chắc chắn tồn tại.

### 6.5. Đặc tả giao diện và trạng thái UI

Với mỗi màn hình, dialog, form, component hoặc khu vực giao diện có liên quan, mô tả:

- Vị trí và mục đích.
- Các thành phần hiển thị.
- Các field, label, placeholder và nút hành động.
- Giá trị mặc định và nguồn lấy dữ liệu.
- Điều kiện hiển thị, ẩn, disable hoặc enable.
- Hành động người dùng có thể thực hiện.
- Tác động của hành động lên UI và backend.
- Điều kiện điều hướng hoặc đóng giao diện.
- Tính nhất quán với component và design pattern hiện có.

Đặc tả các trạng thái UI phù hợp với từng component:

- Initial.
- Loading.
- Success.
- Empty.
- Validation error.
- API/server error.
- Disabled hoặc unavailable.
- Partial success nếu có.
- Pending/submitting nếu có thao tác bất đồng bộ.

Với mỗi trạng thái, mô tả điều kiện đi vào trạng thái, nội dung hiển thị, hành động được phép và cách thoát trạng thái.

Không chỉ ghi “hiển thị thông báo lỗi”. Cần xác định loại lỗi, vị trí hiển thị và hành động tiếp theo của người dùng theo yêu cầu đã xác nhận hoặc một giả định được đánh dấu rõ.

### 6.6. Đặc tả dữ liệu và validation

Với từng field hoặc object dữ liệu liên quan, mô tả:

| Field | Kiểu dữ liệu | Bắt buộc | Quy tắc validation | Chuẩn hóa | Giá trị biên | Nguồn |
|---|---|---|---|---|---|---|

Bổ sung nếu có liên quan:

- Nullable và giá trị mặc định.
- Enum hoặc tập giá trị hợp lệ.
- Độ dài tối thiểu/tối đa.
- Quy tắc định dạng.
- Ràng buộc duy nhất.
- Quan hệ giữa các field.
- Quy tắc ownership và tenant isolation.
- Quy tắc xử lý ngày giờ, múi giờ, tiền tệ hoặc file.
- Quy tắc phân trang, sắp xếp, lọc và tìm kiếm.

Phân biệt validation phía client và server. Backend không được dựa hoàn toàn vào validation phía client đối với dữ liệu hoặc quyền truy cập có ý nghĩa bảo mật.

Chỉ điền các giới hạn có căn cứ. Giá trị chưa xác nhận phải đánh dấu rõ.

### 6.7. Đặc tả API hoặc interface giữa các thành phần

Nếu có API, mô tả contract đầy đủ:

- HTTP method và endpoint thực tế hoặc endpoint đề xuất đã được đánh dấu.
- Mục đích.
- Authentication và authorization.
- Path, query và header parameters.
- Request body với ví dụ JSON.
- Validation và business rule.
- Response thành công với ví dụ JSON.
- Danh sách lỗi và cấu trúc error response.
- HTTP status code dự kiến.
- Quy tắc phân trang và sorting nếu có.
- Các side effect.
- Timeout, retry hoặc idempotency khi thật sự cần thiết.

Nếu dự án sử dụng giao tiếp nội bộ, server action, RPC hoặc phương thức khác thay vì REST API, hãy đặc tả đúng giao tiếp thực tế, không ép dự án dùng REST.

Ví dụ JSON phải khớp với schema và coding convention của dự án. Đánh dấu rõ phần nào đã xác nhận và phần nào mới là đề xuất.

### 6.8. Database và tính toàn vẹn dữ liệu

Khi chức năng đọc hoặc thay đổi dữ liệu, mô tả:

- Entity/table/model liên quan.
- Schema hiện tại và field liên quan.
- Quan hệ, khóa và constraint.
- Dữ liệu cần đọc, tạo, cập nhật hoặc xóa.
- Điều kiện để một bản ghi được phép thay đổi.
- Cách xử lý khi bản ghi không tồn tại.
- Tác động dây chuyền đến dữ liệu khác.
- Yêu cầu transaction hoặc tính nguyên tử.
- Rủi ro thao tác đồng thời hoặc ghi đè dữ liệu.
- Migration cần thiết nếu có và cách tương thích ngược.

Không tự ý yêu cầu xóa hoặc thay đổi schema hiện tại khi chưa có căn cứ. Nếu chưa xác minh được schema, ghi rõ cần kiểm tra trước khi triển khai.

Nếu chức năng không cần thay đổi database, ghi rõ kết luận và căn cứ.

### 6.9. Ma trận lỗi và tình huống biên

Lập bảng:

| ID | Tình huống | Điều kiện phát sinh | Nơi xử lý | Hành vi hệ thống | UI/response mong đợi | Có thể retry? |
|---|---|---|---|---|---|---|

Xem xét các tình huống phù hợp với chức năng:

- Input sai định dạng hoặc thiếu field.
- Dữ liệu rỗng.
- Dữ liệu vượt giới hạn.
- Resource không tồn tại.
- Người dùng không có quyền.
- Resource thay đổi trong lúc xử lý.
- Request trùng lặp.
- Nhấn nút nhiều lần.
- Mất mạng hoặc timeout.
- Backend trả lỗi.
- Database gặp sự cố.
- Dữ liệu không nhất quán.
- Race condition hoặc concurrent updates.
- Người dùng refresh hoặc điều hướng đi khi request còn đang xử lý.
- Side effect thất bại sau khi thao tác chính đã thành công.

Đối với từng trường hợp, chỉ định hành vi mong đợi. Tránh đưa ra danh sách lỗi chung chung không gắn với luồng thực thi cụ thể.

### 6.10. Bảo mật và phân quyền

Xác định các kiểm tra cần có tại đúng ranh giới tin cậy:

- Xác thực danh tính.
- Phân quyền chức năng.
- Quyền truy cập từng resource hoặc bản ghi.
- Kiểm tra dữ liệu đầu vào.
- Ngăn truy cập dữ liệu của người dùng khác.
- Ngăn sửa các field không được phép.
- Xử lý dữ liệu nhạy cảm trong log và response.
- Các nguy cơ bảo mật đặc thù của chức năng.

Chỉ ra vị trí trong codebase có trách nhiệm thực hiện mỗi kiểm tra, nếu đã xác định được.

Không coi việc ẩn hoặc disable nút ở frontend là cơ chế phân quyền đầy đủ.

### 6.11. Hiệu năng và khả năng vận hành

Đánh giá có căn cứ về:

- N+1 queries hoặc truy vấn dư thừa.
- Pagination và giới hạn dữ liệu.
- Đọc/ghi lặp lại.
- Khối lượng dữ liệu lớn.
- Cache hoặc invalidation nếu dự án có sử dụng.
- Logging, monitoring và lỗi cần theo dõi.
- Các thao tác dài hoặc bất đồng bộ.

Không tự đặt KPI hoặc ngưỡng hiệu năng khi chưa có yêu cầu. Phân biệt tối ưu bắt buộc với đề xuất tùy chọn.

### 6.12. Acceptance criteria

Mỗi tiêu chí nghiệm thu phải kiểm thử được và liên kết với requirement ID.

Sử dụng Given/When/Then:

- **Given:** Điều kiện ban đầu.
- **When:** Hành động được thực hiện.
- **Then:** Kết quả có thể quan sát hoặc xác minh.

Bao phủ happy path, nhánh nghiệp vụ quan trọng, quyền truy cập, validation và lỗi liên quan.

Tránh các tiêu chí như “chức năng chạy tốt”, “giao diện đẹp” hoặc “xử lý lỗi hợp lý” nếu không có điều kiện cụ thể để xác minh.

### 6.13. Kế hoạch kiểm thử

Tạo test matrix:

| Test ID | Requirement ID | Loại test | Tiền điều kiện | Input/Action | Expected result | Mức độ |
|---|---|---|---|---|---|---|

Xác định test phù hợp ở các mức:

- Unit test.
- Integration test.
- API/component test.
- End-to-end test.
- Regression test.

Chỉ ra module hoặc test suite hiện có nên mở rộng, convention tạo test và lệnh chạy test thực tế sau khi xác minh package scripts hoặc cấu hình dự án.

Nếu không xác định được lệnh chạy test, ghi rõ chưa xác minh; không tự bịa lệnh.

### 6.14. Ánh xạ sang source code và phạm vi thay đổi

Lập bảng:

| File/module hiện tại | Vai trò hiện tại | Thay đổi dự kiến | Lý do | Requirement liên quan |
|---|---|---|---|---|

Phân biệt:

- File nhiều khả năng cần sửa.
- File có thể cần tạo mới.
- File chỉ cần tái sử dụng.
- File chưa thể kết luận trước khi triển khai.

Không yêu cầu tạo file mới nếu một module hiện có đã đảm nhiệm đúng trách nhiệm đó.

### 6.15. Kế hoạch triển khai tuần tự

Chia công việc thành các task nhỏ, có thể hoàn thành và kiểm thử riêng.

Mỗi task cần có:

- Task ID.
- Mục tiêu duy nhất.
- Dependencies.
- File được phép hoặc dự kiến thay đổi.
- Các bước triển khai.
- Requirement ID liên quan.
- Kết quả đầu ra.
- Test hoặc lệnh xác minh.
- Điều kiện để đánh dấu DONE.

Sắp xếp theo dependency thực tế, không theo thứ tự tùy ý.

Hạn chế task đòi hỏi model phải tự giải quyết đồng thời nhiều thay đổi lớn trên frontend, backend và database. Nếu buộc phải triển khai xuyên nhiều lớp, ghi cụ thể contract giữa các lớp.

### 6.16. Assumptions, open questions và implementation blockers

Tách riêng ba nhóm:

1. Giả định có thể tiếp tục triển khai an toàn.
2. Câu hỏi nên được chủ dự án xác nhận.
3. Blocker phải được giải quyết trước khi triển khai.

Với từng mục, ghi:

- ID.
- Mô tả.
- Lý do chưa thể xác nhận.
- Ảnh hưởng đến thiết kế.
- File hoặc requirement liên quan.
- Hướng giải quyết đề xuất.

Không âm thầm biến một quyết định nghiệp vụ quan trọng thành mặc định.

## 7. Quy tắc về mức độ chi tiết

Tài liệu phải có đủ thông tin để thực hiện triển khai, nhưng không dài một cách hình thức.

Một đoạn mô tả được xem là chưa đủ chi tiết nếu model triển khai vẫn phải tự đoán một trong những điều sau:

- Khi nào hành động được phép thực hiện?
- Dữ liệu được lấy từ đâu và được biến đổi như thế nào?
- Thành phần nào chịu trách nhiệm xử lý?
- Điều kiện nào tạo ra từng nhánh của luồng?
- Hệ thống thay đổi trạng thái nào sau mỗi bước?
- Nếu một bước thất bại, dữ liệu và giao diện sẽ ở trạng thái gì?
- Làm thế nào phân biệt thành công với thất bại?
- Làm thế nào xác nhận implementation đáp ứng đúng yêu cầu?

Đối với mỗi quyết định quan trọng, phải có căn cứ hoặc nhãn ASSUMPTION/OPEN QUESTION/RECOMMENDATION.

Không cần lặp lại cùng một nội dung trong mọi phần. Có thể tham chiếu bằng requirement ID, nhưng mỗi file chức năng phải vẫn đủ rõ khi đọc riêng.

## 8. Quy trình thực hiện

Thực hiện lần lượt:

**Phase A — Discovery**

- Đọc các file yêu cầu và codebase liên quan.
- Xác minh số lượng, tên và phạm vi ba chức năng.
- Lập danh sách nguồn đã kiểm tra.
- Xác định phụ thuộc và điểm chưa rõ.

**Phase B — Design**

- Phân tích từng chức năng.
- Đối chiếu với architecture và business rule hiện có.
- Xây dựng các luồng, contract, state transition và kế hoạch test.
- Kiểm tra sự nhất quán giữa ba chức năng.

**Phase C — Documentation**

- Tạo file overview và ba file đặc tả.
- Liên kết source reference, requirement ID, test ID và task ID.
- Không thay đổi source code của ứng dụng.

**Phase D — Self-review**
Trước khi kết thúc, tự kiểm tra:

- Có bỏ sót chức năng hoặc tài liệu nguồn nào không?
- Sơ đồ có khớp mô tả bằng văn bản không?
- API contract có khớp schema không?
- UI có xử lý các trạng thái chính không?
- Các nhánh lỗi có hành vi xác định không?
- Có quy tắc nào tự suy đoán mà chưa gắn nhãn không?
- Có requirement nào chưa có acceptance criteria không?
- Có acceptance criteria nào chưa có test case không?
- Các task có thể triển khai tuần tự mà không phải tự thiết kế thêm không?
- Có mâu thuẫn giữa các đặc tả hoặc với codebase không?

Sửa các điểm không nhất quán trước khi hoàn thành.

## 9. Điều kiện hoàn thành

Chỉ báo cáo hoàn thành khi:

- Bộ tài liệu đã được tạo tại đúng vị trí.
- Cả ba chức năng đều được đặc tả hoặc vấn đề thiếu nguồn được báo cáo rõ.
- Các
