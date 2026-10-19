# CONTENT-05 — Tệp đính kèm

## Video YouTube — cách 2 đã chọn

**Quyết định của người dùng:** Contributor dán URL YouTube; KnowledgeHub lưu tham chiếu/video ID rồi nhúng trình phát YouTube trên trang nội dung. **Không upload video binary lên KnowledgeHub, không lưu video vào S3.** Phần upload file S3 là feature riêng, ngoài phạm vi quyết định này.

### Luồng activity

1. Contributor mở nội dung mình sở hữu, chọn thêm video và dán link YouTube.
2. Frontend gửi URL cùng nội dung/version đích đến API Content theo contract được duyệt.
3. Backend xác thực Contributor, kiểm tra ownership và chỉ chấp nhận YouTube URL thuộc allowlist.
4. Backend parse và lưu video ID cùng version nội dung; không nhận/lưu iframe HTML tùy ý. Nếu lưu DB mới hoặc thêm API field thì phải có schema/API approval riêng.
5. Contributor xem preview để kiểm tra link/player; preview không chứng minh video sẽ phát cho mọi người dùng/thiết bị.
6. Khi nội dung đã xuất bản được mở, frontend dựng iframe từ video ID đã kiểm tra; người học phát video trực tiếp từ YouTube.
7. Nếu video không cho embed/không khả dụng, hiển thị trạng thái dự phòng và link mở trên YouTube; không làm hỏng phần nội dung khác.

### URL và khả năng embed

- Chấp nhận trước mắt URL canonical `https://www.youtube.com/watch?v=<VIDEO_ID>`, URL rút gọn `https://youtu.be/<VIDEO_ID>` và URL embed `https://www.youtube.com/embed/<VIDEO_ID>`.
- Chuẩn hóa về video ID; kiểm tra hostname chính xác, HTTPS, ID theo định dạng hợp lệ; từ chối `javascript:`, `data:`, hostname giả kiểu `youtube.com.attacker.example`, và HTML/iframe do client cung cấp.
- URL hợp lệ không đảm bảo video cho phép embed. YouTube có thể từ chối player do chủ video tắt embedding, video private/xóa, age restriction, giới hạn khu vực/tài khoản hoặc các chính sách khác. Preview chỉ là kiểm tra best-effort; kết quả cuối cùng do player YouTube trả khi phát.
- YouTube Shorts, live streams, playlist, timestamp/start time: **chưa hỗ trợ trong scope đầu tiên**, trừ khi được duyệt riêng.

### Quy tắc hiển thị và riêng tư

- Chỉ render video gắn với version published; không làm lộ URL/video ID của draft, archived hoặc soft-deleted content.
- Tạo iframe ở frontend từ ID đã validate; không dùng `dangerouslySetInnerHTML` với HTML embed lấy từ người dùng.
- Player responsive, có `title`, lazy-load khi phù hợp; `referrerPolicy` phải gửi HTTP `Referer` mà YouTube yêu cầu để tránh lỗi 153. Không dùng `no-referrer`.
- Cân nhắc `youtube-nocookie.com` chỉ khi xác nhận tương thích môi trường. Nếu gây lỗi player/referrer thì fallback về `youtube.com/embed/<ID>` theo CSP và privacy policy được duyệt.
- Việc tải iframe có thể gửi request/metadata tới YouTube trước khi người dùng phát. Consent/privacy-enhanced behavior và Content Security Policy cần kiểm tra trước release; không hứa “không tracking” nếu chưa xác minh.
- Khi player báo lỗi hoặc không thể phát, hiển thị “Video không khả dụng để nhúng” cùng nút mở video trên YouTube. Không tuyên bố URL checker đã xác minh chắc chắn embedding.

### Ranh giới triển khai

- Đây là **tham chiếu media tới bên thứ ba**, không phải file attachment S3. Có thể đổi tên/tách feature khỏi CONTENT-05 trong registry khi team cập nhật.
- Metadata location/ordering/title/caption và schema/API mapping phải khớp cấu trúc nội dung thực tế; chưa tự thêm migration hay contract.
- Không scrape YouTube, tải lại video, proxy stream, bỏ qua age/region/embed restrictions hoặc lưu credentials.

