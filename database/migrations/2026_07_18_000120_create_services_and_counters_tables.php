<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('services', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('unit_id')->constrained()->restrictOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->string('standard_prefix', 8)->default('N');
            $table->string('priority_prefix', 8)->default('P');
            $table->unsignedSmallInteger('priority_streak_limit')->default(2);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['unit_id', 'slug']);
            $table->index(['unit_id', 'is_active']);
        });

        Schema::create('counters', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('unit_id')->constrained()->restrictOnDelete();
            $table->string('name');
            $table->string('code', 24);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['unit_id', 'code']);
            $table->index(['unit_id', 'is_active']);
        });

        Schema::create('counter_service', function (Blueprint $table): void {
            $table->foreignUlid('counter_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('service_id')->constrained()->cascadeOnDelete();
            $table->primary(['counter_id', 'service_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('counter_service');
        Schema::dropIfExists('counters');
        Schema::dropIfExists('services');
    }
};
