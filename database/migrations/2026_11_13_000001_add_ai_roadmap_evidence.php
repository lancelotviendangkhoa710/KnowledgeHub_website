<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('learning_roadmaps', function (Blueprint $table): void {
            $table->string('origin', 16)->default('legacy');
            $table->uuid('generation_key')->nullable()->unique();
            $table->text('ai_summary')->nullable();
            $table->jsonb('coverage')->nullable();
        });

        DB::statement("ALTER TABLE learning_roadmaps ADD CONSTRAINT learning_roadmaps_origin_check CHECK (origin IN ('legacy', 'ai'))");

        Schema::table('roadmap_items', function (Blueprint $table): void {
            $table->jsonb('ai_details')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('roadmap_items', fn (Blueprint $table) => $table->dropColumn('ai_details'));
        DB::statement('ALTER TABLE learning_roadmaps DROP CONSTRAINT learning_roadmaps_origin_check');
        Schema::table('learning_roadmaps', function (Blueprint $table): void {
            $table->dropUnique(['generation_key']);
            $table->dropColumn(['origin', 'generation_key', 'ai_summary', 'coverage']);
        });
    }
};
