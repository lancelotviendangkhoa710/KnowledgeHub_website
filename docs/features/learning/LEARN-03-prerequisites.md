# LEARN-03 — Điều kiện tiên quyết

**Mức:** Kỹ — đồ thị phụ thuộc có thể gây deadlock nghiệp vụ  
**Owner:** TEAM_MEMBER_C  
**Commit:** `p3: implement roadmap prerequisites`

## Mục tiêu và luồng activity

`roadmap_item_prerequisites` mô tả cạnh prerequisite giữa items; self-reference bị DB CHECK cấm. Trước khi thêm/xóa cạnh, backend xác thực owner/Admin theo roadmap policy → xác nhận hai item tồn tại, đúng roadmap theo policy sản phẩm → dựng đồ thị liên quan và kiểm tra cycle → transaction ghi cạnh → trả kết quả.

## Đã biết và chờ duyệt

- Context pack Learning yêu cầu full-graph DAG check ở service.
- DB docs ghi cycle detection không nằm ở DB.
- **Chờ duyệt:** prerequisite bắt buộc cùng roadmap hay cho phép cross-roadmap; semantics của completed/skipped; thay đổi cạnh khi đang học; hành vi xóa item.

## Kiểm tra kỹ

- Self-cycle; cycle 2 nút; cycle dài >2; cycle tạo bởi nhiều cạnh mới trong cùng batch.
- Cross-roadmap/foreign owner, ID không tồn tại, item archived/deleted.
- Hai request thêm cạnh đồng thời có thể cùng pass DAG check rồi tạo cycle — cần serialization/locking/isolation strategy được duyệt; validation đơn lẻ không đủ.
- Batch atomicity, duplicate edge/unique constraint, xóa cạnh idempotent.
- Kiểm tra trên toàn graph liên quan, không chỉ cạnh trực tiếp; giới hạn tải/size graph.
- DB constraint vẫn được test như lớp bảo vệ, không thay service DAG validation.

## Gate/commit

- [ ] Scope đồ thị và chiến lược chống race được duyệt.
- [ ] Tests self/direct/indirect/batch/concurrent cycle, ownership, FK, rollback.
- [ ] Không có cycle lọt qua; diff/tests đạt.
- [ ] Commit: `p3: implement roadmap prerequisites`.