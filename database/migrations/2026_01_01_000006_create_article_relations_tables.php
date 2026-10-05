<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── article_tags ──────────────────────────────────────────────────────
        Schema::create('article_tags', function (Blueprint $table) {
            $table->uuid('article_id');
            $table->uuid('tag_id');

            $table->primary(['article_id', 'tag_id']);

            $table->foreign('article_id')
                ->references('id')->on('articles')
                ->restrictOnDelete();

            $table->foreign('tag_id')
                ->references('id')->on('tags')
                ->restrictOnDelete();

            $table->index('tag_id');
        });

        // ── article_reviews ───────────────────────────────────────────────────
        Schema::create('article_reviews', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->uuid('article_version_id');
            $table->foreign('article_version_id')
                ->references('id')->on('article_versions')
                ->restrictOnDelete();

            $table->uuid('reviewer_id');
            $table->foreign('reviewer_id')
                ->references('id')->on('users')
                ->restrictOnDelete();

            // Controlled decision values enforced by CHECK below.
            $table->string('decision', 30);
            $table->text('comment')->nullable();

            $table->timestampTz('created_at')->nullable();

            $table->index('article_version_id');
            $table->index('reviewer_id');
        });

        DB::statement(
            "ALTER TABLE article_reviews ADD CONSTRAINT article_reviews_decision_check
             CHECK (decision IN ('approved','rejected','changes_requested'))"
        );

        // ── bookmarks ─────────────────────────────────────────────────────────
        Schema::create('bookmarks', function (Blueprint $table) {
            $table->uuid('user_id');
            $table->uuid('article_id');

            $table->primary(['user_id', 'article_id']);

            $table->timestampTz('created_at')->nullable();

            $table->foreign('user_id')
                ->references('id')->on('users')
                ->cascadeOnDelete();

            $table->foreign('article_id')
                ->references('id')->on('articles')
                ->cascadeOnDelete();

            $table->index('article_id');
        });

        // ── article_attachments ───────────────────────────────────────────────
        Schema::create('article_attachments', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->uuid('article_version_id');
            $table->foreign('article_version_id')
                ->references('id')->on('article_versions')
                ->restrictOnDelete();

            // S3 object key – unique per storage bucket path
            $table->string('object_key')->unique();
            $table->string('file_name');
            $table->string('mime_type', 100);

            // unsigned bigInteger supports files up to ~9.2 exabytes
            $table->unsignedBigInteger('size_bytes');

            $table->timestampTz('created_at')->nullable();

            $table->index('article_version_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('article_attachments');
        Schema::dropIfExists('bookmarks');
        Schema::dropIfExists('article_reviews');
        Schema::dropIfExists('article_tags');
    }
};
