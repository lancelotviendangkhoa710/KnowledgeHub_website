<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * CategorySeeder – Example development seed data.
 *
 * Seeds a basic two-level category hierarchy for development and demo purposes.
 * Production categories should be managed through the admin interface.
 */
class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        $roots = [
            ['name' => 'Programming',       'slug' => 'programming'],
            ['name' => 'Data Science',      'slug' => 'data-science'],
            ['name' => 'System Design',     'slug' => 'system-design'],
            ['name' => 'Career & Soft Skills', 'slug' => 'career-soft-skills'],
        ];

        $rootIds = [];
        foreach ($roots as $root) {
            $id = Str::uuid()->toString();
            DB::table('categories')->updateOrInsert(
                ['slug' => $root['slug']],
                [
                    'id'         => $id,
                    'name'       => $root['name'],
                    'slug'       => $root['slug'],
                    'parent_id'  => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
            // Fetch the actual id (handles idempotent re-runs)
            $rootIds[$root['slug']] = DB::table('categories')
                ->where('slug', $root['slug'])
                ->value('id');
        }

        $children = [
            ['name' => 'PHP',         'slug' => 'php',         'parent' => 'programming'],
            ['name' => 'Python',      'slug' => 'python',      'parent' => 'programming'],
            ['name' => 'JavaScript',  'slug' => 'javascript',  'parent' => 'programming'],
            ['name' => 'Databases',   'slug' => 'databases',   'parent' => 'programming'],
            ['name' => 'Machine Learning', 'slug' => 'machine-learning', 'parent' => 'data-science'],
            ['name' => 'Statistics',  'slug' => 'statistics',  'parent' => 'data-science'],
            ['name' => 'Microservices', 'slug' => 'microservices', 'parent' => 'system-design'],
            ['name' => 'API Design',  'slug' => 'api-design',  'parent' => 'system-design'],
        ];

        foreach ($children as $child) {
            DB::table('categories')->updateOrInsert(
                ['slug' => $child['slug']],
                [
                    'id'         => Str::uuid()->toString(),
                    'name'       => $child['name'],
                    'slug'       => $child['slug'],
                    'parent_id'  => $rootIds[$child['parent']] ?? null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
        }

        $this->command->info('Categories seeded: ' . count($roots) . ' root, ' . count($children) . ' children.');
    }
}
