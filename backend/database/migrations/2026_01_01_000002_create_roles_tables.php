<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Identity – Roles and User-Role Assignments
 *
 * roles: Named permission roles. Seeded with: learner, contributor, reviewer, admin.
 * user_roles: Many-to-many join table. A user may hold multiple roles simultaneously.
 *
 * Deletion policy:
 *  - Deleting a role → RESTRICT. Roles should be deactivated rather than deleted to avoid
 *    implicit loss of user permissions. Application must remove assignments before deletion.
 *  - Deleting a user → CASCADE on user_roles (role assignment has no value without user).
 *  - Composite PK on (user_id, role_id) enforces uniqueness of assignments.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 50)->unique();
            $table->string('description')->nullable();
            $table->timestampTz('created_at')->nullable();
            $table->timestampTz('updated_at')->nullable();
        });

        Schema::create('user_roles', function (Blueprint $table) {
            // Composite primary key enforces uniqueness of (user, role) assignment.
            $table->uuid('user_id');
            $table->uuid('role_id');

            $table->primary(['user_id', 'role_id']);

            $table->timestampTz('created_at')->nullable();

            // user deleted → remove role assignment
            $table->foreign('user_id')
                ->references('id')->on('users')
                ->cascadeOnDelete();

            // role deleted → blocked (RESTRICT) to prevent silent permission loss
            $table->foreign('role_id')
                ->references('id')->on('roles')
                ->restrictOnDelete();

            // Index role_id to speed up queries like "find all users with role X"
            $table->index('role_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_roles');
        Schema::dropIfExists('roles');
    }
};
