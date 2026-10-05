# Decision: Use Case & Actor Analysis – RBAC Authorization Design

**Status**: Proposed  
**Date**: 2026-10-05  
**Author**: AI Agent (Cline)  
**Related**: `docs/DATABASE.md` §2A, `docs/ERD.md` Domain A, migration `000002`

---

## Context

Phân tích thiết kế use case, actor và phân quyền dựa trên schema DB hiện tại.  
Mục tiêu: xác định rõ actor, use case từng domain, ma trận RBAC, và các gap cần xử lý ở app layer.

---

## Actors

| Actor | Role (DB `roles`) | Mô tả |
|---|---|---|
| **Guest** | *(không có role)* | Chưa đăng nhập, chỉ xem published content |
| **Learner** | `learner` | Đọc bài, bookmark, chat AI, tạo roadmap cá nhân |
| **Contributor** | `contributor` | Learner + tạo/sửa article (own), upload attachment |
| **Reviewer** | `reviewer` | Contributor + review/approve/reject article version |
| **Admin** | `admin` | Toàn quyền: quản lý user, role, plan, ban account |

> `user_roles` many-to-many → user có thể giữ nhiều role đồng thời.

---

## Use Cases theo Domain

### Domain A – Identity & Phân quyền

| UC | Mô tả | Actor |
|---|---|---|
| UC-A1 | Đăng ký tài khoản | Guest |
| UC-A2 | Đăng nhập / xác thực email | Guest → Learner |
| UC-A3 | Gán / thu hồi role | Admin |
| UC-A4 | Khoá / mở tài khoản (`banned`) | Admin |
| UC-A5 | Xem profile | Mọi user đã đăng nhập |

### Domain B – Knowledge Base

| UC | Mô tả | Actor |
|---|---|---|
| UC-B1 | Xem article published | Guest, mọi role |
| UC-B2 | Tạo article mới (draft) | Contributor, Admin |
| UC-B3 | Chỉnh sửa / tạo version mới | Contributor (own), Admin |
| UC-B4 | Submit article để review | Contributor (own) |
| UC-B5 | Review article version | Reviewer, Admin |
| UC-B6 | Approve / Reject version | Reviewer, Admin |
| UC-B7 | Publish article (set `published_version_id`) | Reviewer, Admin |
| UC-B8 | Archive article | Admin |
| UC-B9 | Bookmark article | Learner, Contributor, Reviewer, Admin |
| UC-B10 | Tag article | Contributor (own), Admin |
| UC-B11 | Upload attachment | Contributor (own version), Admin |

### Domain C – AI Learning Companion

| UC | Mô tả | Actor |
|---|---|---|
| UC-C1 | Tạo conversation (chat session) | Mọi user đã đăng nhập |
| UC-C2 | Gửi / nhận message | Owner conversation |
| UC-C3 | AI ghi memory cross-session | System (AI service) |
| UC-C4 | Xem / xoá memory cá nhân | Owner user |

### Domain D – Learning Roadmap

| UC | Mô tả | Actor |
|---|---|---|
| UC-D1 | Tạo roadmap cá nhân | Mọi user đã đăng nhập |
| UC-D2 | Thêm / sắp xếp roadmap item | Owner roadmap |
| UC-D3 | Set prerequisite item (DAG) | Owner roadmap |
| UC-D4 | Cập nhật tiến độ học (`learning_progress`) | Owner roadmap item |

### Domain E – Payment & Subscription

| UC | Mô tả | Actor |
|---|---|---|
| UC-E1 | Xem danh sách plans | Guest, mọi role |
| UC-E2 | Subscribe plan | Mọi user đã đăng nhập |
| UC-E3 | Xử lý payment | System (webhook idempotent) |
| UC-E4 | Quản lý plans (CRUD) | Admin |
| UC-E5 | Xem lịch sử payment | Owner subscription, Admin |
| UC-E6 | Xử lý webhook event | System |

---

## Ma trận RBAC

| Use Case | Guest | Learner | Contributor | Reviewer | Admin |
|---|:---:|:---:|:---:|:---:|:---:|
| Xem published article | ✅ | ✅ | ✅ | ✅ | ✅ |
| Đăng ký / đăng nhập | ✅ | — | — | — | — |
| Tạo article | ❌ | ❌ | ✅ | ✅ | ✅ |
| Submit để review | ❌ | ❌ | ✅ own | ✅ | ✅ |
| Review / Approve / Reject | ❌ | ❌ | ❌ | ✅ | ✅ |
| Publish article | ❌ | ❌ | ❌ | ✅ | ✅ |
| Bookmark | ❌ | ✅ | ✅ | ✅ | ✅ |
| Chat AI | ❌ | ✅ | ✅ | ✅ | ✅ |
| Tạo roadmap | ❌ | ✅ | ✅ | ✅ | ✅ |
| Subscribe plan | ❌ | ✅ | ✅ | ✅ | ✅ |
| Quản lý user / role / plan | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## Luồng Phân Quyền Chính – Article Lifecycle

```
Guest đăng ký → status=pending
     ↓ xác thực email
status=active + role=learner
     ↓ Admin gán role contributor
Contributor tạo article → status=draft
     ↓ submit
status=submitted → Reviewer nhận
     ↓ review (ghi vào article_reviews)
  approved          → set published_version_id → status=published
  rejected          → status=rejected, comment ghi vào article_reviews
  changes_requested → Contributor tạo version mới (version_no++)
```

---

## Gaps – Xử lý ở App Layer (không enforce được bằng DB)

| # | Vấn đề | Biện pháp |
|---|---|---|
| 1 | **Ownership check** – Contributor chỉ sửa article own | App check `author_id = current_user.id` (Laravel Policy) |
| 2 | **Reviewer không review article của chính mình** | App check `reviewer_id ≠ author_id` trước khi insert `article_reviews` |
| 3 | **Subscription gating** – AI chat cần subscription active | App check `subscriptions.status = 'active'` trước UC-C1/C2 |
| 4 | **Role hierarchy** – flat roles, không kế thừa | App kiểm tra từng quyền riêng biệt (Gate/Policy) |
| 5 | **Row-level security** | PG RLS chưa có – documented limitation #6 `DATABASE.md` |
| 6 | **`published_version_id` cross-article** | App validate `version.article_id == article.id` trước khi assign |

---

## Thiếu / Cần cân nhắc mở rộng

| # | Thiếu | Ghi chú |
|---|---|---|
| 1 | **`permissions` table** – granular permission | Hiện chỉ có role name. Cần thêm nếu muốn RBAC nâng cao (vd: Spatie Laravel Permission) |
| 2 | **Article ownership transfer** | Không có flow chuyển `author_id` khi Contributor bị deactivated (RESTRICT block xoá) |
| 3 | **Subscription tier → feature access** | `plans` không có cột `features`/`tier`; cần thêm nếu phân biệt free vs paid features |
| 4 | **Default role on register** | Không rõ seed/app có tự gán `learner` khi đăng ký không – cần xác nhận |

---

## Quyết định hiện tại

- Schema DB hiện tại đủ cho flat 4-role RBAC.
- Ownership và permission logic → **Laravel Policy / Gate**.
- Granular permission / PG RLS → **tạo ADR riêng** nếu team quyết định mở rộng.
- Không thay đổi schema cho đến khi có approval.
