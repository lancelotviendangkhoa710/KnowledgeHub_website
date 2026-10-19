# CONTENT-01 — Quản lý danh mục

**Mức:** Kỹ  
**Owner:** TEAM_MEMBER_B  
**Commit:** `p2: implement category management`

## Mục tiêu, actor, thành phần

Admin/Contributor tổ chức nội dung theo `categories`; khách và người học khám phá nội dung đã xuất bản. DB mô tả phân cấp self-reference `parent_id`; `articles.category_id` có thể SET NULL khi category bị xóa. Quyền tạo/sửa/xóa category chính xác **chờ sản phẩm duyệt**; không suy từ “manage categories” của Admin thành quyền Contributor nếu thiếu ma trận cụ thể.

Frontend → Content API → authentication + Policy → category service → categories/articles → PostgreSQL.

## Activity

Đọc danh sách: actor yêu cầu danh sách → API chỉ trả category khả kiến theo chính sách đã duyệt → frontend dựng cây/danh sách.

Tạo/cập nhật: actor gửi tên/slug/parent → backend validate → kiểm tra quyền → kiểm tra parent tồn tại, không soft-delete và không gây chu trình → transaction ghi thay đổi → trả tài nguyên.

Xóa/lưu trữ: kiểm tra quyền, category tồn tại và quan hệ nội dung/con; xử lý theo semantics đã duyệt. FK category/article SET NULL không đồng nghĩa tự động được phép xóa category hoặc xóa cây.

## Chờ duyệt

Slug sinh tự động hay client cung cấp; slug đổi có redirect không; xóa cứng/soft-delete/archive; xử lý cây con; rule xóa category còn nội dung; visibility của draft; quyền Contributor; reorder; độ sâu tối đa; API pagination/filter.

## Kiểm tra kỹ

- Parent chính nó, parent là hậu duệ, chu trình nhiều cấp, parent đã xóa/không tồn tại.
- Slug trùng, chuẩn hóa Unicode/case, hai request tạo cùng slug đồng thời.
- Category đang được article tham chiếu; xóa không âm thầm làm sai trải nghiệm/lọc.
- Pagination/filter không vô tình lộ draft hoặc category nội bộ.
- Transaction cho thao tác nhiều bước; xác nhận thứ tự FK và soft-delete theo migration thực tế.

## Gate hoàn tất và commit

- [ ] Các trường hợp Given/When/Then về quyền, cycle, conflict và quan hệ article bên dưới đều đạt.
- [ ] Actor/permission đã định nghĩa rõ cho mỗi thao tác.
- [ ] Given/When/Then: actor được phép CRUD; actor bị từ chối không ghi dữ liệu.
- [ ] Given parent tự thân, hậu duệ hoặc đã xóa; When tạo/cập nhật; Then reject và không tạo cycle.
- [ ] Given slug/category conflict hoặc category còn article; When ghi/xóa; Then policy đã duyệt được thực thi, không xóa quan hệ ngoài ý muốn.
- [ ] Ma trận quyền và semantics cây/xóa được duyệt.
- [ ] Test chu trình, slug trùng/đồng thời, parent mất, article tham chiếu, actor.
- [ ] Không rò draft; DB không đổi khi reject.
- [ ] Staged diff đúng task; test liên quan chạy.
- [ ] Commit khi đủ điều kiện: `p2: implement category management`.