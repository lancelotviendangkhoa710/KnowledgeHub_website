<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
return new class extends Migration
{
    public function up(): void
    {
        // ── conversations ─────────────────────────────────────────────────────
        Schema::create('conversations', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->uuid('user_id');
            $table->foreign('user_id')
                ->references('id')->on('users')
                ->restrictOnDelete();

            $table->string('title')->nullable();

            $table->timestampTz('created_at')->nullable();
            $table->timestampTz('updated_at')->nullable();

            $table->index('user_id');
        });

        // ── messages ──────────────────────────────────────────────────────────
        Schema::create('messages', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->uuid('conversation_id');
            $table->foreign('conversation_id')
                ->references('id')->on('conversations')
                ->cascadeOnDelete();

            $table->string('role', 20);
            $table->text('content');
            $table->jsonb('metadata')->nullable();

            $table->timestampTz('created_at')->nullable();

            // Composite index: load all messages for a conversation ordered by time
            $table->index(['conversation_id', 'created_at']);
        });

        DB::statement(
            "ALTER TABLE messages ADD CONSTRAINT messages_role_check
             CHECK (role IN ('user','assistant','system','tool'))"
        );

        // ── user_memories ─────────────────────────────────────────────────────
        Schema::create('user_memories', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->uuid('user_id');
            $table->foreign('user_id')
                ->references('id')->on('users')
                ->restrictOnDelete();

            $table->string('memory_type', 30);
            $table->text('content');

            // Optional provenance: which message triggered this memory
            $table->uuid('source_message_id')->nullable();
            $table->foreign('source_message_id')
                ->references('id')->on('messages')
                ->nullOnDelete(); // message can be deleted without losing the memory

            $table->string('status', 20)->default('active');

            $table->timestampTz('expires_at')->nullable();
            $table->timestampTz('created_at')->nullable();
            $table->timestampTz('updated_at')->nullable();

            $table->index('user_id');
            $table->index(['user_id', 'status']);
        });

        DB::statement(
            "ALTER TABLE user_memories ADD CONSTRAINT user_memories_memory_type_check
             CHECK (memory_type IN ('preference','fact','goal','instruction'))"
        );

        DB::statement(
            "ALTER TABLE user_memories ADD CONSTRAINT user_memories_status_check
             CHECK (status IN ('active','superseded','expired','deleted'))"
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('user_memories');
        Schema::dropIfExists('messages');
        Schema::dropIfExists('conversations');
    }
};