### Acceptance criteria

- [ ] Contributor có quyền thêm URL YouTube hợp lệ vào nội dung mình sở hữu.
- [ ] URL không phải YouTube, hostname giả, protocol nguy hiểm, ID sai, HTML/iframe trực tiếp bị từ chối.
- [ ] Người học xem nội dung published và thấy player đúng video; video ID không bị thay đổi qua parse/serialize.
- [ ] Draft, archived, soft-deleted và nội dung người khác không lộ video/reference trái quyền.
- [ ] Video private/deleted/age-restricted/embedding-disabled xử lý bằng fallback; trang không crash.
- [ ] Kiểm tra browser thực tế có `Referer`; tránh YouTube Error 153. CSP cho phép đúng origin player.
- [ ] Không tải/stored video binary; không ảnh hưởng S3 attachments.

### Commit khi feature được triển khai

`p2: implement YouTube video embedding`

### Những việc vẫn chờ duyệt riêng

API/schema để gắn video vào nội dung; vị trí video trong body hay block riêng; consent/cookie policy; CSP/security headers; quy trình xuất bản version đã chứa video.

**Ranh giới:** tính năng embed không làm đổi quy tắc S3 lưu binary attachments. Nếu hỗ trợ media chung hoặc upload video native, cần thiết kế riêng và duyệt storage/quyền tác giả/rights/size/transcoding trước.

**Acceptance:** Contributor được phép gắn URL hợp lệ; URL provider khác/định dạng độc hại bị từ chối; người đọc nội dung published phát video trong trang nếu đã chọn phương án embed; unpublished content không lộ URL; video unavailable báo fallback rõ; không lưu/render HTML iframe do client nhập.

## Upload/download file attachment qua S3 — feature khác, chưa triển khai

Đã quyết định về nguyên tắc kiến trúc: binary lưu S3, PostgreSQL chỉ lưu metadata; schema `article_attachments` gắn version. Tuy nhiên S3 integration là planned và chưa được phê duyệt triển khai.

Contributor owner yêu cầu upload → backend authorize article/version → kiểm tra policy file đã duyệt → khởi tạo transfer theo cơ chế S3 đã duyệt → lưu metadata theo trạng thái/transaction xác định → trả kết quả không lộ bucket/credential. Download: authorize trạng thái published/version/access → cấp đường tải an toàn theo thiết kế được duyệt.

## Chờ bạn duyệt — không triển khai S3 trước

S3 provider/bucket/region, direct upload hay proxy, presigned URL, TTL, MIME/extension/size limits, malware scan, encryption, public/private, download authorization, orphan cleanup/retry, file retention/deletion, schema upload state, secret rotation.

## Kiểm tra kỹ cho S3 upload (không áp dụng cho YouTube URL)

- Contributor chỉ gắn file vào version thuộc article mình sở hữu; kiểm tra cross-article ID tampering.
- Guest/User chỉ tải file của published version khả kiến; URL hết hạn/không thể đoán; không truy cập draft/archive/soft-delete.
- MIME sniffing so với extension, tên file path traversal, kích thước, content-type giả, file trùng.
- Storage thành công + DB thất bại (orphan binary); DB thành công + upload thất bại (metadata giả); retry và dọn dẹp an toàn.
- Không trả bucket/key nội bộ, signed URL trong log, S3 credentials hay dữ liệu private.
- Không xóa version/file lịch sử trái retention; DB giữ metadata không đồng nghĩa binary được public.

## Gate/commit

- [ ] S3 design + threat model + file policy được duyệt.
- [ ] Test owner, public visibility, malicious metadata, partial failure/orphan cleanup.
- [ ] Không có file binary trong PostgreSQL, không lộ secrets.
- [ ] Tests/diff đạt.
- [ ] Commit sau triển khai được duyệt: `p2: implement content attachments`.