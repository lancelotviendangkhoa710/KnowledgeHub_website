#!/usr/bin/env pwsh
# scripts/ensure-skills.ps1
# Tự động kiểm tra danh mục skill bắt buộc cho Agent.
# Nếu thiếu skill nào trong .agents/skills/ hoặc skills/, tự động khởi tạo ngay.
#
# Cách dùng:
#   .\scripts\ensure-skills.ps1

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path "$PSScriptRoot/..").Path

Write-Host "🔍 Đang kiểm tra hệ thống AI Skills..." -ForegroundColor Cyan

# Danh sách các skill cốt lõi bắt buộc
$requiredSkills = @(
    @{
        Name = "database-design"
        Dir  = "$repoRoot/skills/database-design"
        File = "skill.md"
        Desc = "Thiết kế quan hệ schema, migration, ERD và ràng buộc dữ liệu"
        InitContent = @"
# Database Design Skill

## Mục đích
Hỗ trợ Agent thiết kế quan hệ schema, migration Laravel, ERD và các ràng buộc dữ liệu PostgreSQL.

## Nguyên tắc bắt buộc
- Khóa chính luôn là UUID v4.
- Timestamps sử dụng timestampTz.
- Ràng buộc quan hệ FK tường minh kèm cascade delete hợp lệ.
- Enum dùng VARCHAR + CHECK constraint, không dùng PostgreSQL native ENUM.
- Không sửa migration cũ; tạo migration mới kèm timestamp.
"@
    },
    @{
        Name = "postgresql-sql"
        Dir  = "$repoRoot/skills/postgresql-sql"
        File = "skill.md"
        Desc = "Viết query an toàn, tối ưu hiệu năng, parameter binding"
        InitContent = @"
# PostgreSQL SQL Skill

## Mục đích
Hướng dẫn viết câu truy vấn SQL an toàn, hiệu năng cao và tương thích PostgreSQL 16.

## Nguyên tắc bắt buộc
- Bắt buộc dùng Parameter Binding / Eloquent chuẩn; cấm nối chuỗi raw SQL.
- Sử dụng SoftDeletes scope (lọc deleted_at is null).
- Multi-step write bắt buộc bọc trong DB::transaction().
"@
    },
    @{
        Name = "api-contract-design"
        Dir  = "$repoRoot/skills/api-contract-design"
        File = "skill.md"
        Desc = "Thiết kế API REST contract-first, tài liệu hóa endpoint"
        InitContent = @"
# API Contract Design Skill

## Mục đích
Đảm bảo Agent tuân thủ chuẩn REST API và cập nhật docs/API.md trước/trong khi code.

## Quy chuẩn
- Định dạng response: { "data": ..., "message": ..., "status": "success|error" }
- Phân trang chuẩn: { "data": [...], "meta": { "current_page": 1, "per_page": 15, "total": 100 } }
- Trả về mã lỗi 401, 403, 404, 422 rõ ràng theo schema.
- Không tự ý sửa chữ ký endpoint hiện tại mà chưa thống nhất cross-domain.
"@
    },
    @{
        Name = "domain-driven-boundary"
        Dir  = "$repoRoot/skills/domain-driven-boundary"
        File = "skill.md"
        Desc = "Đảm bảo tuân thủ ranh giới sở hữu domain (Auth, Content, Learning)"
        InitContent = @"
# Domain Driven Boundary Skill

## Mục đích
Ngăn chặn xung đột mã nguồn khi 3 lập trình viên / Agent cùng làm việc trên 1 repository.

## Nguyên tắc
- Nhánh p1 chỉ sửa: app/Http/Controllers/Auth, routes/api/auth.php, Models/User.php, tests/Feature/Auth
- Nhánh p2 chỉ sửa: app/Http/Controllers/Content, routes/api/content.php, Models/Article.php..., tests/Feature/Content
- Nhánh p3 chỉ sửa: app/Http/Controllers/Learning, routes/api/learning.php, Models/LearningRoadmap.php..., docker
- Gặp phụ thuộc ngoài domain -> DỪNG NGAY và báo STATUS: BLOCKED.
"@
    }
)

$createdCount = 0

foreach ($skill in $requiredSkills) {
    $targetDir = $skill.Dir
    $targetFile = "$targetDir/$($skill.File)"

    if (-not (Test-Path $targetDir)) {
        Write-Host "Thiếu thư mục skill [$($skill.Name)]. Đang khởi tạo..." -ForegroundColor Yellow
        New-Item -Path $targetDir -ItemType Directory -Force | Out-Null
    }

    if (-not (Test-Path $targetFile)) {
        Write-Host "Tạo mới tài liệu skill: $targetFile ($($skill.Desc))" -ForegroundColor Green
        Set-Content -Path $targetFile -Value $skill.InitContent -Encoding utf8
        $createdCount++
    } else {
        Write-Host "✅ Skill [$($skill.Name)] đã sẵn sàng." -ForegroundColor DarkGreen
    }
}

if ($createdCount -gt 0) {
    Write-Host "`n✨ Đã tự động tạo $createdCount skill(s) còn thiếu trên máy." -ForegroundColor Green
} else {
    Write-Host "`n✅ Toàn bộ kỹ năng yêu cầu đã đầy đủ trên môi trường." -ForegroundColor Green
}
exit 0
