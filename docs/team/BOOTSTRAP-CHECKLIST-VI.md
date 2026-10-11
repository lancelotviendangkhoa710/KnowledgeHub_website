# Checklist Bootstrap — Trước Khi 3 Người Code Song Song

**Người thực hiện**: TEAM_MEMBER_C (p3 — Infra owner)
**Khi nào**: 1 lần duy nhất, TRƯỚC khi team bắt đầu code features

---

## Giai đoạn 1: Tạo branch dev

```powershell
git checkout main
git pull origin main
git checkout -b dev
git push origin dev
```

Xác nhận:
```
[ ] Branch dev tồn tại trên remote
[ ] git branch -a hiển thị remotes/origin/dev
```

---

## Giai đoạn 2: Bootstrap Laravel source

```powershell
# Khởi động Docker để Laravel bootstrap
docker compose up -d

# Đợi ~60s cho Laravel install xong
# Kiểm tra artisan tồn tại:
docker compose exec app ls -la artisan
```

Track source code:
```powershell
cd backend

# Track application directories (không track vendor/)
git add app/ routes/ config/ bootstrap/ tests/ resources/
git add public/index.php public/.htaccess
git commit -m "p3: track Laravel application source"
```

Xác nhận:
```
[ ] backend/app/ đã tracked
[ ] backend/routes/api.php đã tracked
[ ] backend/config/ đã tracked
[ ] backend/bootstrap/app.php đã tracked
[ ] backend/tests/ đã tracked
[ ] backend/vendor/ KHÔNG tracked (có trong .gitignore)
```

---

## Giai đoạn 3: Tách routes theo domain

Tạo thư mục:
```powershell
mkdir backend/routes/api
```

Tạo file `backend/routes/api/auth.php`:
```php
<?php
// ╔══════════════════════════════════════════╗
// ║  Domain: Identity / Auth                ║
// ║  Owner:  TEAM_MEMBER_A (p1)             ║
// ║  CHỈ p1 được sửa file này              ║
// ╚══════════════════════════════════════════╝

use Illuminate\Support\Facades\Route;

// p1: thêm auth routes bên dưới
```

Tạo file `backend/routes/api/content.php`:
```php
<?php
// ╔══════════════════════════════════════════╗
// ║  Domain: Content                        ║
// ║  Owner:  TEAM_MEMBER_B (p2)             ║
// ║  CHỈ p2 được sửa file này              ║
// ╚══════════════════════════════════════════╝

use Illuminate\Support\Facades\Route;

// p2: thêm content routes bên dưới
```

Tạo file `backend/routes/api/learning.php`:
```php
<?php
// ╔══════════════════════════════════════════╗
// ║  Domain: Learning                       ║
// ║  Owner:  TEAM_MEMBER_C (p3)             ║
// ║  CHỈ p3 được sửa file này              ║
// ╚══════════════════════════════════════════╝

use Illuminate\Support\Facades\Route;

// p3: thêm learning routes bên dưới
```

Sửa `backend/routes/api.php` — thêm require ở cuối file:
```php
// ┌─────────────────────────────────────────────────┐
// │  Domain routes — mỗi người sửa file RIÊNG      │
// │  KHÔNG thêm routes trực tiếp vào file này       │
// └─────────────────────────────────────────────────┘

require __DIR__.'/api/auth.php';      // p1 — TEAM_MEMBER_A
require __DIR__.'/api/content.php';   // p2 — TEAM_MEMBER_B
require __DIR__.'/api/learning.php';  // p3 — TEAM_MEMBER_C
```

Commit:
```powershell
git add backend/routes/api.php backend/routes/api/
git commit -m "p3: split api routes by domain to prevent merge conflicts"
```

Xác nhận:
```
[ ] backend/routes/api/auth.php tồn tại
[ ] backend/routes/api/content.php tồn tại
[ ] backend/routes/api/learning.php tồn tại
[ ] backend/routes/api.php require 3 file trên
```

---

## Giai đoạn 4: Cập nhật .gitignore

Kiểm tra `backend/.gitignore` có ignore `vendor/`:
```
[ ] vendor/ có trong .gitignore
[ ] .env có trong .gitignore (nhưng .env.example KHÔNG bị ignore)
[ ] storage/*.key có trong .gitignore
```

---

## Giai đoạn 5: Push và thông báo

```powershell
git push origin dev
```

Thông báo team:
```
@team Branch dev đã sẵn sàng.

Bắt đầu task:
  .\scripts\agent-start-task.ps1 -Branch "p1/AUTH-01-login"

Routes đã tách:
  p1 → backend/routes/api/auth.php
  p2 → backend/routes/api/content.php
  p3 → backend/routes/api/learning.php

Đọc quy trình: docs/team/PARALLEL-WORKFLOW-VI.md
Tham chiếu nhanh: docs/team/QUICK-REFERENCE-VI.md
```

---

## Xác nhận cuối cùng

```
[ ] Branch dev tồn tại và đã push
[ ] Laravel source tracked (backend/app/, routes/, config/, etc.)
[ ] Routes tách 3 file theo domain
[ ] .gitignore đúng
[ ] Team đã được thông báo
[ ] Tất cả members có thể chạy:
    .\scripts\agent-start-task.ps1 -Branch "p1/test"
    (rồi xóa branch test)
```
