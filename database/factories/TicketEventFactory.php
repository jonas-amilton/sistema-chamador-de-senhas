<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\TicketEventType;
use App\Models\Ticket;
use App\Models\TicketEvent;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<TicketEvent> */
class TicketEventFactory extends Factory
{
    public function definition(): array
    {
        return [
            'ticket_id' => Ticket::factory(),
            'type' => TicketEventType::Issued,
            'actor_user_id' => null,
            'counter_id' => null,
            'metadata' => null,
            'occurred_at' => now(),
        ];
    }
}
