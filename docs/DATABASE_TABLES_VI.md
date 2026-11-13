# Các bảng database của KnowledgeHub

Tài liệu này giải thích theo góc nhìn người mới, dựa trên migration và code
hiện tại. Dữ liệu ứng dụng nằm trong schema `public` của PostgreSQL trên
Supabase. Laravel quản lý đăng nhập; bảng `public.users` không phải danh sách
người dùng Supabase Auth. Việc có bảng không có nghĩa tính năng tương ứng đã
hoàn thiện hoặc đang có dữ liệu.

## Cách đọc quan hệ

- **Khóa chính (PK)** phân biệt một bản ghi; phần lớn bảng nghiệp vụ dùng UUID.
  Một số bảng liên kết dùng khóa ghép từ hai khóa ngoại.
- **Khóa ngoại (FK)** tham chiếu bản ghi ở bảng khác. Tùy quan hệ, xóa bản ghi
  có thể bị chặn, xóa các liên kết phụ thuộc, hoặc đặt FK thành `NULL`.
- **Soft delete** đánh dấu `deleted_at`, không xóa vật lý dòng ngay.
- `created_at`, `updated_at` thường ghi thời gian tạo/cập nhật; không phải mọi
  bảng đều có cả hai trường.

## Tài khoản và quyền

| Bảng | Chức năng và liên hệ |
|---|---|
| `users` | Tài khoản Laravel: tên, email, mật khẩu đã hash, trạng thái và soft delete. Được course, hội thoại, lộ trình và dữ liệu khác tham chiếu. |
| `roles` | Danh sách ba vai trò `user`, `contributor`, `admin`. |
| `user_roles` | Bảng nối nhiều-nhiều giữa `users` và `roles`; khóa ghép `(user_id, role_id)`. Admin cấp quyền Contributor. |
| `personal_access_tokens` | Token API của Laravel Sanctum; liên kết tới đối tượng sở hữu token. Không lưu hoặc chia sẻ token dạng rõ trong tài liệu. |

## Course và nội dung

Trong ứng dụng hiện tại, một **course được biểu diễn bằng article**; chưa có
các bảng course/section/material riêng. Phân biệt bản ghi course với nội dung
phiên bản:

| Bảng | Chức năng và liên hệ |
|---|---|
| `categories` | Danh mục nội dung dạng cây; `parent_id` có thể trỏ tới một danh mục cha. |
| `articles` | Bản ghi course: tác giả (`author_id`), danh mục, slug, trạng thái và thời điểm xuất bản. Hỗ trợ soft delete. |
| `article_versions` | Các bản chụp nội dung của course, gồm tiêu đề, nội dung, số phiên bản và người tạo. `article_id` trỏ về `articles`. |
| `tags` | Nhãn có thể dùng chung cho nhiều course. |
| `article_tags` | Bảng nối nhiều-nhiều giữa course và tag. |
| `bookmarks` | Bảng nối người dùng với course đã lưu; mỗi cặp chỉ có một bookmark. |
| `article_attachments` | Metadata tệp đính kèm gắn với một version; `object_key` là khóa đối tượng lưu trữ, không phải dữ liệu nhị phân của tệp. |

Khi xuất bản, `articles.published_version_id` trỏ tới version được công khai.
Ví dụ: course A có version 1 và version 2; course vẫn hiển thị version 1 cho
đến khi contributor/admin xuất bản version 2. Quan hệ version được chọn phải
thuộc chính course đó; service Laravel kiểm tra điều này. Các trạng thái nghiệp
vụ là `draft`, `published`, `archived`.

## AI Learning Companion

| Bảng | Chức năng và liên hệ |
|---|---|
| `conversations` | Một phiên trò chuyện thuộc về một user. |
| `messages` | Từng lượt chat thuộc một conversation; có vai trò và nội dung. `sequence` hỗ trợ thứ tự, `client_message_id` hỗ trợ chống xử lý trùng khi được cung cấp. |
| `user_memories` | Thông tin ghi nhớ xuyên phiên của user; có loại, trạng thái, thời hạn tùy chọn và có thể trỏ về message nguồn. |

Ví dụ: một user có nhiều conversation; mỗi conversation có nhiều message. Một
memory có thể tồn tại ngay cả khi message nguồn không còn được tham chiếu.

## Lộ trình và tiến độ học

| Bảng | Chức năng và liên hệ |
|---|---|
| `learning_roadmaps` | Lộ trình của một user, có tiêu đề, mục tiêu và trạng thái. |
| `roadmap_items` | Bước có thứ tự trong lộ trình; có thể liên kết một article. |
| `learning_progress` | Trạng thái tiến độ của một roadmap item. `learning_progress.status` là nguồn chuẩn khi có tracker; `roadmap_items.status` là bản sao phục vụ hiển thị. |
| `roadmap_item_prerequisites` | Liên kết một bước với bước cần hoàn thành trước; không cho bước tự phụ thuộc chính nó. |

Ví dụ: lộ trình Python có bước A rồi bước B; prerequisite nối B tới A, còn
`learning_progress` cho biết trạng thái học của từng bước có tracker.

## Gói và thanh toán

| Bảng | Chức năng và liên hệ |
|---|---|
| `plans` | Định nghĩa gói, giá, tiền tệ và chu kỳ. Các gói hiện được tạo lại là dữ liệu **mẫu**. |
| `subscriptions` | Liên kết user với gói đăng ký và thời gian hiệu lực. |
| `payments` | Lưu trạng thái và số tiền giao dịch; có thể liên kết subscription. Không lưu số thẻ. |
| `webhook_events` | Ghi nhận sự kiện từ nhà cung cấp để theo dõi xử lý và tránh xử lý trùng. |

Các bảng này không chứng minh cổng thanh toán đã được tích hợp đầy đủ.

## Bảng kỹ thuật và bảng cũ

| Bảng | Chức năng |
|---|---|
| `migrations` | Lịch sử migration Laravel đã chạy; không phải dữ liệu nghiệp vụ. |
| `article_reviews` | Bảng cũ còn tồn tại vật lý, **không dùng** trong quy trình nghiệp vụ hiện hành; không tạo tính năng review dựa trên bảng này. |

Ngoài các bảng `public` nêu trên, Supabase có thể có các schema và bảng hệ
thống riêng; chúng không phải các bảng ứng dụng được liệt kê ở đây. Số liệu có
thể thay đổi theo migration được nhóm chấp thuận. Xem thêm [DATABASE.md](DATABASE.md)
và [ERD.md](ERD.md); không chạy các lệnh phá hủy hoặc seed trong tài liệu cũ
trên database dùng chung.
