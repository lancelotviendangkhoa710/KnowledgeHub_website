# Team Workflow — Nhóm 3 Người Vibe Code

**Dự án**: KnowledgeHub | **Cập nhật**: 2026-10-05

---

## 1. Phân công Role

| Role | Directory owns | KHÔNG chạm |
|------|----------------|------------|
| **P1 — Backend Lead** | `backend/app/`, `backend/routes/`, `database/migrations/` | `frontend/`, `docker/` |
| **P2 — Frontend Lead** | `frontend/` (pages, components, hooks, store) | `backend/`, `database/migrations/` |
| **P3 — Infra / Integrator** | `docker/`, `docs/`, `database/seeders/`, `.env.example`, `docker-compose.yml` | Không viết business logic |

> Muốn chạm file người khác → nhắn hỏi trước, không tự ý sửa.

---

## 2. Cấu trúc Branch

```
main       ← production, chỉ merge từ dev
 └── dev   ← integration, mọi người target vào đây
      ├── p1/feature-name
      ├── p2/feature-name
      └── p3/feature-name
```

Ví dụ: `p1/auth-api`, `p2/login-page`, `p3/docker-setup`

---

## 3. Contract First — Không Waiting Nhau

Define API contract trước khi tách ra code (~30 phút đầu sprint):

```
POST /api/v1/articles
  body:     { title: string, body: string, tags: string[] }
  response: 201 { id: uuid, slug: string, created_at: string }

GET /api/v1/articles
  response: 200 [{ id, title, author: { id, name }, tags[] }]
```

P2 mock ngay bằng `msw`, không chờ P1:

```js
// frontend/src/mocks/handlers.js
import { http, HttpResponse } from 'msw'
export const handlers = [
  http.get('/api/v1/articles', () =>
    HttpResponse.json([{ id: 'uuid-1', title: 'Test', author: { id: 'u1', name: 'P1' }, tags: [] }])
  ),
  http.post('/api/v1/articles', () =>
    HttpResponse.json({ id: 'uuid-2', slug: 'test', created_at: new Date().toISOString() }, { status: 201 })
  ),
]
```

Khi P1 xong API thật → P2 tắt mock, kết nối thật.

---

## 4. Daily Routine

```powershell
# === Sáng trước khi code ===
git fetch origin
git rebase origin/dev

# === Trong ngày, mỗi 1-2 giờ ===
git add .
git commit -m "p1: add article store endpoint"
git push origin p1/article-crud-api

# === Cuối ngày / xong task ===
git fetch origin
git rebase origin/dev
# → Mở PR vào dev
```

---

## 5. Quy Trình Git Chi Tiết

### BƯỚC 0 — Setup lần đầu (1 lần duy nhất)

```powershell
git clone https://github.com/lancelotviendangkhoa710/KnowledgeHub_website.git
cd KnowledgeHub_website
git config user.name "Tên Của Bạn"
git config user.email "email@example.com"
git remote -v
```

---

### BƯỚC 1 — Bắt đầu task mới

```powershell
# Về dev, lấy code mới nhất
git checkout dev
git pull origin dev

# Tạo branch mới từ dev
git checkout -b p1/article-crud-api

# Xác nhận đang ở đúng branch
git branch
```

---

### BƯỚC 2 — Trong lúc code

```powershell
# Xem file đang thay đổi
git status

# Xem chi tiết diff trước khi commit
git diff

# Stage file cụ thể (khuyến nghị hơn git add .)
git add backend/app/Http/Controllers/ArticleController.php
git add database/migrations/2026_10_05_000010_create_articles_table.php

# Commit
git commit -m "p1: add ArticleController with store and index"

# Push lên remote
git push origin p1/article-crud-api
```

Chuẩn commit message:
```
p1: add article store endpoint
p1: fix validation for article tags
p2: add ArticleList component
p3: update docker-compose postgres healthcheck
```

