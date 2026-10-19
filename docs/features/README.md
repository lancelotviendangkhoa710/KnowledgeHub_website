# KnowledgeHub — Đặc tả hoạt động chức năng

Tài liệu này mô tả hành vi và tương tác thành phần để agent hiểu nghiệp vụ trước khi triển khai. Đây **không** phải là API contract đã phê duyệt hay giấy phép tự thay đổi schema/kiến trúc.

## Cổng phân công trước mỗi section

Theo phân công Agile đề xuất: **Khiêm → Identity/Auth (`TEAM_MEMBER_A`, `p1/`)**, **Khua → Content (`TEAM_MEMBER_B`, `p2/`)**, **Khoa → Infrastructure/điều phối (`TEAM_MEMBER_C`, `p3/`)**; chờ Khoa/team xác nhận. Trước section mới, agent hỏi tên người **chỉ khi chưa xác định được thành viên đang giao task**; nếu section đã có assignee rõ trong task/registry hoặc user vừa nêu tên, đọc file cá nhân tương ứng, không hỏi tên lặp lại. Chỉ làm task đã giao trong file assignment và đúng domain ownership. Quy trình đầy đủ: [`docs/team/ASSIGNMENT-PROTOCOL-VI.md`](../team/ASSIGNMENT-PROTOCOL-VI.md).

## Quy ước đọc

- **Đã quyết định**: có căn cứ trong `AGENTS.md`, ADR, tài liệu database/architecture, ownership hoặc context pack.
- **Giả định để phân tích**: cách diễn giải hợp lý nhưng chưa được phê duyệt. Giữ riêng, không đưa vào code như quy tắc đã chốt.
- **Chờ chủ sản phẩm duyệt**: quyết định nghiệp vụ/kiến trúc cần người dùng xác nhận trước khi triển khai phần liên quan.
- Mức **Vừa**: luồng chính, quyền và lỗi thường gặp; hợp lý với đăng nhập/đăng xuất và thao tác cơ bản.
- Mức **Kỹ**: thêm trạng thái, ownership, transaction, dữ liệu biên, lặp/đồng thời, riêng tư, audit và rủi ro liên thành phần. Dùng cho business features.
- Các endpoint, cơ chế session/token, schema bổ sung, response, provider, thời hạn lưu và chính sách entitlement chỉ được coi là đã chốt khi có nguồn đã duyệt.
- Mỗi đặc tả có commit message dự kiến. Dùng **nguyên văn** làm commit hoàn tất tính năng, sau khi checklist đạt và xác nhận staged diff chỉ chứa file của task. Không commit thay đổi có sẵn ngoài phạm vi.
- Các thay đổi Git có trước đặc tả phải được bảo toàn; không stage, sửa, revert hoặc đưa vào commit của tính năng.

## Thứ tự theo phụ thuộc đã duyệt

1. **Identity/Auth** — nền tảng người dùng và quyền.
2. **Content** — nội dung đã xuất bản và vòng đời biên tập.
3. **Learning** — roadmap và tiến độ. Bookmark là chức năng Content-owned, phối hợp khi Learning cần tích hợp.
4. **AI Companion** — chỉ bắt đầu sau khi gán owner; AI service riêng là kiến trúc dự kiến. RAG, memory, roadmap generation có các quyết định kỹ thuật/riêng tư cần duyệt.
5. **Payment** — chỉ bắt đầu sau khi gán owner và duyệt provider, webhook, entitlement.

## Index

Tài liệu index không tương ứng một tính năng và không có commit feature riêng; commit message được quy định trong từng spec.

### Identity/Auth — mức vừa; các quyết định tài khoản/quyền vẫn phải kiểm tra
- [AUTH-01 — Đăng ký, đăng nhập, đăng xuất](identity-auth/AUTH-01-registration-login-logout.md)
- [AUTH-02 — Hồ sơ và tài khoản](identity-auth/AUTH-02-profile-account.md)
- [AUTH-03 — Quản lý vai trò](identity-auth/AUTH-03-role-assignment.md)

### Content — mức kỹ
- [CONTENT-01 — Quản lý danh mục](content/CONTENT-01-categories.md)
- [CONTENT-02 — Vòng đời nội dung và phiên bản](content/CONTENT-02-content-lifecycle.md)
- [CONTENT-03 — Tags](content/CONTENT-03-tags.md)
- [CONTENT-04 — Bookmarks](content/CONTENT-04-bookmarks.md)
- [CONTENT-05 — Tệp đính kèm](content/CONTENT-05-attachments.md)
- [CONTENT-06 — Tìm kiếm](content/CONTENT-06-search.md)

### Learning — mức kỹ
- [LEARN-01 — Roadmap học tập](learning/LEARN-01-roadmaps.md)
- [LEARN-02 — Theo dõi tiến độ](learning/LEARN-02-progress.md)
- [LEARN-03 — Điều kiện tiên quyết](learning/LEARN-03-prerequisites.md)

### AI Companion — mức kỹ; owner chưa được gán
- [AI-01 — Quản lý hội thoại](ai/AI-01-conversations.md)
- [AI-02 — Lịch sử tin nhắn](ai/AI-02-message-history.md)
- [AI-03 — Memory người dùng](ai/AI-03-user-memory.md)
- [AI-04 — RAG](ai/AI-04-rag.md)
- [AI-05 — Tạo roadmap bằng AI](ai/AI-05-roadmap-generation.md)

### Payment — mức kỹ; owner chưa được gán
- [PAY-01 — Plan và subscription](payment/PAY-01-plans-subscriptions.md)
- [PAY-02 — Thanh toán và webhook](payment/PAY-02-payments-webhooks.md)

## Gate chung: hoàn tất tính năng và commit

Trước commit, agent phải:

1. Đối chiếu hành vi với spec và cập nhật spec/API/schema nếu task được phép làm vậy.
2. Chạy test phù hợp; ghi đúng lệnh và kết quả, không suy diễn test chưa chạy.
3. Kiểm tra bốn actor khi có authorization: Guest, User, Contributor, Admin; cộng thêm ownership khi dữ liệu cá nhân.
4. Kiểm tra lỗi không gây ghi dở, lộ dữ liệu, hoặc trạng thái không hợp lệ; chạy test hồi quy liên quan.
5. Xem `git diff` và `git diff --cached`; chỉ stage file thuộc task, không chạm thay đổi có sẵn.
6. Chỉ khi mọi tiêu chí đạt, tạo commit bằng message ghi trong chính Activity Spec. Nếu chưa đạt, không tạo commit hoàn tất; báo thiếu sót và đợi review.

Các business feature được đánh dấu **CHỜ BẠN DUYỆT** chưa sẵn sàng để triển khai phần quyết định tương ứng. Có thể tiếp tục phân tích, liệt kê lựa chọn và hệ quả; không tự chọn phương án thay bạn.