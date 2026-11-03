# UX-01 — KnowledgeHub Design Foundation

**Status:** IMPLEMENTATION IN PROGRESS  
**Owner:** TEAM_MEMBER_A (initial frontend foundation)  
**Source:** Root `index.html` and `style.css`, migrated into Next.js  
**Branch:** `p1/UX-01-design-foundation-rules` (formerly `p1/UX-01-knowledgehub-design-foundation`)  

## Purpose

Establish one reusable visual direction for KnowledgeHub so feature screens do
not invent unrelated styles. The foundation uses the existing editorial design
source: warm paper background, charcoal typography, burgundy accent, restrained
borders, compact radii, and content-led spacing.

## Core Design Tokens & Rules (Quy chuẩn màu nền và màu chữ)

Mọi màn hình trên toàn bộ nền tảng (bao gồm Landing, Auth, Courses, Learning, AI Companion) bắt buộc phải tuân thủ nghiêm ngặt hệ thống Design Tokens và quy chuẩn màu nền - màu chữ sau đây:

### 1. Palette màu nền (Background Colors)

| Token CSS | Giá trị HEX / RGBA | Mục đích & Ngữ cảnh sử dụng bắt buộc |
|---|---|---|
| `--color-off-white` | `#FAF7F5` | **Canvas nền chính (Warm paper background)**: Dùng làm background tổng thể cho `body`, trang chủ, hero section, các khối section landing và layout container ứng dụng. |
| `--color-white` | `#FFFFFF` | **Nền bề mặt nổi (Surface/Card/Input background)**: Dùng cho nền thẻ nội dung (`card`), khung form, ô nhập liệu (`input`, `textarea`), hộp thoại dialog, menu dropdown. |
| `--color-primary-pale` | `#F3E5E5` | **Nền nhấn cấp 1 (Pale accent background)**: Dùng cho pill badges nổi bật, hover state nhẹ, thẻ đang chọn. |
| `--color-primary-faint` | `#FBF0F0` | **Nền nhấn cấp 2 (Faint accent background)**: Dùng cho feature card đặc biệt (ví dụ AI Learning Companion), banner thông báo info/success. |
| `--color-charcoal` | `#242124` | **Nền tương phản cao (High-contrast background)**: Chỉ dùng cho Footer (`.site-footer`). |
| `--color-primary` | `#8B0000` | **Nền thương hiệu chính (Brand accent background)**: Dùng cho CTA banner nổi bật, nút chính (`.btn--primary`). |

### 2. Palette màu chữ & Phân cấp Typography (Text Colors & Hierarchy)

| Token CSS | Giá trị HEX / RGBA | Mục đích & Quy tắc bắt buộc |
|---|---|---|
| `--color-charcoal` | `#242124` | **Màu chữ chính (Primary Text)**: Áp dụng cho toàn bộ tiêu đề (`h1`, `h2`, `h3`, `h4`), tiêu đề khóa học/bài viết, nhãn form (`label`), text quan trọng. Đảm bảo độ tương phản WCAG > 13:1 trên nền `#FAF7F5` và `#FFFFFF`. |
| `--color-gray` | `#706B6B` | **Màu chữ phụ (Secondary / Body Text)**: Áp dụng cho các đoạn văn mô tả (`p`, `desc`), metadata, nhãn phụ, liên kết điều hướng mặc định. Đảm bảo độ tương phản WCAG > 4.5:1 (đạt chuẩn WCAG 2.1 AA). |
| `--color-gray-light` | `#9E9898` | **Màu chữ mờ (Tertiary / Muted Text)**: Áp dụng cho text placeholder, phụ đề nhỏ, trạng thái disabled. |
| `--color-primary` | `#8B0000` | **Màu chữ nhấn thương hiệu (Brand Accent Text)**: Dùng cho từ khóa nhấn (accent heading), link active, text eyebrow in hoa, logo wordmark `Hub`. |
| `--color-primary-light` | `#B22222` | **Màu chữ trạng thái hover/active**: Dùng cho link hover, thông báo lỗi nhẹ/chú thích cảnh báo. |
| `--color-white` | `#FFFFFF` | **Màu chữ tương phản nghịch (Inverted Text)**: **CHỈ ĐƯỢC PHÉP DÙNG TRÊN NỀN TỐI HOẶC NỀN ĐỎ** (như trong nút `.btn--primary`, CTA banner `.cta-section`, hoặc footer `.site-footer`). **TUYỆT ĐỐI CẤM** dùng text màu trắng hoặc xám sáng trên nền canvas giấy ấm / trắng. |

