# CONTENT-06 — Tìm kiếm

**Mức:** Kỹ; correctness/visibility và hiệu năng cần duyệt  
**Owner:** TEAM_MEMBER_B  
**Commit:** `p2: implement content search`

## Luồng activity và ranh giới

Người đọc gửi query/filter → Content API validate input, giới hạn độ dài/chi phí → query layer tìm trong nội dung được phép → chỉ trả `published`, chưa soft-delete và published version đúng → phân trang ổn định → frontend hiển thị kết quả. Chỉ article/tables đã có trong schema hiện là căn cứ; chưa có FTS index.

## Chờ duyệt

Search fields (title/body/tags/category), ngôn ngữ/tokenization, stemming, substring vs PostgreSQL full-text, ranking, filters, typo/fuzzy, relevance, API/pagination, index/migration và ngưỡng hiệu năng. Database docs ghi rõ FTS index là future extension; **không thêm extension/GIN/pg_trgm tự ý**.

## Kiểm tra kỹ

- Query empty/whitespace/Unicode/diacritics dài, ký tự special; parameter binding, không ghép raw SQL.
- Không query draft/archive/soft-delete qua filter, snippet, count, facet hoặc ranking.
- Search snippet không tiết lộ phần private hoặc version draft mới.
- Sorting có tie-breaker ổn định; pagination không trùng/mất kết quả khi dữ liệu ổn định.
- Query cost, index plan trên dataset thực tế; không claim hiệu năng nếu chưa đo.
- Category/tag filter và cross-domain relation tuân visibility tương tự.

## Gate/commit

- [ ] Search semantics/API/index được duyệt.
- [ ] Test injection, visibility, Unicode/edge, pagination, plan/performance nếu được yêu cầu.
- [ ] Không schema/index thay đổi ngoài duyệt; diff/tests đạt.
- [ ] Commit: `p2: implement content search`.