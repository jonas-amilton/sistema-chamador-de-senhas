<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Ticket;
use App\Models\TicketEvent;

final class TicketData
{
    /** @return array<string, mixed> */
    public static function make(Ticket $ticket): array
    {
        $ticket->loadMissing(['service:id,name', 'counter:id,name,code']);

        return [
            'id' => $ticket->id,
            'unit_id' => $ticket->unit_id,
            'service_id' => $ticket->service_id,
            'counter_id' => $ticket->counter_id,
            'code' => $ticket->code,
            'priority' => $ticket->priority->value,
            'priority_label' => $ticket->priority->label(),
            'status' => $ticket->status->value,
            'status_label' => $ticket->status->label(),
            'business_date' => $ticket->business_date->format('Y-m-d'),
            'sequence' => $ticket->sequence,
            'issued_at' => $ticket->issued_at->toISOString(),
            'called_at' => $ticket->called_at?->toISOString(),
            'last_called_at' => $ticket->last_called_at?->toISOString(),
            'service_started_at' => $ticket->service_started_at?->toISOString(),
            'completed_at' => $ticket->completed_at?->toISOString(),
            'no_show_at' => $ticket->no_show_at?->toISOString(),
            'cancelled_at' => $ticket->cancelled_at?->toISOString(),
            'service' => [
                'id' => $ticket->service->id,
                'name' => $ticket->service->name,
            ],
            'counter' => $ticket->counter === null ? null : [
                'id' => $ticket->counter->id,
                'name' => $ticket->counter->name,
                'code' => $ticket->counter->code,
            ],
        ];
    }

    /** @return array<string, mixed> */
    public static function display(TicketEvent $event): array
    {
        $event->loadMissing(['ticket.service:id,name', 'counter:id,name,code']);

        return [
            'event_id' => $event->id,
            'ticket_id' => $event->ticket->id,
            'unit_id' => $event->ticket->unit_id,
            'code' => $event->ticket->code,
            'priority' => $event->ticket->priority->value,
            'service' => [
                'id' => $event->ticket->service->id,
                'name' => $event->ticket->service->name,
            ],
            'counter' => $event->counter === null ? null : [
                'id' => $event->counter->id,
                'name' => $event->counter->name,
                'code' => $event->counter->code,
            ],
            'type' => $event->type->value,
            'called_at' => $event->occurred_at->toISOString(),
        ];
    }
}
