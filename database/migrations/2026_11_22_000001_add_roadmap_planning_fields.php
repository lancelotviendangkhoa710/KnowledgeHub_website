<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * LRN-DB-01: fields the user fills in when building a roadmap.
 *
 * learning_roadmaps: level, duration_weeks, visibility, source_template.
 * roadmap_items: study_hours, importance (0-100), note.
 * Every new column is nullable (visibility has a default), so existing rows stay valid.
 * AI Companion roadmaps already keep level/weeks inside coverage->profile; those are copied over.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('learning_roadmaps', function (Blueprint $table): void {
            $table->string('level', 20)->nullable();
            $table->unsignedSmallInteger('duration_weeks')->nullable();
            $table->string('visibility', 10)->default('private');
            $table->string('source_template', 64)->nullable();
        });

        DB::statement("ALTER TABLE learning_roadmaps ADD CONSTRAINT learning_roadmaps_level_check CHECK (level IS NULL OR level IN ('beginner', 'intermediate', 'advanced'))");
        DB::statement('ALTER TABLE learning_roadmaps ADD CONSTRAINT learning_roadmaps_duration_weeks_check CHECK (duration_weeks IS NULL OR duration_weeks BETWEEN 1 AND 104)');
        DB::statement("ALTER TABLE learning_roadmaps ADD CONSTRAINT learning_roadmaps_visibility_check CHECK (visibility IN ('private', 'public'))");

        Schema::table('roadmap_items', function (Blueprint $table): void {
            $table->decimal('study_hours', 5, 1)->nullable();
            $table->unsignedSmallInteger('importance')->nullable();
            $table->text('note')->nullable();
        });

        DB::statement('ALTER TABLE roadmap_items ADD CONSTRAINT roadmap_items_study_hours_check CHECK (study_hours IS NULL OR (study_hours > 0 AND study_hours <= 999))');
        DB::statement('ALTER TABLE roadmap_items ADD CONSTRAINT roadmap_items_importance_check CHECK (importance IS NULL OR importance BETWEEN 0 AND 100)');
        DB::statement('ALTER TABLE roadmap_items ADD CONSTRAINT roadmap_items_note_check CHECK (note IS NULL OR char_length(note) <= 1000)');

        if (Schema::hasColumn('learning_roadmaps', 'coverage')) {
            DB::statement(<<<'SQL'
                UPDATE learning_roadmaps
                SET level = lower(coverage->'profile'->>'level')
                WHERE coverage IS NOT NULL
                  AND lower(coverage->'profile'->>'level') IN ('beginner', 'intermediate', 'advanced')
                SQL);
            DB::statement(<<<'SQL'
                UPDATE learning_roadmaps
                SET duration_weeks = (coverage->'profile'->>'weeks')::int
                WHERE coverage IS NOT NULL
                  AND coverage->'profile'->>'weeks' ~ '^[0-9]{1,3}$'
                  AND (coverage->'profile'->>'weeks')::int BETWEEN 1 AND 104
                SQL);
        }
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE roadmap_items DROP CONSTRAINT IF EXISTS roadmap_items_note_check');
        DB::statement('ALTER TABLE roadmap_items DROP CONSTRAINT IF EXISTS roadmap_items_importance_check');
        DB::statement('ALTER TABLE roadmap_items DROP CONSTRAINT IF EXISTS roadmap_items_study_hours_check');
        Schema::table('roadmap_items', fn (Blueprint $table) => $table->dropColumn(['study_hours', 'importance', 'note']));

        DB::statement('ALTER TABLE learning_roadmaps DROP CONSTRAINT IF EXISTS learning_roadmaps_visibility_check');
        DB::statement('ALTER TABLE learning_roadmaps DROP CONSTRAINT IF EXISTS learning_roadmaps_duration_weeks_check');
        DB::statement('ALTER TABLE learning_roadmaps DROP CONSTRAINT IF EXISTS learning_roadmaps_level_check');
        Schema::table('learning_roadmaps', fn (Blueprint $table) => $table->dropColumn(['level', 'duration_weeks', 'visibility', 'source_template']));
    }
};
