# PAY-02 — Thanh toán và webhook

**Mức:** Kỹ tối đa — tài chính, bảo mật và replay  
**Owner:** UNASSIGNED  
**Commit dự kiến:** `pay: implement payment processing and webhooks` (**prefix chờ duyệt**)

## Luồng activity tham chiếu — chưa phải provider contract

User khởi tạo checkout → backend xác thực user, tính giá từ plan server-side → tạo payment intent theo provider đã duyệt và ghi `payments.pending` → provider xử lý; browser redirect không phải bằng chứng thanh toán → webhook nhận event → xác thực chữ ký/ngữ cảnh theo provider → insert event idempotently theo định danh/provider đã duyệt → transaction kiểm tra event/order/amount/currency và transition hợp lệ → ghi payment/subscription → trả ACK để provider không retry vô hạn. Async/failure/reconciliation semantics **chờ duyệt**.

## Chờ bạn duyệt — tuyệt đối không tự chọn

Payment provider, signature scheme/rotation, webhook paths, event IDs, retry/ACK contract, refund/chargeback, tax/invoices, settlement/reconciliation, idempotency key, payment-to-subscription mapping, retention, owner.

## Kiểm tra kỹ bắt buộc

- Signature missing/invalid, replay, timestamp skew, duplicate event, event đảo thứ tự, retry song song.
- Không cập nhật subscription từ browser/client payload; provider event phải khớp user, payment, plan, amount, currency và trạng thái hiện tại.
- Sai amount/currency/provider/payment ID, event cho order khác, payment đã refunded/disputed.
- Idempotency cả ở event receipt lẫn business effect; DB uniqueness không chỉ là application “check then insert”.
- Transaction/locking tránh ghi payment thành công mà entitlement chưa đồng bộ, hoặc cấp premium từ event sai.
- Timeout sau commit nhưng trước ACK: retry không nhân đôi.
- Log redaction; không bao giờ lưu PAN/card details, CVC, API secret, webhook signing secret; không ghi raw sensitive payload không giới hạn.
- `NUMERIC(12,2)` exact decimal, currency `[A-Z]{3}`, zero/negative values theo schema, rounding/foreign currency.
- Payments là audit trail: không cascade/xóa/sửa lịch sử trái quy tắc; FK payments/subscriptions RESTRICT.
- Test reconciliation/operational alert/replay theo quy trình được duyệt; không tuyên bố an toàn chỉ vì unit tests.

## Gate/commit

- [ ] Provider + contract + threat model + idempotency + subscription entitlement được duyệt.
- [ ] Owner payment được giao.
- [ ] Security tests cho signature, replay, race, mismatch, duplicate, timeout đạt.
- [ ] Reconciliation và audit policy có chủ sở hữu; secrets/binary/card data không lưu.
- [ ] Tests/diff đạt; prefix thống nhất.
- [ ] Commit dự kiến: `pay: implement payment processing and webhooks`.