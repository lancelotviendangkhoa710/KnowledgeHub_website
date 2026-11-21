<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Supabase installs extensions outside public; pgvector types remain schema-qualified.
        DB::statement('CREATE SCHEMA IF NOT EXISTS extensions');
        DB::statement('CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions');

        Schema::create('user_cv_indexes', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('user_cv_id')->unique();
            $table->string('status', 20)->default('pending');
            $table->string('embedding_model', 120);
            $table->string('embedding_revision', 80);
            $table->unsignedSmallInteger('embedding_dimensions');
            $table->string('content_hash', 64);
            $table->timestampTz('indexed_at')->nullable();
            $table->timestampsTz();
            $table->foreign('user_cv_id')->references('id')->on('user_cvs')->cascadeOnDelete();
        });
        DB::statement("ALTER TABLE user_cv_indexes ADD CONSTRAINT user_cv_indexes_status_check CHECK (status IN ('pending', 'ready', 'failed'))");
        DB::statement('ALTER TABLE user_cv_indexes ADD CONSTRAINT user_cv_indexes_dimensions_check CHECK (embedding_dimensions = 384)');
        DB::statement("CREATE INDEX user_cv_indexes_ready_lookup ON user_cv_indexes (user_cv_id) WHERE status = 'ready'");
        DB::statement('ALTER TABLE user_cv_indexes ENABLE ROW LEVEL SECURITY');
        $this->revokeSupabaseRoles('user_cv_indexes');

        Schema::create('user_cv_chunks', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('user_cv_index_id');
            $table->unsignedInteger('position');
            $table->unsignedSmallInteger('page');
            $table->string('content_hash', 64);
            $table->string('content', 2000);
            $table->timestampTz('created_at')->nullable();
            $table->foreign('user_cv_index_id')->references('id')->on('user_cv_indexes')->cascadeOnDelete();
            $table->unique(['user_cv_index_id', 'position']);
            $table->index('user_cv_index_id');
        });
        DB::statement('ALTER TABLE user_cv_chunks ADD COLUMN embedding extensions.vector(384) NOT NULL');
        DB::statement('ALTER TABLE user_cv_chunks ADD CONSTRAINT user_cv_chunks_position_check CHECK (position >= 0)');
        DB::statement('ALTER TABLE user_cv_chunks ADD CONSTRAINT user_cv_chunks_page_check CHECK (page >= 1)');
        DB::statement('ALTER TABLE user_cv_chunks ADD CONSTRAINT user_cv_chunks_content_check CHECK (char_length(content) BETWEEN 1 AND 2000)');
        DB::statement('ALTER TABLE user_cv_chunks ENABLE ROW LEVEL SECURITY');
        $this->revokeSupabaseRoles('user_cv_chunks');
    }

    private function revokeSupabaseRoles(string $table): void
    {
        // The roles exist in Supabase, but the disposable PostgreSQL test DB is vanilla.
        // Keep the migration portable without weakening production grants.
        DB::statement(<<<SQL
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        EXECUTE 'REVOKE ALL ON TABLE {$table} FROM anon';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE 'REVOKE ALL ON TABLE {$table} FROM authenticated';
    END IF;
END
$$;
SQL);
    }

    public function down(): void
    {
        // Disposable/test environments only: dropping these rows permanently removes derived CV data.
        Schema::dropIfExists('user_cv_chunks');
        Schema::dropIfExists('user_cv_indexes');
        // Do not drop extension vector: it can be shared by unrelated application objects.
    }
};
