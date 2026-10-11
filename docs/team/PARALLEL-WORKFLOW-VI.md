# Quy Trình Làm Việc Song Song — 3 Người Vibe Code

**Phiên bản**: 1.0 | **Ngày**: 2026-10-11
**Đối tượng**: 3 developer dùng AI coding agent (Cline, Cursor, Copilot) làm việc đồng thời

---

## 1. Tổng quan

3 người code đồng thời trên cùng repo. Mỗi người sở hữu 1 domain độc lập:

```
ĐỌC   → toàn bộ repo                   (ai cũng được)
VIẾT  → chỉ files trong domain mình    (nghiêm ngặt)
CHUNG → phối hợp trước khi sửa         (không tự ý)
```

Không xung đột nhờ:
- Thư mục riêng, file routes riêng, tests riêng
- Không ai sửa code của người khác
- File chung đã tách nhỏ theo domain

---

## 2. Phân chia domain

| Người | Domain | Branch | Commit |
|---|---|---|---|
| **TEAM_MEMBER_A** | Identity / Auth (đăng ký, đăng nhập, RBAC) | `p1/` | `p1:` |
| **TEAM_MEMBER_B** | Content (bài viết, danh mục, tags, bookmarks) | `p2/` | `p2:` |
| **TEAM_MEMBER_C** | Learning + Infra (roadmap, tiến trình, Docker) | `p3/` | `p3:` |

### Bảng files cho từng người

#### TEAM_MEMBER_A — Auth (`p1/`)
```
✅ ĐƯỢC SỬA:
  backend/app/Http/Controllers/Auth/
  backend/app/Http/Requests/Auth/
  backend/app/Models/User.php, Role.php
  backend/app/Policies/UserPolicy.php
  backend/app/Services/Auth/
  backend/routes/api/auth.php          ← file routes RIÊNG
  database/migrations/<mới>_<auth>.php ← chỉ tạo file MỚI
  tests/Feature/Auth/  tests/Unit/Auth/

❌ CẤM SỬA:
  backend/app/Http/Controllers/Content/
  backend/app/Http/Controllers/Learning/
  database/migrations/*_articles*.php
  database/migrations/*_learning*.php
```

#### TEAM_MEMBER_B — Content (`p2/`)
```
✅ ĐƯỢC SỬA:
  backend/app/Http/Controllers/Content/
  backend/app/Http/Requests/Content/
  backend/app/Models/Article.php, ArticleVersion.php, Category.php
  backend/app/Models/Tag.php, Bookmark.php, ArticleAttachment.php
  backend/app/Policies/ArticlePolicy.php
  backend/app/Services/Content/
  backend/routes/api/content.php       ← file routes RIÊNG
  database/migrations/<mới>_<content>.php
  tests/Feature/Content/  tests/Unit/Content/

❌ CẤM SỬA:
  backend/app/Http/Controllers/Auth/
  backend/app/Http/Controllers/Learning/
  database/migrations/*_users*.php
  database/migrations/*_learning*.php
```

#### TEAM_MEMBER_C — Learning + Infra (`p3/`)
```
✅ ĐƯỢC SỬA:
  backend/app/Http/Controllers/Learning/
  backend/app/Http/Requests/Learning/
  backend/app/Models/LearningRoadmap.php, RoadmapItem.php, LearningProgress.php
  backend/app/Policies/RoadmapPolicy.php
  backend/app/Services/Learning/
  backend/routes/api/learning.php      ← file routes RIÊNG

---

## 3. Bootstrap Bắt Buộc (Trước khi code song song)

> ⚠️ TEAM_MEMBER_C (p3) làm 1 lần duy nhất trên nhánh dev:
> Chi tiết từng lệnh: xem `docs/team/BOOTSTRAP-CHECKLIST-VI.md`.

Các bước chính:
1. Tạo nhánh `dev` từ `main`, push lên remote
2. Chạy Docker để bootstrap Laravel, commit app source được track
3. Tạo 3 file route con: `routes/api/auth.php`, `routes/api/content.php`, `routes/api/learning.php`
4. Cập nhật `backend/routes/api.php` require 3 file trên, không ai code thẳng vào `api.php`

---

## 4. Quy trình hàng ngày

### Buổi sáng: Đồng bộ code (2 phút)
```powershell
.\scripts\daily-sync.ps1
```
Hoặc thủ công:
```powershell
git fetch origin
git checkout dev ; git pull origin dev
git checkout p1/ten-task ; git rebase origin/dev
```

### Khi code: Commit nhỏ theo domain
```powershell
# Chỉ add files thuộc domain của mình:
git add backend/app/Http/Controllers/Auth/LoginController.php
git add tests/Feature/Auth/LoginTest.php
git commit -m "p1: add login controller and validation"
git push origin p1/auth-login
```

### Trước khi mở PR: Kiểm tra tự động
```powershell
# 1. Chạy test của domain
docker compose exec app php artisan test tests/Feature/Auth/

# 2. Chạy guardrails
.\scripts\test-guardrails.ps1 -BaseRef origin/dev -RequireTaskId

# 3. Kiểm tra không sửa file ngoài domain
.\scripts\check-domain-ownership.ps1

# 4. Mở PR

---

## 5. Quy tắc phòng tránh xung đột

1. **Routes**: Tuyệt đối không thêm route trực tiếp vào `api.php`. Luôn khai báo trong file con (`auth.php`, `content.php`, `learning.php`).
2. **Migrations**: Luôn tạo migration file mới với timestamp mới. Không bao giờ sửa migration cũ đã merge.
3. **Seeders**: p1/p2 viết seeder riêng, nhờ p3 (owner infra) đăng ký vào `DatabaseSeeder.php`.
4. **Middleware & Providers**: File bootstrap chung. Cần thay đổi thì tạo PR riêng hoặc nhờ p3.
5. **Độ dài branch**: Mỗi nhánh sống tối đa 1-2 ngày. Merge sớm tránh lệch mã nguồn.

---

## 6. Xử lý phụ thuộc chéo (Cross-Domain)

Khi task của bạn cần sửa file thuộc domain của người khác:
1. **DỪNG CODE NGAY LẬP TỨC**.
2. Không tự ý sửa file ngoài phạm vi.
3. Báo team theo mẫu:
```text
STATUS: BLOCKED
TASK: <ID task>
DOMAIN CẦN SỬA: <Auth / Content / Learning>
FILES CẦN ĐỤNG: <đường dẫn file>
LÝ DO: <tại sao cần sửa>
```
4. Đợi người sở hữu domain đó implement hoặc thống nhất phương án trước khi tiếp tục.

---

## 7. Giải quyết xung đột khi Rebase (Merge Conflict)

```powershell
git fetch origin
git rebase origin/dev

# Nếu có conflict:
# 1. Mở file conflict, chỉnh sửa giữ đúng logic
# 2. git add <file-da-fix>
# 3. git rebase --continue
# 4. Push an toàn:
git push origin p1/ten-branch --force-with-lease
# TUYỆT ĐỐI KHÔNG dùng --force thông thường
```

.\scripts\create-pr.ps1 -Title "p1: implement login endpoint"
```

  database/migrations/<mới>_<learning>.php
  database/seeders/CategorySeeder.php, PlanSeeder.php
  tests/Feature/Learning/  tests/Unit/Learning/
  docker/, docker-compose.yml

❌ CẤM SỬA:
  backend/app/Http/Controllers/Auth/
  backend/app/Http/Controllers/Content/
  database/migrations/*_users*.php
  database/migrations/*_articles*.php
```
