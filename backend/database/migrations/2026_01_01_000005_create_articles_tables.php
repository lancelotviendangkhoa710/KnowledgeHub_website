<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Knowledge Base – Articles and Article Versions
 *
 * ── Published Version Strategy ──────────────────────────────────────────────
 * Design chosen: nullable `published_version_id` on `articles`.
 *
 * Circular FK solution (articles ↔ article_versions):
 *  1. Create `articles` WITHOUT published_version_id FK.
 *  2. Create `article_versions` with FK → articles.
 *  3. Add published_version_id FK to articles (Step 3 below).
 *
 *  Application-level guarantee that published_version_id.article_id = articles.id
 *  is enforced in the service layer. A DB trigger could enforce this but is
 *  intentionally omitted to keep the skeleton simple. Documented limitation.
 *
 * ── Article Status ───────────────────────────────────────────────────────────
 *  draft | submitted | published | archived | rejected
 *
 * ── Deletion Policy ──────────────────────────────────────────────────────────
 *  - Articles: soft delete only (deleted_at).
 *  - article_versions: RESTRICT – preserve audit history.
 *  - author_id (user): RESTRICT – must reassign before deletion.
 *  - category_id (category): SET NULL – article survives without category.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Step 1 – articles (no published_version_id FK yet)
        Schema::create('articles', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->uuid('author_id');
            $table->foreign('author_id')
                ->references('id')->on('users')
                ->restrictOnDelete();

            $table->uuid('category_id')->nullable();
            $table->foreign('category_id')
                ->references('id')->on('categories')
                ->nullOnDelete();

            // FK added in Step 3 after article_versions exists
            $table->uuid('published_version_id')->nullable();

            $table->string('slug')->unique();
            $table->string('status', 20)->default('draft');

            $table->timestampTz('published_at')->nullable();
            $table->timestampTz('created_at')->nullable();
            $table->timestampTz('updated_at')->nullable();
            $table->timestampTz('deleted_at')->nullable();

            $table->index(['status', 'published_at']);
            $table->index('author_id');
            $table->index('category_id');
        });

        DB::statement(
            "ALTER TABLE articles ADD CONSTRAINT articles_status_check
             CHECK (status IN ('draft','submitted','published','archived','rejected'))"
        );

        // Step 2 – article_versions
        Schema::create('article_versions', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->uuid('article_id');
            $table->foreign('article_id')
                ->references('id')->on('articles')
                ->restrictOnDelete();

            $table->unsignedInteger('version_no');
            $table->string('title');
            $table->text('content');

            $table->uuid('created_by');
            $table->foreign('created_by')
                ->references('id')->on('users')
                ->restrictOnDelete();

            $table->timestampTz('created_at')->nullable();

            // Unique constraint also acts as a B-tree index for version_no lookups.
            $table->unique(['article_id', 'version_no']);
        });

        // Step 3 – circular FK: articles.published_version_id → article_versions.id
        DB::statement(
            "ALTER TABLE articles
             ADD CONSTRAINT articles_published_version_id_foreign
             FOREIGN KEY (published_version_id)
             REFERENCES article_versions (id)
             ON DELETE RESTRICT"
        );
    }

    public function down(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->dropForeign('articles_published_version_id_foreign');
        });
        Schema::dropIfExists('article_versions');
        Schema::dropIfExists('articles');
    }
};
