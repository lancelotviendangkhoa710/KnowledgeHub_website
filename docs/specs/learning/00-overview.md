# Learning — Tổng quan đặc tả

**Trạng thái:** Phân tích dựa trên source hiện tại; chưa phải phê duyệt API hay nghiệp vụ chưa chốt.  
**Owner:** `TEAM_MEMBER_C` (`docs/team/OWNERSHIP.md`).  
**Nguồn code:** repository `D:\Web` tại thời điểm khảo sát; backend Learning đã triển khai (12 route, xem §2).

## 1. Mục tiêu, phạm vi, căn cứ

Đặc tả ba chức năng đã xác nhận trong thư mục yêu cầu: `LEARN-01-roadmaps.md` (quản lý roadmap), `LEARN-02-progress.md` (theo dõi tiến độ), `LEARN-03-prerequisites.md` (điều kiện tiên quyết). Mục tiêu người dùng là lập kế hoạch học cá nhân, theo dõi trạng thái từng bước, biểu diễn phụ thuộc giữa các bước. Đây là roadmap của người dùng, **không phải** enrollment/course-wide progress.

**Trong phạm vi:** mô tả triển khai tương thích Laravel 11 REST API, Next.js scaffold, schema Learning hiện hữu; quyền sở hữu, dữ liệu, luồng, UI đề xuất, test, blockers.  
**Ngoài phạm vi:** code, migration/schema alteration được mặc định, enrollment, mô hình Course→Section→Material, AI-generated roadmap, thay đổi Content/Auth, tự quyết các câu hỏi nghiệp vụ chưa được duyệt.

### Tài liệu nguồn đã đọc

- `D:\Web\AGENTS.md`, `D:\Web\backend\AGENTS.md`
- `D:\Web\docs\features\learning\LEARN-01-roadmaps.md`
- `D:\Web\docs\features\learning\LEARN-02-progress.md`
- `D:\Web\docs\features\learning\LEARN-03-prerequisites.md`
- `D:\Web\docs\team\context-packs\learning.md`, `D:\Web\docs\team\OWNERSHIP.md`, `D:\Web\docs\team\WORKFLOW.md`, `D:\Web\docs\team\FEATURES.md`, `D:\Web\docs\team\TASK_TEMPLATE.md`
- `D:\Web\README.md`, `D:\Web\docs\ARCHITECTURE.md`, `D:\Web\docs\API.md`, `D:\Web\docs\DATABASE.md`, `D:\Web\docs\ERD.md`, `D:\Web\docs\features\README.md`
- `D:\Web\database\migrations\2026_01_01_000008_create_learning_roadmap_tables.php`
- `D:\Web\backend\routes\api.php`, `D:\Web\backend\routes\api\content.php`, `D:\Web\backend\tests\Feature\Content\ArticleTest.php`
- `D:\Web\frontend\package.json`, `D:\Web\frontend\src\lib\api.ts`, `D:\Web\frontend\src\lib\contentClient.ts`, `D:\Web\frontend\src\app\(app)\layout.tsx`, các trang/component trong `D:\Web\frontend\src\app` và `D:\Web\frontend\src\components`.
- ADR đã kiểm tra trong `D:\Web\docs\decisions`; các skill database/API/domain yêu cầu đều có trong `D:\Web\skills`.

### Trạng thái xác minh

| ID | Mệnh đề | Trạng thái | Căn cứ |
|---|---|---|---|
| V-01 | Có ba chức năng nguồn, đúng tên như trên | CONFIRMED | Ba file trong `docs/features/learning/` |
| V-02 | Stack Laravel 11, PostgreSQL 16, Next.js/React/TypeScript | CONFIRMED | `AGENTS.md`, `docs/ARCHITECTURE.md`, `frontend/package.json` |
| V-03 | Schema bốn bảng Learning đã có migration; không có migration mới được giả định | CONFIRMED | migration `000008` |
| V-04 | Backend app Learning đã tracked; 12 route Learning đã đăng ký | CONFIRMED 2026-10-22 | `backend/app`, `backend/routes/api/learning.php`, `docs/API.md` v0.4 |
| V-05 | Frontend có trang roadmap list/create/delete; chưa có UI item/progress/prerequisite | PARTIAL | `frontend/src` |
| V-06 | Backend dùng `auth:sanctum`; token UUID hoạt động; chưa có endpoint phát token | CONFIRMED / OPEN QUESTION (p1) | `backend/app/Providers/AppServiceProvider.php`, `frontend/src/lib/api.ts` |
| V-07 | Roadmap owner/Admin; item position unique; progress item-scoped; DAG cycle check service | CONFIRMED theo context/schema | `context-packs/learning.md`, migration, `docs/DATABASE.md` |
| V-08 | OQ-05 đã chốt; state/CRUD/article visibility/cross-roadmap prerequisite/concurrency strategy còn mở | PARTIAL | Ba feature specs nguồn, ADR `2026-10-22-learning-progress-authority` |

