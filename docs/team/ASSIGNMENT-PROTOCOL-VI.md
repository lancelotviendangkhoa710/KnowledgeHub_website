# Quy trình phân công section và nhiệm vụ cá nhân

**Mục đích:** điều phối ba người thật — Khiêm, Khua, Khoa — theo section/module; mỗi người có file nhiệm vụ riêng, để agent hỏi đúng người trước khi bắt đầu và chỉ làm đúng phạm vi được giao.

**Trạng thái:** mapping đề xuất: Khiêm → `TEAM_MEMBER_A`/`p1/` (Auth); Khua → `TEAM_MEMBER_B`/`p2/` (Content); Khoa → `TEAM_MEMBER_C`/`p3/` (Infrastructure + điều phối). Chờ Khoa/team xác nhận; GitHub username chưa biết.

## 1. Bước bắt buộc khi bắt đầu section

Trước khi phân tích, thay đổi code/tài liệu của section, tạo branch hoặc commit, agent hỏi:

> **Section này ai phụ trách?** Chọn: **Khiêm**, **Khua**, **Khoa**.

Nếu user đã nêu rõ tên trong chính yêu cầu mở section thì không hỏi lại. Nếu chưa biết người đang chat là ai, câu trả lời cho câu hỏi trên xác định người thực hiện section hiện tại; không tự đoán danh tính từ hội thoại cũ.

Sau câu trả lời:

1. Mở đúng `docs/team/assignments/<tên-không-dấu>.md`.
2. Xác nhận section/task nằm trong trách nhiệm của người đó.
3. Nạp Activity Spec chức năng và context pack domain tương ứng.
4. Đối chiếu `docs/team/OWNERSHIP.md`, trạng thái Git, dependency và branch prefix.
5. Nếu task chưa được giao trong file người đó, owner không khớp, hoặc file chưa tồn tại: **dừng trước khi sửa/commit**, nêu rõ cần Khoa cập nhật file phân công hay team xác nhận. Không suy ra quyền từ việc đang có tên trong đoạn chat. Mapping trên là đề xuất được điều phối theo yêu cầu mới; khi xác nhận xong dùng mapping đó, không hỏi lại tên/owner ở từng section.

Tên người xác nhận ở đầu section là **người thực thi/được giao**, không tự thay thế domain owner có quyền duyệt thay đổi domain khác.

## 2. Các file nhiệm vụ cá nhân

- [Khiêm — nhiệm vụ](assignments/khiem.md)
- [Khua — nhiệm vụ](assignments/khua.md)
- [Khoa — nhiệm vụ](assignments/khoa.md)
- Danh sách section/task tổng: [Task Assignment Registry](assignments/README.md)
- Ranh giới domain kỹ thuật: [`OWNERSHIP.md`](OWNERSHIP.md)
- Đặc tả luồng nghiệp vụ: [`../features/README.md`](../features/README.md)

Mapping Agile đề xuất: Khiêm → TEAM_MEMBER_A / `p1/` (Auth); Khua → TEAM_MEMBER_B / `p2/` (Content); Khoa → TEAM_MEMBER_C / `p3/` (Infra + điều phối, ít business). Căn cứ là owner/domain/branch trong repo và vai trò Khoa do người dùng nêu; **đề xuất này chờ Khoa/team xác nhận trước khi có hiệu lực**. GitHub username không thể suy ra, vẫn TBD.

## 3. Vai trò dự kiến — cần Khoa duyệt

| Người | Phần dự kiến | Giới hạn |
|---|---|---|
| Khoa | Hạ tầng đã setup; deploy, quy trình, tiến độ, phân công, tích hợp và review | Ít feature nghiệp vụ; không nhận owner business mặc định; không sửa domain code thay owner nếu chưa thống nhất |
| Khiêm | Identity/Auth, nguyên vertical feature theo từng task | `TEAM_MEMBER_A`, `p1/` theo mapping đề xuất; chờ xác nhận |
| Khua | Content, nguyên vertical feature theo từng task | `TEAM_MEMBER_B`, `p2/` theo mapping đề xuất; chờ xác nhận |

Phân công ưu tiên **nguyên module/domain đầu-cuối**, tránh chia cùng feature theo frontend/backend. Theo Agile, giao theo sprint nhỏ, ưu tiên dependency, value, WIP/capacity và Definition of Done; không mặc định chia đều số lượng feature. Bảng đề xuất cụ thể nằm trong `assignments/README.md` và file cá nhân; chờ Khoa/team xác nhận.

