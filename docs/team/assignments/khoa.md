# Nhiệm vụ — Khoa

**GitHub username:** TBD  
**TEAM_MEMBER mapping đề xuất:** TEAM_MEMBER_C — Learning/Infrastructure  
**Branch prefix đề xuất:** `p3/`  
**Vai trò theo yêu cầu người dùng:** đã setup infrastructure; phụ trách điều phối phân công/tiến độ, quy trình, deployment và review/tích hợp; nhận ít business feature hơn Khiêm/Khua.

## Task được giao

| ID | Section/module | Status | Dependency | Spec/checklist | Reviewer/approval | Allowed write paths | Commit message |
|---|---|---|---|---|---|---|---|
| INFRA-COORD-01 | Công bố mapping đề xuất và xin team xác nhận | IN_PROGRESS | Team xác nhận Khiêm=A, Khua=B, Khoa=C | [`../ASSIGNMENT-PROTOCOL-VI.md`](../ASSIGNMENT-PROTOCOL-VI.md) | Team | File assignment; `OWNERSHIP.md` vẫn protected | `docs: define team task assignment protocol` |
| INFRA-COORD-02 | Duy trì registry/file nhiệm vụ và tiến độ | READY | INFRA-COORD-01 | [`README.md`](README.md) | Team | Chỉ assignment/task tracking; `OWNERSHIP.md` vẫn protected | `docs: define team task assignment protocol` |
| INFRA-DEPLOY-01 | Lập checklist deploy/release cho infrastructure hiện có | BACKLOG | Xác nhận platform/target, secrets, môi trường và quyền release | Context pack Foundation + deployment runbook được duyệt | Khoa + reviewer infra/team | Chưa cấp — docker/workflow/shared paths yêu cầu owner coordination | TBD khi task/spec được duyệt |

## Phân bổ tải

- Ưu tiên task điều phối, review, release readiness, theo dõi dependency và hỗ trợ hai owner.
- Chỉ nhận business feature khi cần thiết và được ghi rõ; không mặc định giao Khoa nguyên domain Auth/Content/Learning.
- Hạ tầng đã setup; không lặp lại bootstrap. Deploy hiện tại chưa có target, credentials, approval policy hay release rollback được ghi trong file này; phải lập checklist trước khi chạy deploy.

## Checklist task của Khoa

- [ ] Đầu mỗi section, nếu user chưa nêu tên, agent hỏi ai thực thi; mở đúng file cá nhân.
- [ ] Gán ID, owner, domain owner, reviewer, dependency, scope, acceptance, commit message.
- [ ] Không giao `READY` nếu Activity Spec còn decision bắt buộc chưa duyệt.
- [ ] Theo dõi WIP/dependency/review/deployment; chỉ đánh `DONE` sau acceptance/review.
- [ ] Trước deploy: xác nhận target/environment, branch/artifact, DB migration/backup/rollback, secrets, health check, release approval và rollback plan.
- [ ] Không thực hiện production/destructive action chỉ dựa trên quyền điều phối chung.

## Learning capacity giới hạn

Learning domain hiện được `OWNERSHIP.md` gán cho TEAM_MEMBER_C, cùng Infrastructure. Khoa giữ quyền sở hữu/điều phối theo registry; để giữ tải business thấp, ưu tiên chia LEARN thành task nhỏ hoặc điều phối hỗ trợ từ Khiêm/Khua **sau khi cập nhật domain ownership và được team duyệt**. Không giao người ngoài domain trực tiếp sửa Learning paths trước approval.