## 2. Kiến trúc Learning hiện tại

Thực tế hiện có là schema, backend Learning đã tracked và một phần frontend:

```text
Next.js App Router (trang roadmap list/create/delete; chưa có UI item/progress/prerequisite)
    → frontend/src/lib/api.ts (generic fetch client; Bearer localStorage)
    → Laravel REST API (12 route Learning; auth:sanctum; service/policy/request)
    → PostgreSQL (migration 000008 + data backfill OQ-05)
```

`Policy`, `Form Request`, `Service`, `Model`, route và test Learning đã tồn tại. Content route là pattern tham khảo. `docs/API.md` v0.4 là contract hiện hành cho 12 route Learning.

### Thành phần nên tái sử dụng / phạm vi có khả năng tác động

| Vị trí | Hiện trạng, hướng dùng |
|---|---|
| `frontend/src/lib/api.ts` | Generic API client; reuse, không tự thêm auth/refresh semantics. |
| `frontend/src/app/(app)/layout.tsx`, `components/layout/SiteHeader.tsx` | Shell dùng chung; chỉ tích hợp navigation nếu được duyệt. |
| `frontend/src/app/(app)/courses/page.tsx`, `components/content/CourseCard.tsx` | UI/content pattern tham khảo; article không được đồng nhất với course mới. |
| `backend/routes/api.php` | Registry shared hotspot; đã include `routes/api/learning.php`. |
| `backend/routes/api/learning.php` | Đã tồn tại; 12 route, `whereUuid` constraints. |
| `backend/app/Http/Controllers/Learning/**`, `Requests/Learning/**`, `Models/{LearningRoadmap,RoadmapItem,LearningProgress}.php`, `Policies/RoadmapPolicy.php`, `Services/Learning/**` | Đã tracked; progress authoritative, item status mirror. |
| `database/migrations/2026_01_01_000008_create_learning_roadmap_tables.php` | Schema có sẵn; không chỉnh. Có migration data `2026_10_22_000001` backfill OQ-05. |
| `backend/tests/Feature/Learning/**`, `backend/tests/Unit/Learning/**` | Đã có test; 41 test backend pass ngày 2026-10-22. |
| `frontend/src/app/(app)/learning/**`, `frontend/src/components/learning/**` | Đã có trang roadmap cơ bản; UI item/progress/prerequisite còn thiếu. |

### Convention / giới hạn

- UUID v4; `timestampTz`; enum là `VARCHAR + CHECK`; quan hệ FK có cascade được migration quy định.
- Backend: thin controller → authorize/validate → service; `Policy/Gate`, `Form Request`; transaction cho multi-step write. Đã triển khai cho Learning.
- API response convention: `{data, message, status}`; `docs/API.md` v0.4 là contract hiện hành cho 12 route Learning.
- User chỉ đọc/sửa roadmap của mình; Admin có quyền theo context pack. Guest bị từ chối. Contributor dùng quyền User để học; quyền Contributor không tự cấp quyền xem roadmap người khác.
- Progress gắn `roadmap_item_id` 1:1; không có user_id trực tiếp trong progress, ownership phải suy ra qua item→roadmap.
- `roadmap_items.article_id` nullable, FK `ON DELETE SET NULL`; link đến `articles` là domain Content, không được sửa schema/semantics Content tùy ý.
- Repo tracked backend Learning; test chạy được bằng `docker compose exec app php artisan test` (đã xác minh 2026-10-22).

## 3. Quan hệ và thứ tự triển khai

| Chức năng | Phụ thuộc | Thành phần dùng chung | Thứ tự triển khai | Rủi ro tích hợp |
|---|---|---|---|---|
| `LRN-001` Roadmaps | Schema `learning_roadmaps`, `roadmap_items`; auth/ownership; contract Article nếu link content | Roadmap policy, API client, shell, shared Roadmap/Item models/services | Nền tảng trước; cần chốt CRUD/state/position/content link trước implementation | Cao: state/CRUD chưa duyệt; Article là domain Content; transaction reorder, schema unique |
| `LRN-002` Progress | Roadmap item tồn tại; ownership kiểm tra qua roadmap; `learning_progress` 1:1 | Roadmap policy, item model, progress service/API client/UI detail | OQ-05 đã chốt: progress status authoritative, item status mirror; còn UI/auth issuer | Trung bình: đã có transaction/upsert và timestamp test; UI chưa có |
| `LRN-003` Prerequisites | Hai roadmap items và roadmap scope được xác định; service graph check | Roadmap policy, item model/service, transaction, cùng roadmap UI | Sau quyết định cùng/cross-roadmap và concurrency/locking; triển khai cuối hoặc trước đó chỉ test graph pure | Rất cao: scope chưa duyệt; concurrent cycle; DB chỉ cấm self-reference, không cấm cycle |

