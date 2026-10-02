<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Laravel's built-in migrations tracking table.
 * Required for `php artisan migrate` to function.
 * This is the standard Laravel 11 migrations table.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('migrations', function (Blueprint $table) {
            $table->id();
            $table->string('migration');
            $table->integer('batch');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('migrations');
    }
};
