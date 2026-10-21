<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * LRN-002 / OQ-05: learning_progress.status is the authoritative status.
 *
 * Backfill roadmap_items.status from existing progress rows so the
 * denormalized mirror matches the authority. Items without a progress row have
 * no tracker and are normalized to pending.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(
            'UPDATE roadmap_items AS i
             SET status = p.status
             FROM learning_progress AS p
             WHERE p.roadmap_item_id = i.id
               AND i.status <> p.status'
        );

        DB::statement(
            "UPDATE roadmap_items AS i
             SET status = 'pending'
             WHERE i.status <> 'pending'
               AND NOT EXISTS (
                   SELECT 1 FROM learning_progress AS p
                   WHERE p.roadmap_item_id = i.id
               )"
        );
    }

    public function down(): void
    {
        // The previous per-item status values are not recoverable; the
        // authoritative values live in learning_progress.
    }
};
