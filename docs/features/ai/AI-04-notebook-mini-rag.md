# Notebook Mini RAG

Notebook Mini RAG cho phép một người dùng tải nhiều tệp PDF, chọn các tệp cần dùng và hỏi đáp dựa trên nội dung của chúng. Laravel giữ quyền truy cập, tệp gốc và dữ liệu vector; FastAPI chỉ xử lý PDF, tạo embedding và sinh câu trả lời từ các đoạn đã được Laravel chọn.

## Luồng tổng quan

```text
Trình duyệt
  │ chọn hoặc kéo thả PDF
  ▼
Laravel API ──► Supabase Storage: notebook-docs
  │                    │
  │                    └── tệp gốc: notebook/{user_id}/{document_id}/source.pdf
  ▼
FastAPI /v1/notebook/ingest
  │ PDF loader → text splitter → embedding 384 chiều → title + summary
  ▼
PostgreSQL / pgvector
  │ notebook_documents + notebook_document_chunks
  ▼
Người dùng đặt câu hỏi
  │
  ▼
Laravel lọc tài liệu thuộc người dùng → vector search → FastAPI /answer
  │
  ▼
Câu trả lời + tên tệp + số trang
```

## Các thành phần chính

| Thành phần | Trách nhiệm |
| --- | --- |
| Frontend Notebook | Upload nhiều PDF, hiển thị trạng thái từng tệp, chọn nguồn, gửi câu hỏi và hiển thị citation. |
| Laravel NotebookDocumentController | Cung cấp 5 API Notebook; tất cả nằm trong `auth:sanctum`. |
| Laravel NotebookService | Kiểm tra ownership, lưu tệp, gọi FastAPI nội bộ, lưu chunk/vector và thực hiện retrieval. |
| Supabase Storage `notebook-docs` | Chứa PDF gốc, không được trả trực tiếp cho người dùng khác. |
| PostgreSQL + pgvector | Lưu metadata tài liệu, text chunk, số trang và vector 384 chiều để tìm đoạn gần nhất. |
| FastAPI Mini RAG | Trích text PDF, chia đoạn, tạo embedding và yêu cầu model sinh title, summary hoặc câu trả lời. |

## Upload và lập chỉ mục

1. Frontend gửi `POST /api/ai/notebook/documents` dạng `multipart/form-data`. Tên field là `documents[]`; mỗi request nhận tối đa 10 PDF, mỗi file tối đa 15 MB.
2. Laravel tạo một bản ghi `notebook_documents` với trạng thái `processing`, gắn `user_id`, tên tệp, dung lượng và đường dẫn Storage riêng của tài liệu.
3. Laravel ghi PDF vào bucket `notebook-docs` theo đường dẫn `notebook/{user_id}/{document_id}/source.pdf`.
4. Laravel gửi PDF sang `POST /v1/notebook/ingest` của FastAPI bằng service token nội bộ. Token này không được gửi về trình duyệt.
5. FastAPI kiểm tra PDF: magic header, tối đa 15 MB, 1–100 trang, không mã hóa và phải có text trích được.
6. `pypdf` tạo tài liệu theo từng trang. LangChain `RecursiveCharacterTextSplitter` chia text với `chunk_size=900` và `chunk_overlap=120`; một tài liệu có tối đa 300 chunk.
7. Chunk được đưa vào embedding model `intfloat/multilingual-e5-small`, revision được pin, với tiền tố `passage: `. Module dùng chung `cv_rag._embed` kiểm tra đầu ra luôn có 384 chiều.
8. FastAPI trả title, summary, chunks, số trang và vector. Laravel ghi transaction vào `notebook_document_chunks`, sau đó chuyển tài liệu sang `ready` và cập nhật `chunk_count`.

Nếu bất kỳ bước xử lý nào sau khi tạo record thất bại, Laravel chuyển tài liệu sang `failed` và trả `error_message` an toàn cho UI. Tệp lỗi vẫn có thể xóa; UI cũng cho phép chọn lại file để thử lại.

