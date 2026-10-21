# LRN-002 — Theo dõi tiến độ roadmap item

**Nguồn:** `D:\Web\docs\features\learning\LEARN-02-progress.md`  
**Owner:** `TEAM_MEMBER_C`; trạng thái: nghiệp vụ chưa chốt ở status semantics/API. Đọc `00-overview.md`.

## 1. Mục tiêu, actor, phạm vi

Theo dõi trạng thái học **trên mỗi `roadmap_item` thuộc roadmap cá nhân**. `learning_progress` có quan hệ 1:1 với item. Không phải enrollment, global course/article progress hay phần trăm tiến độ khóa học.

**Actors:** Guest bị từ chối; User/Contributor chỉ item trong roadmap mình sở hữu; Admin theo quyền được duyệt.  
**IN SCOPE:** đọc/cập nhật tracker theo item sau khi chốt status contract; owner checks; timestamp consistency; idempotent/concurrent update.  
**OUT OF SCOPE:** enrollment, global course progress, duration/time spent, auto-complete roadmap, bookmark synchronization, completion percentage, reset/reopen semantics nếu chưa duyệt.

**Tiền điều kiện:** actor authenticated; item tồn tại, thuộc roadmap có quyền; migration `000008`.  
**Điều kiện đạt:** tối đa một tracker cho item; status/timestamp nhất quán theo quyết định được duyệt; không ghi nhầm item cùng article ở roadmap khác.

## 2. Căn cứ và source map

| ID | Xác nhận/nội dung | Trạng thái |
|---|---|---|
| R-101 | Progress scoped 1:1 theo roadmap item, không global course progress | CONFIRMED: feature source/context pack/schema |
| R-102 | `learning_progress.status`: `pending`, `in_progress`, `completed`, `skipped`; default pending; CHECK | CONFIRMED schema |
| R-103 | `started_at`, `completed_at` nullable; `updated_at`; không có `created_at` | CONFIRMED schema |
| R-104 | Owner policy qua item→roadmap; Guest denied | CONFIRMED context pack |
| R-105 | Completed semantics, timestamps, skipped/in-progress, reopen/reset, auto-completion chưa định nghĩa | OPEN QUESTION, blocker |
| R-106 | `roadmap_items.status` cũng có cùng status enum song song progress | CONFIRMED; source-of-truth chưa định nghĩa |
| S-101 | `database/migrations/2026_01_01_000008_create_learning_roadmap_tables.php` |
| S-102 | `backend/AGENTS.md`, `backend/routes/api.php`, `docs/API.md`; Learning app/API chưa tồn tại |
| S-103 | `frontend/src/lib/api.ts`, `frontend/src/app/(app)/layout.tsx`; chưa có Learning UI |
| S-104 | `docs/DATABASE.md`, `docs/ERD.md`, `docs/team/context-packs/learning.md` |

## 3. Business rules

| ID | Quy tắc | Ngoại lệ | Trạng thái |
|---|---|---|---|
| BR-101 | Mọi progress access phải authorize item→roadmap; actor client không thể chọn tracker của user khác. | Không tồn tại hoặc foreign item: deny, không reveal resource. | CONFIRMED |
| BR-102 | Tối đa một `learning_progress` per `roadmap_item_id`; DB unique là final guard. | Concurrent create: không được tạo duplicate; use atomic upsert/transaction/unique handling sau khi API decision duyệt. | CONFIRMED schema; implementation strategy đề xuất |
| BR-103 | Status nhận đúng bốn giá trị CHECK; client validation không thay server validation. | Unknown status → reject, không ghi dữ liệu. | CONFIRMED |
| BR-104 | `roadmap_items.status` và `learning_progress.status` đều có status; không được ghi cả hai theo suy đoán. | Nếu chọn một source, field còn lại phải có consistency/migration decision riêng; schema alteration không nằm scope tự động. | OPEN QUESTION / blocker |
| BR-105 | Semantics của `started_at`/`completed_at`, skipped, reopen/reset, timestamp update chưa được xác định. | Không tự set timestamp/clear timestamp cho status transition. | OPEN QUESTION / blocker |
| BR-106 | Tracker tồn tại không chứng minh người học enrollment hay hoàn thành course. | Không trả course-level completion. | CONFIRMED |
| BR-107 | Delete item cascade xóa progress; không báo success nếu item/tracker không được update theo semantics API đã duyệt. | Delete behavior/UI xác nhận cùng roadmap CRUD. | CONFIRMED schema; response handling OPEN QUESTION |