## 4. Trạng thái task

- `BACKLOG` — chưa sẵn sàng.
- `READY` — có owner, dependency, spec và criteria; có thể bắt đầu.
- `IN_PROGRESS` — owner đang thực hiện.
- `WAITING_REVIEW` — implementation xong, chờ Khoa/reviewer kiểm tra.
- `BLOCKED` — ghi rõ blocker, người cần quyết định và hành động tiếp.
- `DONE` — acceptance/test/review đạt, commit đúng message trong Activity Spec.

Một task ở `READY` phải ghi: ID + link Activity Spec, owner, người review, priority, dependency, scope/file được phép sửa, acceptance criteria, commit message, branch. Không chuyển `DONE` chỉ vì đã code xong.

## 5. Quy trình điều phối

### Khoa chuẩn bị và giao

1. Chọn một feature từ `docs/features/README.md` theo dependency đã duyệt.
2. Chia thành task độc lập vừa đủ; tránh giao đồng thời migration/shared file cho nhiều người.
3. Xác nhận quyết định `CHỜ BẠN DUYỆT`; không ghi `READY` khi còn blocker nghiệp vụ bắt buộc.
4. Ghi task vào registry và file người nhận; chỉ rõ reviewer (Khoa hoặc domain owner phù hợp).
5. Đối chiếu mapping đề xuất trong registry, xin team xác nhận một lần, rồi áp dụng mapping/branch thống nhất; xác nhận availability và giới hạn WIP.

### Thành viên bắt đầu section

1. Trả lời tên ở câu hỏi mở đầu hoặc user nêu rõ tên ngay trong task.
2. Đọc đúng file nhiệm vụ cá nhân, Activity Spec, context pack, ownership và Git status.
3. Chỉ bắt đầu task trạng thái `READY`, tạo branch theo prefix đã xác nhận.
4. Chỉ đọc toàn repo; chỉ ghi file được task/ownership cho phép. Không stage thay đổi có trước.

### Hoàn tất

1. Chạy kiểm thử, security/permission checklist, `git diff --check`, kiểm tra staged và unstaged diff.
2. Chuyển `WAITING_REVIEW`; ghi commit dự kiến/kết quả test, không tự đánh dấu `DONE` trước review nếu task yêu cầu review.
3. Người được giao tạo commit cuối với **message chính xác trong Activity Spec**; không gộp thay đổi người khác.
4. Khoa/reviewer kiểm tra acceptance, scope, CI/tests và deployment readiness; cập nhật trạng thái `DONE` sau khi đạt.

## 6. Quy tắc ranh giới và ưu tiên

- File assignment quyết định **ai được giao task nào**; `OWNERSHIP.md` quyết định **ai sở hữu domain và được ghi các file nào**. Cần cả hai điều kiện mới được bắt đầu ghi.
- Khoa là điều phối/infrastructure/deploy/review theo nhiệm vụ được xác nhận; quyền điều phối **không tự động cấp quyền sửa mọi domain**.
- Được giao task ngoài domain owner: có thể phân tích và đề xuất; trước khi sửa cross-domain phải có explicit coordination theo `OWNERSHIP.md`.
- File protected/shared, database, API contract hoặc kiến trúc cần approval theo repo policy; assignment file không thay thế approval.
- Deploy production hoặc destructive/irreversible operation cần xác nhận rõ; không suy ra từ quyền quản lý tiến độ.
- Khi có conflict giữa assignment, Activity Spec, ADR/code hoặc owner: dừng thay đổi, báo Khoa/owner quyết định.

## 7. Mẫu câu hỏi và phản hồi

```text
Section này ai phụ trách? Chọn Khiêm, Khua hoặc Khoa.

Sau khi xác nhận tên:
- File nhiệm vụ: docs/team/assignments/<ten>.md
- Section/task: <ID + tên>
- Activity Spec: <link>
- Status: <READY/BLOCKED/...>
- Ranh giới ghi: <paths>
- Reviewer: <tên>
```

Nếu trả lời không phải ba tên đã khai báo, hỏi lại một lần để xác định thành viên; không tự tạo role/member mới.