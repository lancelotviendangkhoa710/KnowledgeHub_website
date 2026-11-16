# Đo kiểm AI Agent trên Compose cô lập

Tài liệu này bổ sung cho `AGENT_WORKFLOWS_MASTER_PLAN.md`. Script
`scripts/benchmark-agent-workflows.py` đo 20 lượt đầu cuối cho mỗi workflow:
Contributor tạo và xuất bản course, Admin đề xuất rồi xác nhận đổi trạng thái
tài khoản thử, User xem trước rồi xác nhận lưu CV thử. Script **có ghi dữ liệu**
khi dùng `--execute`; mặc định chỉ dry run.

## Điều kiện trước khi chạy thật

1. Chỉ dùng Compose cục bộ với `test-db/knowledgehub_test`, không dùng
   Supabase/shared/cloud DB. Backend app phục vụ cổng 8080 phải được khởi tạo
   với `DB_CONNECTION=pgsql`, `DB_HOST=test-db`,
   `DB_DATABASE=knowledgehub_test`, `DB_URL` rỗng và không có Laravel config
   cache. Đặt `CV_STORAGE_DRIVER=local` để PDF thử nằm trên private local
   disk, không đi tới Supabase Storage. Script kiểm tra lại các điều kiện đó
   trong container, đồng thời
   xác nhận Compose Nginx chỉ bind `127.0.0.1:8080` qua
   `docker-compose.agent-local.yml`; nếu không chứng minh được
   cả hai thì không gửi request. Không dùng `docker compose config`
   không có `--quiet` vì lệnh đó có thể in secret.
2. Dùng đúng database `test-db` hiện có. Chỉ áp dụng migration **tiến lên**
   sau khi guard kết nối xác nhận đích; không dùng `migrate:fresh`,
   `migrate:refresh`, `db:wipe` hoặc reset. Không chạy benchmark đồng thời
   với PHPUnit hay tác vụ khác đang ghi vào `test-db`.
3. Cấu hình `AI_AGENTS_ENABLED`, ba cờ `AI_AGENT_*`, AI service token,
   DeepSeek API key và YouTube API key trong môi trường cục bộ riêng. Không
   đưa giá trị vào git hoặc đầu ra lệnh. Cần ba tài khoản thử độc lập và một
   tài khoản User đích chỉ dành cho phép đổi trạng thái Admin.
4. Kiểm tra chính sách dữ liệu: 20 course và các bản CV thử sẽ được tạo trên
   test-db/Storage thử. Script không xóa dữ liệu. Người vận hành tự xử lý dữ
   liệu thử theo quy trình riêng sau khi đo, không dùng lệnh reset DB.

## Chạy

```powershell
py scripts/benchmark-agent-workflows.py
```

Dry run không cần credential. Tạo 5 PDF tổng hợp có văn bản và manifest
20 chủ đề trong thư mục tạm ngoài repository bằng:

```powershell
py scripts/prepare-agent-benchmark-fixtures.py
```

Sau khi migration tiến lên đã hoàn tất trên `test-db`, tạo bốn tài khoản thử
(Admin, Contributor, User và User đích) cùng ba Sanctum token bằng script có
guard kết nối, không dùng `db:seed`:

```powershell
docker compose -f docker-compose.yml -f docker-compose.agent-local.yml exec -T app php scripts/prepare-agent-benchmark-fixtures.php
```

Script chỉ in số lượng và đường dẫn file credential nằm trong
`backend/storage/app/private/` (được gitignore, quyền 0600 trong container).
Không in hoặc commit nội dung file. Đặt
`KH_BENCHMARK_BASE_URL=http://127.0.0.1:8080` và
`KH_BENCHMARK_ISOLATED_DB=1` trong phiên shell riêng. Dùng đường dẫn
`cases.json` và file credential vừa tạo cho lệnh sau:

```powershell
py scripts/benchmark-agent-workflows.py --execute --iterations 20 --cases-file <duong-dan-cases.json> --credentials-file <duong-dan-credentials.json> --output agent-benchmark-results.json
```

Kiểm tra nhanh trước khi chạy đủ 20 vòng: `--smoke` gửi đúng một course (cần
`--topic` có playlist công khai 2–20 video); `--pilot` cho phép 4–19 vòng.
Pilot vẫn giữ khoảng cách 21 giây và **không thể đạt** `benchmark_gate_pass`
vì cổng yêu cầu đủ 20 lượt cho mỗi workflow; báo cáo và telemetry của pilot
vẫn ghép và ghi được bình thường.

```powershell
py scripts/benchmark-agent-workflows.py --execute --smoke --topic <chu-de> --credentials-file <duong-dan-credentials.json>
py scripts/benchmark-agent-workflows.py --execute --pilot --iterations 4 --cases-file <cases-pilot.json> --credentials-file <duong-dan-credentials.json> --output agent-benchmark-pilot.json
```

Mỗi route agent có bộ đếm throttle riêng (tiền tố khác nhau), nên mỗi vòng
cách nhau ít nhất 21 giây để từng bộ đếm, gồm preview và confirm của CV, vẫn
dưới 3 yêu cầu/phút; 20 vòng mất tối thiểu khoảng 7 phút, chưa tính thời gian AI.

Không commit file kết quả. Script chỉ ghi trạng thái HTTP, thời gian và UUID
`X-Request-ID` cho từng lời gọi; không ghi token, CV, prompt, đối tượng Admin,
ID course hoặc nội dung phản hồi. Kết quả p50/p95 tính trên lượt thành công;
tỷ lệ lỗi tính trên toàn bộ lượt. Lệnh trả exit code khác 0 khi có lỗi.

## Hoàn thiện báo cáo

Ghép UUID `X-Request-ID` trong báo cáo với log an toàn của Laravel/FastAPI
và số liệu provider. Chuẩn bị CSV chỉ có các cột
`request_id,input_tokens,output_tokens,youtube_quota_units,provider_cost`,
một dòng cho mỗi UUID trong báo cáo, dùng số 0 khi endpoint không gọi model
hoặc YouTube. Sau khi kiểm tra chất lượng và bảo mật thủ công, ghép số liệu:

```powershell
py scripts/benchmark-agent-workflows.py --join-report agent-benchmark-results.json --telemetry metrics.csv --quality-reviewed --output agent-benchmark-reviewed.json
```

Script chỉ đặt `benchmark_gate_pass=true` nếu mỗi workflow đủ 20 lượt, mọi lượt
thành công, đầy đủ telemetry cho từng UUID và người vận hành đã xác nhận rà
soát chất lượng.
Nếu telemetry chưa có, các trường đó ở `null`; **không tự suy đoán chi phí**
và **không cho phép bật workflow** vì cổng benchmark chưa đạt. Đánh giá thủ công ít nhất 20 kết quả course
và CV về độ chính xác, cùng các ca prompt injection, sai quyền, role thay đổi
giữa chừng và xác nhận dùng lại từ bộ test bảo mật. Không dùng dữ liệu CV thật.

Chỉ bật workflow sau khi Feature test không reset, smoke test và báo cáo đo
kiểm đều đạt. Rollback là tắt cờ tương ứng; không drop bảng hay reset dữ liệu.
