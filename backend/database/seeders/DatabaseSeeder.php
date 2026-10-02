<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * DatabaseSeeder – Root seeder orchestrating all development seed data.
 *
 * Run order is important: roles and categories have no dependencies.
 * Plans are independent. Add more seeders here as the project grows.
 *
 * Usage:
 *   php artisan db:seed
 *   php artisan db:seed --class=RoleSeeder
 *
 * NEVER run this in production with real user data present.
 * All seed data is fictional and for development/CI only.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            CategorySeeder::class,
            PlanSeeder::class,
        ]);
    }
}
