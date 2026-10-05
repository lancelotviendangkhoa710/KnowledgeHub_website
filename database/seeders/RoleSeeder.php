<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * RoleSeeder – Development-only seed data.
 *
 * Seeds the four initial roles for KnowledgeHub:
 *   learner     – default role for registered users; can read and bookmark content
 *   contributor – can create and submit articles for review
 *   reviewer    – can review and approve/reject submitted article versions
 *   admin       – full platform administration access
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
                'name'        => 'learner',
                'description' => 'Default role. Can read, bookmark, and use AI companion.',
                'created_at'  => $now,
                'updated_at'  => $now,
            ],
            [
                'id'          => Str::uuid()->toString(),
                'name'        => 'contributor',
                'description' => 'Can create articles and submit them for editorial review.',
                'created_at'  => $now,
                'updated_at'  => $now,
            ],
            [
                'id'          => Str::uuid()->toString(),
                'name'        => 'reviewer',
                'description' => 'Can review submitted article versions and record decisions.',
                'created_at'  => $now,
                'updated_at'  => $now,
            ],
            [
                'id'          => Str::uuid()->toString(),
                'name'        => 'admin',
                'description' => 'Full platform administration: users, roles, categories, plans.',
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

        $this->command->info('Roles seeded: learner, contributor, reviewer, admin');
    }
}
