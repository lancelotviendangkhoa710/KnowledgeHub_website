<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;


return new class extends Migration
{
    public function up(): void
    {
        Schema::create('learning_roadmaps', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->foreign('user_id')->references('id')->on('users')->restrictOnDelete();
            $table->string('title');
            $table->text('goal');
            $table->string('status', 20)->default('active');
            $table->timestampTz('created_at')->nullable();
            $table->timestampTz('updated_at')->nullable();
            $table->index('user_id');
        });

        DB::statement(
            "ALTER TABLE learning_roadmaps ADD CONSTRAINT learning_roadmaps_status_check
             CHECK (status IN ('active','completed','archived','paused'))"
        );

        Schema::create('roadmap_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('roadmap_id');
            $table->foreign('roadmap_id')->references('id')->on('learning_roadmaps')->cascadeOnDelete();
            $table->uuid('article_id')->nullable();
            $table->foreign('article_id')->references('id')->on('articles')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('position');
            $table->string('status', 20)->default('pending');
            $table->timestampTz('created_at')->nullable();
            $table->timestampTz('updated_at')->nullable();
            $table->unique(['roadmap_id', 'position']);
            $table->index('roadmap_id');
            $table->index('article_id');
        });

        DB::statement(
            "ALTER TABLE roadmap_items ADD CONSTRAINT roadmap_items_status_check
             CHECK (status IN ('pending','in_progress','completed','skipped'))"
        );

        Schema::create('learning_progress', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('roadmap_item_id')->unique();
            $table->foreign('roadmap_item_id')->references('id')->on('roadmap_items')->cascadeOnDelete();
            $table->string('status', 20)->default('pending');
            $table->timestampTz('started_at')->nullable();
            $table->timestampTz('completed_at')->nullable();
            $table->timestampTz('updated_at')->nullable();
        });

        DB::statement(
            "ALTER TABLE learning_progress ADD CONSTRAINT learning_progress_status_check
             CHECK (status IN ('pending','in_progress','completed','skipped'))"
        );

        Schema::create('roadmap_item_prerequisites', function (Blueprint $table) {
            $table->uuid('roadmap_item_id');
            $table->uuid('prerequisite_item_id');
            $table->primary(['roadmap_item_id', 'prerequisite_item_id']);
            $table->foreign('roadmap_item_id')->references('id')->on('roadmap_items')->cascadeOnDelete();
            $table->foreign('prerequisite_item_id')->references('id')->on('roadmap_items')->cascadeOnDelete();
            $table->index('prerequisite_item_id');
        });

        DB::statement(
            "ALTER TABLE roadmap_item_prerequisites
             ADD CONSTRAINT roadmap_item_prerequisites_no_self_ref
             CHECK (roadmap_item_id <> prerequisite_item_id)"
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('roadmap_item_prerequisites');
        Schema::dropIfExists('learning_progress');
        Schema::dropIfExists('roadmap_items');
        Schema::dropIfExists('learning_roadmaps');
    }
};