### State transition

DB cho phép `pending|in_progress|completed|skipped`; đây là tập hợp hợp lệ, **không phải** transition matrix. Không định nghĩa completed timestamp, started timestamp, reopening, skipped semantics, roadmap auto-completion. `roadmap_items.status` trùng enum `learning_progress.status`; phải xác định authoritative field trước implementation (OQ-05). Đây là **blocker**, không chỉ chi tiết kỹ thuật.

## 4. Luồng chi tiết

### 4.1 Đọc trạng thái item

1. User xem detail roadmap/item; UI Loading; roadmap/item context phải đến từ API được authorize.
2. Client gọi progress read API (endpoint chưa có; candidate nếu REST duyệt: nested resource dưới roadmap/item, không phải contract).
3. Backend xác thực actor, load item cùng parent roadmap, áp dụng Policy trước khi expose tracker.
4. Tracker chưa có: API trả trạng thái mặc định chỉ sau khi quyết định read representation; không tự tạo row chỉ để GET nếu contract không yêu cầu.
5. Tracker có: trả trạng thái duy nhất theo unique item ID.
6. UI render status/timestamps theo semantics được duyệt. Missing item/foreign owner/server error đi nhánh lỗi; không fallback mock.

### 4.2 Cập nhật trạng thái (blocked đến khi OQ-05 chốt)

1. User chọn trạng thái từ tập transition đã duyệt; UI hiển thị state hiện tại, Pending submit và disable thao tác lặp.
2. Client gửi status allowlist; không cho client gán `roadmap_item_id` ngoài path, user ID, timestamps server-managed.
3. Backend auth → resolve item + roadmap → Policy → Form Request validate allowed status/transition → service.
4. Service atomic upsert theo unique `roadmap_item_id`; nếu state rule yêu cầu đồng thời update `roadmap_items.status`, làm trong transaction sau khi authority/consistency được duyệt.
5. Timestamp do server derive theo rule được duyệt; currently unspecified—không implement default transition behavior.
6. Success trả canonical progress; UI cập nhật từ response. Duplicate request phải idempotent: repeated same status không nhân row/time; timestamp behavior phụ thuộc approved rule.
7. Concurrent conflicting updates: optimistic versioning chưa có schema; phải chốt last-write/lock/reject policy. Không silently overwrite; unresolved conflict trả error + refresh.
8. 422 giữ lựa chọn/form và hiển thị lỗi cụ thể; 401 auth flow; 403/404 no leak; 5xx/network hiển thị trạng thái chưa xác định và yêu cầu reload trước retry nếu write có thể đã commit.

```mermaid
sequenceDiagram
  actor U as User
  participant UI as Learning UI (chưa có)
  participant API as Laravel Learning API (chưa có)
  participant P as Policy/Service (dự kiến)
  participant DB as PostgreSQL
  U->>UI: chọn status đã được duyệt
  UI->>API: update item progress (PROPOSED)
  API->>API: authenticate + validate request
  API->>P: authorize item→roadmap ownership
  P->>DB: load scoped item/progress
  DB-->>P: item + optional tracker
  P->>P: validate transition (chỉ sau quyết định nghiệp vụ)
  P->>DB: atomic upsert; transaction nếu sync item status
  DB-->>P: canonical row hoặc constraint/error
  P-->>API: result/error
  API-->>UI: response theo contract chưa chốt
  UI-->>U: success/error + actionable refresh/retry
```

## 5. UI states (đề xuất, UI chưa tồn tại)

| Component | Hiển thị | Trạng thái / thoát |
|---|---|---|
| Progress indicator trên roadmap item | Status hiện tại; timestamp chỉ khi semantics duyệt | Initial; Loading; Success; Empty/Not started khi không row theo contract; Error với retry; Unavailable nếu prerequisite access không hợp lệ |
| Status selector/action | Chỉ các transition cho phép, không chỉ enum toàn bộ | Pending disable; Validation error cạnh field; API error thông báo khu vực component; sau conflict reload canonical value |

Không có label, control (menu/button), color, date format hay text được yêu cầu nguồn. Không trình bày phần trăm/toàn khóa. Không dùng frontend để quyết định authorization.

## 6. Dữ liệu, validation

