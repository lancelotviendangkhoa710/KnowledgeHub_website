<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Migration: Fix articles_status_check constraint
 *
 * The original migration (000005) allowed 'submitted' and 'rejected' statuses
 * from the old review-workflow model. The approved business model has no review
 * step — only: draft | published | archived.
 *
 * Authority:
 *   ADR 2026-10-05-business-model-correction.md
 *   ADR 2026-10-06-architecture-techstack-locked.md
 *   AGENTS.md §4 Publishing Workflow
 *
 * This migration drops the old CHECK and creates a corrected one.
 * Any existing rows with status = 'submitted' or 'rejected' must be handled
 * before running this migration (set them to 'draft' or 'archived').
 */
return new class extends Migration
{
    public function up(): void
    {
        // Safety: move any legacy status values to 'draft' before tightening constraint
        DB::statement("UPDATE articles SET status = 'draft' WHERE status IN ('submitted', 'rejected')");

        DB::statement("ALTER TABLE articles DROP CONSTRAINT articles_status_check");
        DB::statement(
            "ALTER TABLE articles ADD CONSTRAINT articles_status_check
             CHECK (status IN ('draft','published','archived'))"
        );
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE articles DROP CONSTRAINT articles_status_check");
        DB::statement(
            "ALTER TABLE articles ADD CONSTRAINT articles_status_check
             CHECK (status IN ('draft','submitted','published','archived','rejected'))"
        );
    }
};