**Độc lập/phụ thuộc:** ba feature dùng chung `roadmap_items`; LRN-002/003 không thể thao tác nếu chưa có item và quyền truy cập của LRN-001. Chúng không cần phụ thuộc nhau về nghiệp vụ đã xác nhận. Tích hợp progress vào readiness/prerequisite behavior chưa được xác định; không được tự chặn item vì progress. Cùng roadmap cho prerequisite là OPEN QUESTION, không suy ra chỉ do graph nằm trong roadmap.

## 4. Quyết định kiến trúc chung cần giữ

1. Backend là ranh giới tin cậy; mọi request truy cập roadmap/item/progress/edge phải xác thực actor, authorize qua roadmap owner/Admin và kiểm tra ID liên kết. UI hide/disable không thay authorization.
2. Dùng cấu trúc Laravel/domain theo `backend/AGENTS.md`: route domain Learning, Form Request, Policy, service, transaction cho write nhiều bước. Không có code Learning hiện tại để tái sử dụng ngoài schema.
3. Không chốt API path/payload/status/error envelope đến khi contract được duyệt và cập nhật `docs/API.md`. API minh họa trong feature specs nếu có đều là PROPOSED.
4. Client dùng `api.ts`; lỗi cần được phân biệt bởi HTTP status/error payload. Không fallback sang mock data cho dữ liệu cá nhân Learning; content client mock fallback không được áp dụng cho write hoặc user-specific data.
5. Progress chỉ cập nhật tracker per roadmap item; không suy ra enrollment, tổng % course, thời gian học, auto-completion roadmap hoặc đồng bộ bookmark.
6. Graph prerequisite cần kiểm tra full graph trong service. Cách serialize thao tác đồng thời chưa được chốt; không xem transaction đơn lẻ/validation trước ghi là đủ bảo vệ cycle.

## 5. Vấn đề chưa giải quyết

| ID | Mục | Mức ảnh hưởng | Chức năng | Cần quyết định |
|---|---|---|---|---|
| OQ-01 | CRUD roadmap/item, title/goal validation/limits, item add/remove/reorder, empty roadmap | Blocker trước contract | LRN-001 | Product xác nhận use cases, bounds, atomicity |
| OQ-02 | Chuyển trạng thái roadmap hợp lệ, archived editability, auto-complete | Blocker nghiệp vụ | LRN-001 | Product xác nhận transition matrix |
| OQ-03 | Admin visibility: có quyền xem mọi roadmap hay chỉ sửa/quản lý theo capability | Blocker bảo mật | Tất cả | Owner/PM phê duyệt authorization matrix; mặc định an toàn trong thiết kế là không suy rộng quyền |
| OQ-04 | Khi nào article được gắn; published/archived/deleted behavior; version snapshot | Blocker cross-domain | LRN-001 | Content owner xác nhận read/visibility contract; không đổi Content schema |
| OQ-05 | Status source of truth giữa `roadmap_items.status` và `learning_progress.status`; ý nghĩa timestamps, skipped/reopen | **RESOLVED 2026-10-22** | LRN-002 | `learning_progress.status` authoritative; item status là mirror transaction; item endpoints reject `status`; xem `docs/decisions/2026-10-22-learning-progress-authority.md` |
| OQ-06 | Scope prerequisite cùng roadmap hay cross-roadmap; semantics completed/skipped | Blocker nghiệp vụ/bảo mật | LRN-003 | Product quyết định; tránh truy cập graph ngoài owner scope |
| OQ-07 | Chống race tạo cycle đồng thời; serialization/lock/isolation | Blocker tính đúng đắn | LRN-003 | Backend/DB owner thiết kế, test concurrent transaction |
| OQ-08 | Endpoint, auth runtime/backend token, response/error/pagination | Blocker integration | Tất cả | Chốt contract sau khi bootstrap/backend auth có thể xác minh; cập nhật `docs/API.md` |
| A-01 | Có thể tạo page riêng `/learning` và đặt API client feature cạnh pages/component | Có thể tiếp tục an toàn như đề xuất | Tất cả | Xác nhận trong implementation; UI chưa có design source |
