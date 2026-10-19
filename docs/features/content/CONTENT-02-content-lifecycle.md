# CONTENT-02 — Vòng đời nội dung và phiên bản

**Mức:** Kỹ — luồng nghiệp vụ quan trọng  
**Owner:** TEAM_MEMBER_B  
**Commit:** `p2: implement content lifecycle and versioning`

## Mục tiêu và bất biến

Contributor tạo và biên tập nội dung của mình; Contributor hoặc Admin xuất bản trực tiếp; Admin quản trị nội dung toàn nền tảng và archive. Trạng thái chỉ `draft`, `published`, `archived`; không có reviewer/submission/rejection. Guest/User chỉ xem nội dung published, chưa soft-delete. `article_versions` là snapshot lịch sử; learner xem phiên bản được trỏ bởi `published_version_id`.

Thành phần: Next.js → Content API → Authentication → Article Policy → Content service → `articles`, `article_versions`, taxonomy/attachment nếu liên quan → PostgreSQL.

## Luồng activity

**Tạo draft:** Contributor gửi nội dung → backend xác thực và kiểm tra Contributor → tạo article owner=current actor và draft trong transaction cùng snapshot version theo quy tắc version đã duyệt → trả bản nháp. User/Guest bị từ chối.

**Sửa draft:** Contributor sửa của mình; Admin có quyền theo ma trận → service kiểm tra ownership/soft-delete/status → tạo snapshot bất biến với version_no hợp lệ → giữ bản đang publish nguyên vẹn nếu có → trả draft/version.

**Publish:** Contributor publish nội dung của mình hoặc Admin publish → validate dữ liệu cần xuất bản và version thuộc đúng article → trong một transaction cập nhật `published_version_id` và `status=published` → độc giả nhận đúng snapshot đó.

**Sửa nội dung đã publish:** không ghi đè snapshot đang được learner xem. Tạo revision mới; learner tiếp tục thấy published version cũ cho tới khi publish phiên bản mới. Cách lưu draft song song/state revision cần khớp schema thật.

**Archive:** Admin archive theo invariant được duyệt → chặn discoverability/read của Guest/User sau archive → không xóa version lịch sử. Archive của Contributor không được tự giả định được phép.

## Nhánh lỗi và tính toàn vẹn

- Guest/User ghi hoặc đọc draft: từ chối; không tiết lộ draft.
- Contributor không sở hữu article: từ chối cả read/write mutation riêng tư.
- Article/version bị xóa, version_no trùng, dữ liệu invalid: từ chối, không cập nhật một nửa.
- Version thuộc article khác: reject bắt buộc; DB hiện không tự enforce cross-article integrity.
- Publish thất bại giữa cập nhật status/published_version: rollback cả hai.
- Archive và publish đồng thời: xác định state hợp lệ/serialize bằng quy tắc transaction/locking đã duyệt; không để trạng thái lai.
- Soft-delete article: giữ version audit; không xuất hiện trong truy vấn public.

## Chờ xác nhận trước code

Schema hiện mô tả `articles` như “course content material”, còn ADR nói Course là unit chính nhưng schema Course→Section→Material TBD. **Không thiết kế lại thành course hierarchy trong feature này.** Xác định các trường nội dung hiện có, version policy, quy tắc publish lại/archive/unarchive, giới hạn tải, API contract từ migration/code thật. Không dùng bảng `article_reviews`.

## Test sâu

- Bốn actor × draft/published/archived × owner/non-owner.
- Version tăng đúng, không sửa lịch sử, không đổi public snapshot trước publish.
- Published version thuộc đúng article; rollback khi bất kỳ bước publish nào lỗi.
- Archive không xóa audit; nội dung archived/soft-deleted bị loại khỏi public API, search, roadmap link theo quyết định.
- Race hai lần sửa/publish cùng lúc: không duplicate version_no, không mất cập nhật âm thầm.
- Kiểm tra mọi query đọc công khai áp dụng cùng visibility/soft-delete rules.

## Gate và commit

- [ ] Đối chiếu migration/schema/code và mọi state transition.
- [ ] API contract, fields/version policy, archive policy đã được duyệt.
- [ ] Tests permission, ownership, rollback, version integrity, concurrency, public visibility đạt.
- [ ] Staged diff chỉ thuộc task; test liên quan chạy.
- [ ] Commit khi đủ điều kiện: `p2: implement content lifecycle and versioning`.