# Progress Tracker — Team Member B (Content Domain)

**Owner**: TEAM_MEMBER_B  
**Domain**: Content (KnowledgeHub)  
**Branch Prefix**: `p2/`  
**Constitution**: `AGENTS.md`, `backend/AGENTS.md`, `docs/team/context-packs/content.md`  

---

## 1. Environment & Setup
- [x] Verify Docker Compose stack is running (`postgres`, `app`, `nginx`)
- [x] Verify database migrations and seeders execute cleanly
- [x] Verify test runner (`php artisan test`) works in the container

## 2. Eloquent Models (Content Domain)
- [x] `Category` (`backend/app/Models/Category.php`) — UUID PK, self-referencing hierarchy, relations to parent/children/articles
- [x] `Tag` (`backend/app/Models/Tag.php`) — UUID PK, global unique slug, relation to articles
- [x] `Article` (`backend/app/Models/Article.php`) — UUID PK, SoftDeletes, status (draft/published/archived), relations to author, category, publishedVersion, versions, tags, bookmarks
- [x] `ArticleVersion` (`backend/app/Models/ArticleVersion.php`) — UUID PK, immutable version snapshots, relation to article, creator, attachments
- [x] `Bookmark` (`backend/app/Models/Bookmark.php`) — composite PK (user_id, article_id), relation to user, article
- [x] `ArticleAttachment` (`backend/app/Models/ArticleAttachment.php`) — UUID PK, S3 metadata, relation to version

## 3. Authorization & Policy
- [x] `ArticlePolicy` (`backend/app/Policies/ArticlePolicy.php`)
  - [x] `viewAny`: Guest, User, Contributor, Admin
  - [x] `view`: Guest/User (published only); Contributor (published or own); Admin (all)
  - [x] `create`: Contributor, Admin
  - [x] `update`: Contributor (own only), Admin (all)
  - [x] `publish`: Contributor (own only), Admin (all); validate version belongs to article
  - [x] `archive`: Contributor (own only), Admin (all)
  - [x] `delete`: Contributor (own only), Admin (all); soft delete only

## 4. Services Layer (Business Logic & Transactions)
- [x] `CategoryService` (`backend/app/Services/Content/CategoryService.php`) — tree hierarchy, CRUD, RESTRICT handling
- [x] `TagService` (`backend/app/Services/Content/TagService.php`) — tag lookup, create, sync
- [x] `ArticleService` (`backend/app/Services/Content/ArticleService.php`)
  - [x] Create article + version 1 in transaction with slug generation
  - [x] Create new version (auto-increment version_no)
  - [x] Publish article (cross-article version validation, status=published, published_at timestamp)
  - [x] Archive article (status=archived)
  - [x] Soft delete article
  - [x] Filter published articles with categories, tags, pagination
- [x] `BookmarkService` (`backend/app/Services/Content/BookmarkService.php`) — toggle/add/remove bookmark, user bookmarks list
- [x] `ArticleAttachmentService` (`backend/app/Services/Content/ArticleAttachmentService.php`) — store S3 metadata, list, delete

## 5. Form Requests (Validation Layer)
- [x] `CreateArticleRequest` (`backend/app/Http/Requests/Content/CreateArticleRequest.php`)
- [x] `UpdateArticleRequest` (`backend/app/Http/Requests/Content/UpdateArticleRequest.php`)
- [x] `PublishArticleRequest` (`backend/app/Http/Requests/Content/PublishArticleRequest.php`)
- [x] `CreateCategoryRequest` (`backend/app/Http/Requests/Content/CreateCategoryRequest.php`)
- [x] `UpdateCategoryRequest` (`backend/app/Http/Requests/Content/UpdateCategoryRequest.php`)
- [x] `CreateTagRequest` (`backend/app/Http/Requests/Content/CreateTagRequest.php`)
- [x] `StoreAttachmentRequest` (`backend/app/Http/Requests/Content/StoreAttachmentRequest.php`)

## 6. HTTP Controllers (Thin Controllers)
- [x] `ArticleController` (`backend/app/Http/Controllers/Content/ArticleController.php`)
- [x] `CategoryController` (`backend/app/Http/Controllers/Content/CategoryController.php`)
- [x] `TagController` (`backend/app/Http/Controllers/Content/TagController.php`)
- [x] `BookmarkController` (`backend/app/Http/Controllers/Content/BookmarkController.php`)
- [x] `ArticleAttachmentController` (`backend/app/Http/Controllers/Content/ArticleAttachmentController.php`)

## 7. Routes Registration & API Contract
- [x] Register content routes in `backend/routes/api.php` under clean comment header
- [x] Ensure `backend/bootstrap/app.php` or route provider discovers `api.php`
- [x] Update `docs/API.md` with Content Domain contracts (request, response envelopes, error schemas)

## 8. Automated Tests (Unit & Feature)
- [x] Unit tests (`tests/Unit/Content/`)
  - [x] Model relationships, UUIDs, soft delete behavior
  - [x] Version incrementation & published version validation logic
- [x] Feature tests (`tests/Feature/Content/`)
  - [x] Guest: can view published articles/categories; cannot create, edit, bookmark, publish
  - [x] User: can view, bookmark; cannot create, edit, publish
  - [x] Contributor: can create draft, edit own, publish own, cannot edit/publish other's
  - [x] Admin: full platform management across all articles, categories, tags
  - [x] Edge cases: publishing version belonging to another article disallowed; soft delete filtering

## 9. Guardrails & Diff Audit
- [x] Run test suite (`php artisan test`) -> 39 passed (140 assertions)
- [x] Run guardrail script (`./scripts/test-guardrails.ps1`)
- [x] Check `git diff --stat` & `git status` to ensure zero out-of-scope edits
- [x] Final report format according to `AGENTS.md` §15
