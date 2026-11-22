<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('notebook_documents', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('user_id')->index();
            $table->string('original_filename', 255);
            $table->string('storage_path')->unique();
            $table->unsignedBigInteger('size_bytes');
            $table->string('status', 20);
            $table->string('error_message', 500)->nullable();
            $table->string('title', 255)->nullable();
            $table->text('summary')->nullable();
            $table->unsignedInteger('chunk_count')->default(0);
            $table->timestampsTz();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index(['user_id', 'status']);
        });
        DB::statement("ALTER TABLE notebook_documents ADD CONSTRAINT notebook_documents_status_check CHECK (status IN ('processing', 'ready', 'failed'))");
        DB::statement('ALTER TABLE notebook_documents ENABLE ROW LEVEL SECURITY');

        Schema::create('notebook_document_chunks', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('document_id')->index();
            $table->unsignedInteger('position');
            $table->unsignedSmallInteger('page');
            $table->string('content_hash', 64);
            $table->string('content', 2000);
            $table->timestampTz('created_at')->useCurrent();
            $table->foreign('document_id')->references('id')->on('notebook_documents')->cascadeOnDelete();
            $table->unique(['document_id', 'position']);
        });
        DB::statement('ALTER TABLE notebook_document_chunks ADD COLUMN embedding extensions.vector(384) NOT NULL');
        DB::statement('ALTER TABLE notebook_document_chunks ADD CONSTRAINT notebook_document_chunks_page_check CHECK (page >= 1)');
        DB::statement('ALTER TABLE notebook_document_chunks ADD CONSTRAINT notebook_document_chunks_content_check CHECK (char_length(content) BETWEEN 1 AND 2000)');
        DB::statement('ALTER TABLE notebook_document_chunks ENABLE ROW LEVEL SECURITY');
    }

    public function down(): void
    {
        Schema::dropIfExists('notebook_document_chunks');
        Schema::dropIfExists('notebook_documents');
    }
};
