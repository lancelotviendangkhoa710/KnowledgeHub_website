# Nhiệm vụ — Khiêm

**GitHub username:** TBD  
**TEAM_MEMBER mapping đề xuất:** TEAM_MEMBER_A — Identity/Auth  
**Branch prefix đề xuất:** `p1/`  
**Vai trò đề xuất:** owner end-to-end Identity/Auth, theo repo ownership hiện tại; chờ Khoa/team xác nhận mapping.

## Task được giao

| ID | Section/module | Domain owner | Status | Dependency | Activity Spec | Allowed write paths | Reviewer | Commit message |
|---|---|---|---|---|---|---|---|---|
| AUTH-01 | Đăng ký/đăng nhập/đăng xuất | TEAM_MEMBER_A | BACKLOG | Chốt auth contract/mapping; AUTH-01 | [`../../features/identity-auth/AUTH-01-registration-login-logout.md`](../../features/identity-auth/AUTH-01-registration-login-logout.md) | Identity/Auth theo `OWNERSHIP.md`; route/shared phải phối hợp | Khoa + domain owner | `p1: implement registration login and logout` |
| AUTH-02 | Hồ sơ/tài khoản | TEAM_MEMBER_A | BACKLOG | AUTH-01 và policy trường/lifecycle được duyệt | [`../../features/identity-auth/AUTH-02-profile-account.md`](../../features/identity-auth/AUTH-02-profile-account.md) | Identity/Auth theo `OWNERSHIP.md` | Khoa + domain owner | `p1: implement profile and account management` |
| AUTH-03 | Quản lý vai trò | TEAM_MEMBER_A | BACKLOG | AUTH-01; role policy được duyệt | [`../../features/identity-auth/AUTH-03-role-assignment.md`](../../features/identity-auth/AUTH-03-role-assignment.md) | Identity/Auth theo `OWNERSHIP.md` | Khoa + domain owner | `p1: implement admin role assignment` |

## Điều kiện nhận task

- Mapping TEAM_MEMBER_A/branch `p1/` là đề xuất; Khoa/team cần xác nhận trước khi coi là phân quyền chính thức.
- Chỉ bắt đầu khi task có `READY`, scope, owner domain, reviewer và acceptance criteria.
- Agent hỏi người phụ trách section; nếu đã xác nhận Khiêm trong yêu cầu thì đọc file này, không hỏi lại.
- Assignment không thay quyền ghi của owner trong [`../OWNERSHIP.md`](../OWNERSHIP.md).
- Không stage/commit file ngoài task; message cuối phải đúng message trong Activity Spec.

## Cập nhật

Thêm task tại đây và `assignments/README.md`; đổi status đồng thời ở cả hai. Ghi blocker/decision cần Khoa hoặc domain owner giải quyết.