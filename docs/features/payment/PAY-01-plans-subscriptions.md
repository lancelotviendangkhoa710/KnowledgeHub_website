# PAY-01 — Plan và subscription

**Mức:** Kỹ; quyền premium và trạng thái billing ảnh hưởng truy cập  
**Owner:** UNASSIGNED  
**Commit dự kiến:** `pay: implement plans and subscriptions` (**prefix chờ duyệt**)

## Mục tiêu và luồng activity

Admin quản lý plan; User/Contributor đăng ký plan theo business policy. `plans` lưu giá `NUMERIC(12,2)`, currency ISO-4217; subscriptions liên kết user/plan và có state CHECK: `active`, `trialing`, `past_due`, `cancelled`, `expired`. Premium gate được tài liệu mô tả là subscription `active`; chi tiết quyền lợi và quy tắc chuyển state chưa được chốt.

Admin publish/change availability của plan → API authorize Admin → validate price/currency/interval/status → persist. User chọn plan → authorize actor → validate plan đang bán và currency/interval → bắt đầu payment flow đã duyệt → chỉ xác nhận subscription dựa trên nguồn đáng tin đã duyệt, không tin callback trình duyệt.

## Chờ bạn duyệt — blocker triển khai billing

Payment provider, plan catalog/tiers, entitlement mapping, trial, đổi/hủy/gia hạn, proration, refund, past_due grace, timezone/billing dates, tax/invoice, dunning, multi-subscription policy, frontend checkout, API, owner. Không tự cho rằng `active` bao phủ `trialing` dù enum tồn tại.

## Kiểm tra kỹ

- User xem/sửa subscription của mình; không IDOR; Admin quyền rõ.
- Plan inactive/deprecated và subscription state transitions; không xóa plan bị tham chiếu (FK RESTRICT).
- Entitlement check ở backend mỗi request nhạy cảm; không dựa client flag/cache cũ.
- Tiền dùng decimal, không float; rounding, zero-price, currency mismatch; giá plan thay đổi không rewrite lịch sử thanh toán.
- Race nhiều subscription/checkout, retry, cancellation/renewal đồng thời; tính nhất quán giữa webhook/payment/subscription.
- Subscription user bị xóa: FK RESTRICT; xử lý retention trước mọi delete.

## Gate/commit

- [ ] Provider, entitlement, lifecycle, state machine, owner được duyệt.
- [ ] Test RBAC, ownership, transition, price/currency, concurrency, rollback.
- [ ] Payment record không mất/đổi theo thay đổi plan; secret không lưu.
- [ ] Tests/diff đạt; prefix thống nhất.
- [ ] Commit dự kiến: `pay: implement plans and subscriptions`.