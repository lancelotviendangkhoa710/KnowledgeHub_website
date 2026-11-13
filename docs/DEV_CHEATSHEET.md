# Chạy KnowledgeHub trên máy cá nhân

Yêu cầu: Git, Docker Desktop đang chạy và quyền kết nối Supabase do nhóm cấp.
Chạy các lệnh PowerShell tại thư mục gốc của repository. Database là **dữ liệu
dùng chung**: thay đổi từ ứng dụng sẽ được các thành viên khác nhìn thấy.

## Lần đầu sau khi clone

```powershell
git clone https://github.com/lancelotviendangkhoa710/KnowledgeHub_website.git
cd KnowledgeHub_website
Copy-Item backend/.env.example backend/.env
```

Không ghi đè `backend/.env` nếu đã có. Mở file đó và điền `DB_HOST`, `DB_PORT`,
`DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` theo Supabase Dashboard → Connect.
Dùng **Session pooler** khi mạng chỉ có IPv4, `DB_SSLMODE=require`, và
`DB_PERSISTENT=false`. Điền `AI_SERVICE_TOKEN` và `DEEPSEEK_API_KEY` do nhóm
cấp nếu cần AI. Không đưa file này vào Git. `APP_KEY` phải là khóa Laravel riêng.

```powershell
docker compose run --rm --no-deps app php artisan key:generate
docker compose up -d --build
```

Chỉ chạy `key:generate` **lần đầu khi `APP_KEY` còn trống**; đổi khóa sau đó có
thể làm dữ liệu được mã hóa bằng khóa cũ không còn đọc được. Container chạy một
lần sẽ cài dependencies trước khi tạo khóa; khởi động các service sau đó để
chúng nhận khóa mới. Nếu service đã chạy khi thay đổi `backend/.env`, tạo lại
container để nạp cấu hình mới:

```powershell
docker compose up -d --force-recreate app nginx
```

Lần chạy sau chỉ cần:

```powershell
docker compose up -d
```

Truy cập website tại http://localhost:3000 và API tại
http://localhost:8080/api/v1/categories. Các tài khoản test được nhóm cấp riêng.
Đăng ký hoặc tạo nội dung sẽ ghi vào database dùng chung.

## Đăng nhập bằng Google (tùy chọn)

Nút "Continue with Google" cần OAuth client riêng, không có thì nút báo "chưa cấu hình".

1. Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID (Web application).
2. Authorized redirect URI: `http://localhost:3000/api/auth/google/callback`. Nếu app ở chế độ Testing, thêm email của bạn vào Test users.
3. Điền vào `backend/.env` (không commit): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback`.
4. `docker compose up -d --force-recreate app nginx`, rồi mở http://localhost:3000/login.

Chỉ dùng http://localhost:3000 cho cả đăng nhập và duyệt web (cookie không chia sẻ giữa các địa chỉ khác nhau).
Email Google chưa có tài khoản sẽ tạo tài khoản `active`; tài khoản `pending`, `inactive`, `banned` bị từ chối.

## Kiểm tra và xử lý lỗi

```powershell
docker compose ps
docker compose logs --tail=100 app nginx frontend ai-service
docker compose restart frontend
docker compose restart app nginx
```

API categories trả HTTP 200 là kiểm tra đọc database qua Laravel. Kiểm tra AI
service không gọi nhà cung cấp và không phát sinh yêu cầu AI:

```powershell
docker compose exec -T ai-service python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8000/health').status)"
```

Nếu website hoặc API lỗi 502, kiểm tra `docker compose ps`, sau đó xem logs;
app có thể đang cài Composer khi chạy lần đầu. Nếu API lỗi kết nối database,
kiểm tra thông tin Session pooler, SSL, mạng và quyền truy cập. Nếu gặp lỗi
prepared statement, kiểm tra đang dùng session pooler và tắt `DB_PERSISTENT`.
Không chia sẻ log có chứa thông tin kết nối hoặc khóa.

## Cập nhật và tắt

```powershell
git pull
docker compose up -d --build
docker compose stop
```

Nếu lockfile dependencies thay đổi, cập nhật các volume dependencies:

```powershell
docker compose exec app composer install --no-interaction --prefer-dist
docker compose exec frontend npm ci
docker compose restart app nginx frontend
```

Xem [AGENT_RUNBOOK.md](AGENT_RUNBOOK.md) để chạy test trên database cô lập.
Không chạy `migrate:fresh`, `migrate:refresh`, `db:wipe` hoặc seed trên Supabase.
Việc tạo khóa lần đầu, clone/pull và cập nhật dependencies chưa được kiểm thử
trọn quy trình trên một bản clone mới trong phiên này. Hot reload frontend đã
được kiểm tra bằng một route tạm; cập nhật có thể mất vài giây.
