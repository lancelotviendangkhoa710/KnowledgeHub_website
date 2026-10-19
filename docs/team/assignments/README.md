# Task Assignment Registry

Sổ này là hàng đợi và nguồn chuẩn phân công. Mỗi nhiệm vụ đang giao phải có dòng trong bảng này **và** entry trong file của owner. Cập nhật trạng thái trong cả hai cùng lúc.

## Danh sách thành viên

| Tên | File nhiệm vụ | GitHub username | TEAM_MEMBER mapping | Branch prefix | Vai trò |
|---|---|---|---|---|---|
| Khiêm | [khiem.md](khiem.md) | TBD | TBD | TBD | Feature/module theo assignment được xác nhận |
| Khua | [khua.md](khua.md) | TBD | TBD | TBD | Feature/module theo assignment được xác nhận |
| Khoa | [khoa.md](khoa.md) | TBD | TBD | TBD | Hạ tầng đã setup; deploy, quy trình, tiến độ, phân công/review; ít business feature |

## Mapping được đề xuất

| Người | TEAM_MEMBER | Branch prefix | Phân công chính | Căn cứ |
|---|---|---|---|---|
| Khiêm | TEAM_MEMBER_A | `p1/` | Identity/Auth | Repo đang gán Auth cho owner A; đề xuất dành nguyên domain cho một người |
| Khua | TEAM_MEMBER_B | `p2/` | Content | Repo đang gán Content cho owner B; YouTube/content nằm cùng domain |
| Khoa | TEAM_MEMBER_C | `p3/` | Infra/deploy/process/progress/review; Learning chỉ khi cần | User xác nhận Khoa setup infra và muốn làm ít business feature hơn |

**Đây là mapping/phân công mới do điều phối đề xuất; cần Khoa xác nhận áp dụng với team trước khi coi là thay ownership registry chính thức.** GitHub username vẫn `TBD` — không thể suy ra từ tên.

## Bảng nhiệm vụ

| ID | Section/module | Owner (tên thật) | Domain owner hiện tại | Reviewer | Status | Dependency | Activity Spec | Commit message |
|---|---|---|---|---|---|---|---|---|
| — | Chưa có task business nào được giao cụ thể | — | — | Khoa điều phối | BACKLOG | Xác nhận member↔owner mapping và priority | [`../../features/README.md`](../../features/README.md) | Theo spec feature |

## Phân công agile đề xuất — chờ Khoa xác nhận

Chia theo domain owner, giao nguyên vertical module; task nhỏ là từng feature trong module. Người được giao feature phải nằm trong domain owner. Khoa giữ vai trò điều phối/reviewer và không bị giao domain business đầy đủ.

### Khiêm — Identity/Auth (`TEAM_MEMBER_A`, `p1/`)

1. AUTH-01 Đăng ký/đăng nhập/đăng xuất — ưu tiên đầu; mức vừa.
2. AUTH-02 Hồ sơ/tài khoản — sau AUTH-01.
3. AUTH-03 Gán role — sau auth cơ bản; cần kiểm tra kỹ vì đặc quyền.

### Khua — Content (`TEAM_MEMBER_B`, `p2/`)

1. CONTENT-02 Content lifecycle/versioning — nền tảng nội dung; ưu tiên đầu.
2. CONTENT-01 Categories.
3. CONTENT-03 Tags và CONTENT-04 Bookmarks — tách task nhỏ, cùng domain.
4. CONTENT-05 YouTube embed: tách thành task media metadata/embed sau khi Khoa duyệt lựa chọn embed; không gộp với upload S3. S3 attachments vẫn chờ approval.
5. CONTENT-06 Search — sau khi nội dung/visibility đã ổn định.

### Khoa — Infra, quy trình, deploy; Learning hỗ trợ có giới hạn (`TEAM_MEMBER_C`, `p3/`)

1. INFRA-COORD-01 xác nhận mapping và công bố assignment sau khi team đồng thuận.
2. INFRA-COORD-02 duy trì bảng task/status/dependency/review/deploy.
3. INFRA-DEPLOY-01 bổ sung release/deploy checklist cho hạ tầng đã setup; deploy theo từng môi trường và approval policy.
4. Learning không tự giao cả module cho Khoa: phân tích/review và chỉ nhận từng task cần thiết khi capacity cho phép; LEARN-01 → LEARN-02 → LEARN-03 theo dependency.

### Chờ owner/team assignment

- AI-01–AI-05: domain owner chưa gán; service boundary/provider/privacy approvals còn mở.
- PAY-01–PAY-02: domain owner chưa gán; provider/entitlement/webhook approvals còn mở.

**Cập nhật quyết định:** người dùng đã chọn YouTube embed theo cách “Contributor dán link; người học xem player ngay trong trang”. Task `CONTENT-05A` được đưa về `READY` cho Khua; API/schema/security/CSP vẫn cần xử lý theo approval và Content ownership. Upload S3 vẫn `BLOCKED` độc lập.

AI-01–AI-05 và PAY-01–PAY-02 chưa gán owner; đề xuất để backlog tới khi team chỉ định owner/decision. Không đưa vào cam kết sprint.