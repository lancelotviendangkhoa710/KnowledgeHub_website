<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('user_cvs', function (Blueprint $table): void {
            $table->jsonb('assessment')->nullable();
        });
        DB::statement("ALTER TABLE user_cvs ADD CONSTRAINT user_cvs_assessment_check CHECK (status <> 'pending_delete' OR assessment IS NULL)");

        Schema::create('ai_agent_approvals', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('actor_id');
            $table->foreign('actor_id')->references('id')->on('users')->cascadeOnDelete();
            $table->uuid('target_user_id');
            $table->foreign('target_user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->string('action', 40);
            $table->string('value', 20);
            $table->string('summary', 500);
            $table->string('target_status', 20);
            $table->string('target_roles_hash', 64);
            $table->timestampTz('expires_at');
            $table->timestampTz('consumed_at')->nullable();
            $table->timestampsTz();
            $table->index(['actor_id', 'expires_at']);
            $table->index('target_user_id');
        });
        DB::statement("ALTER TABLE ai_agent_approvals ADD CONSTRAINT ai_agent_approvals_action_check CHECK (action IN ('change_user_role', 'change_user_status'))");
        DB::statement("ALTER TABLE ai_agent_approvals ADD CONSTRAINT ai_agent_approvals_value_check CHECK ((action = 'change_user_role' AND value IN ('user', 'contributor', 'admin')) OR (action = 'change_user_status' AND value IN ('active', 'inactive', 'banned')))");
        DB::statement('ALTER TABLE ai_agent_approvals ENABLE ROW LEVEL SECURITY');

        Schema::create('ai_cv_confirmations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->string('token_hash', 64)->unique();
            $table->timestampTz('expires_at');
            $table->timestampsTz();
            $table->index('user_id');
            $table->index('expires_at');
        });
        DB::statement('ALTER TABLE ai_cv_confirmations ENABLE ROW LEVEL SECURITY');
    }

    public function down(): void
    {
        // Destructive and irreversible: stored CV assessments and pending agent
        // approvals are dropped with their tables. Roll back only on disposable data.
        Schema::dropIfExists('ai_cv_confirmations');
        Schema::dropIfExists('ai_agent_approvals');
        Schema::table('user_cvs', function (Blueprint $table): void {
            $table->dropColumn('assessment');
        });
    }
};