| Field | Kiểu | Bắt buộc | Validation/normalize | Biên | Nguồn |
|---|---|---:|---|---|---|
| `roadmap_item_id` | UUID FK unique | DB required | Server lấy từ authorized route/context; client không gửi ID chéo | item phải tồn tại | migration |
| `status` | VARCHAR(20) | non-null; default pending | allowlist + transition (transition TBD), server validate | 4 enum values | migration |
| `started_at` | TIMESTAMPTZ nullable | Không | Server-managed; set/clear policy TBD | timezone aware | migration |
| `completed_at` | TIMESTAMPTZ nullable | Không | Server-managed; set/clear policy TBD | timezone aware | migration |
| `updated_at` | TIMESTAMPTZ nullable | Không (schema nullable) | server-managed | timezone aware | migration |
| `id` | UUID PK | yes | server generated | UUID v4 project rule | migration/AGENTS |

Không có `user_id` ở progress: mọi authorization phải join qua `roadmap_items.roadmap_id → learning_roadmaps.user_id`. Client không gửi timestamp, owner, tracker ID tùy ý. Không có numeric progress/time-spent field. Client/server cùng validate status; server kiểm tra owner và transition.

## 7. API/database contract

**Implemented API: none.** `docs/API.md` ghi Learning 0 endpoint. Path/method/request/response/error đều chưa duyệt. Candidate operation có thể là GET status và PUT/PATCH status nested dưới item, nhưng đây chỉ là **RECOMMENDATION**, không phải endpoint thực tế; không chép vào code mà chưa duyệt. Không bịa JSON response/envelope.

Schema hiện tại đủ chứa tracker/status/timestamps, nhưng không đủ chứng minh consistency giữa hai status column. Không đề xuất migration tự động. Nếu Product chọn source-of-truth yêu cầu bỏ/sync field, cần schema/API decision và migration mới được duyệt riêng. Upsert phải dựa unique index; multi-table write transaction. Delete item cascade progress; transaction integration với prerequisite edge theo DB FK.

## 8. Ma trận lỗi

| ID | Tình huống | Nơi xử lý | Hành vi | UI/response | Retry? |
|---|---|---|---|---|---|
| E-101 | Guest | Auth middleware | reject trước DB data | 401/auth flow | sau auth |
| E-102 | Foreign item/roadmap | Policy/query scope | deny, không leak | 403/404 theo contract | Không |
| E-103 | Item ID không tồn tại | scoped lookup | no write | 404 hoặc 422 theo route contract | Không; refresh |
| E-104 | Status sai/transition cấm | Form Request/service | no write | 422 field/transition error | sau sửa/refresh |
| E-105 | Hai request tạo tracker cùng lúc | DB unique + service | chỉ một row; conflict được xử lý canonical | return same canonical state hoặc conflict theo contract | Idempotent same input |
| E-106 | Hai cập nhật khác status đồng thời | concurrency policy TBD | không silently overwrite đến khi policy chốt | conflict + refresh đề xuất | Sau refresh |
| E-107 | Item bị xóa giữa xử lý | FK cascade/transaction | không tạo orphan; rollback/zero result | not found/stale item | refresh |
| E-108 | DB/5xx/network timeout sau commit không rõ | API/client | không khẳng định thất bại/thành công; re-read canonical | error + refresh before retry | Read retry; write sau re-read |
| E-109 | Row item status và progress lệch | service/integrity test | không tự chọn row thắng | blocker; báo inconsistency | Không đến khi có repair rule |

## 9. Bảo mật/hiệu năng/vận hành

- Policy authorize item→roadmap ở backend cho read/write; filter resource theo owner; không tin item/tracker UUID client.
- Không log private learning status/timestamp nếu không cần; response chỉ tracker của authorized item.
- Unique `learning_progress.roadmap_item_id` hỗ trợ 1:1 lookup/upsert; load một item/progress, tránh N+1 trong roadmap list (eager load nếu hiển thị tracker nhiều item).
- Không có pagination/cache requirement; user data không nên đi qua public cache. Retry policy tách read và write như E-108.

## 10. Acceptance criteria và tests

