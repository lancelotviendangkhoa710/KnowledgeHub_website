<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * RoleSeeder – Development-only seed data.
 *
 * Seeds the three approved roles for KnowledgeHub:
 *   user        – default role for registered users; can read, bookmark, learn, use AI companion
 *   contributor – internal content-team member; creates, edits, publishes courses (assigned by Admin)
 *   admin       – full platform administration access
 *
 * Authority: ADR 2026-10-05-business-model-correction.md
 *            ADR 2026-10-06-architecture-techstack-locked.md
 *
 * NEVER include real credentials, tokens, or production secrets in seeders.
 * This seeder is safe for development and CI environments only.
 */
class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        $roles = [
            [
                'id'          => Str::uuid()->toString(),
                'name'        => 'user',
                'description' => 'Default role. Discovers courses, learns, bookmarks, uses AI companion and roadmaps.',
                'created_at'  => $now,
                'updated_at'  => $now,
            ],
            [
                'id'          => Str::uuid()->toString(),
                'name'        => 'contributor',
                'description' => 'Internal content-team member. Creates, edits, and publishes courses. Assigned by Admin only.',
                'created_at'  => $now,
                'updated_at'  => $now,
            ],
            [
                'id'          => Str::uuid()->toString(),
                'name'        => 'admin',
                'description' => 'Full platform administration: users, roles, categories, plans, system configuration.',
                'created_at'  => $now,
                'updated_at'  => $now,
            ],
        ];

        // upsert on name so re-running the seeder is idempotent
        foreach ($roles as $role) {
            DB::table('roles')->updateOrInsert(
                ['name' => $role['name']],
                $role
            );
        }

        $this->command->info('Roles seeded: user, contributor, admin');
    }
}
