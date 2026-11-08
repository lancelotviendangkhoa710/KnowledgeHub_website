<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * M1: durable ordering + idempotency for AI Companion messages.
     *
     * Additive only: no new tables, no edits to the existing 000007 migration.
     * `sequence` is unique per conversation; `client_message_id` is stored on the
     * user message only so `(conversation_id, client_message_id)` can be unique
     * while assistant rows keep their reply metadata.
     */
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->unsignedBigInteger('sequence')->nullable()->after('id');
            $table->uuid('client_message_id')->nullable()->after('metadata');
        });

        // Backfill a deterministic per-conversation order for existing rows.
        DB::statement(
            'UPDATE messages AS m
             SET sequence = ranked.seq
             FROM (
                 SELECT id, ROW_NUMBER() OVER (
                     PARTITION BY conversation_id ORDER BY created_at, id
                 ) AS seq
                 FROM messages
             ) AS ranked
             WHERE m.id = ranked.id'
        );

        // Backfill client ids from the existing JSONB metadata on user rows only.
        DB::statement(
            "UPDATE messages
             SET client_message_id = (metadata->>'client_message_id')::uuid
             WHERE role = 'user'
               AND jsonb_exists(metadata, 'client_message_id')
               AND metadata->>'client_message_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'"
        );

        Schema::table('messages', function (Blueprint $table) {
            $table->unique(['conversation_id', 'sequence'], 'messages_conversation_sequence_unique');
            $table->unique(['conversation_id', 'client_message_id'], 'messages_conversation_client_id_unique');
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropUnique('messages_conversation_sequence_unique');
            $table->dropUnique('messages_conversation_client_id_unique');
            $table->dropColumn(['sequence', 'client_message_id']);
        });
    }
};
