<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table): void {
            $table->string('mode', 20)->default('chat')->after('title');
            $table->index(['user_id', 'mode', 'created_at']);
        });
        DB::statement("ALTER TABLE conversations ADD CONSTRAINT conversations_mode_check CHECK (mode IN ('chat', 'notebook'))");

        Schema::table('notebook_documents', function (Blueprint $table): void {
            $table->uuid('conversation_id')->nullable()->after('user_id');
            $table->foreign('conversation_id')->references('id')->on('conversations')->cascadeOnDelete();
            $table->index(['conversation_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('notebook_documents', function (Blueprint $table): void {
            $table->dropForeign(['conversation_id']);
            $table->dropIndex(['conversation_id', 'status']);
            $table->dropColumn('conversation_id');
        });
        DB::statement('ALTER TABLE conversations DROP CONSTRAINT conversations_mode_check');
        Schema::table('conversations', function (Blueprint $table): void {
            $table->dropIndex(['user_id', 'mode', 'created_at']);
            $table->dropColumn('mode');
        });
    }
};
