<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Knowledge Base – Tags
 *
 * Tags are global, reusable labels. Slugs are unique globally.
 * article_tags join table created in the articles migration batch.
 *
 * Deletion policy:
 *  - Deleting a tag → application must remove article_tags associations first.
 *    The FK in article_tags uses RESTRICT to enforce this.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tags', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug')->unique();
            $table->timestampTz('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tags');
    }
};
