<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Premium and Payment
 *
 * Tables: plans, subscriptions, payments, webhook_events
 *
 * Money: NUMERIC(12,2) – human-readable, no float error, up to 9,999,999,999.99.
 *   Migrate to minor-unit integers (cents) if required for currency precision.
 * Currency: ISO 4217 VARCHAR(3), regex-validated by CHECK constraint.
 *
 * Deletion policy: ALL financial FKs use RESTRICT. Financial records must NOT
 * be cascade-deleted as a side effect of user/subscription deletion.
 *
 * No payment card numbers or provider credentials stored.
 * No payment gateway handlers implemented in this skeleton.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->decimal('price', 12, 2);
            $table->char('currency', 3);
            $table->string('billing_interval', 20);
            $table->string('status', 20)->default('active');
            $table->timestampTz('created_at')->nullable();
            $table->timestampTz('updated_at')->nullable();
        });

        DB::statement("ALTER TABLE plans ADD CONSTRAINT plans_billing_interval_check
            CHECK (billing_interval IN ('monthly','annual','one_time'))");
        DB::statement("ALTER TABLE plans ADD CONSTRAINT plans_status_check
            CHECK (status IN ('active','inactive','deprecated'))");
        DB::statement("ALTER TABLE plans ADD CONSTRAINT plans_price_check CHECK (price >= 0)");
        DB::statement("ALTER TABLE plans ADD CONSTRAINT plans_currency_check
            CHECK (currency ~ '^[A-Z]{3}$')");

        Schema::create('subscriptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->foreign('user_id')->references('id')->on('users')->restrictOnDelete();
            $table->uuid('plan_id');
            $table->foreign('plan_id')->references('id')->on('plans')->restrictOnDelete();
            $table->string('status', 20);
            $table->timestampTz('current_period_start')->nullable();
            $table->timestampTz('current_period_end')->nullable();
            $table->timestampTz('created_at')->nullable();
            $table->timestampTz('updated_at')->nullable();
            $table->index('user_id');
            $table->index('plan_id');
        });

        DB::statement("ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check
            CHECK (status IN ('active','trialing','past_due','cancelled','expired'))");

        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('subscription_id')->nullable();
            $table->foreign('subscription_id')->references('id')->on('subscriptions')->restrictOnDelete();
            $table->string('provider', 50);
            $table->string('provider_payment_id')->nullable();
            $table->decimal('amount', 12, 2);
            $table->char('currency', 3);
            $table->string('status', 20);
            $table->timestampTz('created_at')->nullable();
            $table->timestampTz('updated_at')->nullable();
            $table->index('subscription_id');
            $table->unique(['provider', 'provider_payment_id']);
        });

        DB::statement("ALTER TABLE payments ADD CONSTRAINT payments_status_check
            CHECK (status IN ('pending','succeeded','failed','refunded','disputed'))");
        DB::statement("ALTER TABLE payments ADD CONSTRAINT payments_amount_check CHECK (amount >= 0)");
        DB::statement("ALTER TABLE payments ADD CONSTRAINT payments_currency_check
            CHECK (currency ~ '^[A-Z]{3}$')");

        Schema::create('webhook_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('provider', 50);
            $table->string('provider_event_id');
            $table->string('status', 20)->default('pending');
            $table->timestampTz('processed_at')->nullable();
            $table->timestampTz('created_at')->nullable();
            $table->unique(['provider', 'provider_event_id']);
            $table->index(['provider', 'status']);
        });

        DB::statement("ALTER TABLE webhook_events ADD CONSTRAINT webhook_events_status_check
            CHECK (status IN ('pending','processed','failed','ignored'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('webhook_events');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('subscriptions');
        Schema::dropIfExists('plans');
    }
};
