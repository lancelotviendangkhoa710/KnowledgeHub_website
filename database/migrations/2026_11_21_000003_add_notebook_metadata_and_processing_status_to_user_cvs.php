<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_cvs', function (Blueprint $table): void {
            $table->string('title', 255)->nullable();
            $table->text('summary')->nullable();
        });
        DB::statement('ALTER TABLE user_cvs ADD CONSTRAINT user_cvs_title_check CHECK (title IS NULL OR char_length(title) BETWEEN 1 AND 255)');
        DB::statement('ALTER TABLE user_cvs ADD CONSTRAINT user_cvs_summary_check CHECK (summary IS NULL OR char_length(summary) BETWEEN 1 AND 5000)');
        DB::statement('ALTER TABLE user_cv_indexes DROP CONSTRAINT user_cv_indexes_status_check');
        DB::statement("ALTER TABLE user_cv_indexes ADD CONSTRAINT user_cv_indexes_status_check CHECK (status IN ('pending', 'processing', 'ready', 'failed'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE user_cv_indexes DROP CONSTRAINT user_cv_indexes_status_check');
        DB::statement("ALTER TABLE user_cv_indexes ADD CONSTRAINT user_cv_indexes_status_check CHECK (status IN ('pending', 'ready', 'failed'))");
        DB::statement('ALTER TABLE user_cvs DROP CONSTRAINT user_cvs_summary_check');
        DB::statement('ALTER TABLE user_cvs DROP CONSTRAINT user_cvs_title_check');
        Schema::table('user_cvs', function (Blueprint $table): void {
            $table->dropColumn(['title', 'summary']);
        });
    }
};