---

### BƯỚC 3 — Rebase từ dev (sáng và trước PR)

```powershell
git fetch origin
git rebase origin/dev

# Nếu conflict → mở file sửa → rồi:
git add ten-file-da-sua
git rebase --continue

# Hủy rebase nếu cần
git rebase --abort

# Push lại sau rebase (dùng --force-with-lease, KHÔNG dùng --force)
git push origin p1/article-crud-api --force-with-lease
```

---

### BƯỚC 4 — Mở Pull Request

```powershell
git fetch origin
git rebase origin/dev
git push origin p1/article-crud-api --force-with-lease
```

Trên GitHub:
1. **Pull Requests** → **New Pull Request**
2. **base**: `dev` ← **compare**: `p1/article-crud-api`
3. Mô tả: làm gì, test thế nào
4. Assign reviewer (P2 hoặc P3)
5. **Không self-merge** — chờ người khác approve

---

### BƯỚC 5 — Review PR (người review làm)

```powershell
git fetch origin
git checkout p1/article-crud-api

# Chạy test
docker compose exec app php artisan test

# Ổn → approve và Squash and Merge trên GitHub
```

---

### BƯỚC 6 — Sau khi PR được merge

```powershell
git checkout dev
git pull origin dev

# Xóa branch cũ
git branch -d p1/article-crud-api
git push origin --delete p1/article-crud-api

# Tạo branch cho task tiếp theo
git checkout -b p1/comment-api
# → Quay lại BƯỚC 1
```

---

## 6. File Nhạy Cảm — Ai Owns Ai

| File | Owner | Người khác muốn sửa |
|------|-------|---------------------|
| `docker-compose.yml` | P3 | Nhắn P3 |
| `.env.example` | P3 | Nhắn P3 |
| `backend/routes/api.php` | P1 | Nhắn P1 |
| `database/migrations/*.php` | P1 | Nhắn P1 tạo migration mới |
| `database/seeders/DatabaseSeeder.php` | P3 | Nhắn P3 |
| `frontend/package.json` | P2 | Nhắn P2 |

Migration tự tránh conflict vì Laravel generate timestamp unique:
```powershell
docker compose exec app php artisan make:migration create_comments_table
# → 2026_10_05_143022_create_comments_table.php
```

---

## 7. Xử Lý Conflict

```powershell
git rebase origin/dev
# Git báo: CONFLICT in backend/routes/api.php

# Mở file, tìm và sửa markers:
<<<<<<< HEAD
Route::get('/articles', [ArticleController::class, 'index']);
=======
Route::get('/articles', [ArticleController::class, 'list']);
>>>>>>> origin/dev

# Sau khi sửa:
git add backend/routes/api.php
git rebase --continue
```

---

## 8. Checklist Trước Khi Mở PR

- [ ] `git rebase origin/dev` — không còn conflict
- [ ] `docker compose exec app php artisan test` — pass
- [ ] Không commit `.env` (chỉ `.env.example`)
- [ ] Không còn `dd()`, `var_dump()`, `console.log()` debug
- [ ] Tên branch đúng: `p1/`, `p2/`, `p3/`
- [ ] Commit message rõ, không phải `fix`, `update`, `wip`
- [ ] PR description mô tả task + cách test

---

## 9. Quick Reference — Lệnh Hay Dùng Nhất

```powershell
# Xem trạng thái
git status
git log --oneline -10
git diff

# Sáng đầu ngày
git fetch origin
git rebase origin/dev

# Commit thường ngày
git add .
git commit -m "p1: mô tả ngắn"
git push origin ten-branch

# Trước khi mở PR
git fetch origin
git rebase origin/dev
git push origin ten-branch --force-with-lease

# Sau khi PR được merge
git checkout dev
git pull origin dev
git branch -d ten-branch-cu
git push origin --delete ten-branch-cu
git checkout -b ten-branch-moi
```