### 3. Font chữ & Phân cấp hiển thị (Font Families)

- **Sans-serif (Phông hệ thống chính)**:  
  `--font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;`  
  Áp dụng cho toàn bộ giao diện: UI controls, body text, tiêu đề thông thường, buttons, inputs.
- **Serif (Phông điểm nhấn Editorial)**:  
  `--font-family-serif: Georgia, 'Times New Roman', serif;`  
  Chỉ dùng cho các từ khóa nhấn nghiêng (italic accent) tại tiêu đề chính (`.hero-heading__accent`) hoặc trích dẫn cảm hứng (blockquotes editorial).

### 4. Quy tắc tương phản & Ngăn ngừa xung đột liên miền (Cross-Domain Contrast Invariants)

1. **Chuẩn tương phản bắt buộc**: Mọi thành phần UI hiển thị văn bản phải đạt tối thiểu chuẩn **WCAG 2.1 AA** (tỷ lệ tương phản ≥ 4.5:1 với văn bản thông thường và ≥ 3:1 với văn bản kích thước lớn/in đậm).
2. **Loại bỏ hiện tượng "Chữ trắng trên nền trắng" (Washed-out Text Bug)**:
   - Nghiêm cấm mọi hành vi sử dụng style dark mode cũ (như `--text-primary: #f8fafc`, `--text-secondary: #cbd5e1`) khi hiển thị trong container nền sáng.
   - Các màn hình thuộc phân hệ của Member B (`/courses`, `CourseCard`) và Member C (`/learning/roadmaps`) khi chạy chung app shell phải kế thừa hệ màu sáng (`--color-charcoal` trên nền `--color-off-white` / `--color-white`).
3. **Cách ly hoặc chuẩn hóa `shared-source.css`**: Không để các biến toàn cục cũ từ `shared-source.css` (`--bg-canvas: #090c13`, `--color-primary: #f59e0b`) làm sai lệch bảng màu nền tảng của `landing-source.css`.

## Migration rules

- Next.js owns the rendered application; root `index.html` remains the source
  markup reference while its approved `style.css` remains the visual source.
- `frontend/src/app/landing-source.css` is an exact copy of root `style.css`,
  because Docker builds the frontend from `frontend/` and cannot resolve files
  outside that build context.
- `frontend/src/app/shared-source.css` preserves the pre-existing application
  shell and course selectors used by non-landing routes; it is kept separate so
  the approved landing source can remain an exact copy.
- The landing route uses that source stylesheet directly so the Next.js render
  does not drift from the approved landing page. Feature-specific additions
  live under `frontend/`.
- Shared shell, typography, buttons, cards, forms, and responsive behavior are
  defined centrally before feature pages adopt them.
- A feature may add domain-specific UI, but must reuse the foundation tokens and
  primitives unless a new decision is recorded here.

## Approved scope

- Migrate the landing-page visual language into `frontend/src/app/globals.css`.
- Convert the landing page to a Next.js route.
- Keep authentication behavior and API contracts out of this UX branch.
- Apply the same foundation to AUTH-01 screens after this branch is reviewed.

## Explicitly deferred

- New illustration assets and animation system.
- Full component-library extraction.
- Redesign of course/content behavior or API responses.
- Changes to backend, database, or authentication rules.

## Change notes

- The pre-existing frontend migration was recovered from the local stash.
- The landing route now preserves the source page structure, knowledge graph,
  copy, class names, and stylesheet instead of recreating the visual design.
- When root `style.css` changes, update the frontend copy together and verify
  both files have the same hash before committing.
- The landing route is isolated from application/auth route groups; those groups
  render the existing shared header, main wrapper, and footer without duplicating
  the landing page shell.
- Shared application selectors remain available after the UX migration; this
  follow-up restores them from `origin/dev` rather than redesigning those routes.
- Auth forms add only the minimum form styles needed to use the same source
  tokens; their behavior remains outside this UX branch.
- **2026-11-03**: Updated foundation document with explicit background and text color rules, typography hierarchy, and cross-domain WCAG AA contrast invariants to prevent washed-out text conflicts across team members' domains.
