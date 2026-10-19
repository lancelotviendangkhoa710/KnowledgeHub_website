# AI-04 — RAG

**Mức:** Kỹ — kiến trúc, riêng tư, an toàn nội dung  
**Owner:** UNASSIGNED  
**Commit dự kiến:** `ai: implement retrieval augmented generation` (**prefix chờ duyệt**)

## Trạng thái quyết định

RAG là phase tương lai; schema hiện chưa có vector column/pgvector. ADR không chọn vector database, embedding model/provider, chunking, pipeline indexing hay service contract. Không cài extension, tạo index hoặc code retrieval trước approval.

## Luồng activity khái niệm cần review

Chỉ nội dung được phép và published → extract/version → chia chunk và tạo embedding theo policy → index có source/version/provenance → user hỏi → identity/entitlement/context xác định phạm vi → retrieval lọc quyền/trạng thái trước khi dựng context → model sinh câu trả lời → trả citation/giới hạn → telemetry redacted theo privacy policy.

## Chờ chủ sản phẩm duyệt

pgvector/extension hay dịch vụ khác, provider/model, embedding dimension, chunking/versioning, ingestion/delete/re-index, freshness, tenant filter, citation contract, prompt injection/trust boundary, premium gate, retention, cost/latency, fallback, access to attachments, owner.

## Kiểm tra kỹ

- Không retrieval từ draft, archived, soft-deleted hoặc version cũ ngoài policy.
- Filter authorization trước retrieval/ranking; không dựa vào prompt để giữ kín cross-user/private data.
- Nội dung nguồn có prompt injection: coi là untrusted data, không executable instruction.
- Xóa/unpublish source: vector/chunk/caches được invalidation theo policy, không chỉ ẩn frontend.
- Embedding dimension/model mismatch, stale index, duplicate ingestion, partial re-index.
- Citation đúng source/version và không trích tài liệu user khác.
- Đo recall/precision, latency, token/cost và leakage bằng evaluation set được duyệt; không claim “grounded” nếu không kiểm thử.

## Gate/commit

- [ ] ADR + owner + threat model + data lifecycle + entitlement được duyệt.
- [ ] Evaluation set và security/privacy tests đạt.
- [ ] pgvector/schema/dependencies chỉ thay đổi theo approval.
- [ ] Prefix thống nhất; tests/diff đạt.
- [ ] Commit dự kiến: `ai: implement retrieval augmented generation`.