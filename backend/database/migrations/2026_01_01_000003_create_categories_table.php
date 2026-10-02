<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Knowledge Base – Categories
 *
 * Supports hierarchical category trees via a self-referencing parent_id.
 * Root categories have parent_id = NULL.
 *
 * Slug uniqueness: slugs are unique globally (not scoped to parent).
 * Rationale: simpler URL routing (/category/<slug>) without parent traversal.
 * If hierarchical slugs are needed later, a unique index on (parent_id, slug)
 * can be added via a new migration.
 *
 * Deletion policy:
 *  - Deleting a category with children → RESTRICT (SET NULL via nullable parent_id would
 *    silently re-root children; application should reassign children first).
 *  - Articles with category_id FK set to RESTRICT so categories with articles cannot
 *    be deleted without reassigning articles first (handled in articles migration).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->string('name');
            $table->string('slug')->unique();

            // Nullable self-referencing FK for tree hierarchy.
            $table->uuid('parent_id')->nullable();

            $table->timestampTz('created_at')->nullable();
            $table->timestampTz('updated_at')->nullable();

            // Self-referencing FK – RESTRICT to prevent orphaning children.
            $table->foreign('parent_id')
                ->references('id')->on('categories')
                ->restrictOnDelete();

            // Index parent_id for tree traversal queries.
            $table->index('parent_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
