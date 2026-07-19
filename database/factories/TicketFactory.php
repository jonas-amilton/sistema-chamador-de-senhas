<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\TicketPriority;
use App\Enums\TicketStatus;
use App\Models\Service;
use App\Models\Ticket;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Ticket> */
class TicketFactory extends Factory
{
    public function definition(): array
    {
        return [
            'unit_id' => Unit::factory(),
            'service_id' => fn (array $attributes): string => Service::factory()->create([
                'unit_id' => $attributes['unit_id'],
            ])->id,
            'counter_id' => null,
            'called_by_user_id' => null,
            'priority' => TicketPriority::Standard,
            'status' => TicketStatus::Waiting,
            'business_date' => now('America/Sao_Paulo')->toDateString(),
            'sequence' => fake()->unique()->numberBetween(1, 999999),
            'code' => fn (array $attributes): string => sprintf('N%04d', $attributes['sequence']),
            'client_request_id' => (string) Str::uuid(),
            'issued_at' => now(),
        ];
    }

    public function priority(): static
    {
        return $this->state(fn (array $attributes): array => [
            'priority' => TicketPriority::Priority,
            'code' => sprintf('P%04d', $attributes['sequence']),
        ]);
    }

    public function called(): static
    {
        return $this->state(fn (): array => [
            'status' => TicketStatus::Called,
            'called_at' => now(),
            'last_called_at' => now(),
        ]);
    }

    public function serving(): static
    {
        return $this->called()->state(fn (): array => [
            'status' => TicketStatus::Serving,
            'service_started_at' => now(),
        ]);
    }
}
