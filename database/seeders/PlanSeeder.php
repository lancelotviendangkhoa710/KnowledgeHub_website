<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * PlanSeeder – Example development seed data.
 *
 * Seeds representative subscription plans for development and demo.
 * Prices are fictional and for development only.
 * Production plans should be managed through the admin interface and
 * kept in sync with the payment provider (e.g., Stripe product/price IDs).
 */
class PlanSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        $plans = [
            [
                'name'             => 'Free',
                'price'            => '0.00',
                'currency'         => 'USD',
                'billing_interval' => 'monthly',
                'status'           => 'active',
            ],
            [
                'name'             => 'Pro Monthly',
                'price'            => '9.99',
                'currency'         => 'USD',
                'billing_interval' => 'monthly',
                'status'           => 'active',
            ],
            [
                'name'             => 'Pro Annual',
                'price'            => '99.99',
                'currency'         => 'USD',
                'billing_interval' => 'annual',
                'status'           => 'active',
            ],
            [
                'name'             => 'Team Annual',
                'price'            => '299.99',
                'currency'         => 'USD',
                'billing_interval' => 'annual',
                'status'           => 'active',
            ],
        ];

        foreach ($plans as $plan) {
            DB::table('plans')->updateOrInsert(
                ['name' => $plan['name']],
                array_merge($plan, [
                    'id'         => Str::uuid()->toString(),
                    'created_at' => $now,
                    'updated_at' => $now,
                ])
            );
        }

        $this->command->info('Plans seeded: ' . count($plans) . ' plans.');
    }
}
