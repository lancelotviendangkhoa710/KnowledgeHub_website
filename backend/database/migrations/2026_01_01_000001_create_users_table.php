<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Identity – Users
 *
 * Creates the users table with UUID primary key, secure password hash storage,
 * a controlled status enum, and soft deletion support.
 *
 * Soft deletion is justified here because:
 *  - Related records (payments, conversations, memories) reference user_id and have
 *    independent retention requirements.
 *  - A soft-deleted user preserves FK integrity while hiding the account.
 *  - Hard deletion of a user that has payments would violate financial audit requirements.
 *
 * Deletion policy for downstream tables:
 *  - user_roles       → CASCADE (role assignment has no independent value without the user)
 *  - conversations    → RESTRICT  (preserves history; application must handle archival)
 *  - user_memories    → RESTRICT
 *  - bookmarks        → CASCADE
 *  - subscriptions    → RESTRICT  (financial record – must not be silently deleted)
 *  - learning_roadmaps → RESTRICT
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            // UUID primary key – application entities use UUIDs per design principles.
            $table->uuid('id')->primary();

            $table->string('name');

            // Email uniqueness is enforced by a unique index below.
            // Unique index on email only (not soft-deleted aware) is acceptable because
            // a soft-deleted user should not block a new registration with the same email.
            // Application layer must handle re-registration of soft-deleted email if needed.
            $table->string('email');

            // Store bcrypt/argon2 hash only – never plaintext.
            $table->string('password');

            // Controlled status values enforced by CHECK constraint.
            // active   – normal, fully functional account
            // inactive – voluntarily deactivated by user
            // banned   – administratively suspended
            // pending  – registered but email not yet verified
            $table->string('status', 20)->default('pending');

            // Standard Laravel email verification timestamp.
            $table->timestampTz('email_verified_at')->nullable();

            // Timezone-aware timestamps.
            $table->timestampTz('created_at')->nullable();
            $table->timestampTz('updated_at')->nullable();

            // Soft deletion – see justification above.
            $table->timestampTz('deleted_at')->nullable();
        });

        // Unique email index – partial index excluding soft-deleted rows so that
        // a re-registration after account deletion is permitted.
        DB::statement(
            "CREATE UNIQUE INDEX users_email_unique ON users (email) WHERE deleted_at IS NULL"
        );

        // CHECK constraint for status column.
        DB::statement(
            "ALTER TABLE users ADD CONSTRAINT users_status_check
             CHECK (status IN ('active', 'inactive', 'banned', 'pending'))"
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
