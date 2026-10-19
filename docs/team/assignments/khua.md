# Nhiệm vụ — Khua

**GitHub username:** TBD  
**TEAM_MEMBER mapping đề xuất:** TEAM_MEMBER_B — Content  
**Branch prefix đề xuất:** `p2/`  
**Vai trò đề xuất:** owner end-to-end Content, theo repo ownership hiện tại; chờ Khoa/team xác nhận mapping.

## Task được giao

| ID | Section/module | Domain owner | Status | Dependency | Activity Spec | Allowed write paths | Reviewer | Commit message |
|---|---|---|---|---|---|---|---|---|
| CONTENT-02 | Vòng đời nội dung và versioning | TEAM_MEMBER_B | BACKLOG | Contract/version policy và mapping được xác nhận | [`../../features/content/CONTENT-02-content-lifecycle.md`](../../features/content/CONTENT-02-content-lifecycle.md) | Content theo `OWNERSHIP.md`; route/shared cần phối hợp | Khoa + domain owner | `p2: implement content lifecycle and versioning` |
| CONTENT-01 | Quản lý danh mục | TEAM_MEMBER_B | BACKLOG | CONTENT-02 và category policy được duyệt | [`../../features/content/CONTENT-01-categories.md`](../../features/content/CONTENT-01-categories.md) | Content theo `OWNERSHIP.md` | Khoa + domain owner | `p2: implement category management` |
| CONTENT-03 | Tags | TEAM_MEMBER_B | BACKLOG | CONTENT-02; policy tag được duyệt | [`../../features/content/CONTENT-03-tags.md`](../../features/content/CONTENT-03-tags.md) | Content theo `OWNERSHIP.md` | Khoa + domain owner | `p2: implement content tags` |
| CONTENT-04 | Bookmarks | TEAM_MEMBER_B | BACKLOG | Auth; visibility published; phối hợp Learning nếu cần | [`../../features/content/CONTENT-04-bookmarks.md`](../../features/content/CONTENT-04-bookmarks.md) | Content theo `OWNERSHIP.md`; Learning consumer phối hợp | Khoa + domain owner | `p2: implement content bookmarks` |
| CONTENT-05A | Nhúng video YouTube trong trang (dán link, không upload file) | TEAM_MEMBER_B | READY — feature direction approved; API/schema/CSP decisions must be resolved in implementation task | Người dùng đã chọn cách 2; media metadata/API/security/CSP cần kiểm tra | [`../../features/content/CONTENT-05-attachments.md`](../../features/content/CONTENT-05-attachments.md) | Content; không đổi S3 attachment; schema/API files chỉ theo approval/owner | Khoa + domain owner | `p2: implement YouTube video embedding` |
| CONTENT-05B | Upload/download attachments S3 | TEAM_MEMBER_B | BLOCKED | S3/provider/security/file policy được phê duyệt | [`../../features/content/CONTENT-05-attachments.md`](../../features/content/CONTENT-05-attachments.md) | Content; storage/shared files cần phối hợp | Khoa + domain owner | `p2: implement content attachments` |
| CONTENT-06 | Tìm kiếm | TEAM_MEMBER_B | BACKLOG | Nội dung published ổn định; search semantics/index/API được duyệt | [`../../features/content/CONTENT-06-search.md`](../../features/content/CONTENT-06-search.md) | Content theo `OWNERSHIP.md` | Khoa + domain owner | `p2: implement content search` |

## Điều kiện nhận task

- Mapping TEAM_MEMBER_B/branch `p2/` là đề xuất; Khoa/team cần xác nhận trước khi coi là phân quyền chính thức.
- Chỉ bắt đầu khi task có `READY`, scope, owner domain, reviewer và acceptance criteria.
- Agent hỏi người phụ trách section; nếu đã xác nhận Khua trong yêu cầu thì đọc file này, không hỏi lại.
- Assignment không thay quyền ghi của owner trong [`../OWNERSHIP.md`](../OWNERSHIP.md).
- Không stage/commit file ngoài task; message cuối phải đúng message trong Activity Spec.

## Cập nhật

Thêm task tại đây và `assignments/README.md`; đổi status đồng thời ở cả hai. Ghi blocker/decision cần Khoa hoặc domain owner giải quyết.