## Hỏi đáp và citation

1. Người dùng tick các tài liệu `ready` cần dùng rồi gửi `POST /api/ai/notebook/query` với `{ question, document_ids }`.
2. Laravel chỉ lấy tài liệu `ready` thuộc `user_id` hiện tại. ID của người dùng khác hoặc tài liệu chưa sẵn sàng không thể trở thành context.
3. Laravel gọi `POST /v1/cv-rag/embed-query` với tiền tố `query: ` để tạo vector câu hỏi cùng model 384 chiều.
4. PostgreSQL sắp xếp các chunk của các tài liệu đã lọc theo cosine distance và lấy tối đa 5 chunk gần nhất.
5. Laravel gửi mỗi chunk được chọn, tên tệp và số trang sang `POST /v1/notebook/answer`.
6. FastAPI yêu cầu model chỉ trả lời từ các đoạn nhận được và yêu cầu citation cho các khẳng định thực tế. Nếu context rỗng, FastAPI trả cố định: `Không tìm thấy thông tin trong tài liệu đã chọn.` mà không gọi model.
7. Laravel trả câu trả lời và citation `{ document_id, filename, page }`. Frontend hiển thị chúng dưới câu trả lời.

## API cho giao diện

| API | Mục đích |
| --- | --- |
| `GET /api/ai/notebook/documents` | Danh sách metadata tài liệu của người dùng hiện tại. |
| `POST /api/ai/notebook/documents` | Upload một hoặc nhiều PDF qua `documents[]`. |
| `GET /api/ai/notebook/documents/{id}` | Metadata một tài liệu thuộc người dùng hiện tại. |
| `DELETE /api/ai/notebook/documents/{id}` | Xóa tệp khỏi Storage và xóa record/chunks. |
| `POST /api/ai/notebook/query` | Truy vấn các tài liệu đã chọn và nhận answer/citations. |

Metadata tài liệu có các field: `id`, `original_filename`, `size_bytes`, `status`, `error_message`, `title`, `summary`, `chunk_count`, `created_at`, `updated_at`.

## Bảo mật và ranh giới tin cậy

- API public của Laravel yêu cầu phiên đăng nhập Sanctum. FastAPI chỉ chấp nhận service token nội bộ.
- Ownership được kiểm tra ở Laravel trước khi xem, xóa hoặc query tài liệu. Retrieval cũng lọc `user_id` trước vector search.
- PDF text và các chunks là dữ liệu không tin cậy, không phải instruction. Prompt cho answer yêu cầu model chỉ dựa trên chunks được cung cấp.
- PDF gốc ở Storage; PostgreSQL chỉ lưu metadata, text chunk và vector. Khi xóa, Laravel xóa Storage object trước rồi xóa bản ghi để cascade chunks.
- Không ghi secret, service token hoặc API key vào response hay frontend bundle.

## Runtime embedding

Image FastAPI pin bộ dependency CPU sau để tránh lỗi tương thích runtime:

| Package | Phiên bản |
| --- | --- |
| `torch` | `2.6.0+cpu` |
| `transformers` | `5.24.0` |
| `sentence-transformers` | `6.3.0` |

`transformers` 5.x yêu cầu Torch từ 2.6. Nếu Torch thấp hơn, Transformers có thể tắt PyTorch lúc import và gây lỗi khi SentenceTransformer tạo model.

## Cách kiểm tra thủ công

1. Mở `/ai/companion?mode=notebook` sau khi đăng nhập.
2. Trong **Nguồn**, upload một PDF text-based khoảng 5 MB hoặc nhỏ hơn.
3. Đợi trạng thái chuyển sang dấu tick và hiện số chunk. Nếu `failed`, chọn **Thử lại** hoặc **Xóa**.
4. Tick ít nhất một tài liệu `ready`, hỏi một thông tin có trong PDF và kiểm tra tên file/số trang dưới câu trả lời.
5. Hỏi một thông tin không có trong PDF để xác nhận câu trả lời fallback thay vì thông tin bịa ra.
