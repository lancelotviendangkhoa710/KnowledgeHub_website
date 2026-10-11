# Bảng Tham Chiếu Nhanh — 3 Người Vibe Code

> In ra hoặc pin lên desktop. Nhìn mỗi khi bắt đầu code.

---

## Lệnh thường dùng

```powershell
# ── Bắt đầu task mới ──
.\scripts\agent-start-task.ps1 -Branch "p1/AUTH-01-login"

# ── Sync hàng ngày ──
.\scripts\daily-sync.ps1

# ── Commit ──
git add <files-cụ-thể>
git commit -m "p1: mô tả ngắn"
git push origin p1/AUTH-01-login

# ── Trước khi tạo PR ──
docker compose exec app php artisan test tests/Feature/Auth/
.\scripts\test-guardrails.ps1 -BaseRef origin/dev -RequireTaskId
.\scripts\check-domain-ownership.ps1

# ── Tạo PR ──
.\scripts\create-pr.ps1 -Title "p1: implement login endpoint"

# ── Sau khi merge ──
.\scripts\agent-finish-task.ps1
```

---

## Ai sửa file nào — Tóm tắt

```
p1 (Auth):     Controllers/Auth/  Models/User,Role  routes/api/auth.php     tests/Feature/Auth/
p2 (Content):  Controllers/Content/  Models/Article..  routes/api/content.php  tests/Feature/Content/
p3 (Learning): Controllers/Learning/  Models/Roadmap..  routes/api/learning.php  tests/Feature/Learning/
```

---

## Commit convention

```
p1: <mô tả>     ← TEAM_MEMBER_A (Auth)
p2: <mô tả>     ← TEAM_MEMBER_B (Content)
p3: <mô tả>     ← TEAM_MEMBER_C (Learning/Infra)
docs: <mô tả>   ← tài liệu
fix: <mô tả>    ← sửa bug
chore: <mô tả>  ← bảo trì
```

---

## 8 quy tắc vàng

```
1. ✅ Mỗi sáng sync:   git fetch ; git rebase origin/dev
2. ✅ Chỉ sửa files trong domain MÌNH
3. ✅ Routes riêng:     routes/api/auth.php | content.php | learning.php
4. ✅ Migration:        tạo file MỚI, KHÔNG sửa cũ
5. ✅ PR nhỏ:           < 1-2 ngày, merge sớm
6. ✅ Cross-domain:     DỪNG → báo team → đợi approve
7. ✅ Guardrails:       chạy trước mỗi PR
8. ✅ Review:           không tự merge PR của mình
```

---

## 6 điều KHÔNG LÀM

```
1. ❌ git add .                    → dễ add nhầm file
2. ❌ Sửa api.php trực tiếp       → dùng file domain riêng
3. ❌ Sửa migration người khác    → tạo migration MỚI
4. ❌ Code trên main hoặc dev     → tạo branch riêng
5. ❌ --force push                → dùng --force-with-lease
6. ❌ Ôm branch > 2 ngày          → merge sớm, branch nhỏ
```

---

## Khi gặp vấn đề

| Tình huống | Làm gì |
|---|---|
| Cần sửa file domain người khác | DỪNG → nhắn team → đợi approve |
| Merge conflict | `git rebase origin/dev` → resolve → `--force-with-lease` |
| AI agent sửa file ngoài domain | `git checkout -- <file>` → nhắc agent |
| Migration phụ thuộc table chưa có | Đợi PR kia merge trước |
| Không biết file thuộc domain nào | Xem `docs/team/OWNERSHIP.md` |
| Cần sửa shared file | Thông báo team trước, PR riêng |

---

## Thứ tự merge khi có dependency

```
p1 (Auth/Users) → p2 (Content) → p3 (Learning)
        ↑                ↑              ↑
   users table      articles table   roadmaps table
   (không FK)       (FK → users)     (FK → users, articles)
```

---

## Docker commands

```powershell
docker compose up -d                                        # Khởi động
docker compose exec app php artisan migrate                 # Chạy migration
docker compose exec app php artisan db:seed                 # Seed data
docker compose exec app php artisan migrate:fresh --seed    # Reset DB
docker compose exec app php artisan test                    # Chạy tất cả tests
docker compose exec app php artisan test tests/Feature/Auth/  # Test 1 domain
docker compose exec postgres psql -U knowledgehub -d knowledgehub  # SQL shell
```