| AC | Given / When / Then | Req |
|---|---|---|
| AC-01 | Given item trong roadmap của User A, When A đọc progress, Then chỉ progress item đó trả về | R-101 |
| AC-02 | Given foreign item UUID, When User B đọc/update, Then bị từ chối, không đọc/ghi tracker | R-104 |
| AC-03 | Given Guest, When GET/PUT progress, Then auth từ chối | R-104 |
| AC-04 | Given status ngoài CHECK, When update, Then server từ chối và DB không đổi | R-102 |
| AC-05 | Given hai concurrent tạo cùng item, When commit, Then tối đa một tracker tồn tại | R-102 |
| AC-06 | Given item thuộc hai roadmap liên kết cùng article, When cập nhật item A, Then item B/progress B không đổi | R-104 |
| AC-07 | Given requirement không chốt completed/timestamps/source-of-truth, When code được triển khai, Then không tự suy luận semantics; task dừng tại blocker | R-105/R-106 |
| AC-08 | Given roadmap item deleted theo cascade, When truy vấn progress, Then không còn orphan tracker | R-107 |

| Test ID | Req | Loại | Tiền điều kiện/action | Expected | Mức |
|---|---|---|---|---|---|
| T-101 | R-104 | Feature/API | Guest get/update | 401, no write | Integration |
| T-102 | R-104 | Feature/API | User A item vs User B item | foreign deny/no leak | Integration |
| T-103 | R-102 | Unit/Feature | enum invalid | 422 + no DB change | Unit+Integration |
| T-104 | R-102 | Concurrent integration | parallel create same item | one row, deterministic response | Integration |
| T-105 | R-104 | Feature | two items same `article_id` in distinct roadmaps | target-only update | Integration |
| T-106 | R-107 | DB integration | delete parent item | cascade removes tracker | Integration |
| T-107 | R-105 | Feature | all approved transitions/timestamps | exact state + timestamp rule | Integration, blocked until OQ-05 |
| T-108 | R-106 | Unit/Integration | update status where duplicate column present | consistency exactly per approved authority | Integration, blocked |
| T-109 | R-104 | End-to-end | user change status then refresh | canonical persisted state shown | E2E, after UI |

Mở rộng `backend/tests/Feature/Learning/**`, `backend/tests/Unit/Learning/**`; frontend test framework hiện chưa có trong `package.json`; không tự thêm dependency. Backend command docs: `docker compose exec app php artisan test`; chưa xác minh runtime testability.

## 11. Source mapping và tasks

| Module/file | Trạng thái | Thay đổi dự kiến | Req |
|---|---|---|---|
| Migration `000008` | Hiện hữu | Reuse; không edit | R-101–107 |
| `LearningProgress` model, `RoadmapItem` relationship | Chưa tồn tại tracked | Tạo theo convention nếu bootstrap/task cho phép | R-101–107 |
| `RoadmapPolicy`, Learning service/request/controller/routes | Chưa tồn tại | Tạo theo approved API | R-104 |
| `frontend/src/lib/api.ts` | Hiện hữu | Reuse; feature calls không mock fallback | R-101 |
| Learning component/page | Chưa tồn tại | Tạo sau contract/UI decision | R-101 |
| Tests Learning | Chưa tồn tại | Unit/feature + concurrency DB tests | R-101–107 |
| `docs/API.md` | API inventory Learning 0 | Cập nhật sau approval | R-101 |

| Task | Dependency | Files dự kiến | Kết quả/steps | Test + DONE |
|---|---|---|---|---|
| LRN-002-T0 | Roadmap item contract; quyết OQ-05/OQ-08 | Docs/API sau approval | Chốt authority, transition/timestamps, response, conflict policy; xác nhận không enrollment | Product/API signoff; DONE có decision record |
| LRN-002-T1 | T0 + bootstrap | Learning model/policy/service/requests | Scoped access, atomic one-to-one write/upsert, timestamp behavior | Unit/Feature/concurrency; DONE AC-01–08 pass |
| LRN-002-T2 | T1 + API contract | Learning route/controller/API docs coordination | Implement read/update, errors, auth | API tests; DONE contract/status cases pass |
| LRN-002-T3 | T2 + approved UI design | Learning UI components/page | Indicator, control, loading/error/conflict refresh | E2E; DONE AC-09 equivalent verified |

## 12. Assumptions, open questions, blockers

- **ASSUMPTION A-101:** tracker absent may be represented as `pending` for display; do not write row on GET unless approved.
- **OPEN QUESTION OQ-05:** `roadmap_items.status` vs `learning_progress.status` authority, transitions, timestamps, skipped/reopen/reset, auto-completion. **Implementation blocker.**
- **OPEN QUESTION OQ-08:** route/auth/response/error contract and runtime auth. **Integration blocker.**
- **BLOCKER:** do not implement status writes or timestamps before OQ-05 is decided; do not broaden to enrollment/course completion.
