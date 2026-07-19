<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tickets', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('unit_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('service_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('counter_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('called_by_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('priority');
            $table->string('status');
            $table->date('business_date');
            $table->unsignedBigInteger('sequence');
            $table->string('code', 32);
            $table->uuid('client_request_id')->unique();
            $table->timestamp('issued_at', precision: 6);
            $table->timestamp('called_at', precision: 6)->nullable();
            $table->timestamp('last_called_at', precision: 6)->nullable();
            $table->timestamp('service_started_at', precision: 6)->nullable();
            $table->timestamp('completed_at', precision: 6)->nullable();
            $table->timestamp('no_show_at', precision: 6)->nullable();
            $table->timestamp('cancelled_at', precision: 6)->nullable();
            $table->timestamps();

            $table->unique(
                ['unit_id', 'service_id', 'business_date', 'priority', 'sequence'],
                'tickets_daily_sequence_unique',
            );
            $table->index(
                ['unit_id', 'service_id', 'status', 'priority', 'issued_at'],
                'tickets_queue_lookup_index',
            );
            $table->index(['counter_id', 'status'], 'tickets_counter_status_index');
            $table->index(['called_by_user_id', 'status'], 'tickets_user_status_index');
            $table->index(
                ['business_date', 'unit_id', 'service_id', 'status', 'priority'],
                'tickets_admin_filter_index',
            );
        });

        Schema::create('ticket_sequences', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('unit_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('service_id')->constrained()->restrictOnDelete();
            $table->date('business_date');
            $table->string('priority');
            $table->unsignedBigInteger('last_value')->default(0);
            $table->timestamps();

            $table->unique(
                ['unit_id', 'service_id', 'business_date', 'priority'],
                'ticket_sequences_scope_unique',
            );
        });

        Schema::create('queue_states', function (Blueprint $table): void {
            $table->foreignUlid('service_id')->primary()->constrained()->cascadeOnDelete();
            $table->unsignedInteger('consecutive_priority_calls')->default(0);
            $table->timestamps();
        });

        Schema::create('ticket_events', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('ticket_id')->constrained()->restrictOnDelete();
            $table->string('type');
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->foreignUlid('counter_id')->nullable()->constrained()->restrictOnDelete();
            $table->json('metadata')->nullable();
            $table->timestamp('occurred_at', precision: 6);
            $table->timestamp('created_at')->useCurrent();

            $table->index(['ticket_id', 'occurred_at']);
            $table->index(['type', 'occurred_at']);
        });

        Schema::create('queue_commands', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->uuid('request_id')->unique();
            $table->string('command');
            $table->foreignId('actor_user_id')->constrained('users')->restrictOnDelete();
            $table->foreignUlid('unit_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('service_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignUlid('counter_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignUlid('ticket_id')->nullable()->constrained()->restrictOnDelete();
            $table->char('payload_hash', 64);
            $table->json('result')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['actor_user_id', 'command', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('queue_commands');
        Schema::dropIfExists('ticket_events');
        Schema::dropIfExists('queue_states');
        Schema::dropIfExists('ticket_sequences');
        Schema::dropIfExists('tickets');
    }
};
