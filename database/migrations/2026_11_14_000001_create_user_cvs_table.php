<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('user_cvs', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->string('object_key')->unique();
            $table->string('filename');
            $table->unsignedInteger('size_bytes');
            $table->text('extracted_text')->nullable();
            $table->timestampTz('consented_at');
            $table->string('status', 20);
            $table->timestampsTz();
            $table->index(['user_id', 'status']);
        });
        DB::statement("ALTER TABLE user_cvs ADD CONSTRAINT user_cvs_status_check CHECK (status IN ('active', 'pending_delete'))");
        DB::statement("ALTER TABLE user_cvs ADD CONSTRAINT user_cvs_text_check CHECK (char_length(extracted_text) <= 12000 AND (status <> 'pending_delete' OR extracted_text IS NULL))");
        DB::statement("CREATE UNIQUE INDEX user_cvs_one_active_per_user ON user_cvs (user_id) WHERE status = 'active'");
        DB::statement('ALTER TABLE user_cvs ENABLE ROW LEVEL SECURITY');
    }

    public function down(): void
    {
        Schema::dropIfExists('user_cvs');
    }
};
